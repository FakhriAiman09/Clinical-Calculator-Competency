import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, priority, ...props }: { alt: string; priority?: boolean }) => <img alt={alt} {...props} />,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('@/components/ccc-logo-color.svg', () => 'ccc-logo-color.svg');

let mockPathname = '/dashboard';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

const mockUseUser = jest.fn();
jest.mock('@/context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

const mockEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ update: mockUpdate }));
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

jest.mock('@/components/DevTicketsModal', () => ({
  __esModule: true,
  default: ({ show }: { show: boolean }) => (
    <div data-testid='dev-ticket-modal'>{show ? 'open' : 'closed'}</div>
  ),
}));

import NavLinks from '@/components/Header/NavLinks';
import ProfileDropdown from '@/components/Header/ProfileDropdown';
import ProfileSettingsModal from '@/components/Header/ProfileSettingsModal';
import Header from '@/components/Header/header';

function setUserContext(overrides: Record<string, unknown> = {}) {
  mockUseUser.mockReturnValue({
    user: { id: 'u1' },
    displayName: 'Test User',
    email: 'test@example.com',
    userRoleStudent: false,
    userRoleAuthorized: false,
    userRoleRater: false,
    userRoleDev: false,
    ...overrides,
  });
}

describe('Header-related coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/dashboard';
    setUserContext();
    mockEq.mockResolvedValue({ error: null });
  });

  test('NavLinks renders role-based links with active class', () => {
    setUserContext({ userRoleStudent: true });

    render(<NavLinks />);

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink.className).toContain('btn btn-secondary');

    expect(screen.getByRole('link', { name: 'Request Assessment' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Comprehensive Report' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About Us' })).toBeInTheDocument();
  });

  test('NavLinks renders rater home link for rater-only role', () => {
    setUserContext({ userRoleRater: true });
    mockPathname = '/dashboard';

    render(<NavLinks />);

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
  });

  test('ProfileDropdown opens menu, supports open-ticket callback, and closes on outside click', async () => {
    const onOpenTicket = jest.fn();
    render(<ProfileDropdown onOpenTicket={onOpenTicket} />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Report Issue/i }));
    expect(onOpenTicket).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });

  test('ProfileSettingsModal renders when shown and saves successfully', async () => {
    const onClose = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<ProfileSettingsModal show={true} onClose={onClose} />);

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();

    const displayNameInput = screen.getByLabelText('Display Name');
    fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });

    const saveBtn = screen.getByRole('button', { name: /Save changes/i });
    expect(saveBtn).toBeEnabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockEq).toHaveBeenCalledWith('id', 'u1');
      expect(onClose).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  test('ProfileSettingsModal handles save error and shows error toast', async () => {
    const onClose = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockEq.mockResolvedValue({ error: new Error('update failed') });

    render(<ProfileSettingsModal show={true} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    expect(await screen.findByText('Failed to update display name.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('Header toggles mobile nav and opens ticket modal', () => {
    render(<Header />);

    expect(screen.getByTestId('dev-ticket-modal')).toHaveTextContent('closed');

    const toggleButton = screen.getByRole('button', { name: 'Toggle navigation' });
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getAllByRole('button')[1]); // profile dropdown trigger
    fireEvent.click(screen.getByRole('button', { name: /Report Issue/i }));

    expect(screen.getByTestId('dev-ticket-modal')).toHaveTextContent('open');
  });

  test('Header renders minimal layout when user is missing', () => {
    setUserContext({ user: null });

    render(<Header />);

    expect(screen.queryByRole('button', { name: 'Toggle navigation' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Clinical Competency Calculator/i })).toBeInTheDocument();
  });
});
