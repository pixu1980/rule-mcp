---
name: rule-styleguide-readme
description: 'Write or improve a README.md for an open source project. Use this for any request to create, rewrite, review, or polish a README, project description, or "getting started" docs for a library, framework, or tool, or to make an open source project more popular or attractive to users. Do NOT use for internal/private repo docs, API reference generation, or CHANGELOG/CONTRIBUTING files.'
tags:
  - "styleguide"
  - "documentation"
  - "open-source"
frameworks: [markdown, readme]
---

# Write a good README

Apply the structure below when creating or improving a README. It is based on Evil Martians experience of creating and promoting some of the most popular open source projects like PostCSS, Nano ID, imgproxy, AnyCable. Companion to <https://evilmartians.com/chronicles/how-to-make-your-open-source-popular>.

**Never invent facts.** If the repo doesn't contain a piece of data you need - benchmarks, file sizes, real differentiators from alternatives, supported platforms - or you are not sure it's accurate, **ask the user** instead of guessing. A README with fabricated numbers is worse than one without numbers.

## Structure: a "progressive JPEG"

The main risk is that the reader stops reading before finding a reason to care. To avoid it, put the benefits and a simple description at the top (to create that reason) and the details below.

Think of it as a set of **Matryoshka dolls**: each level of detail reveals more, but at every layer the reader may stop. The opening must sell the project before they bounce. Then the facts reinforce. Then the example proves. Only then - once they're motivated - does the step-by-step guide make sense.

### 0. Clean up

In an existing README, remove all badges - they hurt readability. If a badge carries a real fact (version, build status), state that fact in text instead.

### 1. Opening block

The first paragraph is the most important part - it's where the reader decides whether to continue. **It's normal to spend up to a week on this block alone** (the PostCSS team did). It must answer three things:

- **What it does** - in plain, conversational language. Use the **"bar pitch"** technique: imagine you're at a bar with co-workers and they ask "what does your tool do?" Explain it in those terms. Then cut that explanation down ruthlessly - 2, 3, 4 more times - until only the essentials remain. No jargon, no "tech speak."
  - ❌ Bad: "Cybernetically enhanced web apps." (real Svelte description - sounds cool, explains nothing)
  - ✅ Good: "A web UI framework with a unique compiler that generates smaller JS files."
- **How the user benefits** - state it explicitly. Don't make the reader infer it.
- **What makes it different** from alternatives - the reason to switch, not just another option.

If you don't know the real differentiators, ask the user.

### 2. Facts

Right after the first paragraph, put a bullet list of the project's most important facts, features, and numbers.

Optimize the list for scanning, not word-by-word reading (the reader still doesn't have enough motivation): lead each bullet with 1-2 bold keywords, then the evidence.

Concrete evidence beats promises:

- Real benchmark numbers ("16% faster than uuid") - ask the user for them or how to run them; never estimate.
- Exact sizes ("141 bytes minified + gzipped") - measure or ask.
- Side-by-side code comparison with the closest alternative.
- Screenshots/diagrams where they replace a paragraph of text.

### 3. Example

Then put a small example, because scanning code or a screenshot is faster than reading text.

For libraries, show a small self-explanatory usage example. It doesn't need every real setup step - it only illustrates (the real guide comes below). Keep it in 4-10 lines of code and show the output in a comment, so the reader sees the result without running anything.

Nano ID's opener demonstrates steps 1-3 on one screen:

````markdown
# Nano ID

A tiny, secure, URL-friendly, unique string ID generator for JavaScript.

- **Small.** 118 bytes (minified and brotlied). No dependencies.
- **Fast.** 50% faster than UUID.
- **Safe.** It uses hardware random generator. Can be used in clusters.

```js
import { nanoid } from "nanoid";
nanoid(); //=> "V1StGXR8_Z5jdHi6B-myT"
```
````

Note: one sentence packs what + differentiators; each bullet leads with a bold keyword and backs it with a real number; the example is 2 lines with the output in a comment.

### 4. Getting started

After the intro, add a guide on how to use the tool.

Step-by-step, explicit commands for adding the tool to an existing project. The reader should be able to do it by just copying commands, without thinking. Every step must be there.

**Validate by following the guide from scratch** as if you'd never seen the project. Wipe your memory clean - pretend you're a new user. Fix every gap, every assumption, every missing step. If you can't follow it, neither can they.

## Required sections in an internal repository

The structure above is written for an open source project, where the README's
job is to win a reader who has no reason to stay. An internal service has a
reader who has to stay, and a different failure: they can clone the repository
and still not run it. Those READMEs carry a fixed set of sections, and a review
checks the list rather than the prose.

| Section                   | Answers                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Name and one-line purpose | What is this, in a sentence a stranger repeats correctly                           |
| Architecture overview     | The components, how they talk, and where this one sits. A text diagram if it helps |
| Prerequisites             | Node version, package manager, Docker, anything installed before step one          |
| Quick start               | Install, seed, run. Copy-pasteable, in order, from a clean machine                 |
| Development workflow      | Dev mode, tests, lint, format - the commands, not a description of them            |
| Seed policy               | Whether seeding is required before the first run, how to run it, how to re-seed    |
| Docker usage              | Building the image, compose, which ports come up                                   |
| Documentation             | Running the docs locally and adding a page                                         |
| License                   | Even when the answer is unlicensed                                                 |

An agent repository adds one more: how to register an agent and how to give it a
tool, because that is the change every newcomer makes first.

Two things stay out. **No directory tree** - it is generated once, wrong within a
month, and says less than the architecture paragraph it displaced. **No
hand-maintained changelog** - release notes come from the tags.

Copy-pasteable is the standard the whole list is held to. "Configure as needed"
and "set the appropriate environment variables" are not instructions; they are
the author remembering something they did not write down.

## Formatting for skimmers

- Headings for hierarchy, bold for key points, horizontal rules between layers.
- Lists over dense paragraphs.
- Put must-not-miss lines in blockquotes or bold.
- If the README is longer than ~2 screens, add a table of contents after the opening block.
- Every section should deliver a benefit early, because readers abandon at the first boring stretch.

## Checklist before finishing

1. First paragraph alone sells the project (what / benefit / difference).
2. Every number and claim is real, sourced from the repo, the user, or an actual measurement.
3. The example is self-explanatory, 4-10 lines, and shows its output.
4. Getting started works from a clean machine.
5. Skimming only headings + bold text still tells the story.

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-styleguide](../rule-styleguide/SKILL.md) - Styleguide skill index
- [rule-styleguide-markdown](../rule-styleguide-markdown/SKILL.md) - Markdown conventions this README must follow
- [rule-process-documentation](../rule-process-documentation/SKILL.md) - Documentation process beyond the README
- [rule-process-npm-release](../rule-process-npm-release/SKILL.md) - Publishing the package the README advertises
- [How to make your open source popular](https://evilmartians.com/chronicles/how-to-make-your-open-source-popular) - The Evil Martians article this structure comes from
