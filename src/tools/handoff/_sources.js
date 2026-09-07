/** Project sources a handoff reads: the ADR log, .context values, package identity. */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Default project directory. */
/** Where the ADR log lives, relative to the project root. */
export const ADR_DIR = "docs/adr";

/** Where planning context values live, relative to the project root. */
export const CONTEXT_DIR = ".context";

/**
 * Read all ADR files and return compressed summaries.
 */
export function readAdrs(projectDir) {
  const adrDir = join(projectDir, ADR_DIR);

  if (!existsSync(adrDir)) {
    return [];
  }

  try {
    const files = readdirSync(adrDir);
    const adrs = [];

    for (const f of files) {
      const m = f.match(/^(\d{3,4})-(.+)\.md$/);

      if (!m) {
        continue;
      }

      try {
        const content = readFileSync(join(adrDir, f), "utf8");
        const number = parseInt(m[1]);
        const title = content.match(/^# (?:ADR-)?\d{3,4}: (.+)$/m)?.[1] || m[2].replaceAll("-", " ");
        const date = content.match(/\*\*Date\*\*: (\S+)/)?.[1] || "";
        const statusRaw = content.match(/\*\*Status\*\*:\s*(.+?)(?:\n|$)/)?.[1] || content.match(/^## Status\s*\n+\s*(.+?)(?:\n|$)/m)?.[1] || "proposed";
        const status = statusRaw
          .replaceAll("**", "")
          .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, "$1")
          .trim()
          .split(/\s+/, 1)[0];
        const tagsLine = content.match(/\*\*Tags\*\*: (.+)/)?.[1] || "";
        const tags = tagsLine
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        // Extract decision blurb (first 2 lines of Decision section)
        const decision =
          content
            .match(/## Decision\n\n([\s\S]*?)(?:\n## |$)/)?.[1]
            ?.split("\n")
            .slice(0, 2)
            .join(" ")
            .slice(0, 200) || "";
        adrs.push({ number, title, date, status, tags, decision });
      } catch {
        /* malformed ADR file - skip */
      }
    }

    return adrs.sort((a, b) => b.number - a.number);
  } catch {
    return [];
  }
}

/**
 * Read all .context/ files and return key-value pairs.
 */
export function readContextValues(projectDir) {
  const ctxDir = join(projectDir, CONTEXT_DIR);

  if (!existsSync(ctxDir)) {
    return {};
  }

  const values = {};
  try {
    const files = readdirSync(ctxDir).filter((f) => f.endsWith(".md"));

    for (const f of files) {
      try {
        const content = readFileSync(join(ctxDir, f), "utf8");
        // Extract YAML-like or markdown list items
        const lines = content.split("\n");

        for (const line of lines) {
          const m = line.match(/^\*\*(\w+)\*\*:\s*(.+)/);

          if (m) {
            values[m[1]] = m[2].trim();
          }

          const m2 = line.match(/^- \*\*(\w+)\*\*:\s*(.+)/);

          if (m2) {
            values[m2[1]] = m2[2].trim();
          }
        }
      } catch {
        /* unreadable context file - skip */
      }
    }
  } catch {
    /* context dir unreadable */
  }

  return values;
}

/**
 * Read project identity from package.json.
 */
export function readProjectIdentity(projectDir) {
  const packagePath = join(projectDir, "package.json");

  if (!existsSync(packagePath)) {
    return {};
  }

  try {
    const package_ = JSON.parse(readFileSync(packagePath, "utf8"));

    return {
      name: package_.name || "",
      description: package_.description || "",
      version: package_.version || "",
    };
  } catch {
    return {};
  }
}
