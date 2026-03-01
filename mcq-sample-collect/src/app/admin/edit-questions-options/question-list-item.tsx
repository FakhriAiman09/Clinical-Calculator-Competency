import type { MCQ } from '@/utils/types';

import OptionItem from './question-list-option-item';
import { renderQuestion } from './render-spans';

export default function QuestionItem({
  i,
  mcq,
  handleOptionClick,
  handleQuestionClick,
}: {
  i: number;
  mcq: MCQ;
  handleOptionClick: (mcq: MCQ, key: string, text: string) => void;
  handleQuestionClick: (mcq: MCQ) => void;
}) {
  return (
    <div className='accordion-item'>
      <h4 className='accordion-header' id={`heading-${i}`}>
        <button
          className='accordion-button collapsed gap-1'
          type='button'
          data-bs-toggle='collapse'
          data-bs-target={`#collapse-${i}`}
          aria-expanded='false'
          aria-controls={`collapse-${i}`}
        >
          {renderQuestion(mcq.kf, mcq.question)}
        </button>
      </h4>
      <div
        id={`collapse-${i}`}
        className='accordion-collapse collapse bg-body-secondary'
        aria-labelledby={`heading-${i}`}
        data-bs-parent='#question-list'
      >
        <div className='d-flex justify-content-end'>
          <button
            className='btn btn-link m-2 mb-0'
            onClick={() => handleQuestionClick(mcq)}
            data-bs-toggle='modal'
            data-bs-target='#edit-question-modal'
          >
            <span className='me-2'>Edit question</span>
            <i className='bi bi-pencil'></i>
          </button>
        </div>
        <ul className='list-group p-2'>
          {Object.entries(mcq.options).map(([key, value]) => (
            <OptionItem key={key} optKey={key} value={value} mcq={mcq} handleOptionClick={handleOptionClick} />
          ))}
        </ul>
      </div>
    </div>
  );
}
