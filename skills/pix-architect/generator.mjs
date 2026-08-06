// rule-architect generator — .context/ file generation engine
// Pure logic, no DOM, no server. Used by both rule-architect-cli and rule-architect-web.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAnswers, optionLabelFor } from "./normalize.mjs";
import { JUNK } from "./field-map.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_PATH = join(__dirname, "templates.json");

export { normalizeAnswers };

const PLACEHOLDER_RE = /\[([A-Z_0-9]+)\]/g;
const FENCE_RE = /^\s*```/;
const HEADING_RE = /^\s*(#{1,6})\s/;
const TABLE_ROW_RE = /^\s*\|/;

// The marker deliberately contains NO bracketed token: the Phase-5 gate
// asserts that no `[KEY]`-shaped token survives in emitted output, and a
// marker that named the key in brackets would trip the gate on itself.
function todoMarkdown(keys) {
  return `_TODO: ${keys.join(", ")}_`;
}

// JSON placeholders all sit inside string values, so the marker must be
// plain text — no markdown emphasis, no characters needing JSON escaping.
function todoJson(key) {
  return `TODO: ${key}`;
}

// An answer only counts as filled when it carries actual content. Treating
// "" as filled (the pre-Phase-5 `val || ""` substitution) silently turned
// "we don't know" into "the value is empty", which is a different claim.
function isFilled(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function unfilledKeysIn(text) {
  return [...text.matchAll(PLACEHOLDER_RE)].map((m) => m[1]).filter((key) => !JUNK.has(key));
}

function substituteInline(line, marker) {
  return line.replace(PLACEHOLDER_RE, (match, key) => (JUNK.has(key) ? match : marker(key)));
}

// True when the only thing left after removing the unfilled placeholders is
// list/quote/emphasis decoration or a bare label ("- **Context**:"). Such a
// line carries no information of its own, so it is dropped rather than
// TODO-marked — otherwise every scaffold line becomes its own TODO.
function isDecorationOnly(line) {
  const withoutTokens = line.replace(PLACEHOLDER_RE, (match, key) => (JUNK.has(key) ? match : ""));
  const withoutLabels = withoutTokens
    .replace(/\*\*[^*]*\*\*/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/^\s*\d+\./, "");
  return withoutLabels.replace(/[-*+>:|_\s]/g, "") === "";
}

// Markdown policy. Ordered, and deliberately biased towards deleting less:
//   1. fenced code blocks are literal — never rewritten or dropped
//   2. table rows are never dropped (one row can carry several placeholders
//      alongside real content, e.g. a roadmap milestone)
//   3. a line that is only decoration + unfilled placeholders is dropped
//   4. anything else keeps its prose and gets an inline TODO marker
//   5. a heading whose section ends up empty keeps the heading and gains ONE
//      TODO line; a heading whose own text is unfillable AND whose body is
//      empty is dropped together with its section
//   6. blank-line runs are collapsed
function applyMarkdownPolicy(content) {
  const lines = content.split("\n");
  const dropped = new Array(lines.length).fill(false);
  const keysAt = new Array(lines.length).fill(null);
  const headings = [];

  let inFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (FENCE_RE.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // An unfilled placeholder that is the entire content of an inline-code span
    // — `[KEY]` — would render the italic TODO marker's underscores literally
    // inside the code span. Drop the backticks so the marker reads as prose.
    // (Filled placeholders were already substituted before this policy runs,
    // so any `[KEY]` remaining here is genuinely unfilled.)
    lines[i] = lines[i].replace(/`\[([A-Z_0-9]+)\]`/g, (match, key) => (JUNK.has(key) ? match : todoMarkdown([key])));

    const line = lines[i];
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) headings.push({ index: i, level: headingMatch[1].length });

    const keys = unfilledKeysIn(line);
    if (keys.length === 0) continue;
    keysAt[i] = keys;

    if (headingMatch) continue; // resolved in the section pass below
    if (TABLE_ROW_RE.test(line)) {
      lines[i] = substituteInline(line, (key) => todoMarkdown([key]));
      continue;
    }
    if (isDecorationOnly(line)) {
      dropped[i] = true;
      continue;
    }
    lines[i] = substituteInline(line, (key) => todoMarkdown([key]));
  }

  // Deepest-last document order means iterating in reverse resolves child
  // sections before their parents, so a parent correctly sees that all of
  // its children were dropped.
  const sectionEnd = (position, level) => {
    for (let j = position + 1; j < lines.length; j += 1) {
      const m = lines[j].match(HEADING_RE);
      if (m && m[1].length <= level) return j;
    }
    return lines.length;
  };

  for (let h = headings.length - 1; h >= 0; h -= 1) {
    const { index, level } = headings[h];
    if (dropped[index]) continue;
    const end = sectionEnd(index, level);

    const bodyKeys = [];
    let hasSurvivingBody = false;
    for (let j = index + 1; j < end; j += 1) {
      if (dropped[j]) {
        if (keysAt[j]) bodyKeys.push(...keysAt[j]);
        continue;
      }
      if (lines[j].trim() !== "") hasSurvivingBody = true;
    }

    const headingKeys = keysAt[index];
    if (headingKeys && !hasSurvivingBody) {
      // Unusable heading over an empty section: drop the whole thing.
      for (let j = index; j < end; j += 1) dropped[j] = true;
      continue;
    }
    if (headingKeys) {
      lines[index] = substituteInline(lines[index], (key) => todoMarkdown([key]));
      continue;
    }
    if (!hasSurvivingBody && bodyKeys.length > 0) {
      lines[index] = `${lines[index]}\n\n${todoMarkdown([...new Set(bodyKeys)])}`;
    }
  }

  return lines
    .filter((_, i) => !dropped[i])
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/, "\n");
}

// Non-markdown output (today only schemas/ruleset.schema.json) is never
// line-dropped: every placeholder there sits inside a JSON string value, and
// deleting those lines yields invalid JSON ("Expected double-quoted property
// name"). Inline substitution keeps the document parseable.
function applyDataPolicy(content) {
  return substituteInline(content, todoJson);
}

/**
 * Render one template against the answers. Single source of truth for both
 * generator entry points — the fill loop used to be duplicated, so the
 * empty-placeholder policy could drift between the disk and in-memory paths.
 * @returns {{ path: string, content: string, filled: number, unfilled: number }}
 */
export function renderTemplate(tmpl, answers) {
  const path = tmpl.output || tmpl.path.replace(/^templates\//, "");

  // `raw` templates document the placeholder syntax itself (TEMPLATE_GUIDE.md),
  // so their tokens ARE the content and must survive verbatim.
  if (tmpl.raw) return { path, content: tmpl.content, filled: 0, unfilled: 0 };

  let content = tmpl.content;
  let filled = 0;
  for (const [key, value] of Object.entries(answers)) {
    if (!isFilled(value)) continue;
    const placeholder = `[${key}]`;
    if (!content.includes(placeholder)) continue;
    // Function replacement, NOT a string: String.replaceAll(str, str) would
    // interpret `$&`/`$$`/`` $` ``/`$'` in the answer as replacement patterns
    // (so "Cost $5" or "A$&B" would be mangled). A function inserts verbatim.
    content = content.replaceAll(placeholder, () => String(value));
    filled += 1;
  }

  const unfilled = unfilledKeysIn(content).length;
  content = path.endsWith(".md") ? applyMarkdownPolicy(content) : applyDataPolicy(content);

  return { path, content, filled, unfilled };
}

