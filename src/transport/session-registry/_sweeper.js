

/** The sweep timer: unref'd housekeeping that is never the reason a process stays alive. */
export function startSweeper(registry, intervalMs) {
  registry._sweeper ??= setInterval(() => {
    void registry.reap().catch(() => {});
  }, intervalMs);

  registry._sweeper.unref?.();

  return registry._sweeper;
}

export function stopSweeper(registry) {
  if (!registry._sweeper) {
    return;
  }

  clearInterval(registry._sweeper);
  registry._sweeper = null;
}
