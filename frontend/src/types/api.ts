// Mirrors the JSON returned by the backend (see backend/src/utils/serializers.ts).

export type Role = 'brand' | 'creator';
export type Platform = 'instagram' | 'youtube';
export type CampaignStatus = 'live' | 'exhausted';
export type PayoutStatus = 'pending' | 'paid' | 'budget_blocked';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Milestone {
  views: number;
  payout: number;
}

export interface Campaign {
  id: string;
  name: string;
  platform: Platform;
  brand: { id: string; name?: string };
  totalBudget: number;
  spentAmount: number;
  remainingBudget: number;
  utilizationPercent: number;
  milestones: Milestone[];
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BrandCampaign extends Campaign {
  submissionCount: number;
}

export interface BrandCampaignsResponse {
  campaigns: BrandCampaign[];
  summary: {
    totalCampaigns: number;
    liveCampaigns: number;
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    totalSubmissions: number;
  };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Submission {
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

export interface CreatorSubmissionsResponse {
  submissions: Submission[];
  summary: { totalEarned: number; submissionCount: number; blockedAmount: number };
}

export interface ViewUpdateResponse {
  submission: Submission;
  campaign: Campaign;
  payout: {
    action: 'paid' | 'none' | 'budget_blocked';
    amountPaid: number;
    blockedAmount: number;
    message: string;
  };
}

export interface CreateCampaignInput {
  name: string;
  platform: Platform;
  totalBudget: number;
  milestones: Milestone[];
}
