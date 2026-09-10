

/** Cache promotion and the agent hook registry: entries, merge, removal. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const state = mkdtempSync(join(tmpdir(), "rule-promote-"));

test.before(() => {
  process.env.RULE_MCP_STATE_DIR = state;
  delete process.env.RULE_MCP_NO_CACHE;
});

test.after(() => {
  rmSync(state, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

const { cacheGet, cachePrime, cacheClear, cacheKey, cacheLookup, cacheStore, promotableEntries, MIN_HITS } = await import("../../../core/cache/tool-cache/index.js");
const { HOOK_EVENTS, hookEntries, isCommitCommand, isMigrationCommand, withHooks, withoutHooks } = await import("../_hooks.js");

test("cachePrime stores only under an empty key and reports it", () => {
  cacheClear();
  const key = cacheKey("pix_tool", { prompt: "first" });
  assert.equal(cachePrime("pix_tool", { prompt: "first" }, { content: [] }), true, "a fresh key primes");
  assert.equal(cacheGet("nope"), undefined, "an unknown key misses");

  assert.equal(cachePrime("pix_tool", { prompt: "first" }, { content: [] }), false, "an existing key refuses a second prime");
});

test("promotableEntries merges tiers and filters below the hit floor", () => {
  const args = (prompt) => ({ prompt });
  cacheStore("pix_tool", args("hot"), { content: [{ type: "text", text: "x" }] }, {});
  for (let index = 0; index < MIN_HITS; index++) {
    cacheLookup("pix_tool", args("hot"));
  }
  cacheStore("pix_tool", args("cold"), { content: [] }, {});

  const promoted = promotableEntries();
  assert.ok(
    promoted.some((entry) => entry.tool === "pix_tool" && JSON.stringify(entry.args) === JSON.stringify(args("hot"))),
    "the hot call earns promotion",
  );
  assert.ok(
    promoted.every((entry) => !(JSON.stringify(entry.args) === JSON.stringify(args("cold")))),
    "the cold call stays below the floor",
  );
  cacheClear();
});

test("the hook registry merges our hooks idempotently and drops them cleanly", () => {
  const launcher = { command: "rule-mcp", args: [] };

  const once = withHooks({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "user hook" }] }] } }, launcher);
  assert.ok(once.hooks.PreToolUse.length >= 2, "our entry joins the user's");
  assert.ok(JSON.stringify(once).includes("rule-mcp"), "our marker travels");

  const twice = withHooks(once, launcher);
  assert.equal(twice.hooks.PreToolUse.length, once.hooks.PreToolUse.length, "re-merging does not duplicate");

  const removed = withoutHooks(twice);
  assert.ok(
    removed.hooks.PreToolUse.some((entry) => entry.hooks[0].command.includes("user hook")),
    "user hooks remain",
  );
  assert.ok(
    removed.hooks.PreToolUse.every((entry) => !entry.hooks[0].command.includes("rule-mcp")),
    "our hooks go",
  );
  assert.equal(withoutHooks({ hooks: {} }).hooks, undefined, "an empty hooks container is dropped");
});

test("the command matchers catch migrations, commits and miss the rest", () => {
  assert.equal(isMigrationCommand("npx prisma migrate dev"), true, "prisma migrate matches");
  assert.equal(isMigrationCommand("pnpm exec drizzle-kit push"), true, "drizzle push matches");
  assert.equal(isMigrationCommand("pnpm run build"), false, "a plain build does not");

  assert.equal(isCommitCommand("git commit -m fix"), true, "git commit matches");
  assert.equal(isCommitCommand("git -C /x commit -m fix"), true, "git -C commit matches");
  assert.equal(isCommitCommand("git status"), false, "git status does not");
  assert.equal(HOOK_EVENTS.length, 3, "the three hook events install");
});
