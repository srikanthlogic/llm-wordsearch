import { describe, it, expect } from 'vitest';

import {
  validateProxyRequest,
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_PROXY_TOKENS,
  DEFAULT_MAX_TOKENS,
} from '../../api/llm-proxy/validate';

const validBody = () => ({
  messages: [{ role: 'user', content: 'Find the words: cat' }],
});

describe('validateProxyRequest — body shape', () => {
  it.each([null, undefined, 42, 'hello', [], true])('rejects non-object body: %j', (body) => {
    expect(validateProxyRequest(body)).toEqual({
      status: 'error',
      error: 'Request body must be a JSON object.',
    });
  });
});

describe('validateProxyRequest — stream field', () => {
  it('rejects streaming requests', () => {
    expect(validateProxyRequest({ ...validBody(), stream: true })).toEqual({
      status: 'error',
      error: "'stream' is not supported by this proxy; it must be false.",
    });
  });

  it.each([undefined, false])('accepts stream: %j', (stream) => {
    const result = validateProxyRequest({ ...validBody(), stream });
    expect(result.status).toBe('ok');
  });
});

describe('validateProxyRequest — messages', () => {
  it.each([
    [undefined, "'messages' must be an array."],
    ['nope', "'messages' must be an array."],
    [{ role: 'user', content: 'x' }, "'messages' must be an array."],
    [[], `'messages' must contain between 1 and ${MAX_MESSAGES} items.`],
    [Array.from({ length: MAX_MESSAGES + 1 }, () => ({ role: 'user', content: 'x' })), `'messages' must contain between 1 and ${MAX_MESSAGES} items.`],
  ])('rejects messages: %j', (messages, error) => {
    expect(validateProxyRequest({ ...validBody(), messages })).toEqual({ status: 'error', error });
  });

  it('rejects a non-object message entry', () => {
    const messages = ['user'];
    expect(validateProxyRequest({ ...validBody(), messages })).toEqual({
      status: 'error',
      error: "every entry in 'messages' must be an object with 'role' and 'content'.",
    });
  });

  it('rejects an invalid role', () => {
    const messages = [{ role: 'tool', content: 'x' }];
    expect(validateProxyRequest({ ...validBody(), messages })).toEqual({
      status: 'error',
      error: 'invalid message role: expected one of system, user, assistant.',
    });
  });

  it.each([undefined, null, 7, '', '   '])("rejects message content: %j", (content) => {
    const messages = [{ role: 'user', content }];
    expect(validateProxyRequest({ ...validBody(), messages })).toEqual({
      status: 'error',
      error: "message 'content' must be a non-empty string.",
    });
  });

  it('rejects content over the character cap', () => {
    const messages = [{ role: 'user', content: 'a'.repeat(MAX_MESSAGE_CHARS + 1) }];
    expect(validateProxyRequest({ ...validBody(), messages })).toEqual({
      status: 'error',
      error: `message 'content' exceeds the maximum of ${MAX_MESSAGE_CHARS} characters.`,
    });
  });

  it('accepts content at exactly the character cap', () => {
    const messages = [{ role: 'user', content: 'a'.repeat(MAX_MESSAGE_CHARS) }];
    expect(validateProxyRequest({ ...validBody(), messages }).status).toBe('ok');
  });

  it('preserves message order and values', () => {
    const messages = [
      { role: 'system', content: 'You generate puzzles.' },
      { role: 'user', content: 'Words: dog' },
      { role: 'assistant', content: 'OK.' },
      { role: 'user', content: 'Again' },
    ];
    const result = validateProxyRequest({ ...validBody(), messages });
    expect(result.status === 'ok' && result.value.messages).toEqual(messages);
  });
});

describe('validateProxyRequest — max_tokens', () => {
  it.each([undefined, null])('defaults max_tokens to 1000 for %j', (max_tokens) => {
    const result = validateProxyRequest({ ...validBody(), max_tokens });
    expect(result.status === 'ok' && result.value.max_tokens).toBe(DEFAULT_MAX_TOKENS);
  });

  it.each([0, -5, 1.5, NaN, Infinity, '100', ''])('rejects invalid max_tokens: %j', (max_tokens) => {
    expect(validateProxyRequest({ ...validBody(), max_tokens })).toEqual({
      status: 'error',
      error: "'max_tokens' must be a positive integer.",
    });
  });

  it('rejects max_tokens over the server maximum', () => {
    expect(validateProxyRequest({ ...validBody(), max_tokens: MAX_PROXY_TOKENS + 1 })).toEqual({
      status: 'error',
      error: `'max_tokens' exceeds the server maximum of ${MAX_PROXY_TOKENS}.`,
    });
  });

  it('accepts max_tokens at the server maximum', () => {
    const result = validateProxyRequest({ ...validBody(), max_tokens: MAX_PROXY_TOKENS });
    expect(result.status === 'ok' && result.value.max_tokens).toBe(MAX_PROXY_TOKENS);
  });
});

describe('validateProxyRequest — model', () => {
  it('omits model when not supplied', () => {
    const result = validateProxyRequest(validBody());
    expect(result.status === 'ok' && 'model' in result.value).toBe(false);
  });

  it.each([7, null, '', '   ', 'm'.repeat(201)])('rejects invalid model: %j', (model) => {
    expect(validateProxyRequest({ ...validBody(), model })).toEqual({
      status: 'error',
      error: "'model' must be a non-empty string of at most 200 characters.",
    });
  });

  it('trims a valid model id', () => {
    const result = validateProxyRequest({ ...validBody(), model: '  vendor/model:free  ' });
    expect(result.status === 'ok' && result.value.model).toBe('vendor/model:free');
  });

  it('accepts a model at exactly 200 characters', () => {
    const result = validateProxyRequest({ ...validBody(), model: 'm'.repeat(200) });
    expect(result.status).toBe('ok');
  });
});

describe('validateProxyRequest — response_format', () => {
  it('omits response_format when not supplied', () => {
    const result = validateProxyRequest(validBody());
    expect(result.status === 'ok' && 'response_format' in result.value).toBe(false);
  });

  it.each(['json_object', 42, null, []])(
    'rejects non-object response_format: %j',
    (response_format) => {
      expect(validateProxyRequest({ ...validBody(), response_format })).toEqual({
        status: 'error',
        error: "'response_format' must be an object.",
      });
    }
  );

  it.each([{}, { type: 'text' }, { type: 42 }])(
    'rejects response_format with wrong type field: %j',
    (response_format) => {
      expect(validateProxyRequest({ ...validBody(), response_format })).toEqual({
        status: 'error',
        error: "'response_format.type' must be 'json_object'.",
      });
    }
  );

  it('passes through an accepted response_format', () => {
    const result = validateProxyRequest({ ...validBody(), response_format: { type: 'json_object' } });
    expect(result.status === 'ok' && result.value.response_format).toEqual({ type: 'json_object' });
  });
});

describe('validateProxyRequest — happy path', () => {
  it('normalizes a fully-specified request', () => {
    const body = {
      model: ' vendor/model:free ',
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
      max_tokens: 500,
      response_format: { type: 'json_object' },
      temperature: 0.7,
    };
    expect(validateProxyRequest(body)).toEqual({
      status: 'ok',
      value: {
        model: 'vendor/model:free',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'hi' },
        ],
        max_tokens: 500,
        response_format: { type: 'json_object' },
      },
    });
  });

  it('never forwards unknown fields', () => {
    const result = validateProxyRequest({ ...validBody(), evil: 'field', stream: false });
    expect(result.status === 'ok' && Object.keys(result.value).sort()).toEqual([
      'max_tokens',
      'messages',
    ]);
  });
});
