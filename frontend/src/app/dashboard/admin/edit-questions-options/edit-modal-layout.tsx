import type { ReactNode } from 'react';

import type { changeHistoryInstance } from '@/utils/types';

import EditModalChangesList from './edit-modal-changes-list';

type EditModalLayoutProps = {
  children: ReactNode;
  modal: {
    id: string;
    title: string;
  };
  changes: {
    accordionID: string;
    label: string;
    history: changeHistoryInstance[];
    loading: boolean;
  };
  submit: {
    disabled: boolean;
    onClick: () => Promise<void> | void;
  };
};

export default function EditModalLayout({ children, modal, changes, submit }: EditModalLayoutProps) {
  const labelID = `${modal.id}-label`;

  return (
    <div className='modal fade' id={modal.id} tabIndex={-1} aria-labelledby={labelID} aria-hidden='true'>
      <div className='modal-dialog modal-dialog-centered modal-dialog-scrollable'>
        <div className='modal-content'>
          <ModalHeader labelID={labelID} title={modal.title} />

          <div className='modal-body'>
            {children}

            <hr className='my-4' />

            <EditModalChangesList
              changesLabel={changes.label}
              loadingHistory={changes.loading}
              history={changes.history}
              useID={changes.accordionID}
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
              disabled={submit.disabled}
              onClick={submit.onClick}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalHeader({ labelID, title }: { labelID: string; title: string }) {
  return (
    <div className='modal-header'>
      <h1 className='modal-title h5' id={labelID}>
        {title}
      </h1>
      <button type='button' className='btn-close' data-bs-dismiss='modal' aria-label='Close' />
    </div>
  );
}
