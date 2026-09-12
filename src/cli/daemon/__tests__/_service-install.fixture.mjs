/**
 * Install and remove a systemd user unit for real, against a stubbed systemctl.
 *
 * argv[2] is the stub behavior: `absent` leaves `systemctl` off PATH (missing,
 * as it is on this machine), `present` puts a no-op stub on PATH, and
 * `failing` puts one that reports a failure. Everything writes inside a
 * scratch HOME, so no real service is ever touched.
 *
 * Linux only, deliberately: `process.platform` also decides which shell
 * `child_process` spawns, so forcing `win32` here would run every exec through
 * a cmd.exe that does not exist on this machine - the Windows arms would be
 * reached for the wrong reason, and would prove nothing about Windows.
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const behavior = process.argv[2];

Object.defineProperty(process, "platform", { value: "linux", configurable: true });

const home = mkdtempSync(join(tmpdir(), "rule-install-home-"));

process.env.HOME = home;
process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-install-state-"));

if (behavior !== "absent") {
  const bin = join(home, "stub-bin");
  mkdirSync(bin, { recursive: true });

  // `present` prints a line naming the service, which every caller reads as
  // "installed"; `failing` prints the word the installers check for.
  const body = behavior === "failing" ? `#!/bin/sh\necho "Failed to restart rule-mcp"\n` : `#!/bin/sh\necho "SERVICE_NAME: rule-mcp"\n`;

  const stub = join(bin, "systemctl");
  writeFileSync(stub, body);
  chmodSync(stub, 0o755);

  process.env.PATH = `${bin}:${process.env.PATH}`;
}

const { SYSTEMD_UNIT_PATH, installSystemdService, uninstallSystemdService } = await import("../_systemd.js");

const install = installSystemdService();
const unitWritten = existsSync(SYSTEMD_UNIT_PATH);

process.stdout.write(
  JSON.stringify({
    install,
    unitWritten,
    unitNamesEntrypoint: unitWritten && readFileSync(SYSTEMD_UNIT_PATH, "utf8").includes("serve --transport sse"),
    uninstall: uninstallSystemdService(),
    unitRemoved: !existsSync(SYSTEMD_UNIT_PATH),
  }),
);
