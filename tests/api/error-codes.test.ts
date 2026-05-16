import { describe, expect, it } from 'vitest';
import {
  API_ERROR_CODES,
  ApiErrorBodySchema,
  fromZodError,
  jsonError,
} from '@/lib/server/response';
import { z } from 'zod';

describe('API error response shape', () => {
  it('jsonError emits a body that parses against ApiErrorBodySchema', async () => {
    const res = jsonError(404, 'application_not_found', 'gone');
    const body = await res.json();
    ApiErrorBodySchema.parse(body);
    expect(body.error.code).toBe('application_not_found');
    expect(body.error.message).toBe('gone');
  });

  it('jsonError defaults message to code when omitted', async () => {
    const res = jsonError(401, 'unauthorized');
    const body = await res.json();
    expect(body.error.message).toBe('unauthorized');
  });

  it('fromZodError projects issues into the details object', async () => {
    const schema = z.object({ x: z.string() });
    const err = schema.safeParse({ x: 1 }).error!;
    const res = fromZodError(err);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_request');
    expect(body.error.details).toHaveProperty('issues');
  });

  it('every code in the registry is emitable through ApiErrorBodySchema', () => {
    for (const code of API_ERROR_CODES) {
      const parsed = ApiErrorBodySchema.safeParse({
        error: { code, message: 'x' },
      });
      expect(parsed.success).toBe(true);
    }
  });
});
