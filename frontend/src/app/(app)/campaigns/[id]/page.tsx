'use client';

import { useParams } from 'next/navigation';
import { CampaignDetail } from '@/features/campaigns/CampaignDetail';

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  return <CampaignDetail id={id} />;
}
