# rule-styleguide-html - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, nineteenth skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-html/SKILL.md` (454 lines): the mandatory boilerplate,
  semantics and the div ban, the elements that replaced a library, accessibility
  essentials, typography, media, nesting, formatting and validation.
- `skills/rule-styleguide-html/guardrails/`: `semantic-html` and
  `data-part-naming`.
- `skills/rule-styleguide-a11y/guardrails/`: ten rules including
  `a11y-html-lang`, `a11y-form-label` and `a11y-img-alt`.

Public sources verified in this session:

- WHATWG HTML, custom elements, https://html.spec.whatwg.org/multipage/custom-elements.html
- W3C Markup Validation Service, https://validator.w3.org/
- Nu Html Checker, https://validator.w3.org/nu/
- ARIA in HTML, https://www.w3.org/TR/html-aria/
- MDN HTML, https://developer.mozilla.org/en-US/docs/Web/HTML
- HTML-validate, https://html-validate.org/

Local articles: `04-frontend/` has pieces on semantic HTML, the `<dialog>`
element and the HTML features of 2026. They stay context only; the plan
anchors to WHATWG and MDN.

Problems found:

| Problem                       | Detail                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- |
| validation is one sentence    | "W3C markup validation is mandatory" with no tool and no CI                  |
| standards are not cited       | WHATWG, ARIA in HTML and the validators are never named                      |
| accessibility is duplicated   | three bullets restate `a11y-form-label`, `a11y-html-lang` and `a11y-img-alt` |
| missing media and form topics | `srcset`, `loading`, `fetchpriority`, input types, `autocomplete`            |
| metadata is partial           | `robots`, `theme-color`, Open Graph and JSON-LD are absent                   |

## Decisions

| Question       | Decision                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------- |
| Scope          | Boilerplate, semantics, modern elements, validation, standards, media and forms              |
| Boundaries     | Structure, semantics and HTML elements; accessibility, CSS and templates are linked          |
| Accessibility  | Reduced to one line and a link to `rule-styleguide-a11y`                                      |
| Standards      | WHATWG, W3C and Nu validator, ARIA in HTML, MDN, HTML-validate, custom elements              |
| Missing topics | `template` and `slot`, responsive images, modern forms, metadata, JSON-LD, obsolete elements |
| Validation     | HTML-validate in CI, W3C/Nu for the manual checks                                            |
| Guardrails     | Boilerplate, nesting, obsolete elements, image dimensions, landmarks                         |
| Overlap        | `lang`, `alt` and `label` stay with `rule-styleguide-a11y`                                    |
| Severity       | Advisory first, then blocking after the corpus gate                                          |
| Verification   | Corpus, an HTML-validate fixture, and a boilerplate identity check                           |
| Delivery       | Plan only now                                                                                |

## Workstream A - The boilerplate

1. The boilerplate keeps doctype, charset, viewport, title, icons, canonical and
   the Open Graph block.
2. `lang` is delegated to `a11y-html-lang`; the boilerplate rule checks the
   other elements and points at the a11y rule for the attribute.
3. The "add when the page needs it" list stays, and the examples must all carry
   the same boilerplate, which the verification checks.

## Workstream B - Semantics

1. The div ban, the decision table and the element guide stay.
2. The reasoning is checked against ARIA in HTML: a role that an element already
   carries is not repeated.
3. A short obsolete-elements list names what replaced `<center>`, `<font>`,
   `<marquee>`, `<big>` and the rest.

## Workstream C - Modern elements

`<dialog>`, `popover`, `<details>`, `<datalist>` and `inert` are verified
against WHATWG, including the difference between a modal dialog and a popover,
and the cases where the native element is not enough.

## Workstream D - Media and forms

1. Images: `srcset`, `sizes`, `loading`, `decoding`, `fetchpriority`, and the
   width and height that prevent layout shift.
2. Forms: input types, `autocomplete`, `enterkeyhint`, `inputmode`, and the
   relationship with the a11y form rules.
3. `<picture>`, `<video>` and `<audio>` with the attributes that matter, and a
   link to the a11y captions rule.

## Workstream E - Metadata

`robots`, `theme-color`, canonical, Open Graph and Twitter cards are listed
where they belong; JSON-LD is described as the structured-data option with its
own validation.

## Workstream F - Validation

1. HTML-validate runs in CI with a committed configuration.
2. The W3C and Nu checkers are the manual reference when a rule is unclear.
3. The rule catalog of HTML-validate is cited, the same way markdownlint is
   cited in the Markdown plan.

## Workstream G - The accessibility boundary

The section becomes one line and a link: native semantics first, ARIA only when
needed, and the ten a11y rules own the attribute-level checks.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                     | Rejects                                                     | Tier | Source       |
| --------------------------- | ----------------------------------------------------------- | ---- | ------------ |
| `html-boilerplate`          | a page missing doctype, charset, viewport or title          | A    | WHATWG; MDN  |
| `html-valid-nesting`        | `<p><div>`, a `<ul>` without `<li>`, a block inside a `<p>` | A    | WHATWG       |
| `html-no-obsolete-elements` | `<center>`, `<font>`, `<marquee>`, `<big>`                  | A    | WHATWG       |
| `html-img-dimensions`       | an `<img>` with no width/height or aspect ratio             | B    | MDN; CLS     |
| `html-landmarks`            | a page with no `<main>` or no navigation landmark           | B    | ARIA in HTML |

`lang` is not in `html-boilerplate`; `a11y-html-lang` owns it. Trigger: `.html`
and component files that return markup.

## Verification

1. A `good` and a `bad` snippet per guardrail in the corpus.
2. An HTML-validate fixture over the sample pages.
3. A check that every example carries the same boilerplate.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the a11y overlap.
- [x] Verify the standards and the validators.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Cite the standards behind each section.
- [ ] Reduce the accessibility section to a link.
- [ ] Add obsolete elements, responsive images, forms and metadata.
- [ ] Verify the modern element section against WHATWG.
- [ ] Turn validation into HTML-validate in CI.

### Phase 2 - Guardrails

- [ ] Add the five rules with fixtures and a unit test each.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the `lang` delegation and the HTML-validate choice, if
      either turns out to be structural.

### Phase 3 - Verification

- [ ] Run the HTML-validate fixture.
- [ ] Check the boilerplate identity across the examples.
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

- The `lang` attribute is deliberately left to `rule-styleguide-a11y`; the
  boilerplate rule names the split so a reader is not surprised.
- HTML-validate is not installed today; the plan adds it deliberately and
  records the dependency.
- No local article is cited; WHATWG and MDN are the sources.
