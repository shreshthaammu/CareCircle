import { app } from './app.js';
import { env } from './config/env.js';
import { initFirestore, isUsingInMemoryStore, verifyFirestoreConnection } from './repositories/firestore.js';
import { circleRepo } from './repositories/circle.repo.js';
import { runSeed } from './scripts/seed.js';
import { startReminderCron, stopReminderCron } from './jobs/reminderCron.js';
import { logger } from './utils/logger.js';

async function startServer(): Promise<void> {
  initFirestore();
  await verifyFirestoreConnection();

  if (isUsingInMemoryStore()) {
    const existingDemo = await circleRepo.getById('circle_demo_01');
    if (!existingDemo) {
      await runSeed();
    }
  }

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`CareCircle server listening on 0.0.0.0:${env.PORT} in ${env.NODE_ENV} mode`);
    logger.info(`Health check available at http://localhost:${env.PORT}/healthz`);

    startReminderCron();
  });

  function shutdown(signal: string): void {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    stopReminderCron();
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch(error => {
  logger.error('CareCircle server failed to start', error);
  process.exit(1);
});
