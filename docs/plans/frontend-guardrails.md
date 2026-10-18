# rule-frontend guardrails execution plan

Scope: add the framework-agnostic rules the frontend area is missing, extend
the per-framework set, and record every rule against a citable public source.
Implementation happens in a dedicated session: this document is the plan only.

Companion plans: `docs/plans/devops-guardrails.md`,
`docs/plans/backend-guardrails.md`, `docs/plans/ai-guardrails.md`,
`docs/plans/data-guardrails.md`. Enforcement and delivery follow the devops
decisions (advisory first, then blocking; fixtures, unit tests, inheritance
test; census, ADR, changelog, per-rule source).

## Evidence base

Audited in this session (read-only):

- `skills/rule-frontend/SKILL.md` (router, no guardrails, no inherits)
- `skills/rule-frontend-react/` (2 rules: react-hooks-rules, react-no-classname)
- `skills/rule-frontend-vue/` (1 rule: vue-no-class-binding)
- `skills/rule-frontend-svelte/` (1 rule: svelte-no-class-directive)
- `skills/rule-frontend-angular/` (1 rule: angular-no-ngclass)
- `skills/rule-frontend-vanilla-reactive/` (9 rules)
- `skills/rule-frontend-{custom-element,template-engine,workers,solidjs}/` (none)

Current state: 10 skills, 14 rules, and no `inherits` line anywhere, so a rule
owned by one skill never reaches another.

Style and accessibility already live in the styleguide area (`rule-styleguide-css`,
`-html`, `-a11y`), which is why this plan stays on framework behavior, XSS
sinks, custom elements and workers.

Sources fetched and used:

- OWASP XSS Prevention Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- MDN Trusted Types API, https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
- web.dev Trusted Types, https://web.dev/articles/trusted-types
- MDN Transferable objects, https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
- React, rendering lists, https://react.dev/learn/rendering-lists
- Vue, list rendering, https://vuejs.org/guide/essentials/list
- Svelte, each blocks, https://svelte.dev/docs/svelte/each
- Angular, NgFor, https://angular.dev/api/common/NgFor

## Decisions from the interview

| Question      | Decision                                                             |
| ------------- | -------------------------------------------------------------------- |
| Target skills | `rule-frontend` shared, react, vue, svelte, solid, angular, workers   |
| Candidates    | All seven selected                                                   |
| Trigger       | Devops default: target file or framework import                      |
| Severity      | Devops default: advisory, then blocking after corpus proof           |
| Corpus/tests  | Devops default: fixtures, unit tests, inheritance test               |
| Artifacts     | Devops default: frontmatter, census, ADR, changelog, per-rule source |
| Phasing       | Plan only now; implementation in a dedicated session                 |

### Open item 1: the shared rules need an inherits graph

No frontend skill declares `inherits`, so the shared rules in `rule-frontend`
only run when the check is routed to `rule-frontend` itself. The same shape as
the AI open item: either the framework skills add `inherits: [rule-frontend]`,
or each framework skill keeps its own copy of the shared ids.

### Open item 2: two selected candidates have unselected owners

`ce-valid` belongs to `rule-frontend-custom-element` and `template-escape` to
`rule-frontend-template-engine`, but only the candidates were selected in the
interview, not those two skills. Either the two skills join the target list, or
the two rules ship on `rule-frontend` and run whenever the file matches.

### Tiering

Tier A: `xss-sink-sanitized`, `fe-list-key`, `fe-effect-cleanup`,
`ce-valid`, `template-escape`, `worker-no-dom`.

Tier B: `worker-transferable`.

## Accepted rules

| Rule id               | Rejects                                                                                          | Tier | Source                       |
| --------------------- | ------------------------------------------------------------------------------------------------ | ---- | ---------------------------- |
| `xss-sink-sanitized`  | `dangerouslySetInnerHTML`, `v-html`, `{@html}`, `innerHTML` without a sanitizer or Trusted Types | A    | OWASP XSS; MDN Trusted Types |
| `fe-list-key`         | list rendering with no stable key, or the array index as key                                     | A    | React; Vue; Svelte; Angular  |
| `fe-effect-cleanup`   | effect, `onMount` or `watch` that registers a listener or timer with no cleanup                  | A    | Framework docs               |
| `ce-valid`            | custom element name without a hyphen, no `adoptedStyleSheets`                                    | A    | MDN; existing vanilla rules  |
| `template-escape`     | unescaped interpolation or raw HTML in a template                                                | A    | OWASP XSS; MDN Trusted Types |
| `worker-no-dom`       | `document` or `window` access inside a worker file                                               | A    | MDN Web Workers              |
| `worker-transferable` | large `ArrayBuffer` or `ImageBitmap` posted with no transfer list                                | B    | MDN Transferable objects     |

`xss-sink-sanitized` and `template-escape` overlap by design: the first is the
sink in JavaScript, the second is the template syntax that produces it. The
corpus pins both so a single escape hatch cannot satisfy the pair.

## Enforcement model

1. **Owner**: `rule-frontend` gets a `guardrails/index.js` with the shared ids;
   each framework skill keeps its own and gains its new ids.
2. **Triggers**: the shared rules run on component, template and worker files;
   a framework rule runs when the file imports that framework.
3. **Advisory first**, promoted to blocking after 100% precision and recall.
4. **Tests**: a `good` and a `bad` entry per rule, one unit test per rule, and
   an inheritance test once open item 1 is decided.

## Phases

### Phase 0 - Decisions and scaffolding

- [x] Audit the ten skills and the fourteen rules.
- [x] Fetch and record the public sources.
- [x] Interview the owner and record the decisions.
- [ ] Confirm the `inherits` change (open item 1).
- [ ] Resolve the two unselected owners (open item 2).
- [ ] Create the ADR for the frontend guardrail family.

### Phase 1 - Shared rules in rule-frontend

- [ ] Implement `xss-sink-sanitized`, `fe-list-key`, `fe-effect-cleanup`.
- [ ] Implement `ce-valid`, `template-escape`, `worker-no-dom`.
- [ ] Implement `worker-transferable` as Tier B.
- [ ] Add corpus fixtures and unit tests.

### Phase 2 - Per-framework rules

- [ ] Extend react, vue, svelte, angular and solid with their framework form
      of the key and cleanup rules.
- [ ] Add a false-positive fixture per framework.
- [ ] Update each `SKILL.md` frontmatter and rule section.

### Phase 3 - Promotion and documentation

- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.
- [ ] Run the gates below and add the changelog entry.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm test tests/core/self-guardrails.test.mjs
pnpm lint
pnpm census
pnpm test
```

## See also

- `docs/plans/devops-guardrails.md` - the enforcement model this plan follows
- `docs/plans/meta-guardrails.md` - the sibling plan for the meta frameworks
