/** The rules rule-backend owns, in canonical order. */
import { corsExplicit } from "./_cors-explicit.js";
import { errorExposure } from "./_error-exposure.js";
import { helmetHeaders } from "./_helmet-headers.js";
import { inputValidation } from "./_input-validation.js";
import { rateLimiting } from "./_rate-limiting.js";
import { sqlInjection } from "./_sql-injection.js";

export const GUARDRAILS = [corsExplicit, errorExposure, helmetHeaders, inputValidation, rateLimiting, sqlInjection];
