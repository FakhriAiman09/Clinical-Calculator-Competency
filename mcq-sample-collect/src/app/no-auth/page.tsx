'use client';

import Image from 'next/image';
import router from 'next/router';

import logo from '@/components/ccc-logo-color.svg';

export default function VerifyAccount() {
  return (
    <div className='container d-flex flex-column justify-content-center gap-3 p-5 vh-100' style={{ maxWidth: '630px' }}>
      <div className='pb-3'>
        <span>
          <Image className='mb-3' src={logo} height={32} alt='CCC logo' />
        </span>
        <p>You are not authorized to access this page. Please contact your administrator.</p>
        <button className='btn btn-primary' onClick={() => router.back()}>
          <i className='bi bi-arrow-left me-2' />
          Back
        </button>
      </div>
    </div>
  );
}
