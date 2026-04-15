import {
  FREE_AI_MODELS,
  DEFAULT_MODEL_ID,
  VALID_MODEL_IDS,
  getTierLabel,
  getTierColor,
  formatContext,
  formatLatency,
} from '@/utils/ai-models';

describe('FREE_AI_MODELS', () => {
  test('is a non-empty array', () => {
    expect(FREE_AI_MODELS.length).toBeGreaterThan(0);
  });

  test('every model has required fields', () => {
    for (const m of FREE_AI_MODELS) {
      expect(typeof m.id).toBe('string');
      expect(typeof m.name).toBe('string');
      expect(typeof m.provider).toBe('string');
      expect(['balanced', 'powerful']).toContain(m.tier);
      expect(typeof m.contextWindow).toBe('number');
      expect(typeof m.latencyMs).toBe('number');
      expect(typeof m.tokensPerSec).toBe('number');
    }
  });
});

describe('DEFAULT_MODEL_ID', () => {
  test('is included in FREE_AI_MODELS', () => {
    expect(FREE_AI_MODELS.some((m) => m.id === DEFAULT_MODEL_ID)).toBe(true);
  });
});

describe('VALID_MODEL_IDS', () => {
  test('contains every FREE_AI_MODEL id', () => {
    for (const m of FREE_AI_MODELS) {
      expect(VALID_MODEL_IDS.has(m.id)).toBe(true);
    }
  });

  test('does not contain unknown ids', () => {
    expect(VALID_MODEL_IDS.has('unknown/model:free')).toBe(false);
  });
});

describe('getTierLabel', () => {
  test('returns Balanced for balanced tier', () => {
    expect(getTierLabel('balanced')).toBe('Balanced');
  });

  test('returns Powerful for powerful tier', () => {
    expect(getTierLabel('powerful')).toBe('Powerful');
  });
});

describe('getTierColor', () => {
  test('returns primary for balanced tier', () => {
    expect(getTierColor('balanced')).toBe('primary');
  });

  test('returns warning for powerful tier', () => {
    expect(getTierColor('powerful')).toBe('warning');
  });
});

describe('formatContext', () => {
  test('formats millions with one decimal place', () => {
    expect(formatContext(1_000_000)).toBe('1.0M');
    expect(formatContext(1_500_000)).toBe('1.5M');
  });

  test('formats thousands with no decimal', () => {
    expect(formatContext(131_072)).toBe('131K');
    expect(formatContext(1_000)).toBe('1K');
  });

  test('formats small values as plain numbers', () => {
    expect(formatContext(512)).toBe('512');
  });
});

describe('formatLatency', () => {
  test('formats values >= 1000ms as seconds', () => {
    expect(formatLatency(1000)).toBe('~1.0s');
    expect(formatLatency(2500)).toBe('~2.5s');
  });

  test('formats values < 1000ms as ms', () => {
    expect(formatLatency(400)).toBe('~400ms');
    expect(formatLatency(999)).toBe('~999ms');
  });
});
