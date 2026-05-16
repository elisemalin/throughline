// POST /api/webhooks/clerk
//
// Clerk webhook receiver. Verifies the Svix signature, then on `user.created`
// or `user.updated` upserts a `User` row keyed by the Clerk user ID; on
// `user.deleted` deletes the row (Prisma cascades owned rows per the
// schema's onDelete: Cascade). The handler is idempotent — Clerk retries on
// non-2xx, so duplicate deliveries of the same event must be safe.
//
// Public route (no Clerk middleware gate): the request is unauthenticated by
// design. The Svix signature is the only defense; the handler MUST verify
// it before any DB write.

import { NextResponse } from 'next/server';
import { Webhook, WebhookVerificationError } from 'svix';
import { prisma } from '@/lib/db/prisma';
import { jsonError } from '@/lib/server/response';

// Clerk's user.* events carry an `email_addresses[]` array with one entry
// marked `primary_email_address_id`. Other fields are not needed for our
// shadow User row.
type ClerkUserEvent = {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string;
    email_addresses?: Array<{
      id: string;
      email_address: string;
    }>;
    primary_email_address_id?: string | null;
  };
};

function pickPrimaryEmail(data: ClerkUserEvent['data']): string | undefined {
  const list = data.email_addresses ?? [];
  if (list.length === 0) return undefined;
  const primary = list.find((e) => e.id === data.primary_email_address_id);
  return (primary ?? list[0]).email_address;
}

// Transient Prisma error codes — connection lost, can't reach DB. The
// handler retries once after a 100ms back-off; persistent failures surface
// as 503 so Clerk's retry queue picks the event up again. Non-transient
// errors (P2002 unique-collision, P2003 FK, P2025 not-found) are NOT in
// this list — those would loop forever.
const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

function isTransientPrismaError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    TRANSIENT_PRISMA_CODES.has((err as { code: string }).code)
  );
}

async function withTransientRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isTransientPrismaError(err)) throw err;
    await new Promise((r) => setTimeout(r, 100));
    return fn();
  }
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    // Missing secret is a deploy-time misconfiguration, not a runtime input
    // error. Return 500 so Clerk retries; the secret must land in env before
    // the route works at all.
    return jsonError(500, 'webhook_misconfigured', 'CLERK_WEBHOOK_SIGNING_SECRET is not set.');
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return jsonError(400, 'missing_signature_headers', 'Required svix headers are absent.');
  }

  const body = await req.text();
  let event: ClerkUserEvent;
  try {
    event = new Webhook(secret).verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent;
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return jsonError(400, 'invalid_signature', 'Webhook signature verification failed.');
    }
    throw err;
  }

  try {
    if (event.type === 'user.created' || event.type === 'user.updated') {
      const email = pickPrimaryEmail(event.data);
      if (!email) {
        // Skip rather than fail: a Clerk account with no email cannot satisfy
        // our `email String @unique` column. Clerk may retry; the route is
        // idempotent and the next attempt will succeed once the email lands.
        return NextResponse.json({ ok: true, skipped: 'no_primary_email' });
      }
      await withTransientRetry(() =>
        prisma.user.upsert({
          where: { id: event.data.id },
          create: { id: event.data.id, email },
          update: { email },
        }),
      );
    } else if (event.type === 'user.deleted') {
      // Cascade deletion is wired via the Prisma schema's onDelete: Cascade
      // on every owned table (Application, Document, SkillsDB, WatchlistCompany,
      // DiscoveredPosting) — removing the User row tears down everything else.
      // deleteMany scoped by id makes the call idempotent: a duplicate delete
      // event is a no-op rather than a P2025 not-found.
      await withTransientRetry(() =>
        prisma.user.deleteMany({ where: { id: event.data.id } }),
      );
    }
  } catch (err) {
    if (isTransientPrismaError(err)) {
      // 503 with a Retry-After hint nudges Clerk's queue back-off and gives
      // the Neon serverless cold-start time to recover before the next try.
      return jsonError(
        503,
        'webhook_persist_failed',
        'Persistence layer unreachable; Clerk will retry.',
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
