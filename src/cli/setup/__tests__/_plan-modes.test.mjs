

/**
 * What each install mode adds to the plan.
 *
 * The native daemon service belongs to daemon mode and Compose belongs to
 * docker mode; a stdio install must start no background anything. This was a
 * regression test against the shell installer's phase 6 - the plan is in node
 * now (ADR 080), so the same rule is asserted where it is decided, without
 * spawning a shell to read its dry-run output.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { buildInstallPlan } from "../_plan-install.js";

const ids = (mode, extras) => buildInstallPlan({ agents: ["pi"], mode, extras: extras ?? { service: true } }).map((task) => task.id);

test("stdio starts no background service and no container", () => {
  const plan = ids("stdio");

  assert.ok(!plan.includes("service"), plan.join(", "));
  assert.ok(!plan.includes("docker"), plan.join(", "));
});

test("daemon mode registers the platform service, when it was not declined", () => {
  assert.ok(ids("daemon").includes("service"));
  assert.ok(!ids("daemon", {}).includes("service"), "an unticked service step is a service not installed");
});

test("docker mode brings Compose up and registers no native service", () => {
  const plan = ids("docker");

  assert.ok(plan.includes("docker"), plan.join(", "));
  assert.ok(!plan.includes("service"), "a container is not a LaunchAgent");
});

test("every plan configures the agents it was given, and the runtime home first", () => {
  const plan = buildInstallPlan({ agents: ["pi", "claude"], mode: "stdio", extras: {} });

  assert.equal(plan[0].id, "runtime-home", "the launcher the configs point at needs its home first");
  assert.deepEqual(
    plan.filter((task) => task.id.startsWith("agent:")).map((task) => task.id),
    ["agent:pi", "agent:claude"],
  );
});

test("every install proves the global CLI before it reports success", () => {
  const plan = buildInstallPlan({ agents: ["pi"], mode: "stdio", extras: {} });

  assert.ok(
    plan.some((task) => task.id === "cli"),
    `the CLI is verified: ${plan.map((task) => task.id).join(", ")}`,
  );
});
