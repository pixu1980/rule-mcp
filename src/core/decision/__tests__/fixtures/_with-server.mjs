

/** Start a decision client bound to a scripted server, and close both. */

import { createDecisionClient } from "../../_client.js";
import { startFakeServer } from "./_fake-server.mjs";

/**
 * @param {(request: { method: string, url: string, body: any, count: number }) => any} handler
 * @param {(context: { server: any, client: any }) => Promise<any>} body
 */
export async function withServer(handler, body) {
  const server = await startFakeServer(handler);
  const client = createDecisionClient({ baseUrl: server.url, timeoutMs: 1_000 });

  try {
    return await body({ server, client });
  } finally {
    await server.close();
  }
}
