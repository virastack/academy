import { getEnv } from "./lib/env";

// Yalnızca Node.js çalışma ortamında, sunucu açılırken bir kez çalışır.
try {
  getEnv();
} catch (error) {
  // Ortam değişkenleri hatalıysa sunucu hiç trafik almadan kapanır.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const { logger } = await import("./lib/logger");
logger.info({ event: "server_started" }, "Sunucu başladı");
