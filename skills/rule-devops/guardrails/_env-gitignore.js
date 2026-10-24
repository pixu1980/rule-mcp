/** Guardrail `env-gitignore`: the environment file never reaches a commit. */
export const environmentGitignore = {
  id: "env-gitignore",
  label: ".env in .gitignore",
  description: ".env files must be in .gitignore to prevent committing secrets.",
  check: (code, context) => {
    if (!context?.fileName?.includes(".gitignore")) {
      return { pass: true, note: "Not .gitignore, skipping" };
    }

    const isOk = /\.env\b/.test(code);

    return {
      pass: isOk,
      failCount: isOk ? 0 : 1,
      detail: isOk ? [] : [".env not in .gitignore"],
      suggestion: "Add .env to .gitignore to prevent committing environment files.",
    };
  },
};
