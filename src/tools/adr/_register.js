

/** Register the rule_tool_process_adr MCP tool. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { recordDecision } from "../../core/tokensave/_memory.js";
import { registerTool } from "../router/index.js";
import { ADR_DIR, nextAdrNumber, adrFilename, listExistingAdrs } from "./_files.js";
import { generateAdr } from "./_body.js";
import { adrEnglishOffenses } from "./_english.js";
import { updateAdrIndex } from "./_adr-index.js";
import { ADRSchema } from "./_schema.js";
import { registerAutoAdrHook } from "./_auto-log.js";

/**
 * Register the ADR tool: English-gated authoring with auto-numbering and
 * index maintenance, plus the optional auto-log hook.
 */
export function registerProcessAdrTool() {
  registerTool({
    name: "rule_tool_process_adr",
    description: "Save an Architecture Decision Record (ADR) to docs/adr/. Auto-numbers, maintains index, uses Nygard template.",
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

      // The ADR file is the source of truth; the graph keeps a recall index
      // beside it. A missing graph is a no-op, never a failure.
      recordDecision(projectDir, {
        text: arguments_.title,
        reason: arguments_.decision || arguments_.context || "",
        files: [filePath],
        tags: arguments_.tags || ["architecture"],
      });

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

  registerAutoAdrHook();
}
