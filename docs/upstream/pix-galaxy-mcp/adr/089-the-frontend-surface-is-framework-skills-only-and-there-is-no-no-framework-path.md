# 089: The frontend surface is framework skills only, and there is no no-framework path

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: skills, frontend, routing, guardrails, installer
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The frontend area carried three skills for the no-framework path alongside the framework ones: a client runtime, a component decorator with its own scaffolder, and a file-based HTML engine with its own expression parser and directive syntax. They also carried a VS Code extension for that syntax, nine of the guardrail rules, eighteen corpus snippets, and an install phase in four installer scripts that built a .vsix and pushed it into six editor variants. The owner decided the area should be framework skills and styleguides, nothing else.

## Decision

The frontend area is the framework skills, the meta-framework skills, workers, and the area index. The guardrail set is framework-based: one group per framework plus the shared, file-tree and JavaScript groups, and the framework map holds no entry that is not a framework. The detector resolves an undetected project - its vanilla key and its fallback - to rule-frontend, the area skill, because no skill claims that ground now. The installers write agent configuration and nothing else: no editor extension is built, installed or removed. The framework skills describe what they adapt as a store-and-signals architecture, which is what their mapping tables always compared.

## Consequences

The surface is 105 tools, 184 resources, 88 skills and 84 guardrail rules, from 108, 190, 91 and 93; the corpus is 168 snippets over 84 of 84 rules and the floor moved with it. ci stays green at 48.0s and the repository is 11464 lines lighter. A prompt naming plain JavaScript and a reactive store routes to rule-frontend-react at full confidence, with rule-frontend second at 0.81: BM25 scores the store-and-signals vocabulary the framework skills inherited, and nothing else carries it. Whoever wants that phrasing answered has to give rule-styleguide-javascript the vocabulary, or accept the framework answer. The HTML styleguide no longer documents directive syntax, because nothing in this repository implements it. An editor extension installed by an earlier version stays installed: the uninstaller does not look for one.

## What would end this

A request for plain JavaScript, static HTML or a store without a framework arrives often enough that routing it to a framework skill is visibly the wrong answer, and the area needs a skill for that ground again - written from scratch, since nothing was kept.
