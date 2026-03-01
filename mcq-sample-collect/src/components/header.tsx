import Image from 'next/image';
import Link from 'next/link';

import logo from './ccc-logo-white.svg';
import { Tooltip } from './tooltip';

export default function Header() {
  const formSVG = (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='32'
      height='32'
      fill='currentColor'
      className='bi bi-ui-checks'
      viewBox='0 0 16 16'
    >
      <path d='M7 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5zM2 1a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm0 8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2zm.854-3.646a.5.5 0 0 1-.708 0l-1-1a.5.5 0 1 1 .708-.708l.646.647 1.646-1.647a.5.5 0 1 1 .708.708zm0 8a.5.5 0 0 1-.708 0l-1-1a.5.5 0 0 1 .708-.708l.646.647 1.646-1.647a.5.5 0 0 1 .708.708zM7 10.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5zm0-5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0 8a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5' />
    </svg>
  );

  const textSVG = (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='32'
      height='32'
      fill='currentColor'
      className='bi bi-chat-quote'
      viewBox='0 0 16 16'
    >
      <path d='M2.678 11.894a1 1 0 0 1 .287.801 11 11 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8 8 0 0 0 8 14c3.996 0 7-2.807 7-6s-3.004-6-7-6-7 2.808-7 6c0 1.468.617 2.83 1.678 3.894m-.493 3.905a22 22 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a10 10 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105' />
      <path d='M7.066 6.76A1.665 1.665 0 0 0 4 7.668a1.667 1.667 0 0 0 2.561 1.406c-.131.389-.375.804-.777 1.22a.417.417 0 0 0 .6.58c1.486-1.54 1.293-3.214.682-4.112zm4 0A1.665 1.665 0 0 0 8 7.668a1.667 1.667 0 0 0 2.561 1.406c-.131.389-.375.804-.777 1.22a.417.417 0 0 0 .6.58c1.486-1.54 1.293-3.214.682-4.112z' />
    </svg>
  );

  const accountSVG = (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='32'
      height='32'
      fill='currentColor'
      className='bi bi-person-circle'
      viewBox='0 0 16 16'
    >
      <path d='M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0' />
      <path
        fillRule='evenodd'
        d='M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1'
      />
    </svg>
  );

  return (
    <>
      <div className='bg-secondary text-white p-3'>
        <div className='container-flex mx-3 d-flex gap-2 justify-content-between align-items-center'>
          <Link
            className='d-flex align-items-center text-reset text-decoration-none'
            href='/'
            style={{ minWidth: '0' }}
          >
            <Image className='me-2' src={logo} height={32} alt='CCC Logo' />
            <span className='d-inline-block text-truncate lh-sm'>
              Clinical Competency <br /> Calculator
            </span>
          </Link>
          <div className='d-flex gap-3'>
            <Tooltip text='MCQ samples' placement='bottom'>
              <Link className='text-reset' href='/form'>
                {formSVG}
              </Link>
            </Tooltip>
            <Tooltip text='Text samples' placement='bottom'>
              <Link className='text-reset' href='/text-upload'>
                {textSVG}
              </Link>
            </Tooltip>
            <Tooltip text='Account details' placement='bottom'>
              <Link className='text-reset' href='/account'>
                {accountSVG}
              </Link>
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  );
}
