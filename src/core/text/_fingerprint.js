/**
 * @module core/text/fingerprint
 *
 * Removes the tells that mark a text as machine-written.
 *
 * Two of them, both cheap to fix and both immediately visible to a reader:
 * typographic characters nobody reaches for on a keyboard (em dashes, curly
 * quotes, the ellipsis glyph, bullets, arrows), and British spelling, which the
 * house style does not use. A human writing at a terminal types a hyphen and a
 * straight quote and writes "color"; anything else reads as generated.
 *
 * Safety contract, identical to the compressor's - the transformer NEVER
 * touches:
 *   - fenced code blocks (``` ... ```)
 *   - inline code spans (`...`)
 *   - URLs
 *   - content whose text is JSON (data, not prose)
 *
 * Code is excluded on purpose and not by accident: a third-party API is allowed
 * to be named `getColour()`, and rewriting an identifier breaks the call.
 *
 * Idempotent: strip(strip(x)) === strip(x). The result cache replays decorated
 * output, so a transformer that drifted on a second pass would replay a
 * different string every time.
 *
 * This module necessarily fails `fp-american-english` on itself: it is the
 * dictionary, so it contains every word it maps. Nothing to fix there.
 *
 * @see module:core/text/caveman - the other half of the output layer (filler removal)
 */

/** Single characters with a plain ASCII equivalent. */
const CHARACTER_MAP = new Map([
  ["\u2018", "'"],
  ["\u2019", "'"],
  ["\u201A", "'"],
  ["\u201B", "'"], // curly singles
  ["\u201C", '"'],
  ["\u201D", '"'],
  ["\u201E", '"'],
  ["\u201F", '"'], // curly doubles
  ["\u2013", "-"],
  ["\u2012", "-"],
  ["\u2212", "-"],
  ["\u2010", "-"],
  ["\u2011", "-"], // dashes, minus
  ["\u2022", "-"],
  ["\u2023", "-"],
  ["\u25CF", "-"],
  ["\u00B7", "-"], // bullets
  ["\u00A0", " "],
  ["\u2007", " "],
  ["\u2009", " "],
  ["\u200A", " "], // fixed-width spaces
  ["\u2002", " "],
  ["\u2003", " "],
  ["\u202F", " "],
  ["\u200B", ""],
  ["\u200C", ""],
  ["\u200D", ""],
  ["\uFEFF", ""], // zero-width, BOM
  ["\u00D7", "x"],
  ["\u2044", "/"],
]);

/** Multi-character replacements, applied before the single-character map. */
const SEQUENCE_MAP = [
  [/\u2026/g, "..."],
  [/\u2192/g, "->"],
  [/\u2190/g, "<-"],
  [/\u21D2/g, "=>"],
  [/\u21D4/g, "<=>"],
  [/\u2264/g, "<="],
  [/\u2265/g, ">="],
  [/\u2260/g, "!="],
];

/**
 * The em dash, in the three shapes it appears in.
 *
 * As a clause break or a parenthetical it becomes a comma, which is what a
 * person types. But a dash standing alone is not punctuation at all: at the
 * start of a line it is a list marker, and alone in a table cell it means
 * "none". Turning either into a comma destroys the meaning, so both stay a
 * hyphen. Order matters - the standalone cases are matched first.
 */
const EM_DASH_LIST = /^(\s*)\u2014\s*/;
const EM_DASH_ALONE = /(^|\|)(\s*)\u2014(\s*)($|\|)/g;
const EM_DASH_CLAUSE = /\s*\u2014\s*/g;

/**
 * British spelling, by family. Each entry is a matcher plus the American stem,
 * so inflections come along without a row per form.
 *
 * Families only cover stems listed explicitly: a blanket `-ise` rule would
 * rewrite "advertise", "compromise" and "surprise", and a blanket `-our` rule
 * would not know where the word starts. Explicit beats clever here.
 *
 * The `-ise` family accepts an `un` or `re` prefix, because `\b` sits before
 * the prefix and not before the stem: without it "recognised" was corrected and
 * "unrecognised" was not. A prefix on a stem already in the list cannot produce
 * a false positive - if `<stem>ise` is British then so is `un<stem>ise`.
 */
