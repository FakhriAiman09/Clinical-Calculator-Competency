import { getRandomItem, getDevLevelInt } from '../../frontend/src/utils/util';
import { DevLevel } from '../../frontend/src/utils/types';

// This file tests utility helpers used by multiple UI features.
describe('getRandomItem', () => {
  // Should return one of the items when list has many values.
  test('returns an item from a list greater than length 1', () => {
    const list = ['apple', 487, Boolean, () => {console.log("Hello, World!");}];
    const item = getRandomItem(list);
    expect(list).toContain(item);
  });
  // Should return the same value when only one item exists.
  test('returns the item from a list of length 1', () => {
    const list = ['apple'];
    expect(getRandomItem(list)).toBe('apple');
  });
  // Should safely return undefined for an empty list.
  test('returns undefined for an empty list', () => {
    expect(getRandomItem([])).toBeUndefined();
  });
});

describe('getDevLevelInt', () => {
  // Confirms valid development levels map to expected numeric values.
  test('correctly maps DevLevel values to integers', () => {
    expect(getDevLevelInt('remedial')).toBe(1);
    expect(getDevLevelInt('early-developing')).toBe(2);
    expect(getDevLevelInt('developing')).toBe(3);
    expect(getDevLevelInt('entrustable')).toBe(4);
  });

  // Confirms invalid labels are rejected with null.
  test('returns null for invalid DevLevel values', () => {
    expect(getDevLevelInt('none' as DevLevel)).toBeNull();
    expect(getDevLevelInt('unknown' as DevLevel)).toBeNull();
  });
});