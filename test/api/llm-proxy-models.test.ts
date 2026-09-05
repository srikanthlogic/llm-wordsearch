import { describe, it, expect } from 'vitest';

import { buildAllowedModels, checkModelPermission } from '../../api/llm-proxy/models';

describe('buildAllowedModels', () => {
  it('defaults to the community model when no env is configured', () => {
    const allowed = buildAllowedModels({});
    expect(allowed.size).toBe(1);
    expect(allowed.has('google/gemini-2.5-flash')).toBe(true);
  });

  it('uses the configured community model name', () => {
    const allowed = buildAllowedModels({ communityModelName: 'vendor/cheap-model:free' });
    expect(allowed.has('vendor/cheap-model:free')).toBe(true);
    expect(allowed.has('google/gemini-2.5-flash')).toBe(false);
  });

  it('adds explicit COMMUNITY_ALLOWED_MODELS entries', () => {
    const allowed = buildAllowedModels({
      communityModelName: 'google/gemini-2.5-flash',
      communityAllowedModels: 'a/one, b/two ,c/three',
    });
    expect(allowed.size).toBe(4);
    expect(allowed.has('a/one')).toBe(true);
    expect(allowed.has('b/two')).toBe(true);
    expect(allowed.has('c/three')).toBe(true);
  });

  it('ignores empty entries and blank strings in the list', () => {
    const allowed = buildAllowedModels({
      communityAllowedModels: 'a/one,,  ,b/two',
    });
    expect(allowed.has('a/one')).toBe(true);
    expect(allowed.has('b/two')).toBe(true);
    expect(allowed.size).toBe(3); // + default community model
  });

  it('includes every model from LANGUAGE_MODEL_MAP overrides', () => {
    const languageModelMap = JSON.stringify({
      ta: { model: 'vendor/tamil-model', baseURL: 'https://example.com/v1' },
      hi: { model: 'vendor/hindi-model' },
    });
    const allowed = buildAllowedModels({ languageModelMap });
    expect(allowed.has('google/gemini-2.5-flash')).toBe(true);
    expect(allowed.has('vendor/tamil-model')).toBe(true);
    expect(allowed.has('vendor/hindi-model')).toBe(true);
  });

  it('survives a malformed LANGUAGE_MODEL_MAP', () => {
    const allowed = buildAllowedModels({
      languageModelMap: 'not-json{',
      communityAllowedModels: 'a/one',
    });
    expect(allowed.has('google/gemini-2.5-flash')).toBe(true);
    expect(allowed.has('a/one')).toBe(true);
  });

  it('ignores map entries without a model field', () => {
    const languageModelMap = JSON.stringify({
      fr: { baseURL: 'https://example.com/v1' },
      de: { model: 'vendor/german-model' },
    });
    const allowed = buildAllowedModels({ languageModelMap });
    expect(allowed.size).toBe(2);
    expect(allowed.has('vendor/german-model')).toBe(true);
  });
});

describe('checkModelPermission', () => {
  const env = { communityAllowedModels: 'a/one,b/two' };

  it('allows an explicitly whitelisted model', () => {
    expect(checkModelPermission('b/two', env)).toEqual({ allowed: true, model: 'b/two' });
  });

  it('falls back to the community model when none requested and allows it', () => {
    const result = checkModelPermission(undefined, {});
    expect(result.allowed).toBe(true);
    expect(result.model).toBe('google/gemini-2.5-flash');
  });

  it('rejects an unlisted model', () => {
    const result = checkModelPermission('anthropic/claude-opus-4', env);
    expect(result.allowed).toBe(false);
    expect(result.model).toBe('anthropic/claude-opus-4');
  });

  it('trims whitespace around a requested model before matching', () => {
    expect(checkModelPermission('  a/one  ', env).allowed).toBe(true);
  });

  it('is case-sensitive (OpenRouter IDs are case-sensitive)', () => {
    expect(checkModelPermission('A/ONE', env).allowed).toBe(false);
  });

  it('treats a non-string model as the community default (which is allowed)', () => {
    const result = checkModelPermission(42 as unknown as string, env);
    expect(result.model).toBe('google/gemini-2.5-flash');
    expect(result.allowed).toBe(true);
  });
});
