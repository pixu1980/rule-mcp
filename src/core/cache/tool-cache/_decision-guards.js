

/** The deterministic guards a model pick can never override. */

/** The hard guards: arguments, echo, freshness and a cached error. */
export function guardCandidate(candidate, live = {}) {
  if (!candidate) {
    return "missing-candidate";
  }

  if (candidate.argsKey !== live.argsKey) {
    return "args-mismatch";
  }

  if (candidate.echo) {
    return "echo";
  }

  if (!candidate.fresh) {
    return "stale";
  }

  if (candidate.isError) {
    return "error";
  }

  return null;
}

/**
 * The taxonomy guard: a hub result (`rule-frontend`) is ambiguous when the same
 * candidate set also carries a leaf (`rule-frontend-vue`). The live router may
 * route an equivalent request to either, so the safe choice is to compute.
 *
 * A leaf pick stays valid even when the hub is present: the specific result is
 * the safer replay.
 *
 * @param {{ route?: string } | null} candidate
 * @param {Array<{ route?: string }>} candidates
 * @returns {string | null}
 */
export function guardAmbiguity(candidate, candidates = []) {
  const route = candidate?.route;

  if (!route) {
    return null;
  }

  const prefix = `${route}-`;

  return candidates.some((other) => other !== candidate && typeof other.route === "string" && other.route.startsWith(prefix))
    ? "ambiguous-hub"
    : null;
}
