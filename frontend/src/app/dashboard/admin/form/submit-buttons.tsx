import React, { Dispatch, SetStateAction, SyntheticEvent } from 'react';

import { DevLevel } from '@/utils/types';

import { DevelopingIcon, EarlyDevelopingIcon, EntrustableIcon, RemedialIcon } from './button-svgs';

export default function SubmitButtons({
  skip,
  submit,
  devLevel,
}: {
  skip: () => void;
  submit: () => void;
  devLevel: { set: Dispatch<SetStateAction<DevLevel>>; val: DevLevel };
}) {
  const size = '2.5em';
  // prettier-ignore
  const buttons: {text: string; value: DevLevel; color: string; icon: React.JSX.Element}[] = [
    {text: 'Rem',   value: 'remedial',         color: 'danger',  icon: <RemedialIcon        size={size} />},
    {text: 'E Dev', value: 'early-developing', color: 'warning', icon: <EarlyDevelopingIcon size={size} />},
    {text: 'Dev',   value: 'developing',       color: 'info',    icon: <DevelopingIcon      size={size} />},
    {text: 'Ent',   value: 'entrustable',      color: 'success', icon: <EntrustableIcon     size={size} />},
  ];

  const handleInput = (e: SyntheticEvent) => {
    devLevel.set((e.target as HTMLInputElement).value as DevLevel);
  };

  const handleClear = () => {
    document
      .querySelectorAll('input[name="development-level"]')
      .forEach((el) => ((el as HTMLInputElement).checked = false));
    devLevel.set('none');
  };

  const handleSkip = () => {
    handleClear();
    skip();
  };

  const handleSubmit = () => {
    handleClear();
    submit();
  };

  return (
    <div className='bg-light text-center'>
      <div className='container p-3' style={{ maxWidth: '720px' }}>
        <div className='row'>
          <div className='btn-toolbar' role='toolbar' aria-label='Toolbar with button groups'>
            <div className='btn-group me-2 flex-grow-1' role='group' aria-label='Development level'>
              {buttons.map((btn) => (
                <React.Fragment key={btn.text}>
                  <input
                    type='radio'
                    className='btn-check'
                    name='development-level'
                    id={`development-level-${btn.value}`}
                    value={btn.value}
                    onClick={handleInput}
                    autoComplete='off'
                  ></input>
                  <label className={`btn btn-outline-${btn.color} fw-bold`} htmlFor={`development-level-${btn.value}`}>
                    <div>{btn.icon}</div>
                    <div>{btn.text}</div>
                  </label>
                </React.Fragment>
              ))}
            </div>
            <div className='btn-group' role='group' aria-label='Clear selection'>
              <button type='button' className='btn btn-outline-secondary' onClick={handleClear}>
                <i className='bi bi-x-lg'></i>
              </button>
            </div>
          </div>
        </div>
        <div className='row'>
          <div className='col d-grid'>
            <button type='button' className='btn btn-secondary mt-3' onClick={handleSkip}>
              Skip<i className='bi bi-ban ms-2'></i>
            </button>
          </div>
          <div className='col d-grid'>
            <button
              type='button'
              className='btn btn-primary mt-3'
              onClick={handleSubmit}
              disabled={devLevel.val === 'none'}
            >
              Submit<i className='bi bi-send ms-2'></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
