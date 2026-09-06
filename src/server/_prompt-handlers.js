/** @module server/prompt-handlers - the prompts/list and prompts/get handlers */

import { GetPromptRequestSchema, ListPromptsRequestSchema, ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { getPrompt, listPrompts } from "../prompts/index.js";

/** Register the prompt handlers on the server. */
export function registerPromptHandlers(server) {
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: listPrompts() };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;

    if (!name) {
      throw new McpError(ErrorCode.InvalidParams, "Prompt name is required");
    }

    const prompt = getPrompt(name, request.params.arguments ?? {});

    if (!prompt) {
      throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${name}`);
    }

    return { description: prompt.description, messages: prompt.messages };
  });
}
