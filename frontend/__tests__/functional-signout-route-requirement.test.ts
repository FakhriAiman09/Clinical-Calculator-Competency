/** @jest-environment node */

// Mock sign-out call to Supabase auth.
const signOutMock = jest.fn(async () => ({}));
// Mock cache revalidation call used by the route.
const revalidatePathMock = jest.fn();

// Mock server Supabase client used in sign-out route.
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      signOut: signOutMock,
    },
  })),
}));

// Mock Next.js cache API to verify path revalidation.
jest.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}));

import { POST } from '@/app/auth/signout/route';

// Tests for sign-out route behavior.
describe('Functional requirement: sign-out route', () => {
  // Reset mock call counts before each test.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Should sign out globally, revalidate layout, and redirect to login page.
  test('revokes global session and redirects user to login', async () => {
    const req = {
      nextUrl: new URL('http://localhost:3000/auth/signout'),
    } as never;

    const response = await POST(req);

    expect(signOutMock).toHaveBeenCalledWith({ scope: 'global' });
    expect(revalidatePathMock).toHaveBeenCalledWith('/', 'layout');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login');
  });
});
