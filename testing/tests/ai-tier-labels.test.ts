import { describe, expect, test } from '@jest/globals';

import { getTierLabel, getTierColor } from '../../frontend/src/utils/ai-models';

describe('AI tier helpers', () => {
  test('maps tier ids to expected display labels and colors', () => {
    expect(getTierLabel('balanced')).toBe('Balanced');
    expect(getTierLabel('powerful')).toBe('Powerful');

    expect(getTierColor('balanced')).toBe('primary');
    expect(getTierColor('powerful')).toBe('warning');
  });
});
