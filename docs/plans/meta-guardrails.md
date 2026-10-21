# rule-meta guardrails execution plan

Status: `superseded` by `docs/plans/skills/skills-plan.md` (ADR 153).
Absorbed by: the four rule-meta leaves, one rule set per plan.
Graph: not a node; see the absorbed table in `skills-plan.md`.

Scope: give the meta-framework area its first deterministic guardrails, focused
on the server/client boundary, and record every rule against a citable public
source. Implementation happens in a dedicated session: this document is the
plan only.

Companion plans: `docs/plans/devops-guardrails.md`,
`docs/plans/backend-guardrails.md`, `docs/plans/ai-guardrails.md`,
`docs/plans/data-guardrails.md`, `docs/plans/frontend-guardrails.md`.
Enforcement and delivery follow the devops decisions (advisory first, then
blocking; fixtures, unit tests, inheritance test; census, ADR, changelog,
per-rule source).

## Evidence base

Audited in this session (read-only):

- `skills/rule-meta/SKILL.md` (router, no guardrails, no inherits)
- `skills/rule-meta-astro/SKILL.md`
- `skills/rule-meta-next/SKILL.md`
- `skills/rule-meta-nuxt/SKILL.md`
- `skills/rule-meta-remix/SKILL.md`

Current state: 5 skills, 0 guardrails, 0 `inherits` lines.

Sources fetched and used:

- Next.js environment variables, https://nextjs.org/docs/app/guides/environment-variables
- Astro islands architecture, https://docs.astro.build/en/concepts/islands/
- React Router data loading, https://reactrouter.com/start/framework/data-loading
- Vite env variables and modes, https://vite.dev/guide/env-and-mode
- Nuxt configuration, https://nuxt.com/docs/getting-started/configuration

Nuxt runtime config is documented under a path that answers 404 to the fetch
used for this plan; the configuration page stands in for it until a stable URL
is found.

## Decisions from the interview

| Question      | Decision                                                             |
| ------------- | -------------------------------------------------------------------- |
| Target skills | All five: `rule-meta` shared plus next, astro, nuxt, remix            |
| Candidates    | All seven selected                                                   |
| Trigger       | Devops default: target file or framework import                      |
| Severity      | Devops default: advisory, then blocking after corpus proof           |
| Corpus/tests  | Devops default: fixtures, unit tests, inheritance test               |
| Artifacts     | Devops default: frontmatter, census, ADR, changelog, per-rule source |
| Phasing       | Plan only now; implementation in a dedicated session                 |

### Open item: the shared rules need an inherits graph

No meta skill declares `inherits`, so a rule owned by `rule-meta` never reaches
`rule-meta-next`, `-astro`, `-nuxt` or `-remix`. Same choice as the AI and
frontend plans: add `inherits: [rule-meta]` to the four children, or duplicate
the shared ids in each.

### Tiering

Tier A: `meta-public-env-secret`, `meta-server-data-leak`, `hydration-safe`,
`meta-route-validation`.

Tier B: `meta-client-directive`, `astro-client-directive`,
`meta-cache-explicit`.

## Accepted rules

| Rule id                  | Rejects                                                                                 | Tier | Source                    |
| ------------------------ | --------------------------------------------------------------------------------------- | ---- | ------------------------- |
| `meta-public-env-secret` | `NEXT_PUBLIC_` or `PUBLIC_` variable whose name is a secret                             | A    | Next.js env vars; Vite    |
| `meta-server-data-leak`  | loader or server handler serializing secret fields to the client                        | A    | React Router data loading |
| `hydration-safe`         | `Date.now`, `Math.random`, `new Date` in render output                                  | A    | React hydration; Astro    |
| `meta-route-validation`  | route handler or action with no input schema                                            | A    | React Router; Next.js     |
| `meta-client-directive`  | `"use client"` on a fully static component, or a server-only import reaching the client | B    | Next.js docs              |
| `astro-client-directive` | `client:load` where `client:visible` or `client:idle` fits                              | B    | Astro islands             |
| `meta-cache-explicit`    | `fetch` in Next with no cache or revalidate declared                                    | B    | Next.js docs              |

`meta-public-env-secret` reads the name, not the value: a public variable whose
name ends in `_KEY`, `_SECRET`, `_TOKEN` or `_PASSWORD` is the signal.

## Enforcement model

1. **Owner**: `rule-meta` gets a `guardrails/index.js` with the shared ids; each
   meta-framework skill keeps the framework form of its own rules.
2. **Triggers**: shared rules run on server files, route files and components;
   a framework rule runs when the file imports that framework or lives in its
   route directory.
3. **Advisory first**, promoted to blocking after 100% precision and recall.
4. **Tests**: a `good` and a `bad` entry per rule, one unit test per rule, and
   an inheritance test once the open item is decided.

## Phases

### Phase 0 - Decisions and scaffolding

- [x] Audit the five skills.
- [x] Fetch and record the public sources.
- [x] Interview the owner and record the decisions.
- [ ] Confirm the `inherits` change (open item).
- [ ] Create the ADR for the meta guardrail family.

### Phase 1 - Shared rules in rule-meta

- [ ] Implement `meta-public-env-secret` and `meta-server-data-leak`.
- [ ] Implement `hydration-safe` and `meta-route-validation`.
- [ ] Implement `meta-client-directive`, `astro-client-directive` and
      `meta-cache-explicit` as Tier B.
- [ ] Add corpus fixtures, unit tests and the inheritance test.
- [ ] Update `rule-meta/SKILL.md` frontmatter and rule section.

### Phase 2 - Promotion and documentation

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
- `docs/plans/frontend-guardrails.md` - the sibling plan for the frontend area
