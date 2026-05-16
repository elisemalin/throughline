'use client';

// 7-tab navigation. Desktop sidebar + mobile bottom bar in one component.
// Lifted from prototype/Throughline.jsx lines 870-950. Uses Next's Link so
// transitions are client-side and prefetch happens automatically.

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
      className="hidden md:flex md:w-56 lg:w-64 shrink-0 border-r border-stone-900 bg-stone-950/60 flex-col"
    >
      <div className="px-5 py-6 border-b border-stone-900/60 relative">
        <div className="text-3xl text-amber-200 leading-none font-wordmark">
          Throughline
        </div>
        <div className="mt-2 h-px w-10 bg-amber-200/40" aria-hidden />
        <div className="text-[10px] uppercase tracking-[0.24em] text-stone-500 font-mono mt-2">
          Job Search OS
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60 ${
                active
                  ? 'bg-stone-900 text-amber-200'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900/50'
              }`}
            >
              <Icon size={15} strokeWidth={1.5} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-stone-900 text-[10px] uppercase tracking-[0.2em] text-stone-600 font-mono">
        v0.1 · prototype
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav
      aria-label="Primary mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-stone-900 bg-stone-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
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
              className={`flex flex-col items-center justify-center py-2.5 gap-1 focus-visible:outline-none focus-visible:text-amber-200 ${
                active ? 'text-amber-200' : 'text-stone-500'
              }`}
            >
              <Icon size={16} strokeWidth={1.5} aria-hidden />
              <span className="text-[9px] uppercase tracking-tight font-mono">
                {item.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
