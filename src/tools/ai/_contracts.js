

import { FLEX_FIRST } from "../../core/index.js";

/** The minimal-change contract every routing answer carries. */
export const SCOPE_CONTRACT = {
  rule: "Build exactly what the request states. Anything beyond it is proposed in prose, never written into the codebase.",
  declare_first: ["files_to_change", "out_of_scope"],
  forbidden_without_explicit_request: [
    "new tables, columns, or indexes",
    "audit, history, or soft-delete structures",
    "config flags, feature toggles, or env vars",
    "interfaces, base classes, or layers with a single caller",
    "caching, retries, queues, or background jobs",
    "new packages, services, or endpoints",
  ],
  when_in_doubt: "Ship the smaller version and list what you deliberately left out.",
};

/** The flex-first layout contract attached to styling routes. */
export const STYLING_CONTRACT = {
  layout: FLEX_FIRST,
  grid_only_for: [
    "named template areas (grid-template-areas)",
    "subgrid",
    "explicit item placement or deliberate overlap (grid-area, grid-column, grid-row)",
    "auto-fit / auto-fill tracks (repeat(auto-fit, minmax(...)))",
  ],
  otherwise: "display: flex with gap; flex-wrap: wrap plus flex: 1 1 <basis> for a wrapping set.",
  when_grid_is_right: "Say which of the four it is in a `/* grid: why */` comment above the rule.",
};

/** Routes that end in stylesheets, and therefore carry the layout contract. */
export const STYLING_ROUTES = /^rule-mcp-(?:frontend|ui|platform-(?:web|desktop|expo))|^rule-mcp-styleguide-(?:css|html|a11y)$/;
