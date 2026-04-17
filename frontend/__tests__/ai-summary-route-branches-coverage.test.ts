/** @jest-environment node */

import { POST } from '@/app/api/ai/summary/route';

type FetchResult = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

describe('ai summary route branch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_SITE_URL = 'http://localhost:3000';
    process.env.OPENROUTER_SITE_NAME = 'CCC-Rater';
  });

  it('returns rate limit response for 429', async () => {
    const fetchMock = jest.fn<Promise<FetchResult>, [RequestInfo | URL, RequestInit?]>().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: { message: 'too many requests' } }),
    });
    Object.defineProperty(global, 'fetch', { value: fetchMock, writable: true });

    const res = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'good clinical feedback' }),
      })
    );

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({ error: 'rate_limited' });
  });

  it('falls back when model is unavailable and returns fallback summary', async () => {
    const fetchMock = jest
      .fn<Promise<FetchResult>, [RequestInfo | URL, RequestInit?]>()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: { code: 'model_not_found', message: 'no endpoints available' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: 'Fallback summary text' } }] }),
      });

    Object.defineProperty(global, 'fetch', { value: fetchMock, writable: true });

    const res = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: 'student gave concise oral presentation',
          model: 'stepfun/step-3.5-flash:free',
          kf: '6.2',
          selectedOptions: ['organized oral presentation'],
        }),
      })
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(firstBody.messages[0].content).toContain('KF 6.2');
    expect(firstBody.messages[0].content).toContain('organized oral presentation');
    expect(secondBody.model).toBe('openrouter/free');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ summary: 'Fallback summary text' });
  });

  it('maps context length exceeded to friendly error', async () => {
    const fetchMock = jest.fn<Promise<FetchResult>, [RequestInfo | URL, RequestInit?]>().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { code: 'context_length_exceeded' } }),
    });
    Object.defineProperty(global, 'fetch', { value: fetchMock, writable: true });

    const res = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'x'.repeat(1000) }),
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: 'openrouter_error',
      message: 'Text is too long for this model. Try a shorter selection.',
    });
  });

  it('returns base error when openrouter error body is not valid json', async () => {
    const fetchMock = jest.fn<Promise<FetchResult>, [RequestInfo | URL, RequestInit?]>().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'gateway exploded',
    });
    Object.defineProperty(global, 'fetch', { value: fetchMock, writable: true });

    const res = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'normal text' }),
      })
    );

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: 'openrouter_error',
      message: 'AI service error (500). Please try again.',
    });
  });

  it('returns empty response error when model returns blank content', async () => {
    const fetchMock = jest.fn<Promise<FetchResult>, [RequestInfo | URL, RequestInit?]>().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: '   ' } }] }),
    });
    Object.defineProperty(global, 'fetch', { value: fetchMock, writable: true });

    const res = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'some text' }),
      })
    );

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({ error: 'empty_response' });
  });

  it('returns timeout when fetch aborts', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetchMock = jest.fn<Promise<FetchResult>, [RequestInfo | URL, RequestInit?]>().mockRejectedValue(abortError);
    Object.defineProperty(global, 'fetch', { value: fetchMock, writable: true });

    const res = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'some text' }),
      })
    );

    expect(res.status).toBe(504);
    await expect(res.json()).resolves.toMatchObject({ error: 'timeout' });
  });

  it('aborts via timeout callback and returns timeout response', async () => {
    const setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(((handler: TimerHandler) => {
        if (typeof handler === 'function') {
          handler();
        }
        return 1 as unknown as NodeJS.Timeout;
      }) as typeof setTimeout);

    const fetchMock = jest.fn((_: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;
      if (signal?.aborted) {
        return Promise.reject(Object.assign(new Error('aborted by timer'), { name: 'AbortError' }));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: 'unexpected pass' } }] }),
      });
    });

    Object.defineProperty(global, 'fetch', { value: fetchMock, writable: true });

    const res = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'simulate long request' }),
      })
    );

    expect(res.status).toBe(504);
    await expect(res.json()).resolves.toMatchObject({ error: 'timeout' });

    setTimeoutSpy.mockRestore();
  });

  it('returns model-not-found message when fallback model is also unavailable', async () => {
    const fetchMock = jest
      .fn<Promise<FetchResult>, [RequestInfo | URL, RequestInit?]>()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: { code: 'model_not_found', message: 'no endpoints' } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: { code: 'model_not_found' } }),
      });

    Object.defineProperty(global, 'fetch', { value: fetchMock, writable: true });

    const res = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'clinical comment text' }),
      })
    );

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: 'openrouter_error',
      message: 'Selected model unavailable. Try switching in Settings.',
    });
  });

  it('returns server_error for unexpected exceptions', async () => {
    Object.defineProperty(global, 'fetch', {
      value: jest.fn(),
      writable: true,
    });

    const badReq = {
      json: jest.fn().mockRejectedValue(new Error('bad json parse')),
    } as unknown as Request;

    const res = await POST(badReq);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: 'server_error',
      message: 'bad json parse',
    });
  });

  it('returns upstream error message when provided by openrouter', async () => {
    const fetchMock = jest.fn<Promise<FetchResult>, [RequestInfo | URL, RequestInit?]>().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { message: 'upstream validation failed' } }),
    });

    Object.defineProperty(global, 'fetch', { value: fetchMock, writable: true });

    const res = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'normal note' }),
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: 'openrouter_error',
      message: 'upstream validation failed',
    });
  });
});
