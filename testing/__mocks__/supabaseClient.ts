// tests/__mocks__/supabaseClient.ts
export default {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({
      data: [
        {
          user_id: 'student-123',
          display_name: 'Test Student',
          email: 'student@test.com'
        }
      ],
      error: null
    })
  };