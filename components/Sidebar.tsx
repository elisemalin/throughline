'use client';

// Day 4: sidebar active state moves from "stone-900 fill + amber text"
// (generic shadcn nav menu) to a 2px amber bar on the left edge of the
// row with the label widening its tracking slightly. Vertical breathing
// increased. Footer carries a quiet mood line as a daily nudge.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Compass,
  Database,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'skills', label: 'Skills DB', href: '/skills', icon: Database },
  { id: 'discovery', label: 'Discovery', href: '/discovery', icon: Compass },
  { id: 'tracker', label: 'Tracker', href: '/tracker', icon: Briefcase },
  { id: 'documents', label: 'Documents', href: '/documents', icon: FileText },
  { id: 'interviews', label: 'Interviews', href: '/interviews', icon: MessageSquare },
  { id: 'settings', label: 'Settings', href: '/settings', icon: SettingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname() ?? '';
  return (
    <aside
      aria-label="Primary"
      className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-stone-100/5 bg-stone-950/40 backdrop-blur-sm"
    >
      <div className="px-6 pt-8 pb-7 border-b border-stone-100/5 relative">
        <div className="text-3xl text-amber-200 leading-none font-wordmark">
          Throughline
        </div>
        <div className="mt-3 h-px w-12 bg-gradient-to-r from-amber-200/70 to-transparent" aria-hidden />
        <div className="caption-label text-stone-500 mt-3">Job Search OS</div>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'group relative flex items-center gap-3 px-4 py-2.5 rounded-md text-sm',
                'transition-[color,letter-spacing,background-color] duration-150',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-200/40',
                active
                  ? 'text-amber-200 tracking-[0.02em]'
                  : 'text-stone-400 hover:text-stone-100 hover:tracking-[0.015em] hover:bg-stone-100/[0.02]',
              ].join(' ')}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-amber-200"
                />
              )}
              <Icon size={15} strokeWidth={1.5} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-5 border-t border-stone-100/5 space-y-2">
        <div className="caption-label text-stone-600">Two hours, applications only</div>
        <div className="text-xs italic text-stone-600/80">
          The first two hours of the day are submissions, not research.
        </div>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav
      aria-label="Primary mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-stone-100/5 bg-stone-950/90 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-7">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center py-3 gap-1 transition-colors focus-visible:outline-none focus-visible:text-amber-200 ${
                active ? 'text-amber-200' : 'text-stone-500'
              }`}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 bg-amber-200 rounded-full"
                />
              )}
              <Icon size={16} strokeWidth={1.5} aria-hidden />
              <span className="caption-label text-[8px] tracking-[0.15em]">
                {item.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
