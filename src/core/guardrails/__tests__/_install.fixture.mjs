/**
 * Install the rules the skills own, for a test that drives the engine directly.
 *
 * The server does this in loadAllSkills() before anything can check (ADR 079).
 * A test that calls checkCode or getGuardrails without it resolves an empty
 * ruleset and passes everything, which is the one failure mode worth a fixture.
 */
import { loadLayerGuardrails } from "../../layers/_guardrails.js";
import { setSkillGuardrails } from "../index.js";

setSkillGuardrails(await loadLayerGuardrails());
