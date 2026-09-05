/**
 * @module guardrails/quality
 *
 * Ported quality families (item 5): accessibility rules mapped to WCAG 2.2,
 * TypeScript strict-mode, the fingerprint family, manifest hygiene, simplicity
 * rules, flex-first layout and comment hygiene.
 *
 * The corpus (test/fixtures/guardrail-corpus.mjs) measures precision and recall
 * per rule, and self-guardrails (test/self-guardrails.test.mjs) keeps this
 * repository passing its own checks.
 *
 * @see module:core/wcag-data - the criteria these cite
 */

import { findRaggedBoxes } from "../ascii-box.js";
import { findFingerprints } from "../fingerprint.js";

/** Mask string literals so patterns never see quoted code. */
function maskLiterals(code) {
  const out = [...code];
  let quote;
  let escaped = false;

  for (const [index, char] of out.entries()) {
    if (quote) {
      if (escaped) {
        escaped = false;
        out[index] = char === "\n" ? "\n" : " ";
        continue;
      }

      if (char === "\\") {
        escaped = true;
        out[index] = " ";
        continue;
      }

      if (char === quote) {
        quote = undefined;
        continue;
      }

      out[index] = char === "\n" ? "\n" : " ";
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
    }
  }

  return out.join("");
}

/** Lines short enough to hand-write; a kilobytes-long line is generated output. */
function scannableLines(code, cap = 2000) {
  return code.split("\n").filter((line) => line.length > 0 && line.length <= cap);
}

/** Extensions that contain markup worth checking. */
const MARKUP_EXTENSION = /\.(?:html?|vue|svelte|astro|jsx|tsx|php|erb|twig)$/;
const STYLE_EXTENSION = /\.(?:css|scss|less|sass)$/;

/** @param {object} context @returns {boolean} */
function isMarkup(context) {
  const fileName = context?.fileName ?? "";

  return fileName ? MARKUP_EXTENSION.test(fileName) : false;
}

/** @param {object} context @returns {boolean} */
function isStyles(context) {
  const fileName = context?.fileName ?? "";

  return fileName ? STYLE_EXTENSION.test(fileName) : false;
}

/**
 * Build a markup rule. `find` returns the offending fragments.
 */
function a11yRule(spec) {
  const applies = spec.applies ?? isMarkup;

  return {
    id: spec.id,
    wcag: spec.wcag,
    label: spec.label,
    description: spec.description,
    check: (code, context) => {
      if (!applies(context)) {
        return { pass: true, note: "Not a file this rule applies to, skipping" };
      }

      const hits = spec.find(code);

      return {
        pass: hits.length === 0,
        failCount: hits.length,
        detail: hits.slice(0, 10).map((h) => h.slice(0, 80)),
        suggestion: `${spec.suggestion} (WCAG ${spec.wcag})`,
      };
    },
  };
}

/**
 * The real CSS out of whatever was handed over: a .css file, fenced css,
 * replaceSync sheets, <style> blocks, or a bare stylesheet.
 */
function extractRealCSS(code, context = {}) {
  const cssBlocks = [];

  if (context?.fileName && /\.css$/i.test(context.fileName)) {
    return code;
  }

  const fencedCss = code.match(/```css\n([\s\S]*?)```/g);
  if (fencedCss) {
    cssBlocks.push(...fencedCss.map((c) => c.replaceAll(/```css\n|```/g, "").trim()));
  }

  const sheetCss = code.match(/CSSStyleSheet\.replaceSync\(`([\s\S]*?)`\)/g);
  if (sheetCss) {
    cssBlocks.push(...sheetCss.map((c) => c.match(/`([\s\S]*?)`/)?.[1] || "").filter(Boolean));
  }

  const styleBlocks = code.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
  if (styleBlocks) {
    cssBlocks.push(...styleBlocks.map((c) => c.replaceAll(/<style[^>]*>|<\/style>/g, "").trim()));
  }

  if (cssBlocks.length === 0 && looksLikeStylesheet(code)) {
    return code;
  }

  return cssBlocks.join("\n\n");
}

