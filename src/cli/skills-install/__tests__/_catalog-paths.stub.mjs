/** Test double for cli/paths used by _catalog-branches.test.mjs. */

export function getSkillsDirs() {
  const control = globalThis.__ruleCatalogBranches;

  return {
    homeSkills: control?.homeSkills ?? "",
    embeddedSkills: control?.embeddedSkills ?? "",
  };
}
