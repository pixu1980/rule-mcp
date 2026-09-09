import { detectProject, getFrameworkSuggestion } from "../../core/detector/index.js";

/**
 * Skill-name prefix to routing domain, longest prefix first.
 *
 * A table rather than a ternary chain, because the chain carried three arms
 * (backend, data, devops) that FRAMEWORK_SKILL_MAP can never reach: it only
 * ever suggests rule-ai, rule-frontend-*, rule-meta-* and rule-platform-desktop.
 * A meta-framework is frontend - it was, as rule-frontend-meta-astro, until the
 * rule-meta rename dropped it out of the prefix and cost Astro its framework
 * bias in the router (ADR 078).
 */
const DOMAIN_PREFIXES = [
  ["rule-ai", "ai"],
  ["rule-frontend", "frontend"],
  ["rule-meta", "frontend"],
];

/**
 * Resolve the framework hint (argument or project detection) to a skill and
 * its domain, so the caller can decide whether framework bias applies.
 *
 * @param {{ framework?: string, path?: string }} arguments_
 * @returns {{ detectedFramework: string|undefined, detectedSkillName: string|null, detectedDomain: string|null }}
 */
export function detectFrameworkSkill(arguments_) {
  let detectedFramework = arguments_.framework;

  if (!detectedFramework && arguments_.path) {
    try {
      const profile = detectProject(arguments_.path);
      detectedFramework = profile.framework;
    } catch {
      /* ignore */
    }
  }

  const detectedSkillName = detectedFramework ? getFrameworkSuggestion(detectedFramework).skillName : null;

  const prefix = DOMAIN_PREFIXES.find(([name]) => detectedSkillName?.startsWith(name));

  return { detectedFramework, detectedSkillName, detectedDomain: prefix?.[1] ?? null };
}
