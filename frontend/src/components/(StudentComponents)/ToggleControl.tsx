// Component: /components/ToggleControl.tsx
'use client';

import React from 'react';

interface ToggleControlProps {
  selected: 3 | 6 | 12;
  onSelect: (value: 3 | 6 | 12) => void;
}

const ToggleControl: React.FC<ToggleControlProps> = ({ selected, onSelect }) => {
  return (
    <div className='btn-group' role='group' aria-label='Select Time Range'>
      {[3, 6, 12].map((value) => (
        <button
          key={value}
          type='button'
          className={`btn btn-outline-primary${selected === value ? ' active' : ''}`}
          onClick={() => onSelect(value as 3 | 6 | 12)}
        >
          Last {value} mo
        </button>
      ))}
    </div>
  );
};

export default ToggleControl;
