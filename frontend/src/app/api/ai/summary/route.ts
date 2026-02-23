import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = body?.text;

    if (!text || typeof text !== 'string') {
      return new NextResponse('Missing text', { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new NextResponse('Missing OPENROUTER_API_KEY', { status: 500 });
    }

    // Accept model override from request body (user preference), then env var, then default free model
    const model =
      (typeof body?.model === 'string' && body.model.endsWith(':free') ? body.model : null) ??
      process.env.OPENROUTER_MODEL ??
      'qwen/qwen3-8b:free';

    const system = [
      'You summarize clinical evaluation comments written by raters.',
      'Be concise and professional.',
      'Do not invent facts. If unclear, say "Unclear".',
      'Return 3–6 bullet points.',
    ].join(' ');

    const user = `Summarize the following rater comments into 3–6 concise bullet points.\n\nCOMMENTS:\n${text}`;

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_SITE_NAME || 'CCC-Rater',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    // ── Rate limit hit ────────────────────────────────────────────────────────
    if (resp.status === 429) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message:
            'Daily request limit reached for free AI models. The limit resets at midnight UTC. ' +
            'Adding credits (≥$10) to your OpenRouter account raises the limit to 1,000 requests/day.',
        },
        { status: 429 }
      );
    }

    // ── Other non-OK responses ────────────────────────────────────────────────
    if (!resp.ok) {
      const errText = await resp.text();
      let friendlyMessage = 'The AI service returned an error. Please try again shortly.';

      // Parse OpenRouter error body if possible
      try {
        const errJson = JSON.parse(errText);
        const code = errJson?.error?.code ?? errJson?.error?.type ?? '';
        if (code === 'context_length_exceeded') {
          friendlyMessage = 'The text is too long for this model. Try a shorter selection.';
        } else if (code === 'model_not_found') {
          friendlyMessage = 'The selected AI model is currently unavailable. Try switching models in Settings.';
        }
      } catch {
        // not JSON — use generic message
      }

      return NextResponse.json(
        { error: 'openrouter_error', message: friendlyMessage },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    const summary = (data?.choices?.[0]?.message?.content ?? '').trim();

    if (!summary) {
      return NextResponse.json(
        { error: 'empty_response', message: 'The AI returned an empty response. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ summary });

  } catch (e: any) {
    return NextResponse.json(
      { error: 'server_error', message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}