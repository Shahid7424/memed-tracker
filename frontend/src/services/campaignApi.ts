import { apiRequest } from '@/lib/api';
import type {
  BrandCampaignsResponse,
  Campaign,
  CreateCampaignInput,
  Paginated,
  Platform,
  Submission,
} from '@/types/api';

export interface BrowseCampaignsParams {
  page: number;
  platform?: Platform;
}

export const campaignApi = {
  create: (input: CreateCampaignInput) => apiRequest<Campaign>('/api/campaigns', { method: 'POST', body: input }),

  browse: ({ page, platform }: BrowseCampaignsParams, signal?: AbortSignal) => {
    const params = new URLSearchParams({ status: 'live', page: String(page), limit: '9' });
    if (platform) params.set('platform', platform);
    return apiRequest<Paginated<Campaign>>(`/api/campaigns?${params.toString()}`, { signal });
  },

  mine: (signal?: AbortSignal) => apiRequest<BrandCampaignsResponse>('/api/campaigns/mine', { signal }),

  get: (id: string, signal?: AbortSignal) =>
    apiRequest<Campaign>(`/api/campaigns/${encodeURIComponent(id)}`, { signal }),

  submissions: (id: string, signal?: AbortSignal) =>
    apiRequest<Submission[]>(`/api/campaigns/${encodeURIComponent(id)}/submissions`, { signal }),
};
