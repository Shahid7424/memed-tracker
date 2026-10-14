import Link from 'next/link';

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">
        M
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
        Meme&apos;d <span className="font-normal text-zinc-500">Payouts</span>
      </span>
    </Link>
  );
}
