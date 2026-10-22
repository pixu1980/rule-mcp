# rule-data-validation - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: data. Order: after the move from styleguide (ADR 144).

## Evaluation outcome

The skill moved from `styleguide` to `data`, and the reason is worth recording
because the area is derived from the directory name and a future reader will ask
why a validation skill sits under data.

- The content is data shape and country formats, not code style.
- The same values are validated in a client form, sent to the API and stored,
  so the data area is the umbrella that already covers where those values go.
- No new area and no router: `rule-data` lists the skill as a child.
- The data area description was broadened to "Databases and storage, and the
  shape and validation of the data that reaches them", which is the one
  hand-written line the derived areas cannot produce.

## Evidence base

Read in this session:

- `skills/rule-data-validation/SKILL.md`: email, phone, VAT, postal code, tax ID,
  address, entity validation by country, and library integration with Zod, Joi,
  Yup and class-validator.
- `skills/rule-data/SKILL.md`, which now indexes the skill.
- `skills/rule-backend-security/SKILL.md`, the owner of validation at the
  request boundary.

Local articles found (context only):

- `01-ai-coding-agents/validation-fixed-half-of-my-tool-call-errors.md` - a
  Zod schema over tool-call input; the AI side of the same practice.
- `05-backend-apis/9-node-js-packages-that-save-you-hours.md` and
  `the-most-useful-node-js-packages-nobody-talks-about.md` - Zod sections.
- `05-backend-apis/nestjs-12-goes-esm-without-forcing-your-app-to-follow.md` -
  class-validator versus Standard Schema.
- `04-frontend/htmx-the-argument-that-most-web-apps-never-needed-a-javascript-framework.md` -
  the cost of defining the validation once for the client and once for the
  server.

Standards to anchor (each section cites its own):

| Domain        | Standard                                             |
| ------------- | ---------------------------------------------------- |
| Phone         | ITU-T E.164                                          |
| Country codes | ISO 3166-1 alpha-2 and the locale it implies         |
| VAT           | EU VIES and the national VAT formats                 |
| Email         | RFC 5322 and RFC 5321                                |
| Bank accounts | ISO 13616, the IBAN registry and the mod-97 checksum |
| Cards         | ISO/IEC 7812 with the Luhn checksum                  |
| Postal codes  | The national postal authority format                 |

## Decisions

| Question   | Decision                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Area       | `data`; the rename is done (ADR 144)                                                                                            |
| Router     | `rule-data` lists the skill; no new area and no router                                                                           |
| Scope      | Rename plus a restructure into sections by domain                                                                               |
| Boundaries | Country formats and checksums here; boundary validation, schema constraints, locale formatting and forms stay with their owners |
| Additions  | IBAN/SEPA and payment card numbers with Luhn                                                                                    |
| Standards  | One cited standard per domain, as in the table above                                                                            |
| Delivery   | Plan only now                                                                                                                   |
| ADR        | The move is already recorded in ADR 144; a second ADR only if the restructure changes ownership                                 |

## Workstream A - Restructure by domain

One section per domain, each with the format, the example, the schema, and the
standard it comes from:

1. Email: the practical length and shape checks, the RFC the pattern follows,
   and disposable-domain detection as an optional layer.
2. Phone: E.164 first, per-country patterns after, with the library lookup.
3. Postal codes: one row per country with the postal authority as the source.
4. VAT: the national formats and the EU VIES path for real verification.
5. Tax and national identifiers, with the checksum where one exists.
6. Bank accounts: IBAN structure, country length, and the mod-97 check.
7. Payment cards: length per brand and the Luhn check, with a warning that a
   passing check does not prove a card exists.
8. Address and entity schemas per country.
9. Library integration, ending with the rule that the same schema serves the
   client and the server instead of two implementations.

## Workstream B - New domains

1. **IBAN and SEPA.** Country length table, the mod-97 checksum, and the note
   that a valid IBAN is not a valid account.
2. **Payment cards.** Brand prefixes and lengths, the Luhn check, and the
   boundary: the skill validates a format, it never touches card data in
   production beyond what PCI rules allow.

## Workstream C - Boundaries

- `rule-backend-security` owns validation at the request boundary and the trust
  model; this skill owns the format of the value.
- `rule-data-*` owns the database constraints; a Zod schema is not a substitute
  for a `CHECK` or a uniqueness constraint.
- `rule-styleguide-i18n` owns locale and `Intl` formatting; this skill owns
  whether the value is well formed.
- The frontend skills own the form; the schema they use is the one defined here.

## Proposed guardrails

Advisory first, and likely to stay advisory: a wrong regex is a correctness bug
that a pattern cannot reliably detect. The real verification is the test vectors.

| Rule id                        | Rejects                                                             | Tier | Source                  |
| ------------------------------ | ------------------------------------------------------------------- | ---- | ----------------------- |
| `validation-checksum-required` | an IBAN, VAT or card pattern with no checksum step where one exists | B    | ISO 13616, ISO/IEC 7812 |
| `validation-unsourced-pattern` | a country format with no cited standard                             | B    | This plan               |

## Assets and templates to ship

- `assets/templates/validation-vectors.json` - valid and invalid samples per
  format, usable as test data.
- `assets/templates/validation-schemas.ts` - the Zod schemas per domain.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD), `rule-data-sql` (ORDER)

Feeds: `rule-data` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Evaluation, move and decisions

- [x] Evaluate the area and record the outcome.
- [x] Move the skill to `rule-data-validation` (ADR 144).
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Restructure

- [ ] Rewrite the skill into the nine domain sections.
- [ ] Add the standard cited by each section.
- [ ] Add IBAN/SEPA and payment cards.
- [ ] Add the library-sharing rule for client and server.

### Phase 2 - Guardrails and assets

- [ ] Implement the two advisory rules with fixtures and a unit test each.
- [ ] Ship the test-vector and schema templates.
- [ ] Write the ADR for the checksum policy if the rules ever promote.

### Phase 3 - Verification

- [ ] Run the test vectors against the schemas: every valid sample passes and
      every invalid sample fails.
- [ ] Verify the IBAN mod-97 and the Luhn implementation with known vectors.
- [ ] Mock VIES and confirm the client handles both answers.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Evaluation, move and decisions | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Restructure | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 2 - Guardrails and assets | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 3 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |

Plan default: `T8-verify` - `gemini-3.8-flash` (high). Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The move is complete; this plan is the skill's first implementation pass in
  its new area.
- The local articles are context only. None of them is a primary source for a
  country format, so the plan cites the standards and the postal and tax
  authorities instead.
- A passing Luhn check is a format check, not a payment authorization, and the
  skill says so before anyone ships it as a validation gate.
