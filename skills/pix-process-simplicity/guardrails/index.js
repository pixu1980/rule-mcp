/** The rules rule-process-simplicity owns, in canonical order. */
import { noPlaceholderImplementation } from "./_no-placeholder-implementation.js";
import { noSpeculativeAuditTable } from "./_no-speculative-audit-table.js";
import { noSuppressedErrors } from "./_no-suppressed-errors.js";

export const GUARDRAILS = [noPlaceholderImplementation, noSpeculativeAuditTable, noSuppressedErrors];
