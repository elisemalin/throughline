// Brutalist route header — section number + giant uppercase title in
// Space Grotesk + Space Mono subhead with arrow ornament. Pulls the
// per-route opening into one shared shape so changes propagate without
// touching seven files.

import type { ReactNode } from 'react';
import { Rule } from './Rule';

export type RouteHeaderProps = {
  section: string;   // e.g. "§02"
  name: string;      // e.g. "TRACKER"
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
};

export function RouteHeader({ section, name, title, sub, right }: RouteHeaderProps) {
  return (
    <header className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="label-mono flex items-center gap-2 text-stone-500">
          <span aria-hidden className="text-stone-700">[</span>
          <span className="text-amber-200/80">{section}</span>
          <span aria-hidden>/</span>
          <span>{name}</span>
          <span aria-hidden className="text-stone-700">]</span>
        </div>
        {right}
      </div>
      <h1 className="display-xl text-stone-50">{title}</h1>
      {sub && (
        <p className="font-mono text-sm text-stone-400 flex items-start gap-2 max-w-2xl">
          <span aria-hidden className="text-arctic-400 mt-0.5">↗</span>
          <span className="leading-snug">{sub}</span>
        </p>
      )}
      <Rule weight="heavy" tone="stone" />
    </header>
  );
}
