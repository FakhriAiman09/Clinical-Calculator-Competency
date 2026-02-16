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

    const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

    const system = [
      'You summarize clinical evaluation comments written by raters.',
      'Be concise and professional.',
      'Do not invent facts. If unclear, say "Unclear".',
      'Return 3–6 bullet points.',
    ].join(' ');

    const user = `Summarize the following rater comments into 3–6 concise bullet points.

COMMENTS:
${text}`;

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

    if (!resp.ok) {
      const errText = await resp.text();
      return new NextResponse(`OpenRouter error: ${errText}`, { status: resp.status });
    }

    const data = await resp.json();
    const summary = (data?.choices?.[0]?.message?.content ?? '').trim();

    return NextResponse.json({ summary });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Server error', { status: 500 });
  }
}
