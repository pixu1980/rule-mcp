/**
 * @module tools/adr
 *
 * rule_tool_process_adr MCP tool - Architecture Decision Records.
 * Saves ADRs to docs/adr/ with auto-numbering and index maintenance.
 *
 * @see module:tools/router - registered via registerProcessAdrTool()
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod/v4";
import { registerTool } from "./router/index.js";
import { addAfterToolHook } from "./router/index.js";
import { scanDocumentForForeign, scanPathForForeign } from "../core/text/_en-english.js";

/** ADR directory relative to project root. */
const ADR_DIR = "docs/adr";
const THEME_THRESHOLD = 3;
const SUMMARY_LIMIT = 220;

/** Strip diacritics and special chars for slug. */
function slugify(text) {
  return text
    .toLowerCase()
    .replaceAll(/[àáâãäå]/g, "a")
    .replaceAll(/[èéêë]/g, "e")
    .replaceAll(/[ìíîï]/g, "i")
    .replaceAll(/[òóôõö]/g, "o")
    .replaceAll(/[ùúûü]/g, "u")
    .replaceAll("ñ", "n")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 80);
}

/** Get next ADR number. */
export const ADR_INDEX_FILE = "ADR.md";

function nextAdrNumber(adrDir) {
  try {
    const files = readdirSync(adrDir);
    const nums = files.filter((f) => /^\d{3}-/.test(f)).map((f) => parseInt(f.match(/^(\d{3})-/)[1], 10));

    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  } catch {
    return 1;
  }
}

/** Generate ADR filename. */
function adrFilename(number, title) {
  const slug = slugify(title);

  return `${String(number).padStart(3, "0")}-${slug}.md`;
}

/** Generate ADR markdown content. */
function generateAdr({
  number,
  title,
  status,
  context,
  decision,
  consequences,
  alternatives,
  endsWhen,
  tags,
  date,
  author,
}) {
  date ??= new Date().toISOString().slice(0, 10);
  const lines = [
    `# ${String(number).padStart(3, "0")}: ${title}`,
    "",
    `- **Date**: ${date}`,
    `- **Status**: ${status}`,
    `- **Tags**: ${tags.join(", ")}`,
    `- **Author**: ${author || adrAuthor()}`,
    "",
    "## Context",
    "",
    context || "The forcing factors that led to this decision.",
    "",
    "## Decision",
    "",
    decision || "The decision taken, and why.",
    "",
    "## Consequences",
    "",
    consequences || "What this costs and what it buys, both stated.",
    "",
    // Written now, because the assumptions a decision leans on are clear while
    // it is being taken and invisible a year later. Without it a reversal is
    // only ever noticed by accident.
    "## What would end this",
    "",
    endsWhen || "The assumption this leans on, and the observation that would make it wrong.",
    "",
  ];

  if (alternatives?.length > 0) {
    lines.push("## Alternatives Considered", "");

    for (const alt of alternatives) {
      lines.push(`1. ${alt}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

/** Exported so the template can be asserted without writing a file. */
export function buildAdrBody(fields) {
  return generateAdr(fields);
}

/**
 * The first sentence of a prose section, flattened for a table cell.
 */
function firstSentence(text) {
  const flat = (text ?? "").replaceAll(/\s+/g, " ").trim();

  if (flat.length === 0) {
    return "";
  }

  const [sentence] = flat.split(/(?<=[a-z)\]"])\.\s+(?=[A-Z`])/, 1);
  let out = sentence.endsWith(".") ? sentence : `${sentence}.`;

  if (out.length > SUMMARY_LIMIT) {
    out = `${out.slice(0, out.lastIndexOf(" ", SUMMARY_LIMIT))}...`;
  }

  return out.replaceAll("|", String.raw`\|`);
}

/**
 * Pull one `## Heading` section out of an ADR body.
 */
/**
 * Pull one `## Heading` section out of an ADR body.
 */
function section(body, heading) {
  return new RegExp(String.raw`^## ${heading}\s*\n([\s\S]*?)(?=\n## |$)`, "m").exec(body ?? "")?.[1] ?? "";
}

