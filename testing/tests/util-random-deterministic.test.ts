import { describe, expect, jest, test } from '@jest/globals';

// This file makes random behavior deterministic for repeatable test results.
import { getRandomItem } from '../../frontend/src/utils/util';

describe('getRandomItem deterministic index selection', () => {
  // With Math.random near 1, selection should resolve to the last index.
  test('selects the last item when Math.random is near 1', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    const list = ['A', 'B', 'C'];

    expect(getRandomItem(list)).toBe('C');

    randomSpy.mockRestore();
  });
});
