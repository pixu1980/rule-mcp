

/**
 * Run the daemon service surface under a forced platform.
 *
 * `IS_MACOS`/`IS_LINUX`/`IS_WINDOWS` are module-level constants read from
 * `os.platform()` at load, so the only way to exercise the arms this machine
 * is not is to fix `process.platform` before the module graph loads. That is
 * what this child does: argv[2] is the platform, and the JSON it prints on
 * stdout is what the parent asserts against.
 *
 * Everything it calls is a dry run or a read, so no service is ever installed.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const forced = process.argv[2];

Object.defineProperty(process, "platform", { value: forced, configurable: true });

process.env.HOME = mkdtempSync(join(tmpdir(), "rule-platform-home-"));
process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-platform-state-"));

const { detectPlatform, installDaemonService, uninstallDaemonService } = await import("../_service.js");
const { checkDaemonService, getServiceFilePath, getServiceName } = await import("../_service-status.js");
const { formatDaemonStatus } = await import("../_status-format.js");

const status = checkDaemonService();

process.stdout.write(
  JSON.stringify({
    detected: detectPlatform(),
    install: installDaemonService({ dryRun: true }),
    uninstall: await uninstallDaemonService({ dryRun: true }),
    status: { platform: status.platform, service: status.service, installed: status.installed, detailKeys: Object.keys(status.details).sort() },
    serviceFilePath: getServiceFilePath(),
    serviceName: getServiceName(),
    formatted: formatDaemonStatus(),
  }),
);
