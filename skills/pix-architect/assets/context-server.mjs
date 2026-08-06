#!/usr/bin/env node

/**
 * rule-architect Context Interview Server
 *
 * Zero-dependency Node.js HTTP server that:
 * 1. Serves a dynamic web interview wizard
 * 2. Collects project domain information from the user
 * 3. Generates the .context/ directory with SDD specs
 *
 * rule-frontend-vanilla-reactive compliant frontend.
 * No frameworks, no npm dependencies.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { generateContext, generateContextContent } from "../generator.mjs";
import { detectProjectValues } from "../detect.mjs";
import { containWithin } from "../static-file.mjs";
import { collectBody } from "../http-body.mjs";
import { denyForeignRequest } from "../http-guard.mjs";

// Loopback only: the MCP tool spawns this server and opens it in the local
// user's browser. listen(PORT) with no host bound all interfaces (LAN).
export const BIND_HOST = "127.0.0.1";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "context-server");
// Shared UI (index.html, interview.js, interview.css) lives once in the
// canonical rule-architect-web/ dir and is served BY PATH from here —
// not via symlink, which `pnpm pack` drops from published tarballs.
// __dirname is skills/rule-architect/assets; rule-architect-web/ is a
// sibling of rule-architect/, i.e. two levels up then back down.
const WEB_UI = join(__dirname, "..", "..", "rule-architect-web");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const [, , ...args] = process.argv;
const targetDir = args[0] || process.cwd();
const PORT = args.includes("--port") ? parseInt(args[args.indexOf("--port") + 1]) : 0;

/** Load templates.json and the canonical wizard-spec.json */
function loadData() {
  // templates.json and wizard-spec.json are both loaded from the canonical
  // rule-architect/ location (the same files generator.mjs and
  // rule-architect-web/server.mjs use) so context-server serves the
  // single source of truth instead of its own stale copies.
  const templatesPath = join(__dirname, "..", "templates.json");
  const wizardSpecPath = join(__dirname, "..", "wizard-spec.json");
  if (!existsSync(templatesPath)) throw new Error("templates.json not found at " + templatesPath);
  if (!existsSync(wizardSpecPath)) throw new Error("wizard-spec.json not found at " + wizardSpecPath);
  return {
    templates: JSON.parse(readFileSync(templatesPath, "utf-8")),
    wizardSpec: JSON.parse(readFileSync(wizardSpecPath, "utf-8")),
  };
}

