

/** IDE config, model key and environment detection in a sandboxed home. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-detect-env-"));
process.env.HOME = home;

const { detectIdeConfigs, detectModelConfig, detectStoredModelKeys, getEnvironmentInfo } = await import("../_detect-env.js");

test.after(() => rmSync(home, { recursive: true, force: true }));

test("detectIdeConfigs reports configured and unconfigured IDEs", () => {
  mkdirSync(join(home, ".cursor"), { recursive: true });
  writeFileSync(join(home, ".cursor", "mcp.json"), "{}");

  const checks = detectIdeConfigs();
  const cursor = checks.find((c) => c.name.startsWith("Cursor"));
  assert.equal(cursor.configured, true, "an existing config counts as configured");
  assert.ok(cursor.configFile, "the config file path is reported");

  const windsurf = checks.find((c) => c.name.startsWith("Windsurf"));
  assert.equal(windsurf.configured, false, "a missing config counts as unconfigured");
  assert.equal(windsurf.configFile, null, "no path without a config");

  const skills = checks.find((c) => c.name === "Skills directory");
  assert.equal(typeof skills.configured, "boolean", "the skills check answers with a boolean");
  assert.equal(skills.configFile, null, "the skills check carries no config path");
});

test("detectModelConfig reads key presence from the environment", () => {
  const before = process.env.XAI_API_KEY;
  process.env.XAI_API_KEY = "test-key";

  try {
    const grok = detectModelConfig().find((k) => k.keyName === "XAI_API_KEY");
    assert.equal(grok.configured, true, "a set key is detected");
  } finally {
    if (before === undefined) {
      delete process.env.XAI_API_KEY;
    } else {
      process.env.XAI_API_KEY = before;
    }
  }
});

test("detectStoredModelKeys reads the key files under the config dir", () => {
  const configDir = join(home, ".config", "rule-mcp");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, "openai-key"), "sk-fake");

  const keys = detectStoredModelKeys();
  const openai = keys.find((k) => k.provider === "Openai");
  assert.equal(openai.configured, true, "a stored key file is detected");
  assert.ok(openai.file, "the file path is reported");

  const gemini = keys.find((k) => k.provider === "Gemini");
  assert.equal(gemini.configured, false, "a missing key file reads unconfigured");
  assert.equal(gemini.file, null, "no path without a file");
});

test("getEnvironmentInfo degrades to unknown when shell and terminal are absent", () => {
  const saved = { SHELL: process.env.SHELL, ComSpec: process.env.ComSpec, TERM: process.env.TERM };

  delete process.env.SHELL;
  delete process.env.ComSpec;
  delete process.env.TERM;

  try {
    const info = getEnvironmentInfo();

    assert.equal(info.shell, "unknown", "no shell variable reads as unknown");
    assert.equal(info.terminal, "unknown", "no terminal variable reads as unknown");
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test("getEnvironmentInfo names the platform and never leaves shell empty", () => {
  const info = getEnvironmentInfo();
  assert.ok(info.platform, "the platform is named");
  assert.ok(info.node.startsWith("v"), "the node version reads");
  assert.ok(info.shell.length > 0, "the shell falls back rather than reading empty");
});

test("detectIdeConfigs survives an unreadable skills entry", () => {
  const cwd = mkdtempSync(join(tmpdir(), "rule-mcp-detect-env-cwd-"));
  writeFileSync(join(cwd, "skills"), "a file, not a directory");
  const previous = process.cwd();
  process.chdir(cwd);

  try {
    const checks = detectIdeConfigs();
    const skills = checks.find((c) => c.name === "Skills directory");
    assert.equal(skills.configured, false, "an unreadable skills entry counts zero skills");
  } finally {
    process.chdir(previous);
    rmSync(cwd, { recursive: true, force: true });
  }
});
