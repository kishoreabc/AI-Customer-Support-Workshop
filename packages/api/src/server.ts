import { createApp } from './app.js';
import { config } from './config.js';
import { getDatabase } from './database/connection.js';
import { initializeSchema } from './database/schema.js';
import { seedDatabase } from './database/seed.js';
import { logger } from './utils/logger.js';

async function startServer(): Promise<void> {
  const db = getDatabase();
  initializeSchema(db);
  await seedDatabase();

  const app = createApp();
  const port = config.port;

  app.listen(port, () => {
    logger.info(`AI Customer Support Backend Server running on port ${port} [${config.nodeEnv}]`);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server:', { error: String(err) });
  process.exit(1);
});
