'use client';

import { useCurrentUser } from '@/features/auth/AuthProvider';
import { BrandCampaignsList } from '@/features/campaigns/BrandCampaignsList';
import { BrowseCampaigns } from '@/features/campaigns/BrowseCampaigns';

/** Brands see the campaigns they own; creators browse live campaigns. */
export default function CampaignsPage() {
  const user = useCurrentUser();
  return user.role === 'brand' ? <BrandCampaignsList /> : <BrowseCampaigns />;
}
