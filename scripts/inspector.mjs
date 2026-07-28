/**
 * @module scripts/inspector
 *
 * Starts MCP Inspector on a pair of available local ports so multiple
 * repositories can run their own Inspector instances concurrently.
 */

import { spawn } from "node:child_process";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const inspectorCli = resolve(root, "node_modules/@modelcontextprotocol/inspector/cli/build/cli.js");
const serverEntry = resolve(root, "bin/rule-mcp.js");
const defaultClientPort = 6274;
const defaultServerPort = 6277;
const maxPort = 65535;

function isPortAvailable(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();

    server.once("error", () => {
      resolvePort(false);
    });
    server.once("listening", () => {
      server.close(() => {
        resolvePort(true);
      });
    });
    server.listen(port, "localhost");
  });
}

async function findAvailablePort(startPort, excludedPorts = new Set()) {
  for (let port = startPort; port <= maxPort; port += 1) {
    if (excludedPorts.has(port)) {
      continue;
    }

    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available port found between ${startPort} and ${maxPort}`);
}

function readPort(value, fallback) {
  const port = Number.parseInt(value ?? fallback, 10);

  if (!Number.isInteger(port) || port < 1 || port > maxPort) {
    throw new Error(`Invalid port: ${value}`);
  }

  return port;
}

/**
 * Find a free, distinct UI/proxy port pair for MCP Inspector.
 *
 * @param {{clientPort?: number, serverPort?: number}} [ports]
 * @returns {Promise<{clientPort: number, serverPort: number}>}
 */
export async function findInspectorPorts(ports = {}) {
  const clientStart = readPort(ports.clientPort, process.env.CLIENT_PORT ?? defaultClientPort);
  const serverStart = readPort(ports.serverPort, process.env.SERVER_PORT ?? defaultServerPort);
  const clientPort = await findAvailablePort(clientStart);
  const serverPort = await findAvailablePort(serverStart, new Set([clientPort]));

  return { clientPort, serverPort };
}

async function main() {
  const { clientPort, serverPort } = await findInspectorPorts();

  if (process.argv.includes("--print-ports")) {
    process.stdout.write(`${JSON.stringify({ clientPort, serverPort })}\n`);

    return;
  }

  const child = spawn(process.execPath, [inspectorCli, process.execPath, serverEntry, "serve"], {
    env: {
      ...process.env,
      CLIENT_PORT: String(clientPort),
      SERVER_PORT: String(serverPort),
    },
    stdio: "inherit",
  });

  child.once("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.once("exit", (code) => {
    process.exitCode = code ?? 1;
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
