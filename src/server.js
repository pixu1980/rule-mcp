/**
 * @module server
 *
 * MCP Server bootstrap using @modelcontextprotocol/sdk.
 * Replaces the old hand-rolled src/mcp/protocol.js + src/mcp/stdio.js.
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
import { pkg } from "./cli/paths.js";
import { listTools, callTool } from "./tools/router.js";
import { listResources, readResource } from "./resources/index.js";
import { listPrompts, getPrompt } from "./prompts/index.js";

/** @type {Server|null} */
let serverInstance = null;

/**
 * Configure an MCP Server instance with tool/resource/prompt handlers.
 * Does NOT connect a transport — that is done by startServer() (stdio)
 * or the SSE transport module.
 *
 * @returns {Server}
 */
export function createServer() {
  const server = new Server(
    {
      name: "pix-galaxy-mcp",
      version: pkg.version,
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
    const { name, arguments: args } = request.params;

    if (!name) {
      throw new McpError(ErrorCode.InvalidParams, "Tool name is required");
    }

    return callTool(name, args ?? {});
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
      if (promptName === "pix-code-review" || promptName === "pix-a11y-review" ||
          promptName === "pix-generate-component" || promptName === "pix-architect-scaffold") {
        if (argument.name === "framework") {
          const frameworks = ["react", "vue", "svelte", "angular", "solid", "astro", "vanilla"];
          const values = frameworks.filter(f => f.startsWith(argument.value));
          return { completion: { values: values.slice(0, 10), total: values.length, hasMore: false } };
        }
      }
      if (promptName === "pix-generate-component" && argument.name === "component") {
        const components = ["button", "card", "modal", "formField", "list", "nav"];
        const values = components.filter(c => c.startsWith(argument.value));
        return { completion: { values: values.slice(0, 10), total: values.length, hasMore: values.length > 10 } };
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
    const prompt = getPrompt(name);
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
 * This function never returns — it keeps the process alive.
 *
 * @returns {Promise<void>}
 */
export async function startServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * Gracefully stop the running server, if any.
 */
export async function stopServer() {
  if (serverInstance) {
    try {
      await serverInstance.close();
    } catch {
      // ignore close errors
    }
    serverInstance = null;
  }
}
