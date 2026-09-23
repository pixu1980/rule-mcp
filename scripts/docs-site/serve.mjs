

/**
 * @module scripts/docs-site/serve - preview the built site locally.
 *
 * Serves the build.mjs output over HTTP (`pnpm docs:dev [port]`, first
 * free port from 3000 up). Always rebuilds site-dist/ first so the preview
 * mirrors the current Markdown handbook.
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSite } from "./build.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = join(root, "site-dist");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };

function freePort(from) {
  return new Promise((resolve) => {
    const probe = createConnection({ host: "127.0.0.1", port: from });

    probe.on("connect", () => {
      probe.end();
      resolve(freePort(from + 1));
    });
    probe.on("error", () => resolve(from));
  });
}

function serve(request, response) {
  const path = new URL(request.url, "http://localhost").pathname;
  const file = join(outDir, path.endsWith("/") ? `${path}index.html` : path);

  if (!file.startsWith(outDir)) {
    response.writeHead(403);
    response.end("forbidden");
    return;
  }

  let body;

  try {
    body = readFileSync(file);
  } catch {
    response.writeHead(404);
    response.end("not found");
    return;
  }

  response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  response.end(body);
}

const wanted = Number(process.argv[2] ?? 3000) || 3000;

// Always rebuild so `pnpm docs:dev` reflects the current Markdown (titles,
// chapters, ADR index) instead of serving a stale site-dist/.
buildSite({ outDir });

const port = await freePort(wanted);
createServer(serve).listen(port, () => process.stdout.write(`docs-site: preview at http://localhost:${port}/\n`));
