import { describe, expect, test } from '@jest/globals';

import { filterHistory } from '../../frontend/src/app/dashboard/admin/edit-questions-options/utils';

describe('filterHistory edge cases', () => {
  test('returns empty array when history is empty', () => {
    expect(filterHistory([])).toEqual([]);
  });

  test('returns the same single row when there is only one history entry', () => {
    const oneRow = [{ updated_at: new Date('2026-02-01T00:00:00Z'), updated_by: 'u1', text: 'Only' }];
    expect(filterHistory(oneRow)).toEqual(oneRow);
  });
});
