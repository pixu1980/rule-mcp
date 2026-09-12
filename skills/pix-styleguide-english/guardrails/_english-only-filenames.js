/** Guardrail `en-english-only-filenames`: English-only file and folder names */
import { scanPathForForeign } from "@rule-mcp/sdk";

export const enEnglishOnlyFilenames = {
  id: "en-english-only-filenames",
  label: "English-only file and folder names",
  description: "Every file and folder name is English. A non-ASCII letter or a foreign word in any path segment fails this rule (see rule-styleguide-english).",
  check: (code, context = {}) => {
    const fileName = String(context.fileName ?? "");

    if (fileName === "") {
      return { pass: true };
    }

    const hits = scanPathForForeign(fileName);

    if (hits.length === 0) {
      return { pass: true };
    }

    return {
      pass: false,
      failCount: hits.length,
      detail: hits.slice(0, 10),
      suggestion:
        "Name files and folders in English, American spelling (user-table.js, not tabella-utenti.js). " +
        "Translated UI strings belong in i18n data files; the file names that carry them stay English.",
    };
  },
};
