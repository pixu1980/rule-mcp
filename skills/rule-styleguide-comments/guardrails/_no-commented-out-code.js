/** Guardrail `no-commented-out-code`: No implementations parked in comments */
export const noCommentedOutCode = {
  id: "no-commented-out-code",
  label: "No implementations parked in comments",
  description: "Three or more consecutive commented-out lines of code are a parked implementation. Delete them; git keeps the history.",
  check: (code) => {
    const codeish = /[;{}]$|=>|^(?:const|let|var|function|class|return|if|for|while|switch|import|export|await|async)\b|^\}/;
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
      suggestion: "Delete the commented-out block. If it is a documented alternative, put the reasoning in an ADR instead.",
    };
  },
};
