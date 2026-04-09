'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

import { useUser } from '@/context/UserContext';
import logo from '@/components/ccc-logo-color.svg';

import NavLinks from './NavLinks';
import ProfileDropdown from './ProfileDropdown';
import DeveloperTicketModal from '@/components/DevTicketsModal';

/**
 * Header
 *
 * ▸ Shows logo, nav links (role-aware inside <NavLinks />), and profile dropdown.
 * ▸ Collapses into a hamburger menu at the `lg` breakpoint.
 * ▸ Manages the DeveloperTicketModal (submit bug / feature requests)
 */
export default function Header() {
  const { user } = useUser();

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close mobile nav when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setNavOpen(false);
      }
    };
    if (navOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [navOpen]);

  return (
    <header className='bg-body border-bottom'>
      <style>{`
        /* ── Logo link ─────────────────────────────────────────── */
        .header-logo-link {
          color: inherit !important;
          text-decoration: none !important;
        }
        .header-logo-link:hover,
        .header-logo-link:focus {
          color: inherit !important;
          opacity: 0.85;
        }

        /* Invert SVG logo in dark mode */
        [data-bs-theme="dark"] .logo-img {
          filter: invert(1) hue-rotate(180deg);
        }

        /* ── Hamburger button ──────────────────────────────────── */
        .header-toggler {
          border: 1px solid var(--bs-border-color);
          background: transparent;
          border-radius: 6px;
          padding: 5px 9px;
          cursor: pointer;
          color: var(--bs-body-color);
          transition: background 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .header-toggler:hover {
          background: var(--bs-secondary-bg);
        }

        /* ── Collapse panel (mobile) ───────────────────────────── */
        .header-nav-collapse {
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          pointer-events: none;
          transition: max-height 0.3s ease, opacity 0.2s ease;
        }
        .header-nav-collapse.open {
          max-height: 800px;
          opacity: 1;
          pointer-events: auto;
        }

        /* Mobile: vertical stack */
        .header-nav-inner {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 0 12px;
        }
        .header-nav-inner a.btn,
        .header-nav-inner button.btn {
          width: 100%;
          text-align: left;
        }

        /* ── lg+: horizontal row, collapse always shown ────────── */
        @media (min-width: 992px) {
          .header-toggler {
            display: none !important;
          }
          .header-nav-collapse {
            max-height: none !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            overflow: visible !important;
          }
          .header-nav-inner {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
            padding: 0;
            align-items: center;
          }
          .header-nav-inner a.btn,
          .header-nav-inner button.btn {
            width: auto;
            text-align: center;
          }
        }
      `}</style>

      <div ref={navRef} className='container-fluid px-3'>
        {/* ── Single row: Logo | Nav (lg+) | Hamburger + Profile ── */}
        <div className='d-flex align-items-center py-2 gap-2'>

          {/* Logo */}
          <Link href='/dashboard' className='header-logo-link d-flex align-items-center flex-shrink-0'>
            <Image src={logo} alt='Logo' width={38} height={38} priority className='logo-img' />
            <span className='ms-2 fw-bold text-body d-none d-lg-inline' style={{ fontSize: '1.05rem' }}>
              Clinical Competency Calculator
            </span>
            <span className='ms-2 fw-bold text-body d-none d-sm-inline d-lg-none' style={{ fontSize: '0.95rem' }}>
              CCC
            </span>
          </Link>

          {/* Nav inline on lg+ */}
          {user && (
            <nav className='d-none d-lg-flex align-items-center flex-wrap gap-2 ms-3 flex-grow-1' onClick={() => setNavOpen(false)}>
              <NavLinks />
            </nav>
          )}

          {/* Spacer on mobile when no user */}
          {!user && <div className='flex-grow-1' />}

          {user && (
            <div className='d-flex align-items-center gap-2 flex-shrink-0 ms-auto'>
              {/* Hamburger — visible only below lg */}
              <button
                className='header-toggler d-lg-none'
                aria-label='Toggle navigation'
                aria-expanded={navOpen}
                onClick={() => setNavOpen((prev) => !prev)}
              >
                {navOpen ? (
                  <svg width='16' height='16' viewBox='0 0 16 16' fill='none'
                    stroke='currentColor' strokeWidth='2.2' strokeLinecap='round'>
                    <line x1='2' y1='2' x2='14' y2='14' />
                    <line x1='14' y1='2' x2='2' y2='14' />
                  </svg>
                ) : (
                  <svg width='18' height='14' viewBox='0 0 18 14' fill='currentColor'>
                    <rect width='18' height='2' rx='1' />
                    <rect y='6' width='18' height='2' rx='1' />
                    <rect y='12' width='18' height='2' rx='1' />
                  </svg>
                )}
              </button>

              <ProfileDropdown
                onOpenTicket={() => setShowTicketModal(true)}
              />
            </div>
          )}
        </div>

        {/* ── Mobile nav: drops below the top row on small screens ── */}
        {user && (
          <div className={`header-nav-collapse d-lg-none${navOpen ? ' open' : ''}`}>
            <nav className='header-nav-inner' onClick={() => setNavOpen(false)}>
              <NavLinks />
            </nav>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      <DeveloperTicketModal show={showTicketModal} onClose={() => setShowTicketModal(false)} />
    </header>
  );
}
