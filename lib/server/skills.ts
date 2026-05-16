// Skills DB read helper for handlers that depend on the user's structured
// experience (alignment, resume, cover letter, 90-day plan, mock interview).
//
// WHY: Multiple AI-generation routes need the same shape — a contract-typed
// SkillsDB derived from the Prisma row, or `null` when the user hasn't run
// ingest yet. Centralizing the projection avoids re-implementing the JSON
// parsing and date serialization in each handler and gives tests one mock
// surface.

import type { SkillsDB } from '@/contracts/models';
import { prisma } from '@/lib/db/prisma';
import { projectSkillsDB } from '@/lib/db/serialize';

export async function readSkillsDB(ownerId: string): Promise<SkillsDB | null> {
  const row = await prisma.skillsDB.findUnique({ where: { ownerId } });
  return row ? (projectSkillsDB(row) as SkillsDB) : null;
}
