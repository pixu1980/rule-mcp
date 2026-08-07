// rule-architect http-body helper - bounded request-body reader.
// Shared by both interview servers so a POST cannot buffer unbounded memory.

// Interview payloads are a few KB (answers + repeatable entries); 2 MiB is a
// generous ceiling that no real interview reaches but that caps a hostile or
// runaway request.
const DEFAULT_LIMIT = 2 * 1024 * 1024;

/**
 * Read a request body to a string, rejecting once it exceeds `limit` bytes so
 * the handler never accumulates an unbounded string. On overflow the request
 * is destroyed and the rejection carries `statusCode = 413`.
 * @param {import("node:http").IncomingMessage} req
 * @param {number} [limit] - maximum body size in bytes
 * @returns {Promise<string>} the collected body
 */
export function collectBody(req, limit = DEFAULT_LIMIT) {
  return new Promise((resolve, reject) => {
    let body = "";
    let over = false;

    req.on("data", (chunk) => {
      // Once over the limit, keep receiving but stop appending - the stream
      // drains (bounded memory) while the handler sends its 413. Destroying
      // the request here would reset the socket before that response flushes.
      if (over) return;
      body += chunk;
      if (body.length > limit) {
        over = true;
        const err = new Error("Request body too large");
        err.statusCode = 413;
        reject(err);
      }
    });
    req.on("end", () => {
      if (!over) resolve(body);
    });
    req.on("error", reject);
  });
}
