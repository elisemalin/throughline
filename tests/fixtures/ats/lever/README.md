# Lever fixtures

Captured by the External Adapter Agent against the public postings API
(`https://api.lever.co/v0/postings/{slug}?mode=json`).

| Slug    | File                  | Captured     | Job count (at capture) |
| ------- | --------------------- | ------------ | ---------------------- |
| mistral | `lever-mistral.json`  | 2026-05-16   | (see file)             |
| spotify | `lever-spotify.json`  | 2026-05-16   | 202                    |

Kickoff originally specified `airtable`. As of capture date `airtable` 404s
(board moved off Lever); `mistral` and `spotify` were substituted as
high-volume, stable Lever boards. The substitution is recorded in the Day 2
PR description.

Lever responds with a bare JSON array (no envelope), so the file's top-level
shape is `LeverRawJob[]` rather than `{ jobs: [...] }`.
