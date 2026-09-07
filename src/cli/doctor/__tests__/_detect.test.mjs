/** doctor detection: agent config validation, IDE/model/dir checks on a fake HOME. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-doctor-home-"));
process.env.HOME = home;
process.env.APPDATA = join(home, "AppData", "Roaming");

const { validateAgentConfigs } = await import("../_detect-agents.js");
const { detectIdeConfigs, detectModelConfig, detectStoredModelKeys } = await import("../_detect-env.js");

test.after(() => rmSync(home, { recursive: true, force: true }));

test("validateAgentConfigs passes unconfigured agents through and defaults to valid", () => {
  const bare = { name: "windsurf", configured: false };
  assert.deepEqual(validateAgentConfigs([bare])[0], bare, "an unconfigured agent is untouched");

  const plain = { name: "cursor", configured: true, configFile: join(home, "plain.json") };
  writeFileSync(plain.configFile, "{}");
  const [parsed] = validateAgentConfigs([plain]);
  assert.equal(parsed.validated, true, "a config that matches no special case validates");
});

test("validateAgentConfigs parses vscode, claude and generic mcp files", () => {
  const vscode = join(home, "vscode.json");
  writeFileSync(vscode, JSON.stringify({ servers: { "rule-mcp": { command: "node", args: ["x"], url: "http://h/mcp" } } }));
  const [v] = validateAgentConfigs([{ name: "vscode", configured: true, configFile: vscode }]);
  assert.equal(v.validated, true, "a vscode servers entry validates");
  assert.equal(v.command, "node", "the command is extracted");
  assert.equal(v.url, "http://h/mcp", "the url is extracted");

  const claude = join(home, ".claude.json");
  writeFileSync(claude, JSON.stringify({ mcpServers: { "rule-mcp": { command: "node" } } }));
  const [c] = validateAgentConfigs([{ name: "claude", configured: true, configFile: claude }]);
  assert.equal(c.validated, true, "a claude mcpServers entry validates");

  const generic = join(home, "mcp.json");
  writeFileSync(generic, JSON.stringify({ mcpServers: { "rule-mcp": { command: "node" } } }));
  const [g] = validateAgentConfigs([{ name: "zed", configured: true, configFile: generic }]);
  assert.equal(g.validated, true, "a generic mcp.json entry validates");
});

test("validateAgentConfigs reports missing, broken and unreadable configs", () => {
  const empty = join(home, "empty.json");
  writeFileSync(empty, JSON.stringify({ servers: {} }));
  const [e] = validateAgentConfigs([{ name: "vscode", configured: true, configFile: empty }]);
  assert.equal(e.validated, false, "no rule-mcp entry means unvalidated");

  const broken = join(home, "broken.claude.json");
  writeFileSync(broken, "{ nope");
  const [b] = validateAgentConfigs([{ name: "claude", configured: true, configFile: broken }]);
  assert.equal(b.validated, false, "malformed JSON is caught");
  assert.match(b.parseError ?? "", /Invalid JSON/, "the parse error is named");

  const unreadable = join(home, "as-dir");
  mkdirSync(unreadable);
  const [u] = validateAgentConfigs([{ name: "claude", configured: true, configFile: join(unreadable, "file.json") }]);
  assert.equal(u.validated, false, "an unreadable file is caught");
  assert.match(u.readError ?? "", /Cannot read/, "the read error is named");
});

test("detectIdeConfigs counts the skills directory and the platform paths", () => {
  const previousDir = process.cwd();
  process.chdir(home);
  mkdirSync(join(home, "skills"), { recursive: true });
  for (let index = 0; index < 3; index++) {
    writeFileSync(join(home, "skills", `rule-skill-${index}`), "");
  }
  mkdirSync(join(home, ".cursor"), { recursive: true });
  writeFileSync(join(home, ".cursor", "mcp.json"), "{}");

  const checks = detectIdeConfigs();
  const skills = checks.find((entry) => entry.name === "Skills directory");
  assert.equal(skills.configured, false, "three skills stay under the sixty threshold");
  assert.equal(skills.detail, "3 skills", "the count is reported");

  const cursor = checks.find((entry) => entry.name === "Cursor (IDE)");
  assert.equal(cursor.configured, true, "an existing cursor config is detected");
  const windsurf = checks.find((entry) => entry.name === "Windsurf (IDE)");
  assert.equal(windsurf.configured, false, "a missing windsurf config is not");
  assert.ok(
    checks.some((entry) => entry.name === "VS Code User"),
    "the platform vscode path is checked",
  );
  process.chdir(previousDir);
});

test("model config maps the environment and the stored key files", () => {
  process.env.OPENAI_API_KEY = "sk-test";
  const models = detectModelConfig();
  assert.equal(models.find((entry) => entry.keyName === "OPENAI_API_KEY").configured, true, "a set env key is configured");
  assert.equal(models.find((entry) => entry.keyName === "CO_API_KEY").configured, false, "an unset key is not");

  mkdirSync(join(home, ".config", "rule-mcp"), { recursive: true });
  writeFileSync(join(home, ".config", "rule-mcp", "anthropic-key"), "secret");
  const stored = detectStoredModelKeys();
  const anthropic = stored.find((entry) => entry.provider === "Anthropic");
  assert.equal(anthropic.configured, true, "a stored key file is detected");
  const xai = stored.find((entry) => entry.provider === "Xai");
  assert.equal(xai.configured, false, "an absent file is not detected");
});
