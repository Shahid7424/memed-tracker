import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">{label}</p>
        <Icon className="size-4 shrink-0 text-zinc-400" aria-hidden />
      </div>
      <p className="mt-2 truncate text-xl font-semibold tracking-tight text-zinc-900 tabular-nums sm:text-2xl">
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-xs text-zinc-500">{hint}</p>}
    </Card>
  );
}
