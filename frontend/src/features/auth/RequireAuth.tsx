'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { LoaderCircle, Lock } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import type { Role } from '@/types/api';
import { useAuth } from './AuthProvider';

/**
 * Client-side guard for a better experience only. The API enforces every
 * permission on its own; hiding a page here is not what keeps data safe.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
        <LoaderCircle className="size-6 animate-spin text-zinc-400" aria-hidden />
      </div>
    );
  }
  return <>{children}</>;
}

/** Shows a friendly message instead of a page meant for the other role. */
export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== role) {
    return (
      <EmptyState
        icon={Lock}
        title={`This page is for ${role} accounts`}
        description={`You're signed in as a ${user?.role ?? 'guest'}. Head back to your dashboard to continue.`}
        action={
          <ButtonLink href="/dashboard" variant="secondary">
            Go to dashboard
          </ButtonLink>
        }
      />
    );
  }
  return <>{children}</>;
}
