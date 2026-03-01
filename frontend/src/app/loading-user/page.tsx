'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import Image from 'next/image';
import logo from '@/components/ccc-logo-color.svg';

export default function LoadingUserPage() {
  const { loading, user } = useUser();
  const router = useRouter();

  // This effect hides the header by directly manipulating its style.
  // When this page unmounts, it restores the header display.
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) {
      header.style.display = 'none';
    }
    return () => {
      if (header) {
        header.style.display = '';
      }
    };
  }, []);

  // Redirect logic when loading is finished
  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    }
  }, [loading, user, router]);

  return (
    <div
      className='d-flex flex-column justify-content-center align-items-center text-center px-3'
      style={{
        height: '80vh',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #dee2e6 100%)',
        overflow: 'hidden',
      }}
    >
      <Image src={logo} alt='CCC Logo' width={96} height={96} className='mb-4' priority />
      <h2 className='fw-semibold mb-3' style={{ fontSize: '1.75rem' }}>
        Clinical Competency Calculator
      </h2>
      <div className='spinner-border text-primary mb-3' style={{ width: '3rem', height: '3rem' }} role='status'>
        <span className='visually-hidden'>Loading...</span>
      </div>
      <p className='text-muted fs-6'>Loading your session, please wait...</p>
    </div>
  );
}
