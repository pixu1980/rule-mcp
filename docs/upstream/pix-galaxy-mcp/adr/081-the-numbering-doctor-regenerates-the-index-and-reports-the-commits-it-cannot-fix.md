# 081: The numbering doctor regenerates the index and reports the commits it cannot fix

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: docs, adr, git, tooling
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

handoff doctor repaired a duplicate number by renaming the file, fixing its header and rewriting references inside markdown. Two things it left behind. The ADR index is generated from the ADR files (ADR 051) and was being treated as just another markdown file to patch: rewriting the link in place leaves the renumbered row wherever the previous number sorted, so an index whose tables run newest first stops running newest first. And a commit message that names a moved document keeps naming it: after the move, git history points at a number that now belongs to a different decision, which is the record of why a change happened disagreeing with the record of what changed. Both were raised while using the command.

## Decision

applyRenumber regenerates docs/adr/ADR.md when an ADR moved and, on its own, when the index is out of order - a repository with no duplicate numbers can still have an index whose rows climb where the generator descends, which is what appending by hand produces and what a reader notices. Ordering is the condition rather than byte-equality with the generator, so a hand-edited summary is not treated as damage. --fix owns both repairs, and the report refuses to call a tree clean while its index disagrees with its files. It regenerates from the files on disk whenever an ADR moved, using the same listExistingAdrs and buildAdrIndex the ADR tool uses, and reports indexRegenerated so the caller can say so. Every table comes back newest first because the generator sorts, which is now asserted per table rather than assumed. Commit messages are reported by default and never rewritten by --fix: staleCommitReferences splits them into references that name the moved path, which are certainly stale, and references that name only a number, which are not knowable - two documents held that number, which is why the repair exists, so a rewrite would have to guess which one the message meant. An opt-in --fix-commits amends only the certain ones, only when every affected commit is unpublished, and refuses with the reason when any of them is already on the upstream. The rewrite runs before the files move, because a message names the path a document has at that point.

## Consequences

--fix now touches docs/adr/ADR.md on every ADR renumber, so a repair that used to change one file plus references changes the index as well, and a reviewer sees a regenerated index in the diff. --fix-commits uses git filter-branch over the unpublished range, which rewrites the shas of those commits: anything holding them, a local branch or a stashed reference, has to be updated by hand, and this is why it is opt-in and refuses on published history. Messages naming only a number stay stale forever unless a human amends them; the document headers and the regenerated index are what carry the truth in the meantime. staleCommitReferences scans the unpublished range by default and the whole history only when deciding whether to refuse, so the report stays fast on a long history.

## Alternatives Considered

1. Keep patching the index links: cheaper, and it leaves the tables in an order that describes the arrangement before the repair
1. Rewrite commit messages inside --fix: fewest steps, but a numbering repair would silently change shas somebody may already have
1. Rewrite the ambiguous number-only references too, choosing the document that kept the number: it is a guess dressed as a repair, and wrong half the time by construction
1. Refuse to renumber at all while a commit message references the document: the collision is already in the tree and refusing to fix it helps nobody
