'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { useUser } from '@/context/UserContext';
import logo from '@/components/ccc-logo-color.svg';

import NavLinks from './NavLinks';
import ProfileDropdown from './ProfileDropdown';
import ProfileSettingsModal from './ProfileSettingsModal';
import DeveloperTicketModal from '@/components/DevTicketsModal';

/**
 * Header
 *
 * ▸ Shows logo, nav links (role‑aware inside <NavLinks />), and profile dropdown.
 * ▸ Manages *two* modal windows with separate React state:
 *     – ProfileSettingsModal  (edit display name, etc.)
 *     – DeveloperTicketModal  (submit bug / feature requests)
 */
export default function Header() {
  const { user } = useUser();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  return (
    <header className='bg-body border-bottom p-2'>
      <style>{`
        /* Prevent the logo link from turning white or blue on hover/focus —
           keep colour consistent with the rest of the nav */
        .header-logo-link {
          color: inherit !important;
          text-decoration: none !important;
        }
        .header-logo-link:hover,
        .header-logo-link:focus {
          color: inherit !important;
          opacity: 0.85;
        }

        /* The SVG logo has a near-black fill (#1d1d1b) for the C shape
           which disappears on dark backgrounds.
           invert(1) flips it to near-white; hue-rotate(180deg) corrects
           the blue checkmark hue back after the invert. */
        [data-bs-theme="dark"] .logo-img {
          filter: invert(1) hue-rotate(180deg);
        }
      `}</style>

      <div className='container mx-auto d-flex justify-content-between align-items-center flex-wrap'>
        {/* ── Logo ───────────────────────────────────────────── */}
        <Link href='/dashboard' className='header-logo-link d-flex align-items-center'>
          <Image src={logo} alt='Logo' width={40} height={40} priority className='logo-img' />
          <span className='ms-2 fs-4 fw-bold text-body'>Clinical Competency Calculator</span>
        </Link>

        {/* ── Nav + profile (only when signed in) ───────────── */}
        {user && (
          <nav className='d-flex gap-3 align-items-center flex-wrap'>
            <NavLinks />

            <ProfileDropdown
              onOpenProfile={() => setShowProfileModal(true)}
              onOpenTicket={() => setShowTicketModal(true)}
            />
          </nav>
        )}
      </div>

      {/* ── Modals rendered at root for proper z‑index layering ─ */}
      <ProfileSettingsModal show={showProfileModal} onClose={() => setShowProfileModal(false)} />

      <DeveloperTicketModal show={showTicketModal} onClose={() => setShowTicketModal(false)} />
    </header>
  );
}