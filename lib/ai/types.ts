// Shared types for the AI Integration namespace.
//
// CallOptions is the contract Backend Core hands every workflow function:
// the BYOK Anthropic key (header `x-anthropic-key` on /api/* requests), an
// optional model override (Architect can pin a different model per call
// without redeploying), and an AbortSignal so callers can cancel in-flight
// generations on client disconnect.

export type CallOptions = {
  apiKey: string;
  model?: string;
  signal?: AbortSignal;
};

// Mock variants accept the same options shape so call sites do not branch
// on AI_MODE. apiKey is unused by mocks but allowed (and ignored) for
// signature parity.
export type MockCallOptions = {
  apiKey?: string;
  model?: string;
  signal?: AbortSignal;
};

// Surface a typed error rather than a bare Error so Backend Core can map
// "validation failed twice" to a 502 (model output bad) versus other
// failures. Carries the Zod issue text for log redaction at the boundary.
export class AIValidationError extends Error {
  readonly issues: string;
  constructor(workflow: string, issues: string) {
    super(`AI validation failed for ${workflow}: ${issues}`);
    this.name = 'AIValidationError';
    this.issues = issues;
  }
}
