// Auto-split from src/core/guardrails/framework.js - see ./framework/index.js

export const ANGULAR_GUARDRAILS = [
  {
    id: "angular-no-ngclass",
    label: "No ngClass directive",
    description: "Angular templates must use [attr.data-part] instead of [ngClass].",
    check: (code) => {
      const n = code.match(/\[ngClass\]/g);

      return { pass: !n, failCount: n?.length || 0, suggestion: 'Replace [ngClass] with [attr.data-part]="...".' };
    },
  },];
