'use client';

// Editable application detail drawer used by the Tracker. Day 3:
// - Notes textarea: debounced PATCH (800ms) so a paragraph of typing
//   collapses to a single network round trip.
// - Follow-up date picker: PATCH on blur.
// - Status chips: PATCH immediately, optimistic toast.
// - Alignment regen: POST /api/applications/:id/alignment, displays score
//   + recommendation + missing keywords on completion.
// - Events timeline: GET /api/applications/:id/events; refetches on
//   mutation success.

import { useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button, Card, Field, Input, Modal, Pill, SectionLabel, Textarea } from '@/components';
import type { Application, ApplicationStatus } from '@/contracts/models';
import {
  useApplicationEvents,
  useDeleteApplication,
  useRecomputeAlignment,
  useUpdateApplication,
} from '@/lib/queries/useApplications';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useToastStore } from '@/stores/useToastStore';
import { STATUS_TONES, STATUSES, statusLabel } from '../_lib/status';

const NOTES_DEBOUNCE_MS = 800;

const EVENT_LABEL: Record<string, string> = {
  created: 'Created',
  status_change: 'Status changed',
  note: 'Note added',
  document_generated: 'Document generated',
  follow_up: 'Follow-up logged',
};

type Props = {
  application: Application;
  onClose: () => void;
};

