// Test setup file
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock environment variables for tests
Object.defineProperty(process, 'env', {
  value: {
    API_KEY: 'test-api-key',
    COMMUNITY_MODEL_NAME: 'google/gemini-2.5-flash',
    USE_LLM_PROXY: 'false',
    LLM_PROXY_URL: '/api/llm-proxy',
    LANGUAGE_MODEL_MAP: '{"es": {"model": "test-spanish-model"}}'
  }
});

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};