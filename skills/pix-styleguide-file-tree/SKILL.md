---
name: rule-styleguide-file-tree
description: >-
  Use when laying out a source tree: the underscore-barrel convention, where a component folder puts its index.js, which files carry the underscore prefix, and what a barrel must re-export. Covers the scan that finds the drift and the fix that repairs it.
tags:
  - file-tree
  - barrel
  - naming
  - structure
  - components
  - convention
frameworks: [all]
guardrails: [barrel-exports-match-files, barrel-file-tree, component-export-check, component-file-prefix, component-folder-barrel]
---

# rule-styleguide-file-tree - One concern per file, one barrel per folder

A component folder is a PascalCase directory holding an `index.js` barrel and
one underscore-prefixed file per concern. The barrel is the folder's public
API: a caller imports the folder, never a file inside it.

## The convention

- A component folder is named in PascalCase: `Button/`, `DataTable/`.
- Every component file inside it starts with an underscore: `_Button.jsx`.
- The folder carries an `index.js` that re-exports what the folder offers.
- A stylesheet sits beside the component it styles: `_Button.css`.
- A file that looks like a component but sits outside a component folder is
  either misplaced or misnamed; a lowercase or kebab-case file at the folder
  root is a utility and is left alone.

## Why the underscore

The prefix answers "is this the public API or the implementation" without
opening the file. `index.js` is what a caller imports; everything beside it is
internal to the folder, and the tooling can say so without a convention
document in someone's head.

## Checking and fixing

`rule_tool_check` with this skill reports the drift. The repairs - renaming an
unprefixed component, creating a missing barrel, filling an empty one from the
components beside it - are judgment calls the run makes from the report. An orphan
stylesheet is reported and never guessed at - deleting it and creating the
missing component are both plausible, and only a person knows which.

## See also

- `rule-styleguide` - the styleguide hub these rules belong to
- `rule-styleguide-naming` - what a file is called, before what is inside it
- `rule-process-code-review` - where these rules are applied to someone else's change
