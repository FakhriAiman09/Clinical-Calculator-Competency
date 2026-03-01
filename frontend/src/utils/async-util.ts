'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Checks if a user has the specified permissions defined in Supabase.
 * @param {string[]} permissions - An array of strings that represent the permissions that the user is requesting
 * authorization for.
 * @returns A Promise that resolves to a boolean value. It returns `true` if all the requested permissions are
 * successfully authorized, and `false` if there is an error fetching user permissions or if any of the requested
 * permissions are not authorized.
 */
export async function supabase_authorize(permissions: string[]): Promise<boolean> {
  const supabase = await createClient();

  for (const permission of permissions) {
    const { data, error } = await supabase.schema('public').rpc('authorize', { requested_permission: permission });
    if (error) {
      console.error('Error fetching user permissions:', error);
      return false;
    }
    if (!data) {
      console.error('Error fetching user permissions: No data returned');
      return false;
    }
  }
  return true;
}
