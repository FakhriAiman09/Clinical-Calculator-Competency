import { memo } from 'react';

import Loading from '@/components/loading';
import type { changeHistoryInstance } from '@/utils/types';

const EditModalChangesList = memo(function EditModalChangesList({
  loadingHistory,
  history,
  useID,
}: {
  loadingHistory: boolean;
  history: changeHistoryInstance[] | null;
  useID: string;
}) {
  const listContent = history?.length ? (
    history?.map((h, i) => (
      <li className='list-group-item' key={i}>
        <div className='mb-1'>
          <span className='badge bg-body-secondary text-dark me-2'>{h.updated_at.toLocaleDateString()}</span>
          <span className='badge bg-body-secondary text-dark'>
            by {h.updater_display_name ?? h.updater_email ?? h.updated_by}
          </span>
        </div>
        <div>{h.text}</div>
      </li>
    ))
  ) : (
    <li className='list-group-item'>No changes found.</li>
  );

  return (
    <div className='accordion' id={useID}>
      <div className='accordion-item'>
        <h2 className='accordion-header' id={`${useID}-heading`}>
          <button
            className='accordion-button collapsed bg-body-secondary p-3'
            id={`${useID}-list-button`}
            type='button'
            data-bs-toggle='collapse'
            data-bs-target={`#${useID}-list`}
            aria-expanded='false'
            aria-controls='collapse'
          >
            Past changes to this option
          </button>
        </h2>

        <div id={`${useID}-list`} className='accordion-collapse collapse' aria-labelledby={`${useID}-heading`}>
          <div className='accordion-body p-0'>
            {loadingHistory ? (
              <div className='m-3'>
                <Loading />
              </div>
            ) : (
              <ul className='list-group list-group-flush rounded-bottom'>{listContent}</ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default EditModalChangesList;
