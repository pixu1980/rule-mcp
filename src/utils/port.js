/**
 * @module utils/port
 *
 * Dynamic port allocation utility.
 * Finds the first available port in a given range using Node's net module.
 */

import net from "node:net";

/**
 * Check if a specific port is available on 127.0.0.1.
 *
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

/**
 * Find the first available port in the given range.
 * Default range: 3000–6000.
 *
 * @param {number} [start=3000] - Start of port range (inclusive)
 * @param {number} [end=6000] - End of port range (inclusive)
 * @returns {Promise<number>} - The first available port found
 * @throws {Error} - If no port is available in the range
 */
export async function findAvailablePort(start = 3000, end = 6000) {
  for (let port = start; port <= end; port++) {
    const available = await isPortAvailable(port);
    if (available) return port;
  }
  throw new Error(`No available port found in range ${start}-${end}`);
}
