# rule-styleguide-fingerprint - best-practice implementation plan

Status: plan only. Each skill waits for the owner before implementation.
Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`.
Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, twenty-first skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-fingerprint/SKILL.md`: banned characters, the British
  to American table, the box rule, the phrasing tells and the enforcement note.
- `skills/rule-styleguide-fingerprint/guardrails/`: `fp-no-emdash`,
  `fp-no-typographic-chars`, `fp-american-english`, `fp-box-rectangular`.
- `src/core/text/fingerprint/_scan.js` and `_patterns.js`: the scanner, the
  regexes built from the dictionaries, and the prose boundary that blanks code
  fences, inline spans and URLs.
- `src/core/text/_fingerprint.data.js`: the character maps, the stem lists and
  the word map.
- `src/core/text/ascii-box/`: the padding pass.

The transformer was run against the real module, and the output is the
evidence for the bugs below.

Problems found, reproduced by execution:

| Problem                        | Repro                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `-ogue` over-corrects          | `epilogue prologue monologue travelogue` -> `epilog prolog monolog travelog`; American English keeps `-logue` for all four                   |
| British spellings missing      | `sceptre sceptic manoeuvre tyre cosy moustache jewellery sulphur mediaeval foetus paediatric anaemia diarrhoea oestrogen` all pass unchanged |
| the `-lled` family is missing  | `levelled dialled counselling totalled marvelled channelled quarrelled` all pass unchanged                                                   |
| bidi controls pass through     | `an\u202Ebidi\u202C test` is returned unchanged, which is the Trojan Source shape                                                            |
| character map has gaps         | no guillemets, no full-width or CJK punctuation, no ligatures, no primes or check marks                                                      |
| box pass is narrow             | inner separators, corner styles, an unclosed box and inconsistent padding are invisible to it                                                |
| no phrasing or structure check | the tells are prose in the skill and nothing measures them                                                                                   |

Articles: two pieces in the local article corpus mention the em dash as
an AI tell, as opinion rather than evidence. Nothing is cited; the source is the
module's own behavior.

## Decisions

| Question       | Decision                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| `-ogue` bug    | Narrow the stem to `catal`, `dial`, `anal`                                                |
| Spelling gaps  | Add the medical family, the `-lled` family and the single words                           |
| Bidi controls  | Security: removed by the transformer, with a blocking guardrail                           |
| Characters     | Guillemets, full-width and CJK punctuation, ligatures, symbols, extended spaces           |
| New guardrails | AI phrasing, bidi controls, emoji, non-NFC, repeated opener, homoglyphs, structural tells |
| Severity       | Blocking for bidi; advisory for everything else                                           |
| ASCII box      | Inconsistent separators, mixed corners, unclosed boxes, ragged padding                    |
| Structural     | An advisory `fp-structural-tells` for the closing paragraph that restates the opening     |
| Verification   | A false-positive matrix per stem family, idempotence, a multilingual fixture              |
| Delivery       | Plan only now                                                                             |

## Workstream A - Fix the over-correction

`OGUE_STEMS` becomes `catal|dial|anal`. `epilogue`, `prologue`, `monologue` and
`travelogue` stay as they are, and the false-positive matrix gains a row so the
narrow stem cannot silently widen again.

## Workstream B - Complete the spelling families

1. **Medical and Latin**: `foetus`, `paediatric`, `anaemia`, `diarrhoea`,
   `oestrogen`, `orthopaedic`, `oedema` and the `-oe-`/`-ae-` family.
2. **`-lled` and `-lling`**: `levelled`, `dialled`, `totalled`, `marvelled`,
   `channelled`, `quarrelled`, `counselling`.
3. **Single words**: `sceptre`, `sceptic`, `manoeuvre`, `tyre`, `cosy`,
   `moustache`, `jewellery`, `sulphur`, `mediaeval`.

A blanket family is only added when the stems are explicit; the `-ise`, `-our`,
`-re` and `-ogue` comments in the data file already explain why.

## Workstream C - Security

