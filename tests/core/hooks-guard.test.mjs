/**
 * @module test/hooks-guard.test
 *
 * The two steps a prompt cannot enforce, moved into the harness:
 *   - a schema migration is confirmed before it is applied, not reviewed the
 *     morning after with ten hours of code on top of it
 *   - a commit carries the guardrail verdict on its own staged files
 *
 * Covers the pure decision layer, the settings merge (foreign hooks survive,
 * repeat installs do not duplicate, uninstall leaves nothing behind), and the
 * end-to-end contract of the `guard` CLI over stdin.
 */

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("=== Harness guard hooks ===\n");

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  HOOK_MARKER,
  hasHooks,
  hookEntries,
  isCommitCommand,
  isMigrationCommand,
  withHooks,
  withoutHooks,
} from "../../src/core/agents/_hooks.js";
import { decide, skillForPath } from "../../src/cli/guard/index.js";

const LAUNCHER = { command: "/usr/local/bin/rule-mcp", args: [] };
const BIN = fileURLToPath(new URL("../../bin/rule-mcp.js", import.meta.url));

// ── T1: which commands are the point of no return ──
for (const command of [
  "npx prisma migrate deploy",
  "pnpm prisma migrate dev --name add_payment_fields",
  "npx prisma db push",
  "pnpm drizzle-kit push",
  "knex migrate:latest",
  "bundle exec rails db:migrate",
  "alembic upgrade head",
]) {
  check(`T1 migration: ${command}`, isMigrationCommand(command) === true);
}
for (const command of ["ls -la", "npx prisma generate", "npx prisma studio", "git status"]) {
  check(`T1.1 not a migration: ${command}`, isMigrationCommand(command) === false);
}

// ── T2: git commit in every shape the agent writes it ──
for (const command of ["git commit -m 'x'", "git -C /tmp/repo commit --amend", "pnpm lint && git commit -m y"]) {
  check(`T2 commit: ${command}`, isCommitCommand(command) === true);
}
for (const command of ["git status", "git log --oneline", "echo commit"]) {
  check(`T2.1 not a commit: ${command}`, isCommitCommand(command) === false);
}

// ── T3: the decision layer ──
const migration = decide("npx prisma migrate deploy");
check("T3 a migration asks first", migration.hookSpecificOutput.permissionDecision === "ask");
check(
  "T3.1 the reason carries the column checklist",
  /who writes it/.test(migration.hookSpecificOutput.permissionDecisionReason) &&
    /who reads it/.test(migration.hookSpecificOutput.permissionDecisionReason),
);
check("T3.2 an unrelated command passes silently", decide("ls -la").hookSpecificOutput.permissionDecision === "allow");
check(
  "T3.3 a clean commit passes silently",
  decide("git commit -m x", "bash", () => []).hookSpecificOutput.permissionDecision === "allow",
);
const dirty = decide("git commit -m x", "bash", () => [
  { file: "prisma/x.sql", failures: ["no-speculative-audit-table"] },
]);
check(
  "T3.4 a failing commit asks, and names the file and the rule",
  dirty.hookSpecificOutput.permissionDecision === "ask" &&
    dirty.hookSpecificOutput.permissionDecisionReason.includes("prisma/x.sql") &&
    dirty.hookSpecificOutput.permissionDecisionReason.includes("no-speculative-audit-table"),
);
check("T3.5 an empty command is never blocked", decide("").hookSpecificOutput.permissionDecision === "allow");

// ── T4: file -> skill mapping for the staged check ──
check(
  "T4 sql and prisma map to the data skill",
  skillForPath("prisma/migrations/x/migration.sql") === "rule-data-sql" &&
    skillForPath("prisma/schema.prisma") === "rule-data-sql",
);
check("T4.1 components map to their framework", skillForPath("src/Button.tsx") === "rule-frontend-react");

// ── T5: the settings merge is additive, idempotent and reversible ──
const foreign = {
  model: "opus",
  hooks: { PreToolUse: [{ matcher: "Write", hooks: [{ type: "command", command: "prettier" }] }] },
};
const installed = withHooks(foreign, LAUNCHER);
check("T5 our entry is added", hasHooks(installed));
check(
  "T5.1 a foreign hook survives",
  installed.hooks.PreToolUse.some((e) => e.matcher === "Write"),
);
check("T5.2 unrelated settings survive", installed.model === "opus");
check("T5.3 one entry, one spawn per Bash call", hookEntries(LAUNCHER).PreToolUse.length === 1);
check("T5.4 the entry is marked as ours", installed.hooks.PreToolUse.at(-1).hooks[0].command.includes(HOOK_MARKER));
// The directive hooks are covered by test/prompt-directive.test.mjs; here we only
// assert the guard entry keeps its own event to itself.
check(
  "T5.5 reinstall does not duplicate",
  withHooks(installed, LAUNCHER).hooks.PreToolUse.length === installed.hooks.PreToolUse.length,
);
const removed = withoutHooks(installed);
check("T5.6 uninstall removes only ours", !hasHooks(removed) && removed.hooks.PreToolUse.length === 1);
check("T5.7 an empty hooks container is dropped", withoutHooks(withHooks({}, LAUNCHER)).hooks === undefined);

// ── T6: the CLI contract the hook actually invokes ──
const run = (command) =>
  JSON.parse(
    execFileSync(process.execPath, [BIN, "guard", "bash"], {
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
      encoding: "utf8",
    }),
  );
check(
  "T6 the CLI asks on a migration",
  run("npx prisma migrate deploy").hookSpecificOutput.permissionDecision === "ask",
);
check("T6.1 the CLI allows an unrelated command", run("ls").hookSpecificOutput.permissionDecision === "allow");
const malformed = execFileSync(process.execPath, [BIN, "guard", "bash"], { input: "not json", encoding: "utf8" });
check("T6.2 a malformed payload never blocks", JSON.parse(malformed).hookSpecificOutput.permissionDecision === "allow");

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 100);
