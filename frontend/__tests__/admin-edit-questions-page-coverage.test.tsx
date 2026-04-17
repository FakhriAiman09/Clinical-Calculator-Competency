import React from 'react';
import { render, screen } from '@testing-library/react';

const mockAuthorize = jest.fn();
const mockRedirect = jest.fn();

jest.mock('@/utils/async-util', () => ({
  supabase_authorize: (...args: unknown[]) => mockAuthorize(...args),
}));

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

jest.mock('@/app/dashboard/admin/edit-questions-options/question-list', () => ({
  __esModule: true,
  default: () => <div data-testid='question-list'>Question List Mock</div>,
}));

import Account from '@/app/dashboard/admin/edit-questions-options/page';

describe('admin edit-questions-options page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /no-auth when authorization fails', async () => {
    mockAuthorize.mockResolvedValue(false);

    const ui = await Account();
    render(ui);

    expect(mockAuthorize).toHaveBeenCalledWith(['mcqs_options.select', 'mcqs_options.insert']);
    expect(mockRedirect).toHaveBeenCalledWith('/no-auth');
    expect(screen.getByTestId('question-list')).toBeInTheDocument();
  });

  it('renders question list container when authorized', async () => {
    mockAuthorize.mockResolvedValue(true);

    const ui = await Account();
    render(ui);

    expect(mockAuthorize).toHaveBeenCalledWith(['mcqs_options.select', 'mcqs_options.insert']);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByTestId('question-list')).toBeInTheDocument();
  });
});
