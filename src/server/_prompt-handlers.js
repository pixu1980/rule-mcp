

/**
 * @module server/prompt-handlers - the prompts/list and prompts/get handlers
 *
 * A prompt body is persona prose the server emits and the model pays for, so
 * `prompts/get` runs it through the same compression pass and structural guard
 * as a tool result. `prompts/list` shortens its descriptions the same way: a
 * description is prose the model reads to choose a prompt, so it sheds filler
 * while names and argument names (the machine contract) stay (plan 2a).
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

/**
 * Shorten one prompt description (and each argument hint) with the same pass
 * the prompt bodies use. Names are the schema contract clients match on and
 * never change; only prose sheds filler. Booked under its own source.
 *
 * @param {string} text
 * @returns {string}
 */
function compressPromptText(text) {
  return compressSurfaceText(String(text ?? ""), { source: "caveman-prompt-list" }).text;
}

/** Register the prompt handlers on the server. */
export function registerPromptHandlers(server) {
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts = listPrompts().map(({ name, description, arguments: arguments_ }) => ({
      name,
      description: compressPromptText(description),
      arguments: (arguments_ ?? []).map(({ name, description, required }) => ({ name, description: compressPromptText(description), required })),
    }));

    return { prompts };
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
