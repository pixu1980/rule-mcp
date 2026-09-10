

/**
 * @module cli/setup/app-install
 *
 * The install wizard: step state, and which view the frame is holding.
 *
 * Every step is a pure view over this state, so going back is a decrement
 * rather than an undo - nothing is written until the review step is
 * confirmed.
 */

import { Box, Text, h, useApp, useEffect, useInput, useMemo, useState, useStdout } from "./_h.js";
import { agentRows } from "./_agent-rows.js";
import { Frame } from "./_chrome.js";
import { HINTS, STEP_NAMES } from "./_steps.data.js";
import { buildInstallPlan } from "./_plan-install.js";
import { installNextSteps } from "./_next-steps.js";
import { preflight } from "./_preflight.js";
import { runPlan, tally } from "./_run-plan.js";
import { StepAgents } from "./_step-agents.js";
import { StepApply } from "./_step-apply.js";
import { StepDone } from "./_step-done.js";
import { extraItems, StepExtras } from "./_step-extras.js";
import { StepMode } from "./_step-mode.js";
import { StepPreflight } from "./_step-preflight.js";
import { StepReview } from "./_step-review.js";
import { COLORS } from "./_theme.js";
import { useViewport } from "./_viewport.js";

const DEFAULT_EXTRAS = ["rules", "commands", "doctor"];

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
  const [dryRun, setDryRun] = useState(Boolean(defaults.dryRun));
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(-1);

  const { checks, context } = useMemo(() => preflight(), []);
  const catalog = useMemo(() => agentRows(), []);
  const selectedAgents = agents ?? catalog.detected;
  const extrasList = useMemo(() => extraItems({ mode, hasGit: Boolean(context.gitVersion) }), [mode, context.gitVersion]);
  const plan = useMemo(
    () => buildInstallPlan({ agents: selectedAgents, mode, extras: Object.fromEntries(extras.map((id) => [id, true])), force: Boolean(defaults.force), context }),
    [selectedAgents, mode, extras, defaults.force, context],
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
    if (step !== 5) {
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
      setStep(6);
    });
  }, [step, plan, dryRun]);

  // Frame chrome costs 7 rows (two bordered boxes plus the step rail) and a
  // step costs 4 more for its title, spacing and footer line. Overshooting
  // this makes Yoga clip the list, which drops rows silently.
  const body = Math.max(5, rows - 14);

  const views = [
    () => h(StepPreflight, { checks, blocked: context.blocked, onSubmit: () => setStep(1) }),
    () =>
      h(StepAgents, {
        items: catalog.items,
        initial: selectedAgents,
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
        agents: selectedAgents,
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
          setStep(4);
        },
        onBack: () => setStep(2),
      }),
    () => h(StepReview, { plan, dryRun, height: body, onToggleDryRun: () => setDryRun((current) => !current), onSubmit: () => setStep(5), onBack: () => setStep(3) }),
    () => h(StepApply, { results, activeIndex: active, dryRun, height: body }),
    () => h(StepDone, { counts: tally(results), results, dryRun, nextSteps: installNextSteps({ mode, dryRun }), onQuit: quit }),
  ];

  return h(
    Frame,
    { title: "Setup", subtitle: dryRun ? "dry run" : "", steps: STEP_NAMES.install, active: step, hints: HINTS.install[step], rows, columns },
    selectedAgents.length === 0 && step > 1 ? h(Box, { paddingBottom: 1 }, h(Text, { color: COLORS.warn }, "No agents selected - only the shared steps will run.")) : null,
    views[step](),
  );
}
