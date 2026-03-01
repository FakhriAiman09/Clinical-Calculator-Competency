import React from 'react'
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return React.createElement('img', props);
  },
}));

// process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.com';
// process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

// // jest.setup.ts or inside your test file
// jest.mock('frontend/src/utils/supabase/client', () => ({
//     createClient: jest.fn().mockReturnValue({
//       auth: {
//         getUser: jest.fn().mockResolvedValue({
//           data: { user: { id: '123', email: 'test@example.com' } },
//           error: null,
//         }), // Mock auth.getUser
//       },
//       from: jest.fn().mockReturnValue({
//         select: jest.fn().mockResolvedValue({
//           data: [{ display_name: 'Test User' }],
//           error: null,
//         }), // Mock supabase.from('profiles').select()
//         upsert: jest.fn().mockResolvedValue({
//           data: null,
//           error: null,
//         }), // Mock supabase.from('profiles').upsert()
//       }),
//     }),
//     createBrowserClient: jest.fn().mockReturnValue({
//       auth: {
//         getUser: jest.fn().mockResolvedValue({
//           data: { user: { id: '123', email: 'test@example.com' } },
//           error: null,
//         }), // Mock createBrowserClient.auth.getUser
//       },
//       from: jest.fn().mockReturnValue({
//         select: jest.fn().mockResolvedValue({
//           data: [{ display_name: 'Test User' }],
//           error: null,
//         }), // Mock createBrowserClient.from('profiles').select()
//         upsert: jest.fn().mockResolvedValue({
//           data: null,
//           error: null,
//         }), // Mock createBrowserClient.from('profiles').upsert()
//       }),
//     }),
//  }));
  