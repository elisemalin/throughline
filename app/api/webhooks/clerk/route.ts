// POST /api/webhooks/clerk
//
// Clerk webhook receiver. Verifies the Svix signature, then on `user.created`
// (and `user.updated`) upserts a `User` row keyed by the Clerk user ID. JIT
// User provisioning unblocks every Backend Core handler that writes a row
// with ownerId set to req.auth.userId — without a corresponding User row,
// those writes would fail on the foreign-key constraint.
//
// Public route (no Clerk middleware gate): the request is unauthenticated by
// design — Clerk posts to it directly from their service. The Svix signature
// is the real defense; the route MUST verify it before any DB write.

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
    // Svix returns WebhookVerificationError on any signature mismatch,
    // expired timestamp, or malformed payload. All of those reduce to 400
    // from the client's perspective; the server never trusts the body.
    if (err instanceof WebhookVerificationError) {
      return jsonError(400, 'invalid_signature', 'Webhook signature verification failed.');
    }
    throw err;
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const email = pickPrimaryEmail(event.data);
    if (!email) {
      // Skip rather than fail: a Clerk account with no email cannot satisfy
      // our `email String @unique` column. Clerk may retry; the route is
      // idempotent and the next attempt will succeed once the email lands.
      return NextResponse.json({ ok: true, skipped: 'no_primary_email' });
    }
    await prisma.user.upsert({
      where: { id: event.data.id },
      create: { id: event.data.id, email },
      update: { email },
    });
  }

  // user.deleted and any other event types are acked but not acted on for
  // now — User row cascade-deletes are deferred until we have an explicit
  // policy on whether deletion at Clerk should also cascade our data.
  return NextResponse.json({ ok: true });
}
