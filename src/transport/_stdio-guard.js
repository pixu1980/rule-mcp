

/**
 * @module transport/stdio-guard
 *
 * A stdio server exists for exactly one client. When that client is gone, so is
 * the reason to keep running - and nothing in the protocol says so.
 *
 * The SDK's stdio transport listens for `data` and `error` on stdin and nothing
 * else. No `end`, no `close`. That leaves two holes:
 *
 *   1. The `data` listener keeps a ref on stdin, so the event loop never
 *      empties and the process cannot exit on its own after EOF.
 *   2. A client that is killed rather than closed leaves the fd a socket with
 *      no peer. Every read errors, the error reaches an `onerror` that logs and
 *      continues, and libuv immediately polls again - 100% of a core, held by a
 *      process reparented to init, until somebody notices it.
 *
 * The guard closes both, and covers the case where the peer dies without
 * producing either signal: EOF and stream errors end the process, and a poll
 * catches an orphaned parent. The loss path never logs - writing a diagnostic
 * to a broken stderr is what turns a dead pipe into a spin.
 *
 * @see module:server - startServer installs this for the stdio transport
 * @see module:utils/sandbox - the error-storm guard that backs this up
 */

/** Errors that mean the peer is gone rather than that a write failed. */
const FATAL_CODES = new Set(["EPIPE", "ECONNRESET", "EBADF", "ERR_STREAM_DESTROYED", "ENOTCONN"]);

/** How often the parent is checked. */
export const PARENT_POLL_MS = 10_000;

/**
 * Watch the stdio peer and call `onLost` once, as soon as it is gone.
 *
 * @param {{
 *   onLost: (reason: string) => void,
 *   stdin?: NodeJS.ReadStream,
 *   stdout?: NodeJS.WriteStream,
 *   stderr?: NodeJS.WriteStream,
 *   pollMs?: number,
 *   ppid?: () => number
 * }} options
 * @returns {() => void} stop watching
 */
export function installStdioGuard(options) {
  const stdin = options.stdin ?? process.stdin;
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const ppid = options.ppid ?? (() => process.ppid);
  const startingPpid = ppid();

  let lost = false;
  const lose = (reason) => {
    if (lost) {
      return;
    }

    lost = true;
    stop();
    options.onLost(reason);
  };

  const onEnd = () => lose("stdin closed");
  const onStdinError = (error) => lose(`stdin error: ${error?.code ?? error?.message ?? "unknown"}`);
  // A write that fails with one of these has no peer left to write to, so there
  // is nowhere to report it either. Anything else is left alone: a transient
  // write error is not a reason to end a session.
  const onWriteError = (error) => {
    if (FATAL_CODES.has(error?.code)) {
      lose(`stdout/stderr error: ${error.code}`);
    }
  };

  stdin.on("end", onEnd);
  stdin.on("close", onEnd);
  stdin.on("error", onStdinError);
  stdout.on("error", onWriteError);
  stderr.on("error", onWriteError);

  // The backstop, for a peer that dies without closing the fd or erroring on
  // it. A process that was started by init keeps ppid 1 legitimately, so only
  // a CHANGE to 1 counts as being orphaned. Unref'd: this must never be the
  // handle that keeps the process alive.
  let poll = null;

  if (startingPpid > 1) {
    poll = setInterval(() => {
      if (ppid() <= 1) {
        lose("parent process is gone");
      }
    }, options.pollMs ?? PARENT_POLL_MS);
    poll.unref?.();
  }

  function stop() {
    stdin.off("end", onEnd);
    stdin.off("close", onEnd);
    stdin.off("error", onStdinError);
    stdout.off("error", onWriteError);
    stderr.off("error", onWriteError);

    if (poll) {
      clearInterval(poll);
      poll = null;
    }
  }

  return stop;
}
