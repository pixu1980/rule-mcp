/**
 * @module tools/handoff
 *
 * rule_tool_process_handoff MCP tool - LLM Context Handoff.
 * Reads ADR logs + .context/ values and generates a compressed handoff prompt
 * that lets a new LLM session resume work seamlessly.
 *
 * @see module:tools/router - registered via registerProcessHandoffTool()
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";
import { z } from "zod/v4";
import { registerTool } from "./router.js";
import { TOKENSAVE_DIRECTIVE, tokensaveActive } from "../core/agent-integrations.js";

/** Default project directory. */
const ADR_DIR = "docs/adr";
const CONTEXT_DIR = ".context";
const DOCS_DIR = "docs";

/**
 * Read all ADR files and return compressed summaries.
 */
function readAdrs(projectDir) {
  const adrDir = join(projectDir, ADR_DIR);
  if (!existsSync(adrDir)) {
    return [];
  }

  try {
    const files = readdirSync(adrDir);
    const adrs = [];
    for (const f of files) {
      const m = f.match(/^(\d{3,4})-(.+)\.md$/);
      if (!m) {
        continue;
      }
      try {
        const content = readFileSync(join(adrDir, f), "utf8");
        const number = parseInt(m[1]);
        const title = content.match(/^# (?:ADR-)?\d{3,4}: (.+)$/m)?.[1] || m[2].replaceAll("-", " ");
        const date = content.match(/\*\*Date\*\*: (\S+)/)?.[1] || "";
        const statusRaw =
          content.match(/\*\*Status\*\*:\s*(.+?)(?:\n|$)/)?.[1] ||
          content.match(/^## Status\s*\n+\s*(.+?)(?:\n|$)/m)?.[1] ||
          "proposed";
        const status = statusRaw
          .replaceAll("**", "")
          .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, "$1")
          .trim()
          .split(/\s+/, 1)[0];
        const tagsLine = content.match(/\*\*Tags\*\*: (.+)/)?.[1] || "";
        const tags = tagsLine
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        // Extract decision blurb (first 2 lines of Decision section)
        const decision =
          content
            .match(/## Decision\n\n([\s\S]*?)(?:\n## |$)/)?.[1]
            ?.split("\n")
            .slice(0, 2)
            .join(" ")
            .slice(0, 200) || "";
        adrs.push({ number, title, date, status, tags, decision });
      } catch {
        /* malformed ADR file - skip */
      }
    }
    return adrs.sort((a, b) => b.number - a.number);
  } catch {
    return [];
  }
}

/**
 * Read all .context/ files and return key-value pairs.
 */
function readContextValues(projectDir) {
  const ctxDir = join(projectDir, CONTEXT_DIR);
  if (!existsSync(ctxDir)) {
    return {};
  }

  const values = {};
  try {
    const files = readdirSync(ctxDir).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      try {
        const content = readFileSync(join(ctxDir, f), "utf8");
        // Extract YAML-like or markdown list items
        const lines = content.split("\n");
        for (const line of lines) {
          const m = line.match(/^\*\*(\w+)\*\*:\s*(.+)/);
          if (m) {
            values[m[1]] = m[2].trim();
          }
          const m2 = line.match(/^- \*\*(\w+)\*\*:\s*(.+)/);
          if (m2) {
            values[m2[1]] = m2[2].trim();
          }
        }
      } catch {
        /* unreadable context file - skip */
      }
    }
  } catch {
    /* context dir unreadable */
  }
  return values;
}

/**
 * Read project identity from package.json.
 */
function readProjectIdentity(projectDir) {
  const packagePath = join(projectDir, "package.json");
  if (!existsSync(packagePath)) {
    return {};
  }
  try {
    const package_ = JSON.parse(readFileSync(packagePath, "utf8"));
    return {
      name: package_.name || "",
      description: package_.description || "",
      version: package_.version || "",
    };
  } catch {
    return {};
  }
}

const HandoffSchema = z.object({
  projectDir: z.string().optional().default(".").describe("Project root directory"),
  mode: z
    .enum(["handoff", "close-session"])
    .optional()
    .default("handoff")
    .describe(
      "handoff: generate context summary. close-session: full session close with git diff, roadmap check, doc scan.",
    ),
  includeContext: z.boolean().optional().default(true).describe("Include .context/ values"),
  includeAdrs: z.boolean().optional().default(true).describe("Include ADR summaries"),
  includeIdentity: z.boolean().optional().default(true).describe("Include project identity"),
  includeGitDiff: z.boolean().optional().default(true).describe("Include git working tree diff"),
  includeGitLog: z.boolean().optional().default(true).describe("Include recent git log"),
  includeRoadmap: z.boolean().optional().default(true).describe("Include roadmap/docs scan"),
  compress: z.boolean().optional().default(false).describe("Aggressively compress output"),
  maxTokens: z.number().optional().default(0).describe("Target max tokens (0 = no limit)"),
  format: z.enum(["full", "brief", "minimal"]).optional().default("full").describe("Output detail level"),
});

/**
 * Rough token estimation (English text, 1 token ≈ 4 chars).
 */
function estimateTokens(text) {
  // For mixed text/code, ~4 chars per token is a reasonable heuristic
  return Math.ceil((text.length + text.split(/\s+/).length * 0.3) / 4);
}

/**
 * Compress a value: truncate long strings, deduplicate, etc.
 */
function compressValue(v, maxLength = 80) {
  if (!v || v === "-") {
    return "-";
  }
  const string_ = String(v);
  if (string_.length <= maxLength) {
    return string_;
  }
  return string_.slice(0, maxLength - 3) + "...";
}

/**
 * Priority-scored entries. Higher = more important to keep.
 */
function priorityScore(key) {
  if (/ADR|decision|arch/i.test(key)) {
    return 100;
  }
  if (/PROJECT_TYPE|STACK|BUILD/i.test(key)) {
    return 80;
  }
  if (/DOMAIN|ENTITY|PERSONA|FEATURE/i.test(key)) {
    return 60;
  }
  if (/VERSION|NODE|TYPESCRIPT/i.test(key)) {
    return 40;
  }
  if (/DESCRIPTION|NAME|PITCH/i.test(key)) {
    return 50;
  }
  if (/NOTES|CONSTRAINT|NEED/i.test(key)) {
    return 30;
  }
  return 10;
}

/**
 * Safely run a shell command, returning stdout or empty string on failure.
 */
function tryExec(command, options = {}) {
  try {
    return execSync(command, { encoding: "utf8", timeout: 10_000, stdio: "pipe", ...options });
  } catch {
    return "";
  }
}

/**
 * Get git working tree diff (uncommitted changes).
 * Returns summary + list of changed files + full diff.
 */
function getGitDiff(projectDir) {
  const gitDir = join(projectDir, ".git");
  if (!existsSync(gitDir)) {
    return { summary: "", files: [], diff: "" };
  }

  const summary = tryExec("git diff --stat", { cwd: projectDir }).trim();
  const staged = tryExec("git diff --cached --stat", { cwd: projectDir }).trim();
  const diff = tryExec("git diff", { cwd: projectDir }).trim();
  const stagedDiff = tryExec("git diff --cached", { cwd: projectDir }).trim();
  const untracked = tryExec("git status --porcelain", { cwd: projectDir }).trim();

  // Parse file list
  const statOutput = [summary, staged].filter(Boolean).join("\n");
  const files = statOutput
    .split("\n")
    .filter((l) => l.includes("|"))
    .map((l) => l.split("|", 1)[0].trim())
    .filter(Boolean);

  return {
    summary: statOutput || "(no uncommitted changes)",
    files: [...new Set(files)],
    untracked: untracked || "",
    unstaged: diff,
    staged: stagedDiff,
  };
}

/**
 * Get recent git log (last 20 commits, one-line format).
 */
function getGitLog(projectDir) {
  const gitDir = join(projectDir, ".git");
  if (!existsSync(gitDir)) {
    return "";
  }

  const log = tryExec("git log --oneline --abbrev-commit --max-count=20 --pretty=format:'%h %s (%ar)'", {
    cwd: projectDir,
  }).trim();

  return log || "(no commits yet)";
}

/**
 * Scan docs/ for roadmap files, changelogs, and key documentation.
 * Reports file sizes and last modified dates.
 */
function scanProjectDocs(projectDir) {
  const docsPath = join(projectDir, DOCS_DIR);
  if (!existsSync(docsPath)) {
    return { roadmaps: [], changelogs: [], keyDocs: [], scanDate: new Date().toISOString() };
  }

  const result = { roadmaps: [], changelogs: [], keyDocs: [], scanDate: new Date().toISOString() };

  try {
    const entries = readdirSync(docsPath, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      const fullPath = join(entry.parentPath, entry.name);
      const relPath = relative(projectDir, fullPath);
      const isRoadmap = /roadmap|plan/i.test(entry.name);
      const isChangelog = /changelog|changes|history/i.test(entry.name);

      try {
        const stat = statSync(fullPath);
        const info = {
          path: relPath,
          size: stat.size,
          modified: stat.mtime.toISOString().slice(0, 10),
        };

        if (isRoadmap) {
          result.roadmaps.push(info);
        } else if (isChangelog) {
          result.changelogs.push(info);
        } else {
          result.keyDocs.push(info);
        }
      } catch {
        /* skip unreadable */
      }
    }
  } catch {
    /* skip unreadable */
  }

  return result;
}

/**
 * Build the handoff prompt text with compression support.
 */
function buildHandoff({
  projectDir,
  includeContext,
  includeAdrs,
  includeIdentity,
  includeGitDiff,
  includeGitLog,
  includeRoadmap,
  compress,
  maxTokens,
  format,
  mode,
}) {
  const lines = [];
  const identity = includeIdentity ? readProjectIdentity(projectDir) : {};
  const adrs = includeAdrs ? readAdrs(projectDir) : [];
  const contextValues = includeContext ? readContextValues(projectDir) : {};
  const gitDiff = includeGitDiff === false ? null : getGitDiff(projectDir);
  const gitLog = includeGitLog === false ? null : getGitLog(projectDir);
  const docsScan = includeRoadmap === false ? null : scanProjectDocs(projectDir);
  const isCloseSession = mode === "close-session";

  const projectName =
    identity.name || (projectDir === "." ? process.cwd().split("/").pop() : projectDir.split("/").pop());
  const isBrief = format === "brief";
  const isMinimal = format === "minimal";

  // ── Header ──
  if (isMinimal) {
    lines.push(`HANDOFF:${projectName}`);
  } else {
    const title = isCloseSession ? "SESSION CLOSE" : "HANDOFF";
    lines.push(`## ${title}: ${projectName}`, "");
  }

  // ── Mode banner ──
  if (isCloseSession && !isMinimal) {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    lines.push(`_Session closed at ${now}_`, `_Run \`rule_tool_process_handoff\` in a new session to resume._`, "");
  }

  // ── Identity ──
  if (identity.name && !isMinimal) {
    if (isBrief) {
      lines.push(`Project: ${identity.name}${identity.version ? ` v${identity.version}` : ""}`);
    } else {
      lines.push("### Project Identity");
      if (identity.description) {
        lines.push(`- Description: ${compressValue(identity.description, 150)}`);
      }
      if (identity.version) {
        lines.push(`- Version: ${identity.version}`);
      }
    }
    lines.push("");
  }

  // ── ADR Log (highest priority) ──
  if (adrs.length > 0) {
    if (isMinimal) {
      lines.push(`ADRs:${adrs.length}`);
      for (const a of adrs.slice(0, 3)) {
        lines.push(`- ${String(a.number).padStart(3, "0")}|${a.status}|${compressValue(a.title, 60)}`);
      }
    } else if (isBrief) {
      lines.push(`ADRs (${adrs.length}):`);
      for (const a of adrs) {
        lines.push(`- ${String(a.number).padStart(3, "0")}: [${a.status}] ${compressValue(a.title, 80)}`);
      }
    } else {
      lines.push(
        "### ADR Log",
        "",
        "| # | Status | Title | Tags | Decision |",
        "|---|--------|-------|------|----------|",
      );
      for (const a of adrs) {
        lines.push(
          `| ${String(a.number).padStart(3, "0")} | ${a.status} | ${compressValue(a.title, 60)} | ${a.tags.slice(0, 3).join(", ")} | ${compressValue(a.decision, 100)} |`,
        );
      }
    }
    lines.push("");
  } else if (!isMinimal) {
    lines.push("### ADR Log", "*No ADRs recorded yet.*", "");
  }

  // ── Context Values (sorted by priority, then compressed) ──
  const contextEntries = Object.entries(contextValues);
  if (contextEntries.length > 0) {
    // Sort by priority score descending
    const sorted = contextEntries.sort((a, b) => priorityScore(b[0]) - priorityScore(a[0]));

    if (isMinimal) {
      // Compact JSON on one line
      const minimal = {};
      for (const [k, v] of sorted.slice(0, 15)) {
        minimal[k] = compressValue(v, 40);
      }
      lines.push(`Ctx:${JSON.stringify(minimal)}`);
    } else if (compress) {
      // Compressed: short key=value format, skip _count fields
      const chunk = sorted
        .filter(([k]) => !k.endsWith("_count"))
        .slice(0, 30)
        .map(([k, v]) => `${k}=${compressValue(String(v).replaceAll("\n", String.raw`\n`), 60)}`)
        .join("  ");
      lines.push("### Snapshot (compressed)", chunk);
    } else {
      // Full table
      lines.push("### Context Snapshot", "");
      for (const [k, v] of sorted) {
        if (!k.endsWith("_count")) {
          lines.push(`- \`${k}\`: ${compressValue(v, isBrief ? 50 : 200)}`);
        }
      }
    }
    lines.push("");
  }

  // ── Git Working Tree (uncommitted changes) ──
  if (gitDiff && gitDiff.files.length > 0) {
    if (isMinimal) {
      lines.push(`Changed:${gitDiff.files.length} files`);
    } else {
      lines.push("### Working Tree Changes (uncommitted)", "", `Changed ${gitDiff.files.length} file(s):`);
      for (const f of gitDiff.files) {
        lines.push(`- \`${f}\``);
      }
      lines.push("");
      if (!compress && gitDiff.unstaged.length > 0) {
        if (tokensaveActive(projectDir)) {
          // Defer to the code graph instead of dumping a raw diff.
          lines.push(TOKENSAVE_DIRECTIVE, "");
        } else {
          lines.push("```diff");
          lines.push(gitDiff.unstaged.slice(0, 2000), "```", "");
        }
      }
    }
  }

  // ── Git Log ──
  if (gitLog && gitLog.length > 0 && !isMinimal && !isBrief) {
    lines.push("### Recent Commits", "", "```");
    lines.push(gitLog.slice(0, 1000), "```", "");
  }

  // ── Docs & Roadmap Scan ──
  if (docsScan && !isMinimal) {
    const hasContent = docsScan.roadmaps.length > 0 || docsScan.changelogs.length > 0;
    if (hasContent) {
      lines.push("### Documentation Status", "");

      if (docsScan.roadmaps.length > 0) {
        lines.push("**Roadmaps:**");
        for (const r of docsScan.roadmaps) {
          lines.push(`- \`${r.path}\` (${r.size}B, last modified: ${r.modified})`);
        }
        lines.push("");
      }

      if (docsScan.changelogs.length > 0) {
        lines.push("**Changelogs:**");
        for (const c of docsScan.changelogs) {
          lines.push(`- \`${c.path}\` (${c.size}B, last modified: ${c.modified})`);
        }
        lines.push("");
      }
    }

    if (docsScan.keyDocs.length > 0 && !isBrief) {
      lines.push("**Key documents:**");
      const sorted = docsScan.keyDocs.sort((a, b) => b.modified.localeCompare(a.modified)).slice(0, 10);
      for (const d of sorted) {
        lines.push(`- \`${d.path}\` (${d.size}B, ${d.modified})`);
      }
      lines.push("");
    }
  }

  // ── Session close footer ──
  if (isCloseSession && !isMinimal) {
    lines.push(
      "### Next Session Recovery",
      "",
      "To resume this session in a new chat:",
      "",
      "1. Run `rule_tool_process_handoff` to load this context.",
      "2. Review the ADR log in `docs/adr/` for all decisions made.",
      "3. Check the working tree changes listed above.",
      "4. Review planning artifacts in `_bmad-output/` or `.context/` if applicable.",
      "5. Continue from the next logical task.",
      "",
    );
  }

  // ── Handoff Instruction ──
  if (isMinimal) {
    lines.push("Continue work on " + projectName + ". ADRs at docs/adr/. Do not re-ask.", "");
  } else {
    lines.push(
      "### Handoff Instruction",
      "",
      `You are continuing work on **${projectName}**.`,
      "The ADR log and context snapshot capture everything decided so far.",
      "",
      "Review ADRs for architectural decisions. Review snapshot for configuration.",
      "Continue without re-asking answered questions.",
      "",
    );
  }

  const output = lines.join("\n");
  const tokens = estimateTokens(output);

  // If over maxTokens, re-run as brief
  if (maxTokens > 0 && tokens > maxTokens && !isBrief && !isMinimal) {
    return buildHandoff({
      projectDir,
      includeContext,
      includeAdrs,
      includeIdentity,
      compress: true,
      maxTokens,
      format: "brief",
    });
  }
  if (maxTokens > 0 && tokens > maxTokens && isBrief && !isMinimal) {
    return buildHandoff({
      projectDir,
      includeContext,
      includeAdrs,
      includeIdentity,
      compress: true,
      maxTokens,
      format: "minimal",
    });
  }

  return {
    text: output,
    stats: {
      adrs: adrs.length,
      contextKeys: Object.keys(contextValues).length,
      lines: output.split("\n").length,
      tokens,
      format: isMinimal ? "minimal" : isBrief ? "brief" : "full",
    },
  };
}

/**
 * Register the rule_tool_process_handoff tool.
 */
export function registerProcessHandoffTool() {
  registerTool({
    name: "rule_tool_process_handoff",
    description:
      "Generate a compressed LLM handoff summary from ADR logs and project context. Paste the output into a new chat to resume work seamlessly.",
    zodSchema: HandoffSchema,
    inputSchema: {
      type: "object",
      properties: {
        projectDir: { type: "string", default: ".", description: "Project root directory" },
        includeContext: { type: "boolean", default: true, description: "Include .context/ values" },
        includeAdrs: { type: "boolean", default: true, description: "Include ADR summaries" },
        includeIdentity: { type: "boolean", default: true, description: "Include project identity" },
      },
    },
    handler: async (arguments_) => {
      const result = buildHandoff({
        projectDir: arguments_.projectDir || ".",
        mode: arguments_.mode || "handoff",
        includeContext: arguments_.includeContext !== false,
        includeAdrs: arguments_.includeAdrs !== false,
        includeIdentity: arguments_.includeIdentity !== false,
        includeGitDiff: arguments_.includeGitDiff !== false,
        includeGitLog: arguments_.includeGitLog !== false,
        includeRoadmap: arguments_.includeRoadmap !== false,
        compress: !!arguments_.compress,
        maxTokens: arguments_.maxTokens || 0,
        format: arguments_.format || "full",
      });

      const text = [result.text];
      const modeLabel = arguments_.mode === "close-session" ? "Session Close" : "Handoff";
      text.push(
        "---",
        `_${modeLabel}: ${result.stats.format}, ${result.stats.adrs} ADRs, ${result.stats.contextKeys} keys, ${result.stats.lines} lines, ~${result.stats.tokens} tokens._`,
      );

      return {
        content: [
          {
            type: "text",
            text: text.join("\n"),
          },
        ],
      };
    },
  });
}
