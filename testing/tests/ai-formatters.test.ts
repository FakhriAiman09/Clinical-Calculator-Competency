import { describe, expect, test } from '@jest/globals';

import { formatContext, formatLatency } from '../../frontend/src/utils/ai-models';

describe('AI model formatters', () => {
  test('formats context window tokens across raw, K, and M ranges', () => {
    expect(formatContext(512)).toBe('512');
    expect(formatContext(131072)).toBe('131K');
    expect(formatContext(1000000)).toBe('1.0M');
  });

  test('formats latency in ms and seconds', () => {
    expect(formatLatency(450)).toBe('~450ms');
    expect(formatLatency(1400)).toBe('~1.4s');
  });
});
