'use client';

// Project (problem -> action -> result, with skills/tools/metrics) editor
// used inside the Skills DB view. The shape mirrors /contracts/models.ts
// ProjectSchema; client-side validation keeps the round trip honest before
// hitting useUpdateSkills.

import { useEffect, useMemo, useState } from 'react';
import { Button, Field, Input, Modal, Textarea } from '@/components';
import type { Job, Project } from '@/contracts/models';

export type ProjectFormValues = {
  id?: string;
  name: string;
  problem: string;
  result: string;
  scope: string;
  domain: string;
  actions: string;     // newline-separated
  skills: string;      // comma-separated
  tools: string;       // comma-separated
  methods: string;     // comma-separated
  keywords: string;    // comma-separated
  relevance: string;   // comma-separated
  metricsText: string; // "key: value" per line
  recency: number;
  confidence: number;
};

const EMPTY: ProjectFormValues = {
  name: '',
  problem: '',
  result: '',
  scope: '',
  domain: '',
  actions: '',
  skills: '',
  tools: '',
  methods: '',
  keywords: '',
  relevance: '',
  metricsText: '',
  recency: 3,
  confidence: 0.5,
};

// Project ids: P\d{1,4} per job. Up to 50 per JobSchema.projects.max(50).
export const PROJECT_LIMIT = 50;

export function nextProjectId(projects: Project[]): string {
  const used = new Set(projects.map((p) => p.id));
  for (let i = 1; i < 10_000; i++) {
    const candidate = `P${String(i).padStart(2, '0')}`;
    if (!used.has(candidate)) return candidate;
  }
  return `P${Date.now().toString().slice(-4)}`;
}

