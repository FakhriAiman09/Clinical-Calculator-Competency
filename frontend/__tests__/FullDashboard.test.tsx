import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { UserProvider, useUser } from '@/context/UserContext';

const contextValueCallback = jest.fn();
// Define types for mocked Supabase client
type MockSupabaseType = {
  auth: {
    onAuthStateChange: jest.Mock;
    getSession: jest.Mock;
  };
  from: jest.Mock;
  rpc: jest.Mock;
};

// Mock the modules before importing them in the component
jest.mock('@/utils/supabase/client', () => {
  const mockSupabase = {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockImplementation(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null })
  };
  
  return {
    createClient: jest.fn().mockReturnValue(mockSupabase)
  };
});

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn()
}));

// Test component to consume the UserContext
interface TestConsumerProps {
  onContextValue: (value: { user: { id: string; email: string } | null; displayName: string; email: string; userRoleAuthorized?: boolean; userRoleStudent?: boolean; userRoleRater?: boolean; userRoleDev?: boolean }) => void;
}

const TestConsumer: React.FC<TestConsumerProps> = ({ onContextValue }) => {
  const userContext = useUser();
  React.useEffect(() => {
    onContextValue({
      ...userContext,
      user: userContext.user
        ? { ...userContext.user, email: userContext.user.email || '' }
        : null,
    });
  }, [onContextValue, userContext]);
  return <div>Test Consumer</div>;
};

