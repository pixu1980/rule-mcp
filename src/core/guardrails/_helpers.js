

/**
 * @module core/guardrails/helpers
 *
 * What a guardrail is handed to do its job (ADR 089).
 *
 * A rule imports nothing. The engine passes this bag as `context.helpers` on
 * every check, so a rule file is a plain module that resolves the same wherever
 * the skill it belongs to was loaded from - this repository, a project's
 * `.rule-mcp/skills`, a user's own, a folder copied between machines.
 * There is no package to install and no path to get wrong.
 *
 * The trade is deliberate: a rule is a pure function of what it receives, and
 * what it may receive is this list. Adding to the list is adding to the
 * contract every skill on the machine is written against, so it is a decision
 * rather than an import.
 */

import { countedVerdict, isTypeScriptFile, passResult, tsSkipResult } from "../../shared/index.js";
import { extractRealCSS, looksLikeStylesheet, looksLikeStyling, maskLiterals, unjustifiedGrids } from "./_util.js";
import { INSTALLED_GROUPS, isPinned, manifestOf, stripLiterals } from "./quality/_guards-meta.js";
import { findRaggedBoxes } from "../text/ascii-box/index.js";
import { scanCodeForForeign, scanDocumentForForeign, scanPathForForeign } from "../text/en-english/index.js";
import { findFingerprints } from "../text/fingerprint/index.js";

/**
 * The helpers every check is handed, frozen so one rule cannot reshape what
 * the next one sees.
 */
export const GUARDRAIL_HELPERS = Object.freeze({
  // Verdicts: the shapes a check returns.
  countedVerdict,
  passResult,
  tsSkipResult,
  isTypeScriptFile,

  // Source: read the code without re-parsing it.
  extractRealCSS,
  looksLikeStylesheet,
  looksLikeStyling,
  maskLiterals,
  stripLiterals,
  unjustifiedGrids,

  // Manifest: what a package.json says about its dependencies.
  INSTALLED_GROUPS,
  isPinned,
  manifestOf,

  // Prose: the scanners the prose rules are built on.
  findFingerprints,
  findRaggedBoxes,
  scanCodeForForeign,
  scanDocumentForForeign,
  scanPathForForeign,
});
