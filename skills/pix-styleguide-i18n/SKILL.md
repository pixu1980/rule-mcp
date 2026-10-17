---
name: rule-styleguide-i18n
description: >-
  Use when a product ships in more than one language or region. Covers what to externalize and how to key it, plural and gender rules, locale-aware dates, numbers, currencies and units via Intl, right-to-left layout, and the concatenation habits that cannot be translated.
tags:
  - i18n
  - l10n
  - internationalization
  - localization
  - locale
  - translation
  - plural
  - rtl
  - intl
  - currency
  - timezone
  - date-format
  - styleguide
frameworks: [all]
---

# rule-styleguide-i18n - Text that survives a second language

## Purpose

Internationalization is the code change; localization is the content that
follows it. This skill is about the first, because the second is cheap once the
first is right and impossible when it is wrong.

Every rule here comes from the same failure. Something about English was treated
as a property of software rather than a property of English: that plurals have
two forms, that dates read month-first, that a sentence can be assembled from
parts, that text starts on the left.

## Externalize the string, not the sentence fragment

A component never holds display text. It holds a key, and the text lives in a
translation file the translator can open without reading code.

The rule people break is the second half of it. Splitting one sentence into two
keys so the code can insert a value in the middle is the same as hardcoding: the
translator receives two fragments and no way to reorder them, and word order is
the first thing that changes between languages.

```js
// Bad: German puts the verb where English puts the object
t("cart.you_have") + count + t("cart.items_in_cart");

// Good: one key, one placeholder, one sentence the translator can rewrite whole
t("cart.summary", { count });
```

The same applies to punctuation, spacing and capitalization. French wants a
space before a colon, German capitalizes nouns, Japanese has no spaces between
words. None of that is the component's business.

## Translation keys name the meaning, never the English

A key is an identifier, so it follows the rules identifiers follow: it describes
what the string is for, not what it currently says.

| Key                          | Verdict                                            |
| ---------------------------- | -------------------------------------------------- |
| `checkout.button.submit`     | Good. Survives the copy change                     |
| `checkout.click_here_to_pay` | Bad. Renamed the day marketing rewrites the button |
| `ClickHere`                  | Bad. Neither semantic nor namespaced               |

One semantic key per string, namespaced by feature, and never reuse a key
across two places because the English happens to match. "Open" as a button and
"Open" as a status are the same word in English and two different words almost
everywhere else.

## Plurals have more than two forms

English has one and other. Russian has one, few, many and other; Arabic has six;
Japanese has one. Any code that branches on `count === 1` has hardcoded English
grammar into a language switch.

```json
{
  "cart.summary": {
    "one": "You have 1 item in your cart",
    "other": "You have {count} items in your cart"
  }
}
```

Let the i18n library pick the branch, and let it use `Intl.PluralRules` under
the hood - that is the browser's copy of the CLDR data, and it knows which forms
a locale has. Provide the forms English needs and let the translation file for
each locale carry the forms that locale needs; the extra categories are the
translator's job, not a shape the source language has to anticipate.

Zero is worth a form of its own even where the grammar does not demand one:
"You have 0 items" is grammatical and reads like a bug.

## Gender and ordinals are the same problem

A string that adapts to who it is about ("she updated her profile") needs the
gender as a parameter, selected by the translation, exactly as count is. Do not
resolve it in code and pass the resolved pronoun in, because the pronoun is not
the only word that changes: adjectives and participles agree in most Romance and
Slavic languages.

Ordinals go through `Intl.PluralRules` with `type: "ordinal"`. "1st, 2nd, 3rd,
4th" is an English pattern and a string template that appends "th" is wrong four
times in every hundred, in one language, and wrong always in the others.

## Dates and times: Intl.DateTimeFormat, and a timezone you chose on purpose

```js
new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(date);
```

Never hand-assemble a date from parts, and never ship a format string. `MM/DD`
and `DD/MM` are the same eight characters and a different day, twelve times a
year, silently.

Two decisions have to be explicit every time:

- **Which timezone.** The server's, the user's, or the event's. Store instants in
  UTC, and render in the timezone that makes the sentence true - a flight departs
  in the airport's timezone, a report covers the account's.
- **Which clock.** 12-hour with an AM/PM marker or 24-hour is a locale property.
  Read it from the locale rather than from a setting nobody will find.

Relative time gets `Intl.RelativeTimeFormat` rather than a hand-written "3 days
ago" ladder, which is a plural problem and a grammar problem wearing a date
costume.

## Numbers, currencies and units: Intl.NumberFormat

The separators invert. `1.234,56` and `1,234.56` are the same number, and a
parser that assumes one reads the other off by three orders of magnitude.

```js
new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(amount);
new Intl.NumberFormat(locale, { style: "unit", unit: "kilometer" }).format(distance);
```

Currency is two independent facts and they are routinely confused. The locale
decides where the symbol goes and how the digits group; the currency code decides
what the money is. A price in euros shown to a US user is still euros, formatted
American - it is not converted by changing the locale, and formatting is never
the place a conversion happens.

Units follow the region, not the language: `en-US` wants miles and Fahrenheit,
`en-GB` wants miles and Celsius. Convert the value first, then format it; the
`unit` option formats what you give it and does no arithmetic.

## Right to left is a layout property, not a text property

Arabic, Hebrew, Persian and Urdu mirror the interface, not only the sentences.
Set `dir="rtl"` on the document root from the locale and let the cascade do the
rest, which it will only if the CSS was written with logical properties:

| Physical           | Logical                 |
| ------------------ | ----------------------- |
| `margin-left`      | `margin-inline-start`   |
| `padding-right`    | `padding-inline-end`    |
| `text-align: left` | `text-align: start`     |
| `left: 0`          | `inset-inline-start: 0` |

