/** @module scripts/reports/census/marker-targets - refreshed blocks inside the manual docs */

import { table } from "./_markdown.mjs";
import { ENV_VARS } from "./_env-vars.data.mjs";
import { tools, resources, perSkill, coreTools, resourceTotal, skillDirs } from "./_surface.mjs";

// Marker-refreshed blocks in the manual docs
// ─────────────────────────────────────────────────────────────────────────────

export const MARKER_TARGETS = [
  {
    file: "01-product-architecture.md",
    marker: "family-counts",
    build: () =>
      [
        "## Tools at a glance (generated census snapshot)",
        "",
        table(
          ["Family", "Count"],
          [
            ["Core tools", coreTools.length],
            ["Per-skill tools (from `skills/*`)", perSkill.length],
            ["`rule://` resources", resourceTotal],
            ["Skills (`skills/*/SKILL.md`)", skillDirs.length],
          ],
        ),
        "",
        "Refresh with `pnpm census`; full inventories in `docs/07-` .. `docs/12-`.",
        "",
      ].join("\n"),
  },
  {
    file: "05-env-variables.md",
    marker: "env-registry",
    build: () => ["## Environment registry (generated census snapshot)", "", table(["Variable", "Effect"], ENV_VARS), "", "Refresh with `pnpm census`.", ""].join("\n"),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
