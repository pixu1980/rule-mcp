

/** The author stamped on new ADRs, from the git identity. */
import { execFileSync } from "node:child_process";

/**
 * The author stamped on new ADRs from git identity.
 *
 * @param {() => string} [read] - injected by the tests
 * @returns {string}
 */
export function adrAuthor(read = gitConfig) {
  try {
    const name = read("user.name");

    if (!name) {
      return "rule-mcp";
    }

    const email = read("user.email");

    return email ? `${name} <${email}>` : name;
  } catch {
    return "rule-mcp";
  }
}

/** Read one git config key, or "" when it is not set. */
export function gitConfig(key) {
  try {
    return execFileSync("git", ["config", "--get", key], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}
