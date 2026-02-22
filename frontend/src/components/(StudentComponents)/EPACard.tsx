import React from 'react';
import HalfCircleGauge from './HalfCircleGauge';

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
  title: string;
  keyFunctions: KeyFunction[];
}

interface EPACardProps {
  epa: EPA;
  onClick: (epa: EPA) => void;
  getEPADevLevel: (kfs: KeyFunction[]) => number | null;
  getAverage: (kf: KeyFunction) => number | null;
  range: 3 | 6 | 12;
}

const EPACard: React.FC<EPACardProps> = ({ epa, onClick, getEPADevLevel, getAverage, range }) => {
  const avg = getEPADevLevel(epa.keyFunctions);
  const allGreen = epa.keyFunctions.every((kf) => getAverage(kf) === 3);

  return (
    <div
      className={`col-md-4 mb-4 range-${range}`}
      role='button'
      tabIndex={0}
      onClick={() => onClick(epa)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(epa)}
    >
      <div
        className='card h-100 border-0 rounded-4 bg-body-secondary shadow-sm'
        style={{
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 0.75rem 1.25rem rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)';
        }}
      >
        <div className='card-header bg-secondary bg-opacity-10 text-body rounded-top-4 px-3 py-2'>
          <div className='d-flex align-items-center gap-3'>
            <div className='bg-body text-primary rounded text-center px-2 py-1' style={{ minWidth: '48px' }}>
              <div style={{ fontSize: '0.65rem', lineHeight: '1rem' }}>EPA</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{epa.epa}</div>
            </div>
            <p className='fw-semibold mb-0 text-body' style={{ fontSize: '0.9rem', lineHeight: '1.2rem' }}>
              {epa.title || ''}
            </p>
          </div>
        </div>
        <div className='card-body text-center d-flex flex-column align-items-center justify-content-between p-4'>
          <HalfCircleGauge average={avg} allGreen={allGreen} />
        </div>
      </div>
    </div>
  );
};

export default EPACard;