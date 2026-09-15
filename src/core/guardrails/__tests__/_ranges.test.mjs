

/** T0-T2: the rules are shared, ranges fail wherever they hide, non-ranges stay legal. */
import { COREPACK, EXACT, check, fails, finish, getGuardrails, run } from "./_manifest.fixture.mjs";
import "./_install.fixture.mjs";

console.log("=== package.json guardrails: exact versions ===\n");

// ── T0: the guardrails exist and are shared, not skill-specific ──
const ids = new Set(getGuardrails("rule-styleguide-javascript").map((g) => g.id));
check("T0 both guardrails are shared", ids.has(EXACT) && ids.has(COREPACK));
check(
  "T0.1 they are shared for every skill",
  ["rule-frontend-react", "rule-backend-node", "rule-data-sql"].every((skill) => getGuardrails(skill).some((g) => g.id === EXACT)),
);

// ── T1: ranges are rejected, wherever they hide ──
check("T1 a caret range fails", fails({ dependencies: { prettier: "^3.9.4" } }, EXACT));
check("T1.1 a tilde range fails", fails({ devDependencies: { eslint: "~10.8.0" } }, EXACT));
check("T1.2 a comparator fails", fails({ dependencies: { zod: ">=4.0.0" } }, EXACT));
check("T1.3 an alternation fails", fails({ dependencies: { react: "18.0.0 || 19.0.0" } }, EXACT));
check("T1.4 a wildcard fails", fails({ dependencies: { lodash: "*" } }, EXACT));
check("T1.5 a dist-tag fails", fails({ dependencies: { next: "latest" } }, EXACT));
check("T1.6 an x-range fails", fails({ dependencies: { vite: "7.x" } }, EXACT));
check("T1.7 optionalDependencies are checked too", fails({ optionalDependencies: { fsevents: "^2.3.3" } }, EXACT));
check(
  "T1.8 the offender is named",
  (() => {
    const failure = run({ dependencies: { prettier: "^3.9.4", zod: "4.1.13" } }).failed.find((f) => f.id === EXACT);

    return failure?.detail?.some((line) => line.includes("prettier")) && failure.detail.every((line) => !line.includes("zod"));
  })(),
);

// ── T2: what is not a range stays legal ──
check("T2 an exact version passes", !fails({ dependencies: { prettier: "3.9.4" } }, EXACT));
check("T2.1 a prerelease passes", !fails({ dependencies: { vite: "8.0.0-beta.3" } }, EXACT));
check("T2.2 a workspace protocol passes", !fails({ dependencies: { ui: "workspace:*" } }, EXACT));
check("T2.3 a catalog reference passes", !fails({ dependencies: { react: "catalog:" } }, EXACT));
check("T2.4 file and link protocols pass", !fails({ dependencies: { a: "file:../a", b: "link:../b" } }, EXACT));
check("T2.5 a git dependency passes", !fails({ dependencies: { tool: "git+https://example.com/t.git#v1.2.3" } }, EXACT));
check("T2.6 an aliased exact version passes", !fails({ dependencies: { react: "npm:react@19.2.0" } }, EXACT));
check("T2.7 peerDependencies may declare a range: it states compatibility, not an install", !fails({ peerDependencies: { react: "^18.0.0 || ^19.0.0" } }, EXACT));

finish();
