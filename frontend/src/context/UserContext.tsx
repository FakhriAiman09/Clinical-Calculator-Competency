'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

// Create a Supabase client instance
const supabase = createClient();

/**
 * Defines the structure of the user context value.
 */
interface UserContextType {
  user: User | null; // Supabase user object
  displayName: string; // Display name from profile
  email: string; // User email
  userRoleAuthorized: boolean; // Admin role flag
  userRoleRater: boolean; // Rater role flag
  userRoleStudent: boolean; // Student role flag
  userRoleDev: boolean; // Dev role flag
  loading: boolean; // Indicates if user data is loading
}

// Create the context
const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Provides user session and role context to the app.
 *
 * @param {Object} props
 * @param {ReactNode} props.children - Components that will consume this context
 * @returns {JSX.Element}
 */
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [userRoleAuthorized, setUserRoleAuthorized] = useState(false);
  const [userRoleRater, setUserRoleRater] = useState(false);
  const [userRoleStudent, setUserRoleStudent] = useState(false);
  const [userRoleDev, setUserRoleDev] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Clears all user-related state variables.
   */
  const clearUserState = () => {
    setUser(null);
    setDisplayName('');
    setEmail('');
    setUserRoleAuthorized(false);
    setUserRoleRater(false);
    setUserRoleStudent(false);
    setUserRoleDev(false);
    setLoading(false);
  };

  /**
   * Fetches the user's display name from the `profiles` table.
   *
   * @param {string} userId - The Supabase user ID
   * @returns {Promise<string | null>} - Display name or null on error
   */
  const fetchUserProfile = async (userId: string): Promise<string | null> => {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return profileData.display_name;
  };

  /**
   * Fetches the user's role using an RPC function.
   *
   * @param {string} userId - The Supabase user ID
   * @returns {Promise<string | null>} - Role string or null on error
   */
  const fetchUserRole = async (userId: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc('get_user_role_by_user_id', {
      id: userId,
    });

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data as string | null;
  };

  /**
   * Retrieves the current session and updates user state and roles.
   * Uses memoization to avoid unnecessary recreation on rerenders.
   */
  const fetchUser = useCallback(async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // No user session found
    if (!session?.user) {
      clearUserState();
      return;
    }

    const currentUser = session.user;
    setUser(currentUser);

    // Set email if changed
    if (currentUser.email !== email) setEmail(currentUser.email ?? '');

    // Set display name if changed
    const name = await fetchUserProfile(currentUser.id);
    if (name !== displayName) setDisplayName(name ?? '');

    // Determine and set roles from the RPC result
    const role = await fetchUserRole(currentUser.id);
    setUserRoleDev(role === 'dev');
    setUserRoleAuthorized(role === 'admin');
    setUserRoleRater(role === 'rater');
    setUserRoleStudent(role === 'student');

    setLoading(false);
  }, [email, displayName]);

  /**
   * Initializes user context and sets up Supabase auth state change listener.
   */
  useEffect(() => {
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUser();
      } else if (event === 'SIGNED_OUT') {
        clearUserState();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        displayName,
        email,
        userRoleAuthorized,
        userRoleRater,
        userRoleStudent,
        userRoleDev,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

/**
 * Custom hook to access the user context.
 *
 * @returns {UserContextType} - The user context object
 * @throws {Error} If used outside of a UserProvider
 */
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
