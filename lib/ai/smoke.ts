// Live smoke harness — one call per workflow against the real Anthropic
// SDK. Runs only when AI_MODE=live and ANTHROPIC_API_KEY is present.
//
// Invocation: `pnpm test:ai:live` (the package.json script sets AI_MODE=live
// and runs this file under tsx). The harness exits non-zero on the first
// failure so CI / a developer pre-merge run can see exactly which workflow
// broke.
//
// This file is the one and only place in the AI namespace that reads the
// key from process.env — production paths take the key as a function
// argument (forwarded from the BYOK request header).

import {
  alignment,
  coverLetter,
  dossier,
  mockInterview,
  ninetyDay,
  resume,
  skillsIngest,
} from './index';
import type {
  AlignmentInput,
  CoverLetterInput,
  DossierInput,
  IngestInput,
  MockInterviewInput,
  NinetyDayInput,
  ResumeInput,
} from '@/contracts/ai';
import type { Application, SkillsDB } from '@/contracts/models';

function fakeSkillsDB(): SkillsDB {
  return {
    id: 'smoke_skills',
    ownerId: 'smoke_user',
    fullName: 'Smoke Candidate',
    headline: 'Senior software engineer',
    positioning: 'Internal tools engineer with a record of measurable ops lift.',
    contact: {
      email: 'smoke@example.com',
      location: 'Remote',
    },
    targetRoles: ['Senior Software Engineer'],
    awards: [],
    jobs: [
      {
        id: 'J01',
        employer: 'Example Co',
        title: 'Senior Engineer',
        startDate: '2022-01',
        endDate: undefined,
        location: 'Remote',
        industry: 'SaaS',
        summary: 'Owned the internal pipeline rewrite.',
        projects: [
          {
            id: 'P01',
            name: 'Pipeline rewrite',
            problem: 'Daily ETL job took 8 hours and was unreliable.',
            actions: ['Profiled the slow stages', 'Rewrote in streaming'],
            result: 'Reduced runtime to 45 minutes and eliminated failures.',
            metrics: { runtime: '45 minutes', failures: '0 in 90 days' },
            scope: 'Owned end-to-end',
            skills: ['Python', 'SQL'],
            tools: ['Airflow', 'dbt'],
            methods: ['Profiling', 'Streaming'],
            domain: 'data engineering',
            keywords: ['ETL', 'reliability'],
            recency: 5,
            relevance: ['analytics'],
            confidence: 0.9,
          },
        ],
      },
    ],
    coreSkills: ['Python', 'SQL', 'TypeScript', 'distributed systems'],
    tools: ['Airflow', 'dbt', 'Postgres'],
    methods: ['Profiling', 'Streaming', 'Code review'],
    domains: ['data engineering'],
    keywords: ['ETL', 'reliability', 'observability'],
    updatedAt: new Date().toISOString(),
  };
}

function fakeApplication(): Application {
  return {
    id: 'smoke_app',
    ownerId: 'smoke_user',
    company: 'Stripe',
    role: 'Senior Software Engineer',
    remote: true,
    status: 'researching',
    jobDescription:
      'We are hiring a senior engineer to own the developer-tooling surface for our payments platform. You will partner with payments infra teams to reduce on-call load and improve observability across the request path.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function runOne<T>(label: string, fn: () => Promise<T>): Promise<void> {
  const t0 = Date.now();
  try {
    const out = await fn();
    const ms = Date.now() - t0;
    const preview =
      typeof out === 'object' && out !== null
        ? JSON.stringify(out).slice(0, 120)
        : String(out).slice(0, 120);
    process.stdout.write(`  [ok ${ms}ms] ${label} → ${preview}...\n`);
  } catch (err) {
    const ms = Date.now() - t0;
    process.stderr.write(`  [FAIL ${ms}ms] ${label}: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    process.stderr.write('smoke: ANTHROPIC_API_KEY not set; refusing to run.\n');
    process.exit(2);
  }
  if (process.env.AI_MODE !== 'live') {
    process.stderr.write('smoke: AI_MODE must be "live" (got: ' + (process.env.AI_MODE ?? '<unset>') + ').\n');
    process.exit(2);
  }

  const skillsDB = fakeSkillsDB();
  const application = fakeApplication();
  const opts = { apiKey };

  process.stdout.write('smoke: running one call per workflow...\n');

  const alignmentInput: AlignmentInput = {
    skillsDB,
    jobDescription: application.jobDescription ?? '',
  };
  await runOne('alignment', () => alignment(alignmentInput, opts));

  const resumeInput: ResumeInput = { skillsDB, application };
  await runOne('resume', () => resume(resumeInput, opts));

  const coverInput: CoverLetterInput = { skillsDB, application };
  await runOne('coverLetter', () => coverLetter(coverInput, opts));

  const ninetyInput: NinetyDayInput = { skillsDB, application };
  await runOne('ninetyDay', () => ninetyDay(ninetyInput, opts));

  const dossierInput: DossierInput = { application };
  await runOne('dossier', () => dossier(dossierInput, opts));

  const mockInput: MockInterviewInput = {
    application,
    stories: [],
    transcript: [],
  };
  await runOne('mockInterview', () => mockInterview(mockInput, opts));

  const ingestInput: IngestInput = {
    resumeText:
      'Jane Doe\nSenior Engineer\n\nExample Co — Senior Engineer (2022 - present)\n- Rewrote ETL pipeline; runtime 8h to 45m.',
  };
  await runOne('skillsIngest', () => skillsIngest(ingestInput, opts));

  process.stdout.write('smoke: all workflows succeeded.\n');
}

main().catch((err) => {
  process.stderr.write(`smoke: unexpected error: ${(err as Error).message}\n`);
  process.exit(1);
});
