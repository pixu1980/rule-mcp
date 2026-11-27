import assert from "node:assert/strict";
import { test } from "node:test";

const { codexHooks, cursorHooks, geminiHooks, guardCommand, kiroHooks, opencodePlugin, piExtension } = await import("../_hook-writers.js");

const launcher = { command: "/bin/rule-mcp" };

test("the guard line quotes a launcher path with spaces and carries the marker", () => {
  const line = guardCommand({ command: "/opt/rule mcp/bin/rule-mcp" }, "bash");

  assert.match(line, /^"\/opt\/rule mcp\/bin\/rule-mcp" guard --send bash {2}# rule-mcp-guard$/);
});

test("the guard line writes a Windows path with forward slashes and quotes it", () => {
  const line = guardCommand({ command: String.raw`C:\Program Files\nodejs\node.exe`, args: [String.raw`C:\Users\me\rule-mcp\bin\rule-mcp.js`] }, "bash");

  assert.match(line, /^"C:\/Program Files\/nodejs\/node\.exe" "C:\/Users\/me\/rule-mcp\/bin\/rule-mcp\.js" guard --send bash {2}# rule-mcp-guard$/);
});

test("Cursor gets its camelCase events, flat hooks and tool matchers", () => {
  const document = cursorHooks(launcher);

  assert.equal(document.version, 1);
  assert.deepEqual(Object.keys(document.hooks), ["preToolUse", "postToolUse", "sessionStart", "beforeSubmitPrompt"]);
  assert.equal(document.hooks.preToolUse[0].matcher, "Shell");
  assert.match(document.hooks.preToolUse[1].command, /guard --send structure/);
  assert.match(document.hooks.postToolUse[0].command, /guard --send write/);
  assert.equal(document.hooks.sessionStart[0].matcher, undefined);
});

test("Kiro gets standalone PascalCase hooks with command actions", () => {
  const document = kiroHooks(launcher);
  const triggers = document.hooks.map((hook) => hook.trigger);

  assert.equal(document.version, "v1");
  assert.deepEqual(triggers, ["PreToolUse", "PreToolUse", "PostToolUse", "SessionStart", "UserPromptSubmit"]);
  assert.equal(document.hooks[0].matcher, "shell");
  assert.equal(document.hooks[0].action.type, "command");
  assert.match(document.hooks[0].action.command, /guard --send bash/);
  assert.equal(
    document.hooks.every((hook) => hook.enabled),
    true,
  );
});

test("Gemini keeps the BeforeTool and AfterTool matcher groups", () => {
  const hooks = geminiHooks(launcher);

  assert.equal(hooks.BeforeTool.length, 2);
  assert.match(hooks.BeforeTool[0].hooks[0].command, /guard --send bash/);
  assert.match(hooks.BeforeTool[1].hooks[0].command, /guard --send structure/);
  assert.match(hooks.AfterTool[0].hooks[0].command, /guard --send write/);
});

test("Codex nests the events under hooks and matches its own tool names", () => {
  const document = codexHooks(launcher);

  assert.deepEqual(Object.keys(document), ["hooks"]);
  assert.deepEqual(Object.keys(document.hooks), ["PreToolUse", "PostToolUse", "SessionStart", "UserPromptSubmit"]);
  assert.equal(document.hooks.PreToolUse[0].matcher, "Bash");
  assert.equal(document.hooks.PostToolUse[0].hooks[0].type, "command");
  assert.match(
    document.hooks.PreToolUse[0].hooks[0].command,
    /^env RULE_MCP_HOOK_HOST=codex \/bin\/rule-mcp guard --send bash/,
    "Codex hooks tag the host so ask encodes without turn_id",
  );
});

test("Codex handlers carry statusMessage so /hooks shows a name", () => {
  const document = codexHooks(launcher);
  const titles = Object.values(document.hooks)
    .flat()
    .flatMap((group) => group.hooks.map((hook) => hook.statusMessage));

  assert.deepEqual(titles, ["rule-mcp: guard bash", "rule-mcp: guard structure", "rule-mcp: guard write", "rule-mcp: session start", "rule-mcp: prompt submit"]);
  assert.equal(
    titles.every((title) => typeof title === "string" && title.trim().length > 0),
    true,
    "blank statusMessage falls back to Unnamed hook in the Codex browser",
  );
});

test("the OpenCode plugin calls the guard subcommands", () => {
  const source = opencodePlugin(launcher);

  assert.match(source, /tool\.execute\.before/);
  assert.match(source, /tool\.execute\.after/);
  assert.match(source, /"guard"/);
  assert.match(source, /"structure"/);
});

test("the Pi extension calls the guard subcommands", () => {
  const source = piExtension(launcher);

  assert.match(source, /pi\.on\("tool_call"/);
  assert.match(source, /pi\.on\("tool_result"/);
  assert.match(source, /"guard","--send","bash"/);
  assert.match(source, /"guard","--send","write"/);
});
