'use client';

import { cache, useEffect, useId, useState, type Dispatch, type SetStateAction } from 'react';
import React from 'react';

import { getHistoricalMCQs } from '@/utils/get-epa-data';
import type { Tables } from '@/utils/supabase/database.types';
import type { MCQ, changeHistoryInstance } from '@/utils/types';

import { getUpdaterDetails, submitNewOption } from './actions';
import { renderOption, renderQuestion } from './render-spans';
import EditModalChangesList from './edit-modal-changes-list';
import { filterHistory } from './utils';

const getCachedUpdaterDetails = cache(getUpdaterDetails);

export default function EditOptionModal({
  mcqsInformation,
  optionMCQ,
  optionKey,
  optionText,
  newOptionText,
}: {
  mcqsInformation: {
    get: Tables<'mcqs_options'>[] | null;
    set: Dispatch<SetStateAction<Tables<'mcqs_options'>[] | null>>;
  };
  optionMCQ: {
    get: MCQ | null;
    set: Dispatch<SetStateAction<MCQ | null>>;
  };
  optionKey: {
    get: string | null;
    set: Dispatch<SetStateAction<string | null>>;
  };
  optionText: {
    get: string | null;
    set: Dispatch<SetStateAction<string | null>>;
  };
  newOptionText: {
    get: string | null;
    set: Dispatch<SetStateAction<string | null>>;
  };
}) {
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [optionHistory, setOptionHistory] = useState<changeHistoryInstance[] | null>(null);

  const accordionID = useId();

  useEffect(() => {
    // add event listener when modal is closed
    document.getElementById('edit-option-modal')?.addEventListener('hide.bs.modal', () => {
      optionKey.set(null);
      if (document.getElementById(`${accordionID}-list`)?.classList.contains('show'))
        document.getElementById(`${accordionID}-list-button`)?.click();
    });
  }, [accordionID, optionKey]);

  // on change of selected option, get historical change data
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      setOptionHistory(null);

      // If no option is selected, exit
      if (!optionKey.get || !mcqsInformation.get) {
        setLoadingHistory(false);
        return;
      }

      // Fetch historical changes for the selected option
      let history = mcqsInformation.get.map((mcqsMetaRow) => ({
        updated_at: new Date(mcqsMetaRow.updated_at),
        updated_by: mcqsMetaRow.updated_by ?? 'unknown updater',
        text: (mcqsMetaRow.data as MCQ[]).find((mcq) => mcq.options[optionKey.get!])!.options[optionKey.get!],
      })) satisfies changeHistoryInstance[];

      // Fetch updater for each history instance
      const updaterIDs = Array.from(new Set(history?.map((h) => h.updated_by)));
      const updaterDetails = await Promise.all(
        updaterIDs?.map(async (id) => await getCachedUpdaterDetails(id ?? '')) ?? []
      );

      history = history.map((h) => {
        const updater = updaterDetails?.find((u) => u?.id === h.updated_by);
        return {
          ...h,
          updater_display_name: updater?.display_name,
          updater_email: updater?.email,
        } satisfies changeHistoryInstance;
      });

      setOptionHistory(history);
      setLoadingHistory(false);
    };

    fetchHistory();
  }, [mcqsInformation.get, optionKey.get]);

  const handleSubmit = async () => {
    submitNewOption(optionKey.get!, newOptionText.get!).then(() =>
      getHistoricalMCQs().then((mcqs) => mcqsInformation.set(mcqs ?? null))
    );
  };

  const submitDisabled =
    !optionMCQ.get || !optionKey.get || !optionText.get || !newOptionText.get || newOptionText.get === optionText.get;

  return (
    <div
      className='modal fade'
      id='edit-option-modal'
      tabIndex={-1}
      aria-labelledby='edit-option-modal-label'
      aria-hidden='true'
    >
      <div className='modal-dialog modal-dialog-centered modal-dialog-scrollable'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h1 className='modal-title h5' id='edit-option-modal-label'>
              Edit option
            </h1>
            <button type='button' className='btn-close' data-bs-dismiss='modal' aria-label='Close' />
          </div>

          <div className='modal-body'>
            <p>
              <strong>Question:</strong>
              <br />
              {optionMCQ.get ? renderQuestion(optionMCQ.get.kf, optionMCQ.get.question) : ''}
            </p>

            <hr />

            <p>
              <strong>Old option:</strong>
              <br />
              {renderOption(optionKey.get ?? '', optionText.get ?? '')}
            </p>
            <p className='fw-bold mb-1'>New option:</p>
            <div className='mb-3'>
              <input
                id='new-option'
                className='form-control'
                type='text'
                placeholder='Option text'
                onChange={(e) => newOptionText.set(e.target.value)}
              />
            </div>

            <hr className='my-4' />

            <EditModalChangesList
              loadingHistory={loadingHistory}
              history={filterHistory(optionHistory ?? [])}
              useID={accordionID}
            />
          </div>

          <div className='modal-footer'>
            <button type='button' className='btn btn-secondary' data-bs-dismiss='modal'>
              Cancel
            </button>
            <button
              type='button'
              className='btn btn-primary'
              data-bs-dismiss='modal'
              disabled={submitDisabled}
              onClick={handleSubmit}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
