// Day-2 placeholder for AI Integration's document-generation workflows.
//
// WHY: Resume / cover-letter / 90-day / dossier all share the same response
// shape (`{ body: string }`) per contracts/ai.ts. Backend Core handlers call
// each workflow function regardless of whether AI Integration has shipped
// the real implementation yet, so Day 2 ships a deterministic mock that
// renders contract-shape Markdown from the application context.

import type {
  CoverLetterInput,
  CoverLetterRawOutput,
  DossierInput,
  DossierRawOutput,
  NinetyDayInput,
  NinetyDayRawOutput,
  ResumeInput,
  ResumeRawOutput,
} from '@/contracts/ai';

const MIN_BODY = 100;

// pad ensures the rendered body clears the contract's `body: z.string().min(100)`
// bound even on near-empty application context — without it a low-information
// row would surface as a contract validation error inside the handler rather
// than at AI Integration's eventual real workflow.
function pad(body: string): string {
  if (body.length >= MIN_BODY) return body;
  return `${body}\n\n${'_'.repeat(MIN_BODY - body.length)}`;
}

export async function runResume(input: ResumeInput): Promise<ResumeRawOutput> {
  const { skillsDB, application } = input;
  const role = application?.role ?? skillsDB.headline ?? 'Role';
  const company = application?.company ? ` (targeting ${application.company})` : '';
  const skills = [
    ...(skillsDB.coreSkills ?? []).slice(0, 8),
    ...(skillsDB.tools ?? []).slice(0, 8),
  ].join(' · ');
  const body = `# ${skillsDB.fullName || 'Candidate'}
${role}${company}

## Summary
${skillsDB.positioning || 'Engineer with cross-functional delivery experience.'}

## Skills
${skills || '(no skills recorded yet)'}
`;
  return { body: pad(body) };
}

export async function runCoverLetter(
  input: CoverLetterInput,
): Promise<CoverLetterRawOutput> {
  const { skillsDB, application, customNotes } = input;
  const body = `# Cover Letter

Dear ${application.company || 'team'} hiring team,

I'm writing about the ${application.role || 'open'} role. ${skillsDB.positioning || 'I build software that maps to business outcomes.'}

${customNotes ?? ''}

Sincerely,
${skillsDB.fullName || 'Candidate'}
`;
  return { body: pad(body) };
}

export async function runNinetyDay(
  input: NinetyDayInput,
): Promise<NinetyDayRawOutput> {
  const { application } = input;
  const body = `# 90-Day Plan: ${application.role || 'Target role'} at ${application.company || 'Company'}

## Days 1-30 - Learn the system
- Map stakeholders, tooling, and the active backlog
- Sit in on team ceremonies and shadow current owners

## Days 31-60 - Earn the room
- Lead one cross-functional initiative end to end
- Establish a measurement baseline

## Days 61-90 - Compound
- Take ownership of one durable system
- Document a roadmap for the next two quarters
`;
  return { body: pad(body) };
}

export async function runDossier(input: DossierInput): Promise<DossierRawOutput> {
  const { application } = input;
  const company = application.company || 'Company';
  const body = `# ${company} Dossier

## What they do
[mock-dossier] Production builds will populate this section with web-search-grounded research.

## How they make money
[mock-dossier] Revenue lines and pricing posture.

## Recent signals
- [mock-dossier] Recent news and leadership changes
- [mock-dossier] Product launches in the last 12 months

## Likely priorities for this role
[mock-dossier] Inferred from the JD and the company's current situation.

## Smart questions to ask
- [mock-dossier] About strategy
- [mock-dossier] About the team
- [mock-dossier] About success metrics
`;
  return { body: pad(body) };
}
