[DECIDED: accept]

# Add `warnings` to `IngestRawSchema`

**Author:** AI Integration Agent
**Date:** 2026-05-16
**Workflow:** `skillsIngest`

## Request

Extend `IngestRawSchema` in `/contracts/ai.ts` with a single new field:

```ts
warnings: z.array(z.string().max(500)).max(20).default([]),
```

Update `INGEST_SYSTEM` to instruct Claude to emit `warnings` alongside the structured Skills DB. Example warning strings: `"could not extract end date for J02"`, `"duplicate skill entries collapsed (Python listed twice)"`, `"resume contained 12 jobs; only the most recent 20 are kept"`.

## Why

- Backend Core's Day-3 PR drops the `MOCK_INGEST_WARNINGS` placeholder exported from `lib/ai/index.ts`. Without `warnings` on the Zod-validated AI response, the `SkillsIngestResponse.warnings` field at the API boundary (`contracts/api.ts: SkillsIngestResponse`) becomes either always-empty or hand-assembled from non-model heuristics. The former hides real parsing issues from the user; the latter is duplicate work.
- The contract already names `warnings` on the API response shape (`contracts/api.ts:234`). Producing it from the model — which has visibility into ambiguous parses, missing dates, normalization decisions — is more accurate than reconstructing it from validator output.
- 20-item ceiling matches the array bounds already used on `SkillsDB.coreSkills`, `tools`, `methods`, etc. 500-char per-entry ceiling matches the bounded-string convention.

## Knock-on changes (all AI Integration owned)

1. `lib/ai/workflows/skillsIngest.mock.ts` — mock returns 1–2 example warnings so Frontend's empty-state UI exercises the populated branch.
2. `lib/ai/mocks/fixtures.ts` — `ingestFixture()` adds warnings.
3. `tests/ai/skillsIngest.test.ts` — assert presence + bounded shape.
4. `lib/ai/smoke.ts` — golden fixture under `tests/ai/fixtures/live/skillsIngest.json` includes the warnings field.

These ship in the AI Day-3 PR as soon as the proposal is approved.

## Risk

- Low. Additive field with a sensible default; existing handlers that ignore the field are unaffected.
- The `.default([])` keeps the OUTPUT type strict (`string[]`, not optional) so consumers don't need null-coalesce branches.

## Alternatives considered

- **Compute warnings server-side from validator output.** Requires Backend Core to reconstruct the model's parsing-time context (impossible — only the model saw the raw text). Rejected.
- **Wrap warnings in a separate `{ skillsDB, warnings }` envelope schema.** More change for no gain over a single extra field on `IngestRawSchema`. Rejected.

## Architect decision

`[DECIDED: accept]` — Architect 2026-05-16. Field added to `IngestRawSchema` in this same PR (Architect commit on the branch); INGEST_SYSTEM updated to instruct the model to emit warnings. AI Integration's mocks/fixtures already include the field per their PR description.