1. **Bidi controls** (U+202A to U+202E, U+2066 to U+2069) are removed by the
   transformer and reported by `fp-bidi-controls`, which blocks. A legitimate
   right-to-left document uses directional markup, not an invisible override
   character, and the rule says so.
2. **Homoglyphs** (Cyrillic and Greek characters shaped like Latin ones) are
   reported by `fp-homoglyph` on source files, where an identifier is the
   target. It stays advisory until the false-positive matrix shows it can
   distinguish a string literal from an identifier.

## Workstream D - Characters and normalization

1. Guillemets `«»‹›`, full-width forms and CJK punctuation, ligatures (`ﬁ ﬂ ﬀ`),
   primes, check marks, stars, the section and pilcrow signs, `±` and the micro
   sign gain an ASCII equivalent where one exists.
2. Text is normalized to NFC; `fp-non-nfc` reports a combining sequence so a
   comparison or a search that fails on identical-looking strings is caught.

## Workstream E - Phrasing and structure

1. `fp-ai-phrasing` checks the list the skill already prints: "it is important
   to note", "delve into", "in conclusion", "great question", stacked hedges.
2. `fp-emoji` reports emoji in prose; the terminal-interface exception stays.
3. `fp-repeated-opener` catches three consecutive paragraphs that begin the same
   way.
4. `fp-structural-tells` catches a closing paragraph that restates the opening.

## Workstream F - The box pass

`findRaggedBoxes` gains four checks and the pass stays padding-only:

1. An inner separator that does not sit above the vertical it belongs to.
2. Mixed corner or edge styles in one box.
3. A box with no bottom border.
4. Ragged padding between content rows.

Anything it cannot fix safely it reports, exactly as today.

## Proposed guardrails

Advisory first, except where noted.

| Rule id               | Rejects                                                         | Tier        | Source        |
| --------------------- | --------------------------------------------------------------- | ----------- | ------------- |
| `fp-bidi-controls`    | a bidirectional control character                               | A, blocking | Trojan Source |
| `fp-non-nfc`          | text that is not NFC                                            | B           | Unicode       |
| `fp-emoji`            | an emoji in prose                                               | B           | This skill    |
| `fp-ai-phrasing`      | a tell from the phrasing list                                   | B           | This skill    |
| `fp-repeated-opener`  | three paragraphs that begin the same way                        | B           | This skill    |
| `fp-structural-tells` | a closing paragraph that restates the opening                   | B           | This skill    |
| `fp-homoglyph`        | a non-Latin character shaped like a Latin one, in an identifier | B           | Security      |

The four existing rules stay.

## Verification

1. A false-positive matrix per stem family, grown from the `-ogue` bug: the
   words that must not change are enumerated and tested.
2. Idempotence on every new case, the same property the transformer already
   holds.
3. A fixture with real multilingual prose, code fences and a URL, asserting that
   only prose changes.
4. A `good` and a `bad` snippet per new guardrail in the corpus.

## Phases

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the guardrails and the data file.
- [x] Reproduce the bugs by running the transformer.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Fix and complete the data

- [ ] Narrow the `-ogue` stem and add the regression row.
- [ ] Add the spelling families and the single words.
- [ ] Extend the character maps and add NFC normalization.

### Phase 2 - Security and new rules

- [ ] Remove bidi controls and add `fp-bidi-controls` as blocking.
- [ ] Add `fp-homoglyph` on source files.
- [ ] Add the phrasing, emoji, opener and structural rules.

### Phase 3 - Box and verification

- [ ] Extend the box checks and keep the pass padding-only.
- [ ] Build the false-positive matrix and the multilingual fixture.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.
- [ ] Write the ADR for the blocking bidi rule and the homoglyph trigger, since
      both are security decisions.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test src/core/text/fingerprint/__tests__/_fingerprint.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/text/ascii-box/__tests__/*.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- `fp-homoglyph` needs code context; on prose it would fire on legitimate Greek
  or Cyrillic text. The trigger is source files, and the corpus decides whether
  it can promote.
- The em-dash tell appears in two local articles as opinion, not evidence; no
  article is cited.
- This plan strengthens a system that already runs on every tool result, so
  every change keeps the prose-only boundary and idempotence.
