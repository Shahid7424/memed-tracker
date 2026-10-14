'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { RoleGate } from '@/features/auth/RequireAuth';
import { CampaignForm } from '@/features/campaigns/CampaignForm';

export default function NewCampaignPage() {
  return (
    <RoleGate role="brand">
      <PageHeader title="New campaign" description="Set a budget and the view milestones creators are paid for." />
      <CampaignForm />
    </RoleGate>
  );
}
