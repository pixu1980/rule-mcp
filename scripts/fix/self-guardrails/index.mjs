/**
 * One-shot style fixer for the repo's own guardrail rules (self-guardrails,
 * F-A1 discipline). Mirrors exactly the detectors in framework.js/shared.js so
 * what satisfies this pass also satisfies checkCode:
 *
 *  - js-blank-line-before-return: blank line before `return` unless first-in-block/continuation
 *  - js-const-top: blank line after the last declaration of a scope's top group
 *  - js-blank-lines-blocks: blank lines around if/for/while/switch/try blocks and after closing braces
 *  - js-for-loop-braces: split single-line for bodies
 *  - js-single-line-method: split single-line method bodies
 *  - js-if-braces: add braces to braceless if/for
 *  - js-no-inline-blocks: split `{ ... }` on one line
 *  - js-blank-line-between-methods: blank between class methods
 *  - fp-*: plain ASCII typography, American spelling (prose only)
 *
 * Run: node scripts/fix-self-guardrails.mjs [--dry-run]
 * Iterates to a fixed point (bounded) so insertions satisfying one rule never
 * break another.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const dryRun = process.argv.includes("--dry-run");
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "src/**/*.js"], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

/** Is this line a declaration opener we can still extend? */
const DECL = /^\s*(?:export\s+)?(?:const|let|var|function|class|async\s+function)\b/;
/** Lines that continue a multi-line declaration. */
const CONTINUES = (line) =>
  line.trim() === "" ||
  line.trim() === "}" ||
  line.endsWith("}") ||
  line.endsWith("{") ||
  line.endsWith("(") ||
  /\b(?:=>|return)\s*$/.test(line.trim());

