import type { MCQ } from '@/utils/types';

import { renderOption } from './render-spans';

export default function OptionItem({
  optKey,
  value,
  mcq,
  handleOptionClick,
}: {
  optKey: string;
  value: string;
  mcq: MCQ;
  handleOptionClick: (mcq: MCQ, key: string, text: string) => void;
}) {
  return (
    <li className='list-group-item pe-2 d-flex justify-content-between align-items-center'>
      {renderOption(optKey, value)}
      <button
        className='btn'
        data-bs-toggle='modal'
        data-bs-target='#edit-option-modal'
        onClick={() => handleOptionClick(mcq, optKey, value)}
      >
        <i className='bi bi-pencil'></i>
      </button>
    </li>
  );
}
