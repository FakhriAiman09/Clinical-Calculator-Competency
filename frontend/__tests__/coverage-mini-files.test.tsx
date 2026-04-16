import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: { alt: string }) => <img alt={alt} {...props} />,
}));

jest.mock('@/components/ccc-logo-color.svg', () => 'ccc-logo-color.svg');

const mockRedirect = jest.fn();
jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

const mockUpdateSession = jest.fn(async (req) => req);
jest.mock('@/utils/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

jest.mock('@/app/dashboard/rater/form/RaterFormsPage', () => ({
  __esModule: true,
  default: () => <div data-testid='rater-forms-page-mock'>Rater Forms</div>,
}));

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(() => ({ user_role: 'student' })),
}));

import Loading from '@/components/loading';
import { proxy, config as proxyConfig } from '@/proxy';
import VerifyAccount from '@/app/postsignup/verify/page';
import RaterFormsWrapper from '@/app/dashboard/rater/form/raterFormsWrapper';
import RaterFormPage from '@/app/dashboard/rater/form/page';
import DemoUserListPage from '@/app/demo/admin/userList/page';
import DemoAllReportsPage from '@/app/demo/admin/all-reports/page';
import { renderQuestion, renderOption } from '@/app/dashboard/admin/edit-questions-options/render-spans';
import OptionItem from '@/app/dashboard/admin/edit-questions-options/question-list-option-item';
import { getLoadingAriaRole, getLoadingText } from '@/utils/loading-utils';
import { isValidTheme, resolveTheme, getBsThemeDatasetValue } from '@/utils/theme-utils';
import { getJwsUserRole } from '@/utils/get-jws-user-role';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('coverage mini files', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Loading uses loading utils output', () => {
    render(<Loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('loading utils return expected constants', () => {
    expect(getLoadingAriaRole()).toBe('status');
    expect(getLoadingText()).toBe('Loading...');
  });

  test('proxy delegates to updateSession and exports matcher config', async () => {
    const req = { url: '/dashboard' } as never;
    await proxy(req);

    expect(mockUpdateSession).toHaveBeenCalledWith(req);
    expect(proxyConfig.matcher[0]).toContain('_next/static');
  });

  test('verify account page renders expected copy and login button', () => {
    render(<VerifyAccount />);

    expect(screen.getByText(/You've signed up!/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to login/i })).toHaveAttribute('href', '/login');
    expect(screen.getByAltText('CCC logo')).toBeInTheDocument();
  });

  test('rater forms wrapper and page render wrapped forms content', () => {
    render(<RaterFormsWrapper />);
    expect(screen.getByTestId('rater-forms-page-mock')).toBeInTheDocument();

    render(<RaterFormPage />);
    expect(screen.getAllByTestId('rater-forms-page-mock').length).toBeGreaterThan(0);
  });

  test('demo admin redirect pages redirect to /demo', () => {
    DemoUserListPage();
    DemoAllReportsPage();

    expect(mockRedirect).toHaveBeenCalledWith('/demo');
    expect(mockRedirect).toHaveBeenCalledTimes(2);
  });

  test('renderQuestion and renderOption produce expected badges', () => {
    const { rerender } = render(renderQuestion('1.1', 'Question text'));
    expect(screen.getByText('1.1')).toBeInTheDocument();
    expect(screen.getByText('Question text')).toBeInTheDocument();

    rerender(renderOption('A', 'Option text'));
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Option text')).toBeInTheDocument();
  });

  test('OptionItem renders and invokes click handler with option context', () => {
    const onOptionClick = jest.fn();
    const mcq = { question: 'Q', options: { A: 'First' } } as never;

    render(
      <ul>
        <OptionItem optKey='A' value='First' mcq={mcq} handleOptionClick={onOptionClick} />
      </ul>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onOptionClick).toHaveBeenCalledWith(mcq, 'A', 'First');
  });

  test('theme utils validate and resolve themes', () => {
    expect(isValidTheme('light')).toBe(true);
    expect(isValidTheme('dark')).toBe(true);
    expect(isValidTheme('auto')).toBe(true);
    expect(isValidTheme('invalid')).toBe(false);

    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');

    expect(getBsThemeDatasetValue('auto')).toBeUndefined();
    expect(getBsThemeDatasetValue('dark')).toBe('dark');
  });

  test('getJwsUserRole returns null and logs when session fetch fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const supabase = {
      auth: {
        getSession: jest.fn(async () => ({ data: null, error: { message: 'boom' } })),
      },
    } as never;

    expect(getJwsUserRole(supabase)).toBeNull();
    await flushPromises();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch session:', 'boom');

    consoleSpy.mockRestore();
  });

  test('getJwsUserRole returns null and logs when session data missing', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const supabase = {
      auth: {
        getSession: jest.fn(async () => ({ data: {}, error: null })),
      },
    } as never;

    expect(getJwsUserRole(supabase)).toBeNull();
    await flushPromises();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch session: No data');

    consoleSpy.mockRestore();
  });

  test('getJwsUserRole triggers jwtDecode for valid session token', async () => {
    const { jwtDecode } = require('jwt-decode');

    const supabase = {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: { access_token: 'token' } },
          error: null,
        })),
      },
    } as never;

    expect(getJwsUserRole(supabase)).toBeNull();
    await waitFor(() => {
      expect(jwtDecode).toHaveBeenCalledWith('token');
    });
  });
});
