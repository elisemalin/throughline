// Test fakes: Anthropic SDK stub + cache fake.
//
// The Anthropic stub mimics the surface area we use — `messages.create` —
// and lets each test specify the sequence of responses. Capturing the
// `system` and `messages[0].content` from each call lets assertions
// verify both the SECURITY_PREAMBLE pass-through and the wrapUntrusted
// tag presence on every call.

import type Anthropic from '@anthropic-ai/sdk';
import type { Application, SkillsDB } from '@/contracts/models';

export type FakeCall = {
  system: string;
  user: string;
  model: string;
  tools?: unknown;
};

export type FakeClient = Anthropic & { calls: FakeCall[]; remaining: number };

type Response = { text: string };

// Build a fake client that returns each entry in `responses` for
// successive `messages.create` calls. Throws after the queue empties so a
// test that under-counts SDK calls fails loudly instead of pulling a
// `undefined` response.
export function makeFakeClient(responses: Response[]): FakeClient {
  const calls: FakeCall[] = [];
  const queue = responses.slice();
  const client = {
    calls,
    get remaining(): number {
      return queue.length;
    },
    messages: {
      create: async (params: {
        system: string;
        messages: Array<{ role: string; content: string }>;
        model: string;
        tools?: unknown;
      }) => {
        calls.push({
          system: params.system,
          user: params.messages[0].content,
          model: params.model,
          tools: params.tools,
        });
        const next = queue.shift();
        if (!next) {
          throw new Error(`fake client exhausted after ${calls.length} call(s)`);
        }
        return {
          id: 'msg_fake',
          type: 'message',
          role: 'assistant',
          model: params.model,
          content: [{ type: 'text', text: next.text }],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      },
    },
  };
  return client as unknown as FakeClient;
}

// In-memory cache fake matching the shape lib/ai/cache.ts expects.
export type FakeCacheStore = Map<string, string>;
export function makeFakeCache(store: FakeCacheStore = new Map()) {
  return {
    store,
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string, _opts: { ex: number }) => {
      store.set(key, value);
      return 'OK';
    },
  };
}

// Minimal SkillsDB / Application factories for tests. Each starts from a
// schema-valid baseline so a test that only mutates one field still parses
// through the strict validators.
export function fakeSkillsDB(over: Partial<SkillsDB> = {}): SkillsDB {
  return {
    id: 'skills_test',
    ownerId: 'user_test',
    fullName: 'Test Candidate',
    headline: 'Senior Engineer',
    positioning: 'Test positioning.',
    contact: { email: 'test@example.com' },
    targetRoles: ['Senior Engineer'],
    awards: [],
    jobs: [],
    coreSkills: ['typescript', 'react'],
    tools: ['next.js'],
    methods: [],
    domains: [],
    keywords: ['platform'],
    updatedAt: '2026-05-16T00:00:00.000Z',
    ...over,
  };
}

export function fakeApplication(over: Partial<Application> = {}): Application {
  return {
    id: 'app_test',
    ownerId: 'user_test',
    company: 'Acme',
    role: 'Senior Engineer',
    remote: true,
    status: 'researching',
    jobDescription:
      'We are hiring for a Senior Engineer. Required: TypeScript, React, distributed systems.',
    createdAt: '2026-05-16T00:00:00.000Z',
    updatedAt: '2026-05-16T00:00:00.000Z',
    ...over,
  };
}
