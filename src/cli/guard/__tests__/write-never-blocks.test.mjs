

/**
 * @module cli/guard/__tests__/write-never-blocks
 *
 * The invariant ADR 129 is worth having: `guard write` cannot stop a tool call.
 *
 * Not "does not today". Cannot: every payload that ever produced an ask or a
 * deny is run through the real CLI, and the answer is read for any field a
 * host would treat as a refusal.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../../../../bin/rule-mcp.js", import.meta.url));

/** Every shape a host reads as "do not run this tool call". */
function stops(answer) {
  const decision = answer?.hookSpecificOutput?.permissionDecision;

  return decision === "ask" || decision === "deny" || answer?.decision === "block" || answer?.continue === false;
}

/** A project with the file already on disk, the way PostToolUse finds it. */
function project(files) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "rule-never-blocks-")));
  mkdirSync(join(dir, ".git"), { recursive: true });

  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), content);
  }

  return dir;
}

/** Run the hook exactly as a settings file does, and parse what it printed. */
function guardWrite(payload, cwd) {
  const stateDir = mkdtempSync(join(tmpdir(), "rule-never-blocks-state-"));
  const out = execFileSync(process.execPath, [BIN, "guard", "write"], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf8",
    cwd,
    env: { ...process.env, RULE_MCP_STATE_DIR: stateDir },
  });

  return JSON.parse(out);
}

const ITALIAN = "// restituisce il valore della configurazione\n";
const EM_DASH = "/** A note — with an em dash. */\nexport const x = 1;\n";
const BRITISH = "/** Normalise the colour. */\nexport const y = 2;\n";
const FAILING = 'export function Card(){ return <div className="card">hi</div>; }\n';

const CASES = [
  ["an Italian comment", { "src/a.js": ITALIAN }, "src/a.js"],
  ["an em dash", { "src/b.js": EM_DASH }, "src/b.js"],
  ["a British spelling", { "src/c.js": BRITISH }, "src/c.js"],
  ["a file that fails four guardrails", { "src/d.jsx": FAILING }, "src/d.jsx"],
  ["a manifest", { "package.json": '{"dependencies":{"left-pad":"^1.0.0"}}' }, "package.json"],
  ["a CSS file with a class selector", { "src/e.css": ".card { color: red; }\n" }, "src/e.css"],
  ["a migration", { "db/001.sql": "ALTER TABLE users ADD COLUMN x text;\n" }, "db/001.sql"],
];

for (const [label, files, path] of CASES) {
  test(`guard write cannot stop a tool call: ${label}`, () => {
    const cwd = project(files);
    const answer = guardWrite(
      { session_id: "s1", cwd, hook_event_name: "PostToolUse", tool_input: { file_path: join(cwd, path) } },
      cwd,
    );

    assert.equal(stops(answer), false, `${label} produced ${JSON.stringify(answer)}`);
  });
}

test("a PreToolUse settings file from before ADR 129 still cannot block", () => {
  const cwd = project({ "src/legacy.js": EM_DASH });
  const answer = guardWrite(
    {
      session_id: "s1",
      cwd,
      hook_event_name: "PreToolUse",
      tool_input: { file_path: join(cwd, "src/legacy.js"), content: EM_DASH },
    },
    cwd,
  );

  assert.equal(stops(answer), false);
  assert.equal(answer.hookSpecificOutput?.permissionDecision, "allow");
});
