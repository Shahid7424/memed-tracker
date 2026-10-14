import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { CampaignStatusBadge, PlatformBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCompactViews, formatInr } from '@/lib/format';
import type { Campaign } from '@/types/api';
import { topPayout } from './MilestoneLadder';

/** Campaign summary for the creator browse grid. */
export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <PlatformBadge platform={campaign.platform} />
        <CampaignStatusBadge status={campaign.status} />
      </div>
      <h3 className="mt-3 line-clamp-2 text-base font-semibold text-zinc-900">{campaign.name}</h3>
      {campaign.brand.name && <p className="text-sm text-zinc-500">by {campaign.brand.name}</p>}

      <p className="mt-4 text-sm text-zinc-500">Earn up to</p>
      <p className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums">
        {formatInr(topPayout(campaign.milestones))}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {campaign.milestones.map((m) => `${formatCompactViews(m.views)} → ${formatInr(m.payout)}`).join(' · ')}
      </p>

      <div className="mt-5 border-t border-zinc-100 pt-4">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Budget left</span>
          <span className="font-medium text-zinc-700 tabular-nums">
            {formatInr(campaign.remainingBudget)} of {formatInr(campaign.totalBudget)}
          </span>
        </div>
        <ProgressBar value={campaign.utilizationPercent} label="Budget used" className="mt-2" />
      </div>
      <Link
        href={`/campaigns/${campaign.id}`}
        className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:underline"
      >
        View and submit a post <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}