export function listExistingAdrs(adrDir) {
  try {
    const files = readdirSync(adrDir);
    const adrs = [];

    for (const f of files) {
      const m = f.match(/^(\d{3})-(.+)\.md$/);

      if (m) {
        const content = readFileSync(join(adrDir, f), "utf8");
        const title = content.match(/^# \d{3}: (.+)$/m)?.[1] || m[2].replaceAll("-", " ");
        const date = content.match(/\*\*Date\*\*: (\S+)/)?.[1] || "";
        const status = content.match(/\*\*Status\*\*: (\w+)/)?.[1] || "proposed";
        const tagsLine = content.match(/\*\*Tags\*\*: (.+)/)?.[1] || "";
        const tags = tagsLine
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        adrs.push({
          file: f,
          number: parseInt(m[1]),
          title,
          date,
          status,
          tags,
          decision: firstSentence(section(content, "Decision")),
          consequence: firstSentence(section(content, "Consequences")),
        });
      }
    }

    return adrs;
  } catch {
    return [];
  }
}

/**
 * Non-English content in the ADR fields, one offense per finding.
 *
 * The title feeds the file name (ADR 060 landed with an Italian slug), so it
 * runs through the path scanner word by word; the prose fields run through
 * both the document scanner (function words, accents) and the path scanner
 * (name-plausible content words).
 *
 * @param {{ title?: string, context?: string, decision?: string, consequences?: string, alternatives?: string[] }} fields
 * @returns {string[]} human-readable offenses, empty when everything is English
 */
export function adrEnglishOffenses(fields) {
  const offenses = [];
  const prose = [
    ["title", fields.title ?? ""],
    ["context", fields.context ?? ""],
    ["decision", fields.decision ?? ""],
    ["consequences", fields.consequences ?? ""],
    ["alternatives", (fields.alternatives ?? []).join("\n")],
  ];

  for (const [field, text] of prose) {
    if (text === "") {
      continue;
    }

    for (const finding of [...scanDocumentForForeign(text), ...scanPathForForeign(text.replaceAll(/[\\/]+/g, " "))]) {
      offenses.push(`${field}: ${finding}`);
    }
  }

  return offenses;
}

const ADRSchema = z.object({
  title: z.string().min(1).describe("ADR title, in English (e.g. 'Use PostgreSQL as the primary database')"),
  status: z.enum(["proposed", "accepted", "deprecated", "superseded"]).default("accepted").describe("ADR status"),
  context: z.string().optional().describe("Context: what forcing factors led to this decision"),
  decision: z.string().optional().describe("The decision made and why"),
  consequences: z.string().optional().describe("Consequences: positive and negative outcomes"),
  alternatives: z.array(z.string()).optional().describe("Alternative options considered"),
  tags: z
    .array(z.string())
    .default(["architecture"])
    .describe("Tags for categorization (e.g. database, api, frontend)"),
  projectDir: z.string().optional().default(".").describe("Project root directory"),
});

/**
 * The author stamped on new ADRs from git identity.
 *
 * @param {() => string} [read] - injected by the tests
 * @returns {string}
 */
export function adrAuthor(read = gitConfig) {
  try {
    const name = read("user.name");

    if (!name) {
      return "rule-mcp";
    }

    const email = read("user.email");

    return email ? `${name} <${email}>` : name;
  } catch {
    return "rule-mcp";
  }
}

/** Read one git config key, or "" when it is not set. */
function gitConfig(key) {
  try {
    return execFileSync("git", ["config", "--get", key], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Rendered ADR index as text, the shape the docs-numbering tool rewrites.
 *
 * @param {Array<{ file?: string, number: number, title: string, date?: string, status: string, tags?: string[] }>} entries
 * @returns {string}
 */
export function buildAdrIndex(entries) {
  const sorted = [...entries].sort((a, b) => b.number - a.number);
  const label = (entry) => String(entry.number).padStart(3, "0");
  const link = (entry) => `[${label(entry)}](${entry.file || adrFilename(entry.number, entry.title)})`;

  const lines = [
    "# Architecture Decision Records",
    "",
    "Every decision this project has taken, newest first. The numbered files in",
    "this directory are the source of truth; this index is generated from them by",
    "`rule_tool_process_adr`, so editing it by hand is work the next call throws away.",
    "",
    "## Index",
    "",
    "| # | Title | Date | Status | Tags |",
    "|---|-------|------|--------|------|",
    ...sorted.map(
      (entry) =>
        `| ${link(entry)} | ${entry.title} | ${entry.date || "-"} | ${entry.status} | ${entry.tags.join(", ") || "-"} |`,
    ),
    "",
    "## What each decision says",
    "",
    "The opening sentence of each decision and of what it cost, lifted from the",
    "file. Where a line stops short the rest is in the ADR.",
    "",
    "| ADR | Decision | Consequence |",
    "|-----|----------|-------------|",
    ...sorted.map((entry) => `| ${link(entry)} | ${entry.decision || "-"} | ${entry.consequence || "-"} |`),
    "",
    "## By theme",
    "",
  ];

  const counts = new Map();

  for (const entry of entries) {
    for (const tag of entry.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const themes = [...counts]
    .filter(([, count]) => count >= THEME_THRESHOLD)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);

  lines.push(
    `Tags carried by ${THEME_THRESHOLD} or more decisions. A decision appears under every`,
    "theme it carries, and the early ADRs that predate the tag field are listed last.",
    "",
  );

  for (const theme of themes) {
    const members = sorted.filter((entry) => entry.tags.includes(theme));
    lines.push(`### ${theme}`, "", ...members.map((entry) => `- ${link(entry)} ${entry.title}`), "");
  }

  const untagged = sorted.filter((entry) => entry.tags.length === 0);

  if (untagged.length > 0) {
    lines.push("### no tags", "", ...untagged.map((entry) => `- ${link(entry)} ${entry.title}`), "");
  }

  lines.push(
    "## Operating rules",
    "",
    "- Record a structural decision with `rule_tool_process_adr`, when it is taken.",
    "- Never rewrite an accepted decision. Supersede it with a new one that says why.",
    "- Never edit this file. Edit the ADR and let the next call regenerate it.",
    "",
  );

  return lines.join("\n");
}

/** Write the ADR index. */
function updateAdrIndex(adrDir, entries) {
  writeFileSync(join(adrDir, ADR_INDEX_FILE), buildAdrIndex(entries));
}

/**
 * Register the rule_tool_process_adr tool.
 */
export function registerProcessAdrTool() {
  registerTool({
    name: "rule_tool_process_adr",
    description:
      "Save an Architecture Decision Record (ADR) to docs/adr/. Auto-numbers, maintains index, uses Nygard template.",
    zodSchema: ADRSchema,
    handler: async (arguments_) => {
      const offenses = adrEnglishOffenses(arguments_);

      if (offenses.length > 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: [
                "❌ ADR rejected: every ADR is written in English, filename included.",
                "",
                ...offenses.slice(0, 10).map((offense) => `- ${offense}`),
                "",
                "Rewrite the title and body in English (American spelling) and call the tool again.",
              ].join("\n"),
            },
          ],
        };
      }

      const projectDir = arguments_.projectDir || ".";
      const adrDir = join(projectDir, ADR_DIR);
      mkdirSync(adrDir, { recursive: true });

      const number = nextAdrNumber(adrDir);
      const content = generateAdr({
        number,
        title: arguments_.title,
        status: arguments_.status || "accepted",
        context: arguments_.context || "",
        decision: arguments_.decision || "",
        consequences: arguments_.consequences || "",
        alternatives: arguments_.alternatives || [],
        tags: arguments_.tags || ["architecture"],
      });

      const filename = adrFilename(number, arguments_.title);
      const filePath = join(adrDir, filename);
      writeFileSync(filePath, content);

      // Update index - listExistingAdrs reads from disk (already includes the new ADR)
      const existing = listExistingAdrs(adrDir);
      updateAdrIndex(adrDir, existing);

      return {
        content: [
          {
            type: "text",
            text: [
              `✅ ${String(number).padStart(3, "0")} created: ${arguments_.title}`,
              "",
              `File: ${filePath}`,
              `Status: ${arguments_.status || "accepted"}`,
              `Tags: ${(arguments_.tags || ["architecture"]).join(", ")}`,
              "",
              "```markdown",
              content,
              "```",
            ].join("\n"),
          },
        ],
      };
    },
  });

  // ── Auto-ADR hook: logs tool calls as lightweight ADR entries ──

  /**
   * Auto-create an ADR after significant tool calls.
   * Summary-level: title + context only, no full decision.
   */
  const autoLog = async (toolName, arguments_, result) => {
    const testProcess = process.argv.some((argument) => /(?:^|[\\/])test[\\/]/.test(argument));

    if (process.env.RULE_MCP_DISABLE_AUTO_ADR === "1" || process.env.NODE_ENV === "test" || testProcess) {
      return;
    }

    const relevant = ["pix_tool", "rule_tool_scaffold", "rule_tool_detect", "rule_tool_fix"];

    if (!relevant.includes(toolName)) {
      return;
    }

    const projectDir = arguments_.projectDir || ".";
    const adrDir = join(projectDir, "docs/adr");
    mkdirSync(adrDir, { recursive: true });

    const number = nextAdrNumber(adrDir);
    const now = new Date().toISOString();
    const dateString = now.slice(0, 10);
    const timeString = now.slice(11, 19);

    // Build title and context based on tool type
    let title;
    let tags = "tool, auto-log";
    let contextLines;
    let decisionLines;
    let consequenceLines = ["None - informational entry."];

    switch (toolName) {
      case "pix_tool": {
        // pix_tool: capture prompt + routing result
        const prompt = (arguments_.prompt || "").slice(0, 200);
        let route = "unknown";
        let confidence = "0";
        let alternatives = "";
        try {
          const resultText = result?.content?.[0]?.text || "{}";
          const parsed = JSON.parse(resultText);

          if (parsed.route) {
            route = parsed.route;
          }

          if (parsed.confidence) {
            confidence = String(parsed.confidence);
          }

          if (parsed.alternatives?.length > 0) {
            alternatives = parsed.alternatives
              .slice(0, 3)
              .map((a) => `${a.route} (${a.confidence})`)
              .join(", ");
          }
        } catch {
          /* use defaults */
        }

        title = `Skill routing: ${prompt.slice(0, 80)}`;
        tags = "tool, auto-log, routing";
        contextLines = [`Prompt: "${prompt}"`, `Routed to: **${route}** (confidence: ${confidence})`];

        if (alternatives) {
          contextLines.push(`Alternatives: ${alternatives}`);
        }

        decisionLines = [`Use \`${route}\` for this task.`];

        break;
      }
      case "rule_tool_scaffold": {
        title = `Scaffold: ${arguments_.mode || "generate"} ${arguments_.file || "all files"}`;
        contextLines = [`Scaffold operation: ${arguments_.mode || "generate"}`, `File: ${arguments_.file || "all"}`];
        decisionLines = [`Project scaffold files generated/validated.`];

        break;
      }
      case "rule_tool_detect": {
        title = `Framework detection for ${arguments_.path || "."}`;
        let framework = "unknown";
        try {
          const resultText = result?.content?.[0]?.text || "{}";
          const parsed = JSON.parse(resultText);
          framework = parsed.framework || "unknown";
        } catch {
          /* result may not be valid JSON */
        }

        contextLines = [`Path: ${arguments_.path || "."}`, `Detected framework: ${framework}`];
        decisionLines = [`Use ${framework} tooling for this project.`];

        break;
      }
      case "rule_tool_fix": {
        title = `File tree fix: ${arguments_.mode || "lint"} on ${arguments_.path || "."}`;
        tags = "tool, auto-log, file-tree";
        contextLines = [`Mode: ${arguments_.mode || "lint"}`, `Source: ${arguments_.srcDir || "src"}`];
        decisionLines = [`File tree validated/fixed for rule AI conventions.`];

        break;
      }
      default: {
        // Generic (any rule_tool_* action)
        title = `Tool: ${toolName} - ${arguments_.action || arguments_.mode || "execute"}`;
        contextLines = [`Tool: ${toolName}`, `Args: ${JSON.stringify(arguments_).slice(0, 200)}`];
        decisionLines = [`Tool executed successfully.`];
      }
    }

    const content = [
      `# ${String(number).padStart(3, "0")}: ${title}`,
      "",
      `- **Date**: ${dateString} ${timeString}`,
      `- **Status**: accepted`,
      `- **Tags**: ${tags}`,
      "- **Author**: rule-mcp",
      "",
      "## Context",
      "",
      ...contextLines,
      "",
      "## Decision",
      "",
      ...decisionLines,
      "",
      "## Consequences",
      "",
      ...consequenceLines,
      "",
    ].join("\n");

    const filename = `${String(number).padStart(3, "0")}-${slugify(title.slice(0, 60))}.md`;
    writeFileSync(join(adrDir, filename), content);

    const existing = listExistingAdrs(adrDir);
    updateAdrIndex(adrDir, existing);
  };

  // Auto-logging: disabled by default. Enable with RULE_MCP_AUTO_ADR=1.
  if (process.env.RULE_MCP_AUTO_ADR === "1") {
    addAfterToolHook("*", autoLog);
  }
}
