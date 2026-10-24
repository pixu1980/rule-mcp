

/** The prompts handlers list the registry and reject bad gets, against a stub server. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { registerPromptHandlers } from "../_prompt-handlers.js";

/** A server stub that only records its handlers, in registration order. */
function stubServer() {
  const handlers = [];

  return {
    handlers,
    setRequestHandler(_schema, handler) {
      handlers.push(handler);
    },
  };
}

test("prompts/list serves the registry with compressed descriptions", async () => {
  const server = stubServer();
  registerPromptHandlers(server);
  assert.equal(server.handlers.length, 2, "list and get are both registered");

  const { prompts } = await server.handlers[0]();

  assert.ok(prompts.length > 0, "the registry is served");
  assert.ok(
    prompts.every((prompt) => typeof prompt.name === "string" && typeof prompt.description === "string" && Array.isArray(prompt.arguments)),
    "every entry carries its name, description and arguments",
  );
});

test("prompts/list honors RULE_MCP_NO_PROMPTS suppression", async () => {
  const server = stubServer();
  registerPromptHandlers(server);
  const previous = process.env.RULE_MCP_NO_PROMPTS;
  process.env.RULE_MCP_NO_PROMPTS = "1";

  try {
    const { prompts } = await server.handlers[0]();

    assert.equal(prompts.length, 0, "suppressed prompts/list must return no prompts, so Claude Code shows only the local /rule-mcp-* commands");
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_NO_PROMPTS;
    } else {
      process.env.RULE_MCP_NO_PROMPTS = previous;
    }
  }
});

test("prompts/get rejects a missing or unknown name", async () => {
  const server = stubServer();
  registerPromptHandlers(server);
  const get = server.handlers[1];

  await assert.rejects(get({ params: {} }), /Prompt name is required/, "a nameless get is rejected");
  await assert.rejects(get({ params: { name: "no-such-prompt", arguments: {} } }), /Unknown prompt/, "an unknown name is rejected");
});
