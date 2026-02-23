import { NextResponse } from 'next/server';

const VALID_MODELS = new Set([
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-235b-a22b:free',
]);
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = body?.text;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'missing_text', message: 'Missing text' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[AI Summary] OPENROUTER_API_KEY is not set');
      return NextResponse.json({ error: 'missing_key', message: 'API key not configured.' }, { status: 500 });
    }

    // Use requested model only if it's in our valid list, else fall back to default
    const model = VALID_MODELS.has(body?.model) ? body.model : DEFAULT_MODEL;
    console.log('[AI Summary] Using model:', model);

    const system = [
      'You summarize clinical evaluation comments written by raters.',
      'Be concise and professional.',
      'Do not invent facts. If unclear, say "Unclear".',
      'Return 3–6 bullet points.',
    ].join(' ');

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
          { role: 'user', content: `Summarize the following rater comments into 3–6 concise bullet points.\n\nCOMMENTS:\n${text}` },
        ],
      }),
    });

    const rawText = await resp.text();
    console.log('[AI Summary] Status:', resp.status, '| Response:', rawText.slice(0, 300));

    if (resp.status === 429) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Daily request limit reached. Resets at midnight UTC.' },
        { status: 429 }
      );
    }

    if (!resp.ok) {
      let message = `AI service error (${resp.status}). Please try again.`;
      try {
        const err = JSON.parse(rawText);
        const code = err?.error?.code ?? err?.error?.type ?? '';
        if (code === 'context_length_exceeded') message = 'Text is too long for this model. Try a shorter selection.';
        else if (code === 'model_not_found') message = 'Selected model unavailable. Try switching in Settings.';
        else if (err?.error?.message) message = err.error.message;
      } catch { /* not JSON */ }
      return NextResponse.json({ error: 'openrouter_error', message }, { status: resp.status });
    }

    const data = JSON.parse(rawText);
    const summary = (data?.choices?.[0]?.message?.content ?? '').trim();

    if (!summary) {
      return NextResponse.json({ error: 'empty_response', message: 'AI returned empty response. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ summary });

  } catch (e: any) {
    console.error('[AI Summary] Unexpected error:', e);
    return NextResponse.json({ error: 'server_error', message: e?.message || 'Unexpected error.' }, { status: 500 });
  }
}