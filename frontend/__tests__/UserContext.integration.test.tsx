import { render, waitFor, act } from '@testing-library/react';
import { UserProvider, useUser } from '@/context/UserContext';
import { createClient } from '@/utils/supabase/client';

const TEST_USER = {
    email: process.env.DEV_USER!,
    password: process.env.DEV_PASSWORD!,
  };

const EXPECTED_VALUE = {
    role: 'authenticated',
    displayName: process.env.DEV_NAME!,
    userRoleDev: 'dev',
    userRoleAuthorized: 'authorized',
};

describe('UserContext (Integration)', () => {
  const supabase: ReturnType<typeof createClient> = createClient();

   // Ensure we're signed out before each test
   beforeEach(async () => {
    await act(async () => {
      // Wait for any pending promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
      await supabase.auth.signOut();
    });
  });

  // Clean up after each test more thoroughly
  afterEach(async () => {
    await act(async () => {
      try {
        // Sign out first
        await supabase.auth.signOut();
        // Wait slightly longer to ensure all state updates complete
        await new Promise(resolve => setTimeout(resolve, 100));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Silently catch errors during cleanup - they shouldn't fail tests
      }
    });
    
    // Force a tick in the event loop to process any pending promises
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  // Clean up after all tests
  afterAll(async () => {
    try {
      // Make sure we're signed out
      await supabase.auth.signOut();
      // Pause to ensure all lifecycle hooks and async operations complete
      await new Promise(resolve => setTimeout(resolve, 200));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Ignore errors
    }
  });
  
  it('should handle user sign-in and state updates', async () => {
    const TestComponent = () => {
      const { user, displayName, email, userRoleDev, loading } = useUser();
      const role = user?.role;
      return (
        <div>
          <div>
            {loading ? 'Loading...' : email}
          </div>
          <div>
            {user ? role : 'undefined'}
          </div>
          <div>
            {displayName ? displayName : 'undefined'}
          </div>
          <div>
            {userRoleDev ? 'dev' : 'not-dev'}
          </div>
        </div>
      );
    };

    const { getByText } = render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    await act(async () => {
      await supabase.auth.signInWithPassword(TEST_USER);
    });
    
    await waitFor(() => {
      expect(getByText(TEST_USER.email)).toBeInTheDocument();
      expect(getByText(EXPECTED_VALUE.role)).toBeInTheDocument();
      expect(getByText(EXPECTED_VALUE.displayName)).toBeInTheDocument();
      expect(getByText(EXPECTED_VALUE.userRoleDev)).toBeInTheDocument();
    });
  });

  it('should handle auth state changes', async () => {
    const TestComponent = () => {
      const { user } = useUser();
      return <div>{user ? 'Signed In' : 'Signed Out'}</div>;
    };

    const { getByText } = render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    // Initial state
    expect(getByText('Signed Out')).toBeInTheDocument();

    // Sign in
    await act(async () => {
      await supabase.auth.signInWithPassword(TEST_USER);
    });

    await waitFor(() => {
      expect(getByText('Signed In')).toBeInTheDocument();
    });

    // Sign out
    await act(async () => {
      await supabase.auth.signOut();
    });

    await waitFor(() => {
      expect(getByText('Signed Out')).toBeInTheDocument();
    });
  });
  
  it('should throw error when used outside UserProvider', () => {
    // Create a test component that uses the hook incorrectly
    const TestComponent = () => {
      useUser(); // This should throw
      return null;
    };

    // Verify the error is thrown
    expect(() => render(<TestComponent />))
      .toThrow('useUser must be used within a UserProvider');
    
  });

  it('should return context when used inside UserProvider', async () => {
    const TestComponent = () => {
      const { loading } = useUser();
      return <div>{loading ? 'Loading' : 'Ready'}</div>;
    };

    const { getByText } = render(
      <UserProvider>
      <TestComponent />
      </UserProvider>
    );

    await waitFor(() => {
      expect(getByText('Ready')).toBeInTheDocument();
    });
  });

  it('should provide access to all context values with proper loading handling', async () => {
    const ContextReader = () => {
      const context = useUser();
      return (
        <div>
              <span data-testid="email">{context.email}</span>
              <span data-testid="user-id">{context.user ? JSON.stringify(context.user) : 'null'}</span>
        </div>
      );
    };
    
    const { findByTestId } = render(
      <UserProvider>
        <ContextReader />
      </UserProvider>
    );
    
    await act(async () => {
      await supabase.auth.signInWithPassword(TEST_USER);
    });
  
    // Gives the user identification and email context.
    expect(await findByTestId('user-id')).not.toHaveTextContent('null');
    expect(await findByTestId('email')).toHaveTextContent(TEST_USER.email);
  });
});
