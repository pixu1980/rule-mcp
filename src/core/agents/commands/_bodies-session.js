

/** @module core/agents/commands/bodies-session - the session task command bodies */

/**
 * The handoff command body (request-driven session handoff + atomic commits).
 * When the working tree is dirty, pending work is committed as a sequence of
 * scoped Conventional Commits, followed by a separate commit for pending decision
 * documents. The generated handoff is then written to docs/handoff/ and committed
 * on its own, so it survives the session instead of living only in the chat. The
 * document closes with its resume prompt, which is also the block the chat shows,
 * so the pasted block and the file cannot drift apart.
 * Commits stay local - the flow never pushes.
 */
export const HANDOFF_BODY = [
  "Generate a session handoff and commit pending work: $ARGUMENTS",
  "",
  '0. Feature close (`--close-feature`, optionally `--squash`): run `rule_tool_git` action=audit first (force=true when squashing). Report the base branch, merge base, range, Conventional Commit violations and merge commits; propose `rule_tool_sync` when the branch is behind its base, and `/rule-git` when violations or merges remain. With `--squash`, propose ONE `type(scope): subject` message for the WHOLE feature (not the last session) from its commits, diff and ADRs; show the base branch, merge base, commit count, commit range, the commits being squashed and the proposed message; ask the user to confirm; only then call `rule_tool_git` action=squash force=true confirm=true message="<the message>". That single commit also folds the feature ADRs and handoffs into one document each (deterministic concatenation, originals deleted, both indexes rebuilt), and refuses if any path other than the planned ones changed. Report one commit, the consolidated documents, the working tree, and the documents cited but outside the range (left untouched). The squash is never run without that confirmation, and `force` never replaces it. Write the final feature handoff AFTER the squash and commit it alone, as step 3 below.',
  "1. Run `rule_tool_handoff` (default mode `handoff`, all includes on). Pass any tokens from the arguments through unchanged (e.g. `close-session`, `compress`, `brief`, `no-diff`, `no-archive`, `max=<n>`). The run archives completed audits/reviews/plans as ADRs by default and repairs the ADR numbering, so it writes to the tree; `no-archive` keeps it a read-only diagnosis.",
  "2. If the working tree has pending changes, commit them BEFORE emitting the handoff as a sequence of ATOMIC commits:",
  "   a. Group changed files by concern (one coherent change per group).",
  "   b. Stage each group explicitly (pathspecs or `git add -p`) and commit with Conventional Commits AND a mandatory scope: `type(scope): subject` (e.g. `feat(cli): ...`, `chore(eslint): ...`). The `commit-msg` hook rejects scope-less messages.",
  "   c. After the code/config commits, make ONE SEPARATE final commit for decision documents already pending in the tree (ADR, CHANGELOG, docs/): `docs(adr): ...` or `docs(handoff): ...`.",
  "   d. NEVER push. Leave every commit local for review.",
  '   e. MANDATORY dependency policy: before committing, every dependency is an exact `"name": "x.y.z"` pin - never `^`, `~`, `*` or a range, because a range lets a sub-dependency arrive without a decision. Pin each ranged specifier with the project\'s package manager and `--save-exact` (e.g. `pnpm add <name>@latest --save-exact`), refresh the lockfile, and fold the manifest change into the commit group it belongs to.',
  "3. Persist the handoff: write it to `docs/handoff/<NN>-<slug>.md` where NN is the next free two-digit number in that directory and <slug> is a kebab-case topic (e.g. `13-security-audit-remediation.md`). Open with the branch, the commit range it covers, and the date. The document ENDS with its `### Resume Prompt` section: complete the block the renderer emitted, in place, with the path of this file and the first step of the next session, and leave nothing after the closing fence. Then commit that file ALONE - no other paths - as `chore(handoff): add session handoff <NN>-<slug>`. A handoff that exists only in the chat is lost when the session ends.",
  "4. Present the handoff as a paste-ready block for the next session: quote the finished `### Resume Prompt` block verbatim, then list the commits just created. The document is the source; the chat is a copy of it.",
  "5. If the grouping into atomic commits is ambiguous, ask the user how to split before committing.",
  "6. Write the handoff and every commit message in English, American spelling (color, behavior, organize).",
  "7. Responses are compressed automatically by the server: keep the handoff factual and free of filler.",
].join("\n");

/**
 * The handon command body: verify the last handoff via rule_tool_handon.
 */
export const HANDON_BODY = [
  "Verify the last handoff against the repository now: $ARGUMENTS",
  "",
  "1. Call `rule_tool_handon` for this project (or `rule-mcp handon --dir .`). Pass any tokens from the arguments through unchanged (e.g. `list`, `file=<path>`, `no-archive`).",
  "2. Every claim it returns carries its own verdict: act on what is still true, re-derive what changed, and treat unverified as unknown.",
  "3. The call also sweeps completed audits/reviews/plans into ADRs and reports them under Closeout. Those writes are uncommitted: stage them as one `docs(adr): ...` commit (pass `no-archive` to skip the sweep).",
  "4. Under `Next from the plans` it proposes the first open step of each plan that still has one. Present that proposal and ask the user which workstream to start. Do not begin it unprompted.",
  "5. Finish by proposing a conventional commit with a mandatory scope if the repo changed.",
  "6. Responses are compressed automatically by the server: keep it factual and free of filler.",
].join("\n");

