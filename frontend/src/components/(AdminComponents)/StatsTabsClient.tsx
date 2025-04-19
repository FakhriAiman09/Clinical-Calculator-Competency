'use client';

import { useEffect, useState } from 'react';
import { getSystemStats, SystemStats } from '@/utils/getSystemStats';

const tabs = ['Overview', 'Delinquent Raters', 'Monthly Trends', 'EPA Distribution'] as const;
type TabType = (typeof tabs)[number];

export default function StatsTabsClient() {
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getSystemStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) return <div className='text-muted'>Loading statistics...</div>;
  if (!stats) return <div className='text-danger'>Failed to load statistics.</div>;

  return (
    <div className='p-3 rounded' style={{ backgroundColor: '#f1f3f5' }}>
      <div className='card shadow-sm p-3 border-0 bg-white'>
        <div className='card-header d-flex justify-content-between align-items-center bg-white border-bottom'>
          <h5 className='m-0 text-dark'>System Statistics</h5>
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
                    <button className='dropdown-item' onClick={() => setActiveTab(tab)}>
                      {tab}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button
              className='btn btn-sm btn-outline-primary'
              onClick={() => {
                setRefreshing(true);
                loadStats();
              }}
              disabled={refreshing}
            >
              {refreshing ? (
                <span className='spinner-border spinner-border-sm me-2' role='status' />
              ) : (
                <i className='bi bi-arrow-clockwise me-1'></i>
              )}
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className='card-body'>
          {activeTab === 'Overview' && (
            <div className='d-flex flex-wrap gap-3'>
              <StatCard label='Submitted Forms' value={stats.totalSubmittedForms} />
              <StatCard label='Active Requests' value={stats.activeFormRequests} />
              <StatCard label='Delinquent Requests' value={stats.delinquentFormRequests} />
              <StatCard
                label='Avg. Turnaround (days)'
                value={stats.averageTurnaroundDays != null ? stats.averageTurnaroundDays.toFixed(1) : 'N/A'}
              />
            </div>
          )}

          {activeTab === 'Delinquent Raters' && (
            <div>
              {stats.topDelinquentRaters.length > 0 ? (
                <ul className='list-group'>
                  {stats.topDelinquentRaters.map((r) => (
                    <li
                      key={r.rater_id}
                      className='list-group-item d-flex justify-content-between align-items-start flex-column flex-sm-row'
                    >
                      <div>
                        <div className='fw-semibold'>{r.display_name}</div>
                        <div className='text-muted small'>{r.email}</div>
                      </div>
                      <span className='badge bg-danger align-self-sm-center mt-2 mt-sm-0'>{r.count} overdue</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='text-muted mb-0'>No delinquent raters at this time.</p>
              )}
              <p className='text-muted small mt-2'>
                Raters listed here have active requests open for more than 14 days.
              </p>
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
                  {/* Axes */}
                  <line x1='40' y1='10' x2='40' y2='180' stroke='#ccc' />
                  <line x1='40' y1='180' x2={40 + stats.monthlySubmissionTrends.length * 60} y2='180' stroke='#ccc' />

                  {/* Y-Axis Labels */}
                  {[0, 20, 40, 60, 80, 100].map((y) => (
                    <text key={`y-${y}`} x='5' y={180 - y * 1.5} fontSize='10' fill='#999'>
                      {y}
                    </text>
                  ))}

                  {/* Grid, Labels, Points */}
                  {stats.monthlySubmissionTrends.map((m, i) => {
                    const x = 40 + i * 60;
                    const y = 180 - m.count * 1.5;
                    const monthLabel = new Date(`${m.month}-01`).toLocaleString('default', { month: 'short' });

                    return (
                      <g key={`month-${m.month}`}>
                        <line x1={x} y1={20} x2={x} y2={180} stroke='#f1f3f5' />
                        <text x={x} y={195} fontSize='10' textAnchor='middle' fill='#666'>
                          {monthLabel}
                        </text>
                        <circle cx={x} cy={y} r='4' fill='#0d6efd' />
                        <text x={x} y={y - 8} fontSize='10' textAnchor='middle' fill='#000'>
                          {m.count}
                        </text>
                      </g>
                    );
                  })}

                  {/* Line */}
                  <polyline
                    fill='none'
                    stroke='#0d6efd'
                    strokeWidth='2'
                    points={stats.monthlySubmissionTrends
                      .map((m, i) => `${40 + i * 60},${180 - m.count * 1.5}`)
                      .join(' ')}
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
                  className='border rounded shadow-sm bg-light p-3 flex-grow-1'
                  style={{ minWidth: '250px', maxWidth: '320px' }}
                >
                  <h6 className='mb-3 text-center'>EPA {epa}</h6>
                  <svg
                    width='100%'
                    height='120'
                    viewBox={`0 0 ${data.length * 60 + 40} 120`}
                    preserveAspectRatio='xMinYMin meet'
                  >
                    {/* Axes */}
                    <line x1='40' y1='10' x2='40' y2='90' stroke='#ccc' />
                    <line x1='40' y1='90' x2={40 + data.length * 60} y2='90' stroke='#ccc' />

                    {/* Grid + Labels */}
                    {data.map((d, i) => {
                      const x = 40 + i * 60;
                      const y = 90 - d.count * 3;
                      const monthLabel = new Date(`${d.month}-01`).toLocaleString('default', { month: 'short' });

                      return (
                        <g key={`tick-${epa}-${d.month}`}>
                          {/* Vertical grid line */}
                          <line x1={x} y1={10} x2={x} y2={90} stroke='#eee' />

                          {/* Month label below x-axis */}
                          <text x={x} y={110} fontSize='10' textAnchor='middle' fill='#666'>
                            {monthLabel}
                          </text>

                          {/* Count label above point */}
                          <text x={x} y={y - 6} fontSize='10' textAnchor='middle' fill='#000'>
                            {d.count}
                          </text>
                        </g>
                      );
                    })}

                    {/* Line path */}
                    <polyline
                      fill='none'
                      stroke='#198754'
                      strokeWidth='2'
                      points={data.map((d, i) => `${40 + i * 60},${90 - d.count * 3}`).join(' ')}
                    />

                    {/* Dots */}
                    {data.map((d, i) => (
                      <circle
                        key={`point-${epa}-${d.month}`}
                        cx={40 + i * 60}
                        cy={90 - d.count * 3}
                        r='3'
                        fill='#198754'
                      />
                    ))}
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='border rounded p-3 text-center flex-grow-1' style={{ minWidth: '150px' }}>
      <div className='fw-bold fs-5 text-dark'>{value}</div>
      <div className='text-muted small'>{label}</div>
    </div>
  );
}
