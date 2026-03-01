import React, { useEffect } from 'react';

const devLevelLabels = ['Remedial', 'Early', 'Developing', 'Entrustable'];
const devLevelColors = ['#ea3636', '#ffb800', '#90ee90', '#3ead16'];

interface HistoryEntry {
  date: string;
  level: string;
}

interface KeyFunction {
  id: string;
  description: string;
  history: HistoryEntry[];
}

interface EPA {
  epa: number;
  keyFunctions: KeyFunction[];
}

interface EPAModalProps {
  selectedEpa: EPA | null;
  onClose: () => void;
  getAverage: (kf: KeyFunction) => number | null;
}

const EPAModal: React.FC<EPAModalProps> = ({ selectedEpa, onClose, getAverage }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!selectedEpa) return null;

  return (
    <>
      <div
        className='modal fade show d-block'
        tabIndex={-1}
        role='dialog'
        aria-labelledby='epaModalLabel'
        aria-modal='true'
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      >
        <div className='modal-dialog modal-dialog-centered' role='document' onClick={(e) => e.stopPropagation()}>
          <div className='modal-content'>
            <div className='modal-header'>
              <h5 className='modal-title' id='epaModalLabel'>
                EPA {selectedEpa.epa} Key Functions
              </h5>
              <button type='button' className='btn-close' onClick={onClose} aria-label='Close'></button>
            </div>
            <div className='modal-body'>
              {selectedEpa.keyFunctions.map((kf) => {
                const avg = getAverage(kf);
                return avg !== null ? (
                  <div key={kf.id} className='d-flex justify-content-between align-items-center border-bottom py-2'>
                    <div>{kf.description}</div>
                    <span className='badge text-white' style={{ backgroundColor: devLevelColors[avg] }}>
                      {devLevelLabels[avg]}
                    </span>
                  </div>
                ) : null;
              })}
            </div>
            <div className='modal-footer'>
              <button type='button' className='btn btn-secondary' onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EPAModal;
