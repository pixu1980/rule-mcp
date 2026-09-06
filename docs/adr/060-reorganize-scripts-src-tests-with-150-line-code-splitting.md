# 060: Reorganize scripts, src and tests with 150-line code splitting

- **Date**: 2026-09-06
- **Status**: accepted
- **Tags**: architecture, refactor, testing, structure
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

src/ has 108 files and 32,993 lines; 24 files exceed 150 lines (up to 1089), violating the 100-line + 50-tolerance threshold rule. test/ has 147 flat files with no per-domain grouping. Coverage measured with node --experimental-test-coverage is 71.57% line and 80.91% branch (unit batch), below the 95% target even on branches; the CLI/installer tests run in subprocesses and are invisible to in-process instrumentation. No rule skill imposes a line limit for server-side JS.

## Decision

Reorganize scripts/, src/ and test/ (renamed to tests/) into thematic subfolders by feature; apply code splitting with a 150-line threshold (100 + 50 tolerance) to JS/MJS files, exempting the shell installers; adopt the module-per-concern pattern of rule-frontend-custom-element as the split model; make branch coverage of at least 95% measurable (baseline npm script + c8 for the subprocesses) and close the gaps with targeted tests before each split.

## Consequences

Positive: navigability, isolation, measurable coverage and a CI gate. Negative: a large mechanical blast radius (147 test paths, package.json/workflow/docs listings), risk of implicit regressions in the splits (mitigated by re-exports and surface tests), work spread across multiple sessions.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Rename test/ only, without subfolders: no navigability gain
1. Split everything at once without a coverage baseline: changes are not measurable
1. Adopt a rigid threshold (100) with no tolerance: high friction on legitimate files
