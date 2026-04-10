import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { fetchOpenRouterModels } from '@/lib/openrouter';

export async function GET() {
  try {
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

    const [models, preference] = await Promise.all([
      fetchOpenRouterModels(apiKey),
      user
        ? supabase.from('user_preferences').select('ai_model').eq('id', user.id).single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      selectedModelId: preference.data?.ai_model ?? null,
      models,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'models_fetch_failed',
        message: error instanceof Error ? error.message : 'Failed to fetch OpenRouter models.',
      },
      { status: 500 }
    );
  }
}
