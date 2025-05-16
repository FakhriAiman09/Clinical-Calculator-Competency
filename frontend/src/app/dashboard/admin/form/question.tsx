import React, { ChangeEvent, Dispatch, SetStateAction } from 'react';

import { MCQ } from '@/utils/types';

export default function Question({
  question,
  choices,
  setChoices,
}: {
  question: MCQ | undefined;
  choices: { [key: string]: boolean };
  setChoices: Dispatch<SetStateAction<{ [key: string]: boolean }>>;
}) {
  const onChange = (event: ChangeEvent) => {
    const { id, checked } = event.target as HTMLInputElement;
    setChoices((prev) => ({
      ...prev,
      [id]: checked,
    }));
  }

  return (
    <>
      {question ? (
        <div className='text-start py-2'>
          <div className='fs-4 mb-3'>{question.question}</div>
          <div className='form-check ps-0'>
            {Object.entries(question.options).map(([k, v]) => (
              <div key={k} className='form-check mb-2'>
                <input className='form-check-input' type='checkbox' id={k} checked={choices[k]} onChange={onChange} />
                <label className={`form-check-label`} htmlFor={k}>
                  {v}
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>Question not found</div>
      )}
    </>
  );
}
