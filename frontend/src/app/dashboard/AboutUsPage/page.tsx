'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Developer {
  id: string;
  dev_name: string;
  created_at?: string;
  role: string;
  contribution?: string;
}

export default function AboutPage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDev, setSelectedDev] = useState<Developer | null>(null);

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const fetchDevelopers = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('about_us_page')
        .select('*')
        .order('dev_name', { ascending: true });
      if (fetchError) throw fetchError;
      setDevelopers(data || []);
    } catch (err) {
      console.error('Error fetching developers:', err);
      setError('Failed to load developers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  const getAvatarColor = (name: string): string => {
    const colors = [
      '#6C757D',
      '#619efa',
      '#4aa47a',
      '#0DCAF0',
      '#6b45a8',
      '#dfc67b',
      '#DC3545',
      '#FD7E14',
    ];
    const index = (name.codePointAt(0) || 0) % colors.length;
    return colors[index];
  };

  const closeDevDetails = () => setSelectedDev(null);

  return (
    <div className='container py-5'>
      {/* Header Section */}
      <header className='text-center py-5'>
        <h1 className='display-4 fw-bold mb-3'>About the Developers</h1>
        <p className='lead text-muted'>
          This Clinical Competency Calculator was built by a dedicated student development team
          <br />
          for academic and technical purposes in medical education.
        </p>
      </header>

      {/* Developers Grid */}
      <section className='py-4'>
        <div className='row justify-content-center'>
          {loading && (
            <div className='col-12 text-center py-5'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Loading developers...</span>
              </div>
              <p className='text-muted mt-3'>Loading developers...</p>
            </div>
          )}
          {error && (
            <div className='col-12 text-center py-5'>
              <div className='alert alert-danger' role='alert'>
                <i className='bi bi-exclamation-triangle me-2'></i>
                {error}
              </div>
            </div>
          )}
          {!loading && !error && developers.length === 0 && (
            <div className='col-12 text-center py-5'>
              <i className='bi bi-people display-1 text-muted'></i>
              <p className='text-muted mt-3'>No developers available at this time.</p>
            </div>
          )}
          {!loading &&
            !error &&
            developers.length > 0 &&
            developers.map((dev) => (
              <div key={dev.id} className='col-6 col-md-4 col-lg-3 mb-4'>
                <div
                  className='card developer-card h-100 border'
                  role='button'
                  tabIndex={0}
                  onClick={() => setSelectedDev(dev)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedDev(dev);
                  }}
                >
                  <div className='card-body text-center p-4 d-flex flex-column align-items-center justify-content-center'>
                    {/* Avatar */}
                    <div
                      className='avatar-circle mx-auto mb-3'
                      style={{
                        width: '72px',
                        height: '72px',
                        minWidth: '72px',
                        borderRadius: '50%',
                        backgroundColor: getAvatarColor(dev.dev_name),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        fontWeight: 'bold',
                        color: 'white',
                      }}
                    >
                      {getInitials(dev.dev_name)}
                    </div>
                    <h6 className='card-title mb-1 fw-semibold'>{dev.dev_name}</h6>
                    <p className='card-text text-muted small mb-0'>Developer</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Acknowledgement Section */}
      <footer className='text-center py-5 mt-5 border-top'>
        <div className='row justify-content-center'>
          <div className='col-lg-8'>
            <h6 className='text-muted mb-3'>Acknowledgements</h6>
            <p className='text-muted small'>
              We would like to thank our advisors, faculty members, and the medical education
              community for their guidance and support throughout the development of this project
              and help us in this final semester ).
            </p>
            <p className='text-muted small mb-0'>
              <strong>Disclaimer:</strong> This application was developed for educational and
              academic purposes. It is designed to support clinical competency assessment in medical
              education settings. All data should be handled in accordance with institutional
              policies and applicable privacy regulations.
            </p>
            <p className='text-muted small mt-3'>
              <span>Built with Next.js, React, TypeScript, and Supabase</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Developer Detail Modal */}
      {selectedDev && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={closeDevDetails}
        >
          <div
            className='card shadow bg-body'
            style={{ width: 420, maxWidth: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className='card-body'>
              <div className='d-flex justify-content-between align-items-start mb-3'>
                <h5 className='mb-0'>{selectedDev.dev_name}</h5>
                <button className='btn-close' onClick={closeDevDetails}></button>
              </div>
              <div className='mb-3'>
                <div className='text-muted small'>Role</div>
                <div className='fw-semibold'>{selectedDev.role}</div>
              </div>
              <div>
                <div className='text-muted small'>Contribution</div>
                <div>{selectedDev.contribution || '---'}</div>
              </div>
              <div className='text-end mt-4'>
                <button className='btn btn-secondary btn-sm' onClick={closeDevDetails}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        .developer-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border-radius: 0.75rem;
          cursor: pointer;
          /* Use Bootstrap's CSS variable so border adapts to dark/light */
          border-color: var(--bs-border-color) !important;
        }

        .developer-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 0.5rem 1.25rem rgba(0, 0, 0, 0.15) !important;
          border-color: var(--bs-primary) !important;
        }

        .avatar-circle {
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .developer-card:hover .avatar-circle {
          transform: scale(1.08);
        }
      `}</style>
    </div>
  );
}