import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const forbidden = "webi" + "doo";
const ignoredDirs = new Set([".git", "node_modules", ".tokensave", ".agents"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

console.log("repository contract test");

const files = walk(root);
assert.equal(
  files.filter((file) => basename(file).toLowerCase().includes(forbidden)).length,
  0,
  "repository must not contain forbidden term in file names",
);

const references = [];
const allowedFiles = new Set([
  // These files describe the port history and intentionally contain the old name.
  join(root, "skills", "rule-frontend-vanilla-reactive", "DESIGN.md"),
]);
for (const file of files) {
  if (allowedFiles.has(file)) continue;
  const content = readFileSync(file);
  if (content.includes(0)) continue;
  if (content.toString("utf8").toLowerCase().includes(forbidden)) references.push(file);
}
assert.deepEqual(references, [], "repository must not contain forbidden term in file contents");

assert(existsSync(join(root, "skills", "rule", "SKILL.md")), "router skill must be named rule");
assert(!existsSync(join(root, "skills", "rule-mcp")), "legacy rule-mcp skill directory must be removed");

const promptTemplate = join(root, "prompts", "rule-mcp.md");
assert(existsSync(promptTemplate), "Pi prompt template must exist");
const prompt = readFileSync(promptTemplate, "utf8");
assert(prompt.includes("$ARGUMENTS"), "Pi prompt template must forward command arguments");
assert(prompt.includes("rule"), "Pi prompt template must route through rule tool");

const projectInstructions = readFileSync(join(root, "CLAUDE.md"), "utf8");
assert(
  projectInstructions.includes("After every prompt, run `./scripts/install.sh --agent pi --force --no-rules`"),
  "project instructions must keep Pi installation updated after every prompt",
);

const universalInstallerPath = join(root, "scripts", "install.sh");
const universalInstaller = readFileSync(universalInstallerPath, "utf8");
execFileSync("bash", [universalInstallerPath, "--agent", "pi", "--force", "--dry-run"], {
  cwd: root,
  env: { ...process.env, HOME: mkdtempSync(join(tmpdir(), "rule-mcp-install-")) },
  stdio: "pipe",
});
for (const tool of ["rule —", "pix_process_adr", "pix_process_handoff"]) {
  assert(universalInstaller.includes(tool), `universal installer rules must reference ${tool}`);
}
for (const obsolete of ["pix_" + "ai", "pix_" + "adr", "pix_" + "handoff"]) {
  assert(!universalInstaller.includes(obsolete), `universal installer rules must not reference obsolete ${obsolete}`);
  const obsoletePattern = new RegExp(`(?<![A-Za-z0-9_])${obsolete}(?![A-Za-z0-9_])`);
  const obsoleteReferences = files.filter((file) => {
    const data = readFileSync(file);
    return !data.includes(0) && obsoletePattern.test(data.toString("utf8"));
  });
  assert.deepEqual(obsoleteReferences, [], `repository must not reference obsolete ${obsolete}`);
}

const skillsInstaller = join(root, "scripts", "install-skills.sh");
assert(existsSync(skillsInstaller), "skills-only installer must exist");
const fakeHome = mkdtempSync(join(tmpdir(), "rule-mcp-skills-"));
const target = join(fakeHome, ".agents", "skills");
mkdirSync(join(target, "rule-mcp"), { recursive: true });
execFileSync("bash", [skillsInstaller], { cwd: root, env: { ...process.env, HOME: fakeHome } });
assert(!existsSync(join(target, "rule-mcp")), "skills installer must remove legacy dispatcher skill");
const sourceSkills = readdirSync(join(root, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(root, "skills", entry.name, "SKILL.md")))
  .map((entry) => entry.name)
  .sort();
const installedSkills = readdirSync(target, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(target, entry.name, "SKILL.md")))
  .map((entry) => entry.name)
  .sort();
assert.deepEqual(installedSkills, sourceSkills, "skills-only installer must install every bundled skill globally");

console.log("  ✅ repository clean, Pi prompt present, global skills installer works");
