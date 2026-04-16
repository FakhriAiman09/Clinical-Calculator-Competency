// Tests for util.ts - utility functions for crypto and development level
import { getSecureRandomFloat, getRandomItem, getDevLevelInt } from '@/utils/util';

describe('util.ts - getSecureRandomFloat', () => {
  it('should return a number between 0 and 1', () => {
    const result = getSecureRandomFloat();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1);
  });

  it('should generate different random numbers on multiple calls', () => {
    const results = new Set();
    for (let i = 0; i < 10; i++) {
      results.add(getSecureRandomFloat());
    }
    // With 10 iterations, we should get at least 8 unique values
    expect(results.size).toBeGreaterThanOrEqual(8);
  });

  it('should throw error when crypto is unavailable', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(() => getSecureRandomFloat()).toThrow(
      'Secure random number generation is unavailable in this environment.'
    );

    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true,
    });
  });

  it('should throw error when getRandomValues is unavailable', () => {
    const originalGetRandomValues = globalThis.crypto?.getRandomValues;
    if (globalThis.crypto) {
      Object.defineProperty(globalThis.crypto, 'getRandomValues', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    }

    expect(() => getSecureRandomFloat()).toThrow(
      'Secure random number generation is unavailable in this environment.'
    );

    if (globalThis.crypto && originalGetRandomValues) {
      Object.defineProperty(globalThis.crypto, 'getRandomValues', {
        value: originalGetRandomValues,
        writable: true,
        configurable: true,
      });
    }
  });
});

describe('util.ts - getRandomItem', () => {
  it('should return an item from the list', () => {
    const list = ['a', 'b', 'c', 'd', 'e'];
    const result = getRandomItem(list);
    expect(list).toContain(result);
  });

  it('should return undefined for empty list', () => {
    const result = getRandomItem([]);
    expect(result).toBeUndefined();
  });

  it('should return the only item from single-item list', () => {
    const result = getRandomItem(['only']);
    expect(result).toBe('only');
  });

  it('should work with different data types', () => {
    const numberList = [1, 2, 3, 4, 5];
    const numberResult = getRandomItem(numberList);
    expect(numberList).toContain(numberResult);

    const objectList = [{ id: 1 }, { id: 2 }];
    const objectResult = getRandomItem(objectList);
    expect(objectList).toContain(objectResult);
  });

  it('should generate diverse random selections', () => {
    const list = ['a', 'b', 'c'];
    const results = new Set();
    for (let i = 0; i < 30; i++) {
      results.add(getRandomItem(list));
    }
    // With 30 iterations on 3-item list, should see multiple different items
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('util.ts - getDevLevelInt', () => {
  it('should convert remedial to 1', () => {
    expect(getDevLevelInt('remedial')).toBe(1);
  });

  it('should convert early-developing to 2', () => {
    expect(getDevLevelInt('early-developing')).toBe(2);
  });

  it('should convert developing to 3', () => {
    expect(getDevLevelInt('developing')).toBe(3);
  });

  it('should convert entrustable to 4', () => {
    expect(getDevLevelInt('entrustable')).toBe(4);
  });

  it('should convert none (default) to null', () => {
    expect(getDevLevelInt('none' as any)).toBeNull();
  });

  it('should convert unknown values to null', () => {
    expect(getDevLevelInt('unknown' as any)).toBeNull();
  });

  it('should handle all valid dev levels', () => {
    const mappings: Array<[string, number | null]> = [
      ['remedial', 1],
      ['early-developing', 2],
      ['developing', 3],
      ['entrustable', 4],
    ];
    mappings.forEach(([level, expected]) => {
      expect(getDevLevelInt(level as any)).toBe(expected);
    });
  });
});
