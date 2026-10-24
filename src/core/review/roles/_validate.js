/** @module core/review/roles/validate */

/** Every field a role must have, and what counts as valid. */
const REQUIRED_STRING_FIELDS = ["id", "role"];
const VALID_STATUS = new Set(["active", "proposed", "deprecated"]);

/**
 * Validate one role entry. Returns the problems found, empty when valid -
 * an overlay file is reported and skipped, never fatal, so the caller needs
 * the reasons rather than an exception.
 *
 * @param {object} role
 * @returns {string[]} problems, empty when the role is valid
 */
export function validateRole(role) {
  const problems = [];

  if (!role || typeof role !== "object") {
    return ["not an object"];
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof role[field] !== "string" || role[field].trim() === "") {
      problems.push(`${field} must be a non-empty string`);
    }
  }

  if (typeof role.id === "string" && !/^[a-z][a-z0-9-]*$/.test(role.id)) {
    problems.push("id must be kebab-case");
  }

  if (!Number.isInteger(role.yearsOfExperience) || role.yearsOfExperience <= 0) {
    problems.push("yearsOfExperience must be a positive integer");
  }

  if (!Array.isArray(role.skills) || role.skills.length === 0) {
    problems.push("skills must be a non-empty array");
  }

  if (role.evidenceSkills !== undefined && !Array.isArray(role.evidenceSkills)) {
    problems.push("evidenceSkills must be an array when present");
  }

  if (role.lenses !== undefined && !Array.isArray(role.lenses)) {
    problems.push("lenses must be an array when present");
  }

  if (role.aliases !== undefined && !Array.isArray(role.aliases)) {
    problems.push("aliases must be an array when present");
  }

  if (!VALID_STATUS.has(role.status)) {
    problems.push(`status must be one of ${[...VALID_STATUS].join(", ")}`);
  }

  if (!Number.isInteger(role.version) || role.version <= 0) {
    problems.push("version must be a positive integer");
  }

  if (role.status === "deprecated" && !role.deprecatedBy) {
    problems.push("a deprecated role must name the role that replaces it in deprecatedBy");
  }

  return problems;
}
