const mockRedirect = jest.fn();
const mockNext = jest.fn();
const mockNextRedirect = jest.fn();
const mockCreateServerClient = jest.fn();
const mockCreateServerSideClient = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    next: (...args: unknown[]) => mockNext(...args),
    redirect: (...args: unknown[]) => mockNextRedirect(...args),
  },
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: (...args: unknown[]) => mockCreateServerSideClient(...args),
}));

import { getOpenApiDocument } from '@/lib/api/openapi';
import { updateSession } from '@/utils/supabase/middleware';
import Home from '@/app/page';

describe('misc server utilities coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNext.mockImplementation(({ request }: { request: unknown }) => ({
      type: 'next',
      request,
      cookies: {
        set: jest.fn(),
      },
    }));
    mockNextRedirect.mockImplementation((url: unknown) => ({ type: 'redirect', url }));
  });

  test('getOpenApiDocument builds default and custom server URLs', () => {
    const docDefault = getOpenApiDocument();
    const docCustom = getOpenApiDocument('https://example.test');

    expect(docDefault.servers[0].url).toBe('http://localhost:3000');
    expect(docCustom.servers[0].url).toBe('https://example.test');
    expect(docCustom.paths['/api/ai/summary']).toBeDefined();
    expect(docCustom.paths['/api/generate-csv']).toBeDefined();
    expect(docCustom.components.schemas.SummaryRequest).toBeDefined();
  });

  test('Home redirects to login when no user', async () => {
    mockCreateServerSideClient.mockResolvedValue({
      auth: {
        getUser: jest.fn(async () => ({ data: { user: null }, error: { message: 'no user' } })),
      },
    });

    await Home();

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  test('Home redirects to dashboard when user exists', async () => {
    mockCreateServerSideClient.mockResolvedValue({
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
      },
    });

    await Home();

    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  test('updateSession returns redirect when unauthenticated on protected route', async () => {
    mockCreateServerClient.mockImplementation((_url: string, _anon: string, options: any) => {
      // exercise cookie set logic branch
      options.cookies.setAll([{ name: 'sb-test', value: 'abc' }]);
      return {
        auth: {
          getUser: jest.fn(async () => ({ data: { user: null } })),
        },
      };
    });

    const request = {
      cookies: {
        getAll: jest.fn(() => []),
        set: jest.fn(),
      },
      nextUrl: {
        pathname: '/dashboard',
        clone: jest.fn(() => ({ pathname: '/dashboard' })),
      },
    } as any;

    const res = await updateSession(request);

    expect(request.nextUrl.clone).toHaveBeenCalled();
    expect(mockNextRedirect).toHaveBeenCalled();
    expect(res.type).toBe('redirect');
  });

  test('updateSession returns next response for authenticated user', async () => {
    mockCreateServerClient.mockImplementation((_url: string, _anon: string, options: any) => {
      options.cookies.setAll([{ name: 'sb-test', value: 'xyz' }]);
      return {
        auth: {
          getUser: jest.fn(async () => ({ data: { user: { id: 'u1' } } })),
        },
      };
    });

    const request = {
      cookies: {
        getAll: jest.fn(() => []),
        set: jest.fn(),
      },
      nextUrl: {
        pathname: '/dashboard',
        clone: jest.fn(() => ({ pathname: '/dashboard' })),
      },
    } as any;

    const res = await updateSession(request);

    expect(mockNext).toHaveBeenCalled();
    expect(request.cookies.set).toHaveBeenCalledWith('sb-test', 'xyz');
    expect(res.type).toBe('next');
  });
});
