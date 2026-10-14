'use client';

import Link from 'next/link';
import { ArrowLeft, Ban, FileText, Inbox } from 'lucide-react';
import { CampaignStatusBadge, PlatformBadge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { SubmissionsTable } from '@/features/submissions/SubmissionsTable';
import { SubmitPostForm } from '@/features/submissions/SubmitPostForm';
import { useApiQuery } from '@/hooks/useApiQuery';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { campaignApi } from '@/services/campaignApi';
import { submissionApi } from '@/services/submissionApi';
import type { Campaign, Submission, User } from '@/types/api';
import { BudgetBreakdown } from './BudgetBreakdown';
import { MilestoneLadder } from './MilestoneLadder';

interface DetailData {
  campaign: Campaign;
  isOwner: boolean;
  /** Owner: every submission. Creator: only their own. Other brands: none. */
  submissions: Submission[];
}

async function loadDetail(id: string, user: User, signal: AbortSignal): Promise<DetailData> {
  const campaign = await campaignApi.get(id, signal);
  const isOwner = user.role === 'brand' && campaign.brand.id === user.id;
  if (isOwner) {
    return { campaign, isOwner, submissions: await campaignApi.submissions(id, signal) };
  }
  if (user.role === 'creator') {
    const mine = await submissionApi.mine(signal);
    return { campaign, isOwner, submissions: mine.submissions.filter((s) => s.campaign.id === id) };
  }
  return { campaign, isOwner, submissions: [] };
}

export function CampaignDetail({ id }: { id: string }) {
  const user = useCurrentUser();
  const { data, error, loading, reload } = useApiQuery((signal) => loadDetail(id, user, signal), [id, user]);

  const back = (
    <Link href="/campaigns" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
      <ArrowLeft className="size-4" aria-hidden /> {user.role === 'brand' ? 'My campaigns' : 'Browse campaigns'}
    </Link>
  );

  if (loading && !data)
    return (
      <>
        {back}
        <PageSkeleton />
      </>
    );
  if (error && !data) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <>
        {back}
        {notFound ? (
          <Card>
            <EmptyState
              icon={Inbox}
              title="Campaign not found"
              description="It may have been removed, or the link is wrong."
            />
          </Card>
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </>
    );
  }
  if (!data) return null;
  const { campaign, isOwner, submissions } = data;

  return (
    <>
      {back}
      <PageHeader
        title={campaign.name}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <PlatformBadge platform={campaign.platform} />
            <CampaignStatusBadge status={campaign.status} />
            <span>
              {campaign.brand.name ? `by ${campaign.brand.name} · ` : ''}Created {formatDate(campaign.createdAt)}
            </span>
          </span>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader title="Budget" />
            <div className="p-5">
              <BudgetBreakdown campaign={campaign} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Milestone ladder" description="Paid once per post: the highest milestone reached." />
            <div className="p-5">
              <MilestoneLadder milestones={campaign.milestones} />
            </div>
          </Card>
        </div>

        {user.role === 'creator' && (
          <Card>
            <CardHeader
              title="Submit a post"
              description="Post your content on the platform first, then paste the link."
            />
            <div className="p-5">
              {campaign.status === 'live' ? (
                <SubmitPostForm campaign={campaign} onSubmitted={reload} />
              ) : (
                <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
                  <Ban className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
                  This campaign&apos;s remaining budget can&apos;t cover its first milestone, so it isn&apos;t accepting
                  new posts.
                </div>
              )}
            </div>
          </Card>
        )}

        {(isOwner || user.role === 'creator') && (
          <Card>
            <CardHeader
              title={isOwner ? 'Submissions' : 'Your posts in this campaign'}
              description="Use “Update views” to simulate the latest numbers from the platform."
            />
            {submissions.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={isOwner ? 'No submissions yet' : 'No posts submitted here yet'}
                description={
                  isOwner
                    ? 'Creators can find this campaign while it is live.'
                    : 'Submit a post above to start earning.'
                }
              />
            ) : (
              <SubmissionsTable
                submissions={submissions}
                perspective={isOwner ? 'brand' : 'creator'}
                onViewsUpdated={reload}
              />
            )}
          </Card>
        )}

        {!isOwner && user.role === 'brand' && (
          <Card>
            <EmptyState
              icon={Ban}
              title="Submissions are private"
              description="Only the brand that runs this campaign can see its submissions."
            />
          </Card>
        )}
      </div>
    </>
  );
}