function splitList(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitLines(input: string): string[] {
  return input
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseMetrics(input: string): Record<string, string> | string {
  const out: Record<string, string> = {};
  for (const line of input.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(':');
    if (idx < 0) {
      return `Metrics line "${trimmed}" must be "key: value".`;
    }
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key) return 'Metrics: key is empty.';
    if (key.length > 100) return `Metrics key "${key}" must be 100 characters or fewer.`;
    if (value.length > 200) return `Metrics value for "${key}" must be 200 characters or fewer.`;
    out[key] = value;
  }
  if (Object.keys(out).length > 20) return 'Metrics: at most 20 entries.';
  return out;
}

function validate(values: ProjectFormValues): string | null {
  if (!values.name.trim()) return 'Project name is required.';
  if (values.name.length > 200) return 'Name must be 200 characters or fewer.';
  if (values.problem.length > 2_000) return 'Problem must be 2,000 characters or fewer.';
  if (values.result.length > 2_000) return 'Result must be 2,000 characters or fewer.';
  if (values.scope.length > 500) return 'Scope must be 500 characters or fewer.';
  if (values.domain.length > 100) return 'Domain must be 100 characters or fewer.';
  if (splitLines(values.actions).length > 20) return 'Actions: at most 20 entries.';
  if (splitList(values.skills).length > 50) return 'Skills: at most 50 entries.';
  if (splitList(values.tools).length > 50) return 'Tools: at most 50 entries.';
  if (splitList(values.methods).length > 50) return 'Methods: at most 50 entries.';
  if (splitList(values.keywords).length > 50) return 'Keywords: at most 50 entries.';
  if (splitList(values.relevance).length > 50) return 'Relevance: at most 50 entries.';
  if (values.recency < 1 || values.recency > 5) return 'Recency must be between 1 and 5.';
  if (values.confidence < 0 || values.confidence > 1) {
    return 'Confidence must be between 0 and 1.';
  }
  return null;
}

export type ProjectModalProps = {
  open: boolean;
  onClose: () => void;
  job: Job | null;            // null when there's no active job context
  editing: Project | null;
  onSave: (project: Project) => Promise<void> | void;
  saving?: boolean;
};

export function ProjectModal({
  open,
  onClose,
  job,
  editing,
  onSave,
  saving = false,
}: ProjectModalProps) {
  const initial = useMemo<ProjectFormValues>(
    () =>
      editing
        ? {
            id: editing.id,
            name: editing.name,
            problem: editing.problem,
            result: editing.result,
            scope: editing.scope,
            domain: editing.domain,
            actions: editing.actions.join('\n'),
            skills: editing.skills.join(', '),
            tools: editing.tools.join(', '),
            methods: editing.methods.join(', '),
            keywords: editing.keywords.join(', '),
            relevance: editing.relevance.join(', '),
            metricsText: Object.entries(editing.metrics)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n'),
            recency: editing.recency,
            confidence: editing.confidence,
          }
        : EMPTY,
    [editing],
  );

  const [values, setValues] = useState<ProjectFormValues>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
    }
  }, [open, initial]);

  const projects = job?.projects ?? [];
  const atLimit = !editing && projects.length >= PROJECT_LIMIT;

  async function handleSubmit() {
    if (!job) {
      setError('No job context. Open this modal from a job card.');
      return;
    }
    if (atLimit) {
      setError(`Limit reached: ${PROJECT_LIMIT} projects per role.`);
      return;
    }
    const message = validate(values);
    if (message) {
      setError(message);
      return;
    }
    const metricsParsed = parseMetrics(values.metricsText);
    if (typeof metricsParsed === 'string') {
      setError(metricsParsed);
      return;
    }
    const id = values.id ?? nextProjectId(projects);
    const project: Project = {
      id,
      name: values.name.trim(),
      problem: values.problem.trim(),
      result: values.result.trim(),
      scope: values.scope.trim(),
      domain: values.domain.trim(),
      actions: splitLines(values.actions),
      skills: splitList(values.skills),
      tools: splitList(values.tools),
      methods: splitList(values.methods),
      keywords: splitList(values.keywords),
      relevance: splitList(values.relevance),
      metrics: metricsParsed,
      recency: values.recency,
      confidence: values.confidence,
    };
    await onSave(project);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit project' : `Add project${job ? ` to ${job.title}` : ''}`}
      wide
    >
      <div className="space-y-4">
        {atLimit && (
          <p className="text-xs text-rose-300 bg-rose-950/30 border border-rose-900 rounded-md px-3 py-2">
            You have reached the {PROJECT_LIMIT}-project limit for this role.
          </p>
        )}
        <Field label="Project name">
          <Input
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            placeholder="Vision POS Training & Inventory System"
          />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Problem" hint={`${values.problem.length} / 2000`}>
            <Textarea
              rows={3}
              value={values.problem}
              onChange={(e) => setValues({ ...values, problem: e.target.value })}
              placeholder="What was broken or unmet."
            />
          </Field>
          <Field label="Result" hint={`${values.result.length} / 2000`}>
            <Textarea
              rows={3}
              value={values.result}
              onChange={(e) => setValues({ ...values, result: e.target.value })}
              placeholder="Measurable outcome."
            />
          </Field>
        </div>
        <Field label="Actions" hint="One per line, max 20">
          <Textarea
            rows={4}
            value={values.actions}
            onChange={(e) => setValues({ ...values, actions: e.target.value })}
            placeholder={'Led rollout end-to-end\nBuilt interactive simulations\n...'}
          />
        </Field>
        <Field label="Metrics" hint='One per line, "key: value"'>
          <Textarea
            rows={3}
            value={values.metricsText}
            onChange={(e) => setValues({ ...values, metricsText: e.target.value })}
            placeholder={'users: 25000\nlocations: 1100'}
            mono
          />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Scope" hint={`${values.scope.length} / 500`}>
            <Input
              value={values.scope}
              onChange={(e) => setValues({ ...values, scope: e.target.value })}
              placeholder="Company-wide, 1,100+ locations"
            />
          </Field>
          <Field label="Domain" hint={`${values.domain.length} / 100`}>
            <Input
              value={values.domain}
              onChange={(e) => setValues({ ...values, domain: e.target.value })}
              placeholder="Enterprise training"
            />
          </Field>
          <Field label="Skills" hint="Comma-separated">
            <Input
              value={values.skills}
              onChange={(e) => setValues({ ...values, skills: e.target.value })}
              placeholder="React, JavaScript, Program management"
            />
          </Field>
          <Field label="Tools" hint="Comma-separated">
            <Input
              value={values.tools}
              onChange={(e) => setValues({ ...values, tools: e.target.value })}
              placeholder="React, SCORM, Kaltura"
            />
          </Field>
          <Field label="Methods" hint="Comma-separated">
            <Input
              value={values.methods}
              onChange={(e) => setValues({ ...values, methods: e.target.value })}
              placeholder="Agile, Cross-functional delivery"
            />
          </Field>
          <Field label="Keywords" hint="Comma-separated">
            <Input
              value={values.keywords}
              onChange={(e) => setValues({ ...values, keywords: e.target.value })}
              placeholder="POS training, simulation, eLearning"
            />
          </Field>
          <Field label="Relevance" hint="Comma-separated">
            <Input
              value={values.relevance}
              onChange={(e) => setValues({ ...values, relevance: e.target.value })}
              placeholder="leadership, frontend, training"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Recency · ${values.recency}`}>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={values.recency}
              onChange={(e) => setValues({ ...values, recency: Number(e.target.value) })}
              className="w-full accent-amber-200"
            />
          </Field>
          <Field label={`Confidence · ${values.confidence.toFixed(2)}`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={values.confidence}
              onChange={(e) => setValues({ ...values, confidence: Number(e.target.value) })}
              className="w-full accent-amber-200"
            />
          </Field>
        </div>
        {error && (
          <p role="alert" className="text-xs text-rose-300">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving || atLimit || !job}
            data-testid="project-modal-save"
          >
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add project'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
