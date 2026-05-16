'use client';

// Dashboard. Day 4 reshuffles the stat hierarchy (Interviews + Response %
// get prominence; Applied + In flight render quieter), keys the recent-
// application rows with a coloured left bar per status, separates the
// follow-up card with an urgent tone, and trims the didactic "compound
// effect" trio that read as chrome rather than UI.

import Link from 'next/link';
import { ArrowUpRight, ChevronRight, Clock, Sparkles } from 'lucide-react';
import { Card, Pill, SectionLabel, Stat } from '@/components';
import { useApplications } from '@/lib/queries/useApplications';
import { useDiscovery } from '@/lib/queries/useDiscovery';
import { useSkills } from '@/lib/queries/useSkills';
import type { ApplicationStatus } from '@/contracts/models';
import { STATUS_TONES, statusLabel } from '../_lib/status';

const STATUS_BAR_COLOR: Record<ApplicationStatus, string> = {
  researching: 'bg-stone-600/70',
  applied: 'bg-amber-200/70',
  screen: 'bg-amber-300/70',
  interview: 'bg-emerald-300/80',
  offer: 'bg-emerald-200',
  rejected: 'bg-stone-700/60',
  withdrawn: 'bg-stone-700/60',
};

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
    .filter(
      (j) => j.status === 'new' && typeof j.alignmentScore === 'number' && j.alignmentScore >= 80,
    )
    .sort((a, b) => (b.alignmentScore ?? 0) - (a.alignmentScore ?? 0))
    .slice(0, 3);

  const greeting = skillsDB?.fullName
    ? `Hello, ${skillsDB.fullName.split(' ')[0]}.`
    : 'Set up your dossier.';

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <div className="caption-label text-stone-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </div>
        <h1 className="text-5xl md:text-6xl text-stone-50 font-display tracking-tight leading-[1.05]">
          {greeting}
        </h1>
        {skillsDB?.positioning && (
          <p className="text-stone-400 italic max-w-2xl text-base leading-relaxed pt-1">
            {skillsDB.positioning}
          </p>
        )}
      </header>

      {!setupComplete && (
        <Card accent="amber" tone="urgent" className="pl-7 pr-6 py-5">
          <div className="flex items-start gap-4">
            <Sparkles size={18} className="text-amber-200 mt-1 shrink-0" aria-hidden />
            <div className="flex-1">
              <div className="text-stone-50 font-display text-lg mb-1.5">
                Get the system running
              </div>
              <p className="text-sm text-stone-400 mb-4 max-w-2xl">
                The whole thing leans on your skills database. Spend 30 minutes loading it
                once; every application after that takes minutes instead of hours.
              </p>
              <Link
                href="/skills"
                className="inline-flex items-center gap-2 bg-gradient-to-b from-amber-100 to-amber-200 text-stone-950 hover:from-amber-50 hover:to-amber-100 transition-all text-sm px-4 py-2 rounded-md font-medium hover:-translate-y-px"
              >
                Build Skills DB <ChevronRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Stat row — Interviews + Response% read as primary; Applied + In flight
          recede so the grid has weight variation instead of four equal tiles. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Applied" value={total} sub="total submissions" prominence="quiet" />
        <Stat label="In flight" value={inFlight} sub="awaiting next move" prominence="quiet" />
        <Stat
          label="Interviews"
          value={interviews}
          sub="active conversations"
          prominence="primary"
        />
        <Stat
          label="Response %"
          value={`${responseRate}%`}
          sub="any response"
          prominence="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 px-7 py-6">
          <SectionLabel
            right={
              <Link
                href="/tracker"
                className="caption-label text-amber-200/80 hover:text-amber-200 inline-flex items-center gap-1.5 transition-colors"
              >
                View all <ArrowUpRight size={11} aria-hidden />
              </Link>
            }
          >
            Recent applications
          </SectionLabel>
          {recent.length === 0 ? (
            <p className="text-stone-500 italic text-sm py-8">
              Nothing in flight yet. The two-hour rule starts here.
            </p>
          ) : (
            <ul className="space-y-1">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link
                    href="/tracker"
                    className="relative flex items-center gap-4 py-3 pl-4 pr-2 rounded-md hover:bg-stone-100/[0.02] transition-colors focus-visible:outline-none focus-visible:bg-stone-100/[0.03]"
                  >
                    <span
                      aria-hidden
                      className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${STATUS_BAR_COLOR[a.status]}`}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-stone-100 truncate">
                        {a.role || 'Untitled role'}
                      </span>
                      <span className="block caption-label text-stone-500 truncate mt-1">
                        {a.company || 'Unknown company'}
                      </span>
                    </span>
                    {typeof a.alignmentScore === 'number' && (
                      <span className="tab-nums text-sm text-amber-200 w-12 text-right">
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

        <Card
          accent={followUps.length > 0 ? 'rose' : 'none'}
          tone={followUps.length > 0 ? 'urgent' : 'default'}
          className="px-6 py-6"
        >
          <SectionLabel>Today</SectionLabel>
          {followUps.length === 0 ? (
            <p className="text-stone-500 italic text-sm py-4">
              Inbox zero on follow-ups today.
            </p>
          ) : (
            <ul className="space-y-3">
              {followUps.map((a) => (
                <li key={a.id}>
                  <Link
                    href="/tracker"
                    className="flex items-start gap-3 text-sm hover:text-amber-200 transition-colors"
                  >
                    <Clock size={14} className="text-rose-300 mt-0.5 shrink-0" aria-hidden />
                    <span>
                      <span className="block text-stone-100">{a.company}</span>
                      <span className="block caption-label text-stone-500 mt-1">
                        Follow up &middot; {a.role}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="px-7 py-6">
        <SectionLabel
          right={
            <Link
              href="/discovery"
              className="caption-label text-amber-200/80 hover:text-amber-200 inline-flex items-center gap-1.5 transition-colors"
            >
              All discoveries <ArrowUpRight size={11} aria-hidden />
            </Link>
          }
        >
          High-fit discoveries
        </SectionLabel>
        {topDiscovery.length === 0 ? (
          <p className="text-stone-500 italic text-sm py-6">
            Quiet queue. Add a watchlist company and the poller catches up overnight.
          </p>
        ) : (
          <ul className="space-y-1">
            {topDiscovery.map((j) => (
              <li key={j.id}>
                <Link
                  href="/discovery"
                  className="flex items-center gap-4 py-3 pl-4 pr-2 rounded-md hover:bg-stone-100/[0.02] transition-colors"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-stone-100 truncate">{j.role}</span>
                    <span className="block caption-label text-stone-500 truncate mt-1">
                      {j.company} &middot; {j.location}
                    </span>
                  </span>
                  <span className="tab-nums text-sm text-amber-200 w-12 text-right">
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
