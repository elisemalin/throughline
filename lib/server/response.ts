// Response helpers for route handlers.
//
// WHY: Every handler returns either a contract-typed JSON body or a structured
// error. A shared shape (`{ error: { code, message, details? } }`) keeps the
// Frontend Agent's error-handling code path identical across routes, and a
// single Zod-error projector ensures 400 responses describe what failed in a
// form the client can render without re-parsing Zod's internal issue tree.
//
// `code` is a typed union (not a free-form string) so a new emitted code is a
// typecheck error until it's added to the registry. Frontend can switch on the
// code exhaustively to render targeted UI ("regenerate" for ai_invalid_response,
// "sign in" for unauthorized, etc.) without string matching.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ZodError } from 'zod';

// API_ERROR_CODES is the closed set of error.code values any /api/* handler
// may emit. Adding a new code is a deliberate act: append here, then call
// jsonError with it. Removing one is a contract break — callers may switch
// on these values.
export const API_ERROR_CODES = [
  // 400 — bad input from the caller
  'invalid_json',
  'invalid_request',
  'invalid_signature',
  'missing_anthropic_key',
  'missing_signature_headers',
  // 401 — no session
  'unauthorized',
  // 404 — owned-row lookup miss
  'application_not_found',
  'posting_not_found',
  'skills_db_not_found',
  // 422 — request well-formed, downstream couldn't be processed
  'ai_invalid_response',
  // 500 — server-side misconfiguration or unrecoverable failure
  'serialization_failed',
  'webhook_misconfigured',
  'webhook_persist_failed',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const ApiErrorBodySchema = z
  .object({
    error: z
      .object({
        code: z.enum(API_ERROR_CODES),
        message: z.string(),
        details: z.unknown().optional(),
      })
      .strict(),
  })
  .strict();
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message?: string,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json<ApiErrorBody>(
    {
      error: {
        code,
        message: message ?? code,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status },
  );
}

// fromZodError projects a ZodError into the structured 400 body. Issue paths
// are joined with '.' so a nested field like `contact.email` is readable in
// the client error banner without the client traversing the issue array.
export function fromZodError(err: ZodError): NextResponse<ApiErrorBody> {
  return jsonError(400, 'invalid_request', 'Request body failed validation.', {
    issues: err.issues.map((i) => ({
      path: i.path.join('.'),
      code: i.code,
      message: i.message,
    })),
  });
}

// readJson parses a Request body to a plain object. Catches the
// "Unexpected end of JSON input" case and returns the canonical 400 shape so
// every handler can `if (body instanceof Response) return body;` early.
export async function readJson(req: Request): Promise<unknown | Response> {
  try {
    return await req.json();
  } catch {
    return jsonError(400, 'invalid_json', 'Request body must be valid JSON.');
  }
}
