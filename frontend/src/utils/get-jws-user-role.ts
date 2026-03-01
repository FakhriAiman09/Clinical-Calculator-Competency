'use client';

import { jwtDecode } from 'jwt-decode';

import type { SupabaseClient } from '@supabase/supabase-js';

export function getJwsUserRole(supabase: SupabaseClient): string | null {
  interface JwtPayload {
    user_role: string;
  }

  supabase.auth.getSession().then(({ data, error }) => {
    if (error) return console.error('Failed to fetch session:', error.message);
    if (!data || !data.session) return console.error('Failed to fetch session: No data');

    const jwt = jwtDecode(data.session.access_token) as JwtPayload;
    return jwt.user_role;
  });

  return null;
}
