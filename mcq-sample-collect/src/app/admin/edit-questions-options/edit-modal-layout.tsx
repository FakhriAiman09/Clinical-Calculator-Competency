import type { ReactNode } from 'react';

import type { changeHistoryInstance } from '@/utils/types';

import EditModalChangesList from './edit-modal-changes-list';

export default function EditModalLayout({
  accordionID,
  changesLabel,
  children,
  history,
  loadingHistory,
  modalID,
  submitDisabled,
  title,
  onSubmit,
}: {
  accordionID: string;
  changesLabel: string;
  children: ReactNode;
  history: changeHistoryInstance[];
  loadingHistory: boolean;
  modalID: string;
  submitDisabled: boolean;
  title: string;
  onSubmit: () => Promise<void> | void;
}) {
  const labelID = `${modalID}-label`;

  return (
    <div className='modal fade' id={modalID} tabIndex={-1} aria-labelledby={labelID} aria-hidden='true'>
      <div className='modal-dialog modal-dialog-centered modal-dialog-scrollable'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h1 className='modal-title h5' id={labelID}>
              {title}
            </h1>
            <button type='button' className='btn-close' data-bs-dismiss='modal' aria-label='Close' />
          </div>

          <div className='modal-body'>
            {children}

            <hr className='my-4' />

            <EditModalChangesList
              changesLabel={changesLabel}
              loadingHistory={loadingHistory}
              history={history}
              useID={accordionID}
            />
          </div>

          <div className='modal-footer'>
            <button type='button' className='btn btn-secondary' data-bs-dismiss='modal'>
              Cancel
            </button>
            <button
              type='button'
              className='btn btn-primary'
              data-bs-dismiss='modal'
              disabled={submitDisabled}
              onClick={onSubmit}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
