export const ROLES = ['brand', 'creator'] as const;
export type Role = (typeof ROLES)[number];

export const PLATFORMS = ['instagram', 'youtube'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const CAMPAIGN_STATUSES = ['live', 'exhausted'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/**
 * pending        – the post has not reached the first milestone yet
 * paid           – everything the post is eligible for has been paid
 * budget_blocked – the post reached a higher milestone, but the campaign's
 *                  remaining budget cannot cover the extra amount
 */
export const PAYOUT_STATUSES = ['pending', 'paid', 'budget_blocked'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/** All money is stored as whole rupees (integers), never as floats. */
export interface Milestone {
  views: number;
  payout: number;
}

export interface AuthUser {
  id: string;
  role: Role;
}