const OUR_STEMS = "col|behavi|fav|hon|lab|neighb|hum|rum|flav|harb|od|vap|val|endeav|splend|arm|savi|rig|vig|clam|arb";
const ISE_STEMS = [
  "organis",
  "realis",
  "recognis",
  "analys",
  "apologis",
  "authoris",
  "capitalis",
  "categoris",
  "centralis",
  "characteris",
  "civilis",
  "criticis",
  "customis",
  "dramatis",
  "economis",
  "emphasis",
  "equalis",
  "finalis",
  "formalis",
  "generalis",
  "globalis",
  "harmonis",
  "idealis",
  "individualis",
  "initialis",
  "internationalis",
  "itemis",
  "legalis",
  "liberalis",
  "localis",
  "maximis",
  "memoris",
  "minimis",
  "mobilis",
  "modernis",
  "moralis",
  "nationalis",
  "neutralis",
  "normalis",
  "optimis",
  "penalis",
  "personalis",
  "prioritis",
  "privatis",
  "publicis",
  "randomis",
  "rationalis",
  "serialis",
  "socialis",
  "specialis",
  "stabilis",
  "standardis",
  "sterilis",
  "summaris",
  "symbolis",
  "sympathis",
  "synchronis",
  "synthesis",
  "systematis",
  "urbanis",
  "utilis",
  "verbalis",
  "visualis",
  "paralys",
].join("|");
const RE_STEMS = "cent|met|lit|theat|fib|calib|sab|somb|spect|lust|meag|sept|amphitheat";
const OGUE_STEMS = "catal|dial|anal|monol|epil|prol|travel";

/** `-re` and its inflections map to `-er` and its inflections. */
const RE_ENDINGS = new Map([
  ["re", "er"],
  ["res", "ers"],
  ["red", "ered"],
  ["ring", "ering"],
]);

/** Whole words with no family, listed one by one. */
const WORDS = new Map(
  Object.entries({
    whilst: "while",
    amongst: "among",
    learnt: "learned",
    spelt: "spelled",
    dreamt: "dreamed",
    licence: "license",
    licences: "licenses",
    defence: "defense",
    defences: "defenses",
    offence: "offense",
    offences: "offenses",
    pretence: "pretense",
    practise: "practice",
    practised: "practiced",
    practising: "practicing",
    artefact: "artifact",
    artefacts: "artifacts",
    aluminium: "aluminum",
    programme: "program",
    programmes: "programs",
    storey: "story",
    storeys: "stories",
    grey: "gray",
    greyed: "grayed",
    greyish: "grayish",
    greys: "grays",
    kerb: "curb",
    plough: "plow",
    draught: "draft",
    mould: "mold",
    moulded: "molded",
    smoulder: "smolder",
    cheque: "check",
    cheques: "checks",
    enquire: "inquire",
    enquiry: "inquiry",
    enquiries: "inquiries",
    enrol: "enroll",
    enrolment: "enrollment",
    fulfil: "fulfill",
    fulfilment: "fulfillment",
    instalment: "installment",
    instalments: "installments",
    skilful: "skillful",
    wilful: "willful",
    judgement: "judgment",
    judgements: "judgments",
    acknowledgement: "acknowledgment",
    acknowledgements: "acknowledgments",
    ageing: "aging",
    cancelled: "canceled",
    cancelling: "canceling",
    travelled: "traveled",
    travelling: "traveling",
    traveller: "traveler",
    travellers: "travelers",
    modelled: "modeled",
    modelling: "modeling",
    labelled: "labeled",
    labelling: "labeling",
    signalled: "signaled",
    signalling: "signaling",
    fuelled: "fueled",
    fuelling: "fueling",
    marvellous: "marvelous",
    counsellor: "counselor",
    counsellors: "counselors",
    jeweller: "jeweler",
    initialise: "initialize",
    normalise: "normalize",
    serialise: "serialize",
    deserialise: "deserialize",
    behaviours: "behaviors",
  }),
);

