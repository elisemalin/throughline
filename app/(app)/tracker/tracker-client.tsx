'use client';

// Ported from prototype/Throughline.jsx TrackerView (lines 1904-2084) and
// ApplicationDetail (lines 2317-2460). Day 2 surface: list applications,
// filter by status, create from a small modal, edit status from the detail
// drawer. Alignment recomputation lives behind a button in the drawer.

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  Pill,
  SectionLabel,
  Textarea,
} from '@/components';
import type { ApplicationStatus } from '@/contracts/models';
import {
  useApplications,
  useCreateApplication,
  useDeleteApplication,
  useUpdateApplication,
} from '@/lib/queries/useApplications';
import { useToastStore } from '@/stores/useToastStore';
import { STATUS_TONES, STATUSES, statusLabel } from '../_lib/status';

type CreateFormState = {
  company: string;
  role: string;
  status: ApplicationStatus;
  url: string;
  jobDescription: string;
};

const emptyForm: CreateFormState = {
  company: '',
  role: '',
  status: 'researching',
  url: '',
  jobDescription: '',
};

type StatusFilter = 'all' | 'active' | ApplicationStatus;

const ACTIVE_STATUSES: ApplicationStatus[] = ['applied', 'screen', 'interview'];

export function TrackerClient() {
  const { data, isLoading } = useApplications();
  const create = useCreateApplication();
  const update = useUpdateApplication();
  const remove = useDeleteApplication();
  const pushToast = useToastStore((s) => s.push);

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<CreateFormState>(emptyForm);
  const [detailId, setDetailId] = useState<string | null>(null);

  const applications = useMemo(() => data?.applications ?? [], [data?.applications]);
  const detail = useMemo(
    () => applications.find((a) => a.id === detailId) ?? null,
    [applications, detailId],
  );

  const filtered = applications.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ACTIVE_STATUSES.includes(a.status);
    return a.status === filter;
  });

  async function handleCreate() {
    try {
      const { application } = await create.mutateAsync({
        company: form.company,
        role: form.role,
        status: form.status,
        remote: false,
        url: form.url || undefined,
        jobDescription: form.jobDescription || undefined,
      });
      pushToast(`Added ${application.role} at ${application.company}.`, 'success');
      setForm(emptyForm);
      setOpenCreate(false);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Could not create application.',
        'error',
      );
    }
  }

  async function handleStatusChange(id: string, next: ApplicationStatus) {
    try {
      await update.mutateAsync({ id, patch: { status: next } });
      pushToast(`Moved to ${statusLabel(next)}.`, 'success');
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Could not update status.',
        'error',
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove.mutateAsync(id);
      setDetailId(null);
      pushToast('Application removed.', 'success');
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Could not delete application.',
        'error',
      );
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-4xl text-stone-100 font-display">Tracker</h1>
          <p className="text-stone-500 text-sm mt-1">
            Every active conversation in one place. Status moves are the heartbeat.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpenCreate(true)} data-testid="tracker-add">
          <Plus size={14} aria-hidden /> Add application
        </Button>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status filter">
        {(['all', 'active', ...STATUSES] as StatusFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`text-[10px] uppercase tracking-[0.2em] font-mono px-2.5 py-1.5 rounded-sm border ${
              filter === f
                ? 'border-amber-200/60 text-amber-200 bg-amber-900/20'
                : 'border-stone-800 text-stone-500 hover:text-stone-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : statusLabel(f)}
          </button>
        ))}
      </div>

      {isLoading && (
        <Card className="p-5 text-sm text-stone-500">Loading applications...</Card>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-stone-500 text-sm mb-3">No applications under this filter.</p>
          <Button size="sm" onClick={() => setOpenCreate(true)}>
            <Plus size={14} aria-hidden /> Add your first
          </Button>
        </Card>
      )}

      {filtered.length > 0 && (
        <ul className="space-y-2">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setDetailId(a.id)}
                className="w-full text-left"
              >
                <Card className="p-4 flex items-center gap-3 hover:bg-stone-900/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-100 truncate">{a.role}</div>
                    <div className="text-xs text-stone-500 font-mono truncate">
                      {a.company}
                      {a.location ? ` · ${a.location}` : ''}
                    </div>
                  </div>
                  {typeof a.alignmentScore === 'number' && (
                    <span className="text-sm tabular-nums font-mono text-amber-200 w-12 text-right">
                      {a.alignmentScore}%
                    </span>
                  )}
                  <Pill tone={STATUS_TONES[a.status]}>{statusLabel(a.status)}</Pill>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Add application"
      >
        <div className="space-y-4">
          <Field label="Company">
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Acme Industries"
            />
          </Field>
          <Field label="Role">
            <Input
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Senior Frontend Engineer"
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ApplicationStatus })}
              className="w-full bg-stone-900/80 border border-stone-800 rounded-sm px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-200/60"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Job URL" hint="Optional. Used by Discovery deep-links.">
            <Input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://"
              mono
            />
          </Field>
          <Field label="Job description" hint="Pasted text fuels alignment scoring.">
            <Textarea
              rows={6}
              value={form.jobDescription}
              onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
              placeholder="Paste the JD text here..."
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!form.company || !form.role || create.isPending}
              data-testid="tracker-add-submit"
            >
              {create.isPending ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `${detail.role} at ${detail.company}` : ''}
        wide
      >
        {detail && (
          <div className="space-y-5">
            <div>
              <SectionLabel>Status</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(detail.id, s)}
                    className={`text-[10px] uppercase tracking-[0.2em] font-mono px-2.5 py-1.5 rounded-sm border ${
                      detail.status === s
                        ? 'border-amber-200/60 text-amber-200 bg-amber-900/20'
                        : 'border-stone-800 text-stone-500 hover:text-stone-200'
                    }`}
                  >
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            </div>
            {typeof detail.alignmentScore === 'number' && detail.alignmentAnalysis && (
              <Card className="p-4">
                <SectionLabel>Alignment</SectionLabel>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-display tabular-nums text-amber-200">
                    {detail.alignmentScore}%
                  </span>
                  <span className="text-sm text-stone-400">
                    {detail.alignmentAnalysis.recommendation}
                  </span>
                </div>
                {detail.alignmentAnalysis.missingKeywords.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-1.5">
                      Missing keywords
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {detail.alignmentAnalysis.missingKeywords.map((k) => (
                        <Pill key={k} tone="warn">
                          {k}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
            {detail.jobDescription && (
              <div>
                <SectionLabel>Job description</SectionLabel>
                <p className="text-sm text-stone-400 whitespace-pre-wrap leading-relaxed">
                  {detail.jobDescription}
                </p>
              </div>
            )}
            <div className="flex justify-between">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(detail.id)}
              >
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDetailId(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
