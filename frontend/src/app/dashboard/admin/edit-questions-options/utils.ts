import { useCallback, useEffect, useId, useState, type Dispatch, type SetStateAction } from 'react';

import { getHistoricalMCQs } from '@/utils/get-epa-data';
import type { Tables } from '@/utils/supabase/database.types';
import type { changeHistoryInstance } from '@/utils/types';

export const filterHistory = (hist: changeHistoryInstance[]) => {
  if (hist.length === 0) return hist;
  // history is ordered recent to old, filter out consecutive duplicates (keep oldest)
  const filtered = hist.filter((h, i) => (hist[i + 1] && h.text !== hist[i + 1].text) || i === hist.length - 1);
  return filtered.length === 0 ? hist.slice(hist.length - 1) : filtered;
};

type UpdaterDetails = {
  id: string;
  display_name: string | null;
  email: string | null;
} | null;

export async function enrichHistoryWithUpdaterDetails(
  history: changeHistoryInstance[],
  getUpdaterDetails: (id: string) => Promise<UpdaterDetails>
) {
  const updaterIds = Array.from(new Set(history.map((entry) => entry.updated_by)));
  const updaterDetails = await Promise.all(updaterIds.map((id) => getUpdaterDetails(id ?? '')));

  return history.map((entry) => {
    const updater = updaterDetails.find((details) => details?.id === entry.updated_by);
    return {
      ...entry,
      updater_display_name: updater?.display_name,
      updater_email: updater?.email,
    } satisfies changeHistoryInstance;
  });
}

export type ModalState<T> = {
  get: T;
  set: Dispatch<SetStateAction<T>>;
};

export type MCQsInformationState = ModalState<Tables<'mcqs_options'>[] | null>;

type UseEditModalHistoryParams = {
  accordionID: string;
  modalID: string;
  mcqsInformation: MCQsInformationState;
  canFetchHistory: boolean;
  getHistoryText: (mcqsMetaRow: Tables<'mcqs_options'>) => string;
  getUpdaterDetails: (id: string) => Promise<UpdaterDetails>;
  resetModalState: () => void;
};

export function useEditModalHistory({
  accordionID,
  modalID,
  mcqsInformation,
  canFetchHistory,
  getHistoryText,
  getUpdaterDetails,
  resetModalState,
}: UseEditModalHistoryParams) {
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [history, setHistory] = useState<changeHistoryInstance[] | null>(null);

  useEffect(() => {
    const modal = document.getElementById(modalID);
    const onModalHidden = () => {
      resetModalState();
      if (document.getElementById(`${accordionID}-list`)?.classList.contains('show')) {
        document.getElementById(`${accordionID}-list-button`)?.click();
      }
    };

    modal?.addEventListener('hide.bs.modal', onModalHidden);
    return () => modal?.removeEventListener('hide.bs.modal', onModalHidden);
  }, [accordionID, modalID, resetModalState]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistory(null);

    if (!canFetchHistory || !mcqsInformation.get) {
      setLoadingHistory(false);
      return;
    }

    const modalHistory = mcqsInformation.get.map((mcqsMetaRow) => ({
      updated_at: new Date(mcqsMetaRow.updated_at),
      updated_by: mcqsMetaRow.updated_by ?? 'unknown updater',
      text: getHistoryText(mcqsMetaRow),
    })) satisfies changeHistoryInstance[];

    setHistory(await enrichHistoryWithUpdaterDetails(modalHistory, getUpdaterDetails));
    setLoadingHistory(false);
  }, [canFetchHistory, getHistoryText, getUpdaterDetails, mcqsInformation.get]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history: filterHistory(history ?? []),
    loadingHistory,
  };
}

export async function refreshHistoricalMCQs(mcqsInformation: MCQsInformationState) {
  const mcqs = await getHistoricalMCQs();
  mcqsInformation.set(mcqs ?? null);
}

export async function submitChangeAndRefresh(
  submitChange: () => Promise<unknown>,
  mcqsInformation: MCQsInformationState
) {
  await submitChange();
  await refreshHistoricalMCQs(mcqsInformation);
}

type UseEditModalControllerParams = {
  modalID: string;
  mcqsInformation: MCQsInformationState;
  canFetchHistory: boolean;
  getHistoryText: (mcqsMetaRow: Tables<'mcqs_options'>) => string;
  getUpdaterDetails: (id: string) => Promise<UpdaterDetails>;
  resetModalState: () => void;
  submitChange: () => Promise<unknown>;
};

export function useEditModalController({
  modalID,
  mcqsInformation,
  canFetchHistory,
  getHistoryText,
  getUpdaterDetails,
  resetModalState,
  submitChange,
}: UseEditModalControllerParams) {
  const accordionID = useId();
  const { history, loadingHistory } = useEditModalHistory({
    accordionID,
    modalID,
    mcqsInformation,
    canFetchHistory,
    getHistoryText,
    getUpdaterDetails,
    resetModalState,
  });

  const handleSubmit = useCallback(async () => {
    await submitChangeAndRefresh(submitChange, mcqsInformation);
  }, [mcqsInformation, submitChange]);

  return {
    accordionID,
    handleSubmit,
    history,
    loadingHistory,
  };
}
