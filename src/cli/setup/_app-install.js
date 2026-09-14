/**
 * @module cli/setup/app-install
 *
 * The install wizard: step state, and which view the frame is holding.
 *
 * Every step is a pure view over this state, so going back is a decrement
 * rather than an undo - nothing is written until the review step is
 * confirmed. The screens themselves live in `_views-install.js`.
 */

import { Box, Text, h, useApp, useEffect, useInput, useMemo, useState, useStdout } from "./_h.js";
import { agentRows } from "./_agent-rows.js";
import { Frame } from "./_chrome.js";
import { HINTS, STEP_NAMES } from "./_steps.data.js";
import { buildInstallPlan } from "./_plan-install.js";
import { DEFAULT_EXTRAS } from "./_options.js";
import { preflight } from "./_preflight.js";
import { runPlan } from "./_run-plan.js";
import { installableTargets } from "./_rules-apply.js";
import { extraItems } from "./_step-extras.js";
import { COLORS } from "./_theme.js";
import { installViews } from "./_views-install.js";
import { useViewport } from "./_viewport.js";

/** The step that runs the plan, and the one that reports it. */
const APPLY_STEP = 6;
const DONE_STEP = 7;

/**
 * @param {{ defaults?: object, onFinish?: Function }} props
 */
export function InstallApp({ defaults = {}, onFinish }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { rows, columns } = useViewport(stdout);
  const [step, setStep] = useState(0);
  const [agents, setAgents] = useState(defaults.agents ?? null);
  const [mode, setMode] = useState(defaults.mode ?? "stdio");
  const [extras, setExtras] = useState(defaults.extras ?? DEFAULT_EXTRAS);
  // Null is "every command", the same thing an install with no selection flag
  // writes. The commands step replaces it with what it was told.
  const [selection, setSelection] = useState(defaults.selection ?? null);
  const [dryRun, setDryRun] = useState(Boolean(defaults.dryRun));
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(-1);

  const { checks, context } = useMemo(() => preflight(), []);
  const catalog = useMemo(() => agentRows(), []);
  const selectedAgents = agents ?? catalog.detected;
  const extrasList = useMemo(
    () =>
      extraItems({
        mode,
        hasClaude: selectedAgents.includes("claude"),
        agents: selectedAgents,
        ruleFiles: installableTargets(undefined, selectedAgents).map((target) => target.file),
      }),
    [mode, selectedAgents],
  );
  const plan = useMemo(
    () =>
      buildInstallPlan({
        agents: selectedAgents,
        mode,
        extras: Object.fromEntries(extras.map((id) => [id, true])),
        force: Boolean(defaults.force),
        context,
        selection,
      }),
    [selectedAgents, mode, extras, defaults.force, context, selection],
  );

  const quit = () => {
    onFinish?.({ results, dryRun });
    exit();
  };

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      quit();
    }
  });

  useEffect(() => {
    if (step !== APPLY_STEP) {
      return;
    }

    runPlan(plan, {
      dryRun,
      onUpdate: (next, index) => {
        setResults(next);
        setActive(index);
      },
    }).then((final) => {
      setResults(final);
      setActive(-1);
      setStep(DONE_STEP);
    });
  }, [step, plan, dryRun]);

  // Frame chrome costs 7 rows (two bordered boxes plus the step rail) and a
  // step costs 4 more for its title, spacing and footer line. Overshooting
  // this makes Yoga clip the list, which drops rows silently.
  const body = Math.max(5, rows - 14);
  const views = installViews({
    active,
    agents: selectedAgents,
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
  });

  return h(
    Frame,
    {
      title: "Setup",
      subtitle: dryRun ? "dry run" : "",
      steps: STEP_NAMES.install,
      active: step,
      hints: HINTS.install[step],
      rows,
      columns,
    },
    selectedAgents.length === 0 && step > 1
      ? h(
          Box,
          { paddingBottom: 1 },
          h(Text, { color: COLORS.warn }, "No agents selected - only the shared steps will run."),
        )
      : null,
    views[step](),
  );
}
