

/** Shared constants: where handoffs and ADRs live, trunk names, scan windows, holding verdicts. */

/** Where handoffs live, relative to the project root. */
export const HANDOFF_DIR = "docs/handoff";

/** Where ADRs live, for checking whether a referenced decision landed. */
export const ADR_DIR = "docs/adr";

/** Branches a feature branch is normally merged into, most likely first. */
export const TRUNKS = new Set(["main", "master", "develop"]);

/** How far either side of an ADR reference to look for a claim of pendingness. */
export const PENDING_WINDOW = 140;

/** Verdicts that mean the handoff still describes reality. */
export const HOLDS = new Set(["current", "unchanged", "still proposed"]);
