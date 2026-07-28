/**
 * @module test/inspector-launcher
 *
 * Verifies that the Inspector launcher avoids ports already occupied by
 * another Inspector instance.
 */

import { strict as assert } from "node:assert";
import net from "node:net";
import { findInspectorPorts } from "../scripts/inspector.mjs";

const occupiedPort = 6400;
const blocker = await listen(occupiedPort);

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(port, "localhost", () => {
      resolve(server);
    });
  });
}

try {
  const { clientPort, serverPort } = await findInspectorPorts({
    clientPort: occupiedPort,
    serverPort: occupiedPort + 1,
  });

  assert.equal(clientPort, occupiedPort + 1);
  assert.equal(serverPort, occupiedPort + 2);
  assert.notEqual(clientPort, serverPort);
  console.log("✅ Inspector launcher chooses free, distinct ports");
} finally {
  await new Promise((resolve, reject) => {
    blocker.close((error) => {
      if (error) {
        reject(error);

        return;
      }

      resolve();
    });
  });
}
