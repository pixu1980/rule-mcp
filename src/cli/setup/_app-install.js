/**
 * @module cli/setup/app-install
 *
 * The install wizard: step state, and which view the frame is holding.
 * Steps are pure views over state, so back is a decrement and nothing is
 * written until review is confirmed. Screens live in `_views-install.js`.
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
const APPLY_STEP = 7;
const DONE_STEP = 8;

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
  // Null is every command and every tool: each step replaces what it was told.
  const [selection, setSelection] = useState(defaults.selection ?? null);
  const [surface, setSurface] = useState(defaults.surface ?? null);
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
        minimal: extras.includes("minimal") || undefined,
        surface,
      }),
    [selectedAgents, mode, extras, defaults.force, context, selection, surface],
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

  // Frame chrome costs 7 rows plus the rail, a step 4 more; overshooting
  // makes Yoga clip the list, which drops rows silently.
  const views = installViews({
    active,
    agents: selectedAgents,
    body: Math.max(5, rows - 14),
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
    setSurface,
    surface,
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
