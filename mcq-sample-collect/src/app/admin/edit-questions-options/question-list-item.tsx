import type { MCQ } from '@/utils/types';

import OptionItem from './question-list-option-item';
import { renderQuestion } from './render-spans';

type QuestionItemProps = Readonly<{
  i: number;
  mcq: MCQ;
  handleOptionClick: (mcq: MCQ, key: string, text: string) => void;
  handleQuestionClick: (mcq: MCQ) => void;
}>;

export default function QuestionItem({
  i,
  mcq,
  handleOptionClick,
  handleQuestionClick,
}: QuestionItemProps) {
  const headingId = `heading-${i}`;
  const collapseId = `collapse-${i}`;
  const questionToggleProps = {
    className: 'accordion-button collapsed gap-1',
    type: 'button' as const,
    'data-bs-toggle': 'collapse',
    'data-bs-target': `#${collapseId}`,
    'aria-expanded': 'false' as const,
    'aria-controls': collapseId,
  };
  const editQuestionModalProps = {
    'data-bs-toggle': 'modal',
    'data-bs-target': '#edit-question-modal',
  };
  const optionRows = Object.entries(mcq.options).map(([optionKey, optionValue]) => (
    <OptionItem
      key={optionKey}
      optKey={optionKey}
      value={optionValue}
      mcq={mcq}
      handleOptionClick={handleOptionClick}
    />
  ));

  return (
    <div className='accordion-item'>
      <h4 className='accordion-header' id={headingId}>
        <button {...questionToggleProps}>
          {renderQuestion(mcq.kf, mcq.question)}
        </button>
      </h4>
      <div
        id={collapseId}
        className='accordion-collapse collapse bg-body-secondary'
        aria-labelledby={headingId}
        data-bs-parent='#question-list'
      >
        <div className='d-flex justify-content-end'>
          <button
            className='btn btn-link m-2 mb-0'
            onClick={() => handleQuestionClick(mcq)}
            {...editQuestionModalProps}
          >
            <span className='me-2'>Edit question</span>
            <i className='bi bi-pencil'></i>
          </button>
        </div>
        <ul className='list-group p-2'>{optionRows}</ul>
      </div>
    </div>
  );
}
