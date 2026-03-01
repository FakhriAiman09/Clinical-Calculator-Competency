// hooks/useRequireRole.ts
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';

export function useRequireRole(required: ('student' | 'rater' | 'admin' | 'dev')[]) {
  const { loading, userRoleAuthorized, userRoleRater, userRoleStudent, userRoleDev } = useUser(); // adapt to your flags
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // wait until context finished
    const allowed =
      (required.includes('admin') && userRoleAuthorized) ||
      (required.includes('rater') && userRoleRater) ||
      (required.includes('student') && userRoleStudent) ||
      (required.includes('dev') && userRoleDev);

    if (!allowed) router.replace('/no-auth');
  }, [loading, required, userRoleAuthorized, userRoleRater, userRoleStudent, userRoleDev, router]);
}
