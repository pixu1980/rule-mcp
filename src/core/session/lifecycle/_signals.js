

/** Signal handlers: install and reset, under an unref'd deadline. */
import { runShutdown } from "./_cleanups.js";
import { isShuttingDown } from "./_state.js";

/** How long the cleanups get before the exit happens anyway. */
export const SHUTDOWN_DEADLINE_MS = 3000;

/** Signal -> exit code, the shell convention (128 + signal number). */
const SIGNAL_EXIT_CODES = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 };

/** Signal listeners installed by installSignalHandlers(), for resetLifecycle(). */
let _installed = [];

/**
 * Install the signal handlers. Idempotent per target.
 *
 * @param {{
 *   target?: NodeJS.EventEmitter,
 *   exit?: (code: number) => void,
 *   deadlineMs?: number,
 *   signals?: string[]
 * }} [options] - target and exit are injected by the tests
 * @returns {void}
 */
export function installSignalHandlers(options = {}) {
  const target = options.target ?? process;
  const exit = options.exit ?? ((code) => process.exit(code));
  const deadlineMs = options.deadlineMs ?? SHUTDOWN_DEADLINE_MS;
  const signals = options.signals ?? Object.keys(SIGNAL_EXIT_CODES);

  for (const signal of signals) {
    const handler = () => {
      const code = SIGNAL_EXIT_CODES[signal] ?? 1;
      // Second signal: the operator asked twice, so stop trying to be tidy.
      if (isShuttingDown()) {
        exit(code);

        return;
      }
      // The deadline is unref'd: it exists to bound a hanging cleanup, not to
      // keep an otherwise-finished process alive waiting for its own timer.
      const deadline = setTimeout(() => exit(code), deadlineMs);
      deadline.unref?.();
      const finish = () => {
        clearTimeout(deadline);
        exit(code);
      };
      runShutdown(signal).then(finish).catch(finish);
    };

    target.on(signal, handler);
    _installed.push({ target, signal, handler });
  }
}

/** Forget every installed listener (tests and re-init). */
export function clearInstalled() {
  for (const { target, signal, handler } of _installed) {
    target.off(signal, handler);
  }

  _installed = [];
}
