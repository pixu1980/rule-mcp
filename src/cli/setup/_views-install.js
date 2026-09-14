/**
 * @module cli/setup/views-install
 *
 * The install wizard's screens, one per step, in the order the rail shows.
 *
 * Split out of the app so the app is what it claims to be: state, and the
 * decision of which screen is holding it. Every entry is a thunk, so only the
 * screen on the rail is built - a view that constructed all seven would run
 * eight layouts per keystroke.
 */

import { h } from "./_h.js";
import { installNextSteps } from "./_next-steps.js";
import { tally } from "./_run-plan.js";
import { StepAgents } from "./_step-agents.js";
import { StepApply } from "./_step-apply.js";
import { StepCommands } from "./_step-commands.js";
import { StepDone } from "./_step-done.js";
import { StepExtras } from "./_step-extras.js";
import { StepMode } from "./_step-mode.js";
import { StepPreflight } from "./_step-preflight.js";
import { StepReview } from "./_step-review.js";

/**
 * Build the eight install screens over one snapshot of wizard state.
 *
 * @param {object} state - the app's state and the setters that move it
 * @returns {Array<() => object>} one thunk per step
 */
export function installViews(state) {
  const {
    active,
    agents,
    body,
    catalog,
    checks,
    columns,
    context,
    dryRun,
    extras,
    extrasList,
    mode,
    plan,
    results,
    selection,
    setAgents,
    setDryRun,
    setExtras,
    setMode,
    setSelection,
    setStep,
    quit,
  } = state;

  return [
    () => h(StepPreflight, { checks, blocked: context.blocked, onSubmit: () => setStep(1) }),
    () =>
      h(StepAgents, {
        items: catalog.items,
        initial: agents,
        height: body,
        columns,
        onSubmit: (picked) => {
          setAgents(picked);
          setStep(2);
        },
        onBack: () => setStep(0),
      }),
    () =>
      h(StepMode, {
        initial: mode,
        columns,
        agents,
        onSubmit: (picked) => {
          setMode(picked);
          setStep(3);
        },
        onBack: () => setStep(1),
      }),
    () =>
      h(StepExtras, {
        items: extrasList,
        initial: extras,
        columns,
        onSubmit: (picked) => {
          setExtras(picked);
          // Nothing to choose when no command file is being written, and a
          // screen with no consequence is a screen that trains people to skip
          // the ones that have consequences.
          setStep(picked.includes("commands") ? 4 : 5);
        },
        onBack: () => setStep(2),
      }),
    () =>
      h(StepCommands, {
        initial: selection,
        columns,
        height: body,
        onSubmit: (picked) => {
          setSelection(picked);
          setStep(5);
        },
        onBack: () => setStep(3),
      }),
    () =>
      h(StepReview, {
        plan,
        dryRun,
        height: body,
        onToggleDryRun: () => setDryRun((current) => !current),
        onSubmit: () => setStep(6),
        onBack: () => setStep(extras.includes("commands") ? 4 : 3),
      }),
    () => h(StepApply, { results, activeIndex: active, dryRun, height: body }),
    () =>
      h(StepDone, {
        counts: tally(results),
        results,
        dryRun,
        nextSteps: installNextSteps({ mode, dryRun }),
        onQuit: quit,
      }),
  ];
}
