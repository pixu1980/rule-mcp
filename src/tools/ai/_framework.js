import { detectProject, getFrameworkSuggestion } from "../../core/detector/index.js";

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

  const detectedDomain = detectedSkillName?.startsWith("rule-ai")
    ? "ai"
    : detectedSkillName?.startsWith("rule-frontend")
      ? "frontend"
      : detectedSkillName?.startsWith("rule-backend")
        ? "backend"
        : detectedSkillName?.startsWith("rule-data")
          ? "data"
          : detectedSkillName?.startsWith("rule-devops")
            ? "devops"
            : null;

  return { detectedFramework, detectedSkillName, detectedDomain };
}
