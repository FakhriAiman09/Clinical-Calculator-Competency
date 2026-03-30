/** @jest-environment node */

const signOutMock = jest.fn(async () => ({}));
const revalidatePathMock = jest.fn();

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      signOut: signOutMock,
    },
  })),
}));

jest.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}));

import { POST } from '@/app/auth/signout/route';

describe('Functional requirement: sign-out route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
