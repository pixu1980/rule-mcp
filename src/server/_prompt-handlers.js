/**
 * @module server/prompt-handlers - the prompts/list and prompts/get handlers
 *
 * A prompt body is persona prose the server emits and the model pays for, so
 * `prompts/get` runs it through the same compression pass and structural guard
 * as a tool result. `prompts/list` is left alone on purpose: its descriptions
 * and argument hints are the schema clients render, not prose to shorten.
 */

import { GetPromptRequestSchema, ListPromptsRequestSchema, ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { compressSurfaceText } from "../core/text/_caveman.js";
import { recordToolCall } from "../core/telemetry/recorder/index.js";
import { getPrompt, listPrompts } from "../prompts/index.js";

/**
 * Compress the text of every message in a prompt body.
 *
 * @param {Array<{ role: string, content: { type: string, text?: string } }>} messages
 * @returns {{ messages: Array<object>, saved: number }}
 */
function compressMessages(messages) {
  let saved = 0;

  const compressed = (messages ?? []).map((message) => {
    if (message?.content?.type !== "text" || typeof message.content.text !== "string") {
      return message;
    }

    const result = compressSurfaceText(message.content.text, { source: "caveman-prompt" });
    saved += result.saved;

    return { ...message, content: { ...message.content, text: result.text } };
  });

  return { messages: compressed, saved };
}

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

    const startedAt = Date.now();
    const prompt = getPrompt(name, request.params.arguments ?? {});

    if (!prompt) {
      throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${name}`);
    }

    const { messages, saved } = compressMessages(prompt.messages);

    recordToolCall({
      tool: `prompt:${name}`,
      durationMs: Date.now() - startedAt,
      saved: { "caveman-prompt": Math.ceil(saved / 4) },
    });

    return { description: prompt.description, messages };
  });
}
