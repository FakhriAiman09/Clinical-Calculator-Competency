'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { DEFAULT_MODEL_ID, FREE_AI_MODELS } from '@/utils/ai-models';

const supabase = createClient();
export const FREE_LIMIT = 50;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useAIPreferences(userId: string | undefined) {
  const [model, setModel]           = useState<string>(DEFAULT_MODEL_ID);
  const [usageCount, setUsageCount] = useState<number>(0);
  const [usageDate, setUsageDate]   = useState<string>(todayUTC());
  const [isLoading, setIsLoading]   = useState(true);

  // If stored date isn't today, treat count as 0 (daily reset)
  const effectiveCount = usageDate === todayUTC() ? usageCount : 0;
  const remaining      = Math.max(0, FREE_LIMIT - effectiveCount);

  // ── Load from user_preferences ────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }

    (async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('ai_model, ai_usage_count, ai_usage_date')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setModel(
          data.ai_model && FREE_AI_MODELS.some((m) => m.id === data.ai_model)
            ? data.ai_model
            : DEFAULT_MODEL_ID
        );
        setUsageCount(data.ai_usage_count ?? 0);
        setUsageDate(data.ai_usage_date ?? todayUTC());
      }
      setIsLoading(false);
    })();
  }, [userId]);

  // ── Save preferred model ──────────────────────────────────────────────────
  const saveModel = useCallback(async (newModel: string) => {
    if (!userId) return;
    setModel(newModel);
    await supabase
      .from('user_preferences')
      .upsert({ id: userId, ai_model: newModel }, { onConflict: 'id' });
  }, [userId]);

  // ── Increment usage after a successful AI request ─────────────────────────
  const incrementUsage = useCallback(async () => {
    if (!userId) return;

    const today    = todayUTC();
    const isNewDay = usageDate !== today;
    const newCount = isNewDay ? 1 : effectiveCount + 1;

    setUsageCount(newCount);
    setUsageDate(today);

    await supabase
      .from('user_preferences')
      .upsert(
        { id: userId, ai_usage_count: newCount, ai_usage_date: today },
        { onConflict: 'id' }
      );
  }, [userId, effectiveCount, usageDate]);

  return { model, usageCount: effectiveCount, remaining, isLoading, saveModel, incrementUsage };
}