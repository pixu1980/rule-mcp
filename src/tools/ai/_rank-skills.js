import { readSkill, getSkillMetadata } from "../router/index.js";
import { nameAffinity } from "./_name-affinity.js";
import { tagAffinity } from "./_tag-affinity.js";
import { extractTopSections } from "./_top-sections.js";
import { skillNextTools } from "./_next-tools.js";

/**
 * Score every candidate skill and return them sorted, best first.
 *
 * BM25 gives the base score; naming the skill is the strongest signal a
 * prompt can carry and BM25 cannot see it (the name is metadata, not section
 * text), so name and tag affinity are added on top. Domain- and
 * framework-specific boosts follow, then scores normalize to the best hit.
 *
 * @returns {Array<{ skill: string, relativeScore: number, absoluteScore: number, sections: string[], next_tools: string[] }>}
 */
export function rankSkills({ skills, promptWords, promptDomain, isReduction, ranked, detectedFramework, detectedSkillName, applyFrameworkBias }) {
  const skillRawScores = [];

  for (const skillName of skills) {
    const content = readSkill(skillName);

    if (!content) {
      continue;
    }

    const meta = getSkillMetadata(skillName);
    const hit = ranked.get(skillName);
    const rawScore = (hit?.score ?? 0) + nameAffinity(skillName, promptWords) + tagAffinity(meta, promptWords);

    let finalScore = rawScore;

    // Commit/push prompts deterministically route to the commits discipline skill.
    if (promptDomain === "git" && skillName === "rule-toolchain-commits") {
      finalScore = Math.max(rawScore * 2, 25);
    }

    // A scope challenge routes to the simplicity skill; on a plain build
    // request it stays an alternative (finalScore halved).
    if (skillName === "rule-process-simplicity") {
      finalScore = isReduction ? Math.max(rawScore * 2, 30) : rawScore * 0.5;
    }

    if (detectedFramework && applyFrameworkBias) {
      if (skillName === detectedSkillName) {
        finalScore = Math.max(rawScore * 2, 20);
      } else if (["rule-styleguide", "rule-frontend", "rule-platform-web", "rule-ui-design-system", "rule-ai"].includes(skillName)) {
        finalScore *= 1.15;
      } else {
        finalScore *= 0.85;
      }
    }

    if (finalScore <= 0) {
      continue;
    }

    skillRawScores.push({ skill: skillName, rawScore: finalScore });
  }

  const maxRaw = Math.max(...skillRawScores.map((s) => s.rawScore), 0);
  const skillScores = skillRawScores.map(({ skill, rawScore }) => ({
    skill,
    relativeScore: maxRaw > 0 ? Math.min(1, rawScore / maxRaw) : 0,
    absoluteScore: rawScore,
    sections: ranked.get(skill)?.sections ?? extractTopSections(skill, promptWords),
    next_tools: skillNextTools(skill),
  }));

  skillScores.sort((a, b) => b.relativeScore - a.relativeScore);

  return skillScores;
}
