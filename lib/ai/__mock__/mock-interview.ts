// Day-2 placeholder for AI Integration's mock-interview workflow.
//
// WHY: The mock-interview API is multi-turn. Backend Core's route owns the
// transcript envelope, but the next-question text is the workflow's output.
// The mock here mirrors the prototype's opener/follow-up/wrap rotation so
// Frontend Agent can drive a realistic conversation flow before AI
// Integration's real workflow lands.

import type { MockInterviewInput, MockInterviewRawOutput } from '@/contracts/ai';

const OPENERS = [
  'Thanks for making the time. To start: walk me through your most relevant experience for this role.',
  'Tell me about the most impactful project you have shipped that maps to what we are hiring for.',
  'What drew you to this opening specifically?',
];

const FOLLOWUPS = [
  'Good. Drill into the trickiest part of that. What broke and how did you handle it?',
  'Walk me through how you decided the scope. What did you cut?',
  'Tell me about a stakeholder who pushed back. What was the disagreement and how did it resolve?',
  'What would you do differently if you had to do that work again?',
  'How did you measure success? Who saw the metric?',
];

const WRAP = "That covers what I had. We'll be in touch.";

function openerIndexFor(applicationId: string): number {
  let h = 0;
  for (let i = 0; i < applicationId.length; i++) {
    h = (h * 31 + applicationId.charCodeAt(i)) >>> 0;
  }
  return h % OPENERS.length;
}

export async function runMockInterview(
  input: MockInterviewInput,
): Promise<MockInterviewRawOutput> {
  const transcript = input.transcript ?? [];
  const userTurns = transcript.filter((t) => t.role === 'user').length;

  if (transcript.length === 0) {
    return { next: OPENERS[openerIndexFor(input.application.id)], done: false };
  }
  if (userTurns >= 10) {
    return { next: WRAP, done: true };
  }
  return { next: FOLLOWUPS[userTurns % FOLLOWUPS.length], done: false };
}
