// client.test.ts
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({ mockClient: true })),
}));

import { createClient } from '@/utils/supabase/client';
import { createBrowserClient } from '@supabase/ssr';

describe('createClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should create a client with default options', () => {
    const client = createClient();
    expect(client).toBeDefined();
    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key'
    );
  });

  it('should create a client with custom options', () => {
    createClient({
      auth: {
        persistSession: false,
      },
    });

    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        auth: {
          persistSession: false,
        },
      })
    );
  });
});