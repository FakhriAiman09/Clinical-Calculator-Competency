'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';

/**
 * ProfileDropdown
 *
 * ▸ Shows the signed‑in user's name / email.
 * ▸ Opens either the Profile‑Settings modal or the Developer‑Ticket modal via
 *   callback props (keeps all modal logic in React).
 * ▸ Includes a link to the /dashboard/settings page.
 * ▸ Closes itself when you click outside the menu.
 */
interface ProfileDropdownProps {
  readonly onOpenProfile: () => void; // open ProfileSettingsModal
  readonly onOpenTicket: () => void;  // open DeveloperTicketModal
}

export default function ProfileDropdown({ onOpenProfile, onOpenTicket }: ProfileDropdownProps) {
  const { displayName, email } = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ── click‑outside to close ─────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowMenu(false);
    };

    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // ── render ────────────────────────────────────────────────
  return (
    <div className='dropdown' ref={ref}>
      <button
        className='btn btn-outline-secondary dropdown-toggle'
        type='button'
        onClick={() => setShowMenu((prev) => !prev)}
      >
        <i className='bi bi-person-circle'></i>
      </button>

      {showMenu && (
        <ul className='dropdown-menu dropdown-menu-end show'>
          {/* user info */}
          <li className='dropdown-item-text text-center no-select'>
            <strong className='no-pointer'>{displayName || 'User'}</strong>
            <br />
            <small className='text-muted no-pointer'>{email}</small>
          </li>

          <li>
            <hr className='dropdown-divider' />
          </li>

          {/* open profile settings */}
          <li>
            <button className='dropdown-item' onClick={onOpenProfile}>
              <i className='bi bi-person me-2' />
              {'Profile Settings'}
            </button>
          </li>

          {/* settings page */}
          <li>
            <Link
              className='dropdown-item'
              href='/dashboard/settings'
              onClick={() => setShowMenu(false)}
            >
              <i className='bi bi-gear me-2' />
              {' Settings'}
            </Link>
          </li>

          {/* open developer ticket modal */}
          <li>
            <button className='dropdown-item' onClick={onOpenTicket}>
              <i className='bi bi-bug me-2'/>
              Report Issue / Feature
            </button>
          </li>

          <li>
            <hr className='dropdown-divider' />
          </li>

          {/* logout */}
          <li>
            <form action='/auth/signout' method='post'>
              <button className='dropdown-item text-danger' type='submit'>
                <i className='bi bi-box-arrow-right me-2' />
                Logout
              </button>
            </form>
          </li>
        </ul>
      )}
    </div>
  );
}