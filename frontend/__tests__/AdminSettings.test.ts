import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
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

