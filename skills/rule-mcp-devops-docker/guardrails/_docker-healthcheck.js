/** Guardrail `docker-healthcheck`: the image tells the orchestrator when it is ready. */
export const dockerHealthcheck = {
  id: "docker-healthcheck",
  label: "HEALTHCHECK defined",
  description: "Production images should include a HEALTHCHECK.",
  check: (code) => {
    if (!/^FROM\s+/im.test(code)) {
      return { pass: true, note: "Not a Dockerfile, skipping" };
    }

    const isOk = /^HEALTHCHECK\s+/im.test(code);

    return {
      pass: isOk,
      failCount: isOk ? 0 : 1,
      detail: isOk ? [] : ["No HEALTHCHECK found"],
      suggestion: "Add: HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1",
    };
  },
};
