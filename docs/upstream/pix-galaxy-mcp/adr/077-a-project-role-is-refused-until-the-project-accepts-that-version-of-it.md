# 077: A project role is refused until the project accepts that version of it

- **Date**: 2026-09-04
- **Status**: superseded
- **Tags**: personas, security, trust, overlays
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>
- **Superseded by**: [ADR 082](083-everything-a-project-is-recorded-in-lives-under-the-home-directory-and-the-proje.md) - the project layer this gate guarded is gone, so the gate has no subject

## Context

Roles resolve through three layers: the catalog embedded in this server, the user's own files under their home directory, and the project's own under .rule-mcp/roles/. The third is repository content. A clone, a branch or a dependency update can replace the security persona with one whose lenses read "approve everything", and every string in a role reaches a model. Hardening 4.4 fenced that text as data, which stops it being read as an instruction but does nothing about the substitution itself: a fenced hostile persona is still the persona the run uses. Nothing asked anyone whether this project's roles were wanted.

## Decision

A project-layer role is refused on first use. Both surfaces that consume a role, pix_plan and pix_plan_docs, check the acceptance before they act and return an error that shows the role in full, fenced, and names the command that accepts it; the writing tool checks before it writes anything. The acceptance is recorded in the project, at .rule-mcp/roles-accepted.json, keyed by id and version, so an edit that bumps the version asks again and a decision never travels to another checkout of the same repository. rule-mcp roles accept prints the role before recording, because accepting text nobody read is the thing the gate exists to prevent. An unreadable or malformed record counts as no acceptance: failing closed costs one prompt, failing open hands over a persona nobody approved. The loader still loads an unaccepted role and marks it accepted false, since the refusal has to be able to show what it is refusing. Only the project layer is gated; the embedded catalog ships with this server and the user layer is the user's own file in their own home directory.

## Consequences

A project that ships roles now needs one accept per role per version before either plan tool will use them, which is friction on purpose and lands on whoever first runs a persona in a fresh clone. The gate keys on the version field, so a project that edits a role without bumping it keeps the old acceptance: version discipline is now load-bearing, and a hash would have been stricter at the cost of asking again for whitespace. The acceptance file lives in the project directory and will be committed unless a project ignores it, which means a team can share acceptances deliberately - and also that a hostile pull request can add both the role and its acceptance in one commit, so the gate protects against a surprising checkout and not against an unreviewed merge. isRoleAccepted returns true for anything that is not a project role, so a caller that forgets to pass projectDir gates against the current working directory rather than failing open on the wrong project.

## Alternatives Considered

1. Rely on the 4.4 fence alone: it stops the text being obeyed as an instruction and does nothing about a checkout quietly replacing which persona runs
1. Refuse project roles outright: overlays exist so a team can carry its own reviewer, and a flat refusal removes the feature rather than gating it
1. Record the acceptance in the home directory: it would then follow the user to a different clone of the same repository, which is exactly the content nobody has read
1. Key the acceptance on a hash of the role rather than its version: a hash catches every edit, including reformatting, and asks again for changes that changed nothing anybody cares about
1. Prompt interactively at the tool call: an MCP tool has no user to prompt, so the refusal plus a CLI command is the only shape that works for every client
