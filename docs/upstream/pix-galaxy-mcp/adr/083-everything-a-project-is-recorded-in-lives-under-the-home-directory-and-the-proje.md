# 083: Everything a project is recorded in lives under the home directory, and the project layer is gone

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: telemetry, paths, privacy, personas
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

This server wrote a directory into every repository it observed. ADR 069 put it there deliberately - telemetry and flights are facts about a repository, and an export belongs next to the code it benchmarked - and the cost was a rule in somebody else's .gitignore, git hooks in the global hooks directory to re-assert that rule after a checkout or a merge, an init command whose main job was creating both, and a module whose entire purpose was keeping the directory out of commits. Two megabytes of recording in this repository, and the same shape in every other one. A project layer for review personas read roles out of the same directory, which made a persona repository content: ADR 076 answered that with a trust gate, an acceptance recorded per role and version, and a refusal on both plan tools.

## Decision

Nothing is written into a project. A recording lives in ~/.rule-mcp/projects/<slug>/, where the slug is the project's own directory name plus a digest of its absolute path, so the directory is human-readable and two checkouts of one repository are two recordings. The projects root honors RULE_MCP_STATE_DIR, which is what keeps a test suite or a container out of the real home directory. An existing local directory is migrated once per project and then removed: telemetry is appended if a central log already exists, exports and the project id are moved, the .gitignore rule this server wrote is taken out of the file, and the hook block goes with it. Migration runs at CLI startup and from init. The hook module keeps only its removal path, since nothing installs a hook any more. The project overlay layer for roles is removed rather than relocated: relocating it would have made a shared reviewer unshareable, and the alternative chosen was to drop the layer, which takes the trust gate with it - an acceptance existed only for project-layer roles. Roles now come from the embedded catalog and the user's own layer under ~/.rule-mcp/config/roles/.

## Consequences

This supersedes ADR 076 entirely and the part of ADR 069 that put a recording in the project; both now carry the backlink the index gate enforces. Moving a checkout starts a new recording, because the slug is derived from the path - the honest answer, since the recording describes a directory that no longer exists, but a surprise for anyone who renames a folder. A recording is no longer discoverable next to the code it describes: `pix_stats` and `telemetry export` report the current project as before, and finding a recording by hand means reading ~/.rule-mcp/projects/. Every project on the machine now accumulates state in one directory, which nothing prunes: a machine that has visited many repositories keeps a small directory for each. Deleting one project's history is deleting one directory, which is simpler than it was. The first version of this change wrote 24 test projects into the real home directory before the state-directory override was honored, which is why that override now has a test of its own.

## Alternatives Considered

1. Keep the local directory and its ignore rule: it is what ADR 069 decided, and the machinery it needs - a rule, two hooks, a module, an init step - is larger than the feature it protects
1. Relocate the project role layer into the central per-project directory: it would keep the layer and lose its point, since a team can no longer commit a reviewer for the repository to carry
1. Keep the project layer and its trust gate: it was two commits old, and every part of it existed because the server read a checkout, which is the thing this ADR stops doing
1. Key a project's directory on the git remote rather than the path: it survives a move, and it makes two worktrees of one repository share a recording, which is the opposite of what the recording describes
