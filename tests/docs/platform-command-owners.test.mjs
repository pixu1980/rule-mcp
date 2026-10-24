/**
 * SEC-7: one owner per platform command.
 *
 * The daemon shell-out surface lived twice - src/cli/daemon/ and
 * src/cli/commands/daemon/ - so every launchctl/systemctl/sc line was
 * maintained in two files, and a fix in one left the other broken. A command
 * now has exactly one owner, and it is a daemon module: the command layer asks
 * for a verb, it never spells the command.
 */
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Every .js file under dir, skipping the tests that pin the argv shapes. */
function sourceFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") {
        sourceFiles(path, files);
      }
    } else if (entry.name.endsWith(".js")) {
      files.push(path);
    }
  }

  return files;
}

/** A command is issued when an executor is called with the tool as its first argument. */
const EXECUTORS = "tryExec|tryExecFile|tryExecResult|tryExecFileResult|execSync|execFileSync|exec";

for (const tool of ["launchctl", "systemctl", "sc"]) {
  test(`${tool} is issued from exactly one daemon module`, () => {
    const invocation = new RegExp(String.raw`\b(${EXECUTORS})\s*\(\s*["'\`]${tool}(["'\`]|\s)`);
    const owners = sourceFiles(join(root, "src"))
      .filter((file) => invocation.test(readFileSync(file, "utf8")))
      .map((file) => relative(root, file))
      .sort();

    // A log line or a user instruction that names the tool is not an ownership
    // claim, so only the call forms above count.
    assert.equal(owners.length, 1, `${tool} must have exactly one owner, found:\n${owners.join("\n")}`);
    assert.ok(owners[0].startsWith("src/cli/daemon/"), `${tool} must be owned by a daemon module, owner is ${owners[0]}`);
  });
}
