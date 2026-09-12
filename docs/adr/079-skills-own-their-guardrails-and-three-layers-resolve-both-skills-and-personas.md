# 079: Skills own their guardrails, and three layers resolve both skills and personas

- **Date**: 2026-09-12
- **Status**: accepted
- **Tags**: architecture, skills, guardrails, personas, extensibility
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Guardrails lived in src/core/guardrails/ as 98 files grouped by family, and engine/_registry.js composed them per skill by pattern-matching the skill name. A skill was markdown; the rules that judge its subject lived somewhere else, so a skill could not be moved, shared or extended without editing the server. ADR 033 had closed every extension point for a measured reason: merging ~/.agents/skills exposed 176 tools instead of 88 (216 KB of schemas per turn, about 54k tokens), let a home directory shadow bundled content, and imported plugin.js from the home directory into the server process. The role overlay system kept a user layer but its project layer was removed on the principle that nothing the server reads comes from a checkout. The result was a server that could not be extended per project at all.

## Decision

A skill owns the rules that judge its subject. Guardrails move into skills/<name>/guardrails/*.js as the same { id, label, description, check } modules they already are, and the SKILL.md frontmatter declares them: guardrails lists the ids the skill defines, inherits lists the skills it takes rules from. Composition is inheritance rather than pattern-matching: rule-backend-express inherits rule-backend, rule-frontend-react inherits the styleguide skills whose rules it needs. Resolution is depth-first with dedup by id and the nearest definition wins, so a child skill overrides a rule it inherits. Skills and personas both resolve through three layers, loaded native then project then user, last wins, whole-entry override, with the originating layer recorded on every entry: skills/ and personas/ bundled with the server, <projectRoot>/.rule-mcp/{skills,personas} found by walking up from the working directory to the first .git or .rule-mcp, and ~/.rule-mcp/{skills,personas} for the machine owner, who therefore has the last word over any repository. src/roles becomes ./personas beside ./skills. A custom skill declares exposeTool in its frontmatter, default false, so dropping a folder in adds guardrails and searchable evidence without growing the tool surface. Custom guardrail JS is imported without a trust gate; the worker thread with its timeout stays the only guard. ~/.agents/skills is unrelated to all of this: it is where the installer can copy skills for agents that read skills natively, offered as an install mode that sets up no MCP server, and the server never scans it.

## The baseline, and why it is not inherited

Thirty rules applied to every skill before this: the naming, prose, comment, simplicity and markup checks. They now live in the thirteen skills that own them by subject, and every check still includes them - but `BASELINE_SKILLS` in the engine names those thirteen rather than each of the ninety-one SKILL.md files declaring them.

The reason is the graph. A baseline every skill inherits cannot also be a set of skills that inherit the baseline: that is a cycle, and while the resolver reports a cycle and steps over it, a declaration whose meaning depends on how a resolver breaks it is not a declaration anybody can read. The alternative considered was each of the thirteen inheriting the other twelve, which is acyclic and explicit and also a complete graph nobody would want to edit.

So: rules are distributed, which is what the skills own. Which skills are always on is one list, in one place, with the reason beside it.

## The helper surface

A rule is written against `@rule-mcp/sdk`, a published package holding the verdict constructors, the source helpers and the prose scanners the bundled rules use. It is a declared dependency rather than a path into this server's `src/`, which is what lets a skill folder be copied anywhere and still resolve what its rules import.

Inside this package, `@src/*` resolves to `./src/` through `module.registerHooks`, registered by every entry point that loads server code. The cost is explicit: a file using the alias is not runnable by a bare `node`, which is why the alias appears only in `src/` and never in a skill's guardrails.

The server's own `exports` declares only `./package.json`. Its internals are not a contract, and a rule that reached into them would break on a refactor it never saw.

## Consequences

A project versions its own rules beside its code and a team shares them through git. A skill is portable: its SKILL.md names its rules and the rules sit beside it, so the same folder works bundled, in a project, in a home directory, or copied into ~/.agents/skills. The cost is explicit and accepted: importing custom guardrail JS reinstates in-process execution of code from a checkout and from the home directory, which is exactly what ADR 033 removed for finding 15 of the 2026-08-04 audit. This supersedes that part of ADR 033. Cloning a repository and starting the server now runs its guardrail code; the worker timeout bounds a runaway pattern but not a hostile one. The tool-surface half of ADR 033 stands, guarded differently: exposeTool defaults to false, so the 176-tool explosion cannot happen by accident. Every bundled SKILL.md must declare its inheritance or silently lose its baseline rules, so a test asserts that each one does.

## What would end this

This leans on the assumption that the people who clone a repository into which this server is pointed are the people who wrote it. A guardrail imported from a checkout is code, and nothing between the clone and the import inspects it. A single incident of a repository shipping a hostile check, or the first time this server is pointed at code the user did not write, ends the no-gate decision and brings back the trust gate that was rejected above.

## Alternatives Considered

1. Declarative guardrails in YAML, rejected: the check function is the expressive surface and a grammar would have to grow into a language
1. A trust gate before importing custom guardrail JS, rejected as ceremony for a single-user tool; the risk is recorded here instead
1. Keeping the 30 always-on rules in the engine, rejected: two places to look for a rule is what this decision removes
1. appliesTo patterns on each rule instead of inherits on each skill, rejected: reading one SKILL.md must be enough to know what will run
1. Project layer winning over the user layer, rejected: the machine owner keeps the last word over any repository content
