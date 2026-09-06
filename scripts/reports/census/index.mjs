/**
 * Generate the census docs from the live surface.
 *
 * One generated file per inventory topic, always derived from the registries
 * that define it, never from memory:
 *
 *   docs/07-skills.md        - every skill, with its description and tool
 *   docs/08-tools.md         - every MCP tool (core + per-skill), LLM-free
 *   docs/09-prompts.md       - every MCP prompt, by category
 *   docs/10-instructions.md  - the agent command surface and install targets
 *   docs/11-cli.md           - the full CLI reference (from the commander tree)
 *   docs/12-personas.md      - the persona catalog (src/roles/*.md)
 *
 * plus marker-refreshed blocks in docs/01 (family counts) and docs/05 (env
 * registry). Adding, removing or renaming any surface and running `pnpm census`
 * (wired into prebuild and a pre-commit hook) rewrites these files, so the docs
 * can never drift from the code they describe.
 *
 * Run: pnpm census  (also wired into prebuild and .githooks/pre-commit)
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { upsertBlock } from "./_markdown.mjs";
import { DOCS_DIR } from "./_surface.mjs";
import { GENERATED_FILES } from "./_generated-files.mjs";
import { MARKER_TARGETS } from "./_marker-targets.mjs";

// Write everything
// ─────────────────────────────────────────────────────────────────────────────

for (const file of GENERATED_FILES) {
  writeFileSync(join(DOCS_DIR, file.file), file.build().trimEnd() + "\n");
  process.stdout.write("Writing " + file.file + "\n");
}

for (const target of MARKER_TARGETS) {
  upsertBlock(join(DOCS_DIR, target.file), target.marker, target.build());
  process.stdout.write("Refreshing " + target.file + " (" + target.marker + ")\n");
}
