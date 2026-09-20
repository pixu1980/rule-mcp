/** Guardrail `pkg-no-engines`: no engines field in a generated manifest */

export const pkgNoEngines = {
  id: "pkg-no-engines",
  label: "No engines field",
  description:
    "`engines` is a declaration a package manager acts on: npm, pnpm and yarn warn or refuse when the running Node falls outside the range, so the field gets a vote on whether the install runs - the same veto corepack gets, reached another way. The version belongs in `.nvmrc` and in the installer, where a human reads it and nothing enforces it in the middle.",
  check: (code, context) => {
    const { manifestOf } = context.helpers;

    const manifest = manifestOf(code, context);

    if (!manifest) {
      return { pass: true, note: "Not a package.json, skipping" };
    }

    const hasEngines = manifest.engines !== undefined;

    return {
      pass: !hasEngines,
      failCount: hasEngines ? 1 : 0,
      detail: hasEngines ? [`engines: ${JSON.stringify(manifest.engines)}`] : [],
      suggestion: "Delete the field. Pin Node with .nvmrc and enforce the floor in the installer and CI.",
    };
  },
};
