'use client';

import { cache, useCallback, useId, type Dispatch, type SetStateAction } from 'react';

import type { Tables } from '@/utils/supabase/database.types';
import type { MCQ } from '@/utils/types';

import { getUpdaterDetails, submitNewQuestion } from './actions';
import { renderQuestion } from './render-spans';
import EditModalLayout from './edit-modal-layout';
import { submitChangeAndRefresh, useEditModalHistory } from './utils';

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
  const accordionID = useId();

  const getQuestionHistoryText = useCallback(
    (mcqsMetaRow: Tables<'mcqs_options'>) =>
      (mcqsMetaRow.data as MCQ[]).find((mcq) => mcq.options[Object.keys(questionMCQ.get!.options)[0]])!.question,
    [questionMCQ.get]
  );
  const resetQuestionModal = useCallback(() => questionMCQ.set(null), [questionMCQ]);

  const { history, loadingHistory } = useEditModalHistory({
    accordionID,
    modalID: 'edit-question-modal',
    mcqsInformation,
    canFetchHistory: Boolean(questionMCQ.get),
    getHistoryText: getQuestionHistoryText,
    getUpdaterDetails: getCachedUpdaterDetails,
    resetModalState: resetQuestionModal,
  });

  const handleSubmit = async () => {
    await submitChangeAndRefresh(() => submitNewQuestion(questionMCQ.get!, newQuestionText.get!), mcqsInformation);
  };

  const submitDisabled = !questionMCQ.get || !newQuestionText.get || newQuestionText.get === questionMCQ.get.question;

  return (
    <EditModalLayout
      accordionID={accordionID}
      changesLabel='question'
      history={history}
      loadingHistory={loadingHistory}
      modalID='edit-question-modal'
      submitDisabled={submitDisabled}
      title='Edit question'
      onSubmit={handleSubmit}
    >
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
    </EditModalLayout>
  );
}
