import { NextResponse } from 'next/server';

// Keep this in sync with FREE_AI_MODELS in src/utils/ai-models.ts
const VALID_MODELS = new Set([
  'z-ai/glm-4.5-air:free',
  'stepfun/step-3.5-flash:free',
]);
const DEFAULT_MODEL  = 'z-ai/glm-4.5-air:free';

const KF_HINTS: Record<string, string> = {
  '1.1': 'history taking, organized',
  '1.2': 'patient-centered interview',
  '1.3': 'clinical reasoning, focused info gathering',
  '1.4': 'physical exam, clinical relevance',
  '2.1': 'differential diagnosis, synthesizing findings',
  '2.2': 'updating diagnosis, managing ambiguity',
  '2.3': 'team communication, working diagnosis',
  '3.1': 'diagnostic tests, screening, cost-effective',
  '3.2': 'test rationale, pre/post-test probability',
  '3.3': 'interpreting results, urgency',
  '4.1': 'composing orders, verbal/written/electronic',
  '4.2': 'orders underpinned by patient understanding',
  '4.3': 'error recognition, patient safety alerts',
  '4.4': 'discussing orders with team and patient',
  '5.1': 'clinical documentation, cogent narrative',
  '5.2': 'documentation requirements, regulations',
  '5.3': 'problem list, differential, clinical reasoning',
  '6.1': 'oral presentation, verified information',
  '6.2': 'concise organized oral presentation',
  '6.3': 'adapting presentation to audience',
  '6.4': 'patient privacy, autonomy',
  '7.1': 'clinical question formulation, EBM',
  '7.2': 'medical information technology, evidence access',
  '7.3': 'appraising evidence, sources',
  '7.4': 'applying evidence, communicating findings',
  '8.1': 'learner use of electronic handover tools, structured verbal handover',
  '8.2': 'handover communication, transition of care',
  '8.3': 'handover, illness severity, situational awareness',
  '8.4': 'handover feedback, closed-loop communication',
  '8.5': 'patient confidentiality, handover',
  '9.1': 'team roles, seeking help, healthcare delivery',
  '9.2': 'team communication, attentive listening',
  '9.3': 'mutual respect, team climate, integrity',
  '10.1': 'vital signs, patient deterioration, etiology',
  '10.2': 'illness severity, escalating care',
  '10.3': 'code response, basic/advanced life support',
  '10.4': 'deterioration communication, goals of care',
  '11.1': 'informed consent, risks, benefits, alternatives',
  '11.2': 'patient/family communication, intervention understanding',
  '11.3': 'patient reassurance, confidence, seeking help',
  '12.1': 'procedural technical skills',
  '12.2': 'procedure anatomy, indications, complications',
  '12.3': 'pre/post-procedural patient communication',
  '12.4': 'patient confidence, procedural ease',
  '13.1': 'error reporting, near miss, safety systems',
  '13.2': 'system improvement, quality improvement',
  '13.3': 'daily safety habits, documentation, precautions',
  '13.4': 'error reflection, individual improvement plan',
  'professionalism': 'professional behavior, ethics, conduct',
};
const FALLBACK_MODEL = 'openrouter/free';

