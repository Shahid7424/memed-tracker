'use client';

import { IndianRupee, Megaphone, Plus, Wallet, PiggyBank } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { BrandCampaignTable } from '@/features/campaigns/BrandCampaignTable';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatInr } from '@/lib/format';
import { campaignApi } from '@/services/campaignApi';

export function BrandDashboard() {
  const user = useCurrentUser();
  const { data, error, loading, reload } = useApiQuery((signal) => campaignApi.mine(signal), []);
  const newCampaign = (
    <ButtonLink href="/campaigns/new" icon={<Plus className="size-4" aria-hidden />}>
      New campaign
    </ButtonLink>
  );

  return (
    <>
      <PageHeader
        title={`Hi, ${user.name.split(' ')[0]}`}
        description="Budgets and payouts across your campaigns."
        actions={newCampaign}
      />
      {loading && !data ? (
        <PageSkeleton />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Campaigns"
              value={String(data.summary.totalCampaigns)}
              hint={`${data.summary.liveCampaigns} live`}
              icon={Megaphone}
            />
            <StatCard label="Budget allocated" value={formatInr(data.summary.totalBudget)} icon={Wallet} />
            <StatCard
              label="Paid to creators"
              value={formatInr(data.summary.totalSpent)}
              hint={`${data.summary.totalSubmissions} posts submitted`}
              icon={IndianRupee}
            />
            <StatCard label="Remaining" value={formatInr(data.summary.totalRemaining)} icon={PiggyBank} />
          </div>
          <Card>
            <CardHeader
              title="Recent campaigns"
              action={
                data.campaigns.length > 5 ? (
                  <ButtonLink href="/campaigns" variant="ghost" size="sm">
                    View all
                  </ButtonLink>
                ) : undefined
              }
            />
            {data.campaigns.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                description="Create a campaign with a budget and milestone ladder. Creators can start submitting posts right away."
                action={newCampaign}
              />
            ) : (
              <BrandCampaignTable campaigns={data.campaigns.slice(0, 5)} />
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
