---
name: rule-mcp-styleguide-markdown
description: >-
  Use when writing Markdown documentation following rule-mcp style. Covers headings, lists, code blocks, tables, links, and tone for technical docs.
tags:
  - "markdown"
  - "documentation"
  - "writing"
  - "formatting"
frameworks: [all]
---

# Markdown Style Guide and Standards

## Purpose

- Markdown is for writing docs that are easy to read in plain text and render consistently.
- Optimize for scalability, stable diffs, and predictable structure.

## Document structure

- Start with exactly one `# Title` at the top.
- Follow with a short intro paragraph stating what the document is and who it is for.
- Use headings in order, do not skip levels (`##` -> `###`, never `##` -> `####`).
- Keep sections focused; split long sections into subheadings.

## Headings

- Use sentence case for headings unless the project uses a different convention.
- Do not include trailing punctuation in headings.
- Prefer meaningful headings over clever ones.

## Lists

- Use `-` for unordered lists, one space after the dash.
- Use `1.` for ordered lists, let the renderer handle numbering.
- Keep list items parallel in grammar.
- For nested lists, indent by 2 spaces per level.

## Code blocks

- Use fenced code blocks with triple backticks.
- Always specify the language when known: `js`, `css`, `html`, `json`, `bash`.
- Keep code blocks focused. If a block is long, extract into a file and link it.

````md
```js
const example = true;
```
````

## Inline code

- Use single backticks for identifiers, filenames, commands, and short snippets.
- Avoid wrapping entire sentences in inline code.

## Links

- Prefer descriptive link text, avoid raw URLs in prose.
- Use relative links for repo internal references.

## Images

- Use alt text that describes the content and intent.
- Store images in a predictable folder, for example `docs/assets/`.
- Prefer SVG for diagrams.

```md
![Architecture diagram showing data flow](docs/assets/architecture.svg)
```

## Tables

- Use tables only when they improve comprehension.
- Keep tables small and readable.
- Align pipes consistently.

## Formatting rules

- Use 1 blank line between blocks: headings, paragraphs, lists, and code fences.
- Keep lines reasonably short when it improves diffs, but do not hard wrap in a way that harms readability.
- Use consistent indentation: 2 spaces for nested structures.
- End files with a newline.

## Tone and content conventions

- Prefer clear, direct language.
- Explain "why" for decisions, not only "what".
- Avoid unnecessary fluff. Add examples when they reduce ambiguity.

## Repo conventions

- Use `kebab-case.md` for docs unless the repo standard differs.
- Use a table of contents for long documents.

## Validation and maintenance

- Use a Markdown linter if available.
- Check rendered output in the target platform (GitHub, docs site) when adding complex formatting.

## Example skeleton

````md
# Document title

Short intro that explains what this is and who should read it.

## Goals

- Goal 1
- Goal 2

## Usage

1. Install dependencies
2. Run the project

## Examples

```js
console.log("Hello, docs");
```
````

---

## See also

- [rule-mcp-styleguide](../rule-mcp-styleguide/SKILL.md) - Style guides index
- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index
