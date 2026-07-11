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

  server.setRequestHandler(CompleteRequestSchema, async (request) => {
    const { ref, argument } = request.params;

    // Completions for tool arguments
    if (ref?.type === "ref" && ref.name) {
      const toolName = ref.name;

      // pix_component: component argument
      if (toolName === "pix_component" && argument.name === "component") {
        const components = ["button", "card", "modal", "formField", "list", "nav",
          "playwright-config", "a11y-test-basic", "a11y-test-forms", "a11y-test-components"];
        const values = components.filter(c => c.startsWith(argument.value));
        return { completion: { values: values.slice(0, 10), total: values.length, hasMore: values.length > 10 } };
      }

      // pix_component: framework argument
      if (toolName === "pix_component" && argument.name === "framework") {
        const frameworks = ["vanilla", "react", "vue", "svelte", "angular", "solid", "astro"];
        const values = frameworks.filter(f => f.startsWith(argument.value));
        return { completion: { values: values.slice(0, 10), total: values.length, hasMore: false } };
      }

      // pix_check: skill argument
      if (toolName === "pix_check" && argument.name === "skill") {
        const skillNames = listTools()
          .map(t => t.name)
          .filter(n => n.startsWith("pix_"))
          .filter(n => n.startsWith(argument.value));
        return { completion: { values: skillNames.slice(0, 10), total: skillNames.length, hasMore: skillNames.length > 10 } };
      }

      // pix: framework argument
      if (toolName === "pix" && argument.name === "framework") {
        const frameworks = ["react", "vue", "svelte", "angular", "solid", "astro", "electron", "vanilla"];
        const values = frameworks.filter(f => f.startsWith(argument.value));
        return { completion: { values: values.slice(0, 10), total: values.length, hasMore: false } };
      }
    }

    // Default: empty completion
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
    return { prompt };
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
