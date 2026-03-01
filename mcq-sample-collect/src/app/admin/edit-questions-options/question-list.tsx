'use client';

import { useEffect, useState } from 'react';

import Loading from '@/components/loading';
import { getHistoricalMCQs } from '@/utils/get-epa-data';
import type { Tables } from '@/utils/supabase/database.types';
import type { MCQ } from '@/utils/types';

import EditOptionModal from './edit-modal-option';
import EditQuestionModal from './edit-modal-question';
import QuestionItem from './question-list-item';

export default function QuestionList() {
  const [mcqsInformation, setMCQsInformation] = useState<Tables<'mcqs_options'>[] | null>(null);

  const [optionMCQ, setOptionMCQ] = useState<MCQ | null>(null);
  const [optionKey, setOptionKey] = useState<string | null>(null);
  const [optionText, setOptionText] = useState<string | null>(null);
  const [newOptionText, setNewOptionText] = useState<string | null>(null);

  const [questionMCQ, setQuestionMCQ] = useState<MCQ | null>(null);
  const [newQuestionText, setNewQuestionText] = useState<string | null>(null);

  useEffect(() => {
    const fetchMCQs = async () => setMCQsInformation((await getHistoricalMCQs()) ?? null);
    fetchMCQs();
  }, []);

  const handleOptionClick = (mcq: MCQ, key: string, text: string) => {
    setOptionMCQ(mcq);
    setOptionKey(key);
    setOptionText(text);
    setNewOptionText(text);
    document.querySelectorAll('input[id="new-option"]').forEach((el) => {
      (el as HTMLInputElement).value = text;
    });
  };

  const handleQuestionClick = (mcq: MCQ) => {
    setQuestionMCQ(mcq);
    setNewQuestionText(mcq.question);
    document.querySelectorAll('textarea[id="new-question"]').forEach((el) => {
      (el as HTMLInputElement).value = mcq.question;
    });
  };

  return (
    <>
      <h3 className='mb-3'>Edit form questions and options</h3>
      {!mcqsInformation || !mcqsInformation.length || !mcqsInformation![0].data ? (
        <Loading />
      ) : (
        <div className='accordion' id='question-list'>
          {(mcqsInformation[0].data as MCQ[]).map((mcq, i) => (
            <QuestionItem
              key={i}
              i={i}
              mcq={mcq}
              handleOptionClick={handleOptionClick}
              handleQuestionClick={handleQuestionClick}
            />
          ))}
        </div>
      )}

      <EditOptionModal
        mcqsInformation={{ get: mcqsInformation, set: setMCQsInformation }}
        optionMCQ={{ get: optionMCQ, set: setOptionMCQ }}
        optionKey={{ get: optionKey, set: setOptionKey }}
        optionText={{ get: optionText, set: setOptionText }}
        newOptionText={{ get: newOptionText, set: setNewOptionText }}
      />
      <EditQuestionModal
        mcqsInformation={{ get: mcqsInformation, set: setMCQsInformation }}
        questionMCQ={{ get: questionMCQ, set: setQuestionMCQ }}
        newQuestionText={{ get: newQuestionText, set: setNewQuestionText }}
      />
    </>
  );
}
