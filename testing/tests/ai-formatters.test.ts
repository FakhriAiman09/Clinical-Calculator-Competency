import { describe, expect, test } from '@jest/globals';

// These tests verify display formatting helpers for AI model metadata.
import { formatContext, formatLatency } from '../../frontend/src/utils/ai-models';

describe('AI model formatters', () => {
  // Confirms token counts are formatted for small, thousand, and million ranges.
  test('formats context window tokens across raw, K, and M ranges', () => {
    expect(formatContext(512)).toBe('512');
    expect(formatContext(131072)).toBe('131K');
    expect(formatContext(1000000)).toBe('1.0M');
  });

  // Confirms latency values are shown in ms or seconds depending on size.
  test('formats latency in ms and seconds', () => {
    expect(formatLatency(450)).toBe('~450ms');
    expect(formatLatency(1400)).toBe('~1.4s');
  });
});
