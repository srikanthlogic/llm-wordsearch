import { describe, it, expect } from 'vitest';

import { getOpenAIGameGenerationMessages } from '../prompts';

describe('prompts', () => {
  describe('getOpenAIGameGenerationMessages', () => {
    it('should return system and user messages', () => {
      const result = getOpenAIGameGenerationMessages({
        theme: 'animals',
        wordCount: 5,
        levelCount: 2,
        language: 'en',
      });

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('system');
      expect(result[1].role).toBe('user');
    });

    it('should include theme in user message', () => {
      const result = getOpenAIGameGenerationMessages({
        theme: 'space exploration',
        wordCount: 5,
        levelCount: 2,
        language: 'en',
      });

      expect(result[1].content).toContain('space exploration');
    });

    it('should include language in user message', () => {
      const result = getOpenAIGameGenerationMessages({
        theme: 'animals',
        wordCount: 5,
        levelCount: 2,
        language: 'ta',
      });

      expect(result[1].content).toContain('"ta"');
    });

    it('should include word count in user message', () => {
      const result = getOpenAIGameGenerationMessages({
        theme: 'animals',
        wordCount: 8,
        levelCount: 2,
        language: 'en',
      });

      expect(result[1].content).toContain('8 words');
    });

    it('should include level count in user message', () => {
      const result = getOpenAIGameGenerationMessages({
        theme: 'animals',
        wordCount: 5,
        levelCount: 3,
        language: 'en',
      });

      expect(result[1].content).toContain('3 level');
    });

    it('should instruct JSON format in system message', () => {
      const result = getOpenAIGameGenerationMessages({
        theme: 'animals',
        wordCount: 5,
        levelCount: 1,
        language: 'en',
      });

      expect(result[0].content).toContain('JSON');
      expect(result[0].content).toContain('levels');
    });

    it('should instruct uppercase and no spaces in system message', () => {
      const result = getOpenAIGameGenerationMessages({
        theme: 'animals',
        wordCount: 5,
        levelCount: 1,
        language: 'en',
      });

      expect(result[0].content).toContain('uppercase');
      expect(result[0].content).toContain('not contain spaces');
    });
  });
});
