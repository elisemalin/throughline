// contracts/ai.ts
//
// AI workflow contracts: system prompts, input shapes, response Zod schemas,
// retry/cache policy. AI Integration Agent owns the implementation under
// /lib/ai/*; Backend Core consumes the typed exports.
//
// Every workflow has the same shape:
//   - SYSTEM prompt string (constant)
//   - Input type (TS)
//   - Response Zod schema (validates the model's structured output)
//   - Response type (derived from schema)
//
// Implementation contract for /lib/ai/<workflow>.ts:
//   - One retry on validation failure with the error text appended to system
//   - Cache by SHA-256 of (system + user prompt + model) with 24h TTL
//   - Model defaults to MODEL_DEFAULT below
//   - mockInterview is multi-turn; others are one-shot

import { z } from 'zod';
import type { Application, SkillsDB, Story } from './models';

// ---------------------------------------------------------------------------
// Model selection
// ---------------------------------------------------------------------------

export const MODEL_DEFAULT = 'claude-sonnet-4-5' as const;
export const MODEL_INGEST_FALLBACK = 'claude-opus-4-7' as const;
// Skills ingest can retry against Opus on validation failure because parsing
// noisy resume text benefits from the larger model.

// ---------------------------------------------------------------------------
// Retry / cache constants
// ---------------------------------------------------------------------------

export const RETRY_ON_VALIDATION_FAILURE = 1 as const;
export const CACHE_TTL_SECONDS = 60 * 60 * 24;            // 24h

// ---------------------------------------------------------------------------
// Alignment
// ---------------------------------------------------------------------------

export const ALIGNMENT_SYSTEM = `You are an internal recruiter and ATS analyst. Your job is to evaluate how well a candidate's structured skills database matches a target job description. You return a strict JSON object only — no prose outside JSON.

Score each requirement extracted from the job description on a 0-10 strength scale, classify it as strong/partial/missing relative to the candidate's evidence, and provide a single line of evidence and a recommendation for each. The overall score is a 0-100 integer reflecting the share of strong+partial requirements weighted by strength.

Be honest: if the candidate is a weak fit, say so. Do not inflate scores. Recommendations should be specific, actionable, and grounded in the candidate's actual experience.

Return JSON matching the schema. No extra fields.`;

export type AlignmentInput = {
  skillsDB: SkillsDB;
  jobDescription: string;
};

export const AlignmentRawSchema = z.object({
  score: z.number().int().min(0).max(100),
  requirements: z
    .array(
      z.object({
        requirement: z.string(),
        strength: z.number().min(0).max(10),
        type: z.enum(['strong', 'partial', 'missing']),
        evidence: z.string(),
        recommendation: z.string(),
      }),
    )
    .min(1)
    .max(30),
  missingKeywords: z.array(z.string()).max(20),
  recommendation: z.string(),
});
export type AlignmentRawOutput = z.infer<typeof AlignmentRawSchema>;

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

export const RESUME_SYSTEM = `You generate a tailored resume in Markdown for the candidate, targeting a specific role and company when provided. You pull only from the structured skills database — never invent experience.

Structure: name and contact header, one-sentence positioning summary, skills line, then experience entries with bulleted project results. Lead each bullet with the outcome (numbers when available), then the action. Match keyword density to the job description without keyword-stuffing.

Length: one page when possible. If the candidate has more than three roles, surface the most recent and most relevant only. Do not include awards unless they are senior/named.

Output: Markdown only. No commentary.`;

export type ResumeInput = {
  skillsDB: SkillsDB;
  application?: Application;
};

export const ResumeRawSchema = z.object({
  body: z.string().min(100),           // markdown
});
export type ResumeRawOutput = z.infer<typeof ResumeRawSchema>;

// ---------------------------------------------------------------------------
// Cover Letter
// ---------------------------------------------------------------------------

export const COVER_LETTER_SYSTEM = `You write a tailored cover letter in Markdown. You pull from the structured skills database and the target application.

Three paragraphs maximum. Open with why this specific role at this specific company. Middle paragraph: one concrete project from the candidate's history that maps to the job's needs, with the outcome. Close with what the candidate would bring on day one.

No filler. No "I'm passionate about." No restating the resume. If the candidate has provided custom notes, weave them in naturally.

Output: Markdown only. No commentary.`;

export type CoverLetterInput = {
  skillsDB: SkillsDB;
  application: Application;
  customNotes?: string;
};

export const CoverLetterRawSchema = z.object({
  body: z.string().min(100),
});
export type CoverLetterRawOutput = z.infer<typeof CoverLetterRawSchema>;

// ---------------------------------------------------------------------------
// 90-day plan
// ---------------------------------------------------------------------------

export const NINETY_DAY_SYSTEM = `You write a 90-day plan in Markdown for a candidate targeting a specific role. Structure: three sections (Days 1-30 Learn, Days 31-60 Earn, Days 61-90 Compound), each with 3-5 specific bullets.

Bullets should be specific to the role and company from the application context. Reference systems, teams, or workflows that exist at the company when known. Avoid platitudes ("learn the codebase"); name what would be learned ("map the data pipeline from intake to enrichment to API").

If the job description provides specific technologies or systems, anchor the plan to them. If not, anchor to the role title and industry inferred from the company.

Output: Markdown only. No commentary.`;

export type NinetyDayInput = {
  skillsDB: SkillsDB;
  application: Application;
};

