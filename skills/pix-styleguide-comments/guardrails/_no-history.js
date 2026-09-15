

/** Guardrail `js-comment-no-history`: Comments say what the code does, never what it used to do */
export const jsCommentNoHistory = {
  id: "js-comment-no-history",
  label: "Comments say what the code does, never what it used to do",
  description:
    "A comment describes the current behavior and the reason for it. The story of how the code got here belongs to the ADR log and to git, and a copy in a comment is a second record that goes stale.",
  check: (code) => {
    const comments = [...code.matchAll(/\/\*[\s\S]*?\*\//g), ...code.matchAll(/(?:^|[^:"'`\\])\/\/(.*)$/gm)].map((match) => match[0]);
    if (comments.length === 0) {
      return { pass: true };
    }

    // Narrow on purpose. Each phrase names the code's own past rather than a
    // runtime condition, so "no longer accepting connections" passes and
    // a comment about the file's own past does not.
    const HISTORY = [
      /\bused to\b/i,
      /\bpreviously\b/i,
      /\bhad been\b/i,
      /\bthis (?:was|were)\b/i,
      /\bwe (?:changed|renamed|moved|replaced|removed)\b/i,
      /\bthe old\b/i,
      // Paired with a past-tense verb: "before this it was two functions" is
      // history, "refused until this project accepts it" is behavior.
      /\b(?:before|until) (?:this|that|now)\b[^.]*\b(?:was|were|did|had|used|would)\b/i,
      /\b(?:was|were)\b[^.]*\bbefore\b/i,
    ];

    const offenders = comments.filter((comment) => HISTORY.some((re) => re.test(comment)));
    if (offenders.length === 0) {
      return { pass: true };
    }

    return {
      pass: false,
      failCount: offenders.length,
      detail: offenders.slice(0, 3).map((c) => c.trim().slice(0, 120)),
      suggestion: "State what the code does now and why. Put the history in the ADR that decided it.",
    };
  },
};