Icons that encode direction (back, forward, indent, undo) mirror with the layout;
icons that encode a thing (a play button, a logo, a clock) do not. Anything
positioned with a physical offset in JavaScript needs the same treatment as the
CSS, and that is usually where the first RTL bug is found.

## Pseudo-localization finds the breakage before a translator does

A pseudo-localization pass runs the app in a fake locale that takes every string
through the translation pipeline and returns it accented and 40% longer: `[Ŝàvè çĥàñĝèŝ ~~~~~]`. Three classes of bug
appear immediately, and all three are cheaper now than after the copy exists.

- **Hardcoded strings** stay in plain English and stand out on the page.
- **Fixed-width containers** clip, because German is routinely a third longer
  than English and a button sized to its English label is sized wrong.
- **Concatenation** shows up as a sentence with one accented half.

German length is the working estimate for layout. Design for the longest
plausible string, not the English one, and never for a character count.

## Wire the checks into CI, not into a checklist

Extraction and validation are mechanical, so they belong in the pipeline:
extract keys from the source, fail on a key used in code and missing from the
base locale, and report locales below a coverage threshold rather than blocking
on them - a missing translation should fall back to the base language visibly,
not crash and not render the raw key.

Translation memory lives in the TMS (Phrase, Lokalise, Crowdin are the usual
three) and the export is what the build consumes. Nobody edits a non-base locale
file by hand, because that edit is overwritten on the next sync and the loss is
silent.

## What never goes in a translation file

- **Anything that is not text a user reads.** Not URLs, not tokens, not enum
  values, not the string a `switch` compares against. A translator will
  eventually translate it.
- **Markup with logic in it.** Inline `<strong>` inside a translated sentence is
  fine and often necessary; a template with a conditional is not.
- **Text that is legally fixed.** A license, a regulated disclosure or a brand
  name is copy that is reviewed and replaced, not translated in place.

## Checklist before shipping a feature

- [ ] No display string in a component, and no sentence assembled from keys
- [ ] Keys are semantic and namespaced by feature
- [ ] Counts use plural forms, not a `count === 1` branch
- [ ] Dates, times, numbers, currencies and units go through `Intl.*`
- [ ] Timezone chosen deliberately and stored in UTC
- [ ] CSS uses logical properties, and `dir` is set from the locale
- [ ] Pseudo-localization pass run, with no plain-English strings and no clipping
- [ ] CI fails on a missing key in the base locale

## Conventions (rules -> skills merge)

# Internationalization (i18n) Rules

## Scope

These rules apply to all frontend services. Internationalization (i18n) means designing applications so they can be adapted to different languages and regions without code changes. Localization (l10n) means adapting an application to a specific language, culture, and region.

## Core principles

- **Never hardcode text in components.** Store all strings in translation files (JSON or i18n library format).
- Use a centralized i18n framework (e.g., `i18next`, `react-intl`) and a consistent structure for translation keys.
- Use placeholders for dynamic values (`{name}`, `{count}`) to allow flexible translations.
- Format dates, times, numbers, and currencies using locale-aware APIs.
- Respect text direction (LTR vs RTL) and typographic conventions per locale.
- The system must support adding new languages without refactoring code.

## Translation keys

Use **semantic keys**, not direct English text or display strings:

- ✅ `button.submit`
- ❌ `submit_button_text`
- ❌ `ClickHere`

## Pluralization & gender

Use i18n libraries that handle pluralization and gender rules correctly:

```json
{
  "messages": {
    "one": "You have 1 message",
    "other": "You have {count} messages"
  }
}
```

## Formatting

Always use locale-aware APIs. Never hardcode separators, formats, or units.

### Dates & times

- Use `Intl.DateTimeFormat`
- Handle time zones explicitly (UTC vs local time).
- Support 12h (`en-US`) and 24h (`it-IT`) formats based on locale.

### Numbers & currencies

- Use `Intl.NumberFormat`
- Never hardcode decimal or thousand separators.
- Handle large numbers with locale-appropriate grouping.

### Measurement units

Use `Intl.NumberFormat` with `unit` option. Convert between imperial and metric based on target locale:

## RTL support

- CSS must support both LTR and RTL directions.
- Test layouts with RTL languages (Arabic, Hebrew) when targeting those markets.
- Screen readers must handle translated text correctly.
- Ensure translations do not break UI layouts.

## Tooling

- **i18n frameworks**: `i18next`, `react-intl`
- **Translation Management Systems (TMS)**: Phrase, Lokalise, Crowdin
- Extract translation keys automatically in CI/CD.
- Validate missing or outdated translations in CI/CD.
- Use **pseudo-localization** (adding extra characters to strings) during development to detect UI layout breaks early.

## Development checklist

Before shipping any frontend feature, verify:

- [ ] No hardcoded strings in components
- [ ] All strings stored in translation files with semantic keys
- [ ] Placeholders used for variables; pluralization handled correctly
- [ ] Dates, times, numbers, and currencies formatted with `Intl.*` APIs
- [ ] UI tested with pseudo-localization
- [ ] RTL layout tested where applicable
- [ ] Automated CI/CD checks validate missing translations

## See also

- [rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md) - `lang` and `dir` are accessibility attributes before they are i18n ones
- [rule-styleguide-css](../rule-styleguide-css/SKILL.md) - logical properties and the cascade that makes RTL free
- [rule-data-validation](../rule-data-validation/SKILL.md) - addresses, phone numbers and tax IDs vary by country the same way text varies by language
- [rule-styleguide-javascript](../rule-styleguide-javascript/SKILL.md) - where the formatting calls live
- [rule-frontend](../rule-frontend/SKILL.md) - framework-level wiring for the locale provider