/** Create the HTTP server */
export function createServer(targetDir) {
  const { templates, wizardSpec } = loadData();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // No CORS headers by design: the UI is served from this same origin, so
    // its fetches need none. A wildcard Access-Control-Allow-Origin would let
    // ANY website the user visits read these endpoints while the server runs.
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    // Same-origin enforcement. Loopback binding and absent CORS headers stop a
    // hostile page from READING these endpoints, not from sending a simple
    // cross-origin POST — and /api/generate writes files, so the request itself
    // is the attack. Origin / Sec-Fetch-Site / Host are browser-set and cannot
    // be forged by page script.
    if (url.pathname.startsWith("/api/") && denyForeignRequest(req, res, { port: server.address()?.port })) {
      return;
    }

    // API: GET /api/placeholders — backward compat (flatten optionGroups to top level)
    if (req.method === "GET" && url.pathname === "/api/placeholders") {
      const tiers = [
        { key: "starter", label: "Starter", description: "Domain Sketch + Tech Stack. 30 minutes." },
        { key: "standard", label: "Standard", description: "Starter + Domain Deep-Dive. 90 minutes." },
        { key: "deep", label: "Deep", description: "Standard + Quality, Security, Deploy. 3 hours." },
      ];
      const compat = { tiers, phases: wizardSpec.phases || [], sections: wizardSpec.steps, ...wizardSpec.optionGroups };
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(compat));
    }

    // API: GET /api/templates — return template list
    if (req.method === "GET" && url.pathname === "/api/templates") {
      const summary = templates.map((t) => ({
        path: t.output || t.path.replace(/^templates\//, ""),
        label: t.label || t.path,
        placeholders: extractPlaceholders(t.content),
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(summary));
    }

    // API: GET /api/init-values — detect project values to pre-fill
    if (req.method === "GET" && url.pathname === "/api/init-values") {
      const initValues = detectProjectValues(targetDir);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(initValues));
    }

    // API: POST /api/generate — generate .context from submitted values
    if (req.method === "POST" && url.pathname === "/api/generate") {
      collectBody(req)
        .then((body) => {
          const { values, tier, force } = JSON.parse(body);
          const { files: generated, skipped } = generateContext(values || {}, wizardSpec, targetDir, {
            force: !!force,
          });
          const ctxCount = generated.filter((f) => !f.root).length;
          const rootWritten = generated.filter((f) => f.root && !f.skipped).length;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: true,
              target: join(targetDir, ".context"),
              files: generated,
              skipped,
              summary:
                `Generated ${ctxCount} files in .context/ and ${rootWritten} agent entry files at the project root` +
                (skipped.length
                  ? ` (${skipped.length} existing root file(s) left untouched — pass force:true to overwrite)`
                  : ""),
            }),
          );
        })
        .catch((err) => {
          res.writeHead(err.statusCode || 400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        });
      return;
    }

    // API: POST /api/download — return file contents as JSON (no disk write)
    if (req.method === "POST" && url.pathname === "/api/download") {
      collectBody(req)
        .then((body) => {
          const { values, tier } = JSON.parse(body);
          const files = generateContextContent(values || {}, wizardSpec);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, files }));
        })
        .catch((err) => {
          res.writeHead(err.statusCode || 400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        });
      return;
    }

    // Serve static files. The shared UI files (index.html, interview.js,
    // interview.css) are resolved from WEB_UI (the canonical
    // rule-architect-web/ dir); everything else — notably /core/*, which
    // the served interview.js imports via "./core/index.js" — resolves from
    // ASSETS, context-server's own real core/ implementation.
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const basename = pathname.slice(pathname.lastIndexOf("/") + 1);
    const SHARED_UI_FILES = new Set(["index.html", "interview.js", "interview.css"]);
    let filePath = SHARED_UI_FILES.has(basename) ? join(WEB_UI, basename) : join(ASSETS, pathname);
    // Contain within the two served roots (WEB_UI for shared UI, ASSETS for
    // everything else). A path that resolves outside both is a traversal → 404.
    if (!containWithin(filePath, [WEB_UI, ASSETS])) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = extname(filePath) || ".html";

    // If no extension, try .html
    if (!ext || ext === "") {
      filePath += ".html";
    }

    try {
      if (!existsSync(filePath)) {
        // Fallback to index.html for SPA
        filePath = join(WEB_UI, "index.html");
      }
      const content = readFileSync(filePath);
      const mime = MIME[extname(filePath)] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  return server;
}

function extname(p) {
  const i = p.lastIndexOf(".");
  return i >= 0 ? p.slice(i).toLowerCase() : "";
}

/** Main entry — only when run directly, so importing the module (tests) never
 * starts a listener and leaks an open handle. */
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const server = createServer(targetDir);

  server.listen(PORT, BIND_HOST, () => {
    const addr = server.address();
    const url = `http://localhost:${addr.port}`;
    console.log(`
╔══════════════════════════════════════════════════════╗
║          rule-architect Context Interview             ║
╠══════════════════════════════════════════════════════╣
║  Open your browser to:                              ║
║                                                      ║
║     ${url}  ║
║                                                      ║
║  Target project: ${targetDir.padEnd(33)}║
║  Press Ctrl+C to stop the server.                   ║
╚══════════════════════════════════════════════════════╝
  `);
  });
}

/**
 * Extract [PLACEHOLDER] names from template content.
 */
function extractPlaceholders(content) {
  const matches = content.match(/\[([A-Z_0-9]+)\]/g);
  if (!matches) return [];
  return [...new Set(matches)].map((m) => m.slice(1, -1)).sort();
}
