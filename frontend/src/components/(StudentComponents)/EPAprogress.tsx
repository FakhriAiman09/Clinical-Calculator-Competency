import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

type DevLevel = 'none' | 'remedial' | 'early-developing' | 'developing' | 'entrustable';

type KeyFunction = {
  dev_level: DevLevel;
};

type EPA = {
  epa: string;
  keyFunctions: KeyFunction[];
};

// Varied dummy data with different numbers of key functions and development levels
const dummyData: EPA[] = [
  {
    epa: 'EPA 1',
    keyFunctions: [
      { dev_level: 'none' },
      { dev_level: 'remedial' },
      { dev_level: 'early-developing' },
      { dev_level: 'developing' },
      { dev_level: 'entrustable' },
      { dev_level: 'developing' },
      { dev_level: 'none' },
    ],
  },
  {
    epa: 'EPA 2',
    keyFunctions: [
      { dev_level: 'none' },
      { dev_level: 'none' },
      { dev_level: 'remedial' },
      { dev_level: 'remedial' },
      { dev_level: 'early-developing' },
    ],
  },
  {
    epa: 'EPA 3',
    keyFunctions: [
      { dev_level: 'early-developing' },
      { dev_level: 'early-developing' },
      { dev_level: 'developing' },
      { dev_level: 'developing' },
      { dev_level: 'developing' },
      { dev_level: 'entrustable' },
      { dev_level: 'entrustable' },
      { dev_level: 'entrustable' },
    ],
  },
  {
    epa: 'EPA 4',
    keyFunctions: [
      { dev_level: 'none' },
      { dev_level: 'remedial' },
      { dev_level: 'developing' },
      { dev_level: 'developing' },
      { dev_level: 'developing' },
      { dev_level: 'developing' },
      { dev_level: 'entrustable' },
    ],
  },
  {
    epa: 'EPA 5',
    keyFunctions: [
      { dev_level: 'early-developing' },
      { dev_level: 'early-developing' },
      { dev_level: 'early-developing' },
      { dev_level: 'remedial' },
      { dev_level: 'remedial' },
      { dev_level: 'developing' },
      { dev_level: 'developing' },
      { dev_level: 'none' },
      { dev_level: 'entrustable' },
    ],
  },
];

const devLevelColors: { [key in DevLevel]: string } = {
  none: '#808080', // Grey
  remedial: '#ea3636', // Orange Red
  'early-developing': '#ffb800', // Orange
  developing: '	#fff000', // Yellow
  entrustable: '	#3ead16', // Green
};

const EPAprogress: React.FC = () => {
  return (
    <div className='container mt-4'>
      <div className='card bg-body-secondary text-body'>
        {' '}
        <div className='card-body'>
          <h2 className='card-title text-center mb-4'>EPA Competency Progress (By Key Function)</h2>
          <div className='d-flex justify-content-around mb-4'>
            {Object.entries(devLevelColors).map(([level, color]) => (
              <div key={level} className='d-flex align-items-center'>
                <div
                  className='rounded-circle'
                  style={{ width: '20px', height: '20px', backgroundColor: color, marginRight: '5px' }}
                ></div>
                <span>{level}</span>
              </div>
            ))}
          </div>

          {dummyData.map((epa) => {
            const devLevelCounts = epa.keyFunctions.reduce((acc, kf) => {
              acc[kf.dev_level] = (acc[kf.dev_level] || 0) + 1;
              return acc;
            }, {} as { [key in DevLevel]: number });

            return (
              <div key={epa.epa} className='mb-3 d-flex align-items-center'>
                <div className='text-left' style={{ width: '100px', flexShrink: 0 }}>
                  <h5 className='mb-0'>{epa.epa}</h5>
                </div>
                <div className='flex-grow-1'>
                  <div className='progress' style={{ height: '30px', width: '100%' }}>
                    {Object.keys(devLevelColors).map((level) => (
                      <div
                        key={level}
                        className='progress-bar'
                        role='progressbar'
                        style={{
                          width: `${((devLevelCounts[level as DevLevel] || 0) / epa.keyFunctions.length) * 100}%`,
                          backgroundColor: devLevelColors[level as DevLevel],
                          color: 'inherit',
                          fontWeight: 'bold',
                        }}
                      >
                        {devLevelCounts[level as DevLevel] > 0 ? devLevelCounts[level as DevLevel] : ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EPAprogress;