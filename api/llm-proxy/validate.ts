// Request validation for the LLM proxy (#18).
//
// The proxy used to forward the client body to the provider with almost no
// checks: unparseable JSON crashed into a 500, `messages` could be any shape,
// and `max_tokens` was client-controlled and unbounded — an easy way to run
// up spend on the community key. This module enforces a strict request
// contract before anything is forwarded.

export const MAX_MESSAGES = 50;
export const MAX_MESSAGE_CHARS = 20_000;
export const MAX_PROXY_TOKENS = 4_000;
export const DEFAULT_MAX_TOKENS = 1_000;

const VALID_ROLES = new Set(['system', 'user', 'assistant']);

export interface ValidatedProxyRequest {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  max_tokens: number;
  response_format?: { type: string };
}

// NOTE: uses a string-literal discriminant (`status`) rather than a boolean
// (`ok`) because the project compiles without `strict`, and TypeScript does
// not narrow boolean-discriminated unions in that configuration.
export type ValidationResult =
  | { status: 'ok'; value: ValidatedProxyRequest }
  | { status: 'error'; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateMessages(raw: unknown): string | { role: 'system' | 'user' | 'assistant'; content: string }[] {
  if (!Array.isArray(raw)) {
    return "'messages' must be an array.";
  }
  if (raw.length === 0 || raw.length > MAX_MESSAGES) {
    return `'messages' must contain between 1 and ${MAX_MESSAGES} items.`;
  }
  const out: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  for (const item of raw) {
    if (!isPlainObject(item)) {
      return "every entry in 'messages' must be an object with 'role' and 'content'.";
    }
    const { role, content } = item;
    if (typeof role !== 'string' || !VALID_ROLES.has(role)) {
      return `invalid message role: expected one of system, user, assistant.`;
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
      return "message 'content' must be a non-empty string.";
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return `message 'content' exceeds the maximum of ${MAX_MESSAGE_CHARS} characters.`;
    }
    out.push({ role: role as ValidatedProxyRequest['messages'][number]['role'], content });
  }
  return out;
}

function validateMaxTokens(raw: unknown): string | number {
  if (raw === undefined || raw === null) {
    return DEFAULT_MAX_TOKENS;
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
    return `'max_tokens' must be a positive integer.`;
  }
  if (raw > MAX_PROXY_TOKENS) {
    return `'max_tokens' exceeds the server maximum of ${MAX_PROXY_TOKENS}.`;
  }
  return raw;
}

function validateResponseFormat(raw: unknown): string | undefined | { type: string } {
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw)) {
    return "'response_format' must be an object.";
  }
  if (raw.type !== 'json_object') {
    return `'response_format.type' must be 'json_object'.`;
  }
  return { type: 'json_object' };
}

/**
 * Validate a parsed proxy request body. Returns either a normalized,
 * bounded request or a human-readable error suitable for a 400 response.
 */
export function validateProxyRequest(body: unknown): ValidationResult {
  if (!isPlainObject(body)) {
    return { status: 'error', error: 'Request body must be a JSON object.' };
  }

  if (body.stream !== undefined && body.stream !== false) {
    return { status: 'error', error: "'stream' is not supported by this proxy; it must be false." };
  }

  const messages = validateMessages(body.messages);
  if (typeof messages === 'string') {
    return { status: 'error', error: messages };
  }

  const max_tokens = validateMaxTokens(body.max_tokens);
  if (typeof max_tokens === 'string') {
    return { status: 'error', error: max_tokens };
  }

  const modelRaw = body.model;
  if (modelRaw !== undefined && (typeof modelRaw !== 'string' || modelRaw.trim().length === 0 || modelRaw.length > 200)) {
    return { status: 'error', error: "'model' must be a non-empty string of at most 200 characters." };
  }

  const response_format = validateResponseFormat(body.response_format);
  if (typeof response_format === 'string') {
    return { status: 'error', error: response_format };
  }

  return {
    status: 'ok',
    value: {
      ...(typeof modelRaw === 'string' ? { model: modelRaw.trim() } : {}),
      messages,
      max_tokens,
      ...(response_format ? { response_format } : {}),
    },
  };
}
