'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useApiQuery } from '@/hooks/useApiQuery';
import { cn } from '@/lib/cn';
import { campaignApi } from '@/services/campaignApi';
import type { Platform } from '@/types/api';
import { CampaignCard } from './CampaignCard';

const FILTERS: { value: Platform | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
];

export function BrowseCampaigns() {
  const [platform, setPlatform] = useState<Platform | undefined>();
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApiQuery(
    (signal) => campaignApi.browse({ page, platform }, signal),
    [page, platform],
  );

  return (
    <>
      <PageHeader title="Browse campaigns" description="Live campaigns that still have budget for new posts." />
      <div
        className="mb-5 inline-flex rounded-lg border border-zinc-200 bg-white p-1"
        role="group"
        aria-label="Filter by platform"
      >
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            aria-pressed={platform === f.value}
            onClick={() => {
              setPlatform(f.value);
              setPage(1);
            }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
              platform === f.value ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data && data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Compass}
            title="No live campaigns right now"
            description={
              platform
                ? 'Try another platform, or check back soon.'
                : 'Brands launch new campaigns often. Check back soon.'
            }
          />
        </Card>
      ) : data ? (
        <div aria-busy={loading}>
          <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', loading && 'opacity-60')}>
            {data.items.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
          {data.totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                icon={<ArrowLeft className="size-4" aria-hidden />}
              >
                Previous
              </Button>
              <span className="text-sm text-zinc-500">
                Page {data.page} of {data.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ArrowRight className="size-4" aria-hidden />
              </Button>
            </nav>
          )}
        </div>
      ) : null}
    </>
  );
}
