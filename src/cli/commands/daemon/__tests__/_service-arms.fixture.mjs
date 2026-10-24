/**
 * Run the daemon service CLI arms under a forced platform and print what they
 * printed, one JSON object on stdout.
 *
 * argv[2] is the platform; argv[3] is the action. Install and uninstall are
 * always dry runs. `enable` and `disable` shell out, so the parent only asks
 * for them on platforms whose tooling is absent here - see the test.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const forced = process.argv[2];
const action = process.argv[3];

Object.defineProperty(process, "platform", { value: forced, configurable: true });

process.env.HOME = mkdtempSync(join(tmpdir(), "rule-mcp-service-arm-home-"));
process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-service-arm-state-"));

const { actionDisable, actionEnable, actionInstall, actionUninstall } = await import("../_service.js");

const lines = [];
const write = process.stdout.write.bind(process.stdout);

process.stdout.write = (chunk) => {
  lines.push(String(chunk));

  return true;
};

try {
  switch (action) {
    case "install": {
      actionInstall({ dryRun: true });
      break;
    }
    case "uninstall": {
      await actionUninstall({ dryRun: true });
      break;
    }
    case "enable": {
      actionEnable();
      break;
    }
    default: {
      actionDisable();
    }
  }
} finally {
  process.stdout.write = write;
}

write(JSON.stringify({ output: lines.join("") }));
