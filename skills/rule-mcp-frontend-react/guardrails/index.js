/** The rules rule-mcp-frontend-react owns, in canonical order. */
import { reactHooksRules } from "./_react-hooks-rules.js";
import { reactNoClassname } from "./_react-no-classname.js";

export const GUARDRAILS = [reactHooksRules, reactNoClassname];
