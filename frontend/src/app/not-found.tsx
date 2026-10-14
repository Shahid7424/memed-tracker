import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-violet-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Page not found</h1>
      <p className="mt-2 text-sm text-zinc-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      <ButtonLink href="/" variant="secondary" className="mt-6">
        Go home
      </ButtonLink>
    </div>
  );
}
