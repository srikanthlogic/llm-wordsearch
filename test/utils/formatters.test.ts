import { describe, it, expect } from 'vitest';
import { formatTime } from '../../utils/formatters';

describe('formatters', () => {
  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(59)).toBe('00:59');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(125)).toBe('02:05');
    });

    it('should handle large time values', () => {
      expect(formatTime(3600)).toBe('60:00'); // 1 hour
      expect(formatTime(3661)).toBe('61:01'); // 1 hour 1 minute 1 second
    });

    it('should handle negative values by treating them as zero', () => {
      expect(formatTime(-1)).toBe('00:00');
      expect(formatTime(-30)).toBe('00:00');
      expect(formatTime(-100)).toBe('00:00');
    });

    it('should pad single digits with zeros', () => {
      expect(formatTime(5)).toBe('00:05');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(305)).toBe('05:05');
    });

    it('should handle edge cases', () => {
      expect(formatTime(0.5)).toBe('00:00'); // Should floor decimal seconds
      expect(formatTime(59.9)).toBe('00:59'); // Should floor decimal seconds
    });
  });
});