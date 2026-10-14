'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';
import { useAuth } from './AuthProvider';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  /** Where to send the user once they are logged in. */
  redirectTo?: string;
}

/** Centered card for login/signup. Sends logged-in users on to `redirectTo`. */
export function AuthLayout({ title, subtitle, children, footer, redirectTo = '/dashboard' }: AuthLayoutProps) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace(redirectTo);
  }, [status, router, redirectTo]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-sm text-zinc-600">{footer}</p>
    </div>
  );
}
