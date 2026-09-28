

/**
 * @module core/sync
 *
 * The branch-synchronization guard.
 *
 * Loading this module registers it as a call host, so every tool invocation
 * asks git whether the base branch has moved and surfaces the verdict once. The
 * check is deterministic (WS1 primitives), event-driven (a call happened), and
 * never rebases anything: the rebase is a separate, confirmed step in
 * `rule_tool_sync`.
 *
 * @see docs/plans/mcp-git-workflow-evolution-plan.md - WS2
 */

import { registerCallHost } from "../../tools/router/call/_host.js";
import { consumeSyncNotice, maybeSyncCheck } from "./_guard.js";

// The invocation path reaches the guard through the call host instead of
// importing it, which is what keeps router and guard out of a cycle. Loading
// this barrel is the registration.
registerCallHost({
  beforeCall: () => {
    void maybeSyncCheck();
  },
  banner: consumeSyncNotice,
});

export * from "./_config.js";
export * from "./_guard.js";
export * from "./_rebase.js";
