/**
 * Zero-install local database: starts a single-node MongoDB replica set in
 * memory on port 27017 (downloads the MongoDB binary on first run).
 * Data is lost when you stop it. Keep this running in its own terminal.
 *
 *   npm run db:dev
 *   MONGODB_URI=mongodb://127.0.0.1:27017/memed?replicaSet=rs0
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';

async function main(): Promise<void> {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
    instanceOpts: [{ port: 27017 }],
  });
  console.log(`In-memory MongoDB replica set ready: ${replSet.getUri('memed')}`);
  console.log('Press Ctrl+C to stop.');

  const stop = () => {
    replSet
      .stop()
      .catch((err: unknown) => console.error(err))
      .finally(() => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err: unknown) => {
  console.error('Could not start the in-memory database:', err);
  process.exit(1);
});
