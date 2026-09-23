

/**
 * Building a plan must perform no work: the review screen shows it before
 * the user has agreed to anything.
 */
import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildInstallPlan } from "../_plan-install.js";
import { buildUninstallPlan } from "../_plan-uninstall.js";
import { runPlan, tally } from "../_run-plan.js";

const ids = (plan) => plan.map((task) => task.id);

test("a minimal install plan is the runtime home, the skills reconcile and the cli check", () => {
  assert.deepEqual(ids(buildInstallPlan({})), ["runtime-home", "skills", "cli"]);
});

test("building a plan touches no filesystem", () => {
  const sentinel = join(homedir(), ".rule-mcp-plan-sentinel");

  buildInstallPlan({ agents: ["claude"], mode: "daemon", extras: { rules: true, skills: true, service: true, doctor: true }, context: { hasLocalBin: true, localBin: "/x" } });

  assert.equal(existsSync(sentinel), false);
});

test("every selected agent gets its own row", () => {
  const plan = buildInstallPlan({ agents: ["claude", "cursor", "pi"] });

  assert.deepEqual(ids(plan), ["runtime-home", "agent:claude", "agent:cursor", "agent:pi", "skills", "cli"]);
});

test("the skills row installs when selected and reconciles when not", () => {
  const install = buildInstallPlan({ extras: { skills: true } }).find((task) => task.id === "skills");
  const reconcile = buildInstallPlan({ extras: {} }).find((task) => task.id === "skills");

  assert.match(install.detail, /^~\/\.agents\/skills$/, "the selected step copies the catalog");
  assert.match(reconcile.detail, /\.claude\/skills/, "the declined step removes what an earlier install copied");
});

test("the service step only appears in daemon mode", () => {
  assert.ok(!ids(buildInstallPlan({ mode: "stdio", extras: { service: true } })).includes("service"));
  assert.ok(ids(buildInstallPlan({ mode: "daemon", extras: { service: true } })).includes("service"));
  assert.ok(ids(buildInstallPlan({ mode: "docker" })).includes("docker"));
});

test("the health check is always the last step", () => {
  const plan = buildInstallPlan({ agents: ["claude"], mode: "daemon", extras: { rules: true, skills: true, service: true, doctor: true } });

  assert.equal(ids(plan).at(-1), "doctor");
});

test("the uninstall plan removes agents first and the shim last", () => {
  const plan = buildUninstallPlan({ agents: ["claude", "pi"], groups: ["shim", "agents", "rules"] });

  assert.deepEqual(ids(plan), ["agent:claude", "agent:pi", "rules", "shim"]);
});

test("purge is appended only when a purge target is chosen", () => {
  assert.ok(!ids(buildUninstallPlan({ groups: ["rules"] })).includes("purge"));
  assert.ok(ids(buildUninstallPlan({ groups: ["rules"], purgeIds: ["env-config"] })).includes("purge"));
});

test("a failing task never stops the ones after it", async () => {
  const plan = [
    { id: "a", title: "A", run: () => ({ status: "ok" }) },
    {
      id: "b",
      title: "B",
      run: () => {
        throw new Error("boom");
      },
    },
    { id: "c", title: "C", run: () => ({ status: "ok" }) },
  ];

  const results = await runPlan(plan);

  assert.deepEqual(
    results.map((entry) => entry.status),
    ["ok", "fail", "ok"],
  );
  assert.equal(results[1].summary, "boom");
  assert.deepEqual(tally(results), { ok: 2, warn: 0, skip: 0, fail: 1, total: 3 });
});

test("progress is reported before and after each task", async () => {
  const seen = [];
  const plan = [{ id: "a", title: "A", run: () => ({ status: "ok" }) }];

  await runPlan(plan, { onUpdate: (results) => seen.push(results[0].status) });

  assert.deepEqual(seen, ["running", "ok"]);
});
