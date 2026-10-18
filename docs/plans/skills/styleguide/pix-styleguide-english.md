# rule-styleguide-english - best-practice implementation plan

Status: plan only. Each skill waits for the owner before implementation.
Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`.
Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, twenty-third skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-english/SKILL.md` (83 lines): the English policy, the
  UK to US table, what to do on failure, and the two guardrails.
- `skills/rule-styleguide-english/guardrails/`: `en-english-only-prose` and
  `en-english-only-filenames`.
- `src/core/text/en-english/_scan.js`: the three scanners and their rules.
- `src/core/text/_en-english.data.js` and `src/core/text/fingerprint/`: the
  foreign-word dictionaries and the British scanner.

The scanners were run against real input, and the output is the evidence below.

Public sources verified in this session:

- ISO 24495-1, plain language, https://www.iso.org/standard/78907.html
- ASD-STE100, Simplified Technical English, https://www.asd-ste100.org/
- Microsoft Writing Style Guide, https://learn.microsoft.com/en-us/style-guide/welcome/
- Google developer documentation style guide, https://developers.google.com/style
- WCAG 3.1.5 Reading Level, https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html
- ISO 639, language codes, https://www.iso.org/iso-639-language-codes.html

Problems found, reproduced by execution:

| Problem                          | Repro                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| accents over-fire                | `// The café serves naïve résumés` fails, and so does `src/café-menu.js`; a loanword or a proper noun is not foreign prose |
| the spelling table is duplicated | this skill and `rule-styleguide-fingerprint` both carry the UK to US pairs                                                  |
| the table is not the data        | the skill lists pairs while `fp-american-english` reads a data file, so the two can drift                                  |
| no plain-language guidance       | nothing about sentence length, voice or terminology                                                                        |
| no standards are cited           | plain language and the style guides are never named                                                                        |

Local articles: no dedicated piece on technical writing or style guides exists
in the local article corpus; the writing-adjacent matches are
incidental.

## Decisions

| Question       | Decision                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Scope          | Policy and exceptions, accent precision, the spelling move, filenames, plain language, standards                |
| Spelling       | **Moves here**: the map, the rule and the scanner become this skill's                                           |
| Rule id        | `fp-american-english` becomes `en-american-english`                                                             |
| Fingerprint    | Keeps typography, the box rule and its new security and structure rules                                         |
| Accents        | A loanword and proper-noun allowlist, plus the foreign-word signal                                              |
| Standards      | ISO 24495-1, ASD-STE100, Microsoft, Google, WCAG 3.1.5, ISO 639                                                 |
| Plain language | Sentence and paragraph length, active voice, consistent terminology, no contractions in docs, numbers and dates |
| Exceptions     | i18n data, third-party API names, user quotes, brands, loanwords                                                |
| New guardrails | `en-american-english`, `en-plain-sentence-length`, `en-terminology-consistency`, `en-identifier-english`        |
| Severity       | The existing rules stay blocking; the new three are advisory                                                    |
| Verification   | A false-positive matrix, the corpus, four-language fixtures, path tests                                         |
| Delivery       | Plan only now                                                                                                   |

### The spelling move, and what it touches

1. The British to American data, the scanner and the rule move from
   `rule-styleguide-fingerprint` to this skill, and the rule is renamed
   `en-american-english`.
2. The fingerprint plan is the other side of this decision: its Workstream B,
   the spelling families it adds (medical, `-lled`, single words), belongs to
   this skill now. When either plan is implemented, both are updated together.
3. The English skill's own UK to US table is deleted: after the move the table
   and the data are the same thing, in one place.

## Workstream A - The policy

1. Every artifact this server helps produce is English: comments, identifiers,
   documentation, prompts, commit messages, generated files.
2. The request keeps the language the user wrote it in; the artifact does not.
3. File and folder names are English, including the files that carry translated
   strings.

## Workstream B - Exceptions

The list becomes explicit, because "always English" without it invites both
false positives and false confidence:

