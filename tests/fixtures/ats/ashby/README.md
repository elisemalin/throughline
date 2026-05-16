# Ashby fixtures

Captured by the External Adapter Agent against the public job-board API
(`https://api.ashbyhq.com/posting-api/job-board/{slug}`).

| Slug   | File                | Captured     | Job count (at capture) |
| ------ | ------------------- | ------------ | ---------------------- |
| linear | `ashby-linear.json` | 2026-05-16   | 23                     |
| notion | `ashby-notion.json` | 2026-05-16   | (see file)             |

Kickoff originally specified `vercel` and `figma`. As of capture date both
return an empty/missing board response; `linear` and `notion` (which moved
onto Ashby since the kickoff was written) were substituted. The substitution
is recorded in the Day 2 PR description.
