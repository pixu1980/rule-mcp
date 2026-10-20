# Fingerprint

> Absorbed from `rule-styleguide-fingerprint` into `rule-process-ai`. The rules it documents are the `ai-*` guardrails this skill owns.

## Purpose

A reader spots generated text before they finish the first line, and what gives
it away is never the argument. It is the punctuation nobody types and the
spelling the rest of the file does not use. Both are mechanical, so both are
fixed mechanically.

This skill is always in force. It applies to answers, commit messages, code
comments, documentation, UI strings and error messages alike.

## Banned characters: em dash, curly quotes, ellipsis

Prose is plain ASCII. Nothing here is a matter of taste: every one of these has
a keyboard equivalent that reads the same.

| Banned                        | Name                            | Write instead                                 |
| ----------------------------- | ------------------------------- | --------------------------------------------- |
| `—`                           | em dash                         | `,` for a clause break, `-` for a list marker |
| `–` `‒` `−`                   | en dash, figure dash, minus     | `-`                                           |
| `“` `”` `„`                   | curly double quotes             | `"`                                           |
| `‘` `’` `‚`                   | curly single quotes, apostrophe | `'`                                           |
| `…`                           | ellipsis glyph                  | `...`                                         |
| `•` `‣` `·`                   | bullets                         | `-`                                           |
| `→` `←` `⇒`                   | arrows                          | `->` `<-` `=>`                                |
| `≤` `≥` `≠`                   | comparisons                     | `<=` `>=` `!=`                                |
| `×`                           | multiplication sign             | `x`                                           |
| non-breaking and thin spaces  | invisible                       | a normal space                                |
| zero-width space, joiner, BOM | invisible                       | delete                                        |

The em dash earns its own rule because it is the single strongest tell. A model
writes `The router - which caches results - is fast`; a person writes
`The router, which caches results, is fast`.

Code is exempt. A third-party API is allowed to be named `getColour()`, and an
identifier is not prose. Fenced blocks, inline spans and URLs are never
rewritten.

## American English spelling, not British

The house style is American. Common corrections:

| British                                                | American                                           |
| ------------------------------------------------------ | -------------------------------------------------- |
| `colour`, `behaviour`, `favourite`, `honour`, `labour` | `color`, `behavior`, `favorite`, `honor`, `labor`  |
| `organise`, `organisation`, `realise`, `recognise`     | `organize`, `organization`, `realize`, `recognize` |
| `analyse`, `analysed`, `paralyse`                      | `analyze`, `analyzed`, `paralyze`                  |
| `centre`, `metre`, `litre`, `theatre`, `fibre`         | `center`, `meter`, `liter`, `theater`, `fiber`     |
| `catalogue`, `dialogue`, `analogue`                    | `catalog`, `dialog`, `analog`                      |
| `defence`, `offence`, `licence`, `pretence`            | `defense`, `offense`, `license`, `pretense`        |
| `cancelled`, `travelling`, `modelling`, `labelled`     | `canceled`, `traveling`, `modeling`, `labeled`     |
| `grey`, `programme`, `storey`, `artefact`              | `gray`, `program`, `story`, `artifact`             |
| `whilst`, `amongst`, `learnt`, `spelt`                 | `while`, `among`, `learned`, `spelled`             |
| `judgement`, `acknowledgement`, `fulfil`, `enrol`      | `judgment`, `acknowledgment`, `fulfill`, `enroll`  |
| `enquire`, `cheque`, `kerb`, `plough`, `mould`         | `inquire`, `check`, `curb`, `plow`, `mold`         |

A prefix does not exempt the stem. `unrecognised`, `unauthorised` and
`reorganised` are the same correction as the words inside them, and they are the
ones that slip through, because a reader checking for `recognise` does not see
it inside a longer word.

Spelling in code follows the code, not this table. An existing British
identifier stays as it is; renaming it is a separate, deliberate change.

## A drawn box is a rectangle, or it is a tell

An ASCII diagram whose right edge steps in and out by a column is the one
fingerprint a spell-check cannot see, and it is the most visible of them all: a
reader who would have trusted the diagram now knows nobody looked at it.

It happens for a structural reason. The characters are chosen a line at a time
and nothing counts the columns, so the top border ends up one short of the
longest row and every row ends up a different width.

The tell is a top border one column short of the longest row: a `┌────────┐`
sitting above a `│  Class names  Todo  │` that runs a character wider, and a
right edge that therefore steps in and out down the diagram. This is what it
looks like once it is square:

```text
┌───────────────────────┐
│   PASCAL CASE         │
│   Class names   Todo  │
└───────────────────────┘
```

There is no ragged example printed here on purpose: the pass below would fix it
on the next run, which is the point.

The rule, and it is mechanical:

- **Every line of a box ends in the same column.** Count, do not eyeball.
- **Pad with the character the line is drawn from.** A border grows with `─`, a
  row of content grows with spaces.
- **Never truncate to fit.** The widest line sets the width; the short ones grow.
- **Inner separators are a column too.** A `┬` in a border sits above the `│`
  it belongs to, or the diagram reads as two diagrams.

Deterministic, so it is not left to attention: `src/core/ascii-box.js` pads
short frame lines out on every tool result, and `fp-box-rectangular` fails on
what is left. The pass only ever pads - it does not move content, does not
realign inner separators and does not invent a missing border, so anything it
cannot fix safely it reports instead of guessing.

## Phrasing tells that make text sound AI generated

Characters are the easy half. These phrases are the other half - drop them:

- "It is important to note that", "It is worth noting that", "Keep in mind that"
- "delve into", "dive deep into", "unlock the power of", "a rich tapestry"
- "In conclusion", "In summary", when the text is four paragraphs long
- "Additionally," opening three consecutive paragraphs
- "Certainly!", "Great question!", "I'd be happy to help"
- Stacked hedges: "it may potentially be possible that"
- A closing paragraph that restates the opening paragraph

Rule of thumb: if a sentence would survive being deleted with nothing lost,
delete it.

## Enforcement: fingerprint guardrails and the compress tool

Not left to memory. `src/core/fingerprint.js` runs on every tool result, after
compression, and rewrites prose only - code fences, inline spans, URLs and JSON
pass through untouched. It is idempotent. Opt out with
`RULE_MCP_NO_FINGERPRINT=1`. `src/core/ascii-box.js` runs last, because it
counts columns and has to see the final characters.

One deliberate exception. A file whose strings are drawn on a terminal rather
than read as prose - an installer, a picker - keeps its arrows and bullets: they
are interface, and `->` in a menu is a worse menu. Spelling still applies
there.

Guardrails cover the same ground for code and docs under review:

| Guardrail                 | Fails on                                                       |
| ------------------------- | -------------------------------------------------------------- |
| `fp-no-emdash`            | an em or en dash in text                                       |
| `fp-no-typographic-chars` | curly quotes, ellipsis glyph, bullets, arrows                  |
| `fp-american-english`     | a British spelling from the table above                        |
| `fp-box-rectangular`      | a box line short of its right edge, or a box that never closes |

Run `rule_tool_compress` to apply the passes to arbitrary prose before writing it.

## See also

- `rule_tool_compress` / `/rule-compress` - compression pass (ADR 115)
- [rule-styleguide-markdown](../../rule-styleguide-markdown/SKILL.md) - the document structure this writes into
- [rule-styleguide-naming](../../rule-styleguide-naming/SKILL.md) - naming, where code wins over prose style
- [rule-styleguide-git](../../rule-styleguide-git/SKILL.md) - commit messages follow these rules too
