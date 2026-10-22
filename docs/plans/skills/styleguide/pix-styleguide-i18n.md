# rule-styleguide-i18n - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, eighteenth skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-i18n/SKILL.md` (308 lines): externalization, key
  naming, plurals, gender and ordinals, `Intl.DateTimeFormat`,
  `Intl.NumberFormat`, RTL, pseudo-localization, CI, what never goes in a
  translation file, a checklist, and a final "Conventions (rules -> skills
  merge)" section.

Public sources verified in this session:

- CLDR, https://cldr.unicode.org/
- UTS #35, LDML, https://unicode.org/reports/tr35/
- ECMA-402, https://tc39.es/ecma402/
- ICU MessageFormat, https://unicode-org.github.io/icu/userguide/format_parse/messages/
- BCP 47, RFC 5646, https://www.rfc-editor.org/rfc/rfc5646
- UAX #9, bidirectional algorithm, https://unicode.org/reports/tr9/
- XLIFF 2.0, https://docs.oasis-open.org/xliff/xliff-core/v2.0/xliff-core-v2.0.html
- MDN `Intl`, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl

Local articles: no dedicated i18n piece exists in
the local article corpus; the "locale" matches are incidental.

Problems found:

| Problem                           | Detail                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| merge artifact                    | the final section nests a `# Internationalization (i18n) Rules` heading and restates the body |
| no guardrails                     | nothing deterministic behind the rules                                                        |
| no standards cited                | CLDR, ECMA-402, ICU, BCP 47 and XLIFF are never named                                         |
| `Intl` coverage is partial        | Segmenter, ListFormat, RelativeTimeFormat, DisplayNames and PluralRules are missing           |
| translation files are not covered | JSON, ICU and XLIFF are not compared                                                          |

## Decisions

| Question            | Decision                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope               | The seven areas, with the artifact removed and the standards cited                                                                           |
| Boundaries          | The skill owns the internationalization strategy, not the UI strings of a framework                                                          |
| Artifact            | Removed; the content lives in the body                                                                                                       |
| Standards           | CLDR/UTS 35, ECMA-402, ICU MessageFormat, BCP 47, UAX #9, XLIFF 2.0, MDN                                                                     |
| Missing topics      | ICU versus custom placeholders, the extra `Intl` APIs, file formats, translator context, text expansion, `lang` and fonts, timezone strategy |
| Pseudo-localization | A script generates the pseudo strings and CI verifies them                                                                                   |
| Guardrails          | No concatenation, explicit `Intl` dates, explicit `Intl` numbers, logical properties, no hardcoded strings, key convention                   |
| Trigger             | UI files, advisory first                                                                                                                     |
| Verification        | Corpus, locale fixtures, the pseudo-locale check                                                                                             |
| Delivery            | Plan only now                                                                                                                                |

## Workstream A - Remove the artifact

The final section goes. The rules it repeated stay in the body, and the
checklist becomes the only summary.

## Workstream B - Externalize and key

1. Externalize the string, never the sentence fragment: a key holds a whole
   message, with placeholders for the parts that vary.
2. Keys name the meaning (`cart.checkout.error`, not `error_3` and never the
   English text).
3. Concatenation is the failure mode: `"Delete " + name + "?"` cannot be
   reordered by a translator.
4. ICU MessageFormat is the placeholder standard; a custom `{name}` convention
   is acceptable only when it supports plural and select.

## Workstream C - Plurals, gender, ordinals

`Intl.PluralRules` and ICU plural/select cover the cases a two-form plural
misses: Arabic has six categories, Polish has four, and gender changes the
sentence in languages the English source never shows.

## Workstream D - Locale-aware formatting

1. `Intl.DateTimeFormat` with a timezone chosen on purpose; storage stays UTC.
2. `Intl.NumberFormat` for numbers, currencies and units, including
   `style: "unit"`.
3. The additional APIs: `Intl.Segmenter` for graphemes and words,
   `Intl.ListFormat` for enumerations, `Intl.RelativeTimeFormat` for "3 days
   ago", `Intl.DisplayNames` for language, region and currency names.

## Workstream E - Right to left

RTL is a layout property. `dir` on the root, logical properties
(`margin-inline-start`, `padding-inline-end`, `inset-inline`) instead of their
physical counterparts, and UAX #9 for mixed-direction text. The skill names the
bidi control characters and when not to use them.

## Workstream F - Translation files and context

1. JSON nested files, ICU message files and XLIFF 2.0 are compared, with the
   trade-off stated.
2. Every key ships with the context a translator needs: a screenshot, a
   description, the maximum length.
3. Text expansion is planned for: German and Finnish run longer than English,
   and a layout that fits English breaks.
4. The `lang` attribute is set per document and per foreign-language run; the
   boundary with `rule-styleguide-a11y` is a link.

## Workstream G - Pseudo-localization

A script transforms the source strings into an accented, lengthened pseudo
locale, and CI renders the application with it to catch hardcoded text,
truncation and concatenation before a translator sees the build.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                       | Rejects                                              | Tier | Source            |
| ----------------------------- | ---------------------------------------------------- | ---- | ----------------- |
| `i18n-no-string-concat`       | a translatable sentence built with `+` or a template | A    | ICU MessageFormat |
| `i18n-use-intl-date`          | a date formatted with no explicit `Intl`             | A    | ECMA-402          |
| `i18n-use-intl-number`        | a number or currency formatted by hand               | A    | ECMA-402          |
| `i18n-rtl-logical-properties` | `margin-left` or `padding-right` in a UI stylesheet  | A    | UAX #9            |
| `i18n-no-hardcoded-strings`   | literal text in markup                               | B    | This skill        |
| `i18n-key-convention`         | a key that repeats the English text                  | B    | This skill        |

Trigger: UI files (`.js`, `.jsx`, `.ts`, `.tsx`, `.vue`, `.svelte`, `.html`,
`.css`).

## Verification

1. A `good` and a `bad` snippet per guardrail in the corpus.
2. A fixture with `en`, `de`, `it` and `ar` snapshots for dates, numbers,
   plurals and the RTL layout.
3. The pseudo-locale script run in CI, failing on a hardcoded string or a
   truncation.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the artifact.
- [x] Verify the standards.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Remove the merge artifact.
- [ ] Cite the standard behind each section.
- [ ] Add the extra `Intl` APIs.
- [ ] Add the translation file formats, translator context and text expansion.
- [ ] Add `lang` and font coverage with the a11y link.
- [ ] State the timezone strategy.
- [ ] Turn pseudo-localization into a script.

### Phase 2 - Guardrails

- [ ] Add the six rules with fixtures and a unit test each.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the UI-file trigger and the `.md` boundary with the
      other styleguide skills, if the trigger turns out to be structural.

### Phase 3 - Verification

- [ ] Run the locale fixture snapshots.
- [ ] Run the pseudo-locale script in CI.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions and scaffolding | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Content | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 2 - Guardrails | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 3 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The hardcoded-string rule is noisy by nature and stays Tier B; the pseudo
  locale is the stronger check for the same defect.
- No local article is cited; the standards are the sources.
