# Review Checklist

Security Agent owns this file end-to-end. Foundation Agent seeds it with a
placeholder so the path exists in the repo from Day 1.

## Placeholder

Security Agent fills this with:
- High-risk surface enumeration (`/lib/security/**`, `/middleware*.ts`, anything touching secrets, keys, external network egress).
- The PR-level review prompt template per FLOOR.md "Two-agent review for high-risk surfaces".
- Concrete checks per surface (CSRF, rate limit windows, key handling, log redaction).

Until then, every agent inherits the floors in `.claude-roles/FLOOR.md` and the
contract-level invariants in `/contracts/*.ts`.
