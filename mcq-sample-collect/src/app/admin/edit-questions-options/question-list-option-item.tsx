import type { MCQ } from '@/utils/types';

import { renderOption } from './render-spans';

type OptionItemProps = Readonly<{
  optKey: string;
  value: string;
  mcq: MCQ;
  handleOptionClick: (mcq: MCQ, key: string, text: string) => void;
}>;

export default function OptionItem({
  optKey,
  value,
  mcq,
  handleOptionClick,
}: OptionItemProps) {
  const editOptionModalProps = {
    'data-bs-toggle': 'modal',
    'data-bs-target': '#edit-option-modal',
  };
  const onEditOption = () => handleOptionClick(mcq, optKey, value);

  return (
    <li className='list-group-item pe-2 d-flex justify-content-between align-items-center'>
      {renderOption(optKey, value)}
      <button className='btn' onClick={onEditOption} {...editOptionModalProps}>
        <i className='bi bi-pencil'></i>
      </button>
    </li>
  );
}
