'use client';

import { useState } from 'react';
import { DEMO_SYSTEM_STATS } from './_data/sampleData';

const tabs = ['Overview', 'Delinquent Raters', 'Monthly Trends', 'EPA Distribution'] as const;
type TabType = (typeof tabs)[number];

export default function DemoDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [refreshing, setRefreshing] = useState(false);
  const [reminderSending, setReminderSending] = useState<Record<string, boolean>>({});
  const [reminderStatus, setReminderStatus] = useState<Record<string, 'sent' | 'error'>>({});

  const stats = DEMO_SYSTEM_STATS;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSendReminder = (raterId: string) => {
    setReminderSending((p) => ({ ...p, [raterId]: true }));
    setReminderStatus((p) => {
      const next = { ...p };
      delete next[raterId];
      return next;
    });
    setTimeout(() => {
      setReminderSending((p) => ({ ...p, [raterId]: false }));
      setReminderStatus((p) => ({ ...p, [raterId]: 'sent' }));
    }, 1500);
  };

  return (
    <div className='w-100 d-flex flex-column gap-4'>
      <div className='p-3 rounded bg-body-secondary'>
        <div className='card shadow-sm p-3 border-0 bg-body'>
          <div className='card-header d-flex justify-content-between align-items-center bg-body border-bottom'>
            <h5 className='m-0 text-body'>System Statistics</h5>
            <div className='d-flex align-items-center gap-2'>
              <div className='dropdown'>
                <button
                  className='btn btn-outline-secondary btn-sm dropdown-toggle'
                  type='button'
                  data-bs-toggle='dropdown'
                >
                  <i className='bi bi-graph-up'></i> {activeTab}
                </button>
                <ul className='dropdown-menu'>
                  {tabs.map((tab) => (
                    <li key={tab}>
                      <button className='dropdown-item' onClick={() => setActiveTab(tab)}>{tab}</button>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                className='btn btn-sm btn-outline-primary'
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing
                  ? <><span className='spinner-border spinner-border-sm me-2' role='status' />Refreshing...</>
                  : <><i className='bi bi-arrow-clockwise me-1'></i>Refresh</>}
              </button>
            </div>
          </div>

          <div className='card-body'>
            {activeTab === 'Overview' && (
              <div className='d-flex flex-wrap gap-3'>
                <StatCard label='Submitted Forms' value={stats.totalSubmittedForms} />
                <StatCard label='Active Requests' value={stats.activeFormRequests} />
                <StatCard label='Delinquent Requests' value={stats.delinquentFormRequests} />
                <StatCard label='Avg. Turnaround (days)' value={stats.averageTurnaroundDays.toFixed(1)} />
              </div>
            )}

            {activeTab === 'Delinquent Raters' && (
              <div>
                <ul className='list-group'>
                  {stats.topDelinquentRaters.map((r) => (
                    <li
                      key={r.rater_id}
                      className='list-group-item d-flex justify-content-between align-items-start flex-column flex-sm-row'
                    >
                      <div>
                        <div className='fw-semibold'>{r.display_name}</div>
                        <div className='text-muted small'>{r.email}</div>
                        <div className='d-flex align-items-center gap-2 mt-2'>
                          <button
                            className='btn btn-sm btn-outline-warning'
                            disabled={!!reminderSending[r.rater_id]}
                            onClick={() => handleSendReminder(r.rater_id)}
                          >
                            {reminderSending[r.rater_id]
                              ? <><span className='spinner-border spinner-border-sm me-1' role='status' />Sending...</>
                              : <><i className='bi bi-envelope me-1' />Send Reminder</>}
                          </button>
                          {reminderStatus[r.rater_id] === 'sent' && (
                            <span className='text-success small'><i className='bi bi-check-circle me-1' />Sent (simulated)</span>
                          )}
                        </div>
                      </div>
                      <span className='badge bg-danger align-self-sm-start mt-1'>{r.count} overdue</span>
                    </li>
                  ))}
                </ul>
                <p className='text-muted small mt-2'>Raters listed here have active requests open for more than 14 days.</p>
              </div>
            )}

            {activeTab === 'Monthly Trends' && (
              <div className='w-100 p-3'>
                <h6 className='text-muted mb-3 text-center'>Monthly Submission Trends</h6>
                <div className='d-flex justify-content-center overflow-auto px-2'>
                  <svg
                    width={stats.monthlySubmissionTrends.length * 60 + 60}
                    height={220}
                    viewBox={`0 0 ${stats.monthlySubmissionTrends.length * 60 + 60} 220`}
                    preserveAspectRatio='xMinYMin meet'
                  >
                    <line x1='40' y1='10' x2='40' y2='180' stroke='#ccc' />
                    <line x1='40' y1='180' x2={40 + stats.monthlySubmissionTrends.length * 60} y2='180' stroke='#ccc' />
                    {[0, 10, 20, 30, 40].map((y) => (
                      <text key={`y-${y}`} x='5' y={180 - y * 3} fontSize='10' fill='#999'>{y}</text>
                    ))}
                    {stats.monthlySubmissionTrends.map((m, i) => {
                      const x = 40 + i * 60;
                      const y = 180 - m.count * 3;
                      const label = new Date(`${m.month}-01`).toLocaleString('default', { month: 'short' });
                      return (
                        <g key={m.month}>
                          <line x1={x} y1={20} x2={x} y2={180} stroke='#f1f3f5' />
                          <text x={x} y={195} fontSize='10' textAnchor='middle' fill='#666'>{label}</text>
                          <circle cx={x} cy={y} r='4' fill='#0d6efd' />
                          <text x={x} y={y - 8} fontSize='10' textAnchor='middle' fill='#333'>{m.count}</text>
                        </g>
                      );
                    })}
                    <polyline
                      fill='none' stroke='#0d6efd' strokeWidth='2'
                      points={stats.monthlySubmissionTrends.map((m, i) => `${40 + i * 60},${180 - m.count * 3}`).join(' ')}
                    />
                  </svg>
                </div>
              </div>
            )}

            {activeTab === 'EPA Distribution' && (
              <div className='d-flex flex-wrap gap-3'>
                {Object.entries(stats.monthlyEPADistribution).map(([epa, data]) => (
                  <div
                    key={epa}
                    className='border rounded shadow-sm bg-body-secondary p-3 flex-grow-1'
                    style={{ minWidth: '230px', maxWidth: '300px' }}
                  >
                    <h6 className='mb-3 text-center'>EPA {epa}</h6>
                    <svg
                      width='100%' height='120'
                      viewBox={`0 0 ${data.length * 55 + 40} 120`}
                      preserveAspectRatio='xMinYMin meet'
                    >
                      <line x1='40' y1='10' x2='40' y2='90' stroke='#ccc' />
                      <line x1='40' y1='90' x2={40 + data.length * 55} y2='90' stroke='#ccc' />
                      {data.map((d, i) => {
                        const x = 40 + i * 55;
                        const y = 90 - d.count * 7;
                        const label = new Date(`${d.month}-01`).toLocaleString('default', { month: 'short' });
                        return (
                          <g key={`${epa}-${d.month}`}>
                            <line x1={x} y1={10} x2={x} y2={90} stroke='#eee' />
                            <text x={x} y={110} fontSize='10' textAnchor='middle' fill='#666'>{label}</text>
                            <text x={x} y={Math.max(y - 4, 14)} fontSize='10' textAnchor='middle' fill='#333'>{d.count}</text>
                          </g>
                        );
                      })}
                      <polyline
                        fill='none' stroke='#198754' strokeWidth='2'
                        points={data.map((d, i) => `${40 + i * 55},${90 - d.count * 7}`).join(' ')}
                      />
                      {data.map((d, i) => (
                        <circle key={`dot-${epa}-${d.month}`} cx={40 + i * 55} cy={90 - d.count * 7} r='3' fill='#198754' />
                      ))}
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='card shadow-sm p-4 border-0'>
        <h5 className='mb-3'>Announcements</h5>
        <div className='alert alert-info mb-2'>
          <strong>Clerkship Block 3 begins May 5, 2026.</strong> All form requests must be submitted by April 30.
        </div>
        <div className='alert alert-warning mb-0'>
          <strong>Reminder:</strong> Raters with overdue forms have been sent automated reminders. Please follow up as needed.
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='border rounded p-3 text-center flex-grow-1' style={{ minWidth: '150px' }}>
      <div className='fw-bold fs-5 text-body'>{value}</div>
      <div className='text-muted small'>{label}</div>
    </div>
  );
}
