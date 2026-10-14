import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { CampaignStatusBadge, PlatformBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate, formatInr } from '@/lib/format';
import type { BrandCampaign } from '@/types/api';

/** Campaigns as a table on wider screens and as stacked cards on phones. */
export function BrandCampaignTable({ campaigns }: { campaigns: BrandCampaign[] }) {
  return (
    <>
      <ul className="divide-y divide-zinc-100 md:hidden">
        {campaigns.map((c) => (
          <li key={c.id}>
            <Link href={`/campaigns/${c.id}`} className="block space-y-3 px-5 py-4 hover:bg-zinc-50/70">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">{c.name}</p>
                  <div className="mt-0.5">
                    <PlatformBadge platform={c.platform} />
                  </div>
                </div>
                <CampaignStatusBadge status={c.status} />
              </div>
              <div>
                <div className="flex justify-between text-xs text-zinc-500 tabular-nums">
                  <span>
                    {formatInr(c.spentAmount)} of {formatInr(c.totalBudget)} used
                  </span>
                  <span>{c.submissionCount} posts</span>
                </div>
                <ProgressBar value={c.utilizationPercent} label={`${c.name} budget used`} className="mt-1.5" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                Campaign
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="w-56 px-5 py-3 font-medium">
                Budget used
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Remaining
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Posts
              </th>
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {campaigns.map((c) => (
              <tr key={c.id} className="group hover:bg-zinc-50/70">
                <td className="px-5 py-3.5">
                  <Link href={`/campaigns/${c.id}`} className="font-medium text-zinc-900 hover:underline">
                    {c.name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                    <PlatformBadge platform={c.platform} />
                    <span>Created {formatDate(c.createdAt)}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <CampaignStatusBadge status={c.status} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-between text-xs text-zinc-500 tabular-nums">
                    <span>
                      {formatInr(c.spentAmount)} of {formatInr(c.totalBudget)}
                    </span>
                    <span>{c.utilizationPercent}%</span>
                  </div>
                  <ProgressBar value={c.utilizationPercent} label={`${c.name} budget used`} className="mt-1.5" />
                </td>
                <td className="px-5 py-3.5 text-right font-medium text-zinc-900 tabular-nums">
                  {formatInr(c.remainingBudget)}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-zinc-700">{c.submissionCount}</td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="inline-flex rounded-md p-1 text-zinc-400 group-hover:text-zinc-700"
                    aria-label={`Open ${c.name}`}
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
