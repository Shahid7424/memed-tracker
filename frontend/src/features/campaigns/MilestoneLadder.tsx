import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCompactViews, formatInr, formatViews } from '@/lib/format';
import type { Milestone } from '@/types/api';

/**
 * The milestone ladder as a vertical list. If `reachedIndex` is given, rungs
 * up to it are marked as reached.
 */
export function MilestoneLadder({
  milestones,
  reachedIndex = -1,
  compact = false,
}: {
  milestones: Milestone[];
  reachedIndex?: number;
  compact?: boolean;
}) {
  return (
    <ol className="space-y-2">
      {milestones.map((m, i) => {
        const reached = i <= reachedIndex;
        return (
          <li
            key={m.views}
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border px-3',
              compact ? 'py-1.5' : 'py-2.5',
              reached ? 'border-emerald-200 bg-emerald-50/60' : 'border-zinc-200',
            )}
          >
            <span className="flex items-center gap-2 text-sm text-zinc-700">
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[11px] font-semibold',
                  reached ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-500',
                )}
                aria-hidden
              >
                {reached ? <Check className="size-3" /> : i + 1}
              </span>
              <span title={`${formatViews(m.views)} views`}>
                <span className="font-medium text-zinc-900 tabular-nums">
                  {compact ? formatCompactViews(m.views) : formatViews(m.views)}
                </span>{' '}
                views
              </span>
              {reached && <span className="sr-only">(reached)</span>}
            </span>
            <span className="text-sm font-semibold text-zinc-900 tabular-nums">{formatInr(m.payout)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function topPayout(milestones: Milestone[]): number {
  return milestones.reduce((max, m) => Math.max(max, m.payout), 0);
}
