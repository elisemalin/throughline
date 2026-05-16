// Live smoke harness — one call per workflow against the real Anthropic
// SDK. Runs only when AI_MODE=live and ANTHROPIC_API_KEY is present.
//
// Invocation: `pnpm test:ai:live` (the package.json script sets AI_MODE=live
// and runs this file under tsx). The harness exits non-zero on the first
// failure so CI / a developer pre-merge run can see exactly which workflow
// broke.
//
// Each successful call writes a golden fixture to
// `tests/ai/fixtures/live/<workflow>.json` so future prompt edits have a
// real-world comparison point. Fixtures are git-tracked; rerunning the
// smoke overwrites them, and a fixture diff in CR signals that the
// SYSTEM-prompt change altered model output.
//
// This file is the one and only place in the AI namespace that reads the
// key from process.env — production paths take the key as a function
// argument (forwarded from the BYOK request header).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  alignment,
  coverLetter,
  dossier,
  mockInterview,
  ninetyDay,
  resume,
  skillsIngest,
} from './index';
import { getCacheStats, resetCacheStats } from './cache';
import { getCostStats, resetCostStats } from './cost';
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

const FIXTURES_DIR = resolve(process.cwd(), 'tests/ai/fixtures/live');

function writeFixture(label: string, value: unknown): void {
  const path = resolve(FIXTURES_DIR, `${label}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

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
    writeFixture(label, out);
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

  resetCacheStats();
  resetCostStats();
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

  // Wrap-up calibration: the mock fixture sets done=true at >= 10 user
  // turns. Verify the live model's behavior against the same threshold.
  // The captured fixture records whether done flipped at turn 10; if not,
  // adjust either the SYSTEM (Architect-only proposal) or the mock fixture.
  const calibrationTranscript: MockInterviewInput['transcript'] = [];
  for (let i = 0; i < 10; i += 1) {
    calibrationTranscript.push({
      role: 'interviewer',
      text: `Question ${i + 1}: tell me about the pipeline rewrite project — specifically the part about ${
        ['scoping', 'metrics', 'pushback', 'tradeoffs', 'rollback plan', 'team buy-in', 'profiling', 'streaming choice', 'reliability target', 'team writeup'][i]
      }.`,
    });
    calibrationTranscript.push({
      role: 'user',
      text: `Answer ${i + 1}: I led the work end-to-end. We profiled the slow stages, switched to streaming, and reduced runtime from 8 hours to 45 minutes with zero failures over 90 days.`,
    });
  }
  const calibInput: MockInterviewInput = {
    application,
    stories: [],
    transcript: calibrationTranscript,
  };
  await runOne('mockInterview-calibration-10turns', () => mockInterview(calibInput, opts));

  const ingestInput: IngestInput = {
    resumeText:
      'Jane Doe\nSenior Engineer\n\nExample Co — Senior Engineer (2022 - present)\n- Rewrote ETL pipeline; runtime 8h to 45m.',
  };
  await runOne('skillsIngest', () => skillsIngest(ingestInput, opts));

  // Ambiguous-resume calibration for the new warnings field. The resume
  // below packs four parse ambiguities into one input (missing end date
  // on a current role, duplicate skill entries, quarter-format dates,
  // many roles); the captured fixture lets the Architect see what kinds
  // of warnings the live model actually emits.
  const ambiguousIngestInput: IngestInput = {
    resumeText: [
      'Jane Doe',
      'Senior Engineer',
      '',
      'Skills: Python, Python, TypeScript, SQL, Python, SQL, TypeScript',
      '',
      'Acme Co — Senior Engineer',
      '2022-01 — Present',
      '- Owned ETL rewrite.',
      '',
      'Widgets Inc — PM',
      'Q3 2024 — Q1 2025',
      '- Launched discovery flow.',
      '',
      'Foo Corp — Engineer',
      '2019 — 2021 (dates approximate)',
      '- Built internal tools.',
    ].join('\n'),
  };
  await runOne('skillsIngest-ambiguous', () => skillsIngest(ambiguousIngestInput, opts));

  const cache = getCacheStats();
  const cost = getCostStats();
  process.stdout.write(
    `smoke: all workflows succeeded. cache — hits:${cache.hits} misses:${cache.misses} sets:${cache.sets}\n`,
  );
  process.stdout.write(`smoke: cost report (per workflow × model):\n`);
  for (const [key, entry] of Object.entries(cost.byWorkflow)) {
    const usd = entry.usd.toFixed(4);
    process.stdout.write(
      `  ${key.padEnd(40)} in:${entry.inputTokens.toString().padStart(7)} out:${entry.outputTokens.toString().padStart(6)} calls:${entry.calls}  ~$${usd}\n`,
    );
  }
  process.stdout.write(`  TOTAL                                     ~$${cost.totalUsd.toFixed(4)}\n`);
  writeFixture('_cost-report', { ...cost, capturedAt: new Date().toISOString() });
  process.stdout.write(`smoke: golden fixtures + cost report written to ${FIXTURES_DIR}\n`);
}

main().catch((err) => {
  process.stderr.write(`smoke: unexpected error: ${(err as Error).message}\n`);
  process.exit(1);
});
