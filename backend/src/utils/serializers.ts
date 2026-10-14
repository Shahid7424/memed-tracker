import type { Types } from 'mongoose';
import type { CampaignStatus, Milestone, Platform, PayoutStatus, Role } from '../types/domain';

/**
 * Converts database documents into the exact JSON shapes the API returns.
 * Keeping this in one place guarantees we never leak fields such as
 * passwordHash, and that remainingBudget is always derived the same way.
 */

interface UserLike {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: Role;
  createdAt?: Date;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export function toUserDto(user: UserLike): UserDto {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}

interface CampaignLike {
  _id: Types.ObjectId;
  name: string;
  platform: Platform;
  brand: Types.ObjectId | { _id: Types.ObjectId; name: string };
  totalBudget: number;
  spentAmount: number;
  milestones: Milestone[];
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignDto {
  id: string;
  name: string;
  platform: Platform;
  brand: { id: string; name?: string };
  totalBudget: number;
  spentAmount: number;
  remainingBudget: number;
  /** Whole-number percentage of the budget already paid out (0–100). */
  utilizationPercent: number;
  milestones: Milestone[];
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

function brandRef(brand: CampaignLike['brand']): CampaignDto['brand'] {
  return 'name' in brand ? { id: brand._id.toString(), name: brand.name } : { id: brand.toString() };
}

export function toCampaignDto(c: CampaignLike): CampaignDto {
  return {
    id: c._id.toString(),
    name: c.name,
    platform: c.platform,
    brand: brandRef(c.brand),
    totalBudget: c.totalBudget,
    spentAmount: c.spentAmount,
    remainingBudget: c.totalBudget - c.spentAmount,
    utilizationPercent: Math.floor((c.spentAmount * 100) / c.totalBudget),
    milestones: c.milestones.map((m) => ({ views: m.views, payout: m.payout })),
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

interface SubmissionLike {
  _id: Types.ObjectId;
  campaign: Types.ObjectId | { _id: Types.ObjectId; name: string; platform: Platform; status: CampaignStatus };
  creator: Types.ObjectId | { _id: Types.ObjectId; name: string };
  platform: Platform;
  postUrl: string;
  views: number;
  eligiblePayout: number;
  paidAmount: number;
  payoutStatus: PayoutStatus;
  viewsUpdatedAt?: Date | null;
  flagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionDto {
  id: string;
  campaign: { id: string; name?: string; status?: CampaignStatus };
  creator: { id: string; name?: string };
  platform: Platform;
  postUrl: string;
  views: number;
  eligiblePayout: number;
  paidAmount: number;
  payoutStatus: PayoutStatus;
  viewsUpdatedAt: string | null;
  flagged: boolean;
  createdAt: string;
}

export function toSubmissionDto(s: SubmissionLike): SubmissionDto {
  const campaign =
    'name' in s.campaign
      ? { id: s.campaign._id.toString(), name: s.campaign.name, status: s.campaign.status }
      : { id: s.campaign.toString() };
  const creator =
    'name' in s.creator ? { id: s.creator._id.toString(), name: s.creator.name } : { id: s.creator.toString() };

  return {
    id: s._id.toString(),
    campaign,
    creator,
    platform: s.platform,
    postUrl: s.postUrl,
    views: s.views,
    eligiblePayout: s.eligiblePayout,
    paidAmount: s.paidAmount,
    payoutStatus: s.payoutStatus,
    viewsUpdatedAt: s.viewsUpdatedAt ? s.viewsUpdatedAt.toISOString() : null,
    flagged: s.flagged,
    createdAt: s.createdAt.toISOString(),
  };
}
