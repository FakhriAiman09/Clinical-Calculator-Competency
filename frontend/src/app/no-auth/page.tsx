'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import logo from '@/components/ccc-logo-color.svg';

export default function VerifyAccount() {
  const router = useRouter();

  return (
    <div className='container d-flex flex-column justify-content-center gap-3 p-5 vh-80' style={{ maxWidth: '630px' }}>
      <div className='pb-3 text-center'>
        <Image className='mb-3' src={logo} height={32} alt='CCC logo' priority />
        <p>You are not authorized to access this page. Please contact your administrator.</p>

        <button className='btn btn-primary' onClick={() => router.push('/dashboard')}>
          <i className='bi bi-arrow-left me-2' />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
