import { describe, expect, test } from '@jest/globals';

import { filterHistory } from '../../frontend/src/app/dashboard/admin/edit-questions-options/utils';

describe('filterHistory', () => {
  test('removes consecutive duplicate text while preserving sequence changes', () => {
    const history = [
      { updated_at: new Date('2026-01-01T00:00:00Z'), updated_by: 'u1', text: 'Initial' },
      { updated_at: new Date('2026-01-02T00:00:00Z'), updated_by: 'u2', text: 'Initial' },
      { updated_at: new Date('2026-01-03T00:00:00Z'), updated_by: 'u3', text: 'Revised once' },
      { updated_at: new Date('2026-01-04T00:00:00Z'), updated_by: 'u4', text: 'Revised once' },
      { updated_at: new Date('2026-01-05T00:00:00Z'), updated_by: 'u5', text: 'Final' },
    ];

    const filtered = filterHistory(history);
    expect(filtered.map((row) => row.text)).toEqual(['Initial', 'Revised once', 'Final']);
  });
});
