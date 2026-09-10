

/** Quality guardrail catalog: one rule per file, grouped in family folders. */
import { TYPESCRIPT_GUARDRAILS } from "./typescript/index.js";
import { PROSE_GUARDRAILS } from "./prose/index.js";
import { MANIFEST_GUARDRAILS } from "./manifest/index.js";
import { SIMPLICITY_GUARDRAILS } from "./simplicity/index.js";
import { COMMENT_GUARDRAILS } from "./comments/index.js";

/** Assembled quality family: TS, prose/typography, manifest, simplicity and comment checks. */
export const QUALITY_GUARDRAILS = [...TYPESCRIPT_GUARDRAILS, ...PROSE_GUARDRAILS, ...MANIFEST_GUARDRAILS, ...SIMPLICITY_GUARDRAILS, ...COMMENT_GUARDRAILS];

export { A11Y_GUARDRAILS } from "./_a11y.js";
