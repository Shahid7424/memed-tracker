import { Types } from 'mongoose';
import { Campaign, type CampaignDocument } from '../../src/models/Campaign';
import { Submission, type SubmissionDocument } from '../../src/models/Submission';
import type { Milestone } from '../../src/types/domain';

export const LADDER: Milestone[] = [
  { views: 10_000, payout: 500 },
  { views: 50_000, payout: 2_000 },
  { views: 100_000, payout: 5_000 },
];

export async function makeCampaign(totalBudget: number, milestones: Milestone[] = LADDER): Promise<CampaignDocument> {
  return Campaign.create({
    name: 'Test campaign',
    platform: 'youtube',
    brand: new Types.ObjectId(),
    totalBudget,
    spentAmount: 0,
    milestones,
    status: 'live',
  });
}

let videoCounter = 0;

export async function makeSubmission(campaign: CampaignDocument): Promise<SubmissionDocument> {
  videoCounter += 1;
  return Submission.create({
    campaign: campaign._id,
    creator: new Types.ObjectId(),
    platform: campaign.platform,
    postUrl: `https://www.youtube.com/watch?v=vid${String(videoCounter).padStart(8, '0')}`,
  });
}
