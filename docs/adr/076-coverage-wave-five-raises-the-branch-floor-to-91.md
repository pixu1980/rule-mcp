# 076: Coverage wave five raises the branch floor to 91

- **Date**: 2026-09-09
- **Status**: accepted
- **Tags**: testing, coverage, ci
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The execution plan's last open step is the branch ratchet: 90 measured, 95 the target. The named remainder was platform-locked daemon arms, dead domain ternaries and a long tail of 2-4 branch chips. The compression and startup work of the previous session also added modules, and a new module lands in the denominator uncovered.

## Decision

Cover the three biggest clusters that are not platform-locked and raise the floor to the measured integer. generateMultiFile had 2 of 12 branches visited, the rulemcp:// reader 15 of 26, and the command-target context none of its injection arms despite existing to be injectable. The compression pipeline's own refusals - a non-string, a JSON body, level off, an unknown level - and the catalog's local-path gate close the rest. The daemon platform arms stay uncovered on purpose: reaching a linux arm from a darwin box needs module mocking, which measures the mock rather than the code, and the ubuntu CI run already walks that half.

## Consequences

91.17 percent branches (6375/6992), floor raised 90 to 91 with 12 branches of margin. Two real defects surfaced and were fixed: the rule-mcp-meta rename had dropped Astro out of the rule-mcp-frontend prefix so detectFrameworkSkill returned no domain and the router stopped applying its framework bias; and generateMultiFile read a file template's string vanilla field as a component, emitting a custom element wrapping an empty template. The domain ternary chain became a prefix table, which also deletes three arms FRAMEWORK_SKILL_MAP can never reach. Risk: 12 branches of margin is thinner than wave four's, and the platform arms swing between the darwin dev box and the ubuntu CI runner, so a red coverage job means re-measuring on CI rather than assuming a regression.

## What would end this

The assumption this leans on, and the observation that would make it wrong.
