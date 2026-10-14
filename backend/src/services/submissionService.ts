import { Types } from 'mongoose';
import { Campaign } from '../models/Campaign';
import { Submission } from '../models/Submission';
import { AppError } from '../utils/AppError';
import { canonicalizePostUrl } from '../utils/postUrl';
import { toSubmissionDto, type SubmissionDto } from '../utils/serializers';
import type { CreateSubmissionInput } from '../validators/submission';
import type { CampaignStatus, Platform } from '../types/domain';

type PopulatedCampaign = { _id: Types.ObjectId; name: string; platform: Platform; status: CampaignStatus };

const PLATFORM_LABEL: Record<Platform, string> = { instagram: 'Instagram', youtube: 'YouTube' };

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

export async function createSubmission(creatorId: string, input: CreateSubmissionInput): Promise<SubmissionDto> {
  const campaign = await Campaign.findById(input.campaignId);
  if (!campaign) throw AppError.notFound('Campaign not found');
  if (campaign.status !== 'live') {
    throw AppError.conflict(
      'This campaign has run out of budget and is no longer accepting posts',
      'CAMPAIGN_NOT_LIVE',
    );
  }

  const postUrl = canonicalizePostUrl(input.postUrl, campaign.platform);
  if (!postUrl) {
    throw new AppError(
      400,
      'INVALID_POST_URL',
      `Enter a link to a ${PLATFORM_LABEL[campaign.platform]} post (this campaign is ${PLATFORM_LABEL[campaign.platform]} only)`,
    );
  }

  try {
    const submission = await Submission.create({
      campaign: campaign._id,
      creator: creatorId,
      platform: campaign.platform,
      postUrl,
    });
    return toSubmissionDto(submission);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw AppError.conflict('This post has already been submitted to this campaign', 'DUPLICATE_SUBMISSION');
    }
    throw err;
  }
}

export interface CreatorSubmissionsResult {
  submissions: SubmissionDto[];
  summary: {
    totalEarned: number;
    submissionCount: number;
    /** Money the creator has qualified for but could not be paid (budget ran out). */
    blockedAmount: number;
  };
}

export async function listCreatorSubmissions(creatorId: string): Promise<CreatorSubmissionsResult> {
  const submissions = await Submission.find({ creator: creatorId })
    .sort({ createdAt: -1 })
    .populate<{ campaign: PopulatedCampaign }>('campaign', 'name platform status');

  const dtos = submissions.map(toSubmissionDto);
  return {
    submissions: dtos,
    summary: {
      totalEarned: dtos.reduce((sum, s) => sum + s.paidAmount, 0),
      submissionCount: dtos.length,
      blockedAmount: dtos.reduce((sum, s) => sum + Math.max(0, s.eligiblePayout - s.paidAmount), 0),
    },
  };
}