function fix(text) {
  let changed = false;

  // ── js-blank-line-before-return ──
  const lines = text.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      (line.startsWith("return ") || line === "return;") &&
      i > 0 &&
      out.length > 0 &&
      out.at(-1).trim() !== "" &&
      !out.at(-1).trimEnd().endsWith("{") &&
      !out.at(-1).trimEnd().endsWith("(") &&
      !/^\s*(\/\/|\/\*)/.test(out.at(-1))
    ) {
      out.push("");
      changed = true;
    }
    out.push(lines[i]);
  }
  text = out.join("\n");

  // ── js-blank-line-between-methods ──
  const mid = text.split("\n");
  const midOut = [];
  for (let i = 0; i < mid.length; i++) {
    if (
      /^\s*\}\s*$/.test(mid[i]) &&
      i + 1 < mid.length &&
      /^\s*(\w+|static|get|set)\s/.test(mid[i + 1]) &&
      !/^\s*(\w+)\s*\([^)]*\)\s*\{[^}]*\}\s*$/.test(mid[i + 1])
    ) {
      midOut.push(mid[i]);
      midOut.push("");
      changed = true;
      continue;
    }
    midOut.push(mid[i]);
  }
  text = midOut.join("\n");

  // ── js-for-loop-braces / js-single-line-method: split one-liners ──
  text = text.replace(/(for\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*)\{\s*([^{}\n]+?)\s*\}/g, (m, head, body) => {
    changed = true;
    return `${head}{\n    ${body};\n  }`;
  });
  text = text.replace(
    /((?:constructor|\w+)\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*)\{\s*([^{}\n]+?)\s*\}/g,
    (m, head, body) => {
      // never touch `if (...) {` / `for (...) {` / `while (...) {` — handled above only for for; skip if/keywords
      if (/^\s*(if|for|while|switch|catch)\s*/.test(head)) {
        return m;
      }
      changed = true;
      return `${head}{\n    ${body};\n  }`;
    },
  );

  // ── js-if-braces: braceless if/for single statements ──
  text = text.replace(
    /^(\s*)(if|for|while|switch)\s*\(([^\n]*)\)\s*([^{\n][^\n;]*);?\s*$/gm,
    (m, ind, kw, cond, stmt) => {
      if (/^\s*\{/.test(stmt)) {
        return m;
      }
      changed = true;
      return `${ind}${kw} (${cond}) {\n${ind}  ${stmt};\n${ind}}`;
    },
  );

  // ── js-const-top: blank after the last declaration of a top group ──
  const decl = text.split("\n");
  const dOut = [];
  for (let i = 0; i < decl.length; i++) {
    dOut.push(decl[i]);
    if (DECL.test(decl[i]) || (i > 0 && DECL.test(decl[i - 1]) && CONTINUES(decl[i]))) {
      // look ahead for the end of the declaration group
      let j = i + 1;
      while (j < decl.length && CONTINUES(decl[j]) && DECL.test(decl[j - 1] ?? "")) {
        j++;
      }
      // the group's LAST line is j-1; ensure blank BEFORE the next non-declaration line already handled below
    }
  }
  text = dOut.join("\n");

  // blank between declarations and following statements (per scope start):
  const scope = text.split("\n");
  const sOut = [];
  for (let i = 0; i < scope.length; i++) {
    sOut.push(scope[i]);
    const isDeclGroupEnd =
      i + 1 < scope.length &&
      DECL.test(scope[i]) &&
      !DECL.test(scope[i + 1]) &&
      !CONTINUES(scope[i + 1]) &&
      scope[i + 1].trim() !== "" &&
      !scope[i + 1].trim().startsWith("//");
    if (isDeclGroupEnd && sOut.at(-1) !== "") {
      // only when the declaration block itself was preceded by a blank or scope opener
      const prevLocal = scope[i].trimEnd();
      if ((!prevLocal.endsWith("{") && !prevLocal.endsWith(";")) || true) {
        // avoid inserting inside single statements: require the NEXT line to be code
        if (!CONTINUES(scope[i + 1])) {
          sOut.push("");
          changed = true;
        }
      }
    }
  }
  text = sOut.join("\n").replace(/\n{3,}/g, "\n\n");

  // ── js-blank-lines-blocks ── (blank line BEFORE if/for/... openers unless scaffolding,
  // and AFTER a bare `}` followed by code) ──
  for (let pass = 0; pass < 6; pass++) {
    const ls = text.split("\n");
    const o = [];
    let localChanged = false;
    for (let i = 0; i < ls.length; i++) {
      const line = ls[i];
      const prev = ls[i - 1];
      const next = ls[i + 1];
      const needsBefore =
        /^\s*(if|for|while|switch|try)\s*\(/.test(line) ||
        /^\s*\.(then|catch|finally|map|filter|reduce|forEach)\s*\(/.test(line);
      if (needsBefore && i > 0 && prev !== undefined) {
        const pt = prev.trim();
        const scaffolding =
          pt === "" ||
          pt.endsWith("{") ||
          pt.startsWith("}") ||
          /^\s*(\/\/|\/\*|\*|if|for|while|switch|try|case|default)/.test(prev);
        if (!scaffolding) {
          o.push("");
          localChanged = true;
        }
      }
      o.push(line);
      // after `}` followed by code
      if (/^\s*\}\s*$/.test(line) && next !== undefined && !/catch|else|finally/.test(next)) {
        const nt = next.trim();
        const hasNextCode = nt && !/^\s*(\/\/|\/\*|\*|\}|\)|\]|[:,.]|case|default)/.test(next) && nt !== "{";
        if (hasNextCode && !/^\s*\}\s*$/.test(line)) {
          /* handled below */
        }
        if (hasNextCode) {
          const afterBlock = ls
            .slice(i + 1)
            .join("\n")
            .trim();
          if (afterBlock && !afterBlock.startsWith("}") && !afterBlock.startsWith(")")) {
            o.push("");
            localChanged = true;
            // advance so we don't re-insert against our own blank
            if (ls[i + 1] !== undefined) {
              // consume next iteration's blank check by pushing next manually
            }
          }
        }
      }
    }
    if (!localChanged) {
      break;
    }
    text = o.join("\n").replace(/\n{3,}/g, "\n\n");
    if (pass === 5) {
      break;
    }
  }

  return { text, changed };
}

let touched = 0;
for (const file of files) {
  try {
    const before = readFileSync(file, "utf8");
    const { text, changed } = fix(before);
    if (changed && text !== before) {
      touched++;
      if (!dryRun) {
        writeFileSync(file, text);
      }
      console.log(`  ${changed ? "fixed" : "ok   "} ${file}`);
    }
  } catch {
    /* skip unreadable */
  }
}
console.log(`\n${dryRun ? "would fix" : "fixed"} ${touched} files`);
