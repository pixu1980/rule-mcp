import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const forbidden = "";
const ignoredDirectories = new Set([".git", "node_modules", ".tokensave", ".agents", ".pi", ".github", ".vscode"]);

/**
 * Walk a directory tree, returning all file paths.
 */
function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, files);
    } else {
      files.push(path);
    }
  }
  return files;
}

console.log("repository contract test");

// Only check src/, test/, prompts/, scripts/ - the project's own code.
// `forbidden` is the token that must not appear in file names/contents.
// When it is empty there is nothing to scan for - `"".includes("")` is always
// true, which would flag every file - so skip the substring sweep entirely.
const sourceDirectories = ["src", "test", "prompts", "scripts", "rules", "skills"];
for (const sub of forbidden ? sourceDirectories : []) {
  const dir = join(root, sub);
  if (!existsSync(dir)) {
    continue;
  }

  const files = walk(dir);

  // Check file names
  const nameMatches = files.filter((file) => basename(file).toLowerCase().includes(forbidden));
  assert.equal(nameMatches.length, 0, `[${sub}] no files should contain '${forbidden}' in their name:\n` + nameMatches.join("\n"));

  // Check file contents
  const contentMatches = [];
  for (const file of files) {
    // Skip this file itself (contains 'rule_tool_' in comments/messages)
    if (file === import.meta.filename || file.endsWith("repository-contract.test.mjs")) {
      continue;
    }
    const content = readFileSync(file);
    if (content.includes(0)) {
      continue;
    }
    const text = content.toString("utf8");
    if (!text.includes(forbidden)) {
      continue;
    }
    // Skip lines that are intentional product names (env vars, git username, server names)
    const lines = text.split("\n");
    const hasRealPix = lines.some((l) => {
      return !!l.includes(forbidden);
    });
    if (hasRealPix) {
      contentMatches.push(file);
    }
  }
  assert.equal(
    contentMatches.length,
    0,
    `[${sub}] ${contentMatches.length} files contain '${forbidden}' in their content.\n` +
      "Run: rg -l 'rule_tool_' " +
      sub +
      "/\n" +
      "First 10:\n" +
      contentMatches.slice(0, 10).join("\n"),
  );
}

// Root-level checks
assert.ok(existsSync(join(root, "skills", "rule-mcp", "SKILL.md")), "router skill must be named rule-mcp");

const promptTemplate = join(root, "prompts", "rule.md");
assert.ok(existsSync(promptTemplate), "Pi prompt template must exist");
const prompt = readFileSync(promptTemplate, "utf8");
assert.ok(prompt.includes("$ARGUMENTS"), "Pi prompt template must forward command arguments");
assert.ok(prompt.includes("rule-mcp"), "Pi prompt template must route through rule-mcp tool");

const universalInstallerPath = join(root, "scripts", "install.sh");
const universalInstaller = readFileSync(universalInstallerPath, "utf8");
execFileSync("bash", [universalInstallerPath, "--agent", "pi", "--force", "--dry-run", "--no-wizard"], {
  cwd: root,
  env: { ...process.env, HOME: mkdtempSync(join(tmpdir(), "rule-mcp-install-")) },
  stdio: "pipe",
});
// The bootstrap forwards to `rule-mcp setup` and writes nothing itself
// (ADR 090), so the rules it used to carry are read where they live now.
const installerRules = readFileSync(join(root, "src", "cli", "installers", "_instruction.data.js"), "utf8");
for (const tool of ["rule_tool -", "rule_tool_process_adr", "rule_tool_handoff", "rule_tool_handon"]) {
  assert.ok(installerRules.includes(tool), `universal installer rules must reference ${tool}`);
}
for (const tool of ["rule_tool_ai", "rule_adr", "rule_handoff"]) {
  assert.ok(!installerRules.includes(tool), `universal installer rules must not reference obsolete ${tool}`);
  assert.ok(!universalInstaller.includes(tool), `the bootstrap must not reference obsolete ${tool}`);
  const obsoletePattern = new RegExp(`(?<![A-Za-z0-9_])${tool}(?![A-Za-z0-9_])`);
  const sourceDir = join(root, "src");

  if (!existsSync(sourceDir)) {
    continue;
  }

  const matches = walk(sourceDir).filter((file) => {
    const data = readFileSync(file);
    return !data.includes(0) && obsoletePattern.test(data.toString("utf8"));
  });

  assert.deepEqual(matches, [], `src/ must not reference obsolete ${tool}`);
}

const skillsInstaller = join(root, "scripts", "install-skills.sh");
assert.ok(existsSync(skillsInstaller), "skills-only installer must exist");
const fakeHome = mkdtempSync(join(tmpdir(), "rule-mcp-skills-"));
const target = join(fakeHome, ".agents", "skills");
mkdirSync(join(target), { recursive: true });
execFileSync("bash", [skillsInstaller], { cwd: root, env: { ...process.env, HOME: fakeHome } });
const installedSkills = readdirSync(target, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(target, entry.name, "SKILL.md")))
  .map((entry) => entry.name)
  .sort();
const sourceSkills = readdirSync(join(root, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(root, "skills", entry.name, "SKILL.md")))
  .map((entry) => entry.name)
  .sort();
assert.deepEqual(installedSkills, sourceSkills, "skills-only installer must install every bundled skill globally");

console.log("  ✅ repository clean, Pi prompt present, global skills installer works");
