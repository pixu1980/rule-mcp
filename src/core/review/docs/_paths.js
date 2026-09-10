

/** @module core/review/docs/paths */

/**
 * Where each document of the trio lives for a role.
 *
 * @param {string} role - role id
 * @returns {{audit: string, review: string, plan: string}} repo-relative paths
 */
export function trioPaths(role) {
  return {
    audit: `docs/audits/${role}.md`,
    review: `docs/reviews/${role}.md`,
    plan: `docs/plans/${role}.md`,
  };
}
