import React, { useEffect } from 'react';

const devLevelLabels = ['Remedial', 'Early', 'Developing', 'Entrustable'];
const devLevelColors = ['#ea3636', '#ffb800', '#90ee90', '#3ead16'];
const devLevelMap: Record<string, number> = {
  remedial: 0,
  'early-developing': 1,
  developing: 2,
  entrustable: 3,
};

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
  range: number;
}

const EPAModal: React.FC<EPAModalProps> = ({ selectedEpa, onClose, range }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!selectedEpa) return null;

  // Group history entries by date within the selected range
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - range);

  const byDate = new Map<string, { description: string; levelIndex: number }[]>();

  for (const kf of selectedEpa.keyFunctions) {
    for (const h of kf.history) {
      if (h.level === 'none' || !(h.level in devLevelMap)) continue;
      if (new Date(h.date) < cutoff) continue;
      const dateKey = h.date.slice(0, 10);
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push({
        description: kf.description,
        levelIndex: devLevelMap[h.level],
      });
    }
  }

  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

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
            <div className='modal-body' style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {sortedDates.length === 0 ? (
                <p className='text-muted text-center mb-0'>No assessments in this time range.</p>
              ) : (
                sortedDates.map((dateKey) => (
                  <div key={dateKey} className='mb-3'>
                    <div className='text-muted small fw-semibold border-bottom pb-1 mb-2'>
                      {new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    {byDate.get(dateKey)!.map((item, i) => (
                      <div key={i} className='d-flex justify-content-between align-items-center py-1'>
                        <div className='me-3'>{item.description}</div>
                        <span
                          className='badge text-white flex-shrink-0'
                          style={{ backgroundColor: devLevelColors[item.levelIndex] }}
                        >
                          {devLevelLabels[item.levelIndex]}
                        </span>
                      </div>
                    ))}
                  </div>
                ))
              )}
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
