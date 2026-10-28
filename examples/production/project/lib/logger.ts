import "server-only";
import pino from "pino";
import { getEnv } from "./env";

export const logger = pino({
  level: getEnv().LOG_LEVEL,
  base: { service: "order-panel", env: getEnv().APP_ENV, version: getEnv().APP_VERSION },
  redact: {
    paths: ["password", "*.password", "cookie", "*.cookie", "headers.cookie", "*.headers.cookie"],
    censor: "[redacted]",
  },
});
