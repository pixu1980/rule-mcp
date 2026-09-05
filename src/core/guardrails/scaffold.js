// Auto-split from src/core/guardrail-defs.js - see ./index.js
const SCAFFOLD_CHECK = (fileName, label, checkFunction) => ({
  id: `scaffold-${fileName.replace(/^[.]/, "")}`,
  label: `${fileName} present`,
  description: `Project must have ${fileName} file.`,
  check: (code, context) => {
    if (context?.mode !== "scaffold") {
      return { pass: true, note: "Only checked in scaffold mode" };
    }

    return checkFunction(code, context);
  },
});

/** The scaffold guardrail family. */
export const SCAFFOLD_GUARDRAILS = [
  SCAFFOLD_CHECK(".prettierrc", "Prettier config present", (code) => {
    const hasConfig = code.includes('"printWidth"') && code.includes('"tabWidth"') && code.includes('"semi"');

    return {
      pass: hasConfig,
      failCount: hasConfig ? 0 : 1,
      suggestion:
        "Create .prettierrc at project root with printWidth=120, tabWidth=2, semi=true, trailingComma=all, singleQuote=false.",
    };
  }),
  SCAFFOLD_CHECK(".nvmrc", "NVM config present", (code) => {
    const hasNvmrc = code.trim() === "lts/*" || code.includes("lts/*");

    return { pass: hasNvmrc, failCount: hasNvmrc ? 0 : 1, suggestion: "Create .nvmrc with content: lts/*" };
  }),
  SCAFFOLD_CHECK(".npmrc", "npmrc pins exactly", (code) => {
    // The value, not the key: `save-exact=false` is the default spelled out.
    const exact = /^\s*save-exact\s*=\s*true\s*$/m.test(code);

    return {
      pass: exact,
      failCount: exact ? 0 : 1,
      suggestion:
        "Create .npmrc at project root with save-exact=true, so `pnpm add` writes an exact version instead of a caret range (guardrail pkg-exact-versions).",
    };
  }),

  SCAFFOLD_CHECK(".editorconfig", "EditorConfig present", (code) => {
    const hasEc = code.includes("root = true") && code.includes("indent_size = 2");

    return {
      pass: hasEc,
      failCount: hasEc ? 0 : 1,
      suggestion: "Create .editorconfig at project root with indent_size=2, charset=utf-8, end_of_line=lf.",
    };
  }),
  SCAFFOLD_CHECK(".gitignore", "Gitignore present", (code) => {
    const hasOs = code.includes(".DS_Store") || code.includes("Thumbs.db");
    const hasNode = code.includes("node_modules/");
    const hasBuild = code.includes("dist/") || code.includes("build/");

    return {
      pass: hasOs && hasNode && hasBuild,
      failCount: [hasOs, hasNode, hasBuild].filter(Boolean).length,
      suggestion: "Create .gitignore with OS entries (.DS_Store, Thumbs.db), node_modules/, dist/, .env, coverage/.",
    };
  }),
  SCAFFOLD_CHECK("eslint.config.mjs", "ESLint flat config present", (code) => {
    const hasEslint = code.includes("unicorn") || code.includes("@eslint/js") || code.includes("defineConfig");

    return {
      pass: hasEslint,
      failCount: hasEslint ? 0 : 1,
      suggestion: "Create eslint.config.mjs with @eslint/js + eslint-plugin-unicorn (see rule-toolchain-eslint).",
    };
  }),
  SCAFFOLD_CHECK("tsconfig.json", "TypeScript config present", (code) => {
    const hasTs = code.includes('"strict"') && code.includes('"include"') && code.includes('"src"');

    return {
      pass: hasTs,
      failCount: hasTs ? 0 : 1,
      suggestion: "Create tsconfig.json with strict=true, target=ES2022, module=ESNext, moduleResolution=bundler.",
    };
  }),
  SCAFFOLD_CHECK("jsconfig.json", "JSConfig present", (code) => {
    const hasJs = code.includes('"checkJs"') && code.includes('"include"') && code.includes('"src"');

    return {
      pass: hasJs,
      failCount: hasJs ? 0 : 1,
      suggestion: "Create jsconfig.json with checkJs=true, strict=true, target=ES2022.",
    };
  }),
];
