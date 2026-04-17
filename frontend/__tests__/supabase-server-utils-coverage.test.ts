/** @jest-environment node */

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ id: 'server-client' })),
}));

describe('supabase/server createClient coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('creates a server client and wires cookie methods', async () => {
    const getAll = jest.fn(() => [{ name: 'sb-access', value: 'token' }]);
    const set = jest.fn();
    (cookies as jest.Mock).mockResolvedValue({ getAll, set });

    const client = await createClient({ global: { headers: { 'x-test': '1' } } });

    expect(client).toEqual({ id: 'server-client' });
    expect(createServerClient).toHaveBeenCalledTimes(1);

    const thirdArg = (createServerClient as jest.Mock).mock.calls[0][2];
    expect(thirdArg.global.headers['x-test']).toBe('1');
    expect(thirdArg.cookies.getAll()).toEqual([{ name: 'sb-access', value: 'token' }]);

    thirdArg.cookies.setAll([{ name: 'k', value: 'v', options: { path: '/' } }]);
    expect(set).toHaveBeenCalledWith('k', 'v', { path: '/' });
  });

  it('swallows errors when cookieStore.set throws', async () => {
    (cookies as jest.Mock).mockResolvedValue({
      getAll: jest.fn(() => []),
      set: jest.fn(() => {
        throw new Error('Cannot set cookie in server component');
      }),
    });

    await createClient();
    const thirdArg = (createServerClient as jest.Mock).mock.calls[0][2];

    expect(() => {
      thirdArg.cookies.setAll([{ name: 'a', value: 'b', options: {} }]);
    }).not.toThrow();
  });
});
