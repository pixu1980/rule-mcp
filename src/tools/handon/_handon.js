

/** The handon entry: read the handoff, verify it, render the resume report. */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { neutralizeDirectives } from "../../core/index.js";
import { HANDOFF_DIR } from "./_constants.js";
import { listHandoffs } from "./_handoffs.js";
import { parseHandoff } from "./_parse.js";
import { verify } from "./_verify.js";
import { lines, firstMove } from "./_report.js";
import { ageLabel } from "./_age.js";

/**
 * Read the last handoff and report what is still true.
 *
 * @param {{ projectDir?: string, file?: string, list?: boolean }} options
 * @returns {{ source?: string, claims: Array<object>, text: string, parsed?: object }}
 */
export function handon({ projectDir = ".", file, list = false } = {}) {
  const available = listHandoffs(projectDir);

  if (list) {
    const text =
      available.length === 0
        ? `No handoff found. \`${HANDOFF_DIR}/\` is missing or holds no \`NN-slug.md\` file.`
        : [`# Handoffs in ${HANDOFF_DIR}/`, "", ...available.map((path) => `- ${path}`)].join("\n");

    return { claims: [], text };
  }

  const source = file ?? available[0];

  if (!source || !existsSync(join(projectDir, source))) {
    return {
      claims: [],
      text: [
        "# No handoff to resume from",
        "",
        file ? `\`${file}\` does not exist.` : `\`${HANDOFF_DIR}/\` is missing or holds no \`NN-slug.md\` file.`,
        "",
        "Write one with `rule_tool_process_handoff` at the end of a session. Guessing at a session that did not happen would be worse than saying nothing.",
      ].join("\n"),
    };
  }

  const body = readFileSync(join(projectDir, source), "utf8");
  const claimed = parseHandoff(body);
  const claims = verify(projectDir, claimed);

  const range = claims.find((claim) => claim.kind === "range");
  const since = range?.verdict.match(/^\d+ commits\b/) ? `, ${range.verdict}` : "";
  const age = ageLabel(claimed.date);
  const out = [`# Resuming from ${source.split("/").at(-1)}${age ? ` (${age}${since})` : since ? ` (${since.slice(2)})` : ""}`];

  for (const [heading, bucket] of [
    ["Still true", "still-true"],
    ["Changed since", "changed"],
    ["Unverified", "unverified"],
  ]) {
    const rows = lines(claims, bucket);

    out.push("", `## ${heading}`, "", ...(rows.length > 0 ? rows : ["- nothing"]));
  }

  // The open items come out of a file in the repository, which is input, not
  // instruction: a hostile checkout could otherwise ship "ignore previous
  // instructions" as step 1 of the next session (hardening 4.4).
  out.push("", "## Next, as the handoff left it", "");
  out.push(...(claimed.open.length > 0 ? claimed.open.map((item, index) => `${index + 1}. ${neutralizeDirectives(item)}`) : ["- the handoff listed no open items"]));

  if (claimed.missing.length > 0) {
    out.push("", "## Could not parse", "", `- ${claimed.missing.join(", ")}`, "", "Reported rather than dropped: what is missing here was never checked.");
  }

  out.push("", "## Suggested first move", "", firstMove(claims, claimed));

  return { source, claims, text: out.join("\n"), parsed: claimed };
}
