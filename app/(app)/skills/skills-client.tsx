'use client';

// Ported from prototype/Throughline.jsx SkillsView (lines 1183-1559).
// Day 2 scope: read SkillsDB via TanStack Query and surface a working
// import modal that round-trips through postSkillsIngest. Inline editing of
// jobs and projects is queued behind ImportModal because it requires a
// design pass on the prototype's add/edit forms.

import { useState } from 'react';
import { Target, Upload } from 'lucide-react';
import {
  Button,
  Card,
  Field,
  Modal,
  Pill,
  SectionLabel,
  Textarea,
} from '@/components';
import { useIngestSkills, useSkills } from '@/lib/queries/useSkills';
import { useToastStore } from '@/stores/useToastStore';

export function SkillsClient() {
  const { data, isLoading } = useSkills();
  const ingest = useIngestSkills();
  const pushToast = useToastStore((s) => s.push);
  const [importOpen, setImportOpen] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [linkedinText, setLinkedinText] = useState('');

  const skillsDB = data?.skillsDB ?? null;

  async function handleImport() {
    try {
      await ingest.mutateAsync({
        resumeText,
        linkedinText: linkedinText || undefined,
      });
      pushToast('Resume parsed. Skills DB updated.', 'success');
      setImportOpen(false);
      setResumeText('');
      setLinkedinText('');
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Resume import failed.',
        'error',
      );
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-4xl text-stone-100 font-display">Skills Database</h1>
          <p className="text-stone-500 text-sm mt-1">
            The source of truth. Every resume, cover letter, and interview pulls from here.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setImportOpen(true)}
            data-testid="skills-import"
          >
            <Upload size={13} aria-hidden /> Import
          </Button>
        </div>
      </header>

      {isLoading && (
        <Card className="p-5 text-stone-500 text-sm">Loading Skills DB...</Card>
      )}

      {skillsDB && (
        <>
          <Card className="p-5">
            <SectionLabel>Profile</SectionLabel>
            <div className="space-y-2">
              <div className="text-2xl text-stone-100 font-display">
                {skillsDB.fullName || (
                  <span className="text-stone-600">Add your name</span>
                )}
              </div>
              <div className="text-stone-400">
                {skillsDB.headline || <span className="text-stone-600">Add a headline</span>}
              </div>
              {skillsDB.positioning && (
                <p className="text-stone-300 italic max-w-3xl text-sm border-l-2 border-amber-200/40 pl-3 mt-3">
                  {skillsDB.positioning}
                </p>
              )}
              <div className="text-xs text-stone-500 font-mono pt-2 flex flex-wrap gap-x-4 gap-y-1">
                {skillsDB.contact.email && <span>{skillsDB.contact.email}</span>}
                {skillsDB.contact.location && <span>{skillsDB.contact.location}</span>}
                {skillsDB.contact.linkedin && <span>{skillsDB.contact.linkedin}</span>}
                {skillsDB.contact.site && <span>{skillsDB.contact.site}</span>}
              </div>
              {skillsDB.targetRoles.length > 0 && (
                <div className="pt-3 border-t border-stone-900 mt-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-2">
                    Target roles
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsDB.targetRoles.map((role) => (
                      <Pill key={role} tone="accent">
                        <Target size={9} aria-hidden /> {role}
                      </Pill>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <section className="space-y-3">
            <SectionLabel>Roles & projects</SectionLabel>
            {skillsDB.jobs.length === 0 ? (
              <Card className="p-10 text-center">
                <p className="text-stone-500 text-sm">
                  No roles yet. Import a resume to seed the database.
                </p>
              </Card>
            ) : (
              <ul className="space-y-2">
                {skillsDB.jobs.map((job) => (
                  <li key={job.id}>
                    <Card className="p-4 md:p-5">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <div className="text-lg text-stone-100 font-display">{job.title}</div>
                        <div className="text-stone-400 text-sm">{job.employer}</div>
                      </div>
                      <div className="text-xs text-stone-500 font-mono mt-1">
                        {job.startDate} to {job.endDate ?? 'Present'} · {job.location}
                        {job.projects.length > 0 &&
                          ` · ${job.projects.length} project${job.projects.length === 1 ? '' : 's'}`}
                      </div>
                      {job.summary && (
                        <p className="text-stone-400 text-sm mt-2.5 max-w-3xl">{job.summary}</p>
                      )}
                      {job.projects.length > 0 && (
                        <ul className="mt-4 space-y-3">
                          {job.projects.slice(0, 3).map((project) => (
                            <li key={project.id} className="border-l border-stone-800 pl-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] text-stone-600 font-mono">
                                  {project.id}
                                </span>
                                <div className="text-stone-100 text-sm font-medium">
                                  {project.name}
                                </div>
                              </div>
                              {project.result && (
                                <div className="text-xs text-stone-400 mb-2">
                                  <span className="text-amber-200/70 font-mono uppercase tracking-wider">
                                    Result ·{' '}
                                  </span>
                                  {project.result}
                                </div>
                              )}
                              {project.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {project.skills.slice(0, 8).map((s) => (
                                    <Pill key={s}>{s}</Pill>
                                  ))}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import resume"
        wide
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-400">
            Paste your resume text and optional LinkedIn export. The skills extractor will populate
            jobs, projects, and the canonical skill clouds.
          </p>
          <Field label="Resume text">
            <Textarea
              rows={10}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste resume content here..."
            />
          </Field>
          <Field label="LinkedIn export" hint="Optional. Paste the text export from your profile.">
            <Textarea
              rows={6}
              value={linkedinText}
              onChange={(e) => setLinkedinText(e.target.value)}
              placeholder="Paste LinkedIn text export..."
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={resumeText.trim().length === 0 || ingest.isPending}
              data-testid="skills-import-submit"
            >
              {ingest.isPending ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
