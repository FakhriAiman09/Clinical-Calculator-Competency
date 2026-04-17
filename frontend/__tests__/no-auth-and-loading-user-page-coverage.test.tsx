/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img alt={alt} {...props} />,
}));

jest.mock('@/components/ccc-logo-color.svg', () => 'logo.svg');

import NoAuthPage from '@/app/no-auth/page';
import LoadingUserPage from '@/app/loading-user/page';

const mockUseUser = jest.fn();
jest.mock('@/context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

describe('no-auth page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders unauthorized message and back button', () => {
    render(<NoAuthPage />);
    expect(screen.getByText(/not authorized to access this page/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
  });

  it('redirects to dashboard on back button click', () => {
    render(<NoAuthPage />);
    fireEvent.click(screen.getByRole('button', { name: /back to dashboard/i }));
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});

describe('loading-user page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders spinner and loading message while loading', () => {
    mockUseUser.mockReturnValue({ loading: true, user: null });

    render(<LoadingUserPage />);
    expect(screen.getByText('Clinical Competency Calculator')).toBeInTheDocument();
    expect(screen.getByText(/loading your session/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('hides header when mounted', () => {
    mockUseUser.mockReturnValue({ loading: true, user: null });

    const header = document.createElement('header');
    document.body.appendChild(header);
    expect(header.style.display).toBe('');

    render(<LoadingUserPage />);

    expect(header.style.display).toBe('none');
    document.body.removeChild(header);
  });

  it('redirects to dashboard when loading done and user is logged in', () => {
    mockUseUser.mockReturnValue({ loading: false, user: { id: 'u1' } });

    render(<LoadingUserPage />);

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to home when loading done and user is not logged in', () => {
    mockUseUser.mockReturnValue({ loading: false, user: null });

    render(<LoadingUserPage />);

    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
