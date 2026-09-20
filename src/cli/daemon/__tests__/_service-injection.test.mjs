

/**
 * SEC-1: no adapter hands a path to a shell.
 *
 * A HOME-derived path is a value a `$(...)` reaches. The test runs the three
 * adapters with a HOME whose name contains `$(touch INJECTED)`, a quote, a
 * semicolon and a space, and asserts the path arrives as one argv element and
 * the payload never runs.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { tryExecFile } from "../../../shared/index.js";
import { generateWrapperScript } from "../_service-shared.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const META = '$(touch INJECTED);"quoted" spaced';

test("tryExecFile passes a metacharacter argument literally", () => {
  const out = tryExecFile(process.execPath, ["-e", "process.stdout.write(process.argv[1])", META]);

  assert.equal(out, META, "the argument arrives whole, with nothing expanded");
});

test("the launchd wrapper single-quotes the paths, so a metacharacter path is one exec argument", () => {
  const base = mkdtempSync(join(tmpdir(), "rule-wrapper-"));
  const dir = join(base, 'node $(touch INJECTED);"q" spaced');
  const fakeNode = join(dir, "fake-node");
  const wrapper = join(base, "wrapper.sh");

  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(fakeNode, "#!/bin/sh\nprintf '%s\\n' \"$@\"\n");
    chmodSync(fakeNode, 0o755);
    writeFileSync(wrapper, generateWrapperScript({ node: fakeNode, script: "a b.js" }));

    const out = execFileSync("bash", [wrapper], { encoding: "utf8", cwd: base });

    assert.deepEqual(out.split("\n").filter(Boolean), ["a b.js", "serve", "--transport", "sse"], "the node path and the script path are one argument each");
    assert.equal(existsSync(join(base, "INJECTED")), false, "the $(touch) payload never ran");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("the daemon adapters pass a metacharacter path as one argument and run nothing", () => {
  const output = execFileSync(process.execPath, [join(HERE, "_service-injection.fixture.mjs")], { encoding: "utf8", timeout: 30_000 });
  const report = JSON.parse(output);

  try {
    assert.equal(report.injected, false, "the $(touch) payload never ran");
    assert.ok(
      report.argv.some((argument) => argument.includes(META)),
      `no recorded argument carries the metacharacter path: ${JSON.stringify(report.argv)}`,
    );
    assert.ok(report.results.launchd.ok, "the launchd adapter completed");
    assert.ok(report.results.systemd.ok, "the systemd adapter completed");
    assert.ok(report.results.windows.ok, "the windows adapter completed");
  } finally {
    rmSync(report.base, { recursive: true, force: true });
  }
});
