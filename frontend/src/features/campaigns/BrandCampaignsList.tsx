'use client';

import { Megaphone, Plus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useApiQuery } from '@/hooks/useApiQuery';
import { campaignApi } from '@/services/campaignApi';
import { BrandCampaignTable } from './BrandCampaignTable';

export function BrandCampaignsList() {
  const { data, error, loading, reload } = useApiQuery((signal) => campaignApi.mine(signal), []);
  const newCampaign = (
    <ButtonLink href="/campaigns/new" icon={<Plus className="size-4" aria-hidden />}>
      New campaign
    </ButtonLink>
  );

  return (
    <>
      <PageHeader
        title="My campaigns"
        description="Budget spent and remaining for every campaign you run."
        actions={newCampaign}
      />
      {loading && !data ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data && data.campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Launch your first campaign to start working with creators."
            action={newCampaign}
          />
        </Card>
      ) : data ? (
        <Card>
          <BrandCampaignTable campaigns={data.campaigns} />
        </Card>
      ) : null}
    </>
  );
}