const WORD_RE = new RegExp(String.raw`\b(${[...WORDS.keys()].join("|")})\b`, "gi");
const OUR_RE = new RegExp(
  String.raw`\b(${OUR_STEMS})our(s|ed|ing|able|ite|ites|ful|less|al|ally|ist|ists|ism|ed)?\b`,
  "gi",
);
const ISE_RE = new RegExp(String.raw`\b((?:un|re)?(?:${ISE_STEMS}))(e|es|ed|ing|ation|ations|er|ers|able)\b`, "gi");
const RE_RE = new RegExp(String.raw`\b(${RE_STEMS})(re|res|red|ring)\b`, "gi");
const OGUE_RE = new RegExp(String.raw`\b(${OGUE_STEMS})ogue(s)?\b`, "gi");

/** Dashes a person does not type. Kept separate: this is the strongest tell. */
const DASH_RE = /[\u2014\u2013\u2012]/g;

/** Curly quotes and the ellipsis glyph: they break pasted code, not only style. */
const TYPOGRAPHIC_RE = /[\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2026]/g;

/**
 * The part of a text the transformer is allowed to rewrite: prose, with fenced
 * blocks, inline spans and URLs blanked out.
 *
 * The detector and the transformer must agree on this, exactly. If they drift,
 * a guardrail fails on a line the transformer refuses to fix, and there is no
 * way for anyone to make it pass.
 *
 * @param {string} text
 * @returns {string}
 */
