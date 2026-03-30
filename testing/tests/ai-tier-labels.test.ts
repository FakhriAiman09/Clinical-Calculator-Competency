import { describe, expect, test } from '@jest/globals';

// These tests verify how AI tier ids are shown in the UI.
import { getTierLabel, getTierColor } from '../../frontend/src/utils/ai-models';

describe('AI tier helpers', () => {
  // Confirms each tier id maps to the expected label and Bootstrap color.
  test('maps tier ids to expected display labels and colors', () => {
    expect(getTierLabel('balanced')).toBe('Balanced');
    expect(getTierLabel('powerful')).toBe('Powerful');

    expect(getTierColor('balanced')).toBe('primary');
    expect(getTierColor('powerful')).toBe('warning');
  });
});