export const NinetyDayRawSchema = z.object({
  body: z.string().min(100),
});
export type NinetyDayRawOutput = z.infer<typeof NinetyDayRawSchema>;

// ---------------------------------------------------------------------------
// Dossier (with web search)
// ---------------------------------------------------------------------------

export const DOSSIER_SYSTEM = `You write a research dossier in Markdown for a candidate preparing for an interview at a specific company. Use the web_search tool to ground every factual claim in a real, recent source.

Sections (each 1-3 paragraphs):
1. What they do — products, business model, customer segments
2. How they make money — revenue lines, pricing posture
3. Recent signals — news, leadership changes, strategic shifts in the last 12 months
4. Likely priorities for this role — inferred from the job description and the company's current situation
5. Smart questions to ask — five questions, grouped by strategy / team / success metrics

Cite sources inline as Markdown links. Do not invent facts. If web search returns nothing useful for a section, write "[insufficient public information]" rather than fabricating.

Output: Markdown only. No commentary outside the dossier.`;

export type DossierInput = {
  application: Application;
};

export const DossierRawSchema = z.object({
  body: z.string().min(100),
});
export type DossierRawOutput = z.infer<typeof DossierRawSchema>;

// ---------------------------------------------------------------------------
// Mock Interview (multi-turn)
// ---------------------------------------------------------------------------

export const MOCK_INTERVIEW_SYSTEM = `You are conducting a realistic interview for the role described in the application context. You are NOT a coach. You ask one question at a time, listen, and follow up.

Behavior:
- Ask questions a real interviewer at this company / role would ask. Use the job description and the candidate's stories as context.
- Follow up on weak or vague answers. Drill into specifics: "what specifically", "how did you measure", "who pushed back".
- Mix question types: behavioral STAR, technical depth, situational judgment, role-specific scenarios.
- Don't soften. Don't compliment. Don't reveal what you're looking for.
- One turn = one question. Keep it under 200 characters when possible.

Output: a single interviewer message string. No JSON, no metadata.`;

export type MockInterviewInput = {
  application: Application;
  stories: Story[];                    // derived from SkillsDB
  transcript: Array<{ role: 'interviewer' | 'user'; text: string }>;
};

export const MockInterviewRawSchema = z.object({
  next: z.string().min(1).max(2_000),
});
export type MockInterviewRawOutput = z.infer<typeof MockInterviewRawSchema>;

// ---------------------------------------------------------------------------
// Skills DB Ingest
// ---------------------------------------------------------------------------

export const INGEST_SYSTEM = `You parse resume text and LinkedIn export into a structured Skills Database. You return strict JSON matching the schema — no prose outside JSON.

Extract:
- Full name, headline, positioning statement (write a 1-2 sentence positioning if none is explicit)
- Contact: email, phone, location, linkedin URL, personal site
- Target roles (best guess from headline/positioning if not explicit)
- Awards (explicit awards or "Employee of the Year"-style honors only)
- Jobs (employer, title, dates, location, industry, summary)
- Projects under each job (problem/actions/result/metrics — write STAR-style)
- Aggregated skills, tools, methods, domains, keywords across all roles

Rules:
- Never invent experience. If a section is missing, return an empty array or empty string.
- Dates are YYYY-MM. Use '' for endDate on current roles.
- For projects: if the resume has bullet points but no problem/result framing, infer the problem from the bullet and put the bullet itself as the result.
- Metrics: extract numbers found in bullets ("25,000 employees", "reduced 4000 hours") into the metrics object.
- recency: 1-5 where 5 is current. relevance: tag with 'frontend', 'fullstack', 'leadership', 'analytics', 'design', etc.
- confidence: 0.0-1.0 reflecting how well the source text supported your extraction.

Return JSON matching the schema. No extra fields.`;

export type IngestInput = {
  resumeText: string;
  linkedinText?: string;
};

// Mirrors SkillsDB shape from models.ts, but as a Zod validator the AI
// returns are validated against. id/ownerId/updatedAt are added server-side.
export const IngestRawSchema = z.object({
  fullName: z.string(),
  headline: z.string(),
  positioning: z.string(),
  contact: z.object({
    email: z.string(),
    phone: z.string().optional().default(''),
    location: z.string().optional().default(''),
    linkedin: z.string().optional().default(''),
    site: z.string().optional().default(''),
  }),
  targetRoles: z.array(z.string()).default([]),
  awards: z.array(z.string()).default([]),
  jobs: z
    .array(
      z.object({
        id: z.string(),
        employer: z.string(),
        title: z.string(),
        startDate: z.string(),
        endDate: z.string().default(''),
        location: z.string().default(''),
        industry: z.string().default(''),
        summary: z.string().default(''),
        projects: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              problem: z.string(),
              actions: z.array(z.string()).default([]),
              result: z.string(),
              metrics: z.record(z.string()).default({}),
              scope: z.string().optional(),
              skills: z.array(z.string()).default([]),
              tools: z.array(z.string()).default([]),
              methods: z.array(z.string()).default([]),
              domain: z.string().default(''),
              keywords: z.array(z.string()).default([]),
              recency: z.number().min(1).max(5).default(3),
              relevance: z.array(z.string()).default([]),
              confidence: z.number().min(0).max(1).default(0.5),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
  coreSkills: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  methods: z.array(z.string()).default([]),
  domains: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});
export type IngestRawOutput = z.infer<typeof IngestRawSchema>;
