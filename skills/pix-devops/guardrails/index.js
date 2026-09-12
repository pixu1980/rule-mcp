/** The rules rule-devops owns, in canonical order. */
import { secretDetection } from "./_secret-detection.js";
import { environmentGitignore } from "./_env-gitignore.js";

export const GUARDRAILS = [secretDetection, environmentGitignore];
