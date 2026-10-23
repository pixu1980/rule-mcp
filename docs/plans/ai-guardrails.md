# rule-ai guardrails execution plan

Status: `superseded` by `docs/plans/skills/skills-plan.md` (ADR 153). Absorbed by: rule-ai-agent-architecture.
Notes:`superseded` by `docs/plans/skills/skills-plan.md` (ADR 153). Absorbed by: rule-ai-agent-architecture. Notes:`superseded` by `docs/plans/skills/skills-plan.md` (ADR 153). Absorbed by: rule-ai-agent-architecture, one rule set per plan. Graph: not a node; see the absorbed table in `skills-plan.md`.

Scope: give the AI area its first deterministic guardrails, keep the rest of the
area narrative, and record every rule against a citable public source.
Implementation happens in a dedicated session: this document is the plan only.

Companion plans: `docs/plans/devops-guardrails.md`, `docs/plans/backend-guardrails.md`.
Enforcement and delivery follow the devops decisions (advisory first, then
blocking; fixtures, unit tests, inheritance test; census, ADR, changelog,
per-rule source).

## Evidence base

Audited in this session (read-only):

- `skills/rule-ai/SKILL.md` (router, no guardrails)
- `skills/rule-ai-agent-architecture/SKILL.md` (207 lines)
- `skills/rule-ai-context-engineering/SKILL.md` (195 lines)
- `skills/rule-ai-evals/SKILL.md` (247 lines)
- `skills/rule-ai-prompting/SKILL.md` (159 lines)
- `src/core/layers/_inherit.js` (inheritance needs an `inherits:` line)

Current state: 5 skills, 0 guardrails, 0 `inherits` lines. The area is the only
one besides `rule-ui` with no deterministic check at all.

Sources fetched and used:

- OWASP Top 10 for LLM Applications 2025, https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/
- OWASP LLM01 Prompt Injection, https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- MCP Security Best Practices, https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices
- NIST AI Risk Management Framework, https://www.nist.gov/itl/ai-risk-management-framework
- OpenTelemetry GenAI semantic conventions, https://github.com/open-telemetry/semantic-conventions-genai
- OpenAI API error codes, https://platform.openai.com/docs/guides/error-codes
- Anthropic API errors, https://docs.anthropic.com/en/api/errors

## Decisions from the interview

| Question      | Decision                                                             |
| ------------- | -------------------------------------------------------------------- |
| Target skills | `rule-ai` owns the shared rules; the area stays otherwise narrative   |
| Scope         | High-signal selection (4-6)                                          |
| Candidates    | All eight selected                                                   |
| Trigger       | Devops default: target file or content heuristic, no universal sweep |
| Severity      | Devops default: advisory, then blocking after corpus proof           |
| Corpus/tests  | Devops default: fixtures, unit tests, inheritance test               |
| Artifacts     | Devops default: frontmatter, census, ADR, changelog, per-rule source |
| Phasing       | Plan only now; implementation in a dedicated session                 |

### Open item: how the shared rules reach the four children

The four child skills declare no `inherits`, so rules owned by `rule-ai` do not
reach them. Two ways:

1. **Recommended**: add `inherits: [rule-ai]` to `rule-ai-agent-architecture`,
   `rule-ai-context-engineering`, `rule-ai-evals` and `rule-ai-prompting`, the way
   the backend and data children already inherit their umbrella.
2. Keep the rules on `rule-ai` only, and accept that a check routed to a child
   skill runs without them.

### Tiering: six rules against a 4-6 budget

Tier A: `ai-tool-schema`, `ai-call-timeout`, `ai-max-tokens`,
`ai-output-validated`, `ai-no-secrets-in-prompt`, `ai-trace-span`.

Tier B: `ai-eval-presence`, `ai-mcp-token-validation`.

`ai-trace-span` overlaps with `obs-span-versioning` in the devops plan: this rule
checks that a generation span exists at all, the devops rule checks that it
carries the prompt and model version. Only one of the two owns each claim.

## Accepted rules

| Rule id                   | Rejects                                                       | Tier | Source                       |
| ------------------------- | ------------------------------------------------------------- | ---- | ---------------------------- |
| `ai-tool-schema`          | tool definition with no parameter schema                      | A    | MCP spec; agent architecture |
| `ai-call-timeout`         | model or tool call without a timeout or abort signal          | A    | Node.js docs; OpenAI errors  |
| `ai-max-tokens`           | model call with no explicit output cap                        | A    | OpenAI errors; Anthropic     |
| `ai-output-validated`     | parsed model output without schema validation                 | A    | OWASP LLM05                  |
| `ai-no-secrets-in-prompt` | credentials or personal data interpolated into a prompt       | A    | OWASP LLM02 and LLM01        |
| `ai-trace-span`           | model call with no generation span                            | A    | OpenTelemetry GenAI semconv  |
| `ai-eval-presence`        | agent project with no eval dataset or CI eval gate            | B    | rule-ai-evals; NIST AI RMF    |
| `ai-mcp-token-validation` | MCP server accepting a token without audience and scope check | B    | MCP Security Best Practices  |

## Enforcement model

1. **Owner**: `rule-ai` gets a `guardrails/index.js` with the rules above.
2. **Triggers**: content heuristics narrowed to files that import a known model
   SDK or declare tools; a file with no model call returns `pass: true`.
3. **Advisory first**: Tier A promotes to blocking after 100% precision and
   recall in the corpus; Tier B stays advisory.
4. **Tests**: a `good` and a `bad` entry per rule in
   `tests/fixtures/guardrail-corpus.mjs`, one unit test per rule under
   `guardrails/__tests__/`, and an inheritance test once the open item is
   decided.

## Phases

## Dependency graph

Absorbed or outside the graph: listed for completeness, not executed as a node.

Depends on: -

Feeds: -

Shared files: none: absorbed into the leaf plans named above

### Phase 0 - Decisions and scaffolding

- [x] Audit the five skills.
- [x] Fetch and record the public sources.
- [x] Interview the owner and record the decisions.
- [ ] Confirm the `inherits` change (open item).
- [ ] Create the ADR for the AI guardrail family.

### Phase 1 - Shared rules in rule-ai

- [ ] Implement `ai-tool-schema`, `ai-call-timeout`, `ai-max-tokens`.
- [ ] Implement `ai-output-validated`, `ai-no-secrets-in-prompt`,
      `ai-trace-span`.
- [ ] Implement `ai-eval-presence` and `ai-mcp-token-validation` as Tier B.
- [ ] Add corpus fixtures, unit tests and the inheritance test.
- [ ] Update `rule-ai/SKILL.md` frontmatter and rule section.

### Phase 2 - Promotion and documentation

- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.
- [ ] Run the gates below and add the changelog entry.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                  | Class      | Model                   | Why                            |
| ------------------------------------- | ---------- | ----------------------- | ------------------------------ |
| Phase 0 - Decisions and scaffolding   | `T1-plan`  | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Shared rules in rule-ai      | `T3-rules` | `kimi-k2.7-code`        | small deterministic code       |
| Phase 2 - Promotion and documentation | `T3-rules` | `kimi-k2.7-code`        | small deterministic code       |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

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
- `docs/plans/data-guardrails.md` - the sibling plan for the data area
