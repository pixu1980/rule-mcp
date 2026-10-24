# 173: Drop the DCO sign-off requirement

- **Date**: 2026-10-24
- **Status**: accepted
- **Tags**: governance, ci, process
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Every commit carried a `Signed-off-by` trailer under the Developer Certificate of Origin. The rule lived in `.githooks/commit-msg`, in the `dco` CI job, in `tests/docs/dco.test.mjs` and in the `CONTRIBUTING.md` paragraph. On a single-maintainer repository the trailer certifies a provenance the MIT license already covers (`inbound = outbound`), while every contributor pays a rejection and a `git commit -s` for it. The owner asked for the gate to be removed.

## Decision

Remove the requirement, not just the check: the commit-msg hook validates the conventional subject only, the `dco` CI job and its test are deleted, and `CONTRIBUTING.md` states that there is no CLA and no DCO sign-off requirement. The licensing sentence stays: inbound contributions are MIT, matching `LICENSE` and `REUSE.toml`.

## Consequences

A contributor no longer adds a trailer or installs `git commit -s`. Existing trailers stay in history and remain valid provenance records; nothing is rewritten. The repository loses the per-commit certification, so a future contribution dispute rests on the license and the git history alone.

## What would end this

A multi-maintainer model that needs per-commit provenance, or a downstream consumer that requires a DCO trail, would bring the trailer back as a policy decision rather than a hook default.

## Alternatives Considered

1. Keep the DCO and exempt the maintainer (the exception would be invisible to contributors and unenforced)
1. Replace it with a CLA (a heavier requirement, against the inbound-equals-outbound policy)
1. Keep the hook and drop only the CI job (local commits would still be rejected)
