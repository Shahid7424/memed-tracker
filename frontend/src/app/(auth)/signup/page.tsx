'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Megaphone, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { useFormErrors } from '@/features/auth/useFormErrors';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Role } from '@/types/api';

const FIELDS = ['name', 'email', 'password', 'role'] as const;

const ROLE_OPTIONS: { value: Role; title: string; description: string; icon: typeof Megaphone }[] = [
  { value: 'brand', title: 'Brand', description: 'Run campaigns and fund creator payouts', icon: Megaphone },
  { value: 'creator', title: 'Creator', description: 'Post for campaigns and earn per milestone', icon: Sparkles },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [role, setRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { errors, setErrors, fromApiError } = useFormErrors<(typeof FIELDS)[number]>();

  function validate(): typeof errors {
    const e: typeof errors = {};
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))
      e.password = 'Use at least one letter and one number';
    if (!role) e.role = "Choose how you will use Meme'd";
    return e;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const clientErrors = validate();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length || !role) return;

    setSubmitting(true);
    try {
      await signup({ ...form, role });
      toast.success('Account created');
      // AuthLayout redirects to the dashboard once the session is set.
    } catch (err) {
      if (!fromApiError(err, FIELDS)) toast.error(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Pick a role. You can't switch it later."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-violet-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-zinc-800">I am a</legend>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-invalid={errors.role ? true : undefined}>
            {ROLE_OPTIONS.map(({ value, title, description, icon: Icon }) => (
              <label
                key={value}
                className={cn(
                  'cursor-pointer rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500',
                  role === value ? 'border-violet-500 bg-violet-50/60' : 'border-zinc-200 hover:border-zinc-300',
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="sr-only"
                />
                <Icon className={cn('size-5', role === value ? 'text-violet-700' : 'text-zinc-500')} aria-hidden />
                <span className="mt-2 block text-sm font-semibold text-zinc-900">{title}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{description}</span>
              </label>
            ))}
          </div>
          {errors.role && <p className="mt-1.5 text-sm text-red-600">{errors.role}</p>}
        </fieldset>
        <Field
          label="Name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
