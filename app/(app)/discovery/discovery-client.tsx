'use client';

// Ported from prototype/Throughline.jsx DiscoveryView (lines 3358-3860).
// Day 2 surface: dual-tab queue + watchlist, filter by status, draft-to-
// application action wires create + cover-letter generation as a single
// optimistic flow.

import { useState } from 'react';
import { Compass, ExternalLink, Plus, RefreshCw } from 'lucide-react';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  Pill,
} from '@/components';
import type { AtsProvider, DiscoveryStatus } from '@/contracts/models';
import { ATS_PROVIDERS } from '@/contracts/models';
import { useCreateApplication } from '@/lib/queries/useApplications';
import {
  useAddWatchlistCompany,
  useDiscovery,
  usePollDiscovery,
  useRemoveWatchlistCompany,
  useUpdateDiscoveryStatus,
  useWatchlist,
} from '@/lib/queries/useDiscovery';
import { useGenerateCoverLetter } from '@/lib/queries/useDocuments';
import { useToastStore } from '@/stores/useToastStore';

type Tab = 'queue' | 'watchlist';

const STATUS_FILTERS: Array<{ id: DiscoveryStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'viewed', label: 'Viewed' },
  { id: 'drafted', label: 'Drafted' },
  { id: 'dismissed', label: 'Dismissed' },
];

