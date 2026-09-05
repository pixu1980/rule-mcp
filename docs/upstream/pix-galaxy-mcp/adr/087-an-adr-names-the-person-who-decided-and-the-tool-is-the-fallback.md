# 087: An ADR names the person who decided, and the tool is the fallback

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: docs, adr, attribution, tooling
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Every ADR this tool wrote carried Author: rule-mcp, and one carried rule-architect. Both are accurate about which program assembled the file and useless about the decision: the docs-engineer audit raised it as DOC-7 because the question a reader has a year later is who to ask. git already holds the answer, and the commit that adds an ADR names its author.

## Decision

adrAuthor() reads user.name and user.email from git config and returns Name <address>; a name with no address stands alone, and a machine with no identity configured falls back to rule-mcp rather than inventing a person. Both writing paths use it, the CLI and the MCP tool, and the reader is injectable so the fallback is testable without unsetting anyone's git config. The 77 existing ADRs were backfilled from the commit that added each file, which on this repository is one person for all of them; ten of those had no author line at all and got one next to their Tags bullet, matching each file's own punctuation. ADRs 007, 008 and 009 predate the bullet header and already say Deciders: Project owner, so they were left alone.

## Consequences

An ADR now says who to ask, and the address is one that is already in every commit of this repository. The value is captured when the file is written, so an ADR written on a machine with a shared or generic git identity records that identity; nothing re-derives it later. A contributor who writes an ADR through this tool has their name and address committed to the repository, which is the same exposure as authoring the commit and worth knowing before it happens.

## What would end this

ADRs start being written by people whose git identity is not the identity they want in a document, or the repository gains contributors whose address should not be published, and the field has to become a name without an address.