/** /rule-git → rule_tool_git (audit, reword, linearize). */
export const GIT_BODY = [
  "Audit the feature history and normalize it: $ARGUMENTS",
  "",
  "1. Run `rule_tool_git` action=audit, passing `force: true` when the arguments contain `--force`. Read the base branch, merge base, commit range, commit count, Conventional Commit violations and merge commits.",
  "2. The commit selection is deterministic: take the violations from the audit; never re-derive the range. For each one, read the commit (`git show <sha>`) and propose a `type(scope): subject` message that describes it.",
  "3. Show every proposal as `OLD -> NEW` and ask the user to confirm. Rewrite nothing before that confirmation.",
  "4. After confirmation, call `rule_tool_git` action=reword confirm=true with `rewrites=[{sha, message}, ...]`, and pass `force: true` when the arguments say `--force`. The tool refuses a message that is not `type(scope): subject`, a sha outside the feature range, and any call without confirmation.",
  "5. When merge commits are present and `--force` was passed, call `rule_tool_git` action=linearize force=true confirm=true only after the user confirms. `--force` enables the proposal; it never bypasses the confirmation gate.",
  "6. After any rewrite, report the verification: commit count, merge commits, and whether the final tree is unchanged. A rewrite that changed the tree is rolled back by the tool.",
  "7. NEVER push. NEVER resolve a conflict automatically: if a rewrite stops or is rolled back, report the conflicted files and stop.",
  "8. Write in English, American spelling (color, behavior, organize).",
].join("\n");

/** /rule-compress → rule_tool_compress (ADR 115 sole engine). */
export const COMPRESS_BODY = [
  "Compress text with rule_tool_compress: $ARGUMENTS",
  "",
  "1. Call `rule_tool_compress` with the text to transform. Mode: both | compression | fingerprint (default both).",
  "2. This is the sole compression engine: inbound prompt/context preprocessing and outbound prose postprocessing.",
  "3. Keep code fences, URLs and JSON intact. Report tokens before/after when returned.",
  "4. If no text is in the chat, ask the user what to compress before calling the tool.",
  "5. Finish by proposing a conventional commit with a mandatory scope only if a tracked file changed.",
].join("\n");

/** /rule-stats → rule_tool_stats. */
export const STATS_BODY = [
  "Read local telemetry: $ARGUMENTS",
  "",
  "1. Call `rule_tool_stats` and report calls, cache hits, tokens, latency, reminder overhead.",
  "2. Propose only changes the numbers support; ask before acting on an ambiguous reading.",
  "3. Finish by proposing a conventional commit with a mandatory scope only if docs change.",
].join("\n");

/** /rule-usage → rule_tool_usage. */
export const USAGE_BODY = [
  "Declare usage sidecar: $ARGUMENTS",
  "",
  "1. Call `rule_tool_usage` with the token/cost evidence the host did not provide as a transcript.",
  "2. Do not invent numbers; ask the user when evidence is missing.",
  "3. Finish by proposing a conventional commit with a mandatory scope only if a tracked file changed.",
].join("\n");

/** /rule-init → rule_tool_init. */
export const INIT_BODY = [
  "Prepare this project for rule-mcp: $ARGUMENTS",
  "",
  "1. Call `rule_tool_init` (or `rule-mcp init --dir .`). Pass `no-tokensave` / `noTokensave` when the arguments carry it. It is idempotent: missing installs, incomplete is integrated, correct is preserved.",
  "2. Report what it answered, per item, without restating it as done when it says `existing` or `refused`: the central recorder directory under `~/.rule-mcp/projects/` (a local `.rule-mcp` an earlier version left behind is migrated, and recorder state is never read from the project), the `commit-msg` and `pre-push` gates that enforce `type(scope): subject` (in `core.hooksPath`, `.husky` or `.githooks`, whichever the project keeps - an existing mechanism is integrated, never replaced), tokensave (`initialized`, `failed: ...` or `not installed`), the release tooling it detected, and every ranged specifier it found.",
  "3. MANDATORY dependency policy: every dependency is an exact `x.y.z` pin - never `^`, `~`, `*` or a range, because a range lets a sub-dependency arrive without a decision. Pin each ranged specifier init reported with the project's package manager and `--save-exact` (e.g. `pnpm add <name>@latest --save-exact`), refresh the lockfile, and report the manifests that changed. `workspace:`, `file:`, `link:` and `npm:` aliases are not ranges and are left alone.",
  "4. When the project has no framework config yet (a fresh checkout, an empty repo) and the arguments do not say `no-scaffold`, call `rule_tool_detect`, then `rule_tool_styleguide mode=scaffold` for the missing config and toolchain files.",
  "5. Check the project's test setup exists; when there is no test surface, ask the user what to cover.",
  "6. When the base branch is not `develop`, `main` or `master`, or the branch was cut from another feature branch, tell the user to state it once: `git config rule.baseBranch <name>`.",
  "7. Finish by proposing a conventional commit with a mandatory scope, e.g. `chore(init): ...`.",
].join("\n");
