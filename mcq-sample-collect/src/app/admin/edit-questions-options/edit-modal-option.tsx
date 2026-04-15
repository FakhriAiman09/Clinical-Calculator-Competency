'use client';

import { cache, useCallback, useId, type Dispatch, type SetStateAction } from 'react';

import type { Tables } from '@/utils/supabase/database.types';
import type { MCQ } from '@/utils/types';

import { getUpdaterDetails, submitNewOption } from './actions';
import { renderOption, renderQuestion } from './render-spans';
import EditModalLayout from './edit-modal-layout';
import { submitChangeAndRefresh, useEditModalHistory } from './utils';

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
  const accordionID = useId();

  const getOptionHistoryText = useCallback(
    (mcqsMetaRow: Tables<'mcqs_options'>) =>
      (mcqsMetaRow.data as MCQ[]).find((mcq) => mcq.options[optionKey.get!])!.options[optionKey.get!],
    [optionKey.get]
  );
  const resetOptionModal = useCallback(() => optionKey.set(null), [optionKey]);

  const { history, loadingHistory } = useEditModalHistory({
    accordionID,
    modalID: 'edit-option-modal',
    mcqsInformation,
    canFetchHistory: Boolean(optionKey.get),
    getHistoryText: getOptionHistoryText,
    getUpdaterDetails: getCachedUpdaterDetails,
    resetModalState: resetOptionModal,
  });

  const handleSubmit = async () => {
    await submitChangeAndRefresh(() => submitNewOption(optionKey.get!, newOptionText.get!), mcqsInformation);
  };

  const submitDisabled =
    !optionMCQ.get || !optionKey.get || !optionText.get || !newOptionText.get || newOptionText.get === optionText.get;

  return (
    <EditModalLayout
      accordionID={accordionID}
      changesLabel='option'
      history={history}
      loadingHistory={loadingHistory}
      modalID='edit-option-modal'
      submitDisabled={submitDisabled}
      title='Edit option'
      onSubmit={handleSubmit}
    >
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
    </EditModalLayout>
  );
}
