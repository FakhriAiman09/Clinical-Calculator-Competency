import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import './globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import BootstrapClient from '@/components/bootstrap-client';
import { UserProvider } from '../context/UserContext';
import { ThemeProvider } from '../context/ThemeContext';
import Header from '@/components/Header/header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Clinical Competency Calculator',
  description: 'A system to help evaluate clinical competency in medical education.',
  icons: [
    {
      media: '(prefers-color-scheme: light)',
      url: '/favicon/icon-light.png',
      href: '/favicon/icon-light.png',
    },
    {
      media: '(prefers-color-scheme: dark)',
      url: '/favicon/icon-dark.png',
      href: '/favicon/icon-dark.png',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      {/*
        Anti-flicker script: runs before React hydrates.
        Reads localStorage and sets data-bs-theme immediately so the
        correct theme is applied on first paint — no flash.
      */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t && t !== 'auto') {
                  document.documentElement.setAttribute('data-bs-theme', t);
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <UserProvider>
          <ThemeProvider>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                zIndex: 1030,
                borderBottom: '1px solid var(--bs-border-color)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
              }}
              className='bg-body'
            >
              <Header />
            </div>
            <div className='main-content'>{children}</div>
          </ThemeProvider>
        </UserProvider>
      </body>
      <BootstrapClient />
    </html>
  );
}