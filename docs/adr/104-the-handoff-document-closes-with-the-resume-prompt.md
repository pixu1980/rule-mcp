# 104: The handoff document closes with the resume prompt

- **Date**: 2026-09-17
- **Status**: accepted
- **Tags**: handoff, handon, prompts, docs
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The paste-ready block the handoff flow produces lived in the chat only. The document at `docs/handoff/<NN>-<slug>.md` carried the narrative and the commit-scope reminder, but nothing in it was written to be handed to the next session, so a session that ended before its reader copied the block left only prose behind. `handon` could derive a first move from what it verified, but never the exact words the handoff author meant to send.

## Decision

Every handoff document ends with a `Resume Prompt` section holding a fenced `prompt` block: the message the next session opens with. `footerLines` renders the base block - the resumption instruction naming `rule_tool_process_handon`, and the commit-scope convention - and whoever persists the file adds the path of the document and the first step of the next session inside the fence, leaving nothing after it. `handon` reads the block back and reports it verbatim as `## Prompt to run next`, with directives neutralized, so the prompt travels with the file instead of living only in a chat. Fenced blocks stop counting as open items, so the steps a quoted prompt spells out are not read as the previous session's leftovers.

## Consequences

The block is the same bytes in the file and in the chat, so the two cannot drift. A resume pastes a prompt the previous session actually wrote, and the minimal format, which is a one-line paste rather than a document, drops the section to stay one line. Cost: the block is agent-authored text that `handon` quotes back, which is why it is neutralized on the way out; and the tool ships a base block whose two most useful facts are still filled in by hand, so a run that skips that step falls back to the derived first move.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the paste-ready block in the chat and let `handon` compose the prompt entirely from its verified first move
1. Add a second file next to the handoff holding only the prompt
1. Have the handoff tool take the handoff number and the next step as inputs so the block is never authored by the agent
