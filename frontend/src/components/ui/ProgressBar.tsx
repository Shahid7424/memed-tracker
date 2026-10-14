import { cn } from '@/lib/cn';

/** Budget utilisation bar. `value` is 0–100. */
export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  const tone = clamped >= 90 ? 'bg-red-500' : clamped >= 70 ? 'bg-amber-500' : 'bg-violet-600';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-zinc-100', className)}
    >
      <div className={cn('h-full rounded-full transition-[width]', tone)} style={{ width: `${clamped}%` }} />
    </div>
  );
}
