// AI namespace public surface.
//
// WHY: Backend Core imports every AI workflow from this single module so the
// handler code path is identical between Day-2 mocks and AI Integration's
// real workflows. AI Integration's Day-2 PR replaces this file's body with
// the real workflow exports; consumers (Backend Core handlers) do not
// change. The mock-namespace files under `__mock__/` are deleted by that
// same PR — backend-core never imports from `__mock__/` directly.

export { runAlignment } from './__mock__/alignment';
export {
  runResume,
  runCoverLetter,
  runNinetyDay,
  runDossier,
} from './__mock__/documents';
export { runMockInterview } from './__mock__/mock-interview';
export { runIngest, MOCK_INGEST_WARNINGS } from './__mock__/ingest';
