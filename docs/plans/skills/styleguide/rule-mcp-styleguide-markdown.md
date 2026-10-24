# rule-mcp-styleguide-markdown - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, fifteenth skill.

## Evidence base

Read in this session:

- `skills/rule-mcp-styleguide-markdown/SKILL.md` (150 lines): document structure,
  headings, lists, code blocks, inline code, links, images, tables, formatting,
  tone, repo conventions, a generic validation note and a skeleton.
- The repository tooling: `package.json` runs Prettier over `**/*.{js,mjs,json,md}`
  in `format` and `format:fix`; no markdownlint is installed.
- `skills/rule-mcp-styleguide-fingerprint/SKILL.md`,
  `skills/rule-mcp-styleguide-english/SKILL.md`, `skills/rule-mcp-process-readme/SKILL.md`
  and `skills/rule-mcp-process-adr/SKILL.md`, the neighboring owners.

Public sources verified in this session:

- CommonMark, https://spec.commonmark.org/
- GitHub Flavored Markdown, https://github.github.com/gfm/
- GitHub Docs, basic writing and formatting, https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
- markdownlint rules, https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md
- Prettier, https://prettier.io/docs/
- Markdown Guide, https://www.markdownguide.org/

Problems found:

| Problem                       | Detail                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------ |
| no guardrails                 | a 150-line style guide with nothing deterministic behind it                    |
| the linter note is generic    | "use a Markdown linter if available" while the repo runs only Prettier         |
| GFM is not named              | tables, task lists, footnotes and alerts are not distinguished from CommonMark |
| repo conventions are one line | the census markers and the generated-doc rule are not documented               |
| boundaries are implicit       | punctuation, English spelling, README and ADR templates belong to other skills |

Local articles: no dedicated Markdown piece exists in
the local article corpus; the matches found are incidental. The plan
anchors to the specifications and the tool documentation.

## Decisions

| Question     | Decision                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------- |
| Scope        | Structure, GFM and CommonMark, links, linting, repo conventions, boundaries              |
| Boundaries   | Markdown owns syntax and structure only                                                  |
| Linting      | Prettier for formatting plus markdownlint for the rules Prettier does not cover          |
| GFM          | Tables, task lists, footnotes, alerts, HTML comment markers, explicit section anchors    |
| Structure    | Single H1, intro, heading order, TOC threshold, YAML frontmatter for site docs           |
| Links        | Relative internal links, explicit anchors, descriptive text, no raw URLs                 |
| Guardrails   | Single H1, heading order, fence language, relative links, trailing spaces, final newline |
| Trigger      | `.md` files only, advisory first                                                         |
| Verification | Corpus snippets, link integrity, `prettier --check` on the samples                       |
| Standards    | CommonMark, GFM, GitHub Docs, markdownlint rules, Prettier                               |
| Delivery     | Plan only now                                                                            |

## Workstream A - Structure

1. One `#` title, then an intro that names the purpose and the audience.
2. Headings in order, no skipped levels.
3. A table of contents once a document passes roughly two screens.
4. YAML frontmatter for the documents the docs site consumes, with the title and
   the metadata that site reads.

## Workstream B - GFM and CommonMark

1. **Tables** for comparisons and matrices, aligned, with a header row.
2. **Task lists** for plans and checklists, since the repository's own plans use
   them.
3. **Footnotes** for source references that would crowd the prose.
4. **Alerts** (`> [!NOTE]`, `> [!WARNING]`) for the lines a reader must not miss,
   in place of bold paragraphs.
5. **HTML comment markers** for generated content, matching the census markers
   the repository already uses.
6. **Explicit section anchors** for cross-document links, so a heading rename
   does not break a link silently.

## Workstream C - Links

1. Relative paths for internal references.
2. Descriptive link text; "click here" and raw URLs are out.
3. Anchors verified when a link crosses documents.

## Workstream D - Linting

1. Prettier remains the formatter; it normalizes spacing, wrapping and tables.
2. markdownlint covers what Prettier does not: heading order, fence language,
   duplicate headings, empty links, trailing spaces.
3. The markdownlint configuration is committed with the rules that matter, and
   the rule catalog is cited even where the tool is not yet wired.
4. Adding markdownlint to the repository scripts is part of the implementation
   and touches the toolchain configuration; the plan records it as a dependency.

## Workstream E - Repository conventions

1. The census markers (`<!-- census:begin -->` and its pair) are documented as
   the generated-content contract.
2. The numbered docs are generated; the header says not to edit them by hand.
3. A new document that the census owns is added to the registry, not written
   into the generated file.

## Workstream F - Boundaries

- `rule-mcp-styleguide-fingerprint` owns ASCII punctuation, dashes and prose tells.
- `rule-mcp-styleguide-english` owns American spelling and English-only prose.
- `rule-mcp-process-readme` owns the README structure.
- `rule-mcp-process-adr` owns the ADR template.
- This skill owns the Markdown syntax and the document structure those owners
  write inside.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                 | Rejects                                                | Tier | Source             |
| ----------------------- | ------------------------------------------------------ | ---- | ------------------ |
| `md-single-h1`          | more than one level-one heading                        | A    | CommonMark         |
| `md-heading-order`      | a skipped heading level                                | A    | markdownlint MD001 |
| `md-fence-language`     | a fenced code block with no language                   | A    | GitHub Docs        |
| `md-relative-links`     | an absolute repository URL where a relative path works | B    | This skill         |
| `md-no-trailing-spaces` | trailing spaces outside an intentional hard break      | B    | markdownlint MD009 |
| `md-final-newline`      | a file with no final newline                           | B    | markdownlint MD047 |

Trigger: `.md` files only.

## Verification

1. A `good` and a `bad` snippet per guardrail in the corpus.
2. The link-integrity test extended to the new samples.
3. `prettier --check` over the sample files.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-mcp-process-ai` (HARD)

Feeds: `rule-mcp-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the tooling and the neighboring owners.
- [x] Verify the specifications and the tool documentation.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Rewrite the structure section with the TOC threshold and the frontmatter.
- [ ] Add the GFM section with the six elements.
- [ ] Rewrite the link section with anchors and descriptive text.
- [ ] Replace the generic linter note with Prettier plus markdownlint.
- [ ] Document the census markers and the generated-doc rule.
- [ ] State the four boundaries and link the owners.

### Phase 2 - Guardrails

- [ ] Add the six rules with fixtures and a unit test each.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the Prettier plus markdownlint split and the `.md`-only
      trigger, since the tooling decision is structural.

### Phase 3 - Verification

- [ ] Run the corpus gate.
- [ ] Run the link-integrity test over the samples.
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
pnpm test tests/docs/link-integrity.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- markdownlint is not installed today; the plan adds it deliberately and records
  the dependency rather than assuming it exists.
- The guardrails read Markdown, a new shape for the engine that the router plans
  already anticipate; if the engine cannot carry them yet, they ship as
  repository tests first.
- No local article is cited; the specifications and the tool documentation are
  the sources.
