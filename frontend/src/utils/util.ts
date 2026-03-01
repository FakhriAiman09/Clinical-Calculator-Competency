import { DevLevel } from './types';

/**
 * Takes in a list of items and returns a random item from the list.
 * @param {T[]} list - The `list` with items.
 * @returns A random item from `list` or `undefined` if the list is empty.
 */
export function getRandomItem<T>(list: T[]): T | undefined {
  if (list.length === 0) return undefined;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Converts DevLevel to integer for database storage.
 * @param {DevLevel} devLevel - The development level.
 * @returns The mapping is as follows:
 * - 'none' → `null`
 * - 'remedial' → 1
 * - 'early-developing' → 2
 * - 'developing' → 3
 * - 'entrustable' → 4
 */
export function getDevLevelInt(devLevel: DevLevel): number | null {
  switch (devLevel) {
    case 'remedial':
      return 1;
    case 'early-developing':
      return 2;
    case 'developing':
      return 3;
    case 'entrustable':
      return 4;
    default:
      return null;
  }
}