export function DiscoveryClient() {
  const discovery = useDiscovery();
  const watchlist = useWatchlist();
  const poll = usePollDiscovery();
  const updateStatus = useUpdateDiscoveryStatus();
  const addCompany = useAddWatchlistCompany();
  const removeCompany = useRemoveWatchlistCompany();
  const createApplication = useCreateApplication();
  const generateCover = useGenerateCoverLetter();
  const pushToast = useToastStore((s) => s.push);

  const [tab, setTab] = useState<Tab>('queue');
  const [filter, setFilter] = useState<DiscoveryStatus | 'all'>('new');
  const [openAdd, setOpenAdd] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [provider, setProvider] = useState<AtsProvider>('greenhouse');
  const [slug, setSlug] = useState('');

  const postings = discovery.data?.postings ?? [];
  const companies = watchlist.data?.companies ?? [];

  const filteredPostings = postings.filter((p) =>
    filter === 'all' ? true : p.status === filter,
  );

  async function handleDraft(id: string) {
    const posting = postings.find((p) => p.id === id);
    if (!posting) return;
    try {
      const { application } = await createApplication.mutateAsync({
        company: posting.company,
        role: posting.role,
        url: posting.url,
        source: 'discovery',
        location: posting.location,
        remote: posting.remote,
        salaryRange: posting.salaryRange,
        jobDescription: posting.jobDescription,
        status: 'researching',
      });
      await updateStatus.mutateAsync({
        id: posting.id,
        req: { status: 'drafted', applicationId: application.id },
      });
      generateCover
        .mutateAsync({ applicationId: application.id })
        .catch((error: unknown) => {
          pushToast(
            error instanceof Error ? error.message : 'Cover letter generation failed.',
            'error',
          );
        });
      pushToast(`Drafted application for ${posting.company}.`, 'success');
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Draft failed.',
        'error',
      );
    }
  }

  async function handleMark(id: string, next: DiscoveryStatus) {
    if (next === 'drafted') return;
    try {
      await updateStatus.mutateAsync({ id, req: { status: next } });
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Could not update posting.',
        'error',
      );
    }
  }

  async function handlePoll() {
    try {
      const result = await poll.mutateAsync();
      pushToast(
        result.newPostings > 0
          ? `Polled. ${result.newPostings} new postings.`
          : 'Polled. No new postings.',
        'info',
      );
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Poll failed.',
        'error',
      );
    }
  }

  async function handleAddCompany() {
    try {
      const result = await addCompany.mutateAsync({
        company: companyName,
        atsProvider: provider,
        atsSlug: slug,
      });
      if (result.validation.valid) {
        pushToast(`Added ${result.company.company} to watchlist.`, 'success');
        setOpenAdd(false);
        setCompanyName('');
        setSlug('');
      } else {
        pushToast(result.validation.error ?? 'Invalid input.', 'error');
      }
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Could not add company.',
        'error',
      );
    }
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-3">
          <div className="caption-label text-stone-500">Polled overnight</div>
          <h1 className="text-5xl md:text-6xl text-stone-50 font-display tracking-tight leading-[1.05]">
            Discovery
          </h1>
          <p className="text-stone-400 italic max-w-xl text-sm md:text-base leading-relaxed">
            Fresh postings from your watchlist, scored against your Skills DB.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePoll}
            disabled={poll.isPending}
            data-testid="discovery-poll"
          >
            <RefreshCw size={13} aria-hidden /> {poll.isPending ? 'Polling...' : 'Poll now'}
          </Button>
          <Button size="sm" onClick={() => setOpenAdd(true)} data-testid="discovery-add-company">
            <Plus size={14} aria-hidden /> Add company
          </Button>
        </div>
      </header>

      <div className="flex gap-1 border-b border-stone-100/5 pb-1" role="tablist" aria-label="Discovery view">
        {(['queue', 'watchlist'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`relative caption-label px-4 py-2 transition-colors ${
              tab === t ? 'text-amber-200' : 'text-stone-600 hover:text-stone-300'
            }`}
          >
            {t === 'queue' ? 'Queue' : 'Watchlist'}
            {tab === t && (
              <span aria-hidden className="absolute left-4 right-4 -bottom-1 h-[2px] bg-amber-200 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {tab === 'queue' ? (
        <>
          <div className="flex flex-wrap gap-3" role="tablist" aria-label="Status filter">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`caption-label px-3 py-1.5 rounded-full ring-1 transition-all ${
                  filter === f.id
                    ? 'text-amber-200 bg-amber-950/30 ring-amber-900/50'
                    : 'text-stone-600 ring-stone-800/50 hover:text-stone-300 hover:ring-stone-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredPostings.length === 0 ? (
            <Card className="px-8 py-14 text-center space-y-4">
              <Compass size={28} className="text-amber-200/40 mx-auto" aria-hidden />
              <p className="text-2xl text-stone-200 font-display tracking-tight max-w-md mx-auto">
                {postings.length === 0 ? 'No postings yet.' : 'Caught up.'}
              </p>
              <p className="text-sm text-stone-500 italic max-w-sm mx-auto">
                Add a company to widen the feed.
              </p>
            </Card>
          ) : (
            <ul className="space-y-3">
              {filteredPostings.map((p, idx) => {
                const isFeatured =
                  idx === 0 &&
                  filter === 'new' &&
                  typeof p.alignmentScore === 'number' &&
                  p.alignmentScore >= 85;
                const accent: 'emerald' | 'amber' | 'none' =
                  (p.alignmentScore ?? 0) >= 85
                    ? 'emerald'
                    : (p.alignmentScore ?? 0) >= 70
                      ? 'amber'
                      : 'none';
                return (
                  <li key={p.id}>
                    <Card
                      accent={accent}
                      className={isFeatured ? 'pl-7 pr-6 py-6' : 'pl-6 pr-5 py-5'}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div
                            className={`${isFeatured ? 'text-2xl font-display tracking-tight' : 'text-base'} text-stone-50`}
                          >
                            {p.role}
                          </div>
                          <div className="caption-label text-stone-500 mt-1.5">
                            {p.company} &middot; {p.location}
                            {p.remote ? ' · Remote' : ''}
                            {p.salaryRange ? ` · ${p.salaryRange}` : ''}
                          </div>
                          <p
                            className={`text-sm text-stone-400 mt-3 leading-relaxed ${isFeatured ? '' : 'line-clamp-2'}`}
                          >
                            {p.jobDescription}
                          </p>
                        </div>
                        {typeof p.alignmentScore === 'number' && (
                          <div className="text-right">
                            <div className="tab-nums text-3xl text-amber-200 font-display">
                              {p.alignmentScore}
                            </div>
                            <div className="caption-label text-amber-200/60 mt-0.5">Fit</div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-stone-100/5">
                        <Pill tone={p.status === 'new' ? 'accent' : 'muted'}>{p.status}</Pill>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="caption-label text-stone-400 hover:text-amber-200 inline-flex items-center gap-1.5 transition-colors"
                        >
                          Open posting <ExternalLink size={11} aria-hidden />
                        </a>
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMark(p.id, 'dismissed')}
                        >
                          Dismiss
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMark(p.id, 'viewed')}
                        >
                          Mark viewed
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDraft(p.id)}
                          disabled={createApplication.isPending || p.status === 'drafted'}
                          data-testid={`discovery-draft-${p.id}`}
                        >
                          {p.status === 'drafted' ? 'Drafted' : 'Draft application'}
                        </Button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <ul className="space-y-2">
          {companies.length === 0 && (
            <Card className="p-10 text-center">
              <p className="text-stone-500 text-sm">No watchlist companies yet.</p>
            </Card>
          )}
          {companies.map((c) => (
            <li key={c.id}>
              <Card className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-stone-100">{c.company}</div>
                  <div className="text-xs text-stone-500 font-mono">
                    {c.atsProvider} · {c.atsSlug}
                  </div>
                </div>
                <Pill tone={c.active ? 'success' : 'muted'}>{c.active ? 'Active' : 'Paused'}</Pill>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCompany.mutate(c.id)}
                >
                  Remove
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Add watchlist company">
        <div className="space-y-4">
          <Field label="Company">
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Vercel"
            />
          </Field>
          <Field label="ATS provider">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AtsProvider)}
              className="w-full bg-stone-900/80 border border-stone-800 rounded-sm px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-200/60"
            >
              {ATS_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="ATS slug"
            hint="The provider's URL slug, e.g. greenhouse.io/<slug>."
          >
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="vercel"
              mono
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpenAdd(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddCompany}
              disabled={!companyName || !slug || addCompany.isPending}
            >
              {addCompany.isPending ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
