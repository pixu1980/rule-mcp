

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