async function callOpenRouter(apiKey: string, model: string, system: string, userContent: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tryFallbackOnUnavailable(
  apiKey: string,
  system: string,
  userContent: string,
  resp: Response,
  rawText: string,
): Promise<{ resp: Response; rawText: string }> {
  if (resp.ok) return { resp, rawText };
  try {
    const errBody = JSON.parse(rawText);
    const errMsg: string = errBody?.error?.message ?? '';
    const errCode: string = errBody?.error?.code ?? errBody?.error?.type ?? '';
    if (errMsg.toLowerCase().includes('no endpoints') || errCode === 'model_not_found') {
      console.warn('[AI Summary] Model unavailable, retrying with fallback:', FALLBACK_MODEL);
      const fallbackResp = await callOpenRouter(apiKey, FALLBACK_MODEL, system, userContent);
      const fallbackText = await fallbackResp.text();
      console.log('[AI Summary] Fallback status:', fallbackResp.status, '| Response:', fallbackText.slice(0, 300));
      return { resp: fallbackResp, rawText: fallbackText };
    }
  } catch {}
  return { resp, rawText };
}

function buildErrorMessage(rawText: string, status: number): string {
  const base = `AI service error (${status}). Please try again.`;
  try {
    const err = JSON.parse(rawText);
    const code = err?.error?.code ?? err?.error?.type ?? '';
    if (code === 'context_length_exceeded') return 'Text is too long for this model. Try a shorter selection.';
    if (code === 'model_not_found') return 'Selected model unavailable. Try switching in Settings.';
    if (err?.error?.message) return err.error.message as string;
  } catch {}
  return base;
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

    const requestedModel = VALID_MODELS.has(body?.model) ? body.model : DEFAULT_MODEL;

    const kf: string | null = body?.kf ?? null;
    const hint = kf ? KF_HINTS[kf] : null;
    const selectedOptions: string[] = Array.isArray(body?.selectedOptions) ? body.selectedOptions : [];

    const optionsContext = selectedOptions.length > 0
      ? ` The rater selected these checkbox options for this question: ${selectedOptions.map((o) => `"${o}"`).join(', ')}.`
      : '';

    const checkboxNote = selectedOptions.length > 0
      ? ` If the text matches, paraphrases, or is derived from the selected checkbox options, always treat it as valid clinical evaluation content and rewrite it — never flag it as unrelated or non-clinical.`
      : '';

    const system = hint
      ? `Medical learner rater comment. KF ${kf}: ${hint}.${optionsContext}${checkboxNote} Grammatical errors, shorthand, and sentence fragments still count if the meaning is clear and they describe learner performance. Return exactly one: plain sentences rewriting only for clarity and clinical wording, with no new facts; "Not clinical evaluation content."; "Not related to ${hint}."; or "Unclear source text." Use KF only for relevance. Use "Unclear source text." only if the meaning cannot be understood well enough to rewrite. If unsure, do not guess.`
      : `Medical learner rater comment.${optionsContext}${checkboxNote} Grammatical errors, shorthand, and sentence fragments still count if the meaning is clear and they describe learner performance. Return exactly one: plain sentences rewriting only for clarity and clinical wording, with no new facts; "Not clinical evaluation content."; or "Unclear source text." Use "Unclear source text." only if the meaning cannot be understood well enough to rewrite. If unsure, do not guess.`;

    const userContent = text;

    console.log('[AI Summary] Using model:', requestedModel);
    let resp = await callOpenRouter(apiKey, requestedModel, system, userContent);
    let rawText = await resp.text();
    console.log('[AI Summary] Status:', resp.status, '| Response:', rawText.slice(0, 300));

    ({ resp, rawText } = await tryFallbackOnUnavailable(apiKey, system, userContent, resp, rawText));

    if (resp.status === 429) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Daily request limit reached. Resets at midnight UTC.' },
        { status: 429 }
      );
    }

    if (!resp.ok) {
      return NextResponse.json(
        { error: 'openrouter_error', message: buildErrorMessage(rawText, resp.status) },
        { status: resp.status }
      );
    }

    const data = JSON.parse(rawText);
    const summary = (data?.choices?.[0]?.message?.content ?? '').trim();

    if (!summary) {
      return NextResponse.json({ error: 'empty_response', message: 'AI returned empty response. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ summary });

  } catch (e: any) {
    if (e?.name === 'AbortError') {
      console.error('[AI Summary] Request timed out after 30s');
      return NextResponse.json({ error: 'timeout', message: 'AI service took too long to respond. Please try again.' }, { status: 504 });
    }
    console.error('[AI Summary] Unexpected error:', e);
    return NextResponse.json({ error: 'server_error', message: e?.message || 'Unexpected error.' }, { status: 500 });
  }
}
