import { z } from 'zod';
import { CAMPAIGN_STATUSES, PLATFORMS } from '../types/domain';
import { MAX_MILESTONES } from '../services/payout';
import { paginationSchema, wholeNumber } from './common';

export const MAX_BUDGET = 1_000_000_000; // ₹100 crore, a sanity cap

const milestoneSchema = z.object({
  views: wholeNumber('Milestone views').positive('Milestone views must be greater than 0'),
  payout: wholeNumber('Milestone payout').positive('Milestone payout must be greater than 0'),
});

// Shape checks only. Business rules for the ladder (unique thresholds,
// increasing payouts, budget >= first payout) live in services/payout.ts and
// the campaign service so they can be unit tested without HTTP.
export const createCampaignSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(120),
  platform: z.enum(PLATFORMS, { error: 'Platform must be "instagram" or "youtube"' }),
  totalBudget: wholeNumber('Total budget')
    .positive('Total budget must be greater than 0')
    .max(MAX_BUDGET, 'Total budget is too large'),
  milestones: z.array(milestoneSchema).min(1, 'Add at least one milestone').max(MAX_MILESTONES),
});

export const listCampaignsQuerySchema = paginationSchema.extend({
  status: z.enum([...CAMPAIGN_STATUSES, 'all']).default('live'),
  platform: z.enum(PLATFORMS).optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
