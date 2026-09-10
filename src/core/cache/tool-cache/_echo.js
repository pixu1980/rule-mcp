

/** The echo check that gates the normalized tier. */
import { NORMALIZABLE } from "./_state.js";

/** The text of a result, for the echo check. */
export function resultText(result) {
  return (result?.content ?? [])
    .map((item) => item?.text ?? "")
    .join("\n")
    .toLowerCase();
}

/**
 * Does this result quote the question it was asked?
 *
 * The allowlist is necessary and not sufficient. `pix_tool` does not echo the
 * prompt when it routes confidently, and DOES echo it when it cannot: the
 * uncertain answer carries `No strong match for "<prompt>"`. Replaying that for
 * a differently worded question would hand the caller a sentence about a prompt
 * nobody typed - and the uncertain answer is precisely the one least worth
 * replaying.
 *
 * So the tier is decided per call, on the output, not per tool. A future tool
 * that starts quoting its input stops getting L1 entries without anyone
 * remembering to check.
 *
 * @param {string} toolName @param {object} args @param {object} result
 * @returns {boolean}
 */
export function echoesArguments(toolName, args, result) {
  const fields = NORMALIZABLE.get(toolName);

  if (!fields) {
    return false;
  }

  const text = resultText(result);

  for (const field of fields) {
    const raw = args?.[field];

    if (typeof raw !== "string" || raw.trim().length === 0) {
      continue;
    }

    if (text.includes(raw.trim().toLowerCase())) {
      return true;
    }
  }

  return false;
}