1. Translated user-facing strings live in i18n data files.
2. A third-party API or library keeps its own spelling (`getColour()`).
3. A quotation and the user's own words stay as written.
4. Proper nouns and brands keep their diacritics (`Zürich`, `São Paulo`).
5. A loanword that English has adopted is English (`café`, `naïve`, `résumé`,
   `façade`, `piñata`).

## Workstream C - Accent precision

1. The accent check consults an allowlist of adopted loanwords and proper
   nouns before it fails.
2. A single accent is no longer enough on its own when the surrounding words are
   English; the foreign-function-word signal carries the decision.
3. A path segment with an accent fails only when it is not an allowed loanword
   or brand; `café-menu.js` passes, `tabella-utenti.js` and `funzioni.js` still
   fail.

## Workstream D - Plain language

1. Sentence length has a threshold, stated and measurable.
2. Active voice and second person are the default for guides.
3. One concept, one word: a short internal glossary keeps terminology stable.
4. Contractions are avoided in documentation for consistency, not correctness.
5. Numbers, dates and units follow the American convention the fingerprint
   rules already assume.

## Workstream E - Standards

Each section cites its source: ISO 24495-1 for the plain-language principles,
ASD-STE100 for sentence and vocabulary control, the Microsoft and Google guides
for terminology and voice, WCAG 3.1.5 for the accessibility boundary, and
ISO 639 for the language codes the scanner implies.

## Proposed guardrails

| Rule id                      | Rejects                                            | Tier        | Source            |
| ---------------------------- | -------------------------------------------------- | ----------- | ----------------- |
| `en-american-english`        | a British spelling (moved from fingerprint)        | A, blocking | This skill        |
| `en-english-only-prose`      | non-English comments and documents (existing)      | A, blocking | This skill        |
| `en-english-only-filenames`  | a non-English file or folder name (existing)       | A, blocking | This skill        |
| `en-identifier-english`      | a non-English identifier beyond the function words | B           | This skill        |
| `en-plain-sentence-length`   | a sentence past the threshold                      | B           | ISO 24495-1       |
| `en-terminology-consistency` | a term that contradicts the project glossary       | B           | Microsoft; Google |

## Verification

1. A false-positive matrix: loanwords, proper nouns, brands and a third-party
   API name all pass.
2. Four-language fixtures (German, French, Spanish, Italian) that must keep
   failing.
3. Path tests: `user-table.js` and `cafe-menu.js` pass; `tabella-utenti.js`
   fails.
4. A `good` and a `bad` snippet per rule in the corpus, including the renamed
   `en-american-english`.

## Phases

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the scanners and the duplicated table.
- [x] Reproduce the accent false positives.
- [x] Verify the standards.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - The spelling move

- [ ] Move the British data, the scanner and the rule here; rename the rule to
      `en-american-english`.
- [ ] Delete the duplicated table from this skill.
- [ ] Update the corpus, the fingerprint frontmatter and the fingerprint plan's
      spelling workstream together.

### Phase 2 - Content

- [ ] Write the policy, the exceptions and the accent rules.
- [ ] Add the plain-language section with its sources.
- [ ] Cite the standards per section.

### Phase 3 - Guardrails

- [ ] Add the loanword and proper-noun allowlist to the data.
- [ ] Add the identifier, sentence-length and terminology rules.
- [ ] Add the false-positive matrix and the language fixtures.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.
- [ ] Write the ADR for the spelling ownership move, since it changes which
      skill owns a baseline rule.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test src/core/text/en-english/__tests__/_scan.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The move is a breaking change to the guardrail id `fp-american-english`; the
  corpus and the fingerprint frontmatter must land in the same commit as the
  rename, or the gate fails.
- The fingerprint plan already committed needs a complementary update when the
  work is implemented; this plan records the dependency rather than editing the
  other document silently.
- No local article is cited; the plain-language standards and the style guides
  are the sources.
