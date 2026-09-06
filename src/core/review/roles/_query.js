/** @module core/review/roles/query */

import { EMBEDDED_ROLES } from "./_catalog.js";

/**
 * Every role, embedded plus overlays, merged by id.
 *
 * @param {Array<object>} [overlays] - higher-precedence entries, lowest first
 * @returns {object[]} roles in catalog order, overlays replacing by id
 */
export function allRoles(overlays = []) {
  const byId = new Map(EMBEDDED_ROLES.map((role) => [role.id, role]));

  for (const role of overlays) {
    byId.set(role.id, role);
  }

  return [...byId.values()];
}

/**
 * The roles every generated surface carries.
 *
 * @param {Array<object>} [overlays]
 * @returns {object[]} roles with status "active"
 */
export function activeRoles(overlays = []) {
  return allRoles(overlays).filter((role) => role.status === "active");
}

/**
 * One role by id, whatever its status - a deprecated role still owns its
 * documents, so looking it up has to keep working.
 *
 * @param {string} id
 * @param {Array<object>} [overlays]
 * @returns {object|undefined}
 */
export function roleById(id, overlays = []) {
  return allRoles(overlays).find((role) => role.id === id);
}
