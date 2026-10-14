'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Camera, CirclePlay, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field, inputClasses } from '@/components/ui/Field';
import { ApiError, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatInr, formatViews } from '@/lib/format';
import { campaignApi } from '@/services/campaignApi';
import type { Platform } from '@/types/api';
import { MilestoneLadder } from './MilestoneLadder';
import {
  parsedLadder,
  parseWholeNumber,
  validateCampaignDraft,
  type CampaignDraft,
  type CampaignFormErrors,
} from './campaignFormValidation';

const PLATFORMS: { value: Platform; label: string; icon: typeof Camera }[] = [
  { value: 'instagram', label: 'Instagram', icon: Camera },
  { value: 'youtube', label: 'YouTube', icon: CirclePlay },
];

const MAX_MILESTONES = 10;

export function CampaignForm() {
  const router = useRouter();
  const nextKey = useRef(3);
  const [draft, setDraft] = useState<CampaignDraft>({
    name: '',
    platform: null,
    totalBudget: '',
    milestones: [
      { key: 0, views: '10000', payout: '500' },
      { key: 1, views: '50000', payout: '2000' },
      { key: 2, views: '100000', payout: '5000' },
    ],
  });
  // Errors appear after the first submit attempt, then update live as the user fixes them.
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const noErrors: CampaignFormErrors = { rows: {} };
  const errors = attempted ? validateCampaignDraft(draft).errors : noErrors;

  const ladder = parsedLadder(draft.milestones);
  const budget = parseWholeNumber(draft.totalBudget);
  const topPayout = ladder.at(-1)?.payout ?? 0;

  function updateMilestone(key: number, field: 'views' | 'payout', value: string) {
    setDraft((d) => ({ ...d, milestones: d.milestones.map((m) => (m.key === key ? { ...m, [field]: value } : m)) }));
  }

  function addMilestone() {
    const key = nextKey.current++;
    setDraft((d) => ({ ...d, milestones: [...d.milestones, { key, views: '', payout: '' }] }));
  }

  function removeMilestone(key: number) {
    setDraft((d) => ({ ...d, milestones: d.milestones.filter((m) => m.key !== key) }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const { input } = validateCampaignDraft(draft);
    setAttempted(true);
    setServerError(undefined);
    if (!input) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    setSubmitting(true);
    try {
      const campaign = await campaignApi.create(input);
      toast.success('Campaign is live');
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      // Server-side rule violations (e.g. budget below first payout) come back as 400s.
      if (err instanceof ApiError && err.status === 400) setServerError(err.message);
      toast.error(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Campaign details" />
          <div className="space-y-5 p-5">
            <Field
              label="Campaign name"
              placeholder="e.g. Diwali sneaker drop"
              value={draft.name}
              maxLength={120}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              error={errors.name}
            />
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-zinc-800">Platform</legend>
              <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                {PLATFORMS.map(({ value, label, icon: Icon }) => (
                  <label
                    key={value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500',
                      draft.platform === value
                        ? 'border-violet-500 bg-violet-50/60 text-zinc-900'
                        : 'border-zinc-200 text-zinc-700 hover:border-zinc-300',
                    )}
                  >
                    <input
                      type="radio"
                      name="platform"
                      className="sr-only"
                      checked={draft.platform === value}
                      onChange={() => setDraft({ ...draft, platform: value })}
                    />
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </label>
                ))}
              </div>
              {errors.platform && <p className="mt-1.5 text-sm text-red-600">{errors.platform}</p>}
            </fieldset>
            <Field
              label="Total budget"
              prefix="₹"
              inputMode="numeric"
              placeholder="50000"
              value={draft.totalBudget}
              onChange={(e) => setDraft({ ...draft, totalBudget: e.target.value })}
              error={errors.totalBudget}
              hint="Whole rupees. Payouts stop once this is used up."
              className="sm:max-w-sm"
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Milestone ladder"
            description="A post earns the payout of the highest milestone it reaches. Amounts are not added together."
          />
          <div className="p-5">
            <div className="hidden grid-cols-[1fr_1fr_40px] gap-3 pb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 sm:grid">
              <span>Views reached</span>
              <span>Payout</span>
            </div>
            <ul className="space-y-3">
              {draft.milestones.map((m, index) => {
                const rowErrors = errors.rows[m.key];
                return (
                  <li key={m.key} className="grid grid-cols-[1fr_1fr_40px] items-start gap-3">
                    <div>
                      <label className="sr-only" htmlFor={`views-${m.key}`}>
                        Milestone {index + 1} views
                      </label>
                      <input
                        id={`views-${m.key}`}
                        inputMode="numeric"
                        placeholder="Views"
                        value={m.views}
                        onChange={(e) => updateMilestone(m.key, 'views', e.target.value)}
                        aria-invalid={rowErrors?.views ? true : undefined}
                        className={inputClasses}
                      />
                      {rowErrors?.views && <p className="mt-1 text-xs text-red-600">{rowErrors.views}</p>}
                    </div>
                    <div>
                      <label className="sr-only" htmlFor={`payout-${m.key}`}>
                        Milestone {index + 1} payout in rupees
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500">
                          ₹
                        </span>
                        <input
                          id={`payout-${m.key}`}
                          inputMode="numeric"
                          placeholder="Payout"
                          value={m.payout}
                          onChange={(e) => updateMilestone(m.key, 'payout', e.target.value)}
                          aria-invalid={rowErrors?.payout ? true : undefined}
                          className={cn(inputClasses, 'pl-7')}
                        />
                      </div>
                      {rowErrors?.payout && <p className="mt-1 text-xs text-red-600">{rowErrors.payout}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMilestone(m.key)}
                      disabled={draft.milestones.length === 1}
                      className="flex size-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:pointer-events-none disabled:opacity-30"
                      aria-label={`Remove milestone ${index + 1}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            {(errors.milestones ?? serverError) && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {errors.milestones ?? serverError}
              </p>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={addMilestone}
              disabled={draft.milestones.length >= MAX_MILESTONES}
              icon={<Plus className="size-4" aria-hidden />}
            >
              Add milestone
            </Button>
          </div>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-10 lg:self-start">
        <Card>
          <CardHeader title="Preview" description="How creators will see the ladder." />
          <div className="space-y-4 p-5">
            {ladder.length > 0 ? (
              <MilestoneLadder milestones={ladder} />
            ) : (
              <p className="text-sm text-zinc-500">Add a milestone to see the ladder.</p>
            )}
            <dl className="space-y-2 border-t border-zinc-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Max payout per post</dt>
                <dd className="font-medium text-zinc-900 tabular-nums">{formatInr(topPayout)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Total budget</dt>
                <dd className="font-medium text-zinc-900 tabular-nums">{budget ? formatInr(budget) : '—'}</dd>
              </div>
              {budget && topPayout > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Posts fully funded at top milestone</dt>
                  <dd className="font-medium text-zinc-900 tabular-nums">
                    {formatViews(Math.floor(budget / topPayout))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </Card>
        <Button type="submit" className="w-full" loading={submitting}>
          Launch campaign
        </Button>
      </aside>
    </form>
  );
}
