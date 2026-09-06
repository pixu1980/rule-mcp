/** Accessibility rules mapped to WCAG 2.2 criteria. */

import { a11yRule, isStyles } from "./_a11y-helpers.js";

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
