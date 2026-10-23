# rule-styleguide-json - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, sixteenth skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-json/SKILL.md` (150 lines): validity, structure,
  naming, numbers and units, dates, booleans and null, the schema mindset,
  formatting, key order, examples, and a duplicated `package.json` section.
- `skills/rule-toolchain-pnpm/SKILL.md`, the owner of `pkg-no-corepack` and
  `pkg-no-engines`.

Public sources verified in this session:

- RFC 8259, JSON, https://www.rfc-editor.org/rfc/rfc8259
- RFC 7493, I-JSON, https://www.rfc-editor.org/rfc/rfc7493
- JSON Schema, https://json-schema.org/specification
- RFC 8785, JSON Canonicalization Scheme, https://www.rfc-editor.org/rfc/rfc8785
- ECMA-404, https://ecma-international.org/publications-and-standards/standards/ecma-404/
- JSON Lines, https://jsonlines.org/
- VS Code JSON and JSONC, https://code.visualstudio.com/docs/languages/json

ISO 8601 and ISO 4217 are named as standards. Their official pages answer HTTP
403 to the fetch used here, so the plan cites the standard names without a
verified URL.

Local articles: `06-databases/jsonl-the-format-we-didn-t-know-we-needed.md` is
relevant to the JSON Lines section and is cited there as a secondary source.

Problems found:

| Problem                     | Detail                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------- |
| duplicated manifest section | the `package.json` section restates the pnpm policy and cites pnpm 11.25.0 and 11.8.0 |
| no guardrails               | a format with deterministic rules and nothing behind it                               |
| standards are not cited     | no RFC, no JSON Schema, no JSON Lines                                                 |
| missing rules               | duplicate keys, integers past 2^53, top-level shapes, `$schema`, JSONL                |
| dialects are mixed          | JSONC is used by the tool configs but never mentioned                                 |

## Decisions

| Question         | Decision                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Scope            | Validity, semantics, schema, dialects, formatting, and the removal of the duplicated manifest section |
| Boundaries       | JSON owns the format and its conventions; everything else is linked                                   |
| Manifest section | Removed and linked to `rule-toolchain-pnpm`                                                            |
| Standards        | RFC 8259, I-JSON, JSON Schema, JCS, ECMA-404, ISO 8601 and 4217, JSON Lines, JSONC                    |
| JSONC            | `.json` is strict; `.jsonc` is allowed for configuration files                                        |
| Missing rules    | Duplicate keys, integers past 2^53, top-level objects, `$schema`, JSONL                               |
| Guardrails       | Parseability, no comments, no trailing comma, `$schema` on contracts, ISO 8601 timestamps             |
| Trigger          | `.json` and `.jsonc`, advisory first, with the comment rule scoped to `.json`                         |
| Verification     | Corpus, `JSON.parse`, JSON Schema validation, `prettier --check`                                      |
| Delivery         | Plan only now                                                                                         |

## Workstream A - Remove the duplication

The `package.json` section goes. The skill links `rule-toolchain-pnpm`, which
owns `pkg-no-corepack` and `pkg-no-engines`, and the pnpm plan already carries
the current version line. Nothing about the manifest stays here.

## Workstream B - Validity and I-JSON

1. JSON is RFC 8259: double quotes, no trailing commas, no comments, the six
   value types.
2. I-JSON narrows it for interoperability: no duplicate keys, no integers past
   2^53, and a top-level object rather than a scalar or an array.
3. A duplicate key is a bug even though parsers accept it, because the last one
   wins silently.
4. Large integers travel as strings when they exceed the safe range.

## Workstream C - Semantics

1. Naming: camelCase keys, `Id` and `At` suffixes, plural arrays, singular
   objects.
2. Units belong in the name (`timeoutMs`) or in a value-and-unit pair.
3. Currency is integer minor units plus an ISO 4217 code.
4. Timestamps are ISO 8601 strings in UTC; dates the user reads are formatted by
   `Intl`, not stored formatted.
5. Booleans are booleans; `null` means known-empty, and an omitted optional key
   is better than a wall of `null`.

## Workstream D - Schema

A file that is a contract declares `$schema`, carries a version field, and is
validated against its schema in CI. JSON Schema is the format; the schema file
lives beside the data it describes.

## Workstream E - Dialects

1. **JSONC** for configuration files whose consumer accepts comments, such as
   `tsconfig`, `biome.jsonc` and `turbo.jsonc`. A `.json` file never carries
   comments.
2. **JSON Lines** for streams and logs: one record per line, no outer array,
   each line independently parseable, with the article as a secondary source.
3. **JCS** is named for the cases where a canonical byte sequence matters, such
   as signing or hashing a payload.

## Workstream F - Formatting

2-space indentation, one property per line, a final newline. Prettier is the
formatter, and the skill states the settings it enforces instead of asking the
reader to format by hand.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                  | Rejects                                          | Tier | Source      |
| ------------------------ | ------------------------------------------------ | ---- | ----------- |
| `json-valid`             | a file that does not parse                       | A    | RFC 8259    |
| `json-no-comments`       | `//` or `/* */` inside a `.json` file            | A    | RFC 8259    |
| `json-no-trailing-comma` | a trailing comma before `}` or `]`               | A    | RFC 8259    |
| `json-schema-present`    | a declared contract file with no `$schema`       | B    | JSON Schema |
| `json-date-iso8601`      | a `*At` field that is not an ISO 8601 UTC string | B    | ISO 8601    |

Scope: `.json` and `.jsonc`. The comment rule fires on `.json` only, and the
validity rule uses a JSONC-aware parser for `.jsonc`, so the two dialects do not
contradict each other.

## Verification

1. A `good` and a `bad` snippet per guardrail in the corpus.
2. Every sample parsed with `JSON.parse`, and the `.jsonc` samples with a
   JSONC-aware parser.
3. The contract samples validated against their JSON Schema.
4. `prettier --check` over the samples.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the duplicated manifest section.
- [x] Verify the standards.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Remove the `package.json` section and link `rule-toolchain-pnpm`.
- [ ] Add the I-JSON rules.
- [ ] Add the `$schema` and versioning guidance.
- [ ] Add the JSONC and JSON Lines sections with their sources.
- [ ] Name JCS for canonical payloads.
- [ ] State the Prettier settings.

### Phase 2 - Guardrails

- [ ] Add the five rules with fixtures and a unit test each.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the `.json` versus `.jsonc` split, since it decides how
      a future JSON rule scopes itself.

### Phase 3 - Verification

- [ ] Run the corpus gate.
- [ ] Parse and validate the samples.
- [ ] Run `prettier --check` on the samples.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                | Class       | Model                     | Why                            |
| ----------------------------------- | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions and scaffolding | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Content                   | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 2 - Guardrails                | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Verification              | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The ISO pages block automated fetch; the standards are cited by name and the
  rest of the sources are verified.
- The duplicated manifest section is the only content removal; everything else
  is an addition.
