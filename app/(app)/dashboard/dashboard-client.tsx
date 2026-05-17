'use client';

// Brutalist dashboard. Asymmetric block layout, huge tabular numerals,
// bracketed mono captions, status-coloured 3px left bars on recent-app
// rows, arctic-blue accent on the discovery rail.

import Link from 'next/link';
import { Clock, Sparkles } from 'lucide-react';
import { Card, Ornament, Pill, RouteHeader, Rule, SectionLabel, Stat } from '@/components';
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
    .filter(
      (j) => j.status === 'new' && typeof j.alignmentScore === 'number' && j.alignmentScore >= 80,
    )
    .sort((a, b) => (b.alignmentScore ?? 0) - (a.alignmentScore ?? 0))
    .slice(0, 3);

  const firstName = skillsDB?.fullName?.split(' ')[0];
  const title = firstName ? `Hello, ${firstName}.` : 'Set up your dossier.';
  const todayStr = new Date()
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();

  return (
    <div className="space-y-16">
      <RouteHeader
        section="§01"
        name="DASHBOARD"
        title={title}
        sub={
          skillsDB?.positioning ?? `${todayStr}. Two hours, applications only.`
        }
        right={
          <div className="hidden md:block label-mono text-stone-500">
            <span aria-hidden className="text-stone-700">[ </span>
            <span className="text-arctic-200">{todayStr}</span>
            <span aria-hidden className="text-stone-700"> ]</span>
          </div>
        }
      />

      {!setupComplete && (
        <Card tone="accent" className="px-7 py-6">
          <div className="flex items-start gap-4">
            <Sparkles size={18} className="text-amber-200 mt-1 shrink-0" aria-hidden />
            <div className="flex-1 space-y-3">
              <div className="label-mono text-amber-200">[ setup required ]</div>
              <p className="font-sans text-lg text-stone-50 max-w-xl">
                The system runs on your Skills DB. Build it once; every application after
                that takes minutes.
              </p>
              <Link
                href="/skills"
                className="inline-flex items-center gap-2 bg-amber-200 text-stone-950 hover:bg-amber-100 transition-colors text-xs px-4 py-2 font-medium uppercase tracking-[0.08em] active:translate-y-px"
              >
                Build Skills DB <Ornament kind="arrow" />
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Applied" value={total} sub="total" />
        <Stat label="In flight" value={inFlight} sub="awaiting" />
        <Stat label="Interviews" value={interviews} sub="active" prominence="primary" />
        <Stat
          label="Response %"
          value={`${responseRate}%`}
          sub="any reply"
          prominence="primary"
        />
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 px-7 py-7">
          <SectionLabel
            right={
              <Link
                href="/tracker"
                className="label-mono text-amber-200 hover:text-amber-100 inline-flex items-center gap-1.5"
              >
                View all <Ornament kind="arrow" />
              </Link>
            }
          >
            Recent applications
          </SectionLabel>
          {recent.length === 0 ? (
            <p className="font-mono text-xs text-stone-500 py-8 leading-relaxed">
              [ NOTHING IN FLIGHT // THE TWO-HOUR RULE STARTS HERE ]
            </p>
          ) : (
            <ul>
              {recent.map((a, idx) => (
                <li key={a.id}>
                  {idx > 0 && <Rule />}
                  <Link
                    href="/tracker"
                    className="flex items-center gap-4 py-4 px-2 hover:bg-stone-900/60 transition-colors focus-visible:outline-none focus-visible:bg-stone-900"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-stone-100 truncate">
                        {a.role || 'Untitled role'}
                      </span>
                      <span className="block label-mono text-stone-500 truncate mt-1">
                        {a.company || 'Unknown company'}
                      </span>
                    </span>
                    {typeof a.alignmentScore === 'number' && (
                      <span className="tab-nums font-sans text-xl text-amber-200 w-12 text-right">
                        {a.alignmentScore}
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
          tone={followUps.length > 0 ? 'urgent' : 'default'}
          className="px-6 py-7"
        >
          <SectionLabel ornament="●">Today</SectionLabel>
          {followUps.length === 0 ? (
            <p className="font-mono text-xs text-stone-500 py-4 leading-relaxed">
              [ INBOX ZERO ]
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
                      <span className="block label-mono text-stone-500 mt-1">
                        Follow up &middot; {a.role}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card tone="arctic" className="px-7 py-7">
        <SectionLabel
          ornament="↗"
          right={
            <Link
              href="/discovery"
              className="label-mono text-arctic-200 hover:text-arctic-400 inline-flex items-center gap-1.5"
            >
              All discoveries <Ornament kind="arrow" />
            </Link>
          }
        >
          High-fit discoveries
        </SectionLabel>
        {topDiscovery.length === 0 ? (
          <p className="font-mono text-xs text-stone-500 py-6 leading-relaxed">
            [ QUIET QUEUE // ADD A COMPANY IN /DISCOVERY ]
          </p>
        ) : (
          <ul>
            {topDiscovery.map((j, idx) => (
              <li key={j.id}>
                {idx > 0 && <Rule />}
                <Link
                  href="/discovery"
                  className="flex items-center gap-4 py-4 pl-5 pr-2 hover:bg-stone-900/60 transition-colors"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-stone-100 truncate">{j.role}</span>
                    <span className="block label-mono text-stone-500 truncate mt-1">
                      {j.company} &middot; {j.location}
                    </span>
                  </span>
                  <span className="tab-nums font-sans text-2xl text-arctic-200 w-14 text-right">
                    {j.alignmentScore}
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
