import { describe, it, expect } from 'vitest';
import { formatTime } from '../../utils/formatters';

describe('formatters', () => {
  // Test suite for the formatters module, focusing on time formatting utilities
  describe('formatTime', () => {
    // Basic tests for formatting seconds into MM:SS format
    it('should format seconds correctly', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(59)).toBe('00:59');
    });

    // Tests for formatting time when minutes are involved
    it('should format minutes and seconds correctly', () => {
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(125)).toBe('02:05');
    });

    // Tests for handling very large time values to ensure no overflow issues
    it('should handle large time values', () => {
      expect(formatTime(3600)).toBe('60:00'); // 1 hour
      expect(formatTime(3661)).toBe('61:01'); // 1 hour 1 minute 1 second
    });

    // Tests for negative input handling, ensuring they are clamped to zero
    it('should handle negative values by treating them as zero', () => {
      expect(formatTime(-1)).toBe('00:00');
      expect(formatTime(-30)).toBe('00:00');
      expect(formatTime(-100)).toBe('00:00');
    });

    // Tests for zero-padding to ensure consistent MM:SS format
    it('should pad single digits with zeros', () => {
      expect(formatTime(5)).toBe('00:05');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(305)).toBe('05:05');
    });

    // Tests for decimal inputs and flooring behavior
    it('should handle edge cases', () => {
      expect(formatTime(0.5)).toBe('00:00'); // Should floor decimal seconds
      expect(formatTime(59.9)).toBe('00:59'); // Should floor decimal seconds
    });

    // Additional edge cases for robustness and error handling
    it('should handle NaN input by treating as zero', () => {
      expect(formatTime(NaN)).toBe('00:00'); // NaN should be handled gracefully as 0
    });

    it('should handle Infinity input by treating as zero', () => {
      expect(formatTime(Infinity)).toBe('00:00'); // Infinity should be clamped to 0
      expect(formatTime(-Infinity)).toBe('00:00'); // Negative infinity also to 0
    });

    it('should handle very large numbers', () => {
      expect(formatTime(1e10)).toBe('166666666:40'); // Large number should format correctly
      expect(formatTime(999999999)).toBe('16666666:39'); // Another large value
    });

    it('should handle non-integer inputs correctly', () => {
      expect(formatTime(90.7)).toBe('01:30'); // Floors to 90 seconds
      expect(formatTime(125.999)).toBe('02:05'); // Floors to 125 seconds
    });

    // Additional edge cases for decimal inputs near boundaries
    it('should handle decimal inputs near minute boundaries', () => {
      expect(formatTime(59.9)).toBe('00:59'); // Floors correctly
      expect(formatTime(60.1)).toBe('01:00'); // Rounds down to 60
      expect(formatTime(119.9)).toBe('01:59'); // Floors to 119
    });

    // Test for negative decimals
    it('should handle negative decimal inputs', () => {
      expect(formatTime(-0.5)).toBe('00:00'); // Negative decimals clamped to 0
      expect(formatTime(-1.5)).toBe('00:00');
    });
  });
});