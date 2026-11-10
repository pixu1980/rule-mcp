# 248: Close out plan _install-surface-depth-skills

- **Date**: 2026-11-10
- **Status**: accepted
- **Tags**: docs, closeout, plan
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The plan record docs/plans/_install-surface-depth-skills.md, "Plan: Remove the minimal surface, clarify the depth step, gate the skill writes", finished with 10 closed items.

## Outcome

- WS1-T1: delete the minimal-tools feature from the catalog, so the Features step lists the remaining switches only
- WS1-T2: delete the minimal surface tier from the router spec, the surface flags, the wizard rows and the profiles
- WS1-T3: delete MINIMAL_ALLOWLIST and the RULE_MCP_MINIMAL_TOOLS plumbing, so no install writes the variable
- WS1-T4: delete the --minimal and --no-minimal flags from setup, the entry parser and the plan builder
- WS1-T5: update the tests that name the tier or the feature, and regenerate the census documents
- WS2-T1: retitle the step "How deep should each agent go?" and explain the rungs in the help lines
- WS2-T2: assert the title and the help in the wizard tests, so the sentence cannot drift back
- WS3-T1: pass the commands answer into the Devin install, so --no-commands writes no ~/.config/devin/skills
- WS3-T2: name the directories the commands step writes, per selected agent, in the dimension row
- WS3-T3: cover both with a test that runs the installer with commands on and off

### Plan prose

Topic: Install system: remove the minimal MCP tool surface feature and tier, rename the depth step, and gate the Devin skill directories on the commands dimension

Depends on: - Feeds: - Shared files: `packages/mcp/cli/setup/opentui/_wizard.js`, `docs/05-features.md`

The Surface step offers four tiers, and the Features step offered a switch that set the same thing. The user asked to remove the duplicate: the `minimal-tools` feature goes, and so does the `minimal` surface tier.

The Depth step asks "How much should the install write?", which does not say what it controls. It caps the integration rungs per host.

The Devin installer writes one directory per `rule-*` command into `~/.config/devin/skills` on every agent install. The "Agent slash commands" dimension does not reach it. Codex already follows the dimension, because `~/.agents/skills` is its documented command target (see [command targets](../../packages/mcp/core/agents/command-targets/_registry.data.js)).

Owns: `packages/mcp/core/skills/_minimal.js`, `packages/mcp/core/skills/_surface.js`, `packages/mcp/tools/router/_surface.js`, `packages/mcp/core/runtime/features/_catalog.data.js`, `packages/mcp/cli/install/_surface-flags.js`, `packages/mcp/cli/setup/_options.js`, `packages/mcp/cli/setup/_entry.js`, `packages/mcp/cli/setup/_plan-install.js`, `packages/mcp/cli/setup/_task-core.js`, `packages/mcp/cli/setup/_direction-install.js`, `packages/mcp/cli/setup/opentui/_items.js`, `packages/mcp/cli/_register-setup.js`, `packages/mcp/cli/installers/_env.js`

Owns: `packages/mcp/cli/setup/opentui/_wizard.js`, `packages/mcp/cli/setup/opentui/_items-depth.js`

Owns: `packages/mcp/cli/installers/_agents-ide.js`, `packages/mcp/cli/setup/_task-core.js`, `packages/mcp/cli/setup/opentui/_items.js`

- `870e56a0` refactor(surface)!: drop the minimal tier and its feature switch - `7043afa7` fix(install): write Devin's command files only when the commands step asks - `fa57f40c` feat(setup): say what the depth and commands steps write - `5eea509b` docs(env): drop the minimal tools switch from the handbook - ADR 246: the server floor is Node 24 and the wizard floor stays 26.4


## Decision

Fold the record into this ADR and the session handoff, then delete the source file. The full text stays in git history.

## Consequences

docs/plans/_install-surface-depth-skills.md is gone from the tree; this ADR keeps what it delivered and the handoff of this session names it.

## What would end this

The work this plan closed returns: a step it dismissed reopens, and this ADR no longer explains why.