function scannableProse(text) {
  const lines = [];
  let isInFence = false;

  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      isInFence = !isInFence;
      lines.push("");
      continue;
    }
    lines.push(isInFence ? "" : line.replaceAll(/`[^`]*`/g, " ").replaceAll(/https?:\/\/\S+/g, " "));
  }

  return lines.join("\n");
}

/**
 * Report the fingerprints in a text without rewriting it. Used by the
 * guardrails, which have to name what failed rather than silently fix it.
 *
 * Code and URLs are exempt for the same reason the transformer skips them: an
 * identifier is not prose. Everything else counts, comments and plain string
 * literals included - a British spelling in a user-facing message is still one.
 *
 * @param {string} text
 * @returns {{ dashes: string[], typographic: string[], british: string[] }}
 */
export function findFingerprints(text) {
  if (typeof text !== "string" || text.length === 0) {
    return { dashes: [], typographic: [], british: [] };
  }

  const scannable = scannableProse(text);
  const british = [];

  for (const pattern of [WORD_RE, OUR_RE, ISE_RE, RE_RE, OGUE_RE]) {
    british.push(...(scannable.match(pattern) ?? []));
  }

  return {
    dashes: scannable.match(DASH_RE) ?? [],
    typographic: scannable.match(TYPOGRAPHIC_RE) ?? [],
    british: [...new Set(british)],
  };
}

/**
 * Whether the transformer runs at all.
 * Opt out with RULE_MCP_NO_FINGERPRINT=1.
 *
 * @returns {boolean}
 */
export function fingerprintEnabled() {
  return process.env.RULE_MCP_NO_FINGERPRINT !== "1";
}

/**
 * Give `target` the capitalisation of `source`: ALL CAPS stays all caps, an
 * initial capital stays capitalised, anything else is left lowercase.
 *
 * @param {string} source - the word as written
 * @param {string} target - the American form, lowercase
 * @returns {string}
 */
function matchCase(source, target) {
  if (source === source.toUpperCase() && /[A-Z]/.test(source)) {
    return target.toUpperCase();
  }

  if (source[0] === source[0]?.toUpperCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }

  return target;
}

/** Does this text look like a JSON document (data, not prose)? */
function looksLikeJson(text) {
  const t = text.trim();

  if (!(t.startsWith("{") || t.startsWith("["))) {
    return false;
  }

  try {
    JSON.parse(t);

    return true;
  } catch {
    return false;
  }
}

/** @param {string} line @returns {string} */
function americanise(line) {
  return line
    .replaceAll(WORD_RE, (match) => matchCase(match, WORDS.get(match.toLowerCase())))
    .replaceAll(OUR_RE, (match, stem, suffix = "") =>
      matchCase(match, `${stem.toLowerCase()}or${suffix.toLowerCase()}`),
    )
    .replaceAll(ISE_RE, (match, stem, suffix) =>
      matchCase(match, `${stem.toLowerCase().slice(0, -1)}z${suffix.toLowerCase()}`),
    )
    .replaceAll(RE_RE, (match, stem, ending) =>
      matchCase(match, `${stem.toLowerCase()}${RE_ENDINGS.get(ending.toLowerCase())}`),
    )
    .replaceAll(OGUE_RE, (match, stem, plural = "") =>
      matchCase(match, `${stem.toLowerCase()}og${plural.toLowerCase()}`),
    );
}

/** @param {string} line @returns {string} */
function asciify(line) {
  let work = line.replace(EM_DASH_LIST, "$1- ").replaceAll(EM_DASH_ALONE, "$1$2-$3$4").replaceAll(EM_DASH_CLAUSE, ", ");

  for (const [pattern, replacement] of SEQUENCE_MAP) {
    work = work.replaceAll(pattern, replacement);
  }

  return [...work].map((character) => CHARACTER_MAP.get(character) ?? character).join("");
}

/**
 * Clean one prose line, protecting inline code and URLs from every rule.
 *
 * `spellingOnly` keeps the spelling rules and drops the character map. It is
 * for files whose strings are drawn on a terminal rather than read as prose: an
 * installer's arrow and bullet are deliberate interface, and rewriting them to
 * `->` and `-` degrades the thing they were chosen for. British spelling in the
 * same file is still British spelling.
 *
 * @param {string} line
 * @param {boolean} [spellingOnly]
 * @returns {string}
 */
function cleanLine(line, spellingOnly = false) {
  const spans = [];
  const protect = (match) => {
    spans.push(match);

    return `__FP_SPAN_${spans.length - 1}__`;
  };
  const work = line.replaceAll(/`[^`]*`/g, protect).replaceAll(/https?:\/\/\S+/g, protect);

  return americanise(spellingOnly ? work : asciify(work)).replaceAll(
    /__FP_SPAN_(\d+)__/g,
    (_, index) => spans[Number(index)],
  );
}

/**
 * Clean a block of prose/markdown. Fenced code passes through untouched, and
 * JSON is returned as-is.
 *
 * @param {string} text
 * @param {{ spellingOnly?: boolean }} [options] spellingOnly keeps the spelling
 *   rules and leaves typographic characters alone - see cleanLine
 * @returns {string}
 */
export function stripFingerprint(text, options = {}) {
  if (typeof text !== "string" || text.length === 0) {
    return text;
  }
  if (looksLikeJson(text)) {
    return text;
  }

  const out = [];
  let isInFence = false;
  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      isInFence = !isInFence;
      out.push(line);
      continue;
    }

    out.push(isInFence ? line : cleanLine(line, options.spellingOnly === true));
  }

  return out.join("\n");
}

/**
 * Clean an MCP tool result. Only prose text items are touched; a new object is
 * returned so the cached core is never mutated.
 *
 * @param {{ content?: Array<{ type: string, text?: string }> }} result
 * @returns {object} the same result when disabled, else a cleaned copy
 */
export function stripFingerprintResult(result) {
  if (!fingerprintEnabled()) {
    return result;
  }

  if (!result || !Array.isArray(result.content)) {
    return result;
  }

  const content = result.content.map((item) => {
    if (item && item.type === "text" && typeof item.text === "string" && !looksLikeJson(item.text)) {
      return { ...item, text: stripFingerprint(item.text) };
    }

    return item;
  });

  return { ...result, content };
}
