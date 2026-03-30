/** @jest-environment node */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { POST } from '../src/app/api/ai/summary/route';

// Tests for the AI summary API.
describe('Functional AI summary route tests', () => {
  // Reset mocks and test env values before each test.
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_SITE_URL = 'http://localhost:3000';
    process.env.OPENROUTER_SITE_NAME = 'CCC-Rater';
    process.env.OPENROUTER_API_KEY = 'openrouter-key';
    Object.defineProperty(global, 'fetch', {
      value: jest.fn(),
      writable: true,
    });
  });

  // Should return 400 if text is missing.
  test('returns 400 when text is missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'missing_text' });
  });

  // Should return 500 if API key is missing.
  test('returns 500 when API key is not configured', async () => {
    delete process.env.OPENROUTER_API_KEY;

    const response = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'The student communicated clearly with the patient.' }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: 'missing_key' });
  });

  // Should return summary text when request is valid.
  test('returns a summary for valid clinical evaluation text', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: 'The student communicated well and showed safe clinical judgment.' } }],
      }),
    });

    const response = await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'The student explained the diagnosis clearly and made safe treatment decisions.' }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: 'The student communicated well and showed safe clinical judgment.',
    });
  });

  // Should use default model when given model is invalid.
  test('uses the default model when the requested model is invalid', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: 'Summary text.' } }],
      }),
    });

    await POST(
      new Request('http://localhost/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'The student performed a focused history and exam.',
          model: 'invalid-model-id',
        }),
      })
    );

    const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    const requestBody = JSON.parse(fetchOptions.body as string);
    expect(requestBody.model).toBe('z-ai/glm-4.5-air:free');
  });
});
