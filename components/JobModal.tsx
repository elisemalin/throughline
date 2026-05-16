'use client';

// Job (employer + role) editor used in the Skills DB view. Validates client-
// side against /contracts/models.ts JobSchema bounds before round-tripping
// through useUpdateSkills so a contract rejection never surprises the user.

import { useEffect, useMemo, useState } from 'react';
import { Button, Field, Input, Modal, Textarea } from '@/components';
import type { Job, SkillsDB } from '@/contracts/models';

export type JobFormValues = {
  id?: string;
  employer: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  industry: string;
  summary: string;
};

const EMPTY: JobFormValues = {
  employer: '',
  title: '',
  startDate: '',
  endDate: '',
  location: '',
  industry: '',
  summary: '',
};

const YYYY_MM = /^\d{4}-\d{2}$/;

// Job IDs are J\d{1,4}; we keep the slot index small to leave room.
export const JOB_LIMIT = 20;

export function nextJobId(jobs: Job[]): string {
  const used = new Set(jobs.map((j) => j.id));
  for (let i = 1; i < 10_000; i++) {
    const candidate = `J${String(i).padStart(2, '0')}`;
    if (!used.has(candidate)) return candidate;
  }
  // Effectively unreachable — JOB_LIMIT caps at 20 entries — but a defined
  // fallback beats `undefined!`.
  return `J${Date.now().toString().slice(-4)}`;
}

function validate(values: JobFormValues): string | null {
  if (!values.employer.trim()) return 'Employer is required.';
  if (values.employer.length > 200) return 'Employer must be 200 characters or fewer.';
  if (!values.title.trim()) return 'Title is required.';
  if (values.title.length > 200) return 'Title must be 200 characters or fewer.';
  if (!YYYY_MM.test(values.startDate)) return 'Start date must be YYYY-MM.';
  if (values.endDate && !YYYY_MM.test(values.endDate)) {
    return 'End date must be YYYY-MM (leave blank for present).';
  }
  if (values.location.length > 200) return 'Location must be 200 characters or fewer.';
  if (values.industry.length > 200) return 'Industry must be 200 characters or fewer.';
  if (values.summary.length > 2_000) return 'Summary must be 2,000 characters or fewer.';
  return null;
}

export type JobModalProps = {
  open: boolean;
  onClose: () => void;
  // null = create flow, Job = edit flow.
  editing: Job | null;
  skillsDB: SkillsDB | null;
  onSave: (job: Job) => Promise<void> | void;
  saving?: boolean;
};

export function JobModal({
  open,
  onClose,
  editing,
  skillsDB,
  onSave,
  saving = false,
}: JobModalProps) {
  const initial = useMemo<JobFormValues>(
    () =>
      editing
        ? {
            id: editing.id,
            employer: editing.employer,
            title: editing.title,
            startDate: editing.startDate,
            endDate: editing.endDate ?? '',
            location: editing.location,
            industry: editing.industry,
            summary: editing.summary,
          }
        : EMPTY,
    [editing],
  );

  const [values, setValues] = useState<JobFormValues>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
    }
  }, [open, initial]);

  const jobs = skillsDB?.jobs ?? [];
  const atLimit = !editing && jobs.length >= JOB_LIMIT;

  async function handleSubmit() {
    if (atLimit) {
      setError(`Limit reached: ${JOB_LIMIT} jobs per Skills DB.`);
      return;
    }
    const message = validate(values);
    if (message) {
      setError(message);
      return;
    }
    const id = values.id ?? nextJobId(jobs);
    const job: Job = {
      id,
      employer: values.employer.trim(),
      title: values.title.trim(),
      startDate: values.startDate,
      endDate: values.endDate.trim() ? values.endDate : undefined,
      location: values.location.trim(),
      industry: values.industry.trim(),
      summary: values.summary.trim(),
      projects: editing?.projects ?? [],
    };
    await onSave(job);
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit role' : 'Add role'} wide>
      <div className="space-y-4">
        {atLimit && (
          <p className="text-xs text-rose-300 bg-rose-950/30 border border-rose-900 rounded-md px-3 py-2">
            You have reached the {JOB_LIMIT}-role limit. Edit an existing role instead.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Employer">
            <Input
              value={values.employer}
              onChange={(e) => setValues({ ...values, employer: e.target.value })}
              placeholder="Discount Tire"
              disabled={atLimit}
            />
          </Field>
          <Field label="Title">
            <Input
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
              placeholder="Frontend Developer II"
              disabled={atLimit}
            />
          </Field>
          <Field label="Start date" hint="YYYY-MM">
            <Input
              value={values.startDate}
              onChange={(e) => setValues({ ...values, startDate: e.target.value })}
              placeholder="2021-07"
              mono
              disabled={atLimit}
              // WHY pattern + inputMode: native input[type=month] is unsupported
              // in Firefox (degrades to text). The pattern matches the Zod
              // schema's YYYY-MM regex so a Firefox user typing "2024" gets a
              // friendly HTML validation message instead of a Zod 400 at submit.
              pattern="\d{4}-\d{2}"
              inputMode="numeric"
              title="Year and month in YYYY-MM format"
            />
          </Field>
          <Field label="End date" hint="YYYY-MM, blank if current">
            <Input
              value={values.endDate}
              onChange={(e) => setValues({ ...values, endDate: e.target.value })}
              placeholder="2024-05"
              mono
              disabled={atLimit}
              pattern="\d{4}-\d{2}"
              inputMode="numeric"
              title="Year and month in YYYY-MM format, or blank if current"
            />
          </Field>
          <Field label="Location">
            <Input
              value={values.location}
              onChange={(e) => setValues({ ...values, location: e.target.value })}
              placeholder="Scottsdale, AZ"
              disabled={atLimit}
            />
          </Field>
          <Field label="Industry">
            <Input
              value={values.industry}
              onChange={(e) => setValues({ ...values, industry: e.target.value })}
              placeholder="Retail / Automotive Services"
              disabled={atLimit}
            />
          </Field>
        </div>
        <Field label="Summary" hint={`${values.summary.length} / 2000`}>
          <Textarea
            rows={3}
            value={values.summary}
            onChange={(e) => setValues({ ...values, summary: e.target.value })}
            placeholder="One-paragraph overview of scope and impact at this role."
            disabled={atLimit}
          />
        </Field>
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
            disabled={saving || atLimit}
            data-testid="job-modal-save"
          >
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add role'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
