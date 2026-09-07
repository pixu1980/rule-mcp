/** @module server/completions - the completion/complete request handler */

import { CompleteRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { HANDOFF_COMPLETIONS } from "../prompts/_handoff-options.data.js";

/** Register the completion handler on the server. */
export function registerCompletionHandler(server) {
  server.setRequestHandler(CompleteRequestSchema, async (request) => {
    const { ref, argument } = request.params;

    // Prompt argument completion
    if (ref?.type === "ref/prompt" && ref.name) {
      const promptName = ref.name;
      const complete = (values, prefix = argument.value ?? "") => {
        const filtered = values.filter((v) => v.startsWith(prefix));

        return { completion: { values: filtered.slice(0, 10), total: filtered.length, hasMore: filtered.length > 10 } };
      };

      // Every rule-* prompt takes a single free-form primary argument, so
      // only rule-handoff (fixed token vocabulary) needs argument completions.
      if (promptName === "rule-handoff" && argument.name === "options") {
        // Token-aware completion: complete the last token of a space-separated list.
        const value = argument.value ?? "";
        const last = value.split(/\s+/).pop() ?? "";

        return complete(HANDOFF_COMPLETIONS, last);
      }
    }

    return { completion: { values: [], total: 0, hasMore: false } };
  });
}
