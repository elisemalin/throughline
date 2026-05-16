# Greenhouse fixtures

Captured by the External Adapter Agent against the public Job Board API
(`https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`).

| Slug      | File                             | Captured     | Job count (at capture) |
| --------- | -------------------------------- | ------------ | ---------------------- |
| anthropic | `greenhouse-anthropic.json`      | 2026-05-16   | 410                    |
| stripe    | `greenhouse-stripe.json`         | 2026-05-16   | (see file)             |
| airbnb    | `greenhouse-airbnb.json`         | 2026-05-16   | (see file)             |

Kickoff originally specified `retool`, `linear`, `anthropic`. As of capture
date `retool` and `linear` 404 against the API (boards moved off Greenhouse);
`stripe` and `airbnb` were substituted. The substitution is recorded in the
Day 2 PR description.

If a fixture's response shape diverges from the captured shape, the
corresponding adapter's `normalize()` must be updated and a fresh fixture
captured here with the new date.
