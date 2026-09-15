

/**
 * @module core/skills/surface
 *
 * The filtered server surface: which skill tools a narrowed server keeps.
 *
 * One env var carries the installer's answer into the server process, in the
 * same grammar the `--surface` flag accepts: a preset on its own, or one
 * list - `minimal`, `standard`, `full`, `areas:frontend,data`, or
 * `skills:rule-ai,rule-data-sql`. Empty and unknown read as full, never as
 * empty: a typo must not silence the server.
 *
 * The filter is additive over the minimal mechanism, not a second one: preset
 * `minimal` retains exactly the minimal allowlist, everything else retains
 * every code-registered tool plus the selected skill tools. Non-native skills
 * are always kept - a project skill its frontmatter exposed is a deliberate
 * choice, not surface to prune.
 */

/** Env var carrying the surface answer from the installer to the server. */
export const SURFACE_VAR = "RULE_MCP_SURFACE";

/**
 * Parse a surface spec into a selection, or null when it selects nothing.
 *
 * @param {string} [raw]
 * @returns {{ preset?: string, areas?: string[], skills?: string[] }|null}
 */
export function parseSurface(raw) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return null;
  }

  const text = raw.trim();

  if (["minimal", "standard", "full"].includes(text)) {
    return { preset: text };
  }

  const cut = text.indexOf(":");

  if (cut === -1) {
    return null;
  }

  const kind = text.slice(0, cut);
  const values = text
    .slice(cut + 1)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if ((kind !== "areas" && kind !== "skills") || values.length === 0) {
    return null;
  }

  return kind === "areas" ? { areas: values } : { skills: values };
}

/** Whether a skill is an area hub: `rule-frontend`, not `rule-frontend-react`. */
export const isRootSkill = (name) => typeof name === "string" && name.startsWith("rule-") && name.split("-").length === 2;

/** The area a skill belongs to: `rule-data-sql` belongs to `data`. */
export const areaOfSkill = (name) => name.split("-", 2)[1];

/** Every area the catalog covers, sorted. Foreign skills cover none. */
export function areasOfSkills(skillNames = []) {
  return [...new Set(skillNames.filter((name) => name.startsWith("rule-")).map(areaOfSkill))].sort();
}

/**
 * The skills a surface selection keeps, native ones only.
 *
 * A listed skill keeps its area root either way: a hub keeps its area
 * reachable, the same rule the command files keep. Unknown names are
 * problems, not failures - a typo must not stop the install.
 *
 * @param {{ preset?: string, areas?: string[], skills?: string[] }} selection
 * @param {string[]} [skillNames]
 * @returns {{ skills: Set<string>, problems: string[] }}
 */
export function filterSurfaceSkills(selection = {}, skillNames = []) {
  const problems = [];
  const native = skillNames.filter((name) => name.startsWith("rule-"));
  const kept = new Set();

  if (selection.preset === "standard") {
    for (const name of native) {
      if (isRootSkill(name)) {
        kept.add(name);
      }
    }

    return { skills: kept, problems };
  }

  if (selection.preset === "minimal") {
    return { skills: kept, problems };
  }

  if (selection.preset === "full") {
    return { skills: new Set(native), problems };
  }

  if (selection.areas) {
    const known = new Set(areasOfSkills(native));
    const wanted = new Set();

    for (const area of selection.areas) {
      if (known.has(area)) {
        wanted.add(area);
      } else {
        problems.push(`unknown area "${area}"`);
      }
    }

    for (const name of native) {
      if (wanted.has(areaOfSkill(name))) {
        kept.add(name);
      }
    }

    return { skills: kept, problems };
  }

  if (selection.skills) {
    const known = new Set(native);

    for (const skill of selection.skills) {
      if (known.has(skill)) {
        kept.add(skill);
        kept.add(`rule-${areaOfSkill(skill)}`);
      } else {
        problems.push(`unknown skill "${skill}"`);
      }
    }

    return { skills: kept, problems };
  }

  return { skills: new Set(native), problems };
}
