'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Compass, LayoutDashboard, LogOut, Megaphone, Menu, Plus, Wallet, X, type LucideIcon } from 'lucide-react';
import { useCurrentUser, useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/cn';
import type { Role } from '@/types/api';
import { Logo } from './Logo';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Record<Role, NavItem[]> = {
  brand: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/campaigns', label: 'My campaigns', icon: Megaphone },
    { href: '/campaigns/new', label: 'New campaign', icon: Plus },
  ],
  creator: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/campaigns', label: 'Browse campaigns', icon: Compass },
    { href: '/earnings', label: 'My earnings', icon: Wallet },
  ],
};

function isActive(pathname: string, href: string): boolean {
  if (href === '/campaigns') return pathname === '/campaigns' || /^\/campaigns\/(?!new)/.test(pathname);
  return pathname === href;
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                active ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserCard() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  return (
    <div className="flex items-center gap-3 border-t border-zinc-200 p-4">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700"
        aria-hidden
      >
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
        <p className="truncate text-xs capitalize text-zinc-500">{user.role} account</p>
      </div>
      <button
        type="button"
        onClick={logout}
        className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        aria-label="Log out"
        title="Log out"
      >
        <LogOut className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** One shell for both roles; only the navigation items differ. */
export function AppShell({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV[user.role];

  useEffect(() => setMobileOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo href="/dashboard" />
      </div>
      <nav aria-label="Main" className="flex-1 px-3 py-2">
        <NavLinks items={items} pathname={pathname} />
      </nav>
      <UserCard />
    </div>
  );

  return (
    <div className="min-h-dvh bg-zinc-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white lg:block">{sidebar}</aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
        <Logo href="/dashboard" />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-zinc-900/30" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-md p-2 text-zinc-500 hover:bg-zinc-100"
              aria-label="Close menu"
            >
              <X className="size-5" aria-hidden />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
