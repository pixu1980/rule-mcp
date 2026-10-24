/** Tracked child processes, so they die with this one. */
/** @type {Set<import("node:child_process").ChildProcess>} */
const _children = new Set();

/**
 * Track a child process so it dies with this one.
 *
 * Only for children this process owns. A deliberately detached child (the
 * daemon, a fire-and-forget indexer) is not tracked: outliving the parent is
 * the whole point of detaching it.
 *
 * @param {import("node:child_process").ChildProcess} child
 */
export function trackChild(child) {
  if (!child?.pid) {
    return;
  }

  _children.add(child);
  child.once("exit", () => _children.delete(child));
}

/** @returns {number} How many children are being tracked. */
export function trackedChildCount() {
  return _children.size;
}

/**
 * Signal every tracked child, then forget it.
 *
 * @param {NodeJS.Signals} [signal]
 * @returns {number} How many children were signaled
 */
export function killTrackedChildren(signal = "SIGTERM") {
  let killed = 0;

  for (const child of _children) {
    try {
      child.kill(signal);
      killed++;
    } catch {
      /* already gone */
    }
  }

  _children.clear();

  return killed;
}

/** Forget every tracked child (tests and re-init). */
export function resetChildren() {
  _children.clear();
}