/**
 * Evaluate a template's `emitWhen` gate against the normalized answers.
 * Absent gate means always emit. The predicate is pure data
 * (`{ field, in: [...] }` or `{ field, equals: "..." }`) so changing which
 * projects receive a template is a templates.json edit, never a code change.
 */
export function shouldEmit(tmpl, answers, spec) {
  const gate = tmpl.emitWhen;
  if (!gate) return true;
  if (!gate.field) throw new Error(`template ${tmpl.output || tmpl.path}: emitWhen needs a "field"`);

  let wanted;
  if (Array.isArray(gate.in)) wanted = gate.in;
  else if (gate.equals !== undefined) wanted = [gate.equals];
  else throw new Error(`template ${tmpl.output || tmpl.path}: emitWhen needs "in" or "equals"`);

  // Gates are authored against stable option KEYS ("other"), but
  // normalizeAnswers rewrites a select answer to its prose label ("Other"),
  // and callers may hand us either raw or already-normalized answers. Accept
  // both spellings so the gate does not depend on that ordering — or on
  // wizard UI copy.
  const accepted = new Set(wanted);
  for (const value of wanted) {
    const label = optionLabelFor(spec, gate.field, value);
    if (label) accepted.add(label);
  }
  return accepted.has(answers[gate.field]);
}

// README.md's documentation map used to be hardcoded, which made it drift:
// it linked a nonexistent `specs/10-rule-routing.md`, omitted specs 07-09
// and 11-12 entirely, and — once `emitWhen` can withhold a template — would
// have pointed at files that were never written. Deriving it from the list
// actually being emitted keeps the index true by construction.
const DOC_MAP_GROUPS = [
  { title: "Project context", match: (path) => path === "project-context.md" },
  { title: "Active roadmap", match: (path) => path === "ROADMAP.md" },
  { title: "Analysis", match: (path) => path.startsWith("analysis/") },
  { title: "Specs", match: (path) => path.startsWith("specs/") },
  { title: "Supporting assets", match: () => true },
];

