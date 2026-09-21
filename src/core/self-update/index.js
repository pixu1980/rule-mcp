

/** Self-update barrel: policy, the run, the banner, the scheduler. */
import { registerCallHost } from "../../tools/router/call/_host.js";
import { consumeUpdateBanner, maybeSelfUpdate } from "./_schedule.js";

// The invocation path reaches self-update through the call host instead of
// importing it, which is what keeps router and updater out of a cycle. Loading
// this barrel is the registration.
registerCallHost({ beforeCall: () => maybeSelfUpdate(), banner: consumeUpdateBanner });

export * from "./_config.js";
export * from "./_run.js";
export * from "./_banner.js";
export * from "./_schedule.js";
