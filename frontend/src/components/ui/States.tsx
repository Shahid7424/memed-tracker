import { RefreshCw, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '@/lib/api';
import { Button } from './Button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-zinc-100">
        <Icon className="size-5 text-zinc-500" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-xl border border-red-100 bg-red-50/50 px-6 py-12 text-center"
    >
      <TriangleAlert className="size-6 text-red-500" aria-hidden />
      <h3 className="mt-3 text-sm font-semibold text-zinc-900">Couldn&apos;t load this</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-600">{errorMessage(error)}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onRetry}
          icon={<RefreshCw className="size-4" aria-hidden />}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
