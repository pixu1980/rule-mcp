

/**
 * @module cli/setup/theme
 *
 * The wizard's palette and glyph set, in one place.
 *
 * Two glyph sets, not one: a terminal without a UTF-8 locale renders box
 * drawing as mojibake, and an installer is the first thing a user runs on a
 * machine that may be a bare container. `NO_UNICODE=1` forces the ASCII set.
 */

/** Semantic colors. Hex so the same shades hold across terminal themes. */
export const COLORS = {
  accent: "#7C5CFF",
  accentSoft: "#A78BFA",
  info: "#22D3EE",
  ok: "#34D399",
  warn: "#FBBF24",
  fail: "#F87171",
  muted: "#6B7280",
};

/** Whether the terminal can be trusted with box drawing and braille. */
export function supportsUnicode() {
  if (process.env.NO_UNICODE === "1") {
    return false;
  }

  const locale = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || "";

  return process.platform === "win32" || /UTF-?8/i.test(locale);
}

const UNICODE = {
  checked: "◉",
  unchecked: "◯",
  radioOn: "●",
  radioOff: "○",
  pointer: "❯",
  ok: "✓",
  warn: "▲",
  fail: "✗",
  skip: "-",
  pending: "·",
  barFull: "█",
  barEmpty: "░",
  dot: "•",
  arrow: "→",
  spinner: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
};

const ASCII = {
  checked: "[x]",
  unchecked: "[ ]",
  radioOn: "(*)",
  radioOff: "( )",
  pointer: ">",
  ok: "ok",
  warn: "!",
  fail: "x",
  skip: "-",
  pending: ".",
  barFull: "#",
  barEmpty: ".",
  dot: "*",
  arrow: "->",
  spinner: ["|", "/", "-", "\\"],
};

/** The glyph set this terminal should use. */
export const GLYPHS = supportsUnicode() ? UNICODE : ASCII;

/** Border style matching the glyph set, for every framed Box. */
export const BORDER = supportsUnicode() ? "round" : "classic";

/** Map a task or check status onto its glyph and color. */
export function statusStyle(status) {
  switch (status) {
    case "ok": {
      return { glyph: GLYPHS.ok, color: COLORS.ok };
    }
    case "warn": {
      return { glyph: GLYPHS.warn, color: COLORS.warn };
    }
    case "fail": {
      return { glyph: GLYPHS.fail, color: COLORS.fail };
    }
    case "skip": {
      return { glyph: GLYPHS.skip, color: COLORS.muted };
    }
    default: {
      return { glyph: GLYPHS.pending, color: COLORS.muted };
    }
  }
}
