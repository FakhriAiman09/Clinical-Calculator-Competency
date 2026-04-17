/** @jest-environment node */

import { GET } from '@/app/auth/confirm/route';

const mockVerifyOtp = jest.fn();
const mockCreateClient = jest.fn();

jest.mock('@/utils/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

describe('auth confirm route coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue({
      auth: {
        verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      },
    });
  });

  function buildRequest(url: string) {
    const u = new URL(url);
    return {
      url: u.toString(),
      nextUrl: {
        clone: () => new URL(u.toString()),
      },
    } as any;
  }

  it('redirects to /account when token and type are valid and verifyOtp succeeds', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });

    const req = buildRequest('http://localhost:3000/auth/confirm?token_hash=abc123&type=signup&next=/dashboard');
    const res = await GET(req);

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: 'signup',
      token_hash: 'abc123',
    });

    const location = res.headers.get('location');
    expect(location).toContain('/account');
    expect(location).not.toContain('token_hash');
    expect(location).not.toContain('type=');
    expect(location).not.toContain('next=');
  });

  it('redirects to /error when verifyOtp returns an error', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'otp invalid' } });

    const req = buildRequest('http://localhost:3000/auth/confirm?token_hash=bad&type=invite&next=/dashboard');
    const res = await GET(req);

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: 'invite',
      token_hash: 'bad',
    });

    const location = res.headers.get('location');
    expect(location).toContain('/error');
    expect(location).not.toContain('token_hash');
    expect(location).not.toContain('type=');
  });

  it('redirects to /error when token_hash is missing', async () => {
    const req = buildRequest('http://localhost:3000/auth/confirm?type=signup&next=/dashboard');
    const res = await GET(req);

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();

    const location = res.headers.get('location');
    expect(location).toContain('/error');
    expect(location).not.toContain('type=');
  });

  it('redirects to /error when type is missing', async () => {
    const req = buildRequest('http://localhost:3000/auth/confirm?token_hash=abc123&next=/dashboard');
    const res = await GET(req);

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();

    const location = res.headers.get('location');
    expect(location).toContain('/error');
    expect(location).not.toContain('token_hash');
  });
});