export function ApplicationDetail({ application, onClose }: Props) {
  const update = useUpdateApplication();
  const remove = useDeleteApplication();
  const recompute = useRecomputeAlignment();
  const events = useApplicationEvents(application.id);
  const pushToast = useToastStore((s) => s.push);

  // Local mirror so the textarea stays responsive while the debounced
  // PATCH is in flight. We resync if the upstream Application changes
  // (e.g. status change refresh).
  const [notes, setNotes] = useState(application.notes ?? '');
  const [followUp, setFollowUp] = useState(application.followUpDate ?? '');

  useEffect(() => {
    setNotes(application.notes ?? '');
  }, [application.id, application.notes]);

  useEffect(() => {
    setFollowUp(application.followUpDate ?? '');
  }, [application.id, application.followUpDate]);

  const persistNotes = useDebouncedCallback((next: string) => {
    update.mutate(
      { id: application.id, patch: { notes: next || undefined } },
      {
        onError: (error) =>
          pushToast(
            error instanceof Error ? error.message : 'Could not save notes.',
            'error',
          ),
      },
    );
  }, NOTES_DEBOUNCE_MS);

  function onNotesChange(value: string) {
    setNotes(value);
    persistNotes(value);
  }

  function persistFollowUp() {
    if (followUp === (application.followUpDate ?? '')) return;
    update.mutate(
      { id: application.id, patch: { followUpDate: followUp || undefined } },
      {
        onSuccess: () => pushToast('Follow-up updated.', 'success'),
        onError: (error) =>
          pushToast(
            error instanceof Error ? error.message : 'Could not save follow-up.',
            'error',
          ),
      },
    );
  }

  async function handleStatus(next: ApplicationStatus) {
    if (next === application.status) return;
    try {
      await update.mutateAsync({ id: application.id, patch: { status: next } });
      pushToast(`Moved to ${statusLabel(next)}.`, 'success');
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Could not update status.',
        'error',
      );
    }
  }

  async function handleRecompute() {
    try {
      await recompute.mutateAsync(application.id);
      pushToast('Alignment recomputed.', 'success');
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Alignment regen failed.',
        'error',
      );
    }
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync(application.id);
      pushToast('Application removed.', 'success');
      onClose();
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Could not delete application.',
        'error',
      );
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>Status</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatus(s)}
              className={`text-[10px] uppercase tracking-[0.2em] font-mono px-2.5 py-1.5 rounded-sm border ${
                application.status === s
                  ? 'border-amber-200/60 text-amber-200 bg-amber-900/20'
                  : 'border-stone-800 text-stone-500 hover:text-stone-200'
              }`}
              aria-pressed={application.status === s}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-4">
        <SectionLabel
          right={
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRecompute}
              disabled={recompute.isPending}
              data-testid="application-recompute-alignment"
            >
              {recompute.isPending ? (
                <>
                  <RefreshCw size={12} className="animate-spin" aria-hidden /> Recomputing
                </>
              ) : (
                <>
                  <Sparkles size={12} aria-hidden /> Recompute
                </>
              )}
            </Button>
          }
        >
          Alignment
        </SectionLabel>
        {typeof application.alignmentScore === 'number' && application.alignmentAnalysis ? (
          <>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-display tabular-nums text-amber-200">
                {application.alignmentScore}%
              </span>
              <span className="text-sm text-stone-400">
                {application.alignmentAnalysis.recommendation}
              </span>
            </div>
            {application.alignmentAnalysis.missingKeywords.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-1.5">
                  Missing keywords
                </div>
                <div className="flex flex-wrap gap-1">
                  {application.alignmentAnalysis.missingKeywords.map((k) => (
                    <Pill key={k} tone="warn">
                      {k}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-stone-500">
            No alignment yet. Add a job description and click recompute.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Follow-up date" hint="ISO date (YYYY-MM-DD)">
          <Input
            type="date"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            onBlur={persistFollowUp}
            mono
          />
        </Field>
        <div className="flex items-end">
          <span className="text-xs text-stone-500 font-mono">
            Updated {new Date(application.updatedAt).toLocaleString()}
          </span>
        </div>
      </div>

      <Field label="Notes" hint={`${notes.length} / 10000 · autosaves`}>
        <Textarea
          rows={5}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Recruiter contacts, prep notes, what you learned in the screen..."
        />
      </Field>

      {application.jobDescription && (
        <div>
          <SectionLabel>Job description</SectionLabel>
          <details>
            <summary className="text-xs uppercase tracking-[0.2em] font-mono text-stone-500 cursor-pointer hover:text-amber-200">
              Show full JD
            </summary>
            <p className="text-sm text-stone-400 whitespace-pre-wrap leading-relaxed mt-2">
              {application.jobDescription}
            </p>
          </details>
        </div>
      )}

      <div>
        <SectionLabel
          right={
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">
              {events.data?.events.length ?? 0} events
            </span>
          }
        >
          Timeline
        </SectionLabel>
        {events.isLoading ? (
          <p className="text-sm text-stone-500">Loading events...</p>
        ) : (events.data?.events.length ?? 0) === 0 ? (
          <p className="text-sm text-stone-500">No events recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {events.data?.events.map((evt) => (
              <li key={evt.id} className="flex items-start gap-3 text-sm">
                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono w-32 shrink-0 pt-0.5">
                  {new Date(evt.at).toLocaleString()}
                </span>
                <span className="text-stone-200">
                  <span className="text-amber-200/80">
                    {EVENT_LABEL[evt.kind] ?? evt.kind}
                  </span>
                  {evt.kind === 'status_change' && evt.fromStatus && evt.toStatus && (
                    <>
                      {' · '}
                      {statusLabel(evt.fromStatus)}{' '}
                      <span className="text-stone-500">→</span>{' '}
                      <Pill tone={STATUS_TONES[evt.toStatus]}>
                        {statusLabel(evt.toStatus)}
                      </Pill>
                    </>
                  )}
                  {evt.note && <span className="text-stone-400"> · {evt.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-between pt-2 border-t border-stone-900">
        <Button variant="danger" size="sm" onClick={handleDelete} disabled={remove.isPending}>
          {remove.isPending ? 'Deleting...' : 'Delete'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

export function ApplicationDetailModal({
  application,
  onClose,
}: {
  application: Application | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={application !== null}
      onClose={onClose}
      title={application ? `${application.role} at ${application.company}` : ''}
      wide
    >
      {application && <ApplicationDetail application={application} onClose={onClose} />}
    </Modal>
  );
}
