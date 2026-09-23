/**
 * ESLint flat configuration for the JavaScript/JSX renderer and Electron bridge.
 */
export default [
  { ignores: ["dist/**", "release/**", "node_modules/**", "test-results/**"] },
  {
    files: ["**/*.{js,jsx,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { window: "readonly", document: "readonly", console: "readonly", process: "readonly", __dirname: "readonly", module: "readonly", require: "readonly", JSX: "readonly" },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }] },
  },
];
