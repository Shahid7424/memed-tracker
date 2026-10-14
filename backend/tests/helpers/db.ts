import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Campaign } from '../../src/models/Campaign';
import { Submission } from '../../src/models/Submission';
import { User } from '../../src/models/User';

/**
 * Starts a throwaway single-node MongoDB replica set in memory. A replica set
 * (not a standalone server) is required because payout updates use
 * transactions. Each test file gets its own database.
 */
export function useTestDatabase(): void {
  let replSet: MongoMemoryReplSet;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    await mongoose.connect(replSet.getUri());
    // Build indexes (e.g. unique email, unique post per campaign) before tests run.
    await Promise.all([User.init(), Campaign.init(), Submission.init()]);
  });

  afterEach(async () => {
    await Promise.all([User.deleteMany({}), Campaign.deleteMany({}), Submission.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });
}
