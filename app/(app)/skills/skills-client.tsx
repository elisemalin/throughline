'use client';

// Ported from prototype/Throughline.jsx SkillsView (lines 1183-1559).
// Day 3: full inline editing — JobModal + ProjectModal wired through
// useUpdateSkills, plus delete confirmations and the existing import flow.

import { useState } from 'react';
import { Edit3, Plus, Target, Trash2, Upload } from 'lucide-react';
import {
  Button,
  Card,
  Field,
  JOB_LIMIT,
  JobModal,
  Modal,
  Pill,
  PROJECT_LIMIT,
  ProjectModal,
  SectionLabel,
  Textarea,
} from '@/components';
import type { Job, Project } from '@/contracts/models';
import { useIngestSkills, useSkills, useUpdateSkills } from '@/lib/queries/useSkills';
import { useToastStore } from '@/stores/useToastStore';

type ProjectEditing = { jobId: string; project: Project };

export function SkillsClient() {
  const { data, isLoading } = useSkills();
  const ingest = useIngestSkills();
  const update = useUpdateSkills();
  const pushToast = useToastStore((s) => s.push);

  const [importOpen, setImportOpen] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [linkedinText, setLinkedinText] = useState('');

  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectContext, setProjectContext] = useState<{ job: Job; project: Project | null } | null>(
    null,
  );

  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'job'; job: Job }
    | { kind: 'project'; jobId: string; project: Project }
    | null
  >(null);

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

  function openCreateJob() {
    setEditingJob(null);
    setJobModalOpen(true);
  }

  function openEditJob(job: Job) {
    setEditingJob(job);
    setJobModalOpen(true);
  }

  async function persistJobs(jobs: Job[]) {
    await update.mutateAsync({ jobs });
  }

  async function handleJobSave(job: Job) {
    if (!skillsDB) return;
    const exists = skillsDB.jobs.some((j) => j.id === job.id);
    const nextJobs = exists
      ? skillsDB.jobs.map((j) => (j.id === job.id ? job : j))
      : [...skillsDB.jobs, job];
    try {
      await persistJobs(nextJobs);
      pushToast(exists ? `Updated ${job.title}.` : `Added ${job.title}.`, 'success');
      setJobModalOpen(false);
      setEditingJob(null);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Could not save role.',
        'error',
      );
    }
  }

  async function handleProjectSave(project: Project) {
    if (!skillsDB || !projectContext) return;
    const { job } = projectContext;
    const exists = job.projects.some((p) => p.id === project.id);
    const updatedProjects = exists
      ? job.projects.map((p) => (p.id === project.id ? project : p))
      : [...job.projects, project];
    const nextJobs = skillsDB.jobs.map((j) =>
      j.id === job.id ? { ...j, projects: updatedProjects } : j,
    );
    try {
      await persistJobs(nextJobs);
      pushToast(exists ? `Updated ${project.name}.` : `Added ${project.name}.`, 'success');
      setProjectModalOpen(false);
      setProjectContext(null);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Could not save project.',
        'error',
      );
    }
  }

  async function handleConfirmDelete() {
    if (!skillsDB || !deleteTarget) return;
    try {
      if (deleteTarget.kind === 'job') {
        const nextJobs = skillsDB.jobs.filter((j) => j.id !== deleteTarget.job.id);
        await persistJobs(nextJobs);
        pushToast(`Deleted ${deleteTarget.job.title}.`, 'success');
      } else {
        const nextJobs = skillsDB.jobs.map((j) =>
          j.id === deleteTarget.jobId
            ? { ...j, projects: j.projects.filter((p) => p.id !== deleteTarget.project.id) }
            : j,
        );
        await persistJobs(nextJobs);
        pushToast(`Deleted ${deleteTarget.project.name}.`, 'success');
      }
      setDeleteTarget(null);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Delete failed.',
        'error',
      );
    }
  }

  const jobsCount = skillsDB?.jobs.length ?? 0;
  const atJobLimit = jobsCount >= JOB_LIMIT;

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-3">
          <div className="caption-label text-stone-500">Source of truth</div>
          <h1 className="text-5xl md:text-6xl text-stone-50 font-display tracking-tight leading-[1.05]">
            Skills Database
          </h1>
          <p className="text-stone-400 italic max-w-xl text-sm md:text-base leading-relaxed">
            Every resume, cover letter, and interview pulls from here.
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
          <Button
            size="sm"
            onClick={openCreateJob}
            disabled={atJobLimit}
            data-testid="skills-add-job"
          >
            <Plus size={14} aria-hidden /> Add role
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
            <SectionLabel
              right={
                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">
                  {jobsCount} / {JOB_LIMIT} roles
                </span>
              }
            >
              Roles &amp; projects
            </SectionLabel>
            {skillsDB.jobs.length === 0 ? (
              <Card className="px-8 py-14 text-center space-y-4">
                <p className="text-2xl text-stone-200 font-display tracking-tight max-w-md mx-auto leading-snug">
                  Where does the throughline start?
                </p>
                <p className="text-sm text-stone-500 italic max-w-sm mx-auto">
                  Import a resume, or add a role manually.
                </p>
                <div className="pt-2">
                  <Button size="sm" onClick={openCreateJob}>
                    <Plus size={14} aria-hidden /> Add a role
                  </Button>
                </div>
              </Card>
            ) : (
              <ul className="space-y-2">
                {skillsDB.jobs.map((job) => {
                  const atProjectLimit = job.projects.length >= PROJECT_LIMIT;
                  return (
                    <li key={job.id}>
                      <Card className="p-4 md:p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <div className="text-lg text-stone-100 font-display">
                                {job.title}
                              </div>
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
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditJob(job)}
                              aria-label={`Edit ${job.title}`}
                              className="text-stone-500 hover:text-amber-200 p-1.5 focus-visible:outline-none focus-visible:text-amber-200"
                            >
                              <Edit3 size={14} aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ kind: 'job', job })}
                              aria-label={`Delete ${job.title}`}
                              className="text-stone-500 hover:text-rose-300 p-1.5 focus-visible:outline-none focus-visible:text-rose-300"
                            >
                              <Trash2 size={14} aria-hidden />
                            </button>
                          </div>
                        </div>
                        <ul className="mt-4 space-y-3">
                          {job.projects.map((project) => (
                            <li
                              key={project.id}
                              className="border-l border-stone-800 pl-4 group"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
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
                                </div>
                                <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProjectContext({ job, project });
                                      setProjectModalOpen(true);
                                    }}
                                    aria-label={`Edit ${project.name}`}
                                    className="text-stone-500 hover:text-amber-200 p-1"
                                  >
                                    <Edit3 size={12} aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteTarget({ kind: 'project', jobId: job.id, project })
                                    }
                                    aria-label={`Delete ${project.name}`}
                                    className="text-stone-500 hover:text-rose-300 p-1"
                                  >
                                    <Trash2 size={12} aria-hidden />
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setProjectContext({ job, project: null });
                                setProjectModalOpen(true);
                              }}
                              disabled={atProjectLimit}
                              className="text-xs text-amber-200 hover:text-amber-100 font-mono uppercase tracking-[0.15em] inline-flex items-center gap-1.5 disabled:text-stone-600 disabled:cursor-not-allowed"
                            >
                              <Plus size={12} aria-hidden />
                              {atProjectLimit
                                ? `Project limit (${PROJECT_LIMIT}) reached`
                                : 'Add project'}
                            </button>
                          </li>
                        </ul>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <JobModal
        open={jobModalOpen}
        onClose={() => {
          setJobModalOpen(false);
          setEditingJob(null);
        }}
        editing={editingJob}
        skillsDB={skillsDB}
        onSave={handleJobSave}
        saving={update.isPending}
      />

      <ProjectModal
        open={projectModalOpen}
        onClose={() => {
          setProjectModalOpen(false);
          setProjectContext(null);
        }}
        job={projectContext?.job ?? null}
        editing={projectContext?.project ?? null}
        onSave={handleProjectSave}
        saving={update.isPending}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={
          deleteTarget?.kind === 'job'
            ? `Delete ${deleteTarget.job.title}?`
            : deleteTarget?.kind === 'project'
              ? `Delete ${deleteTarget.project.name}?`
              : ''
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-300">
            {deleteTarget?.kind === 'job'
              ? 'This also deletes every project under this role. This cannot be undone.'
              : 'This project will be removed from the Skills DB. This cannot be undone.'}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={update.isPending}
              data-testid="skills-delete-confirm"
            >
              {update.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

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
