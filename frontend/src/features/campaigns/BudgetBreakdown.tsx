import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatInr } from '@/lib/format';
import type { Campaign } from '@/types/api';

export function BudgetBreakdown({ campaign }: { campaign: Campaign }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums">
          {formatInr(campaign.remainingBudget)}
        </p>
        <p className="text-sm text-zinc-500">{campaign.utilizationPercent}% used</p>
      </div>
      <p className="text-sm text-zinc-500">remaining of {formatInr(campaign.totalBudget)}</p>
      <ProgressBar value={campaign.utilizationPercent} label="Budget used" className="mt-4" />
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-zinc-500">Budget</dt>
          <dd className="font-medium text-zinc-900 tabular-nums">{formatInr(campaign.totalBudget)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Paid out</dt>
          <dd className="font-medium text-zinc-900 tabular-nums">{formatInr(campaign.spentAmount)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Remaining</dt>
          <dd className="font-medium text-zinc-900 tabular-nums">{formatInr(campaign.remainingBudget)}</dd>
        </div>
      </dl>
    </div>
  );
}
