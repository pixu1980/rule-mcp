/**
 * @module cli/setup/app-uninstall
 *
 * The uninstall wizard: scan, choose, purge, review, remove.
 *
 * The scan runs once on mount and everything after it is a view over that
 * snapshot. Re-scanning between steps would let the list change under the
 * user's cursor while they are reading it.
 */

import { h, useApp, useEffect, useInput, useMemo, useState, useStdout } from "./_h.js";
import { Frame } from "./_chrome.js";
import { HINTS, STEP_NAMES } from "./_steps.data.js";
import { buildUninstallPlan } from "./_plan-uninstall.js";
import { uninstallNextSteps } from "./_next-steps.js";
import { runPlan, tally } from "./_run-plan.js";
import { scanInstallation } from "./_scan.js";
import { StepApply } from "./_step-apply.js";
import { StepDone } from "./_step-done.js";
import { groupItems, StepScan } from "./_step-scan.js";
import { purgeItems, StepPurge } from "./_step-purge.js";
import { StepReview } from "./_step-review.js";
import { useViewport } from "./_viewport.js";

/**
 * @param {{ defaults?: object, onFinish?: Function }} props
 */
export function UninstallApp({ defaults = {}, onFinish }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { rows, columns } = useViewport(stdout);
  const scan = useMemo(() => scanInstallation(), []);
  const items = useMemo(() => groupItems(scan.groups), [scan]);
  const purgeRows = useMemo(() => purgeItems(scan.purge), [scan]);

  const [step, setStep] = useState(0);
  const [groups, setGroups] = useState(defaults.groups ?? scan.groups.filter((group) => group.count > 0).map((group) => group.id));
  const [purgeIds, setPurgeIds] = useState(defaults.purgeIds ?? []);
  const [dryRun, setDryRun] = useState(Boolean(defaults.dryRun));
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(-1);

  const plan = useMemo(() => buildUninstallPlan({ agents: scan.agents, groups, purgeIds }), [scan.agents, groups, purgeIds]);

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
    if (step !== 3) {
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
      setStep(4);
    });
  }, [step, plan, dryRun]);

  // Same budget as the install wizard: chrome plus the step's own lines.
  const body = Math.max(5, rows - 14);

  const views = [
    () =>
      h(StepScan, {
        items,
        initial: groups,
        columns,
        height: body,
        onSubmit: (picked) => {
          setGroups(picked);
          setStep(1);
        },
        onBack: quit,
      }),
    () =>
      h(StepPurge, {
        items: purgeRows,
        columns,
        onSubmit: (picked) => {
          setPurgeIds(picked);
          setStep(2);
        },
        onBack: () => setStep(0),
      }),
    () =>
      h(StepReview, {
        plan,
        dryRun,
        title: "Review removal",
        danger: true,
        height: body,
        onToggleDryRun: () => setDryRun((current) => !current),
        onSubmit: () => setStep(3),
        onBack: () => setStep(1),
      }),
    () => h(StepApply, { results, activeIndex: active, dryRun, height: body }),
    () => h(StepDone, { counts: tally(results), results, dryRun, nextSteps: uninstallNextSteps({ dryRun, purged: purgeIds.length > 0 }), onQuit: quit }),
  ];

  return h(Frame, { title: "Uninstall", subtitle: dryRun ? "dry run" : "", steps: STEP_NAMES.uninstall, active: step, hints: HINTS.uninstall[step], rows, columns }, views[step]());
}
