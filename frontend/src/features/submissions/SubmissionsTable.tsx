import Link from 'next/link';
import { ExternalLink, Flag } from 'lucide-react';
import { Badge, PayoutStatusBadge } from '@/components/ui/Badge';
import { formatDate, formatInr, formatViews } from '@/lib/format';
import type { Submission, ViewUpdateResponse } from '@/types/api';
import { UpdateViewsButton } from './UpdateViewsDialog';

interface SubmissionsTableProps {
  submissions: Submission[];
  /** "brand" shows who posted; "creator" shows which campaign it was for. */
  perspective: 'brand' | 'creator';
  onViewsUpdated?: (result: ViewUpdateResponse) => void;
}

type RowProps = Omit<SubmissionsTableProps, 'submissions'> & { submission: Submission };

function shortUrl(url: string): string {
  return url.replace(/^https:\/\/(www\.)?/, '');
}

function PostInfo({ submission: s, perspective }: RowProps) {
  return (
    <>
      {perspective === 'brand' ? (
        <span className="font-medium text-zinc-900">{s.creator.name ?? 'Creator'}</span>
      ) : (
        <Link href={`/campaigns/${s.campaign.id}`} className="font-medium text-zinc-900 hover:underline">
          {s.campaign.name ?? 'Campaign'}
        </Link>
      )}
      <a
        href={s.postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative mt-0.5 flex max-w-[260px] items-center gap-1 text-xs text-zinc-500 hover:text-violet-700"
      >
        <span className="truncate">{shortUrl(s.postUrl)}</span>
        <ExternalLink className="size-3 shrink-0" aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <p className="mt-0.5 text-xs text-zinc-400">Submitted {formatDate(s.createdAt)}</p>
    </>
  );
}

function Earned({ submission: s }: { submission: Submission }) {
  const unfunded = s.eligiblePayout - s.paidAmount;
  return (
    <>
      <span className="font-semibold tabular-nums text-zinc-900">{formatInr(s.paidAmount)}</span>
      {unfunded > 0 && <p className="text-xs text-amber-700 tabular-nums">{formatInr(unfunded)} unfunded</p>}
      {unfunded < 0 && <p className="text-xs text-zinc-500">Views dropped; payout kept</p>}
    </>
  );
}

function Statuses({ submission: s }: { submission: Submission }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <PayoutStatusBadge status={s.payoutStatus} />
      {s.flagged && (
        <span title="Views jumped unusually fast. Worth checking before trusting this post's numbers.">
          <Badge tone="violet">
            <Flag className="size-3" aria-hidden /> View spike
          </Badge>
        </span>
      )}
    </div>
  );
}

/** Submissions as a table on wider screens and as stacked cards on phones. */
export function SubmissionsTable({ submissions, perspective, onViewsUpdated }: SubmissionsTableProps) {
  return (
    <>
      <ul className="divide-y divide-zinc-100 md:hidden">
        {submissions.map((s) => (
          <li key={s.id} className="space-y-3 px-5 py-4">
            <div className="min-w-0">
              <PostInfo submission={s} perspective={perspective} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Views</dt>
                <dd className="tabular-nums text-zinc-900">{formatViews(s.views)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Earned</dt>
                <dd>
                  <Earned submission={s} />
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Statuses submission={s} />
              {onViewsUpdated && <UpdateViewsButton submission={s} onUpdated={onViewsUpdated} />}
            </div>
          </li>
        ))}
      </ul>

      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                {perspective === 'brand' ? 'Creator' : 'Campaign'}
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Views
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Earned
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
              {onViewsUpdated && (
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {submissions.map((s) => (
              <tr key={s.id} className="align-top">
                <td className="px-5 py-3.5">
                  <PostInfo submission={s} perspective={perspective} />
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-zinc-900">{formatViews(s.views)}</td>
                <td className="px-5 py-3.5 text-right">
                  <Earned submission={s} />
                </td>
                <td className="px-5 py-3.5">
                  <Statuses submission={s} />
                </td>
                {onViewsUpdated && (
                  <td className="px-5 py-3.5 text-right">
                    <UpdateViewsButton submission={s} onUpdated={onViewsUpdated} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
