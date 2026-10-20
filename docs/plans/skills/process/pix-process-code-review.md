# rule-process-code-review - best-practice implementation plan

Status: plan only. Each skill waits for the owner before implementation.
Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`.
Index: `docs/plans/skills/README.md`. Order: `docs/plans/skills/DEPENDENCIES.md`, after `rule-process-npm-release`.

Area: process. Order: reverse alphabetical, thirtieth skill.

## Evidence base

Read and measured in this session:

- `skills/rule-process-code-review/SKILL.md`: 167 lines. Five sections (prepare a reviewable change, review by risk, write actionable feedback, approve and close the loop, reviewing code you did not write), a seven-item checklist and a See also. Section 5 is 70 of the 167 lines.
- `skills/rule-process-code-review/guardrails/`: absent. The skill owns no rule.
- `src/core/review/`: the machinery this skill describes, already built: `personas/` (20 persona documents), `roles/` (the ladder, the catalog, the operation intent), `docs/` (the audit, review and plan trio with `validateTrio`), `persona-file/` and `template/` behind `rule_tool_impersonation`.
- `src/core/review/docs/_validate.js`: the machine format of a finding - `docs/reviews/<role>.md`, a table with Finding, Severity, Status, Evidence and Summary, and a plan whose steps name findings the review holds open.
- `tests/docs/review-docs/`: five tests over that machinery (format, gate, sync, plan checklist, findings).
- `personas/qa.md`, `personas/security.md`, `personas/devx.md`: three of the twenty personas whose whole job is this workflow.
- Ten skills and documents link here, among them `rule-process-ai`, `rule-styleguide-comments` and `rule-process-tdd`, so it is a hub for the review conversation.
- `skills/rule-process-ai/SKILL.md`: holds "Review in both directions, and the human still approves" and "The behaviors AI does not cover", which is the AI half of the same subject.

Problems found:

| Problem                          | Detail                                                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| two severity vocabularies        | the skill labels a comment `blocking`, `non-blocking` or `question`; the machine format stores `high`, `medium` or `low`, and nothing maps the two |
| the machinery is described twice | the skill narrates a workflow that `rule_tool_impersonation` and the trio already run, so a reader cannot tell which is authoritative               |
| the AI half duplicates           | 70 lines of section 5 argue about generated code, dependencies and accumulating debt, which `rule-process-ai` owns after the merge                  |
| no rule at all                   | everything a review must contain is prose, in a workflow the server already produces artifacts for                                                 |
| the checklist is a second source | the seven-item checklist restates the body's rules and drifts from it                                                                              |

## Decisions

| Question         | Decision                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| Severity         | One ladder: the skill's names stay, and they map onto the machine's values in a table the rules enforce        |
| Boundary         | `rule-process-ai` keeps the AI angle, this skill keeps the mechanics, with a link in both directions            |
| Machinery        | The skill points at the commands and documents the server produces instead of restating them, and gets shorter |
| Rules            | Four: the PR template, the finding table, the severity ladder, and evidence that resolves                      |
| Severity of them | The template blocks; the three that read a review document are advisory                                        |
| Delivery         | Plan only                                                                                                      |

## Workstream A - One severity ladder

The skill keeps the three names a reviewer thinks in, and adds the mapping the repository already stores:

| The reviewer writes | The document stores | When                                                             |
| ------------------- | ------------------- | ---------------------------------------------------------------- |
| `blocking`          | `high`              | correctness, security, data loss, compatibility, required policy |
| `non-blocking`      | `medium`            | an improvement that does not prevent a safe merge                |
| `question`          | `low`               | context sought before a defect is assumed                        |

The rules read the document side, so `high`, `medium` and `low` are accepted, and so are the three names, because a consumer project may write either. A value outside the six is the failure.

## Workstream B - The boundary with rule-process-ai

This skill keeps: what makes a change reviewable, the risk order of inspection, how to write a comment, how to close the loop, and the five questions to ask of a diff. `rule-process-ai` keeps: review in both directions, the generated-code argument, the dependency essay and the accumulation-of-debt argument, and the rule that the assistant never approves architecture.

Both files gain one line pointing at the other, and the fourth of section 5's questions ("would the same decision have been made without the assistant") moves, because it is about the assistant rather than about the diff.

## Workstream C - Point at the machinery

The workflow section becomes a table instead of a narrative:

| To do this                   | Use                                                      | The server produces                                                       |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| Run a persona review         | `rule_tool_impersonation` with a role and a target        | `docs/audits/<role>.md`, `docs/reviews/<role>.md`, `docs/plans/<role>.md` |
| Turn findings into work      | the plan the trio derives, checked by the trio validator | a checklist whose steps name open findings                                |
| Check the format of a review | the review-docs test suite                               | a failure naming the file and the rule                                    |

The prose keeps only what a command cannot say: the risk order, the comment shape, and the judgement about when a finding is worth raising at all.

## Workstream D - The four rules

| Rule id                    | Reads                                                                     | Rejects                                                                  | Tier |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---- |
| `review-pr-template`       | `.github/pull_request_template.md` and the three spellings GitHub accepts | a template that omits problem, outcome, non-goals, risks or verification | A    |
| `review-finding-table`     | `docs/reviews/*.md`                                                       | a findings table missing a column, or a row with an empty summary        | B    |
| `review-severity-ladder`   | the Severity cell                                                         | a value outside `high`, `medium`, `low` and their three skill names      | B    |
| `review-evidence-resolves` | the Evidence cell                                                         | a path that does not resolve from the repository root                    | B    |

The template rule blocks because a pull request without those five statements is not reviewable, and the fix is a template edit that takes a minute. The other three are advisory because a project that does not adopt the trio has no review documents at all, and a rule that cannot see its subject must not fail.

## Proposed guardrails

| Rule id                    | Rejects                                                    | Tier | Source                 |
| -------------------------- | ---------------------------------------------------------- | ---- | ---------------------- |
| `review-pr-template`       | an incomplete pull request template                        | A    | This skill, section 1  |
| `review-finding-table`     | a findings table with a missing column or an empty summary | B    | `src/core/review/docs` |
| `review-severity-ladder`   | a severity outside the mapped set                          | B    | This skill, section 3  |
| `review-evidence-resolves` | an evidence pointer at a path that does not exist          | B    | `src/core/review/docs` |

## Phases

### Phase 0 - Evaluation and decisions

- [x] Audit the skill, the machinery it describes and the tests over that machinery.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Add the severity mapping table to section 3.
- [ ] Move the dependency and debt essays, and the assistant question, to `rule-process-ai`; leave a pointer on both sides.
- [ ] Replace the workflow narrative with the machinery table.
- [ ] Merge the seven-item checklist into the rule table and keep only the items no rule can see.
- [ ] Confirm the file is around 110 lines with no claim lost.

### Phase 2 - The rules

- [ ] `review-pr-template` with the four filename spellings and a fixture per shape.
- [ ] `review-finding-table`, including a document with two tables, which is the false positive that matters.
- [ ] `review-severity-ladder`, accepting the three names and the three stored values.
- [ ] `review-evidence-resolves`, with a file-URL and an anchor case that must pass.
- [ ] Register all four in `guardrails/index.js` and the frontmatter, and regenerate the census.

### Phase 3 - Verification

- [ ] Run the gates below.
- [ ] Run the four rules against this repository's own `docs/reviews/` and `.github/`, and fix what they report.
- [ ] Confirm the trio validator and the rules agree: where both check the same thing, the plan says which one is authoritative.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-process-code-review/guardrails/
node --import ./scripts/alias-hook.mjs --test tests/docs/review-docs/
node --import ./scripts/alias-hook.mjs --test src/core/guardrails/__tests__/_enforcement.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
node --import ./scripts/alias-hook.mjs tests/docs/docs-scan.mjs
pnpm census && pnpm census:check
```

## Open notes

- Three of the four rules overlap what `validateTrio` already checks in this repository. The rules exist for a consumer project that has the trio without the test; here the trio validator stays authoritative, and the plan says so in the file rather than letting two checks disagree silently.
- The template rule names four filenames because GitHub accepts `pull_request_template.md`, `PULL_REQUEST_TEMPLATE.md`, and either of them under `.github/` or `docs/`. A repository with none of them fails; a repository using a different forge passes, because the rule only reads what it finds.
- Section 5 loses its two essays and keeps its five questions. If the owner would rather keep the essays here, the boundary decision reverses and `rule-process-ai` loses them; the plan records the trade because the two skills cannot both own the same argument.
- The severity mapping is the kind of decision that looks cosmetic until a review document is read by a tool. It is one table, in one place, and the rule enforces the machine side.
