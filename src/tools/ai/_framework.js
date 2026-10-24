import { detectProject, getFrameworkSuggestion } from "../../core/detector/index.js";

/**
 * Skill-name prefix to the domain that biases routing, most specific first.
 *
 * A meta-framework is frontend: it was, as rule-mcp-frontend-meta-astro, until the
 * rule-mcp-meta rename dropped it out of the prefix and cost Astro its bias
 * (ADR 075).
 */
const DOMAIN_PREFIXES = [
  ["rule-mcp-ai", "ai"],
  ["rule-mcp-frontend", "frontend"],
  ["rule-mcp-meta", "frontend"],
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

  // Only the domains a framework can actually map to. FRAMEWORK_SKILL_MAP
  // answers with rule-mcp-ai, a rule-mcp-frontend-* or rule-mcp-platform-desktop, so arms for
  // backend, data and devops were conditions no input could satisfy.
  const detectedDomain = DOMAIN_PREFIXES.find(([prefix]) => detectedSkillName?.startsWith(prefix))?.[1] ?? null;

  return { detectedFramework, detectedSkillName, detectedDomain };
}
