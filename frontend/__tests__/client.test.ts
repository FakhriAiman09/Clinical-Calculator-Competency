// client.test.ts
import { createClient } from '@/utils/supabase/client';

describe('createClient', () => {
  it('should create a client with default options', () => {
    const client = createClient();
    expect(client).toBeDefined();
  });

  it('should create a client with custom options', () => {
    const client = createClient({
      auth: {
        persistSession: false,
      },
    });
    expect(client.auth).toHaveProperty('persistSession', true);
  });
});