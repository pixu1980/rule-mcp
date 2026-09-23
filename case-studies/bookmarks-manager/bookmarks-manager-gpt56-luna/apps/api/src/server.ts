/** HTTP listener with graceful shutdown for local and production environments. */
import { app } from "./app.js";
import { env } from "./config.js";
import { logger } from "./logger.js";

const port = env.PORT;
const server = app.listen(port, () =>
  logger.info({ port }, "Luma API listening"),
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
