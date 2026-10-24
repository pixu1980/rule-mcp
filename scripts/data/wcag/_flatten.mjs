/** @module scripts/data/wcag/flatten */

/** Flatten the principle/guideline/criterion tree into one keyed record. */
export function flatten(document_) {
  const criteria = {};
  for (const principle of document_.principles ?? []) {
    for (const guideline of principle.guidelines ?? []) {
      for (const sc of guideline.successcriteria ?? []) {
        if (!sc.num || !sc.level) {
          continue;
        }
        criteria[sc.num] = {
          num: sc.num,
          id: sc.id,
          handle: sc.handle,
          level: sc.level,
          guideline: `${guideline.num} ${guideline.handle}`,
          principle: `${principle.num} ${principle.handle}`,
        };
      }
    }
  }

  return criteria;
}
