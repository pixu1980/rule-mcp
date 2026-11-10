# install-surface-depth-skills

- **Plan**: `docs/plans/_install-surface-depth-skills.md` (retired)
- **ADR**: 248 (`248-close-out-plan-install-surface-depth-skills.md`)

## Delivered

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

## Where it lives now

The ADR holds the decision and its consequences. This file records that the
plan closed and what it delivered; nothing in it is open.
