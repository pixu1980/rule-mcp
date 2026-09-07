import { extractRealCSS, looksLikeStylesheet } from "../_util.js";

/** Guardrail `external-css`: External CSS via adoptedStyleSheets or framework-native import */
export const externalCss = {
  id: "external-css",
  label: "External CSS via adoptedStyleSheets or framework-native import",
  description:
    "CSS must be loaded as external file. Use fetch→CSSStyleSheet.replaceSync→adoptedStyleSheets for vanilla, or framework-native imports (Angular styleUrls, Svelte <style>, CSS Modules or plain import for React/Solid).",
  check: (code, context) => {
    const framework = context?.framework || "vanilla";
    // CSS files are themselves external CSS
    if (context?.fileName && /\.css$/i.test(context.fileName)) {
      return { pass: true, note: "CSS file is external CSS by definition" };
    }
    // So is a stylesheet handed over without a name: this rule exists to keep
    // CSS out of JS and markup, and there is no host document here to inline
    // it into.
    if (looksLikeStylesheet(code)) {
      return { pass: true, note: "A stylesheet is external CSS by definition" };
    }

    if (framework === "angular" && code.includes("styleUrls")) {
      return { pass: true, note: "Angular styleUrls OK" };
    }

    if (framework === "angular" && code.includes("@Component") && code.includes(".css")) {
      return { pass: true, note: "Angular external CSS via component styles" };
    }

    if (framework === "svelte" && (/import\s+['"].*\.css['"]/.test(code) || code.includes("<style>"))) {
      return { pass: true, note: "Svelte CSS import or scoped style OK" };
    }
    // React/Solid: accept both `import "./foo.css"` and `import styles from "./foo.module.css"`
    if ((framework === "react" || framework === "solid") && /import\s+.*['"].*\.css['"]/.test(code)) {
      return { pass: true, note: "CSS import or CSS Modules OK" };
    }

    if (code.includes("adoptedStyleSheets") && code.includes("CSSStyleSheet")) {
      return { pass: true, note: "adoptedStyleSheets OK" };
    }

    const hasCssContent = extractRealCSS(code, context);

    if (!hasCssContent) {
      return { pass: true, note: "No CSS content found, skipping" };
    }

    return {
      pass: false,
      failCount: 1,
      suggestion: "Load CSS via an external file mechanism: adoptedStyleSheets (vanilla), styleUrls (Angular), <style> (Svelte), or CSS Modules (React).",
    };
  },
};
