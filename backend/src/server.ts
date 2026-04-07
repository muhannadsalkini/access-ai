import app from "./app";
import { env, validateEnv } from "./config/env";
import { logger } from "./utils/logger";
import { closeBrowser } from "./services/accessibility/axe-scanner";

// Validate environment variables
validateEnv();

const server = app.listen(env.port, () => {
  logger.info(`🚀 AccessAI Backend running on port ${env.port}`);
  logger.info(`📋 Health check: http://localhost:${env.port}/health`);
  logger.info(`🔗 Agent service: ${env.agentServiceUrl}`);
  logger.info(`🌐 Frontend URL: ${env.frontendUrl}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  // Close Playwright browser
  await closeBrowser();

  server.close(() => {
    logger.info("Server closed.");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
