'use client';

import { cache, useCallback } from 'react';

import type { Tables } from '@/utils/supabase/database.types';
import type { MCQ } from '@/utils/types';

import { getUpdaterDetails, submitNewOption } from './actions';
import { renderOption, renderQuestion } from './render-spans';
import EditModalLayout from './edit-modal-layout';
import { type MCQsInformationState, type ModalState, useEditModalController } from './utils';

const getCachedUpdaterDetails = cache(getUpdaterDetails);

type EditOptionModalProps = {
  mcqsInformation: MCQsInformationState;
  optionMCQ: ModalState<MCQ | null>;
  optionKey: ModalState<string | null>;
  optionText: ModalState<string | null>;
  newOptionText: ModalState<string | null>;
};

export default function EditOptionModal({
  mcqsInformation,
  optionMCQ,
  optionKey,
  optionText,
  newOptionText,
}: EditOptionModalProps) {
  const getOptionHistoryText = useCallback(
    (mcqsMetaRow: Tables<'mcqs_options'>) =>
      (mcqsMetaRow.data as MCQ[]).find((mcq) => mcq.options[optionKey.get!])!.options[optionKey.get!],
    [optionKey.get]
  );
  const resetOptionModal = useCallback(() => optionKey.set(null), [optionKey]);
  const submitOptionChange = useCallback(() => submitNewOption(optionKey.get!, newOptionText.get!), [newOptionText, optionKey]);
  const { accordionID, handleSubmit, history, loadingHistory } = useEditModalController({
    canFetchHistory: Boolean(optionKey.get),
    getHistoryText: getOptionHistoryText,
    getUpdaterDetails: getCachedUpdaterDetails,
    mcqsInformation,
    modalID: 'edit-option-modal',
    resetModalState: resetOptionModal,
    submitChange: submitOptionChange,
  });

  const submitDisabled =
    !optionMCQ.get || !optionKey.get || !optionText.get || !newOptionText.get || newOptionText.get === optionText.get;

  return (
    <EditModalLayout
      changes={{ accordionID, history, label: 'option', loading: loadingHistory }}
      modal={{ id: 'edit-option-modal', title: 'Edit option' }}
      submit={{ disabled: submitDisabled, onClick: handleSubmit }}
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
