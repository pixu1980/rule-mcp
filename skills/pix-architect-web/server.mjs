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
import { generateContext, generateContextContent } from "../rule-architect/generator.mjs";
import { detectProjectValues } from "../rule-architect/detect.mjs";
import { containWithin } from "../rule-architect/static-file.mjs";
import { collectBody } from "../rule-architect/http-body.mjs";
import { denyForeignRequest } from "../rule-architect/http-guard.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = __dirname; // web files (index.html, interview.js, interview.css)
// Loopback only: this wizard is opened in the local user's browser, so there
// is no reason to expose it to the LAN. Binding 0.0.0.0 (the listen(PORT)
// default) did exactly that.
export const BIND_HOST = "127.0.0.1";
const ARCHITECT_DIR = join(__dirname, "..", "rule-architect"); // engine files
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

/** Load templates.json from rule-architect and wizard-spec.json */
function loadData() {
  const templatesPath = join(ARCHITECT_DIR, "templates.json");
  const wizardSpecPath = join(ARCHITECT_DIR, "wizard-spec.json");
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
    // cross-origin POST - and /api/generate writes files, so the request itself
    // is the attack. Origin / Sec-Fetch-Site / Host are browser-set and cannot
    // be forged by page script.
    if (url.pathname.startsWith("/api/") && denyForeignRequest(req, res, { port: server.address()?.port })) {
      return;
    }

    // API: GET /api/wizard-spec - return wizard spec (primary source)
    if (req.method === "GET" && url.pathname === "/api/wizard-spec") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(wizardSpec));
    }

    // API: GET /api/placeholders - backward compat (flatten optionGroups to top level)
    if (req.method === "GET" && url.pathname === "/api/placeholders") {
      const tiers = [
        { key: "starter", label: "Starter", description: "Domain Sketch + Tech Stack. 30 minutes." },
        { key: "standard", label: "Standard", description: "Starter + Domain Deep-Dive. 90 minutes." },
        { key: "deep", label: "Deep", description: "Standard + Quality, Security, Deploy. 3 hours." },
      ];
      // Flatten optionGroups to top level for backward compat
      const compat = {
        tiers,
        phases: wizardSpec.phases || [],
        sections: wizardSpec.steps,
        ...wizardSpec.optionGroups,
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(compat));
    }

    // API: GET /api/templates - return template list
    if (req.method === "GET" && url.pathname === "/api/templates") {
      const summary = templates.map((t) => ({
        path: t.output || t.path.replace(/^templates\//, ""),
        label: t.label || t.path,
        placeholders: extractPlaceholders(t.content),
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(summary));
    }

    // API: GET /api/init-values - detect project values to pre-fill
    if (req.method === "GET" && url.pathname === "/api/init-values") {
      const initValues = detectProjectValues(targetDir);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(initValues));
    }

    // API: POST /api/generate - generate .context from submitted values
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
                  ? ` (${skipped.length} existing root file(s) left untouched - pass force:true to overwrite)`
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

    // API: POST /api/download - return file contents as JSON (no disk write)
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

    // Serve static files - contained within ASSETS. The candidate path is
    // rejected (404) if it would resolve outside the served directory, so a
    // traversal can never read an arbitrary file off disk.
    let filePath = join(ASSETS, url.pathname === "/" ? "index.html" : url.pathname);
    if (!containWithin(filePath, [ASSETS])) {
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
        filePath = join(ASSETS, "index.html");
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

/** Main entry - only when run directly, so importing the module (tests) never
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
