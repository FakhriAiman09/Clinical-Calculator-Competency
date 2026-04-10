import React from 'react';
import Link from 'next/link';

export const metadata = { title: 'CCC Admin Demo' };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-vh-100 d-flex flex-column'>
      <div
        className='text-center py-2 fw-semibold'
        style={{ background: '#ffc107', color: '#000', fontSize: '0.9rem', letterSpacing: '0.02em' }}
      >
        DEMO MODE - Standalone admin dashboard using sample data only.
      </div>

      <nav className='navbar navbar-expand navbar-dark bg-dark px-4'>
        <span className='navbar-brand fw-bold'>CCC Admin Demo</span>
        <div className='navbar-nav gap-2'>
          <Link className='nav-link' href='/demo'>Dashboard</Link>
        </div>
      </nav>

      <main className='flex-grow-1 p-4'>{children}</main>
    </div>
  );
}
