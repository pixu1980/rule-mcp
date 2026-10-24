# 121: The install reconciles the bundled skills when the step is not selected

- **Date**: 2026-09-23
- **Status**: accepted
- **Tags**: installer, skills, commands
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The install offers one opt-in step, Bundled rule-mcp-* skills, that copies the catalog to ~/.agents/skills and ~/.claude/skills for hosts that read skills from disk (pi, Claude). DEFAULT_EXTRAS excludes it, so a default install writes no skills. What it also did was remove nothing: a machine that had the skills from an earlier run kept them, and the hosts kept discovering /skill:rule-mcp-* the user did not ask for. Separately, the uninstall skillsRemovalTask called `rule-mcp skills uninstall --dry-run`, an action the CLI never implemented, so the removal path failed silently in every flow. The catalog was installed by one step and owned by no step.

## Decision

1. skills uninstall is a real CLI action, with --scope and --dry-run, that removes only the names the installer owns: the catalog skills plus the generated persona skills. It targets ~/.agents/skills, ~/.claude/skills and the legacy ~/.claude, and never a name a user wrote by hand. 2. The install plan always carries exactly one skills row: skillsTask when the step is selected, skillsRemovalTask when it is not, so declining the step means absent rather than leave whatever an earlier install copied. 3. The plan keeps building without touching the filesystem: the reconcile is a task like any other and states what it would remove in the review screen.

## Consequences

The skills choice becomes two-way, which is what the checkbox already promised. A fresh machine reports nothing to remove; a machine with copied skills loses them when the step is declined. The uninstall path now works instead of warning. Cost: a user who installed the skills deliberately and later re-runs an install without selecting the step loses them, so the review screen names the row rather than removing silently. The catalog names are the ownership list, so a user directory is never swept.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Leave the install read-only and rely on an explicit skills uninstall (rejected: the reported symptom is exactly that the install choice was not honored).
1. Pre-select the step when copied skills are detected (rejected: it asks the user to keep something they may have declined, and still leaves the files when they do not confirm).
1. Wipe the whole skills directory on uninstall (rejected: it would delete skills the user wrote, which the installer does not own).
