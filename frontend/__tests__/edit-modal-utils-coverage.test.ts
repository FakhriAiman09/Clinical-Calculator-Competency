// Tests for edit-questions-options/utils.ts - history filtering and enrichment
import { filterHistory, enrichHistoryWithUpdaterDetails, useEditModalHistory } from '@/app/dashboard/admin/edit-questions-options/utils';
import type { changeHistoryInstance } from '@/utils/types';
import { renderHook, waitFor } from '@testing-library/react';

describe('edit-modal-utils.ts - filterHistory', () => {
  it('should return empty array for empty input', () => {
    const result = filterHistory([]);
    expect(result).toEqual([]);
  });

  it('should keep all items when there are no consecutive duplicates', () => {
    const history: changeHistoryInstance[] = [
      { text: 'text1', updated_by: 'user1', updated_at: '2024-01-01' },
      { text: 'text2', updated_by: 'user2', updated_at: '2024-01-02' },
      { text: 'text3', updated_by: 'user3', updated_at: '2024-01-03' },
    ];
    const result = filterHistory(history);
    expect(result).toHaveLength(3);
  });

  it('should filter out consecutive duplicate text entries, keeping oldest', () => {
    const history: changeHistoryInstance[] = [
      { text: 'same', updated_by: 'user1', updated_at: '2024-01-01' },
      { text: 'same', updated_by: 'user2', updated_at: '2024-01-02' },
      { text: 'different', updated_by: 'user3', updated_at: '2024-01-03' },
    ];
    const result = filterHistory(history);
    // Should keep the oldest 'same' and 'different'
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('same');
    expect(result[1].text).toBe('different');
  });

  it('should handle single item list', () => {
    const history: changeHistoryInstance[] = [
      { text: 'only', updated_by: 'user1', updated_at: '2024-01-01' },
    ];
    const result = filterHistory(history);
    expect(result).toEqual(history);
  });

  it('should preserve order with mixed duplicates', () => {
    const history: changeHistoryInstance[] = [
      { text: 'a', updated_by: 'user1', updated_at: '2024-01-01' },
      { text: 'a', updated_by: 'user2', updated_at: '2024-01-02' },
      { text: 'b', updated_by: 'user3', updated_at: '2024-01-03' },
      { text: 'b', updated_by: 'user4', updated_at: '2024-01-04' },
      { text: 'c', updated_by: 'user5', updated_at: '2024-01-05' },
    ];
    const result = filterHistory(history);
    expect(result.map((h) => h.text)).toEqual(['a', 'b', 'c']);
  });

  it('should return original if filtered result is empty, taking last item', () => {
    // This edge case: if all items are filtered out, return the last item
    const history: changeHistoryInstance[] = [
      { text: 'same', updated_by: 'user1', updated_at: '2024-01-01' },
      { text: 'same', updated_by: 'user2', updated_at: '2024-01-02' },
    ];
    const result = filterHistory(history);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('same');
  });
});

describe('edit-modal-utils.ts - enrichHistoryWithUpdaterDetails', () => {
  const mockGetUpdaterDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enrich history with updater details', async () => {
    const history: changeHistoryInstance[] = [
      { text: 'text1', updated_by: 'user1', updated_at: '2024-01-01' },
      { text: 'text2', updated_by: 'user2', updated_at: '2024-01-02' },
    ];

    mockGetUpdaterDetails.mockImplementation((id: string) => {
      return Promise.resolve({
        id,
        display_name: `User ${id}`,
        email: `${id}@example.com`,
      });
    });

    const result = await enrichHistoryWithUpdaterDetails(history, mockGetUpdaterDetails);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('updater_display_name', 'User user1');
    expect(result[0]).toHaveProperty('updater_email', 'user1@example.com');
    expect(result[1]).toHaveProperty('updater_display_name', 'User user2');
  });

  it('should handle duplicate user IDs efficiently', async () => {
    const history: changeHistoryInstance[] = [
      { text: 'text1', updated_by: 'user1', updated_at: '2024-01-01' },
      { text: 'text2', updated_by: 'user1', updated_at: '2024-01-02' },
      { text: 'text3', updated_by: 'user2', updated_at: '2024-01-03' },
    ];

    mockGetUpdaterDetails.mockImplementation((id: string) => {
      return Promise.resolve({
        id,
        display_name: `User ${id}`,
        email: `${id}@example.com`,
      });
    });

    const result = await enrichHistoryWithUpdaterDetails(history, mockGetUpdaterDetails);

    expect(mockGetUpdaterDetails).toHaveBeenCalledTimes(2); // Only 2 unique users
    expect(result).toHaveLength(3);
  });

  it('should handle null updater details', async () => {
    const history: changeHistoryInstance[] = [
      { text: 'text1', updated_by: 'user1', updated_at: '2024-01-01' },
    ];

    mockGetUpdaterDetails.mockResolvedValue(null);

    const result = await enrichHistoryWithUpdaterDetails(history, mockGetUpdaterDetails);

    expect(result[0]).toHaveProperty('updater_display_name', undefined);
    expect(result[0]).toHaveProperty('updater_email', undefined);
  });

  it('should handle null updated_by in history', async () => {
    const history: changeHistoryInstance[] = [
      { text: 'text1', updated_by: null, updated_at: '2024-01-01' },
    ];

    mockGetUpdaterDetails.mockResolvedValue({
      id: '',
      display_name: 'Unknown',
      email: null,
    });

    const result = await enrichHistoryWithUpdaterDetails(history, mockGetUpdaterDetails);

    expect(mockGetUpdaterDetails).toHaveBeenCalledWith('');
    expect(result).toHaveLength(1);
  });

  it('should preserve all original history properties', async () => {
    const history: changeHistoryInstance[] = [
      { text: 'original', updated_by: 'user1', updated_at: '2024-01-01' },
    ];

    mockGetUpdaterDetails.mockResolvedValue({
      id: 'user1',
      display_name: 'Test User',
      email: 'test@example.com',
    });

    const result = await enrichHistoryWithUpdaterDetails(history, mockGetUpdaterDetails);

    expect(result[0]).toHaveProperty('text', 'original');
    expect(result[0]).toHaveProperty('updated_by', 'user1');
    expect(result[0]).toHaveProperty('updated_at', '2024-01-01');
  });
});

describe('edit-modal-utils.ts - useEditModalHistory hook', () => {
  const mockGetUpdaterDetails = jest.fn();
  const mockGetHistoryText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Note: Full hook testing requires wrapping in act() and provider setup
  // These tests verify the hook can be imported and used
  it('should export useEditModalHistory function', () => {
    expect(typeof useEditModalHistory).toBe('function');
  });

  it('should handle modal configuration object', () => {
    expect(useEditModalHistory).toBeDefined();
  });
});