function buildDocMap(emitted) {
  const paths = emitted
    .filter((tmpl) => !tmpl.root)
    .map((tmpl) => tmpl.output || tmpl.path.replace(/^templates\//, ""))
    .filter((path) => path !== "README.md")
    .sort();

  const sections = [];
  const claimed = new Set();
  for (const group of DOC_MAP_GROUPS) {
    const members = paths.filter((path) => !claimed.has(path) && group.match(path));
    for (const path of members) claimed.add(path);
    if (members.length === 0) continue;
    sections.push(`### ${group.title}\n\n${members.map((p) => `- [${p}](./${p})`).join("\n")}`);
  }
  return sections.join("\n\n");
}

// One shared render path for both entry points: decide what emits, derive the
// documentation map from that decision, then render. Keeping this in one place
// is the point of Phase 5 Task 1 — the fill loop used to be duplicated and the
// two copies could drift.
function renderAll(templates, answers, spec) {
  const emitted = templates.filter((tmpl) => shouldEmit(tmpl, answers, spec));
  const enriched = isFilled(answers.DOC_MAP) ? answers : { ...answers, DOC_MAP: buildDocMap(emitted) };
  return emitted.map((tmpl) => renderTemplate(tmpl, enriched));
}

/**
 * Fan out the rendered AGENTS.md body to every other per-tool entry file.
 * Render ONCE (the AGENTS.md template), write N — these are NOT separate
 * templates in templates.json, just the same final string re-framed per
 * tool. Frontmatter-framed tools (Cursor, Windsurf) get the RESOLVED
 * project name (not a literal placeholder) spliced into their frontmatter.
 * @param {string} agentsContent - the fully rendered AGENTS.md body
 * @param {string} projectName   - resolved PROJECT_NAME from normalized answers
 * @returns {Array<{path: string, content: string}>}
 */
// YAML frontmatter is line-oriented, so any newline in an interpolated value
// terminates the block early and spills the remaining keys into the document
// body — a project name of `Evil\n---\nalwaysApply: false` silently disabled
// the Cursor rule. Collapse to a single line and strip the characters that
// would otherwise start a new YAML node.
function frontmatterSafe(value) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/^[\s>|&*!%@`#-]+/, "")
    .replace(/:\s/g, " ")
    .trim()
    .slice(0, 120);
}

function fanOutEntryPoints(agentsContent, projectName) {
  const safeName = frontmatterSafe(projectName);
  const description = safeName ? `${safeName} project rules` : "project rules";
  const cursorFrontmatter = `---\ndescription: ${description}\nalwaysApply: true\n---\n\n`;
  const windsurfFrontmatter = `---\ntrigger: always_on\n---\n\n`;

  return [
    { path: "CLAUDE.md", content: agentsContent },
    { path: "GEMINI.md", content: agentsContent },
    { path: ".clinerules", content: agentsContent },
    { path: ".github/copilot-instructions.md", content: agentsContent },
    { path: ".cursor/rules/project.mdc", content: cursorFrontmatter + agentsContent },
    { path: ".windsurf/rules/project.md", content: windsurfFrontmatter + agentsContent },
  ];
}

/**
 * Write one generated entry to disk. Root entry files (the AGENTS.md family
 * that lands in the project root, next to a user's own CLAUDE.md/AGENTS.md)
 * are GUARDED: an existing one is left untouched and reported "skipped" unless
 * the caller forces it. `.context/` scaffold is unguarded — it is architect-
 * owned and always regenerated, so re-running the wizard keeps refreshing it.
 * @returns {"written"|"skipped"}
 */
function writeEntry(fullPath, content, { guard, force }) {
  if (guard && !force && existsSync(fullPath)) return "skipped";
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");
  return "written";
}

/**
 * Generate .context/ files from wizard answers + wizard-spec. Templates
 * flagged `root: true` (e.g. AGENTS.md) are written to `targetDir` itself
 * instead of `targetDir/.context/` — everything else is unchanged.
 *
 * Root entry files are never overwritten silently: an existing one is skipped
 * (and listed in the returned `skipped[]`) unless `options.force` is set.
 * @param {object} answers  - collected field values
 * @param {object} spec     - wizard-spec.json content
 * @param {string} targetDir - output directory
 * @param {{ force?: boolean }} [options] - force:true overwrites existing root files
 * @returns {{ files: Array<{path, content, filled, unfilled, root?, written?, skipped?}>, target: string, skipped: string[] }}
 */
export function generateContext(answers, spec, targetDir, options = {}) {
  const { force = false } = options;
  answers = normalizeAnswers(answers, spec);

  // Resolve templates.json relative to this module (rule-architect/ directory)
  const templatesPath = TEMPLATES_PATH;
  if (!existsSync(templatesPath)) throw new Error("templates.json not found at " + templatesPath);
  const templates = JSON.parse(readFileSync(templatesPath, "utf-8"));

  const ctxDir = join(targetDir, ".context");
  mkdirSync(ctxDir, { recursive: true });

  const rootOutputs = new Set(
    templates.filter((tmpl) => tmpl.root).map((tmpl) => tmpl.output || tmpl.path.replace(/^templates\//, "")),
  );

  const generated = renderAll(templates, answers, spec);
  // Root files that already existed and were left untouched, root-relative,
  // so a CLI/server can report "CLAUDE.md exists — not overwritten".
  const skipped = [];
  for (const rendered of generated) {
    // `root` tells a caller where the file landed, so a summary can say
    // "N in .context/, M at the project root" instead of guessing.
    const isRoot = rootOutputs.has(rendered.path);
    if (isRoot) rendered.root = true;
    // Root-output templates (e.g. AGENTS.md) are written to targetDir itself
    // but still report a targetDir-relative path — same shape as the
    // .context/-relative entries, just anchored one level up.
    const fullPath = isRoot ? join(targetDir, rendered.path) : join(ctxDir, rendered.path);
    const status = writeEntry(fullPath, rendered.content, { guard: isRoot, force });
    if (isRoot) {
      if (status === "skipped") {
        rendered.skipped = true;
        skipped.push(rendered.path);
      } else {
        rendered.written = true;
      }
    }
  }

  // Fan out the rendered AGENTS.md body to every other per-tool entry file
  // (CLAUDE.md, GEMINI.md, .clinerules, Copilot, Cursor, Windsurf). Render
  // once above, write N here — same content, just re-framed per tool. Each is
  // guarded independently: a skipped AGENTS.md must not stop an absent
  // CLAUDE.md from being written from the freshly-rendered body.
  const agentsEntry = generated.find((f) => f.path === "AGENTS.md");
  if (agentsEntry) {
    const fanOut = fanOutEntryPoints(agentsEntry.content, answers.PROJECT_NAME || "");
    for (const entry of fanOut) {
      const fullPath = join(targetDir, entry.path);
      const status = writeEntry(fullPath, entry.content, { guard: true, force });
      const record = {
        path: entry.path,
        content: entry.content,
        filled: agentsEntry.filled,
        unfilled: agentsEntry.unfilled,
        root: true,
      };
      if (status === "skipped") {
        record.skipped = true;
        skipped.push(entry.path);
      } else {
        record.written = true;
      }
      generated.push(record);
    }
  }

  return { files: generated, target: ctxDir, skipped };
}

/**
 * Generate .context/ file contents in-memory (no disk write). `root: true`
 * templates (e.g. AGENTS.md) report a targetDir-relative `path` (e.g.
 * "AGENTS.md") instead of a .context/-relative one — same `output` value
 * either way, since this entry point never writes to disk.
 * @returns {Array<{path, content, filled, unfilled}>}
 */
export function generateContextContent(answers, spec) {
  answers = normalizeAnswers(answers, spec);

  // Resolve templates.json relative to this module (rule-architect/ directory)
  const templatesPath = TEMPLATES_PATH;
  if (!existsSync(templatesPath)) throw new Error("templates.json not found at " + templatesPath);
  const templates = JSON.parse(readFileSync(templatesPath, "utf-8"));

  const rootOutputs = new Set(
    templates.filter((tmpl) => tmpl.root).map((tmpl) => tmpl.output || tmpl.path.replace(/^templates\//, "")),
  );
  const files = renderAll(templates, answers, spec);
  for (const rendered of files) {
    if (rootOutputs.has(rendered.path)) rendered.root = true;
  }

  // Fan out the rendered AGENTS.md body to every other per-tool entry file
  // (CLAUDE.md, GEMINI.md, .clinerules, Copilot, Cursor, Windsurf) — same
  // in-memory treatment as generateContext, just without disk writes.
  const agentsEntry = files.find((f) => f.path === "AGENTS.md");
  if (agentsEntry) {
    const fanOut = fanOutEntryPoints(agentsEntry.content, answers.PROJECT_NAME || "");
    for (const entry of fanOut) {
      files.push({
        path: entry.path,
        content: entry.content,
        filled: agentsEntry.filled,
        unfilled: agentsEntry.unfilled,
        root: true,
      });
    }
  }

  return files;
}
