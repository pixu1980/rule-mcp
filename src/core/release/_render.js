

/** @module core/release/render - the release and dependency lines /rule-init prints. */

import { releaseToolingLabels } from "./_detect.js";

/**
 * The release-tooling and dependency-policy lines of the init report.
 *
 * @param {{ release?: object, dependencies?: { unpinned?: Array<{ field: string, name: string, specifier: string }> } }} result
 * @returns {string[]}
 */
export function renderInitExtras(result) {
  const lines = [];

  if (result.release) {
    const labels = releaseToolingLabels(result.release);

    lines.push(`Release:      ${labels.length > 0 ? labels.join(", ") : "no changelog/version tooling detected (the project's choice)"}`);
  }

  if (result.dependencies) {
    const unpinned = result.dependencies.unpinned ?? [];

    lines.push(
      `Deps:         ${unpinned.length === 0 ? "every specifier is an exact x.y.z pin" : `${unpinned.length} ranged specifier(s) - pin each with \`<pm> add <name>@latest --save-exact\``}`,
    );

    for (const offender of unpinned.slice(0, 10)) {
      lines.push(`              ${offender.field}: ${offender.name} = ${offender.specifier}`);
    }
  }

  return lines;
}
