

/** ADR files on disk: directory, numbering, slugs, filenames, the existing set. */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Longest decision/consequence summary the index shows per row. */
export const SUMMARY_LIMIT = 220;

/** ADR directory relative to project root. */
export const ADR_DIR = "docs/adr";

/** Strip diacritics and special chars for slug. */
export function slugify(text) {
  return text
    .toLowerCase()
    .replaceAll(/[àáâãäå]/g, "a")
    .replaceAll(/[èéêë]/g, "e")
    .replaceAll(/[ìíîï]/g, "i")
    .replaceAll(/[òóôõö]/g, "o")
    .replaceAll(/[ùúûü]/g, "u")
    .replaceAll("ñ", "n")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 80);
}

/** Get next ADR number. */
export const ADR_INDEX_FILE = "ADR.md";

/** The next free ADR number in a directory. */
export function nextAdrNumber(adrDir) {
  try {
    const files = readdirSync(adrDir);
    const nums = files.filter((f) => /^\d{3}-/.test(f)).map((f) => parseInt(f.match(/^(\d{3})-/)[1], 10));

    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  } catch {
    return 1;
  }
}

/** Generate ADR filename. */
export function adrFilename(number, title) {
  const slug = slugify(title);

  return `${String(number).padStart(3, "0")}-${slug}.md`;
}

/**
 * The first sentence of a prose section, flattened for a table cell.
 */
export function firstSentence(text) {
  const flat = (text ?? "").replaceAll(/\s+/g, " ").trim();

  if (flat.length === 0) {
    return "";
  }

  const [sentence] = flat.split(/(?<=[a-z)\]"])\.\s+(?=[A-Z`])/, 1);
  let out = sentence.endsWith(".") ? sentence : `${sentence}.`;

  if (out.length > SUMMARY_LIMIT) {
    out = `${out.slice(0, out.lastIndexOf(" ", SUMMARY_LIMIT))}...`;
  }

  return out.replaceAll("|", String.raw`\|`);
}

/**
 * Pull one `## Heading` section out of an ADR body.
 */
/**
 * Pull one `## Heading` section out of an ADR body.
 */
export function section(body, heading) {
  return new RegExp(String.raw`^## ${heading}\s*\n([\s\S]*?)(?=\n## |$)`, "m").exec(body ?? "")?.[1] ?? "";
}

export function listExistingAdrs(adrDir) {
  try {
    const files = readdirSync(adrDir);
    const adrs = [];

    for (const f of files) {
      const m = f.match(/^(\d{3})-(.+)\.md$/);

      if (!m) {
        continue;
      }

      const content = readFileSync(join(adrDir, f), "utf8");
      const title = content.match(/^# \d{3}: (.+)$/m)?.[1] || m[2].replaceAll("-", " ");
      const date = content.match(/\*\*Date\*\*: (\S+)/)?.[1] || "";
      const status = content.match(/\*\*Status\*\*: (\w+)/)?.[1] || "proposed";
      const tagsLine = content.match(/\*\*Tags\*\*: (.+)/)?.[1] || "";
      const tags = tagsLine
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      adrs.push({
        file: f,
        number: parseInt(m[1]),
        title,
        date,
        status,
        tags,
        decision: firstSentence(section(content, "Decision")),
        consequence: firstSentence(section(content, "Consequences")),
      });
    }

    return adrs;
  } catch {
    return [];
  }
}
