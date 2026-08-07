#!/usr/bin/env node
// rule-architect-cli - Terminal interview wizard
// Reads wizard-spec.json from rule-architect engine.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { visibleSteps, applyPrefill } from "../rule-architect/validators.mjs";
import { generateContext } from "../rule-architect/generator.mjs";
import { renderStep, enterAltScreen, exitAltScreen } from "./renderer.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = join(__dirname, "..", "rule-architect", "wizard-spec.json");

function loadSpec() {
  if (!existsSync(SPEC_PATH)) {
    console.error("wizard-spec.json not found at", SPEC_PATH);
    process.exit(1);
  }
  return JSON.parse(readFileSync(SPEC_PATH, "utf-8"));
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    tier: args.includes("--tier") ? args[args.indexOf("--tier") + 1] : "starter",
    output: args.includes("--output") ? args[args.indexOf("--output") + 1] : process.cwd(),
    answersFile: args.includes("--answers") ? args[args.indexOf("--answers") + 1] : null,
    // Overwrite pre-existing root entry files (CLAUDE.md, AGENTS.md, …).
    // Off by default so a hand-authored file is never clobbered silently.
    force: args.includes("--force"),
  };
}

async function runInterview() {
  const opts = parseArgs();
  const spec = loadSpec();
  const allSteps = spec.steps;
  let answers =
    opts.answersFile && existsSync(opts.answersFile) ? JSON.parse(readFileSync(opts.answersFile, "utf-8")) : {};

  // ── Enter alternate screen buffer ──
  enterAltScreen();
  process.on("SIGINT", () => {
    exitAltScreen();
    process.exit(130);
  });

  // ── Step 0: Analysis Depth - always shown, no step counter ──
  const depthStep = allSteps.find((s) => s.key === "step-0-depth");

  if (depthStep) {
    answers = applyPrefill(answers, spec.prefillMap);
    const result = await renderStep(depthStep, answers, spec.optionGroups, {
      isFirst: true,
      isLast: false,
      stepNum: 0, // 0 means "unknown" - renderer hides counter
      totalSteps: 0,
    });

    if (result.action === "quit") {
      exitAltScreen();
      console.log("Interview aborted.");
      process.exit(0);
    }

    answers = { ...answers, ...result.values };
  }

  // ── Now filter remaining steps by chosen depth ──
  const depth = answers.ANALYSIS_DEPTH || opts.tier || "starter";
  const steps = visibleSteps(allSteps, depth).filter((s) => s.key !== "step-0-depth");

  // ── Steps 1..N ──
  let stepIdx = 0;
  while (stepIdx < steps.length) {
    const step = steps[stepIdx];
    answers = applyPrefill(answers, spec.prefillMap);
    const result = await renderStep(step, answers, spec.optionGroups, {
      isFirst: stepIdx === 0,
      isLast: stepIdx === steps.length - 1,
      stepNum: stepIdx + 1,
      totalSteps: steps.length,
    });

    if (result.action === "quit") {
      exitAltScreen();
      console.log("Interview aborted. Use --answers to resume later.");
      process.exit(0);
    } else if (result.action === "prev" && stepIdx > 0) {
      stepIdx--;
    } else if (result.action === "next" || result.action === "submit") {
      answers = { ...answers, ...result.values };
      stepIdx++;
    }
  }

  // ── Generate .context/ ──
  exitAltScreen();
  console.log(`\n  Generating .context/ in ${opts.output}...`);
  const gen = generateContext(answers, spec, opts.output, { force: opts.force });
  const written = gen.files.length - gen.skipped.length;
  console.log(`  Done. ${written} files written to ${opts.output}`);
  for (const path of gen.skipped) {
    console.log(`  ⚠ ${path} exists - skipped (use --force to overwrite)`);
  }
  if (gen.skipped.length > 0) {
    console.log(`  Re-run with --force to overwrite ${gen.skipped.length} existing root file(s).`);
  }
  console.log("");
}

runInterview().catch((err) => {
  exitAltScreen();
  console.error("Fatal:", err.message);
  process.exit(1);
});
