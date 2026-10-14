'use client';

import { Compass, FileText, Hourglass, Megaphone, Wallet } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { SubmissionsTable } from '@/features/submissions/SubmissionsTable';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatInr } from '@/lib/format';
import { campaignApi } from '@/services/campaignApi';
import { submissionApi } from '@/services/submissionApi';

export function CreatorDashboard() {
  const user = useCurrentUser();
  const { data, error, loading, reload } = useApiQuery(async (signal) => {
    const [mine, live] = await Promise.all([submissionApi.mine(signal), campaignApi.browse({ page: 1 }, signal)]);
    return { mine, liveCampaigns: live.total };
  }, []);
  const browse = (
    <ButtonLink href="/campaigns" icon={<Compass className="size-4" aria-hidden />}>
      Browse campaigns
    </ButtonLink>
  );

  return (
    <>
      <PageHeader
        title={`Hi, ${user.name.split(' ')[0]}`}
        description="Your posts, views and earnings."
        actions={browse}
      />
      {loading && !data ? (
        <PageSkeleton />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total earned" value={formatInr(data.mine.summary.totalEarned)} icon={Wallet} />
            <StatCard label="Posts submitted" value={String(data.mine.summary.submissionCount)} icon={FileText} />
            <StatCard
              label="Live campaigns"
              value={String(data.liveCampaigns)}
              hint="Open for new posts"
              icon={Megaphone}
            />
            <StatCard
              label="Waiting on budget"
              value={formatInr(data.mine.summary.blockedAmount)}
              hint="Reached, but campaign budget ran short"
              icon={Hourglass}
            />
          </div>
          <Card>
            <CardHeader
              title="Recent submissions"
              action={
                data.mine.submissions.length > 0 ? (
                  <ButtonLink href="/earnings" variant="ghost" size="sm">
                    All earnings
                  </ButtonLink>
                ) : undefined
              }
            />
            {data.mine.submissions.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="You haven't submitted any posts"
                description="Pick a live campaign, post your content, and submit the link here to start earning per milestone."
                action={browse}
              />
            ) : (
              <SubmissionsTable
                submissions={data.mine.submissions.slice(0, 5)}
                perspective="creator"
                onViewsUpdated={reload}
              />
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
