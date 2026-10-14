import { CirclePlay, Camera } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { CampaignStatus, PayoutStatus, Platform } from '@/types/api';

type Tone = 'green' | 'amber' | 'red' | 'zinc' | 'violet';

const tones: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  zinc: 'bg-zinc-100 text-zinc-700 ring-zinc-500/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export function Badge({
  tone = 'zinc',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return status === 'live' ? (
    <Badge tone="green">
      <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
      Live
    </Badge>
  ) : (
    <Badge tone="red">Budget exhausted</Badge>
  );
}

const PAYOUT_LABEL: Record<PayoutStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Below first milestone', tone: 'zinc' },
  paid: { label: 'Paid', tone: 'green' },
  budget_blocked: { label: 'Blocked: budget', tone: 'amber' },
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const { label, tone } = PAYOUT_LABEL[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export const PLATFORM_LABEL: Record<Platform, string> = { instagram: 'Instagram', youtube: 'YouTube' };

export function PlatformBadge({ platform }: { platform: Platform }) {
  const Icon = platform === 'instagram' ? Camera : CirclePlay;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-zinc-600">
      <Icon className={cn('size-4', platform === 'instagram' ? 'text-pink-600' : 'text-red-600')} aria-hidden />
      {PLATFORM_LABEL[platform]}
    </span>
  );
}
