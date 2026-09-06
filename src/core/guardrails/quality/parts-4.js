// Auto-split from src/core/guardrails/quality.js - see ./quality/index.js

export const QUALITY_GUARDRAILS_PART4 = [
  {
    id: "no-future-use-code",
    label: "No code kept for an imagined future",
    description:
      'Markers like "for future use", "in case we need", or "just in case" mark code written for a requirement that does not exist yet.',
    check: (code) => {
      const markers =
        code.match(
          /(?:for future use|for now unused|not used yet|in case we (?:need|want)|might need (?:it|this|them) later|will be needed later|just in case|reserved for future|future-proof(?:ing|ed)?|placeholder for future)/gi,
        ) || [];

      return {
        pass: markers.length === 0,
        failCount: markers.length,
        detail: [...new Set(markers)].slice(0, 10),
        suggestion: "Delete the speculative code. Write it when the requirement arrives - version control remembers.",
      };
    },
  },
  {
    id: "no-commented-out-code",
    label: "No implementations parked in comments",
    description:
      "Three or more consecutive commented-out lines of code are a parked implementation. Delete them; git keeps the history.",
    check: (code) => {
      const codeish =
        /[;{}]$|=>|^(?:const|let|var|function|class|return|if|for|while|switch|import|export|await|async)\b|^\}/;
      let run = 0;
      let longest = 0;
      let sample = [];
      let current = [];

      for (const line of code.split("\n")) {
        const comment = line.match(/^\s*(?:\/\/|#)\s?(.*)$/);
        const body = comment ? comment[1].trim() : null;

        if (body && codeish.test(body)) {
          run += 1;
          current.push(body);

          if (run > longest) {
            longest = run;
            sample = [...current];
          }
        } else {
          run = 0;
          current = [];
        }
      }

      return {
        pass: longest < 3,
        failCount: longest >= 3 ? longest : 0,
        detail: longest >= 3 ? sample.slice(0, 5) : [],
        suggestion:
          "Delete the commented-out block. If it is a documented alternative, put the reasoning in an ADR instead.",
      };
    },
  },
  {
    id: "js-comment-no-history",
    label: "Comments say what the code does, never what it used to do",
    description:
      "A comment describes the current behavior and the reason for it. The story of how the code got here belongs to the ADR log and to git, and a copy in a comment is a second record that goes stale.",
    check: (code) => {
      const comments = [...code.matchAll(/\/\*[\s\S]*?\*\//g), ...code.matchAll(/(?:^|[^:"'`\\])\/\/(.*)$/gm)].map(
        (match) => match[0],
      );
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
  },
];
