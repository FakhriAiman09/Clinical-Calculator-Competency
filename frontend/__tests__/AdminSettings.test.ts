import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockSelect = jest.fn(async () => ({ data: [], error: null }));
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: jest.fn(async () => ({ data: null, error: null })),
  update: jest.fn(() => ({ eq: jest.fn(async () => ({ data: null, error: null })) })),
  delete: jest.fn(() => ({ eq: jest.fn(async () => ({ data: null, error: null })) })),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

import AdminSettingsButtons from '@/components/(AdminComponents)/AdminSettingsButtons';

describe('AdminSettingsButtons (.ts clean)', () => {

  test('renders', () => {
    render(React.createElement(AdminSettingsButtons));

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Edit Clinical Settings')).toBeInTheDocument();
  });

  test('opens modal', async () => {
    render(React.createElement(AdminSettingsButtons));

    fireEvent.click(screen.getByText('Edit Clinical Settings'));

    expect(await screen.findByText('Clinical Settings')).toBeInTheDocument();
  });

});

