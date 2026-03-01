'use client';

import { cache, useEffect, useId, useState, type Dispatch, type SetStateAction } from 'react';
import React from 'react';

import { getHistoricalMCQs } from '@/utils/get-epa-data';
import type { Tables } from '@/utils/supabase/database.types';
import type { MCQ, changeHistoryInstance } from '@/utils/types';

import { getUpdaterDetails, submitNewQuestion } from './actions';
import { renderQuestion } from './render-spans';
import EditModalChangesList from './edit-modal-changes-list';
import { filterHistory } from './utils';

const getCachedUpdaterDetails = cache(getUpdaterDetails);

export default function EditQuestionModal({
  mcqsInformation,
  questionMCQ,
  newQuestionText,
}: {
  mcqsInformation: {
    get: Tables<'mcqs_options'>[] | null;
    set: Dispatch<SetStateAction<Tables<'mcqs_options'>[] | null>>;
  };
  questionMCQ: {
    get: MCQ | null;
    set: Dispatch<SetStateAction<MCQ | null>>;
  };
  newQuestionText: {
    get: string | null;
    set: Dispatch<SetStateAction<string | null>>;
  };
}) {
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<changeHistoryInstance[] | null>(null);

  const accordionID = useId();

  useEffect(() => {
    // add event listener when modal is closed
    document.getElementById('edit-question-modal')?.addEventListener('hide.bs.modal', () => {
      questionMCQ.set(null);
      if (document.getElementById(`${accordionID}-list`)?.classList.contains('show'))
        document.getElementById(`${accordionID}-list-button`)?.click();
    });
  }, [accordionID, questionMCQ]);

  // on change of selected option, get historical change data
  useEffect(() => {
    const fetchHistory = async () => {
      console.log('fetchHistory');
      setLoadingHistory(true);
      setQuestionHistory(null);

      // If no option is selected, exit
      if (!questionMCQ.get || !mcqsInformation.get) {
        setLoadingHistory(false);
        return;
      }

      // Fetch historical changes for the selected question
      let history = mcqsInformation.get.map((mcqsMetaRow) => ({
        updated_at: new Date(mcqsMetaRow.updated_at),
        updated_by: mcqsMetaRow.updated_by ?? 'unknown updater',
        text: (mcqsMetaRow.data as MCQ[]).find((mcq) => mcq.options[Object.keys(questionMCQ.get!.options)[0]])!
          .question,
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

      setQuestionHistory(history);
      setLoadingHistory(false);
    };

    fetchHistory();
  }, [mcqsInformation.get, questionMCQ.get]);

  const handleSubmit = async () => {
    submitNewQuestion(questionMCQ.get!, newQuestionText.get!).then(() =>
      getHistoricalMCQs().then((mcqs) => mcqsInformation.set(mcqs ?? null))
    );
  };

  const submitDisabled = !questionMCQ.get || !newQuestionText.get || newQuestionText.get === questionMCQ.get.question;

  return (
    <div
      className='modal fade'
      id='edit-question-modal'
      tabIndex={-1}
      aria-labelledby={`edit-question-modal-label`}
      aria-hidden='true'
    >
      <div className='modal-dialog modal-dialog-centered modal-dialog-scrollable'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h1 className='modal-title h5' id='edit-question-modal-label'>
              Edit question
            </h1>
            <button type='button' className='btn-close' data-bs-dismiss='modal' aria-label='Close' />
          </div>

          <div className='modal-body'>
            <p>
              <strong>Old question:</strong>
              <br />
              {questionMCQ.get ? renderQuestion(questionMCQ.get.kf, questionMCQ.get.question) : ''}
            </p>
            <p className='fw-bold mb-1'>New question:</p>
            <div className='mb-3'>
              <textarea
                id='new-question'
                className='form-control'
                rows={2}
                placeholder='Question text'
                onChange={(e) => newQuestionText.set(e.target.value)}
              />
            </div>

            <hr className='my-4' />

            <EditModalChangesList
              loadingHistory={loadingHistory}
              history={filterHistory(questionHistory ?? [])}
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