describe('UserContext', () => {
    let mockSupabase: MockSupabaseType;
    
    beforeEach(() => {
      jest.clearAllMocks();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@/utils/supabase/client');
      mockSupabase = createClient();
      
      // Default auth change mock
      mockSupabase.auth.onAuthStateChange.mockImplementation(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }));
    });
  
    // Helper function for mocking profile fetches
    const mockProfileFetch = (displayName: string) => {
      const profilesMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { display_name: displayName }, error: null }),
      };
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profilesMock;
        return { select: jest.fn() };
      });
    };
  
    // Helper function for mocking role fetches
    const mockRoleFetch = (role: string) => {
      mockSupabase.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_user_role_by_user_id') {
          return Promise.resolve({ data: role, error: null });
        }
        return Promise.resolve({ data: null, error: new Error('Unexpected RPC call') });
      });
    };
  
    test('sets user data and admin role correctly', async () => {
      const mockUser = { id: 'user-123', email: 'admin@example.com' };
      
      // Mock session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      });
  
      // Mock profile and role
      mockProfileFetch('Admin User');
      mockRoleFetch('admin');
  
      await act(async () => {
        render(<UserProvider><TestConsumer onContextValue={contextValueCallback} /></UserProvider>);
      });
  
      await waitFor(() => {
        const lastCall = contextValueCallback.mock.calls.at(-1)[0];
        expect(lastCall).toMatchObject({
          user: mockUser,
          displayName: 'Admin User',
          email: 'admin@example.com',
          userRoleAuthorized: true
        });
      });
    });
  
    test('sets user data and student role correctly', async () => {
      const mockUser = { id: 'user-456', email: 'student@example.com' };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      });
  
      mockProfileFetch('Student User');
      mockRoleFetch('student');
  
      await act(async () => {
        render(<UserProvider><TestConsumer onContextValue={contextValueCallback} /></UserProvider>);
      });
  
      await waitFor(() => {
        const lastCall = contextValueCallback.mock.calls.at(-1)[0];
        expect(lastCall).toMatchObject({
          user: mockUser,
          displayName: 'Student User',
          email: 'student@example.com',
          userRoleStudent: true
        });
      });
    });
  
    test('sets user data and rater role correctly', async () => {
      const mockUser = { id: 'user-789', email: 'rater@example.com' };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      });
  
      mockProfileFetch('Rater User');
      mockRoleFetch('rater');
  
      await act(async () => {
        render(<UserProvider><TestConsumer onContextValue={contextValueCallback} /></UserProvider>);
      });
  
      await waitFor(() => {
        const lastCall = contextValueCallback.mock.calls.at(-1)[0];
        expect(lastCall).toMatchObject({
          user: mockUser,
          displayName: 'Rater User',
          email: 'rater@example.com',
          userRoleRater: true
        });
      });
    });
  
    test('sets user data and dev role correctly', async () => {
      const mockUser = { id: 'user-101', email: 'dev@example.com' };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      });
  
      mockProfileFetch('Developer');
      mockRoleFetch('dev');
  
      await act(async () => {
        render(<UserProvider><TestConsumer onContextValue={contextValueCallback} /></UserProvider>);
      });
  
      await waitFor(() => {
        const lastCall = contextValueCallback.mock.calls.at(-1)[0];
        expect(lastCall).toMatchObject({
          user: mockUser,
          displayName: 'Developer',
          email: 'dev@example.com',
          userRoleDev: true
        });
      });
    });
  
    test('handles sign out event correctly', async () => {
      const mockUser = { id: 'user-202', email: 'dev@example.com' };
      
      // Initial login
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      });
      mockProfileFetch('Developer');
      mockRoleFetch('dev');
  
      let authChangeCallback: (event: string) => void;
      mockSupabase.auth.onAuthStateChange.mockImplementationOnce((callback) => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });
  
      await act(async () => {
        render(<UserProvider><TestConsumer onContextValue={contextValueCallback} /></UserProvider>);
      });
  
      // Verify initial state
      await waitFor(() => {
        expect(contextValueCallback.mock.calls.at(-1)[0].userRoleDev).toBe(true);
      });
  
      // Simulate sign out
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      await act(async () => authChangeCallback('SIGNED_OUT'));
  
      await waitFor(() => {
        expect(contextValueCallback.mock.calls.at(-1)[0].user).toBeNull();
      });
    });
  
    test('handles token refresh event correctly', async () => {
      const mockUser = { id: 'user-303', email: 'student@example.com' };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      });
      mockProfileFetch('Student User');
      mockRoleFetch('student');
  
      let authChangeCallback: (event: string) => void;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });
  
      await act(async () => {
        render(<UserProvider><TestConsumer onContextValue={contextValueCallback} /></UserProvider>);
      });
  
      // Update mocks for refresh
      const updatedUser = { ...mockUser, email: 'updated@example.com' };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: updatedUser } },
      });
      mockProfileFetch('Updated Name');
      mockRoleFetch('admin');
  
      await act(async () => authChangeCallback('TOKEN_REFRESHED'));
  
      await waitFor(() => {
        const lastCall = contextValueCallback.mock.calls.at(-1)[0];
        expect(lastCall).toMatchObject({
          user: updatedUser,
          displayName: 'Updated Name',
          email: 'updated@example.com',
          userRoleAuthorized: true
        });
      });
    });
  
    test('handles errors when fetching profile data', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockUser = { id: 'error-user', email: 'error@example.com' };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      });
  
      // Mock profile error
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Profile error') })
      }));
  
      mockRoleFetch('rater');
  
      await act(async () => {
        render(<UserProvider><TestConsumer onContextValue={contextValueCallback} /></UserProvider>);
      });
  
      await waitFor(() => {
        const lastCall = contextValueCallback.mock.calls.at(-1)[0];
        expect(lastCall.displayName).toBe('');
      });
      consoleErrorSpy.mockRestore();
    });
  
    test('handles errors when fetching user role', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockUser = { id: 'role-error', email: 'role@example.com' };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      });
      mockProfileFetch('Role Error User');
  
      // Mock role error
      mockSupabase.rpc.mockImplementation(() => 
        Promise.resolve({ data: null, error: new Error('Role error') })
      );
  
      await act(async () => {
        render(<UserProvider><TestConsumer onContextValue={contextValueCallback} /></UserProvider>);
      });
  
      await waitFor(() => {
        const lastCall = contextValueCallback.mock.calls.at(-1)[0];
        expect(lastCall.userRoleAuthorized).toBe(false);
        expect(lastCall.userRoleRater).toBe(false);
        expect(lastCall.userRoleStudent).toBe(false);
        expect(lastCall.userRoleDev).toBe(false);
      });
      consoleErrorSpy.mockRestore();
    });
  });