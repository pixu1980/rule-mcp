

import { readSkill, getSkillMetadata } from "../router/index.js";
import { extractSections } from "./_extract-sections.js";
import { scoreSectionWord } from "./_score-section-word.js";
import { STOPWORDS } from "./_stopwords.data.js";

/** The skill's sections most relevant to the prompt, best first (up to five). */
export function extractTopSections(skillName, promptWords) {
  const content = readSkill(skillName);

  if (!content) {
    return [];
  }

  const sections = extractSections(content);
  const meta = getSkillMetadata(skillName);
  const skillBase = skillName.replace("rule-mcp-", "");
  const descText = (meta.description || "").toLowerCase();

  const scored = sections
    .map((s) => {
      let score = 0;

      for (const word of promptWords) {
        if (STOPWORDS.has(word)) {
          continue;
        }

        score += scoreSectionWord(s, word, skillBase, descText);
      }

      return { heading: s.heading, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.heading);

  if (scored.length === 0) {
    const hasMeta = promptWords.some((w) => !STOPWORDS.has(w) && (descText.includes(w) || (meta.tags || []).join(" ").toLowerCase().includes(w)));

    if (hasMeta) {
      return ["(matches skill description)"];
    }
  }

  return scored;
}
