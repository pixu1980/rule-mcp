

/** The daemon reporting arms: status and logs. */
import { existsSync, readFileSync } from "node:fs";
import { formatDaemonStatus } from "../../daemon/index.js";
import { print } from "../_shared.js";

/** Print the daemon status block. */
export function actionStatus() {
  print(formatDaemonStatus());
}

/** Print the daemon log, or say there is none yet. */
export function actionLogs(logFile) {
  if (!existsSync(logFile)) {
    print("No logs yet");

    return;
  }

  print(readFileSync(logFile, "utf8"));
}
