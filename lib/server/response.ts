// Response helpers for route handlers.
//
// WHY: Every handler returns either a contract-typed JSON body or a structured
// error. A shared shape (`{ error: { code, message, details? } }`) keeps the
// Frontend Agent's error-handling code path identical across routes, and a
// single Zod-error projector ensures 400 responses describe what failed in a
// form the client can render without re-parsing Zod's internal issue tree.

import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function jsonError(
  status: number,
  code: string,
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
