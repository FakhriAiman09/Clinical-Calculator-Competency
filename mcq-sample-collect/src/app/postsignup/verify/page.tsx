import Image from 'next/image';

import logo from '@/components/ccc-logo-color.svg';

export default function VerifyAccount() {
  return (
    <div className='container d-flex flex-column justify-content-center gap-3 p-5 vh-100' style={{ maxWidth: '630px' }}>
      <div className='pb-3'>
        <span>
          <Image className='mb-3' src={logo} height={32} alt='CCC logo' />
        </span>
        <p className='fs-3'>
          <strong>You&apos;ve signed up!</strong>
        </p>
        <p>
          Please check your email for a link to verify your account. If you don&apos;t see it, please check your spam
          folder.
        </p>
        <p>Once you&apos;ve verified your account, you can log in.</p>
        <a className='btn btn-primary' href='/login'>
          <i className='bi bi-arrow-left me-2' />
          Back to login
        </a>
      </div>
    </div>
  );
}
