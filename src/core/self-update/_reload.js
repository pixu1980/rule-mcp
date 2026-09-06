/** Reload the skill catalog after a merge that touched skills/. */

/** Re-register tools and flush the skill/result caches, best-effort. */
export async function reloadSkillsAfterMerge() {
  try {
    const { loadAllSkills } = await import("../skills/index.js");

    await loadAllSkills(true);
  } catch {
    /* skills reload best-effort */
  }
}
