/** @module cli/guard/run - stdin payload handling and the guard entrypoint */

import { ALLOW, ask, decide } from "./_decide.js";
import { inject } from "./_inject.js";
import { stagedFailures } from "./_staged.js";

/** @param {NodeJS.ReadStream} stream @returns {Promise<string>} */
export function readStdin(stream) {
  return new Promise((resolve) => {
    let data = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      data += chunk;
    });
    stream.on("end", () => resolve(data));
    stream.on("error", () => resolve(""));
  });
}

/**
 * The hook payload, or `{}` when there is none to read.
 *
 * A TTY is not a pipe: reading one waits for a keystroke that never arrives and
 * stalls the session for the whole hook timeout. Anything unparseable is also
 * `{}`, because a session that starts without its directive is worse than a
 * session that starts without its handoff.
 *
 * @param {NodeJS.ReadStream} stream
 * @returns {Promise<object>}
 */
async function readPayload(stream) {
  if (stream?.isTTY) {
    return {};
  }

  try {
    return JSON.parse(await readStdin(stream)) ?? {};
  } catch {
    return {};
  }
}

/**
 * Hook entry point. Always exits 0 and answers with JSON: a guard that crashes
 * must not become a guard that blocks every command.
 *
 * @param {"bash"|"migration"|"commit"|"session-start"|"prompt-submit"} kind
 * @param {{ stdin?: NodeJS.ReadStream, write?: (text: string) => void }} [io]
 */
export async function runGuard(kind = "bash", io = {}) {
  const { stdin = process.stdin, write = (text) => process.stdout.write(text) } = io;

  if (kind === "session-start") {
    write(JSON.stringify(inject(kind, await readPayload(stdin))));

    return;
  }

  if (kind === "prompt-submit") {
    write(JSON.stringify(inject(kind)));

    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readStdin(stdin));
  } catch {
    write(JSON.stringify(ALLOW));

    return;
  }

  const command = payload?.tool_input?.command ?? "";

  try {
    write(JSON.stringify(decide(command, kind, stagedFailures)));
  } catch {
    write(JSON.stringify(ALLOW));
  }
}
