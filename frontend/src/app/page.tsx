'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, Megaphone, ShieldCheck, Wallet } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';

const FEATURES = [
  {
    icon: Megaphone,
    title: 'Milestone ladders',
    body: 'Brands set view thresholds and payouts. Creators earn the highest milestone their post reaches.',
  },
  {
    icon: ShieldCheck,
    title: 'Budgets that hold',
    body: 'Payouts are checked atomically, so a campaign can never pay out more than its budget.',
  },
  {
    icon: Wallet,
    title: 'Clear earnings',
    body: 'Creators see every post, its views, and exactly what it has earned.',
  },
];

export default function HomePage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost">
            Log in
          </ButtonLink>
          <ButtonLink href="/signup">Sign up</ButtonLink>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-violet-700">Creator campaign payouts</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Pay creators for the views they actually deliver.
          </h1>
          <p className="mt-5 text-lg text-zinc-600">
            Brands launch Instagram and YouTube campaigns with a milestone ladder. Creators submit posts and get paid as
            views grow, always within the campaign budget.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup" icon={<ArrowRight className="size-4" aria-hidden />}>
              Get started
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              I have an account
            </ButtonLink>
          </div>
        </div>
        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-zinc-200 p-5">
              <Icon className="size-5 text-violet-700" aria-hidden />
              <h2 className="mt-3 text-sm font-semibold text-zinc-900">{title}</h2>
              <p className="mt-1 text-sm text-zinc-600">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
