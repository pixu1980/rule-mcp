

/**
 * @module cli/guard/__tests__/structural-gate
 *
 * The one confirmation a task can be asked for (ADR 129), and the shape of it:
 * asked at the first structural write, not asked again for the rest of that
 * task, asked again after the next prompt.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../../../../bin/rule-mcp.js", import.meta.url));

/** One session against one project, with its own state directory. */
function session() {
  const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-structural-state-"));
  const cwd = realpathSync(mkdtempSync(join(tmpdir(), "rule-mcp-structural-")));
  mkdirSync(join(cwd, ".git"), { recursive: true });
  mkdirSync(join(cwd, "src"), { recursive: true });

  const env = { ...process.env, RULE_MCP_STATE_DIR: stateDir };
  const run = (kind, payload) =>
    JSON.parse(
      execFileSync(process.execPath, [BIN, "guard", kind], {
        input: JSON.stringify({ session_id: "s1", cwd, ...payload }),
        encoding: "utf8",
        cwd,
        env,
      }) || "{}",
    );

  return {
    cwd,
    env,
    prompt: (text) => run("prompt-submit", { prompt: text }),
    structure: (toolInput) => run("structure", { hook_event_name: "PreToolUse", tool_input: toolInput }),
    landed: (toolInput) => run("write", { hook_event_name: "PostToolUse", tool_input: toolInput }),
    put: (path, content) => {
      mkdirSync(dirname(join(cwd, path)), { recursive: true });
      writeFileSync(join(cwd, path), content);
    },
  };
}

const asks = (answer) => answer.hookSpecificOutput?.permissionDecision === "ask";
const why = (answer) => answer.hookSpecificOutput?.permissionDecisionReason ?? "";

const adr = (s, n) => ({ file_path: join(s.cwd, `docs/adr/00${n}-a.md`), content: `# ${n}\n` });

test("a structural write asks once, and the rest of the task never asks again", () => {
  const s = session();
  s.prompt("record the decisions");

  const first = s.structure(adr(s, 1));
  assert.equal(asks(first), true);
  assert.match(why(first), /records an architecture decision/);

  s.put("docs/adr/001-a.md", "# 1\n");
  s.landed({ file_path: join(s.cwd, "docs/adr/001-a.md") });

  assert.equal(asks(s.structure(adr(s, 2))), false, "the same decision is not re-asked per file");
});

test("the next prompt starts a task that asks again", () => {
  const s = session();
  s.prompt("record the decision");
  s.structure(adr(s, 1));
  s.put("docs/adr/001-a.md", "# 1\n");
  s.landed({ file_path: join(s.cwd, "docs/adr/001-a.md") });

  s.prompt("now record the next one");

  assert.equal(asks(s.structure(adr(s, 2))), true, "a new task is a new decision");
});

test("a refused confirmation is asked again: no write landed to answer it", () => {
  const s = session();
  s.prompt("record the decision");

  assert.equal(asks(s.structure(adr(s, 1))), true);
  assert.equal(asks(s.structure(adr(s, 1))), true, "nothing landed, so nothing was confirmed");
});

test("a new file is never asked about, module, script or test", () => {
  const s = session();
  s.prompt("build the card");

  for (const path of ["src/Card.jsx", "scripts/reports/_map.mjs", "tests/card.test.mjs"]) {
    const answer = s.structure({ file_path: join(s.cwd, path), content: "export const C = 1;\n" });
    assert.equal(asks(answer), false, `${path} asked for a confirmation`);
  }
});

test("ordinary edits are never asked about", () => {
  const s = session();
  s.prompt("fix the label");
  s.put("src/Card.jsx", "export const C = 1;\n");

  const edit = s.structure({ file_path: join(s.cwd, "src/Card.jsx"), old_string: "1", new_string: "2" });
  assert.equal(asks(edit), false);

  const doc = s.structure({ file_path: join(s.cwd, "README.md"), content: "# Hello\n" });
  assert.equal(asks(doc), false, "a new file that is not a module is not a structure change");
});

test("a dependency change and an ADR are structural on their own", () => {
  const s = session();
  s.prompt("add zod");
  s.put("package.json", "{}\n");

  const manifest = s.structure({
    file_path: join(s.cwd, "package.json"),
    content: '{"dependencies":{"zod":"4.0.0"}}',
  });
  assert.equal(asks(manifest), true);
  assert.match(why(manifest), /what the project depends on/);

  const other = session();
  other.prompt("record the decision");
  const record = other.structure({ file_path: join(other.cwd, "docs/adr/001-a.md"), content: "# 1\n" });
  assert.equal(asks(record), true);
  assert.match(why(record), /records an architecture decision/);
});

test("the model's declaration is what the question is asked about", async () => {
  const s = session();
  s.prompt("rename the boundary");

  const { declareStructural } = await import("../_task.js");
  const previous = process.env.RULE_MCP_STATE_DIR;
  process.env.RULE_MCP_STATE_DIR = s.env.RULE_MCP_STATE_DIR;
  declareStructural(s.cwd, "the router moves behind the gateway");
  process.env.RULE_MCP_STATE_DIR = previous;

  s.put("src/Card.jsx", "export const C = 1;\n");

  const edit = s.structure({ file_path: join(s.cwd, "src/Card.jsx"), old_string: "1", new_string: "2" });
  assert.equal(asks(edit), true, "an ordinary-looking edit asks once the task was declared");
  assert.match(why(edit), /the router moves behind the gateway/);
});
