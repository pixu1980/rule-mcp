

/**
 * @module scripts/data/router-gaps
 *
 * Area routers that do not list every skill under them.
 *
 * An area router is a table of links, and a table written by hand drifts the
 * moment a skill is created, renamed or moved. The coverage test in
 * `src/core/skills/__tests__/_router-child-coverage.test.mjs` compares each
 * router against the directories, and this file records the gaps that already
 * existed when the test landed, so the test fails on a new gap without failing
 * on the backlog.
 *
 * The list only shrinks. A router plan that adds a missing row deletes its entry
 * here; the test fails if an entry stops being a gap, so an entry cannot outlive
 * the row it excuses.
 */

/** `rule-mcp-<area>` -> the children its table does not link yet. */
export const ROUTER_GAPS = {
  "rule-mcp-devops": ["rule-mcp-devops-deploy-preview"],
  "rule-mcp-frontend": ["rule-mcp-frontend-template-engine"],
  "rule-mcp-platform": ["rule-mcp-platform-auth"],
  "rule-mcp-process": ["rule-mcp-process-tdd"],
  "rule-mcp-styleguide": ["rule-mcp-styleguide-comments", "rule-mcp-styleguide-file-tree"],
};
