

/** An error the caller can attribute to the decision layer, not to a bug. */
export class DecisionClientError extends Error {
  /**
   * @param {string} message
   * @param {{ cause?: unknown }} [options]
   */
  constructor(message, options) {
    super(message, options);
    this.name = "DecisionClientError";
  }
}

/** An error the supervisor attributes to the model lifecycle or the breaker. */
export class DecisionSupervisorError extends Error {
  /**
   * @param {string} message
   * @param {{ cause?: unknown, code?: string }} [options]
   */
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = "DecisionSupervisorError";
    this.code = options.code ?? "decision";
  }
}
