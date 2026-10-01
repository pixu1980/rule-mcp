

/**
 * @module tools/structural
 *
 * rule_tool_structural - the model says the task it is starting is structural,
 * so the one confirmation of that task is asked about the decision instead of
 * about whichever file happens to be written first.
 *
 * The signals in the guard are a net, not the road: a rename that moves a
 * boundary looks like an ordinary edit from the payload, and only the model
 * knows it is not. Declaring costs one call and buys a question the person at
 * the keyboard can actually answer.
 *
 * @see module:cli/guard/_structure - the gate that reads this
 */

import { z } from "zod/v4";
import { registerTool } from "../router/index.js";

/** Register rule_tool_structural. */
export function registerStructuralTool() {
  const StructuralSchema = z.object({
    summary: z.string().min(1).describe("What is changing and why it is structural, in one sentence the person confirming can judge"),
    projectDir: z.string().optional().describe("Project root directory"),
  });

  registerTool({
    name: "rule_tool_structural",
    entry: "action",
    description:
      "Declare the current task structural or architectural. The next write asks for one confirmation, stating this summary, and the rest of the task proceeds without asking again. Call it before changing a boundary, a contract, a dependency or a layout, not for ordinary edits.",
    zodSchema: StructuralSchema,
    handler: async (arguments_) => {
      const { declareStructural } = await import("../../cli/guard/_task.js");

      declareStructural(arguments_.projectDir, arguments_.summary);

      return {
        content: [
          {
            type: "text",
            text: [
              "This task is recorded as structural.",
              "",
              `Declared: ${arguments_.summary}`,
              "",
              "The first file you write now asks for one confirmation. Every file after it in this task lands without asking.",
            ].join("\n"),
          },
        ],
      };
    },
  });
}
