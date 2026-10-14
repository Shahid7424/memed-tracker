import { apiRequest } from '@/lib/api';
import type { CreatorSubmissionsResponse, Submission, ViewUpdateResponse } from '@/types/api';

export const submissionApi = {
  create: (input: { campaignId: string; postUrl: string }) =>
    apiRequest<Submission>('/api/submissions', { method: 'POST', body: input }),

  mine: (signal?: AbortSignal) => apiRequest<CreatorSubmissionsResponse>('/api/submissions/mine', { signal }),

  updateViews: (id: string, views: number) =>
    apiRequest<ViewUpdateResponse>(`/api/submissions/${encodeURIComponent(id)}/views`, {
      method: 'PATCH',
      body: { views },
    }),
};
