import React from 'react';
import { render, screen, fireEvent , act} from '@testing-library/react';
import '@testing-library/jest-dom';
import { useUser } from '../../frontend/src/context/UserContext';
import { usePathname } from 'next/navigation';
import Header from '../../frontend/src/components/Header';

jest.mock('../../frontend/src/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
  })),
}));

jest.mock('../../frontend/src/utils/supabase/server.ts', () => ({
  createClient: jest.fn(() => ({
    // mock your functions here as needed
  })),
}));

  jest.mock('../../frontend/src/context/UserContext', () => ({
    useUser: jest.fn(() => ({
      user: true,
      displayName: 'Test User',
      email: 'test@example.com',
      userRoleAuthorized: true,
      userRoleRater: false,
      userRoleStudent: false,
      userRoleDev: false,
    })),
  }));

  jest.mock('next/navigation', () => ({
    usePathname: jest.fn(() => '/dashboard'),
  }));
  

describe('Header Component', () => {
  beforeEach(() => {
    (useUser as jest.Mock).mockReturnValue({
      user: true,
      displayName: 'Test User',
      email: 'test@example.com',
      userRoleAuthorized: true,
      userRoleRater: false,
      userRoleStudent: false,
      userRoleDev: false,
    });

    (usePathname as jest.Mock).mockReturnValue('/dashboard');
  });

  test('Renders the header component', async () => {
    await act(async () => {
      render(<Header />);
    });
    expect(screen.getByText('Clinical Competency Calculator')).toBeInTheDocument();
  });

  test('Updates display name field on change', async () => {
    await act( async () => {
      render(<Header />)
    });
    const displayNameInput = screen.getByLabelText(/Display Name/i) as HTMLInputElement;

    fireEvent.change(displayNameInput, { target: { value: 'New Name' } });
    expect(displayNameInput.value).toBe('New Name');
  });

// test('toggles profile menu on button click', async () => {
//   render(<Header />);

//   // Initially, the dropdown should not be visible
//   expect(screen.queryByText(/Profile Settings/i)).not.toBeInTheDocument();

//   // Find and click the profile button
//   const profileButton = screen.getByRole('button', { name: /profile menu/i });
//   fireEvent.click(profileButton);

//   // Now, the profile menu should be visible
//   expect(screen.queryByText(/Profile Settings/i)).toBeInTheDocument();

//   // Optionally, test that the modal can be closed again (if you need that functionality)
//   const closeButton = screen.getByLabelText(/close/i);
//   fireEvent.click(closeButton);

//   // After closing, the modal should no longer be in the document
//   expect(screen.queryByText(/Profile Settings/i)).not.toBeInTheDocument();
// });

// test('calls handleSaveChanges when clicking save', () => {
//   render(<Header />);
//   const saveButton = screen.getByRole('button', { name: /Save changes/i });

//   fireEvent.click(saveButton);

//   // Mock `handleSaveChanges` to ensure it's called
//   // You may need to make it a prop or export it for testing separately
// });

// test('closes profile menu when clicking outside', async () => {
//   await act( async () => {
//     render(<Header />)
//   });
//   const profileButton = screen.getByRole('button', { name: /person-circle/i });

//   fireEvent.click(profileButton); // Open menu
//   expect(screen.getByText(/Profile Settings/i)).toBeInTheDocument();

//   fireEvent.mouseDown(document.body); // Simulate outside click
//   expect(screen.queryByText(/Profile Settings/i)).not.toBeInTheDocument();
// });

});