import { act, renderHook, waitFor } from '@testing-library/react';

import {
  refreshHistoricalMCQs,
  submitChangeAndRefresh,
  useEditModalController,
  useEditModalHistory,
} from '@/app/dashboard/admin/edit-questions-options/utils';
import { getHistoricalMCQs } from '@/utils/get-epa-data';

jest.mock('@/utils/get-epa-data', () => ({
  getHistoricalMCQs: jest.fn(),
}));

describe('edit-questions-options utils extra coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('refreshHistoricalMCQs sets latest values', async () => {
    const set = jest.fn();
    (getHistoricalMCQs as jest.Mock).mockResolvedValue([{ id: 'row-1' }]);

    await refreshHistoricalMCQs({ get: null, set } as any);
    expect(set).toHaveBeenCalledWith([{ id: 'row-1' }]);

    (getHistoricalMCQs as jest.Mock).mockResolvedValue(null);
    await refreshHistoricalMCQs({ get: null, set } as any);
    expect(set).toHaveBeenLastCalledWith(null);
  });

  it('submitChangeAndRefresh runs submit then refresh', async () => {
    const events: string[] = [];
    const submitChange = jest.fn(async () => {
      events.push('submit');
    });
    const set = jest.fn(() => {
      events.push('set');
    });

    (getHistoricalMCQs as jest.Mock).mockResolvedValue([{ id: 'row-2' }]);
    await submitChangeAndRefresh(submitChange, { get: null, set } as any);

    expect(submitChange).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith([{ id: 'row-2' }]);
    expect(events).toEqual(['submit', 'set']);
  });

  it('useEditModalHistory resets state and collapses accordion on hide event', async () => {
    const modal = document.createElement('div');
    modal.id = 'modal-1';
    document.body.appendChild(modal);

    const list = document.createElement('div');
    list.id = 'acc-1-list';
    list.className = 'show';
    document.body.appendChild(list);

    const button = document.createElement('button');
    button.id = 'acc-1-list-button';
    const clickSpy = jest.spyOn(button, 'click');
    document.body.appendChild(button);

    const resetModalState = jest.fn();
    const getUpdaterDetails = jest.fn().mockResolvedValue({
      id: 'u-1',
      display_name: 'User 1',
      email: 'u1@example.com',
    });

    const mcqsInformation = {
      get: [
        { updated_at: '2026-04-01T00:00:00.000Z', updated_by: 'u-1', text: 'version 1' },
      ],
      set: jest.fn(),
    };

    const { result } = renderHook(() =>
      useEditModalHistory({
        accordionID: 'acc-1',
        modalID: 'modal-1',
        mcqsInformation: mcqsInformation as any,
        canFetchHistory: true,
        getHistoryText: (row: any) => row.text,
        getUpdaterDetails,
        resetModalState,
      })
    );

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
    });
    expect(result.current.history).toHaveLength(1);

    act(() => {
      modal.dispatchEvent(new Event('hide.bs.modal'));
    });

    expect(resetModalState).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('useEditModalHistory stops early when cannot fetch', async () => {
    const modal = document.createElement('div');
    modal.id = 'modal-2';
    document.body.appendChild(modal);

    const { result } = renderHook(() =>
      useEditModalHistory({
        accordionID: 'acc-2',
        modalID: 'modal-2',
        mcqsInformation: { get: null, set: jest.fn() } as any,
        canFetchHistory: false,
        getHistoryText: () => 'x',
        getUpdaterDetails: jest.fn(),
        resetModalState: jest.fn(),
      })
    );

    await waitFor(() => {
      expect(result.current.loadingHistory).toBe(false);
      expect(result.current.history).toEqual([]);
    });
  });

  it('useEditModalController exposes handleSubmit that chains refresh', async () => {
    (getHistoricalMCQs as jest.Mock).mockResolvedValue([{ id: 'row-9' }]);

    const submitChange = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn();

    const { result } = renderHook(() =>
      useEditModalController({
        modalID: 'modal-3',
        mcqsInformation: { get: [], set } as any,
        canFetchHistory: false,
        getHistoryText: () => 'x',
        getUpdaterDetails: jest.fn(),
        resetModalState: jest.fn(),
        submitChange,
      })
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(submitChange).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith([{ id: 'row-9' }]);
    expect(typeof result.current.accordionID).toBe('string');
  });
});
