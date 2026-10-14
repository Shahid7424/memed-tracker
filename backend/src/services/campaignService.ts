import { Types } from 'mongoose';
import { Campaign } from '../models/Campaign';
import { Submission } from '../models/Submission';
import { AppError } from '../utils/AppError';
import { formatInr } from '../utils/format';
import { toCampaignDto, toSubmissionDto, type CampaignDto, type SubmissionDto } from '../utils/serializers';
import type { CreateCampaignInput, ListCampaignsQuery } from '../validators/campaign';
import { validateMilestones } from './payout';

export async function createCampaign(brandId: string, input: CreateCampaignInput): Promise<CampaignDto> {
  const milestones = validateMilestones(input.milestones);
  const firstPayout = milestones[0]!.payout;
  if (input.totalBudget < firstPayout) {
    throw AppError.badRequest(
      `Total budget must be at least the first milestone payout (${formatInr(firstPayout)}), otherwise no creator could ever be paid`,
    );
  }

  const campaign = await Campaign.create({
    name: input.name,
    platform: input.platform,
    brand: brandId,
    totalBudget: input.totalBudget,
    spentAmount: 0,
    milestones,
    status: 'live',
  });
  return toCampaignDto(campaign);
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listCampaigns(query: ListCampaignsQuery): Promise<Paginated<CampaignDto>> {
  const filter: Record<string, string> = {};
  if (query.status !== 'all') filter.status = query.status;
  if (query.platform) filter.platform = query.platform;

  const [campaigns, total] = await Promise.all([
    Campaign.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate<{ brand: { _id: Types.ObjectId; name: string } }>('brand', 'name'),
    Campaign.countDocuments(filter),
  ]);

  return {
    items: campaigns.map(toCampaignDto),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getCampaign(id: string): Promise<CampaignDto> {
  const campaign = await Campaign.findById(id).populate<{ brand: { _id: Types.ObjectId; name: string } }>(
    'brand',
    'name',
  );
  if (!campaign) throw AppError.notFound('Campaign not found');
  return toCampaignDto(campaign);
}

export type BrandCampaignDto = CampaignDto & { submissionCount: number };

export interface BrandCampaignsResult {
  campaigns: BrandCampaignDto[];
  summary: {
    totalCampaigns: number;
    liveCampaigns: number;
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    totalSubmissions: number;
  };
}

/** A brand's own campaigns with submission counts and dashboard totals. */
export async function listBrandCampaigns(brandId: string): Promise<BrandCampaignsResult> {
  const campaigns = await Campaign.find({ brand: brandId }).sort({ createdAt: -1 });

  const counts = await Submission.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { campaign: { $in: campaigns.map((c) => c._id) } } },
    { $group: { _id: '$campaign', count: { $sum: 1 } } },
  ]);
  const countByCampaign = new Map(counts.map((c) => [c._id.toString(), c.count]));

  const dtos = campaigns.map((c) => ({ ...toCampaignDto(c), submissionCount: countByCampaign.get(c.id) ?? 0 }));
  const sum = (pick: (c: BrandCampaignDto) => number) => dtos.reduce((total, c) => total + pick(c), 0);

  return {
    campaigns: dtos,
    summary: {
      totalCampaigns: dtos.length,
      liveCampaigns: dtos.filter((c) => c.status === 'live').length,
      totalBudget: sum((c) => c.totalBudget),
      totalSpent: sum((c) => c.spentAmount),
      totalRemaining: sum((c) => c.remainingBudget),
      totalSubmissions: sum((c) => c.submissionCount),
    },
  };
}

/** Submissions for a campaign. Only the brand that owns the campaign may see them. */
export async function listCampaignSubmissions(campaignId: string, brandId: string): Promise<SubmissionDto[]> {
  const campaign = await Campaign.findById(campaignId).select('brand');
  if (!campaign) throw AppError.notFound('Campaign not found');
  if (!campaign.brand.equals(brandId)) {
    throw AppError.forbidden('You can only view submissions for your own campaigns');
  }

  const submissions = await Submission.find({ campaign: campaignId })
    .sort({ createdAt: -1 })
    .populate<{ creator: { _id: Types.ObjectId; name: string } }>('creator', 'name');
  return submissions.map(toSubmissionDto);
}
