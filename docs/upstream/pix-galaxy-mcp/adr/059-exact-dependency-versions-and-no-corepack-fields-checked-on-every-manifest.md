# 059: Exact dependency versions and no corepack fields, checked on every manifest

- **Date**: 2026-08-31
- **Status**: accepted
- **Tags**: guardrails, pnpm, dependencies, reproducibility, toolchain
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Two rules that had lived only in a user's global instructions, where nothing enforced them and every generated `package.json` was free to ignore them.

A caret does not pin what it names, and more importantly it does not pin what that depends on. `"prettier": "^3.9.4"` resolves a different subdependency tree on Tuesday than it did on Monday, so a build that breaks breaks on one machine, and the diff that would explain it is in nobody's repository. The lockfile pins the tree for whoever has the lockfile, and the range undoes that the moment anyone runs `pnpm up`, adds a package, or resolves a merge conflict in the lock.

`packageManager` and `devEngines.packageManager` activate corepack, which then gets a vote on whether the install runs at all: a download on a machine that is offline, a signature check behind a proxy that rewrites it, a shim shadowing the pnpm already on the PATH. What the fields buy is an assertion about a version, and `.nvmrc` plus a lockfile already provide it without a component in the middle that can refuse.

The audit found the rules were not being followed here either: six of this repository's nine devDependencies carried carets, plus a skill fixture and a skill installer script.

## Decision

Two shared guardrails, `pkg-exact-versions` and `pkg-no-corepack`, in `MANIFEST_GUARDRAILS` and spread into `SHARED_GUARDRAILS` so they run for every skill.

Gated on the file, not on the skill: the check parses `code` only when `fileName` ends in `package.json`, at any depth, so a workspace member is checked and a JavaScript file that happens to contain the string `^3.9.4` is not. Unparseable JSON is skipped rather than reported, because a guardrail that cannot read a file has nothing to say about its contents.

`pkg-exact-versions` covers `dependencies`, `devDependencies` and `optionalDependencies`. What counts as pinned is a version with no room to resolve a different one, plus the specifiers that name a source rather than a range: `workspace:`, `catalog:`, `file:`, `link:`, `portal:`, a git or https URL. An `npm:` alias still installs a version, so the version after the alias has to be exact too. Ranges, comparators, alternations, wildcards, x-ranges and dist-tags all fail, and the failure names each offending entry.

`peerDependencies` are deliberately exempt. A peer range states which versions a library is compatible with and installs nothing; pinning it would be a false claim that only one version works.

`pkg-no-corepack` is one guardrail covering both spellings, because the reason is single and so is the fix - delete the field - with the detail naming which one was found. `engines` stays legal: it asserts a Node version and fetches nothing.

The repository was brought into line with its own rule: six devDependencies pinned to the versions currently installed rather than to the newest ones, `pnpm-lock.yaml` regenerated, plus two skill manifests that pinned with carets. Both rules are documented in `rule-toolchain-pnpm` with the reason, since a guardrail whose skill does not explain it gets worked around.

## Consequences

`test/manifest-guardrails.test.mjs` covers the range vocabulary, the specifiers that are not ranges, the peer exemption, both corepack spellings, and the file gate. Its last case is the one that keeps this honest: every `package.json` tracked in this repository is run through both rules, so a caret cannot come back through a commit here without failing CI.

Two corpus prompts were added and both route to `rule-toolchain-pnpm`; the corpus is at 56 of 64 exact and 100% top-or-alternative, up from 54 of 62.

The README's shared-guardrail table said 16 rules and listed 22 rows, having missed the `fp-*` and `ts-*` families entirely. It now lists all 26 and says 26.

What this does not do is stop the range from being written in the first place. `save-exact=true` in `.npmrc` is the mechanism for that, and it is documented in the skill but not enforced: adding it to the scaffold checks would be a new required file, which is a scope decision rather than part of this rule. Left as a proposal.

Also unenforced by design: a range that arrives through a transitive dependency's own manifest. This is a rule about manifests written here, not about the ecosystem, and the lockfile is what covers the rest.

## Alternatives Considered

1. Enforce exact versions on peerDependencies too. Rejected: a peer range is a compatibility statement, not an install, and pinning it makes a library falsely claim a single supported version.
1. Two separate guardrails for `packageManager` and `devEngines.packageManager`. Rejected: one reason, one fix, and two failures for the same mistake reads as two problems.
1. Put the rules in the scaffold guardrails, which already check config files. Rejected: those only run in `mode=scaffold`, so a manifest edited later would never be checked. The rule is mandatory, so it belongs with the shared rules.
1. Detect a manifest by content (a `dependencies` key) instead of by filename. Rejected: a JavaScript module or a documentation snippet describing a manifest would be checked as one, and the fix for a false positive is to rewrite prose.
1. Also require `.npmrc` with `save-exact=true`. Deferred: it adds a required file to every project, which is a broader decision than pinning what is already written. Documented in the skill and proposed rather than enforced.
