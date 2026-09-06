// Auto-split from src/core/guardrails/quality.js - see ./quality/index.js
import { manifestOf } from "./guards-meta.js";

export const QUALITY_GUARDRAILS_PART3 = [
  {
    id: "pkg-no-corepack",
    label: "No corepack activation fields",
    description:
      "No `packageManager` field and no `devEngines.packageManager`. Both hand control of the install to corepack, which can then refuse it - offline, behind a proxy, or shadowing the package manager already installed. `engines` stays legal: it asserts a version, it does not fetch one.",
    check: (code, context) => {
      const manifest = manifestOf(code, context);

      if (!manifest) {
        return { pass: true, note: "Not a package.json, skipping" };
      }

      const offenders = [];

      if (manifest.packageManager !== undefined) {
        offenders.push(`packageManager: ${JSON.stringify(manifest.packageManager)}`);
      }

      if (manifest.devEngines?.packageManager !== undefined) {
        offenders.push("devEngines.packageManager");
      }

      return {
        pass: offenders.length === 0,
        failCount: offenders.length,
        detail: offenders,
        suggestion:
          "Delete the field. Pin Node with .nvmrc and the dependency tree with the lockfile; state the package manager in the README if a human needs to know.",
      };
    },
  },
  {
    id: "no-speculative-audit-table",
    label: "No audit/history table without a consumer",
    description:
      "A new audit/history/log/event/archive table that nothing else in the change reads or writes is speculative structure. Covers SQL `CREATE TABLE` and Prisma `model` blocks, in snake_case or PascalCase. Add it when a consumer exists.",
    check: (code) => {
      // Name-shape check, not a naming-convention check: the first version of
      // this rule matched `_events` and silently passed `PaymentWebhookEvent`,
      // which is exactly the table a real session had to remove ten hours and
      // one applied migration later. Split on separators AND case boundaries.
      const suffix =
        /^(?:audit|audits|history|histories|log|logs|event|events|archive|archives|journal|trail|snapshot|snapshots)$/i;
      const lastToken = (name) =>
        name
          .replaceAll(/["`']/g, "")
          .split(".")
          .pop()
          .split(/[_\s-]+|(?<=[a-z0-9])(?=[A-Z])/)
          .findLast(Boolean) ?? "";
      const created = [
        ...[...code.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?["`']?([\w.]+)["`']?/gi)].map(
          (match) => match[1],
        ),
        ...[...code.matchAll(/^\s*model\s+([A-Za-z_]\w*)\s*\{/gm)].map((match) => match[1]),
      ].map((name) => name.replaceAll(/["`']/g, "").split(".").pop());
      const auditLike = [...new Set(created.filter((name) => suffix.test(lastToken(name))))];

      if (auditLike.length === 0) {
        return { pass: true, note: "No audit-style table created" };
      }

      const orphans = auditLike.filter((name) => {
        // Strip the table's own definition - its DDL statements and, for Prisma,
        // the whole model block - then look for any surviving mention.
        const ddl = new RegExp(String.raw`create\s+(?:unique\s+)?(?:table|index)[^;]*?\b${name}\b[^;]*;?`, "gi");
        const model = new RegExp(String.raw`^\s*model\s+${name}\s*\{[\s\S]*?^\}`, "gm");

        return !new RegExp(String.raw`\b${name}\b`, "i").test(code.replace(ddl, " ").replace(model, " "));
      });

      return {
        pass: orphans.length === 0,
        failCount: orphans.length,
        detail: orphans,
        suggestion: "Drop the table until something reads or writes it, or show the consumer in the same change.",
      };
    },
  },
  {
    id: "no-future-use-code",
    label: "No code kept for an imagined future",
    description:
      'Markers like "for future use", "in case we need", or "just in case" mark code written for a requirement that does not exist yet.',
    check: (code) => {
      const markers =
        code.match(
          /(?:for future use|for now unused|not used yet|in case we (?:need|want)|might need (?:it|this|them) later|will be needed later|just in case|reserved for future|future-proof(?:ing|ed)?|placeholder for future)/gi,
        ) || [];

      return {
        pass: markers.length === 0,
        failCount: markers.length,
        detail: [...new Set(markers)].slice(0, 10),
        suggestion: "Delete the speculative code. Write it when the requirement arrives - version control remembers.",
      };
    },
  },
  {
    id: "no-commented-out-code",
    label: "No implementations parked in comments",
    description:
      "Three or more consecutive commented-out lines of code are a parked implementation. Delete them; git keeps the history.",
    check: (code) => {
      const codeish =
        /[;{}]$|=>|^(?:const|let|var|function|class|return|if|for|while|switch|import|export|await|async)\b|^\}/;
      let run = 0;
      let longest = 0;
      let sample = [];
      let current = [];

      for (const line of code.split("\n")) {
        const comment = line.match(/^\s*(?:\/\/|#)\s?(.*)$/);
        const body = comment ? comment[1].trim() : null;

        if (body && codeish.test(body)) {
          run += 1;
          current.push(body);

          if (run > longest) {
            longest = run;
            sample = [...current];
          }
        } else {
          run = 0;
          current = [];
        }
      }

      return {
        pass: longest < 3,
        failCount: longest >= 3 ? longest : 0,
        detail: longest >= 3 ? sample.slice(0, 5) : [],
        suggestion:
          "Delete the commented-out block. If it is a documented alternative, put the reasoning in an ADR instead.",
      };
    },
  },
];
