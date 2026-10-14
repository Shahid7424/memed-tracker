import { connectDatabase, disconnectDatabase } from './config/db';
import { loadEnv } from './config/env';
import { createApp } from './app';

async function main(): Promise<void> {
  const env = loadEnv();
  await connectDatabase(env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const server = createApp(env).listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      disconnectDatabase()
        .catch((err: unknown) => console.error('Error while disconnecting from MongoDB', err))
        .finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('Failed to start server:', err instanceof Error ? err.message : err);
  process.exit(1);
});
