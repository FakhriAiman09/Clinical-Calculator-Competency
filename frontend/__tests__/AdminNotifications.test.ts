import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Notifications from '@/components/(AdminComponents)/notifications';

describe('AdminNotifications Component (.ts version)', () => {
  /**
   * Test that the settings UI renders correctly.
   */
  test('renders settings UI', () => {
    render(React.createElement(Notifications));

    // Check heading
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Check button
    expect(
      screen.getByRole('button', { name: 'Edit Clinical Settings' })
    ).toBeInTheDocument();
  });

  /**
   * Test button existence and interaction possibility
   */
  test('button is clickable', () => {
    render(React.createElement(Notifications));

    const button = screen.getByRole('button', {
      name: 'Edit Clinical Settings',
    });

    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });
});