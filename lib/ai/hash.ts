// SHA-256 of the canonical prompt assembly used as the Redis cache key.
//
// WHY a separate module: cache keying is shared by every workflow; isolating
// it lets the unit tests pin the exact key format and lets a future cache
// inspector (or Security Agent audit) read the canonical contract in one
// place. The shape is hash(system + '\0' + user + '\0' + model) — the NUL
// separator prevents `(system="ab", user="c")` colliding with
// `(system="a", user="bc")`.

import { createHash } from 'node:crypto';

export function promptHash(system: string, user: string, model: string): string {
  return createHash('sha256')
    .update(system)
    .update('\0')
    .update(user)
    .update('\0')
    .update(model)
    .digest('hex');
}
