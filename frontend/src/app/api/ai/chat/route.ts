import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  callOpenRouterChat,
  estimateCostUsd,
  fetchOpenRouterModels,
  OpenRouterChatMessage,
  pickDefaultModelId,
} from '@/lib/openrouter';

type ChatRequestBody = {
  model?: string;
  messages?: OpenRouterChatMessage[];
  temperature?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'missing_messages', message: 'At least one chat message is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'missing_key', message: 'OPENROUTER_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'You must be signed in to send AI chat requests.' },
        { status: 401 }
      );
    }

    const [models, preference] = await Promise.all([
      fetchOpenRouterModels(apiKey),
      supabase.from('user_preferences').select('ai_model').eq('id', user.id).single(),
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

    const model = models.find((item) => item.id === selectedModelId) ?? null;
    const result = await callOpenRouterChat({
      apiKey,
      model: selectedModelId,
      messages,
      temperature: body.temperature,
    });

    const messageContent = result.payload?.choices?.[0]?.message?.content ?? '';
    const errorCode =
      typeof result.payload?.error?.code === 'string'
        ? result.payload.error.code
        : typeof result.payload?.error?.type === 'string'
        ? result.payload.error.type
        : null;

    const estimatedCostUsd = model ? estimateCostUsd(result.usage, model.pricing) : null;

    await supabase.from('ai_request_logs').insert({
      user_id: user.id,
      request_kind: 'chat',
      request_path: '/api/ai/chat',
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
        messageCount: messages.length,
        selectedModelId,
        rateLimitHeaders: result.rateLimits.raw,
      },
    });

    if (!result.response.ok) {
      return NextResponse.json(
        {
          error: 'openrouter_error',
          message:
            typeof result.payload?.error?.message === 'string'
              ? result.payload.error.message
              : `OpenRouter request failed with status ${result.response.status}.`,
          rateLimits: result.rateLimits,
        },
        { status: result.response.status }
      );
    }

    return NextResponse.json({
      modelId: selectedModelId,
      output: messageContent,
      usage: result.usage,
      latencyMs: result.latencyMs,
      estimatedCostUsd,
      rateLimits: result.rateLimits,
      provider: 'openrouter',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'The OpenRouter request timed out.'
        : error instanceof Error
        ? error.message
        : 'Unexpected error while sending chat request.';

    return NextResponse.json(
      { error: 'chat_request_failed', message },
      { status: 500 }
    );
  }
}
