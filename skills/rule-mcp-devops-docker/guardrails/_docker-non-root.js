/** Guardrail `docker-non-root`: the image drops root before it runs anything. */
export const dockerNonRoot = {
  id: "docker-non-root",
  label: "Container runs as non-root user",
  description: "Docker containers must switch to a non-root user.",
  check: (code) => {
    if (!/^FROM\s+/im.test(code)) {
      return { pass: true, note: "Not a Dockerfile, skipping" };
    }

    const hasUser = /^USER\s+(?!root\b)\w+/im.test(code);

    return {
      pass: hasUser,
      failCount: hasUser ? 0 : 1,
      detail: hasUser ? [] : ["No non-root USER instruction"],
      suggestion: "Add 'USER node' (or USER 1001) after installing dependencies.",
    };
  },
};
