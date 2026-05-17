'use client';

// Ported from prototype/Throughline.jsx TrackerView (lines 1904-2084).
// Day 3: list + filter + create stay here; the per-application detail drawer
// with debounced notes, follow-up editor, status chips, alignment recompute,
// and events timeline lives in application-detail.tsx.

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  Ornament,
  Pill,
  RouteHeader,
  Textarea,
} from '@/components';
import type { ApplicationStatus } from '@/contracts/models';
import {
  useApplications,
  useCreateApplication,
} from '@/lib/queries/useApplications';
import { useToastStore } from '@/stores/useToastStore';
import { STATUS_TONES, STATUSES, statusLabel } from '../_lib/status';
import { ApplicationDetailModal } from './application-detail';

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

  return (
    <div className="space-y-10">
      <RouteHeader
        section="§04"
        name="TRACKER"
        title="Tracker"
        sub="Every active conversation. Status moves are the only signal that matters."
        right={
          <Button size="sm" onClick={() => setOpenCreate(true)} data-testid="tracker-add" arrow>
            <Plus size={14} aria-hidden /> Add application
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status filter">
        {(['all', 'active', ...STATUSES] as StatusFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`font-mono text-xs uppercase tracking-[0.1em] px-3 py-1.5 border-2 transition-all ${
              filter === f
                ? 'border-amber-200 bg-amber-200 text-stone-950'
                : 'border-stone-800 text-stone-500 hover:border-stone-600 hover:text-stone-200'
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
        <Card className="px-8 py-14 text-center space-y-5">
          <Ornament kind="diamond" className="text-amber-200/70 text-2xl block" />
          <p className="display-xl text-2xl md:text-3xl text-stone-50 max-w-md mx-auto">
            {applications.length === 0
              ? 'Track the first one.'
              : 'Nothing under this filter.'}
          </p>
          <p className="font-mono text-xs text-stone-500 max-w-sm mx-auto">
            {applications.length === 0
              ? '[ STATUS MOVES ARE THE HEARTBEAT ]'
              : '[ TRY THE ACTIVE FILTER ]'}
          </p>
          {applications.length === 0 && (
            <div className="pt-2">
              <Button size="sm" onClick={() => setOpenCreate(true)} arrow>
                <Plus size={14} aria-hidden /> Add an application
              </Button>
            </div>
          )}
        </Card>
      )}

      {filtered.length > 0 && (
        <ul className="space-y-2">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setDetailId(a.id)}
                className="w-full text-left group"
              >
                <Card
                  tone={
                    a.status === 'interview' || a.status === 'offer'
                      ? 'success'
                      : a.status === 'applied' || a.status === 'screen'
                        ? 'accent'
                        : 'default'
                  }
                  className="px-5 py-4 flex items-center gap-4 transition-colors group-hover:bg-stone-900/60"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-stone-100 truncate">{a.role}</div>
                    <div className="caption-label text-stone-500 truncate mt-1">
                      {a.company}
                      {a.location ? ` · ${a.location}` : ''}
                    </div>
                  </div>
                  {typeof a.alignmentScore === 'number' && (
                    <span className="tab-nums font-sans font-bold text-2xl text-amber-200">
                      {a.alignmentScore}
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
              className="w-full bg-stone-950 border-2 border-stone-700 rounded-none px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-arctic-400"
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

      <ApplicationDetailModal application={detail} onClose={() => setDetailId(null)} />
    </div>
  );
}
