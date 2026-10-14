/**
 * Creates demo accounts and campaigns so a fresh deployment has something to
 * click through. Safe to run more than once: it does nothing if the demo
 * brand already exists.
 *
 *   npm run seed
 */
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { loadEnv } from '../src/config/env';
import { User } from '../src/models/User';
import { createCampaign } from '../src/services/campaignService';
import { createSubmission } from '../src/services/submissionService';
import { updateSubmissionViews } from '../src/services/viewsService';

const PASSWORD = 'demo1234';

async function main(): Promise<void> {
  const env = loadEnv();
  await connectDatabase(env.MONGODB_URI);

  if (await User.exists({ email: 'brand@demo.memed.in' })) {
    console.log('Demo data already exists, nothing to do.');
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [brand, creator] = await User.create([
    { name: 'Glow Cosmetics', email: 'brand@demo.memed.in', passwordHash, role: 'brand' },
    { name: 'Desi Meme Co', email: 'creator@demo.memed.in', passwordHash, role: 'creator' },
  ]);

  const ladder = [
    { views: 10_000, payout: 500 },
    { views: 50_000, payout: 2_000 },
    { views: 100_000, payout: 5_000 },
  ];
  const diwali = await createCampaign(brand!.id, {
    name: 'Diwali Glow Reels',
    platform: 'instagram',
    totalBudget: 50_000,
    milestones: ladder,
  });
  await createCampaign(brand!.id, {
    name: 'Cricket Season Shorts',
    platform: 'youtube',
    totalBudget: 25_000,
    milestones: [
      { views: 25_000, payout: 1_000 },
      { views: 250_000, payout: 8_000 },
    ],
  });

  const post = await createSubmission(creator!.id, {
    campaignId: diwali.id,
    postUrl: 'https://www.instagram.com/reel/C0demoPost1/',
  });
  await updateSubmissionViews(post.id, 62_000);

  console.log(`Seeded. Log in with brand@demo.memed.in or creator@demo.memed.in, password "${PASSWORD}".`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
