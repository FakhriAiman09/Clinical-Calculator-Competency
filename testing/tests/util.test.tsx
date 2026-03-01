import { getRandomItem, getDevLevelInt } from '../../frontend/src/utils/util';
import { DevLevel } from '../../frontend/src/utils/types';

describe('getRandomItem', () => {
  test('returns an item from a list greater than length 1', () => {
    const list = ['apple', 487, Boolean, () => {console.log("Hello, World!");}];
    const item = getRandomItem(list);
    expect(list).toContain(item);
  });
  test('returns the item from a list of length 1', () => {
    const list = ['apple'];
    expect(getRandomItem(list)).toBe('apple');
  });
  test('returns undefined for an empty list', () => {
    expect(getRandomItem([])).toBeUndefined();
  });
});

describe('getDevLevelInt', () => {
  test('correctly maps DevLevel values to integers', () => {
    expect(getDevLevelInt('remedial')).toBe(1);
    expect(getDevLevelInt('early-developing')).toBe(2);
    expect(getDevLevelInt('developing')).toBe(3);
    expect(getDevLevelInt('entrustable')).toBe(4);
  });

  test('returns null for invalid DevLevel values', () => {
    expect(getDevLevelInt('none' as DevLevel)).toBeNull();
    expect(getDevLevelInt('unknown' as DevLevel)).toBeNull();
  });
});