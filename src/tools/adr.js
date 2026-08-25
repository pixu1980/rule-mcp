/**
 * @module tools/adr
 *
 * rule_tool_process_adr MCP tool - Architecture Decision Records.
 * Saves ADRs to docs/adr/ with auto-numbering and index maintenance.
 *
 * @see module:tools/router - registered via registerProcessAdrTool()
 */

// eslint-disable-next-line no-unused-vars
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod/v4";
import { registerTool } from "./router.js";
import { addAfterToolHook } from "./router.js";

/** ADR directory relative to project root. */
const ADR_DIR = "docs/adr";

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
function generateAdr({ number, title, status, context, decision, consequences, alternatives, tags }) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# ${String(number).padStart(3, "0")}: ${title}`,
    "",
    `- **Date**: ${date}`,
    `- **Status**: ${status}`,
    `- **Tags**: ${tags.join(", ")}`,
    "- **Author**: rule-mcp",
    "",
    "## Context",
    "",
    context || "Inserire il contesto che ha portato a questa decisione.",
    "",
    "## Decision",
    "",
    decision || "Inserire la decisione presa.",
    "",
    "## Consequences",
    "",
    consequences || "Inserire le conseguenze positive e negative.",
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

/** Update ADR index (docs/adr/README.md). */
function updateAdrIndex(adrDir, entries) {
  const indexFile = join(adrDir, "README.md");
  const lines = [
    "# Architecture Decision Records",
    "",
    "Questo indice elenca tutti gli ADR in ordine cronologico.",
    "",
    "| # | Title | Date | Status | Tags |",
    "|---|-------|------|--------|------|",
  ];

  // Sort by number descending (newest first)
  const sorted = [...entries].sort((a, b) => b.number - a.number);
  for (const e of sorted) {
    const file = e.file || adrFilename(e.number, e.title);
    lines.push(
      `| [${String(e.number).padStart(3, "0")}](${file}) | ${e.title} | ${e.date} | ${e.status} | ${e.tags.join(", ")} |`,
    );
  }
  lines.push("");

  writeFileSync(indexFile, lines.join("\n"));
}

/**
 * Parse existing ADRs from the index or directory.
 * Returns array of { number, title, date, status, tags }.
 */
function listExistingAdrs(adrDir) {
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
        adrs.push({ file: f, number: parseInt(m[1]), title, date, status, tags });
      }
    }
    return adrs;
  } catch {
    return [];
  }
}

const ADRSchema = z.object({
  title: z.string().min(1).describe("ADR title (e.g. 'Usare PostgreSQL come database')"),
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
 * Register the rule_tool_process_adr tool.
 */
export function registerProcessAdrTool() {
  registerTool({
    name: "rule_tool_process_adr",
    description:
      "Save an Architecture Decision Record (ADR) to docs/adr/. Auto-numbers, maintains index, uses Nygard template.",
    zodSchema: ADRSchema,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "ADR title" },
        status: { type: "string", enum: ["proposed", "accepted", "deprecated", "superseded"], default: "accepted" },
        context: { type: "string", description: "Context forcing factors" },
        decision: { type: "string", description: "Decision made" },
        consequences: { type: "string", description: "Positive and negative consequences" },
        alternatives: { type: "array", items: { type: "string" }, description: "Alternatives considered" },
        tags: { type: "array", items: { type: "string" }, default: ["architecture"] },
        projectDir: { type: "string", default: ".", description: "Project root" },
      },
      required: ["title"],
    },
    handler: async (arguments_) => {
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
