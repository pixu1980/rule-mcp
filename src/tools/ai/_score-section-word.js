/** Score one prompt word against one skill section: heading hits beat body hits, name/description words weigh more. */
export function scoreSectionWord(section, word, skillBase, descText) {
  const contentText = (section.content || "").toLowerCase();
  const headingText = (section.heading || "").toLowerCase();

  const nameBonus = word === skillBase ? 3 : 0;
  const descBonus = descText.includes(word) ? 2 : 0;
  const weight = 1 + nameBonus + descBonus;

  const wordPattern = new RegExp(String.raw`\b` + word.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`) + String.raw`\b`, "i");

  if (wordPattern.test(headingText)) {
    return weight * 3;
  }

  if (wordPattern.test(contentText)) {
    return weight;
  }

  return 0;
}
