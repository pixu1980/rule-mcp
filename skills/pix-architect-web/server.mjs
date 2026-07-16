#!/usr/bin/env node

/**
 * pix-architect Context Interview Server
 *
 * Zero-dependency Node.js HTTP server that:
 * 1. Serves a dynamic web interview wizard
 * 2. Collects project domain information from the user
 * 3. Generates the .context/ directory with SDD specs
 *
 * pix-frontend-vanilla-reactive compliant frontend.
 * No frameworks, no npm dependencies.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = __dirname; // web files (index.html, interview.js, interview.css)
const ARCHITECT_DIR = join(__dirname, "..", "pix-architect"); // engine files
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const [,, ...args] = process.argv;
const targetDir = args[0] || process.cwd();
const PORT = args.includes("--port") ? parseInt(args[args.indexOf("--port") + 1]) : 0;

/** Load templates.json from pix-architect and wizard-spec.json */
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

/** Generate .context/ files from user values */
function generateContext(values, templates, target) {
  const ctxDir = join(target, ".context");
  mkdirSync(ctxDir, { recursive: true });

  const generated = [];

  for (const tmpl of templates) {
    let content = tmpl.content;
    let filledCount = 0;
    let unfilledCount = 0;

    // Replace all placeholders with user values
    for (const [key, val] of Object.entries(values)) {
      const placeholder = `[${key}]`;
      if (content.includes(placeholder)) {
        content = content.replaceAll(placeholder, val || "");
        filledCount++;
      }
    }

    // Flag remaining unfilled placeholders
    content = content.replace(/\[([A-Z_0-9]+)\]/g, (match) => {
      unfilledCount++;
      return `**${match}**`; // Bold to highlight unfilled
    });

    const outPath = tmpl.output || tmpl.path.replace(/^templates\//, "");
    const fullPath = join(ctxDir, outPath);
    const dir = dirname(fullPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content, "utf-8");

    generated.push({
      path: outPath,
      content: content,
      filled: filledCount,
      unfilled: unfilledCount,
    });
  }

  return generated;
}

/** Generate .context/ files in-memory (returns content, no disk write) */
function generateContextContent(values, templates) {
  const generated = [];

  for (const tmpl of templates) {
    let content = tmpl.content;
    let filledCount = 0;
    let unfilledCount = 0;

    for (const [key, val] of Object.entries(values)) {
      const placeholder = `[${key}]`;
      if (content.includes(placeholder)) {
        content = content.replaceAll(placeholder, val || "");
        filledCount++;
      }
    }

    content = content.replace(/\[([A-Z_0-9]+)\]/g, (match) => {
      unfilledCount++;
      return `**${match}**`;
    });

    const outPath = tmpl.output || tmpl.path.replace(/^templates\//, "");
    generated.push({ path: outPath, content, filled: filledCount, unfilled: unfilledCount });
  }

  return generated;
}

/** Detect project values from existing files to pre-fill the interview */
function detectProjectValues(projectDir) {
  const values = {};

  // ── package.json ──────────────────────────────────────────────
  const pkgPath = join(projectDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const dirName = projectDir === "."
        ? process.cwd().split("/").pop().split("\\").pop()
        : projectDir.split("/").pop().split("\\").pop();
      values["PROJECT_NAME"] = pkg.name || dirName || "";
      if (pkg.workspaces || pkg.scripts?.demo) values["STACK_PKG_MANAGER"] = "pnpm";
    } catch {}
  }

  // ── .agents/instructions/project.md — tech stack ─────────────
  const instrPath = join(projectDir, ".agents/instructions/project.md");
  if (existsSync(instrPath)) {
    try {
      const text = readFileSync(instrPath, "utf-8");
      if (text.includes("Electron")) {
        values["PROJECT_TYPE"] = "desktop";
        values["STACK_DESKTOP"] = "electron";
        values["STACK_BUILD_TOOL"] = "Electron Builder";
        values["STACK_REACTIVE_MODEL"] = "Chromium renderer with contextBridge IPC";
        values["STACK_STATE_MGMT"] = "main process + preload + renderer";
      } else {
        values["PROJECT_TYPE"] = "webapp";
      }
      const verMatch = text.match(/Electron (\d+)\+?/);
      if (verMatch) values["STACK_VERSION"] = verMatch[1] + ".x";
      if (text.includes("Playwright")) values["STACK_TEST_TOOL"] = "node:test + Playwright";
      if (text.includes("CSS with custom properties") || text.includes("@scope")) {
        values["STACK_CSS_APPROACH"] = "Vanilla CSS with custom properties, @scope";
      }
      if (text.includes("pnpm")) values["STACK_PKG_MANAGER"] = "pnpm";
      const lintMatch = text.match(/(ESLint|Prettier|Biome)/g);
      if (lintMatch) values["LINT_TOOL"] = [...new Set(lintMatch)].join(" + ");
      if (text.includes("JSON metadata") || text.includes("No YAML")) {
        values["DOMAIN_CONSTRAINT_1"] = "JSON metadata only — no YAML, no frontmatter";
      }
      if (text.includes("TDD") || text.includes("test")) {
        values["DOMAIN_CONSTRAINT_2"] = "TDD: all code behind failing tests";
      }
    } catch {}
  }

  // ── .context/README.md — fallback domain hints ───────────────
  const ctxPath = join(projectDir, ".context/README.md");
  if (existsSync(ctxPath)) {
    try {
      const text = readFileSync(ctxPath, "utf-8");
      if (text.includes("TTRPG") && !values["DOMAIN_NAME"]) values["DOMAIN_NAME"] = "TTRPG Campaign Management";
      if (text.includes("Campaign") && !values["DOMAIN_TERM_2"]) values["DOMAIN_TERM_2"] = "campaign";
      if (text.includes("Entity") && !values["DOMAIN_TERM_1"]) values["DOMAIN_TERM_1"] = "entity";
      if ((text.includes("setting") || text.includes("Setting")) && !values["PRIMARY_ENTITY"]) {
        values["PRIMARY_ENTITY"] = "Setting";
        values["SECONDARY_ENTITY"] = "Campaign";
      }
    } catch {}
  }

  // ── docs/adr/ — count existing ADRs ──────────────────────────
  const adrDir = join(projectDir, "docs/adr");
  if (existsSync(adrDir)) {
    try {
      const files = readdirSync(adrDir).filter(f => f.endsWith(".md"));
      values["ADR_COUNT"] = String(files.length);
      values["ADR_LOCATION"] = "docs/adr/";
      // Seed ADR entries from existing files
      for (let i = 0; i < Math.min(files.length, 5); i++) {
        try {
          const adrContent = readFileSync(join(adrDir, files[i]), "utf-8");
          const titleMatch = adrContent.match(/^#\s+(.+)/m);
          if (titleMatch) values[`ADR_${i + 1}`] = titleMatch[1];
        } catch {}
      }
    } catch {}
  }

  // ── docs/DM-Companion-Documentation-Seed/ — domain model ────
  const domainDoc = join(projectDir, "docs/DM-Companion-Documentation-Seed/01-domain/domain-model.md");
  if (existsSync(domainDoc)) {
    try {
      const text = readFileSync(domainDoc, "utf-8");
      // Pull out canonical entities (lines under "Canonical entities:" not "Important engines:")
      const canonIdx = text.indexOf("Canonical entities:");
      const engineIdx = text.indexOf("Important engines:");
      // Get things between "Canonical entities:" and the next blank line or section
      let entities = [];
      if (canonIdx >= 0) {
        let afterCanon = text.slice(canonIdx + "Canonical entities:".length);
        // Skip leading whitespace before looking for section boundary
        while (afterCanon.startsWith("\n") || afterCanon.startsWith("\r")) afterCanon = afterCanon.slice(1);
        const endIdx = afterCanon.indexOf("\n\n");
        const block = endIdx >= 0 ? afterCanon.slice(0, endIdx) : afterCanon;
        entities = (block.match(/^- [A-Z][^\n]+/gm) || []);
      }
      // Fallback: all bullets in the file
      if (entities.length < 2) {
        // Skip the "Important engines:" section
        const skipEngines = engineIdx >= 0
          ? text.slice(text.indexOf("\n\n", engineIdx) >= 0 ? text.indexOf("\n\n", engineIdx) + 2 : 0)
          : text;
        entities = (skipEngines.match(/^- [A-Z][^\n]+/gm) || []).slice(0, 8);
      }
      for (let i = 0; i < Math.min(entities.length, 6); i++) {
        const name = entities[i].replace(/^[-*]\s*/, "").trim();
        values[`ENTITY_${i + 1}`] = name;
        values[`ENTITY_${i + 1}_DESC`] = `A ${name.toLowerCase()} within the campaign setting`;
      }
      if (entities.length >= 2) {
        values["ENTITY_RELATIONSHIPS"] =
          "Setting contains Campaign (1:N), Campaign contains Session (1:N), " +
          "Campaign Entity Instance references Canonical Entity (N:1)";
      }
    } catch {}
  }

  // ── Project elevator pitch ───────────────────────────────────
  if (!values["PROJECT_ELEVATOR_PITCH"]) {
    const desc = values["PROJECT_DESCRIPTION"] || "";
    if (desc.includes("Campaign") || desc.includes("TTRPG")) {
      values["PROJECT_ELEVATOR_PITCH"] =
        "A desktop-first campaign operating system for TTRPG game masters";
    }
  }

  // ── CONTEXT.md — project context (root) ─────────────────────
  const ctxMd = join(projectDir, "CONTEXT.md");
  if (existsSync(ctxMd)) {
    try {
      const text = readFileSync(ctxMd, "utf-8");
      // Project identity
      const h1Match = text.match(/^#\s+(.+)/m);
      if (h1Match && !values["PROJECT_NAME"]) values["PROJECT_NAME"] = h1Match[1].trim();
      const lines = text.split("\n");
      const descLine = lines.find(l => {
        const t = l.trim();
        return t.length > 15 && !t.startsWith("#") && !t.startsWith("*") && !t.startsWith("-") && !t.startsWith("`") && !t.includes("[") && t[0] === t[0].toUpperCase();
      });
      if (descLine) values["PROJECT_DESCRIPTION"] = descLine.trim();
      if (descLine && !values["PROJECT_ELEVATOR_PITCH"]) values["PROJECT_ELEVATOR_PITCH"] = descLine.trim();
      // Domain
      if (text.includes("campaign") || text.includes("Campaign")) {
        if (!values["DOMAIN_TERM_2"]) values["DOMAIN_TERM_2"] = "campaign";
        if (!values["DOMAIN_NAME"]) values["DOMAIN_NAME"] = "TTRPG Campaign Management";
      }
      if ((text.includes("Entity") || text.includes("entity")) && !values["DOMAIN_TERM_1"]) values["DOMAIN_TERM_1"] = "entity";
      if ((text.includes("Setting") || text.includes("setting")) && !values["PRIMARY_ENTITY"]) {
        values["PRIMARY_ENTITY"] = "Setting";
        values["SECONDARY_ENTITY"] = "Campaign";
        values["DOMAIN_ENTITY_MANAGER"] = "vault";
      }
      if (text.includes("NPC") && !values["DOMAIN_TERM_1"]) values["DOMAIN_TERM_1"] = "NPC";
      // Domain notes
      if (text.includes("timeline") || text.includes("Timeline")) values["DOMAIN_LOGIC_AREA"] = "timeline engine + relationship engine";
      if (text.includes("Cross-vault") || text.includes("Entity Bundle")) values["DOMAIN_NOTE_1"] = "cross-vault sharing via Entity Bundle ZIP export/import";
      if (text.includes("Offline") || text.includes("desktop-first")) {
        if (!values["OFFLINE_BEHAVIOR"]) values["OFFLINE_BEHAVIOR"] = "Desktop-first: IndexedDB cache, filetree as SOT";
      }
      if (text.includes("Obsidian")) {
        values["DATA_EXPORT"] = "Export all data as JSON. Obsidian-compatible vault.";
        if (!values["DOMAIN_CONSTRAINT_1"]) values["DOMAIN_CONSTRAINT_1"] = "Obsidian-compatible vault, one vault per setting";
      }
      // Vault principle
      if (text.includes("File tree is the source of truth")) {
        values["DOMAIN_DATA_PRINCIPLE_1"] = "Filetree as source of truth, IndexedDB as cache only";
      }
      // Rules engine
      if (text.includes("Rules Engine")) {
        values["DOMAIN_NOTE_2"] = "Rules are data (JSON), not code — system-agnostic ruleset packages";
      }
    } catch {}
  }

  // ── User persona detection ───────────────────────────────────
  if (values["DOMAIN_NAME"] === "TTRPG Campaign Management") {
    values["USER_PERSONA"] = "Game Master";
    values["PERSONA_1"] = "Game Master";
    values["PERSONA_1_DESC"] = "Runs TTRPG campaigns, manages NPCs, plotlines, and game sessions";
    values["PERSONA_1_GOAL"] = "Track campaign state across sessions without losing continuity";
    values["PERSONA_1_PAIN"] = "Scattered notes across documents, difficulty tracking NPC relationships";
    values["PERSONA_2"] = "Worldbuilder";
    values["PERSONA_2_DESC"] = "Creates rich campaign settings with lore, factions, and history";
    values["PERSONA_2_GOAL"] = "Maintain a consistent, interconnected canon across campaigns";
    values["PERSONA_2_PAIN"] = "Canonical entities diverge between campaigns, causing continuity errors";
  }

  // ── Features from packages ───────────────────────────────────
  const pkgDir = join(projectDir, "packages");
  if (existsSync(pkgDir)) {
    try {
      const dirs = readdirSync(pkgDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      const featureNames = {
        "core": "Core domain entities (Entity, Setting, Campaign, Session, NPC)",
        "vault": "Obsidian-compatible vault I/O with file watching",
        "time-machine": "Content-addressed snapshot versioning",
        "migration-engine": "Schema migration engine",
        "command-engine": "Command registry with palette UI",
        "asset-engine": "Asset path management and file import",
        "generator-engine": "Content generator engine with AI SDK",
        "ai-sdk": "AI provider integration for content generation",
        "plugin-system": "Plugin manifest loader and validator",
        "package-system": "Entity bundle builder for cross-vault sharing",
        "appearance": "Theme registry with CSS generation",
        "diagnostics": "Health check runner",
      };
      const found = dirs.filter(d => featureNames[d]).map(d => featureNames[d]);
      for (let i = 0; i < Math.min(found.length, 4); i++) {
        values[`FEATURE_${i + 1}`] = found[i];
      }
      // Key value props from package count
      values["KEY_VALUE_PROP_1"] = "Full campaign life cycle: setting → campaign → session";
      values["KEY_VALUE_PROP_2"] = "Obsidian-compatible, local-first, no vendor lock-in";
      values["KEY_VALUE_PROP_3"] = "Plugin system for custom rulesets and extensions";
      // User needs
      values["USER_NEED_1"] = "I need to organize NPCs, factions, and locations for my campaign";
      values["USER_NEED_2"] = "I need to track campaign state changes between sessions";
      values["USER_NEED_3"] = "I need to maintain a consistent canon across multiple campaigns";
    } catch {}
  }

  // ── User stories ─────────────────────────────────────────────
  if (values["PRIMARY_ENTITY"] === "Setting") {
    values["USER_STORY_1"] = "As a GM, I want to create a Setting with its own canonical entities so I can build a consistent world";
    values["USER_STORY_2"] = "As a GM, I want to launch a Campaign from a Setting so I can run adventures in that world";
    values["USER_STORY_3"] = "As a GM, I want to record Session events so I can track what happened and prepare the next session";
    values["USER_STORY_4"] = "As a GM, I want to define NPC relationships so I can roleplay consistent interactions";
  }

  // ── Architecture notes from documentation seed ───────────────
  const archDoc = join(projectDir, "docs/DM-Companion-Documentation-Seed/03-application/technical-architecture.md");
  if (existsSync(archDoc)) {
    try {
      const text = readFileSync(archDoc, "utf-8").toLowerCase();
      if (text.includes("indexeddb")) {
        values["STORAGE_MECHANISM"] = "IndexedDB cache + filetree as source of truth";
      }
      if (text.includes("custom element")) {
        values["PRIMARY_FUNCTION_1"] = "UI shell with Custom Elements (dock panels, command palette, entity editor)";
        values["PRIMARY_FUNCTION_1_DESC"] = "Custom Elements v1 with @scope CSS isolation";
      }
      if (text.includes("offline") && !values["OFFLINE_BEHAVIOR"]) {
        values["OFFLINE_BEHAVIOR"] = "Offline-first: all data local, no cloud dependency";
      }
    } catch {}
  }

  // ── Scope from roadmap ───────────────────────────────────────
  const roadmap = join(projectDir, "docs/DM-Companion-Documentation-Seed/06-development/roadmap.md");
  if (existsSync(roadmap)) {
    try {
      const text = readFileSync(roadmap, "utf-8");
      const items = text.match(/- \[.?\] .+/g) || [];
      const done = items.filter(i => i.includes("[x]") || i.includes("✅"));
      const todo = items.filter(i => !i.includes("[x]") && !i.includes("✅"));
      for (let i = 0; i < Math.min(done.length, 3); i++) {
        if (!values[`SCOPE_ITEM_${i + 1}`]) {
          values[`SCOPE_ITEM_${i + 1}`] = done[i].replace(/^- \[.?\] /, "").trim();
        }
      }
      for (let i = 0; i < Math.min(todo.length, 3); i++) {
        values[`OUT_OF_SCOPE_ITEM_${i + 1}`] = todo[i].replace(/^- \[.?\] /, "").trim();
      }
    } catch {}
  }

  // ── Quality & testing ────────────────────────────────────────
  values["TESTING_PYRAMID"] = "Unit (60%): domain logic, entity state transitions, pure functions | Integration (25%): vault I/O, engine interactions | E2E (15%): CLI demo, UI workflows via Playwright";
  values["A11Y_STANDARD"] = "WCAG 2.2 AA";
  values["BROWSER_SUPPORT"] = "Chromium (Electron 33+)";
  values["MVP_STEP_1"] = "CLI demo: create setting, add NPC, save to vault";
  values["MVP_STEP_2"] = "Browser preview: workspace layout with dock panels";
  values["MVP_STEP_3"] = "Timeline engine: advance campaign time, record events";
  values["MVP_STEP_4"] = "Knowledge index: search entities across vault";
  values["MVP_STEP_5"] = "Plugin system: load a custom generator plugin";

  // ── Security ─────────────────────────────────────────────────
  values["AUTH_MECHANISM"] = "None (local-only desktop app)";
  values["CSP_POLICY"] = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'";
  values["DATA_VALIDATION"] = "All entity input validated at domain boundary. JSON schema validation for metadata.";
  values["DEPENDENCY_SCANNING"] = "pnpm audit in CI";
  values["SECURITY_HEADERS"] = "CSP via meta tag, local filesystem access only";

  // ── Deployment ───────────────────────────────────────────────
  values["DEPLOY_TARGET"] = "Desktop (Electron) + GitHub Releases";
  values["CI_TOOL"] = "GitHub Actions — test, build, package";
  values["ENVIRONMENTS"] = "dev (local), production (Electron build)";
  values["BUILD_COMMAND"] = "pnpm build";
  values["PREVIEW_COMMAND"] = "pnpm preview (localhost:3000)";

  // ── pix skill/tool routing ───────────────────────────────
  values["PIX_PRIMARY_SKILL"] = values["PROJECT_TYPE"] === "backend"
    ? "pix-backend"
    : values["PROJECT_TYPE"] === "desktop"
      ? "pix-platform-desktop"
      : "pix-architect";
  values["PIX_SECONDARY_SKILLS"] = [
    "pix",
    "pix-styleguide",
    "pix-devops-testing",
    "pix-process-feature-workflow",
    "pix-toolchain-project",
  ].join(", ");
  values["PIX_RECOMMENDED_TOOLS"] = [
    "pix_detect",
    "pix",
    "pix_search",
    "pix_check",
    "pix_process_adr",
    "pix_process_handoff",
  ].join(", ");
  values["ARCHITECTURE_DECISIONS"] = "Record structural choices in docs/adr with pix_process_adr before implementation hardens around them.";
  values["QUALITY_GATES"] = "pnpm run ci, pix_check, a11y checks for UI, documentation update, ADR update for architectural changes.";
  values["DELIVERY_WORKFLOW"] = "Spec → plan → failing test → implementation → pix_check → docs/adr → handoff.";

  // ── Non-goals ────────────────────────────────────────────────
  values["NON_GOAL_1"] = "Multi-user / collaborative editing (single-user desktop)";
  values["NON_GOAL_2"] = "Cloud sync (local-first, Obsidian-compatible)";
  values["NON_GOAL_3"] = "Web/mobile version (Electron desktop only)";

  return values;
}

/** Create the HTTP server */
function createServer(targetDir) {
  const { templates, wizardSpec } = loadData();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // CORS for local dev
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    // API: GET /api/wizard-spec — return wizard spec (primary source)
    if (req.method === "GET" && url.pathname === "/api/wizard-spec") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(wizardSpec));
    }

    // API: GET /api/placeholders — backward compat (flatten optionGroups to top level)
    if (req.method === "GET" && url.pathname === "/api/placeholders") {
      const tiers = [
        { key: "starter", label: "Starter", description: "Domain Sketch + Tech Stack. 30 minutes." },
        { key: "standard", label: "Standard", description: "Starter + Domain Deep-Dive. 90 minutes." },
        { key: "deep", label: "Deep", description: "Standard + Quality, Security, Deploy. 3 hours." }
      ];
      // Flatten optionGroups to top level for backward compat
      const compat = {
        tiers,
        sections: wizardSpec.steps,
        ...wizardSpec.optionGroups,
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(compat));
    }

    // API: GET /api/templates — return template list
    if (req.method === "GET" && url.pathname === "/api/templates") {
      const summary = templates.map(t => ({
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
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        try {
          const { values, tier } = JSON.parse(body);
          const generated = generateContext(values || {}, templates, targetDir);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            ok: true,
            target: join(targetDir, ".context"),
            files: generated,
            summary: `Generated ${generated.length} files in .context/`,
          }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
      return;
    }

    // API: POST /api/download — return file contents as JSON (no disk write)
    if (req.method === "POST" && url.pathname === "/api/download") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        try {
          const { values, tier } = JSON.parse(body);
          const files = generateContextContent(values || {}, templates);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, files }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
      return;
    }

    // Serve static files
    let filePath = join(ASSETS, url.pathname === "/" ? "index.html" : url.pathname);
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

/** Main entry */
const server = createServer(targetDir);

server.listen(PORT, () => {
  const addr = server.address();
  const url = `http://localhost:${addr.port}`;
  console.log(`
╔══════════════════════════════════════════════════════╗
║          pix-architect Context Interview             ║
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

/**
 * Extract [PLACEHOLDER] names from template content.
 */
function extractPlaceholders(content) {
  const matches = content.match(/\[([A-Z_0-9]+)\]/g);
  if (!matches) return [];
  return [...new Set(matches)].map(m => m.slice(1, -1)).sort();
}
