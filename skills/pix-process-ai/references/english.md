# English

> Absorbed from `rule-styleguide-english` into `rule-process-ai`. The rules it documents are the `ai-*` guardrails this skill owns.

The house language of every file, comment, identifier, prompt and document this
server helps generate is **English**, written in **American spelling** — even
when the user writes their request in another language (the request stays as
they wrote it; the generated artifact is English). `rule_tool_check` enforces
this on every skill with two guardrails you cannot switch off:

- `fp-american-english` — British → US spellings in prose, comments and
  string literals (the `-our` / `-ise` / `-re` / `-ogue` families).
- `en-english-only-prose` — non-English prose in comments, identifiers and
  whole `.md` documents.

## Rules

1. **Comments, identifiers, commit messages, prompts and documentation are
   English.** If the user prompts in Italian, German, French or Spanish, the
   conversation can stay in their language, but what is written into the repo
   is English.
2. **American spelling.** `-ize` over `-ise`, `-or` over `-our`, `-er` over
   `-re`, `-og` over `-ogue`; US single-l patterns (`traveled`, `modeled`,
   `labeled`, `canceled`).
3. **ASCII punctuation.** No em/en dashes, no curly quotes, no ellipsis glyph
   (enforced separately by `fp-no-emdash` / `fp-no-typographic-chars`).
4. **Non-English content belongs in data files, not prose.** A user-facing
   i18n string or a translated message is data: keep it in a message table or
   resource file, never in a comment or identifier.
5. **Proper nouns and API identifiers are exempt.** A third-party API name or
   a product name keeps its own spelling; flag it in a code span if the
   spell-check may trip on it.

## Canonical UK→US pairs (exactly what `fp-american-english` checks)

- colour → color
- behaviour → behavior
- neighbour → neighbor
- internationalised → internationalized
- normalise → normalize
- organise → organize
- analyse → analyze
- centre → center
- defence → defense
- fulfil → fulfill
- licence → license
- labelled → labeled
- travelled → traveled
- cancelled → canceled
- grey → gray

The full stem families (`-our`, `-ise`, `-re`, `-ogue`) live in
`src/core/fingerprint.js` — the same dictionary that powers the guardrail, so
what this skill documents and what the gate blocks cannot drift.

## What to do on failure

When `rule_tool_check` reports `en-english-only-prose` or
`fp-american-english`:

1. Translate the offending comment/identifier/document to English.
2. Apply the US spelling from the table above (or the fingerprint dictionary).
3. Re-run `rule_tool_check` until `allPass: true`; if the text is a legitimate
   translated string for users, move it into the i18n data, out of the
   comment/identifier, and re-check.

## See also

- [rule-styleguide-markdown](../../rule-styleguide-markdown/SKILL.md) - Markdown style and tone
- [rule-styleguide-i18n](../../rule-styleguide-i18n/SKILL.md) - where translated strings belong
- [rule](../rule/SKILL.md) - Central skill index
