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

// Polyfill for Touch and TouchEvent to support jsdom test environment
Object.defineProperty(window, 'Touch', {
  writable: true,
  value: class Touch {
    constructor(options: any) {
      this.identifier = options.identifier;
      this.target = options.target;
      this.clientX = options.clientX;
      this.clientY = options.clientY;
      this.pageX = options.pageX || options.clientX;
      this.pageY = options.pageY || options.clientY;
      this.screenX = options.screenX || options.clientX;
      this.screenY = options.screenY || options.clientY;
    }
    identifier: number;
    target: EventTarget;
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
    screenX: number;
    screenY: number;
  }
});

Object.defineProperty(window, 'TouchEvent', {
  writable: true,
  value: class TouchEvent extends Event {
    constructor(type: string, options: any = {}) {
      super(type, options);
      this.touches = options.touches || [];
      this.changedTouches = options.changedTouches || [];
      this.targetTouches = options.targetTouches || [];
    }
    touches: Touch[];
    changedTouches: Touch[];
    targetTouches: Touch[];
  }
});