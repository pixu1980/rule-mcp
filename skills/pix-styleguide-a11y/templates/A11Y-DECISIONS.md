# A11Y Decisions Log (Pattern Memory)

> **Purpose:** Cross-turn memory of choices between **equally conformant alternatives**. Two implementations can both pass accessibility checks and still diverge (different `role`, focus pattern, announcement wording) — twenty compliant modals, zero coherence. This file prevents that.

## Rules

1. **Record only what is not derivable** from the skill rules or from the code itself. Landmarks, headings, and alt presence are machine-verifiable — they do **NOT** belong here.
2. **Index by pattern, never by screen.** ✅ _"Destructive confirmation modal → `alertdialog`"_ · ❌ _"The dispute modal does X"_.
3. **One line per decision:** pattern → choice → short why.
4. **Read before building:** before generating any interactive component, check this log and reuse the recorded pattern.
5. **Never fork silently:** if a new requirement contradicts a recorded decision, ask the user — do not create a parallel variant.
6. **Stay lean:** tens of lines, not hundreds. If it grows past ~40 entries, consolidate.
7. **Versioned, never gitignored:** this is _shared_ memory — across turns, agents and developers.

## Decisions

<!-- Append entries below. Format: - **Pattern** → choice — why. (date) -->

- **Destructive confirmation modal** → `role="alertdialog"`, initial focus on the non-destructive button, focus returns to the trigger — interruption semantics per APG. _(example)_
