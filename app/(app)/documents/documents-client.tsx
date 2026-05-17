'use client';

// Ported from prototype/Throughline.jsx DocumentsView (lines 2671-2940).
// Day 2 surface: list generated documents, filter by kind, generate a new
// document from a (kind, application) selector, preview the markdown body.

import { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  Field,
  Markdown,
  Modal,
  Ornament,
  Pill,
  RouteHeader,
  SectionLabel,
} from '@/components';
import type { DocumentKind } from '@/contracts/models';
import { DOCUMENT_KINDS } from '@/contracts/models';
import { useApplications } from '@/lib/queries/useApplications';
import {
  useDeleteDocument,
  useDocuments,
  useGenerateCoverLetter,
  useGenerateDossier,
  useGenerateNinetyDay,
  useGenerateResume,
} from '@/lib/queries/useDocuments';
import { useToastStore } from '@/stores/useToastStore';

const KIND_LABELS: Record<DocumentKind, string> = {
  resume: 'Resume',
  cover_letter: 'Cover letter',
  ninety_day: '90-day plan',
  dossier: 'Dossier',
};

export function DocumentsClient() {
  const { data, isLoading } = useDocuments();
  const { data: apps } = useApplications();
  const resume = useGenerateResume();
  const cover = useGenerateCoverLetter();
  const ninety = useGenerateNinetyDay();
  const dossier = useGenerateDossier();
  const remove = useDeleteDocument();
  const pushToast = useToastStore((s) => s.push);

  const [kind, setKind] = useState<DocumentKind>('resume');
  const [applicationId, setApplicationId] = useState<string>('');
  const [filter, setFilter] = useState<DocumentKind | 'all'>('all');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const documents = data?.documents ?? [];
  const applications = apps?.applications ?? [];
  const filtered = documents.filter((d) =>
    filter === 'all' ? true : d.kind === filter,
  );
  const preview = documents.find((d) => d.id === previewId);

  const requiresApplication = kind !== 'resume';
  const generating =
    resume.isPending || cover.isPending || ninety.isPending || dossier.isPending;

  async function handleGenerate() {
    try {
      if (kind === 'resume') {
        await resume.mutateAsync({ applicationId: applicationId || undefined });
      } else if (kind === 'cover_letter') {
        if (!applicationId) throw new Error('Pick an application first.');
        await cover.mutateAsync({ applicationId });
      } else if (kind === 'ninety_day') {
        if (!applicationId) throw new Error('Pick an application first.');
        await ninety.mutateAsync({ applicationId });
      } else {
        if (!applicationId) throw new Error('Pick an application first.');
        await dossier.mutateAsync({ applicationId });
      }
      pushToast(`${KIND_LABELS[kind]} generated.`, 'success');
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Generation failed.',
        'error',
      );
    }
  }

  return (
    <div className="space-y-10">
      <RouteHeader
        section="§05"
        name="DOCUMENTS"
        title="Documents"
        sub="Resumes, cover letters, 90-day plans, and dossiers — pulled from your Skills DB."
      />

      <Card className="p-5">
        <SectionLabel>Generate</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Field label="Kind">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as DocumentKind)}
              className="w-full bg-stone-950 border-2 border-stone-700 rounded-none px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-arctic-400"
            >
              {DOCUMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Application"
            hint={requiresApplication ? 'Required for this kind.' : 'Optional for resume.'}
          >
            <select
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              className="w-full bg-stone-950 border-2 border-stone-700 rounded-none px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-arctic-400"
            >
              <option value="">— None —</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.company} · {a.role}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <Button
              size="md"
              onClick={handleGenerate}
              disabled={generating || (requiresApplication && !applicationId)}
              data-testid="documents-generate"
            >
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Document kind filter">
        {(['all', ...DOCUMENT_KINDS] as Array<DocumentKind | 'all'>).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={filter === k}
            onClick={() => setFilter(k)}
            className={`font-mono text-[11px] uppercase tracking-[0.1em] px-3 py-1.5 border-2 transition-all ${
              filter === k
                ? 'border-amber-200 text-amber-200'
                : 'border-stone-800 text-stone-500 hover:border-stone-600 hover:text-stone-200'
            }`}
          >
            {k === 'all' ? 'All' : KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {isLoading && (
        <Card className="p-5 text-stone-500 text-sm">Loading documents...</Card>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card className="px-8 py-14 text-center space-y-5">
          <Ornament kind="diamond" className="text-amber-200/70 text-2xl block" />
          <p className="display-xl text-2xl md:text-3xl text-stone-50 max-w-md mx-auto">
            Generate a resume above.
          </p>
          <p className="font-mono text-xs text-stone-500 max-w-sm mx-auto">
            [ THE SKILLS DB DOES THE LIFTING ]
          </p>
        </Card>
      )}

      {filtered.length > 0 && (
        <ul className="space-y-2">
          {filtered.map((doc) => (
            <li key={doc.id}>
              <Card className="p-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewId(doc.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-sm text-stone-100 truncate">{doc.title}</div>
                  <div className="text-xs text-stone-500 font-mono">
                    {new Date(doc.createdAt).toLocaleString()}
                  </div>
                </button>
                <Pill tone="info">{KIND_LABELS[doc.kind]}</Pill>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate(doc.id)}
                  aria-label={`Delete ${doc.title}`}
                >
                  <Trash2 size={14} aria-hidden />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={preview !== undefined}
        onClose={() => setPreviewId(null)}
        title={preview?.title ?? ''}
        wide
      >
        {preview && <Markdown>{preview.body}</Markdown>}
      </Modal>
    </div>
  );
}
