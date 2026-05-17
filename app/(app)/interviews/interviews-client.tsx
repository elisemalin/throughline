'use client';

// Ported from prototype/Throughline.jsx InterviewView (lines 2940-3150) and
// InterviewPrepModal (lines 3161-3357). Day 2 surface: pick an application,
// chat with the mock interviewer, and let users see the STAR-style stories
// derived from their Skills DB.

import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import {
  Button,
  Card,
  Field,
  Ornament,
  Pill,
  RouteHeader,
  SectionLabel,
  Textarea,
} from '@/components';
import type { MockInterviewTurn } from '@/contracts/api';
import { useApplications } from '@/lib/queries/useApplications';
import { useMockInterviewTurn } from '@/lib/queries/useMockInterview';
import { useSkills } from '@/lib/queries/useSkills';
import { useToastStore } from '@/stores/useToastStore';

type Tab = 'mock' | 'stories';

export function InterviewsClient() {
  const { data: appsData } = useApplications();
  const { data: skillsData } = useSkills();
  const turn = useMockInterviewTurn();
  const pushToast = useToastStore((s) => s.push);

  const applications = appsData?.applications ?? [];
  const skillsDB = skillsData?.skillsDB ?? null;

  const [tab, setTab] = useState<Tab>('mock');
  const [applicationId, setApplicationId] = useState<string>('');
  const [transcript, setTranscript] = useState<MockInterviewTurn[]>([]);
  const [draft, setDraft] = useState('');

  async function startSession(id: string) {
    setApplicationId(id);
    setTranscript([]);
    setDraft('');
    try {
      const result = await turn.mutateAsync({ applicationId: id, transcript: [] });
      setTranscript([result.next]);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Could not start interview.',
        'error',
      );
    }
  }

  async function sendUserTurn() {
    if (!applicationId || draft.trim().length === 0) return;
    const next: MockInterviewTurn = { role: 'user', text: draft.trim() };
    const updated = [...transcript, next];
    setTranscript(updated);
    setDraft('');
    try {
      const result = await turn.mutateAsync({ applicationId, transcript: updated });
      setTranscript([...updated, result.next]);
      if (result.done) {
        pushToast('Interview complete.', 'success');
      }
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Interviewer is unavailable.',
        'error',
      );
    }
  }

  // Derive a STAR story from each project so candidates can rehearse from
  // the same data the resume pulls. The prototype's storyEngine did this
  // inline; we keep the derivation client-side because Stories is read-only.
  const stories =
    skillsDB?.jobs.flatMap((job) =>
      job.projects.slice(0, 2).map((project) => ({
        id: `${job.id}-${project.id}`,
        title: project.name,
        employer: job.employer,
        situation: project.problem || 'Context not captured yet.',
        task: project.scope || 'Scope not captured yet.',
        action: project.actions[0] ?? 'Action not captured yet.',
        result: project.result || 'Result not captured yet.',
        skills: project.skills.slice(0, 4),
      })),
    ) ?? [];

  return (
    <div className="space-y-10">
      <RouteHeader
        section="§06"
        name="INTERVIEWS"
        title="Interviews"
        sub="Practice with the mock interviewer or rehearse the STAR stories your Skills DB generates."
      />

      <div className="flex gap-1 border-b-2 border-stone-800" role="tablist" aria-label="Interview tab">
        {(['mock', 'stories'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`relative font-mono text-xs uppercase tracking-[0.1em] px-4 py-2.5 transition-colors -mb-[2px] border-b-2 ${
              tab === t ? 'text-amber-200 border-amber-200' : 'text-stone-600 border-transparent hover:text-stone-300'
            }`}
          >
            {t === 'mock' ? 'Mock interview' : 'Stories'}
          </button>
        ))}
      </div>

      {tab === 'mock' && (
        <div className="space-y-4">
          <Card className="p-5">
            <SectionLabel>Pick an application</SectionLabel>
            {applications.length === 0 ? (
              <p className="text-stone-500 text-sm py-3">
                Add an application from the Tracker first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {applications.map((a) => (
                  <Button
                    key={a.id}
                    size="sm"
                    variant={a.id === applicationId ? 'primary' : 'secondary'}
                    onClick={() => startSession(a.id)}
                    data-testid={`interview-pick-${a.id}`}
                  >
                    {a.company} · {a.role}
                  </Button>
                ))}
              </div>
            )}
          </Card>

          {applicationId && (
            <Card className="p-5">
              <SectionLabel>Transcript</SectionLabel>
              {transcript.length === 0 ? (
                <p className="text-stone-500 text-sm py-3">
                  Waiting for the interviewer to open...
                </p>
              ) : (
                <ul className="space-y-3 mb-4">
                  {transcript.map((t, i) => (
                    <li
                      key={i}
                      className={`text-sm leading-relaxed ${
                        t.role === 'interviewer' ? 'text-stone-200' : 'text-amber-100'
                      }`}
                    >
                      <span className="label-mono text-stone-500 mr-2">
                        [ {t.role === 'interviewer' ? 'INTERVIEWER' : 'YOU'} ]
                      </span>
                      {t.text}
                    </li>
                  ))}
                </ul>
              )}
              <Field label="Your turn">
                <Textarea
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type your response..."
                />
              </Field>
              <div className="flex justify-end mt-3">
                <Button
                  size="sm"
                  onClick={sendUserTurn}
                  disabled={turn.isPending || draft.trim().length === 0}
                  data-testid="interview-send"
                >
                  <Send size={13} aria-hidden /> {turn.isPending ? 'Thinking...' : 'Send'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'stories' && (
        <>
          {stories.length === 0 ? (
            <Card className="px-8 py-14 text-center space-y-5">
              <MessageSquare size={28} className="text-amber-200/70 mx-auto" aria-hidden />
              <p className="display-xl text-2xl md:text-3xl text-stone-50 max-w-md mx-auto">
                Add a project to your Skills DB.
              </p>
              <p className="font-mono text-xs text-stone-500 max-w-sm mx-auto">
                [ THE STORIES WRITE THEMSELVES ]
              </p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {stories.map((story) => (
                <li key={story.id}>
                  <Card className="p-5">
                    <div className="flex items-baseline gap-3 flex-wrap mb-2">
                      <div className="text-base text-stone-50 font-sans font-bold uppercase tracking-[-0.01em]">
                        {story.title}
                      </div>
                      <div className="label-mono text-stone-500">[ {story.employer} ]</div>
                    </div>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-stone-300">
                      <div>
                        <dt className="label-mono text-stone-400">
                          Situation
                        </dt>
                        <dd>{story.situation}</dd>
                      </div>
                      <div>
                        <dt className="label-mono text-stone-400">
                          Task
                        </dt>
                        <dd>{story.task}</dd>
                      </div>
                      <div>
                        <dt className="label-mono text-stone-400">
                          Action
                        </dt>
                        <dd>{story.action}</dd>
                      </div>
                      <div>
                        <dt className="label-mono text-stone-400">
                          Result
                        </dt>
                        <dd>{story.result}</dd>
                      </div>
                    </dl>
                    {story.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {story.skills.map((s) => (
                          <Pill key={s}>{s}</Pill>
                        ))}
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