/** Whether a body of text is a stylesheet in its own right. */
function looksLikeStylesheet(code) {
  const hasRule = /(?:^|[};])\s*[^{};@]*[\w\]*)]?\s*\{[^{}]*[a-z-]+\s*:\s*[^{}]+[;}]/i.test(code);
  if (!hasRule) {
    return false;
  }
  const isProgram = /\b(?:function|=>|import\s|export\s|const\s|let\s|var\s|return\s|class\s)/.test(code);
  const isMarkup = /<\/?[a-z][\w-]*(?:\s[^<>]*)?>/i.test(code);

  return !isProgram && !isMarkup;
}

/** Selectors that declare a grid without a stated justification. */
function unjustifiedGrids(css) {
  const BLOCK_SIGNALS = [
    /grid-template-areas\s*:/i,
    /subgrid/i,
    /grid-auto-flow\s*:/i,
    /repeat\(\s*auto-(?:fit|fill)/i,
  ];
  const placesItems = /(?:^|[\s;{])grid-(?:area|column|row)(?:-start|-end)?\s*:/i.test(css);
  const offenders = [];

  for (const match of css.matchAll(/display\s*:\s*(?:inline-)?grid\b/gi)) {
    const at = match.index;
    const open = css.lastIndexOf("{", at);
    if (open === -1) {
      continue;
    }
    const close = css.indexOf("}", at);
    const body = css.slice(open + 1, close === -1 ? css.length : close);
    const previous = Math.max(css.lastIndexOf("}", open), css.lastIndexOf("{", open - 1));
    const head = css.slice(previous + 1, open);
    const stated = /\/\*[^*]*\bgrid\s*:/i.test(head);
    if (stated || placesItems || BLOCK_SIGNALS.some((re) => re.test(body))) {
      continue;
    }
    const selector = head
      .replaceAll(/\/\*[\s\S]*?\*\//g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();
    offenders.push(selector || "(unnamed rule)");
  }

  return offenders;
}

// ─── Accessibility guardrails

export const A11Y_GUARDRAILS = [
  a11yRule({
    id: "a11y-img-alt",
    wcag: "1.1.1",
    label: "Images carry a text alternative",
    description:
      "Every img needs alt. An empty alt is a valid answer for decoration; a missing one is not an answer at all.",
    suggestion: 'Add alt="..." with the information the image carries, or alt="" if it is decorative',
    find: (code) => [...code.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => !/\balt\s*=/i.test(tag)),
  }),
  a11yRule({
    id: "a11y-positive-tabindex",
    wcag: "2.4.3",
    label: "No positive tabindex",
    description:
      "A positive tabindex takes the element out of document order, so focus order stops matching reading order.",
    suggestion: 'Use tabindex="0" and fix the DOM order instead, or tabindex="-1" for programmatic focus',
    find: (code) => [...code.matchAll(/tabindex\s*=\s*["']?([1-9]\d*)["']?/gi)].map((m) => m[0]),
  }),
  a11yRule({
    id: "a11y-html-lang",
    wcag: "3.1.1",
    label: "The page declares its language",
    description: "Without lang, a screen reader picks a voice by guess and pronounces the page in the wrong language.",
    suggestion: 'Add lang="..." to the html element',
    find: (code) => [...code.matchAll(/<html\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => !/\blang\s*=/i.test(tag)),
  }),
  a11yRule({
    id: "a11y-iframe-title",
    wcag: "4.1.2",
    label: "Frames are named",
    description:
      'An iframe with no title is announced as "frame", which tells the user nothing about whether to enter it.',
    suggestion: 'Add title="..." describing what the frame contains',
    find: (code) => [...code.matchAll(/<iframe\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => !/\btitle\s*=/i.test(tag)),
  }),
  a11yRule({
    id: "a11y-aria-hidden-focusable",
    wcag: "4.1.2",
    label: "Nothing focusable is aria-hidden",
    description:
      "aria-hidden on a focusable element leaves it in the tab order while removing it from the accessibility tree, so focus lands on nothing announceable.",
    suggestion: "Remove aria-hidden, or remove the element from the tab order too",
    find: (code) =>
      [
        ...code.matchAll(/<(?:a|button|input|select|textarea)\b[^>]*aria-hidden\s*=\s*["']?true["']?[^>]*>/gi),
        ...code.matchAll(/<[^>]*aria-hidden\s*=\s*["']?true["']?[^>]*tabindex\s*=\s*["']?0["']?[^>]*>/gi),
      ].map((m) => m[0]),
  }),
  a11yRule({
    id: "a11y-no-autoplay",
    wcag: "1.4.2",
    label: "Media does not autoplay with sound",
    description:
      "Audio starting on load competes with a screen reader and cannot be stopped by someone who has not found the control yet.",
    suggestion: "Remove autoplay, or add muted and a visible control",
    find: (code) =>
      [...code.matchAll(/<(?:audio|video)\b[^>]*\bautoplay\b[^>]*>/gi)]
        .map((m) => m[0])
        .filter((tag) => !/\bmuted\b/i.test(tag)),
  }),
  a11yRule({
    id: "a11y-video-captions",
    wcag: "1.2.2",
    label: "Video offers captions",
    description:
      "A video element with no captions track excludes anyone who cannot hear it, and anyone in a room where sound is not an option.",
    suggestion: 'Add <track kind="captions" src="..." srclang="..." label="...">',
    find: (code) =>
      [...code.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/gi)]
        .map((m) => m[0])
        .filter((block) => !/kind\s*=\s*["']?captions/i.test(block)),
  }),
  a11yRule({
    id: "a11y-form-label",
    wcag: "3.3.2",
    label: "Inputs are labeled",
    description:
      'An input with no label, aria-label or aria-labelledby is announced by its type alone, so the user hears "edit text" and nothing else.',
    suggestion: "Associate a label element, or add aria-label / aria-labelledby",
    find: (code) =>
      [...code.matchAll(/<input\b[^>]*>/gi)]
        .map((m) => m[0])
        .filter((tag) => !/type\s*=\s*["']?(?:hidden|submit|button|reset|image)/i.test(tag))
        .filter((tag) => !/\b(?:aria-label|aria-labelledby|id)\s*=/i.test(tag)),
  }),
  a11yRule({
    id: "a11y-focus-visible",
    wcag: "2.4.11",
    label: "Focus stays visible",
    description: "Removing the outline without replacing it leaves keyboard users with no way to see where they are.",
    suggestion: "Keep the outline, or replace it with a visible box-shadow, border or outline in the same rule",
    applies: isStyles,
    // Split on "}" instead of a rule-shaped regex: [^}]*\{ backtracked
    // quadratically on brace runs - the 67 s ReDoS reproducer (F-S1) - and any
    // matchAll over ambiguous classes re-scans brace-less input per position.
    find: (code) => {
      if (!/outline\s*:\s*(?:none|0)\b/i.test(code)) {
        return [];
      }

      const offenders = [];

      for (const chunk of code.split("}")) {
        if (!chunk.includes("{")) {
          continue;
        }

        const rule = `${chunk}}`;

        if (!/outline\s*:\s*(?:none|0)\b/i.test(rule)) {
          continue;
        }

        const rest = rule.replaceAll(/outline\s*:\s*(?:none|0)\b[^;]*;?/gi, "");

        if (!/(?:box-shadow|border(?:-\w+)?\s*:|outline\s*:\s*(?!none|0))/i.test(rest)) {
          offenders.push(rule);
        }
      }

      return offenders;
    },
  }),
];

// ─── TypeScript helpers (the ts-* rules self-gate on the file) ───

/** Extensions where TypeScript rules apply. */
const TS_EXTENSION = /\.(?:ts|tsx|mts|cts)$/;

/** Syntax that only compiles as TypeScript, for calls that pass no file name. */
const TS_SYNTAX = /^\s*(?:export\s+)?(?:interface|type)\s+\w+\s*[=<{]|:\s*(?:string|number|boolean|unknown|any)\b/m;

/** @param {string} code @param {object} context @returns {boolean} */
function isTypeScript(code, context) {
  const fileName = context?.fileName ?? "";

  if (fileName) {
    return TS_EXTENSION.test(fileName);
  }

  return TS_SYNTAX.test(code);
}

/** Strip strings, template literals and comments so prose never trips a rule. */
function stripLiterals(code) {
  return code
    .replaceAll(/\/\*[\s\S]*?\*\//g, " ")
    .replaceAll(/\/\/[^\n]*/g, " ")
    .replaceAll(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replaceAll(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replaceAll(/`(?:[^`\\]|\\.)*`/g, "``");
}

// ─── Manifest helpers (the pkg-* rules) ───

/** A manifest, wherever it sits in a workspace. */
const MANIFEST_FILE = /(?:^|\/)package\.json$/;

/** The groups that describe an install. `peerDependencies` deliberately absent. */
const INSTALLED_GROUPS = ["dependencies", "devDependencies", "optionalDependencies"];

/** Specifiers that name a source rather than a range: protocol, path, repository. */
const NOT_A_RANGE = /^(?:workspace:|catalog:|file:|link:|portal:|git\+|git:|github:|gitlab:|bitbucket:|https?:)/;

/** One version and no room to resolve a different one. */
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/;

/**
 * The parsed manifest, or undefined when this is not one. Unparseable JSON is
 * undefined too: a guardrail is not a linter for syntax it cannot read, and
 * reporting a range in a file with no ranges would be a false positive.
 */
function manifestOf(code, context) {
  if (!MANIFEST_FILE.test(context?.fileName ?? "")) {
    return;
  }

  try {
    const parsed = JSON.parse(code);

    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return;
  }
}

/**
 * Whether a specifier can resolve to only one version.
 */
function isPinned(spec) {
  // An alias still installs a version, so the version still has to be exact.
  if (spec.startsWith("npm:")) {
    return EXACT_VERSION.test(spec.slice(spec.lastIndexOf("@") + 1));
  }

  if (NOT_A_RANGE.test(spec)) {
    return true;
  }

  return EXACT_VERSION.test(spec);
}

// ─── Quality guardrails (every skill) ───
// TypeScript strictness, the fingerprint family, manifest hygiene, simplicity
// rules, flex-first layout and comment hygiene. Mirrors the upstream SHARED
// composition: these run everywhere.
export const QUALITY_GUARDRAILS = [
  {
    id: "ts-no-explicit-any",
    label: "No explicit any",
    description: "any turns off checking exactly where a value is least understood. Use unknown and narrow it.",
    check: (code, context) => {
      if (!isTypeScript(code, context)) {
        return { pass: true, note: "Not a TypeScript file, skipping" };
      }

      const hits = stripLiterals(code).match(/(?::\s*any\b|\bas\s+any\b|<any>|\bany\[\]|Array<any>)/g) ?? [];

      return {
        pass: hits.length === 0,
        failCount: hits.length,
        detail: [...new Set(hits.map((h) => h.trim()))].slice(0, 10),
        suggestion: "Replace any with unknown and narrow it with a type guard, or write the real type.",
      };
    },
  },
  {
    id: "ts-catch-unknown",
    label: "Catch clauses use unknown",
    description:
      "JavaScript can throw anything - a string, null, an object that is not an Error. any lets the handler assume otherwise and crash.",
    check: (code, context) => {
      if (!isTypeScript(code, context)) {
        return { pass: true, note: "Not a TypeScript file, skipping" };
      }
      const hits = stripLiterals(code).match(/catch\s*\(\s*\w+\s*:\s*any\s*\)/g) ?? [];

      return {
        pass: hits.length === 0,
        failCount: hits.length,
        detail: hits.slice(0, 10),
        suggestion:
          "Type the catch variable as unknown and check with instanceof before touching it. strict mode already does this.",
      };
    },
  },
  {
    id: "ts-no-double-assertion",
    label: "No as-unknown-as escape hatch",
    description:
      "A double assertion silences the compiler twice over: it defeats both the original type and the check that would have caught the mismatch.",
    check: (code, context) => {
      if (!isTypeScript(code, context)) {
        return { pass: true, note: "Not a TypeScript file, skipping" };
      }

      const hits = stripLiterals(code).match(/\bas\s+unknown\s+as\b/g) ?? [];

      return {
        pass: hits.length === 0,
        failCount: hits.length,
        detail: hits.slice(0, 10),
        suggestion: "Write a type guard that does a real runtime check, or fix the type the value actually has.",
      };
    },
  },
  {
    id: "ts-union-over-enum",
    label: "Union types over enum",
    description:
      "An enum emits runtime code and numeric enums reverse-map. A string union compiles to nothing and autocompletes the same.",
    check: (code, context) => {
      if (!isTypeScript(code, context)) {
        return { pass: true, note: "Not a TypeScript file, skipping" };
      }

      const hits = stripLiterals(code).match(/^\s*(?:export\s+)?(?:const\s+)?enum\s+(\w+)/gm) ?? [];

      return {
        pass: hits.length === 0,
        failCount: hits.length,
        detail: hits.map((h) => h.trim()).slice(0, 10),
        suggestion:
          "Use a string union, plus `as const` array and `typeof ARR[number]` when the values must be iterated.",
      };
    },
  },
  {
    id: "fp-no-emdash",
    label: "No em or en dashes",
    description: "Prose uses ASCII punctuation. An em dash becomes a comma; an en dash becomes a hyphen.",
    check: (code) => {
      const { dashes } = findFingerprints(code);

      return {
        pass: dashes.length === 0,
        failCount: dashes.length,
        detail: [...new Set(dashes)],
        suggestion: "Replace an em dash with a comma and an en dash with a hyphen, or run pix_compress.",
      };
    },
  },
  {
    id: "fp-no-typographic-chars",
    label: "No curly quotes or ellipsis glyphs",
    description:
      "Curly quotes and the ellipsis character do not survive a copy-paste into source. Use straight quotes and three dots.",
    check: (code) => {
      const { typographic } = findFingerprints(code);

      return {
        pass: typographic.length === 0,
        failCount: typographic.length,
        detail: [...new Set(typographic)],
        suggestion: "Use straight quotes (\" and ') and ... instead, or run pix_compress.",
      };
    },
  },
  {
    id: "fp-american-english",
    label: "American English spelling",
    description: "The house style is American English: -or over -our, -ize over -ise, -er over -re, -og over -ogue.",
    check: (code) => {
      const { british } = findFingerprints(code);

      return {
        pass: british.length === 0,
        failCount: british.length,
        detail: british.slice(0, 10),
        suggestion:
          "Use the American spelling. Identifiers from third-party APIs are exempt - put them in a code span or leave them in code.",
      };
    },
  },
  {
    id: "fp-box-rectangular",
    label: "A drawn box is a rectangle",
    description:
      "Every line of a box ends in the same column. A right edge that steps in and out is the one tell a spell-check cannot see.",
    check: (code) => {
      const ragged = findRaggedBoxes(code);

      return {
        pass: ragged.length === 0,
        failCount: ragged.length,
        detail: ragged
          .slice(0, 10)
          .map((entry) =>
            entry.reason === "box never closes"
              ? `line ${entry.line}: box never closes`
              : `line ${entry.line}: ${entry.width} columns, expected ${entry.expected}`,
          ),
        suggestion: "Pad the short lines out to the widest line of the same box, or run pix_compress.",
      };
    },
  },
  {
    id: "pkg-exact-versions",
    label: "Dependencies are pinned exactly",
    description:
      "Every dependency, devDependency and optionalDependency is an exact version: no ^, ~, comparator, alternation, wildcard, x-range or dist-tag. A range leaves the subdependency tree free to change between two installs of the same commit. peerDependencies are exempt: a peer range states compatibility, it does not install anything.",
    check: (code, context) => {
      const manifest = manifestOf(code, context);

      if (!manifest) {
        return { pass: true, note: "Not a package.json, skipping" };
      }

      const ranged = [];

      for (const group of INSTALLED_GROUPS) {
        const entries = manifest[group];

        if (!entries || typeof entries !== "object") {
          continue;
        }

        for (const [name, spec] of Object.entries(entries)) {
          if (typeof spec !== "string" || isPinned(spec)) {
            continue;
          }

          ranged.push(`${group}.${name}: "${spec}"`);
        }
      }

      return {
        pass: ranged.length === 0,
        failCount: ranged.length,
        detail: ranged.slice(0, 10),
        suggestion:
          "Pin each one to the version currently installed (`pnpm add --save-exact <pkg>`), and put `save-exact=true` in .npmrc so the next install does not reintroduce the range.",
      };
    },
  },
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
  {
    id: "css-flex-first",
    label: "Flex first, grid only when flex cannot do it",
    description:
      "display:grid has to earn itself: named template areas, subgrid, explicit item placement or overlap, " +
      "auto-fit/auto-fill tracks, or a stated `/* grid: why */` reason. Anything a flex row or column can do is flex.",
    check: (code, context) => {
      const cssBlock = extractRealCSS(code, context);
      if (!cssBlock) {
        return { pass: true, note: "No CSS block found, skipping" };
      }
      const offenders = unjustifiedGrids(cssBlock);
      if (offenders.length === 0) {
        return { pass: true, note: "Layout is flex, or the grid says why it has to be one" };
      }

      return {
        pass: false,
        failCount: offenders.length,
        detail: offenders.slice(0, 10),
        suggestion:
          "Use flex: `display: flex` with `gap` for a row or column, `flex-wrap: wrap` plus `flex: 1 1 <basis>` on the " +
          "items for a wrapping set, and `margin-inline-start: auto` to push one item to the end. Keep grid for named " +
          "areas, subgrid, explicit placement or overlap, and auto-fit tracks - and when it is one of those, say which " +
          "in a `/* grid: why */` comment above the rule.",
      };
    },
  },
  {
    id: "js-comment-no-history",
    label: "Comments say what the code does, never what it used to do",
    description:
      "A comment describes the current behavior and the reason for it. The story of how the code got here belongs to the ADR log and to git, and a copy in a comment is a second record that goes stale.",
    check: (code) => {
      const comments = [...code.matchAll(/\/\*[\s\S]*?\*\//g), ...code.matchAll(/(?:^|[^:"'`\\])\/\/(.*)$/gm)].map(
        (match) => match[0],
      );
      if (comments.length === 0) {
        return { pass: true };
      }

      // Narrow on purpose. Each phrase names the code's own past rather than a
      // runtime condition, so "no longer accepting connections" passes and
      // a comment about the file's own past does not.
      const HISTORY = [
        /\bused to\b/i,
        /\bpreviously\b/i,
        /\bhad been\b/i,
        /\bthis (?:was|were)\b/i,
        /\bwe (?:changed|renamed|moved|replaced|removed)\b/i,
        /\bthe old\b/i,
        // Paired with a past-tense verb: "before this it was two functions" is
        // history, "refused until this project accepts it" is behavior.
        /\b(?:before|until) (?:this|that|now)\b[^.]*\b(?:was|were|did|had|used|would)\b/i,
        /\b(?:was|were)\b[^.]*\bbefore\b/i,
      ];

      const offenders = comments.filter((comment) => HISTORY.some((re) => re.test(comment)));
      if (offenders.length === 0) {
        return { pass: true };
      }

      return {
        pass: false,
        failCount: offenders.length,
        detail: offenders.slice(0, 3).map((c) => c.trim().slice(0, 120)),
        suggestion: "State what the code does now and why. Put the history in the ADR that decided it.",
      };
    },
  },
];
