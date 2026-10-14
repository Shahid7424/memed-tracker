'use client';

import { Compass, FileText, Hourglass, Wallet } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { RoleGate } from '@/features/auth/RequireAuth';
import { SubmissionsTable } from '@/features/submissions/SubmissionsTable';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatInr } from '@/lib/format';
import { submissionApi } from '@/services/submissionApi';

function Earnings() {
  const { data, error, loading, reload } = useApiQuery((signal) => submissionApi.mine(signal), []);

  return (
    <>
      <PageHeader title="My earnings" description="What each of your posts has earned so far." />
      {loading && !data ? (
        <PageSkeleton />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total earned" value={formatInr(data.summary.totalEarned)} icon={Wallet} />
            <StatCard label="Posts" value={String(data.summary.submissionCount)} icon={FileText} />
            <StatCard
              label="Waiting on budget"
              value={formatInr(data.summary.blockedAmount)}
              hint="Milestones reached but not funded"
              icon={Hourglass}
            />
          </div>
          <Card>
            <CardHeader
              title="Breakdown by post"
              description="Money already paid is never taken back, even if views drop later."
            />
            {data.submissions.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No earnings yet"
                description="Submit a post to a live campaign. You'll be paid as it crosses each milestone."
                action={
                  <ButtonLink href="/campaigns" icon={<Compass className="size-4" aria-hidden />}>
                    Browse campaigns
                  </ButtonLink>
                }
              />
            ) : (
              <SubmissionsTable submissions={data.submissions} perspective="creator" onViewsUpdated={reload} />
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}

export default function EarningsPage() {
  return (
    <RoleGate role="creator">
      <Earnings />
    </RoleGate>
  );
}
