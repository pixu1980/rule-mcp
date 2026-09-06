/**
 * @module server
 *
 * MCP Server bootstrap using @modelcontextprotocol/sdk.
 * Replaces the hand-rolled src/mcp/protocol.js + src/mcp/stdio.js.
 *
 * Creates a Server instance, registers tool/resource/prompt handlers
 * that delegate to the existing tool registry and core modules,
 * then connects via StdioServerTransport.
 *
 * @see module:tools/router
 * @see module:resources/index
 * @see module:prompts/index
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  CompleteRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { pkg as package_ } from "./cli/paths.js";
import { listTools, callTool } from "./tools/router/index.js";
import { decorateWithTokensave } from "./core/agents/_integrations.js";
import { listResources, readResource } from "./resources/index.js";
import { listPrompts, getPrompt } from "./prompts/index.js";
import { HANDOFF_COMPLETIONS } from "./prompts/_handoff-options.js";

/** @type {Server|null} */
let serverInstance = null;

/**
 * Configure an MCP Server instance with tool/resource/prompt handlers.
 * Does NOT connect a transport - that is done by startServer() (stdio)
 * or the SSE transport module.
 *
 * @returns {Server}
 */
export function createServer() {
  const server = new Server(
    {
      name: "rule-mcp",
      version: package_.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        logging: {},
        completions: {},
      },
    },
  );

  serverInstance = server;

  // ── Tool handlers ──────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: listTools() };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: arguments_ } = request.params;

    if (!name) {
      throw new McpError(ErrorCode.InvalidParams, "Tool name is required");
    }

    const result = await callTool(name, arguments_ ?? {});
    // Token-efficiency decoration happens at the MCP boundary only: internal
    // callers (CLI, tests, gateway) keep raw payloads.
    return decorateWithTokensave(name, result, arguments_ ?? {});
  });

  // ── Resource handlers ──────────────────────────────────────────

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = listResources();

    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (!uri) {
      throw new McpError(ErrorCode.InvalidParams, "Resource URI is required");
    }

    return readResource(uri);
  });

  // ── Completion handlers ────────────────────────────────────────

  // Completion is reserved for prompt arguments and resource templates only.
  // Tool argument completion is not supported by the MCP spec.
  // Returning empty completions until prompt argument completion is implemented.

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

  // ── Prompt handlers ────────────────────────────────────────────

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

  return server;
}

/**
 * Start the MCP server with stdio transport.
 * Reads JSON-RPC messages from stdin via StdioServerTransport,
 * dispatches to tool/resource/prompt handlers, writes responses to stdout.
 *
 * This function never returns - it keeps the process alive.
 *
 * @returns {Promise<void>}
 */
export async function startServer() {
  // A long-lived server shared by every client gets guarded checks: one
  // runaway regex must not freeze the daemon (hardening F-S1). The CLI
  // one-shot keeps running checks inline - a hung CLI is ctrl-C.
  const { enableGuardedChecks } = await import("./core/guardrails-guarded.js");
  enableGuardedChecks();
  // A stdio server lives and dies with its client: when the parent process
  // exits, stdin closes and this process must go with it. The guard polls
  // the parent pulse and exits (the orphaned-server trap).
  const { installStdioGuard } = await import("./transport/index.js");
  installStdioGuard({ onLost: () => process.exit(0) });
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

/**
 * Gracefully stop the running server, if any.
 */
export async function stopServer() {
  if (!serverInstance) {
    return;
  }

  try {
    await serverInstance.close();
  } catch {
    // ignore close errors
  }

  serverInstance = null;
}
