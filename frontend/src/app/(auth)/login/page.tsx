'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { useFormErrors } from '@/features/auth/useFormErrors';
import { errorMessage } from '@/lib/api';

const FIELDS = ['email', 'password'] as const;

/** Only follow same-site relative redirects, never e.g. "//evil.com". */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errors, setErrors, fromApiError } = useFormErrors<(typeof FIELDS)[number]>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const clientErrors: typeof errors = {};
    if (!email.trim()) clientErrors.email = 'Enter your email';
    if (!password) clientErrors.password = 'Enter your password';
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      // AuthLayout redirects once the session is set.
    } catch (err) {
      if (!fromApiError(err, FIELDS)) toast.error(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      <Button type="submit" className="w-full" loading={submitting}>
        Log in
      </Button>
    </form>
  );
}

function LoginPageContent() {
  const next = safeNext(useSearchParams().get('next'));
  return (
    <AuthLayout
      redirectTo={next}
      title="Log in"
      subtitle="Track campaign budgets and creator payouts."
      footer={
        <>
          New to Meme&apos;d?{' '}
          <Link href="/signup" className="font-medium text-violet-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}

// useSearchParams() needs a Suspense boundary so the page can still be prerendered.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
