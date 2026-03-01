import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Notifications from '@/components/(AdminComponents)/notifications';
import '@testing-library/jest-dom';

describe('Notifications Component', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders all notifications by default', () => {
    const { container } = render(<Notifications />);
    const cardBody = container.querySelector('.card-body');
    const notifications = cardBody?.children;
    expect(notifications).toHaveLength(12);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('filters notifications by type', async () => {
    const { container } = render(<Notifications />);
    
    // Open filter dropdown
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    
    // Select Bias Alert filter
    fireEvent.click(screen.getAllByText('Bias Alert')[0]);
    
    await waitFor(() => {
      const cardBody = container.querySelector('.card-body');
      const biasAlerts = cardBody?.children;
      expect(biasAlerts).toHaveLength(3);
      expect(biasAlerts && biasAlerts[0]).toHaveTextContent('Bias Alert');
    });
  });

  it('deletes notifications', async () => {
    const { container } = render(<Notifications />);
    
    // Open filter dropdown
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    
    // Select Bias Alert filter
    const cardBody = container.querySelector('.card-body');
    await waitFor(() => {
      const notifications = cardBody?.children;
      if (!notifications || notifications.length === 0) {
        throw new Error('No notifications found');
      }
      const deleteButton = notifications[0].querySelector('button')!;
      if (deleteButton) {
          fireEvent.click(deleteButton);
        } else {
          throw new Error('Delete button not found');
        }

      expect(notifications).toHaveLength(11);
    });
  });
  it('shows empty state when no notifications match filter', async () => {
    const { container } = render(<Notifications />);
    
    // Open filter dropdown
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    
    // Select Bias Alert filter
    fireEvent.click(screen.getAllByText('System Alert')[0]);
    const cardBody = container.querySelector('.card-body');
    if (!cardBody) {
      throw new Error('Card body not found');
    }
    const deleteButton = cardBody.querySelector('button');
    expect(deleteButton).not.toBeNull();
    fireEvent.click(deleteButton!);

    await waitFor(() => {
      expect(screen.getByText('No notifications available.')).toBeInTheDocument();
    });
  });

  it('resets filter when "All" is selected', async () => {
    const { container } = render(<Notifications />);
    
    // Apply filter first
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    
    // Reset to all
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.click(screen.getByText('All'));
    
    await waitFor(() => {
      const cardBody = container.querySelector('.card-body');
      const notifications = cardBody?.children;
      expect(notifications).toHaveLength(12);
    });
  });
});