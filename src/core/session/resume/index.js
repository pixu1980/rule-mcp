/**
 * @module core/resume
 *
 * The handoff a resumed session would otherwise have to be asked for.
 *
 * `rule_tool_process_handoff` writes the snapshot and `rule_tool_process_handon`
 * verifies it against the repository as it is now (ADR 051). Both are typed by
 * hand, and the session that most needs them is the one where nobody types
 * anything: the user reopens the agent with `resume` hours later and asks the
 * next question, while the file that says where the work stopped sits unread in
 * `docs/handoff/`.
 *
 * The harness already knows. SessionStart carries `source: "resume"`, so the
 * hook that injects the session directive can inject the verified handoff in the
 * same process, before the first prompt is answered.
 *
 * Not every harness spells it that way. `pi resume` and its equivalents turn the
 * word into the user's first message, and no hook fires at all - an MCP server
 * has no session-start event to listen to. But it does see the prompt the moment
 * the model routes it, which is the same moment, so the prompt is the second
 * signal: `resumeAnnouncement` for the tool path, `resumeContext` for the hook.
 *
 * Two doors, one page. The hook cannot see the server's module latch, so it
 * leaves a record in the state directory and the tool path reads it: injected
 * after this process started means injected during this session, and stays
 * quiet. An older record is a previous session's and suppresses nothing.
 *
 * Three deliberate limits:
 *
 *   - **Resume only.** `startup` is a new session, `fork` inherits the context
 *     it forked from, and `clear` is a wipe the user asked for. Injecting a
 *     handoff into any of those overrides an intention rather than serving one.
 *   - **Verified, never restated.** The injected text is handon's output, so a
 *     merged branch or a landed ADR arrives labeled as changed. A hook that
 *     pasted the handoff would hand the model a stale snapshot with the
 *     confidence of the original, which is the failure ADR 051 exists to stop.
 *   - **Silent when there is nothing.** No handoff means no injection. An
 *     apology for an absent file is tokens spent to say nothing.
 *
 * Opt out with `RULE_MCP_NO_RESUME_HANDON=1`.
 *
 * @see module:cli/guard - the hook that calls this
 * @see module:tools/handon - the verification being reused
 */

export * from "./_context.js";
export * from "./_signal.js";
export * from "./_announce.js";
