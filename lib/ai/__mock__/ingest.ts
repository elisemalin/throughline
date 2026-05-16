// Day-2 placeholder for AI Integration's skills-ingest workflow.
//
// WHY: AI Integration owns parsing resume/LinkedIn text into a structured
// SkillsDB shape. The Day-2 mock returns a contract-shape IngestRawOutput
// with empty arrays and a single warning, which is enough for Backend Core
// to exercise its persistence + Zod validation path. The real workflow
// will replace this file path on the AI Integration PR.

import type { IngestInput, IngestRawOutput } from '@/contracts/ai';

export async function runIngest(_input: IngestInput): Promise<IngestRawOutput> {
  void _input;
  return {
    fullName: '',
    headline: '',
    positioning: '',
    contact: {
      email: undefined,
      phone: undefined,
      location: undefined,
      linkedin: undefined,
      site: undefined,
    },
    targetRoles: [],
    awards: [],
    jobs: [],
    coreSkills: [],
    tools: [],
    methods: [],
    domains: [],
    keywords: [],
  };
}

// The mock additionally surfaces a single warning so the handler's response
// envelope (`{ skillsDB, warnings }`) is exercised end-to-end at the API
// boundary. AI Integration's real workflow returns warnings inline; the
// handler reads them from the workflow function's return value rather than
// fabricating a fixed list.
export const MOCK_INGEST_WARNINGS = [
  'mock-ingest: no parsing performed during sprint',
] as const;
