# 037: Port five skills from a sibling corpus, merging rather than replacing on collision

- **Date**: 2026-08-06
- **Status**: accepted
- **Tags**: skills, taxonomy, porting, backend, platform, process, styleguide
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Five skills from a sibling skill corpus - a rebranded fork of this server,
maintained separately - were brought into this repository: its backend-workers,
frontend-workers, platform-desktop, process-npm-release, and styleguide-readme
skills.

Three landed on empty ground. Two collided:

- **frontend-workers vs `rule-frontend-workers`** (ADR 036, committed hours
  earlier). Different documents about the same subject. The local one is
  organized around diagnosis, a runnable pool, and measurement; the incoming one
  around the API surface, with material the local one lacked - `importScripts`,
  inline blob workers, a complete `SharedWorker` pattern, and the
  available/absent worker API lists.
- **platform-desktop vs `rule-platform-desktop`**. Same skeleton, same
  section order, but the incoming version is a strict superset: Electron Forge
  vs electron-builder, platform target reference, the signing-to-auto-update
  dependency chain, the 2024 Windows SmartScreen situation, distribution
  channels, a complete GitHub Actions release workflow, plus a performance
  review kit in `checklists/`, `knowledge/`, `prompts/`, and `templates/`.

A blind copy would have destroyed the frontend-workers skill and silently
dropped whatever the local desktop skill said that the incoming one did not.

## Decision

**Port by merging into the local skill, never by overwriting it.** The two
collisions were resolved differently because the evidence differed:

- `rule-frontend-workers` keeps its structure and absorbs the four things
  the incoming version covered and it did not. Where both covered a topic, the
  local text wins - it is the newer research pass and is calibrated against
  the current browser-support picture (`scheduler.yield()` in Firefox 142,
  Safari having neither `yield()` nor `postTask()`).
- `rule-platform-desktop` is replaced wholesale, because a section-by-section
  read established the incoming version as a superset. The four supporting
  directories are indexed from a new "Performance review resources" table, so
  the extra files are reachable rather than dead weight in the tree.

Three mechanical rules applied to every ported file:

1. **Token rename.** Every occurrence of the source brand - the package name,
   the resource URI scheme, the tool prefix, the skill-directory prefix, and the
   bare brand word - is rewritten to the rule equivalent, longest match
   first so the package name is not shredded by the shorter rules. Em dashes
   were normalized to hyphens to match where the corpus is heading. A rename
   sweep leaves dangling references behind: one supporting file pointed at an
   Electron skill whose renamed name, `rule-electron`, does not exist here,
   and had to be repointed at `rule-platform-desktop` by hand. **Grep the
   ported tree for skill names that the rename invented.**
2. **Corpus contract**: `test/skills-docs.test.mjs` requires the frontmatter
   `name` to equal the directory, a non-empty `tags` list, `frameworks`, and a
   `## See also` section whose relative links resolve. The readme styleguide
   arrived with a pluralised name that no longer matched its directory. Two of
   the five had no See also at all.
3. **House conventions over source fidelity.** `rule-backend-workers`
   arrived in CommonJS; every other backend skill in this corpus is ESM, so the
   examples were converted, `os.cpus()` became `availableParallelism()` (it
   honors cgroup limits, which matters for pool sizing in a container), and
   `path.resolve(__dirname, …)` became `new URL(…, import.meta.url)`.

## Consequences

**Positive**

- Routing verified in-process for all five: "node worker_threads piscina pool
  for a cpu-bound express route" and "my node event loop is blocked" reach
  `rule-backend-workers`; "publish my npm package securely with trusted
  publishing" reaches `rule-process-npm-release`; "write a good README for my
  open source library" reaches `rule-styleguide-readme`; both an Electron
  performance prompt and a signing prompt reach `rule-platform-desktop`.
- The worker story is now complete on both sides of the wire, with
  `rule-frontend-workers` and `rule-backend-workers` cross-linked. The
  Node-vs-browser distinction is stated in both, since conflating them is the
  common failure.
- The corpus goes from 80 to 83 skills, 89 to 92 tools.

**Negative**

- Two corpora now hold near-identical content that can drift. Nothing here
  keeps them in sync; the next port has to diff rather than copy.

**Neutral**

- `rule-process-npm-release` prescribes `npm` commands in a repository whose
  standing rule is pnpm-only. That is not a conflict: the rule governs how this
  project installs dependencies, while the skill documents publishing to the npm
  registry, where `npm stage publish` is the command that exists. The pnpm,
  yarn, and bun equivalents are covered where they exist.
