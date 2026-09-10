

/** Backend guardrail family: security and API rules, one per file. */
import { sqlInjection } from "./_sql-injection.js";
import { errorExposure } from "./_error-exposure.js";
import { inputValidation } from "./_input-validation.js";
import { corsExplicit } from "./_cors-explicit.js";
import { rateLimiting } from "./_rate-limiting.js";
import { helmetHeaders } from "./_helmet-headers.js";

/** The family, in canonical order. */
export const BACKEND_GUARDRAILS = [sqlInjection, errorExposure, inputValidation, corsExplicit, rateLimiting, helmetHeaders];
