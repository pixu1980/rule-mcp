

/**
 * @module core/decision/__tests__/fixtures/fake-server
 *
 * A scripted HTTP server for the decision client tests.
 *
 * Every test that needs an answer scripts one reply per request and reads the
 * request count afterwards, so a retry or a second call is observable without a
 * model and without a socket leaving the machine.
 */

import { createServer } from "node:http";

/**
 * Start a server on a random loopback port.
 *
 * @param {(request: { method: string, url: string, body: any, count: number }) =>
 *   { status?: number, body?: object, delayMs?: number } |
 *   Promise<{ status?: number, body?: object, delayMs?: number }>} handler
 * @returns {Promise<{
 *   url: string,
 *   readonly count: number,
 *   close: () => Promise<void>,
 * }>}
 */
export async function startFakeServer(handler) {
  let count = 0;

  const server = createServer(async (request, response) => {
    count += 1;
    const chunks = await Array.fromAsync(request);
    const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined;
    const reply = await handler({
      method: request.method ?? "",
      url: request.url ?? "",
      body,
      count,
    });

    if (reply.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
    }

    if (response.writableEnded || response.destroyed) {
      return;
    }

    response.writeHead(reply.status ?? 200, { "content-type": "application/json" });
    response.end(JSON.stringify(reply.body ?? {}));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const address = server.address();
  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    get count() {
      return count;
    },
    async close() {
      server.closeAllConnections?.();
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
