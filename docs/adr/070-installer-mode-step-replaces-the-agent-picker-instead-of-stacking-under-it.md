# 070: Installer mode step replaces the agent picker instead of stacking under it

- **Date**: 2026-09-08
- **Status**: accepted
- **Tags**: installer, tui, devx
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The interactive install.sh TUI drew step 2 (install mode radio) below the still-visible step 1 agent picker, reusing step 1's footer as its status bar. Users could not tell which step was active. The Phase 3 banner was also misaligned (55 vs 56 columns on one row) and box_banner content rows never closed the right border, so both boxes rendered broken. install.ps1 already cleared and re-titled the banner between steps.

## Decision

Bring bash to parity with PowerShell: on entering step 2, draw_mode_panel retitles the banner to "Phase 3 - Install Mode", erases everything below row 5 (ESC[6;1H ESC[0J), and renders a standalone panel with its own hint line and a truncated summary of the confirmed agents. Footer redraws were removed from the mode loop. All banner rows are padded to the fixed 56-column box (box_banner pads content to the 54-column interior). The PTY acceptance test now asserts equal box-row widths, the erase sequence, the retitled banner, and the agents summary. SHA256SUMS regenerated.

## Consequences

Positive: each wizard step stands alone; average users see one question at a time; bash and PowerShell installers behave identically; banner boxes always close. Negative: the confirmed-agent list is truncated to 46 characters in the summary row; step 1 state is no longer visible during step 2.

## What would end this

Assumption: the installer wizard stays a two-step alt-screen TUI with a fixed 56-column banner. Observation: a third step, scrolling picker, or dynamic-width banner would require a general step-transition framework instead of fixed row addressing.

## Alternatives Considered

1. Keep stacking but visually separate step 2 with a divider - still leaves two hint lines and a stale footer on screen
1. Full-screen clear and redraw per step - throws away the differential renderer and reintroduces flicker
1. Reuse the step 1 footer as a shared status bar - the footer's selection counter is meaningless during mode selection
