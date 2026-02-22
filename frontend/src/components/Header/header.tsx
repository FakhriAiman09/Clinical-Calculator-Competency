'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { useUser } from '@/context/UserContext'; // user auth state :contentReference[oaicite:0]{index=0}
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
      <div className='container mx-auto d-flex justify-content-between align-items-center flex-wrap'>
        {/* ── Logo ───────────────────────────────────────────── */}
        <Link href='/dashboard' className='d-flex align-items-center text-decoration-none'>
          <Image src={logo} alt='Logo' width={40} height={40} priority />
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