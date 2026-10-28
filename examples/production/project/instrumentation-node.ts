import { getEnv } from "./lib/env";

// Runs once as the server starts, and only on the Node.js runtime.
try {
  getEnv();
} catch (error) {
  // If the environment variables are wrong the server exits before taking any traffic.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const { logger } = await import("./lib/logger");
logger.info({ event: "server_started" }, "Server started");
