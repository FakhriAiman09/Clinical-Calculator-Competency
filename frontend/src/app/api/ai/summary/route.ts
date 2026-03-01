import { NextResponse } from 'next/server';

// Keep this in sync with FREE_AI_MODELS in src/utils/ai-models.ts
const VALID_MODELS = new Set([
  'z-ai/glm-4.5-air:free',
  'stepfun/step-3.5-flash:free',
]);
const DEFAULT_MODEL  = 'z-ai/glm-4.5-air:free';
// Automatic fallback: OpenRouter picks whichever free model is available
const FALLBACK_MODEL = 'openrouter/free';

async function callOpenRouter(apiKey: string, model: string, system: string, userContent: string) {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title':      process.env.OPENROUTER_SITE_NAME || 'CCC-Rater',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: userContent },
      ],
    }),
  });
}

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

    // Use requested model only if it is in the valid list, else fall back to default
    const requestedModel = VALID_MODELS.has(body?.model) ? body.model : DEFAULT_MODEL;

    const system = [
      'You are a clinical evaluation summarizer.',
      'You will be given comments written by a rater evaluating a medical student or clinician.',
      'If the input is not clinical evaluation content, respond with only: "Not clinical evaluation content."',
      'If the input is clinical evaluation content, write a concise summary in 2-4 plain sentences.',
      'Do not use bullet points, numbered lists, bold, asterisks, brackets, parentheses, or any markdown formatting.',
      'Do not add any introduction, explanation, or preamble. Output only the summary sentences or the not-clinical message.',
      'Do not invent facts. Only summarize what is explicitly stated.',
    ].join(' ');

    const userContent = `Summarize these rater comments:\n\n${text}`;

    console.log('[AI Summary] Using model:', requestedModel);
    let resp = await callOpenRouter(apiKey, requestedModel, system, userContent);
    let rawText = await resp.text();
    console.log('[AI Summary] Status:', resp.status, '| Response:', rawText.slice(0, 300));

    // If the chosen model has no endpoints, transparently retry with openrouter/free
    if (!resp.ok) {
      try {
        const errBody = JSON.parse(rawText);
        const errMsg: string = errBody?.error?.message ?? '';
        const errCode: string = errBody?.error?.code ?? errBody?.error?.type ?? '';
        if (errMsg.toLowerCase().includes('no endpoints') || errCode === 'model_not_found') {
          console.warn('[AI Summary] Model unavailable, retrying with fallback:', FALLBACK_MODEL);
          resp    = await callOpenRouter(apiKey, FALLBACK_MODEL, system, userContent);
          rawText = await resp.text();
          console.log('[AI Summary] Fallback status:', resp.status, '| Response:', rawText.slice(0, 300));
        }
      } catch { /* not JSON, continue to normal error handling */ }
    }

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
        else if (code === 'model_not_found')     message = 'Selected model unavailable. Try switching in Settings.';
        else if (err?.error?.message)            message = err.error.message;
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