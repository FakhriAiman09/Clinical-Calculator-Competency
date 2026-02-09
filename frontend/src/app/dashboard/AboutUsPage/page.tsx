'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Developer {
  id: string;
  dev_name: string;
  created_at?: string;
}

export default function AboutPage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const fetchDevelopers = async () => {
    setLoading(true);
    setError(null);


    try {
      const supabase = createClient();

      // Fetch developers info from Supabase about us table
      const { data, error: fetchError } = await supabase
      .from('about_us_page')
      .select('*')
      .order('dev_name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setDevelopers(data || []);
    } catch (err) {
      console.error('Error fetching developers:', err);
      setError('Failed to load developers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // generate initials from name for profile avatar
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };


  //Generate a consistent color based on name (for avatar background)
  
  const getAvatarColor = (name: string): string => {
    const colors = [
      '#6C757D', // Gray
      '#619efa', // Blue
      '#4aa47a', // Green
      '#0DCAF0', // Cyan
      '#6b45a8', // Purple
      '#dfc67b', // Yellow
      '#DC3545', // Red
      '#FD7E14', // Orange
    ];

    const index = (name.codePointAt(0) || 0) % colors.length;
    return colors[index];
  };

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

      {/* Developers List Section */}
      <section className='py-4'>
        <div className='row justify-content-center'>
          {loading && (
            // Loading State
            <div className='col-12 text-center py-5'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Loading developers...</span>
              </div>
              <p className='text-muted mt-3'>Loading developers...</p>
            </div>
          )}
          {error && (
            // Error State
            <div className='col-12 text-center py-5'>
              <div className='alert alert-danger' role='alert'>
                <i className='bi bi-exclamation-triangle me-2'></i>
                {error}
              </div>
            </div>
          )}
          {!loading && !error && developers.length === 0 && (
            // Empty State
            <div className='col-12 text-center py-5'>
              <i className='bi bi-people display-1 text-muted'></i>
              <p className='text-muted mt-3'>No developers available at this time.</p>
            </div>
          )}
          {!loading &&
            !error &&
            developers.length > 0 &&
            // Developers Grid
            developers.map((dev) => (
              <div key={dev.id} className='col-12 col-md-6 col-lg-4 mb-4'>
                <div className='card h-100 shadow-sm border-0 developer-card'>
                  <div className='card-body text-center p-4'>
                    {/* Avatar */}
                    <div
                      className='avatar-circle mx-auto mb-3'
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: getAvatarColor(dev.dev_name),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: 'white',
                      }}
                    >
                      {getInitials(dev.dev_name)}
                    </div>

                    {/* Developer Name */}
                    <h5 className='card-title mb-2'>{dev.dev_name}</h5>

                    {/* Subtitle */}
                    <p className='card-text text-muted small'>Developer</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Acknowledgement / Disclaimer Section */}
      <footer className='text-center py-5 mt-5 border-top'>
        <div className='row justify-content-center'>
          <div className='col-lg-8'>
            <h6 className='text-muted mb-3'>Acknowledgements</h6>
            <p className='text-muted small'>
              We would like to thank our advisors, faculty members, and the medical education community for their
              guidance and support throughout the development of this project and help us throughtou this semester.
            </p>
            <p className='text-muted small mb-0'>
              <strong>Disclaimer:</strong> This application was developed for educational and academic purposes. It is
              designed to support clinical competency assessment in medical education settings. All data should be
              handled in accordance with institutional policies and applicable privacy regulations.
            </p>
            <p className='text-muted small mt-3'>
              <span>Built with Next.js, React, TypeScript, and Supabase</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style>{`
        .developer-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          background-color: white;
          border-radius: 0.5rem;
        }

        .developer-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }

        .avatar-circle {
          transition: transform 0.2s ease;
        }

        .developer-card:hover .avatar-circle {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
