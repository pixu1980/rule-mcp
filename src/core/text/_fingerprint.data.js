/**
 * @module core/text/fingerprint-data
 *
 * The typographic character maps and the British-to-American dictionary
 * behind the fingerprint scanner. Data file: exempt from the size cap.
 */

/** Single characters with a plain ASCII equivalent. */
export const CHARACTER_MAP = new Map([
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
export const SEQUENCE_MAP = [
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
export const OUR_STEMS = "col|behavi|fav|hon|lab|neighb|hum|rum|flav|harb|od|vap|val|endeav|splend|arm|savi|rig|vig|clam|arb";
export const ISE_STEMS = [
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
export const RE_STEMS = "cent|met|lit|theat|fib|calib|sab|somb|spect|lust|meag|sept|amphitheat";
export const OGUE_STEMS = "catal|dial|anal|monol|epil|prol|travel";

/** `-re` and its inflections map to `-er` and its inflections. */
export const RE_ENDINGS = new Map([
  ["re", "er"],
  ["res", "ers"],
  ["red", "ered"],
  ["ring", "ering"],
]);

/** Whole words with no family, listed one by one. */
export const WORDS = new Map(
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
