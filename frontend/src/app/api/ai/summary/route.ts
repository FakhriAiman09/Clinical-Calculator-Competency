import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  callOpenRouterChat,
  estimateCostUsd,
  fetchOpenRouterModels,
  pickDefaultModelId,
} from '@/lib/openrouter';

// KF hints for system prompt context, keyed by competency code (e.g. "1.1", "2.3", "professionalism")
// These are not shown to users, but help the AI understand the clinical competency context when provided.
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
  professionalism: 'professional behavior, ethics, conduct',
};

type SummaryBody = {
  text?: string;
  model?: string;
  kf?: string | null;
  selectedOptions?: string[];
};

function buildSystemPrompt(kf: string | null, selectedOptions: string[]) {
  const hint = kf ? KF_HINTS[kf] : null;
  const optionsContext =
    selectedOptions.length > 0
      ? ` The rater selected these checkbox options for this question: ${selectedOptions.map((item) => `"${item}"`).join(', ')}.`
      : '';

  const checkboxNote =
    selectedOptions.length > 0
      ? ' If the text matches, paraphrases, or is derived from the selected checkbox options, always treat it as valid clinical evaluation content and rewrite it, never flag it as unrelated or non-clinical.'
      : '';

  if (hint) {
    return `Medical learner rater comment. KF ${kf}: ${hint}.${optionsContext}${checkboxNote} Grammatical errors, shorthand, and sentence fragments still count if the meaning is clear and they describe learner performance. Return exactly one: plain sentences rewriting only for clarity and clinical wording, with no new facts; "Not clinical evaluation content."; "Not related to ${hint}."; or "Unclear source text." Use KF only for relevance. Use "Unclear source text." only if the meaning cannot be understood well enough to rewrite. If unsure, do not guess.`;
  }

  return `Medical learner rater comment.${optionsContext}${checkboxNote} Grammatical errors, shorthand, and sentence fragments still count if the meaning is clear and they describe learner performance. Return exactly one: plain sentences rewriting only for clarity and clinical wording, with no new facts; "Not clinical evaluation content."; or "Unclear source text." Use "Unclear source text." only if the meaning cannot be understood well enough to rewrite. If unsure, do not guess.`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SummaryBody;
    const text = body?.text;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'missing_text', message: 'Missing text' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'missing_key', message: 'API key not configured.' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [models, preference] = await Promise.all([
      fetchOpenRouterModels(apiKey),
      user ? supabase.from('user_preferences').select('ai_model').eq('id', user.id).single() : Promise.resolve({ data: null, error: null }),
    ]);

    const selectedModelId =
      (typeof body.model === 'string' && body.model) ||
      preference.data?.ai_model ||
      pickDefaultModelId(models);

    if (!selectedModelId) {
      return NextResponse.json(
        { error: 'no_models_available', message: 'No OpenRouter models are currently available.' },
        { status: 503 }
      );
    }

    const kf = typeof body.kf === 'string' ? body.kf : null;
    const selectedOptions = Array.isArray(body.selectedOptions) ? body.selectedOptions.map(String) : [];
    const systemPrompt = buildSystemPrompt(kf, selectedOptions);
    const model = models.find((item) => item.id === selectedModelId) ?? null;

    const result = await callOpenRouterChat({
      apiKey,
      model: selectedModelId,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
    });

    const summary = String(result.payload?.choices?.[0]?.message?.content ?? '').trim();
    const errorCode =
      typeof result.payload?.error?.code === 'string'
        ? result.payload.error.code
        : typeof result.payload?.error?.type === 'string'
        ? result.payload.error.type
        : null;
    const estimatedCostUsd = model ? estimateCostUsd(result.usage, model.pricing) : null;

    if (user) {
      await supabase.from('ai_request_logs').insert({
        user_id: user.id,
        request_kind: 'summary',
        request_path: '/api/ai/summary',
        provider: 'openrouter',
        model_id: selectedModelId,
        prompt_tokens: result.usage.promptTokens,
        completion_tokens: result.usage.completionTokens,
        total_tokens: result.usage.totalTokens,
        latency_ms: result.latencyMs,
        estimated_cost_usd: estimatedCostUsd,
        requests_limit: result.rateLimits.requestsLimit,
        requests_remaining: result.rateLimits.requestsRemaining,
        requests_reset_at: result.rateLimits.requestsResetAt,
        tokens_limit: result.rateLimits.tokensLimit,
        tokens_remaining: result.rateLimits.tokensRemaining,
        tokens_reset_at: result.rateLimits.tokensResetAt,
        status_code: result.response.status,
        error_code: errorCode,
        request_metadata: {
          kf,
          selectedOptions,
          textLength: text.length,
          rateLimitHeaders: result.rateLimits.raw,
        },
      });
    }

    if (result.response.status === 429) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: 'OpenRouter rate limited the request.',
          rateLimits: result.rateLimits,
        },
        { status: 429 }
      );
    }

    if (!result.response.ok) {
      const upstreamMessage =
        typeof result.payload?.error?.message === 'string'
          ? result.payload.error.message
          : `AI service error (${result.response.status}). Please try again.`;

      return NextResponse.json(
        { error: 'openrouter_error', message: upstreamMessage, rateLimits: result.rateLimits },
        { status: result.response.status }
      );
    }

    if (!summary) {
      return NextResponse.json(
        { error: 'empty_response', message: 'AI returned empty response. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      summary,
      modelId: selectedModelId,
      usage: result.usage,
      latencyMs: result.latencyMs,
      estimatedCostUsd,
      rateLimits: result.rateLimits,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'AI service took too long to respond. Please try again.'
        : error instanceof Error
        ? error.message
        : 'Unexpected error.';

    return NextResponse.json(
      { error: 'server_error', message },
      { status: 500 }
    );
  }
}
