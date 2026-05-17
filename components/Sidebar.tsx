'use client';

// Brutalist sidebar. Day-5b: active state drops the absolute amber left
// bar in favour of a stone-900 fill + amber text + amber `→` pointer.
// Section dividers between header/nav/footer use explicit <hr> elements
// rather than border-b shorthand so they read as intentional rules.

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
  { id: 'skills', label: 'Skills', href: '/skills', icon: Database },
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
      className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col bg-stone-950"
    >
      <div className="px-6 pt-8 pb-6">
        <div className="text-3xl text-stone-50 font-sans font-bold uppercase tracking-[-0.04em] leading-none">
          Throughline
        </div>
        <div className="mt-3 flex items-center gap-2 label-mono text-amber-200/80">
          <span aria-hidden>█</span>
          <span>v0.5 / live</span>
        </div>
      </div>
      <hr aria-hidden className="border-0 h-px bg-stone-800" />
      <nav className="flex-1 px-0 py-6 flex flex-col">
        {NAV_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <div key={item.id}>
              {idx > 0 && <hr aria-hidden className="border-0 h-px bg-stone-900" />}
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'group flex items-center gap-3 px-6 py-3 font-mono text-xs uppercase tracking-[0.14em]',
                  'transition-colors duration-100',
                  'focus-visible:outline-none focus-visible:bg-stone-900',
                  active
                    ? 'bg-stone-900 text-amber-200'
                    : 'text-stone-500 hover:text-stone-100 hover:bg-stone-900/40',
                ].join(' ')}
              >
                <Icon size={13} strokeWidth={1.75} aria-hidden />
                <span>{item.label}</span>
                {active && (
                  <span aria-hidden className="ml-auto text-amber-200/80">
                    →
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>
      <hr aria-hidden className="border-0 h-px bg-stone-800" />
      <div className="px-6 py-5 space-y-1">
        <div className="label-mono text-stone-600">[ daily rule ]</div>
        <div className="font-mono text-[11px] text-stone-500 leading-snug">
          ◆ Two hours, applications only.
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
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-stone-950 pb-[env(safe-area-inset-bottom)]"
    >
      <hr aria-hidden className="border-0 h-[2px] bg-stone-800" />
      <div className="grid grid-cols-7">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors focus-visible:outline-none ${
                active ? 'bg-stone-900 text-amber-200' : 'text-stone-500'
              }`}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden />
              <span className="font-mono text-[9px] uppercase tracking-[0.1em]">
                {item.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
