'use client';

// Ported from prototype/Throughline.jsx Dashboard (lines 957-1180).
// Data flows: applications + skills via TanStack Query against mock-api.

import Link from 'next/link';
import { ArrowUpRight, ChevronRight, Clock, Sparkles } from 'lucide-react';
import { Card, Pill, SectionLabel, Stat } from '@/components';
import { useApplications } from '@/lib/queries/useApplications';
import { useDiscovery } from '@/lib/queries/useDiscovery';
import { useSkills } from '@/lib/queries/useSkills';
import { STATUS_TONES, statusLabel } from '../_lib/status';

export function DashboardClient() {
  const { data: applicationsData } = useApplications();
  const { data: skillsData } = useSkills();
  const { data: discoveryData } = useDiscovery();

  const applications = applicationsData?.applications ?? [];
  const skillsDB = skillsData?.skillsDB ?? null;
  const discovery = discoveryData?.postings ?? [];

  const total = applications.length;
  const inFlight = applications.filter((a) =>
    ['applied', 'screen', 'interview'].includes(a.status),
  ).length;
  const interviews = applications.filter((a) => a.status === 'interview').length;
  const responseRate = total
    ? Math.round(
        (applications.filter((a) => !['researching', 'applied'].includes(a.status)).length /
          total) *
          100,
      )
    : 0;

  const today = new Date().toISOString().slice(0, 10);
  const followUps = applications.filter((a) => a.followUpDate && a.followUpDate <= today);
  const recent = [...applications]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 5);

  const setupComplete = Boolean(skillsDB?.fullName) && (skillsDB?.jobs.length ?? 0) > 0;
  const topDiscovery = discovery
    .filter((j) => j.status === 'new' && typeof j.alignmentScore === 'number' && j.alignmentScore >= 80)
    .sort((a, b) => (b.alignmentScore ?? 0) - (a.alignmentScore ?? 0))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <h1 className="text-4xl md:text-5xl text-stone-100 font-display">
            {skillsDB?.fullName
              ? `Hello, ${skillsDB.fullName.split(' ')[0]}`
              : 'Set up your dossier'}
          </h1>
          {skillsDB?.positioning && (
            <p className="text-stone-400 mt-2 italic max-w-2xl text-sm md:text-base">
              {skillsDB.positioning}
            </p>
          )}
        </div>
      </header>

      {!setupComplete && (
        <Card className="p-5 border-amber-900/60 bg-amber-950/10">
          <div className="flex items-start gap-3">
            <Sparkles size={16} className="text-amber-200 mt-0.5 shrink-0" aria-hidden />
            <div className="flex-1">
              <div className="text-stone-100 font-medium mb-1">Get the system running</div>
              <p className="text-sm text-stone-400 mb-3">
                The whole thing leans on your skills database. Spend 30 minutes loading it once;
                every application after that takes minutes instead of hours.
              </p>
              <Link
                href="/skills"
                className="inline-flex items-center gap-2 bg-amber-200 text-stone-950 hover:bg-amber-100 transition-colors text-xs px-2.5 py-1.5 rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60"
              >
                Build Skills DB <ChevronRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Applied" value={total} sub="total submissions" />
        <Stat label="In flight" value={inFlight} sub="awaiting next move" />
        <Stat label="Interviews" value={interviews} accent sub="active conversations" />
        <Stat label="Response %" value={`${responseRate}%`} sub="any response" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <SectionLabel
            right={
              <Link
                href="/tracker"
                className="text-[10px] uppercase tracking-[0.2em] text-amber-200 hover:text-amber-100 font-mono inline-flex items-center gap-1"
              >
                View all <ArrowUpRight size={11} aria-hidden />
              </Link>
            }
          >
            Recent applications
          </SectionLabel>
          {recent.length === 0 ? (
            <p className="text-stone-600 text-sm py-6 text-center">
              No applications yet. Add one from the Tracker.
            </p>
          ) : (
            <ul className="divide-y divide-stone-900">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link
                    href="/tracker"
                    className="py-3 flex items-center gap-3 hover:bg-stone-900/30 -mx-2 px-2 rounded-sm focus-visible:outline-none focus-visible:bg-stone-900/40"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-stone-100 truncate">
                        {a.role || 'Untitled role'}
                      </span>
                      <span className="block text-xs text-stone-500 font-mono truncate">
                        {a.company || 'Unknown company'}
                      </span>
                    </span>
                    {typeof a.alignmentScore === 'number' && (
                      <span className="text-sm tabular-nums font-mono w-12 text-right text-amber-200">
                        {a.alignmentScore}%
                      </span>
                    )}
                    <Pill tone={STATUS_TONES[a.status]}>{statusLabel(a.status)}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <SectionLabel>Today</SectionLabel>
          {followUps.length === 0 ? (
            <p className="text-stone-600 text-sm py-6">No follow-ups due.</p>
          ) : (
            <ul className="space-y-2.5">
              {followUps.map((a) => (
                <li key={a.id}>
                  <Link
                    href="/tracker"
                    className="flex items-start gap-2.5 text-sm hover:text-amber-200"
                  >
                    <Clock size={13} className="text-amber-200 mt-1 shrink-0" aria-hidden />
                    <span>
                      <span className="block text-stone-200">{a.company}</span>
                      <span className="block text-xs text-stone-500 font-mono">
                        Follow up · {a.role}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <SectionLabel
          right={
            <Link
              href="/discovery"
              className="text-[10px] uppercase tracking-[0.2em] text-amber-200 hover:text-amber-100 font-mono inline-flex items-center gap-1"
            >
              All discoveries <ArrowUpRight size={11} aria-hidden />
            </Link>
          }
        >
          High-fit discoveries
        </SectionLabel>
        {topDiscovery.length === 0 ? (
          <p className="text-stone-600 text-sm py-4 text-center">
            No high-fit postings in the queue right now.
          </p>
        ) : (
          <ul className="divide-y divide-stone-900">
            {topDiscovery.map((j) => (
              <li key={j.id}>
                <Link
                  href="/discovery"
                  className="py-3 flex items-center gap-3 hover:bg-stone-900/30 -mx-2 px-2 rounded-sm"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-stone-100 truncate">{j.role}</span>
                    <span className="block text-xs text-stone-500 font-mono truncate">
                      {j.company} · {j.location}
                    </span>
                  </span>
                  <span className="text-sm tabular-nums font-mono text-amber-200 w-12 text-right">
                    {j.alignmentScore}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
