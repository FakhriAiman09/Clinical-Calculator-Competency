'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

/**
 * Hook that manages the authenticated user's preferred AI model selection.
 * Usage analytics are tracked in `ai_request_logs` and fetched from API routes.
 */
export function useAIPreferences(userId: string | undefined) {
  const [model, setModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setModel('');
      setIsLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('ai_model')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setModel(data.ai_model ?? '');
      }

      setIsLoading(false);
    })();
  }, [userId]);

  const saveModel = useCallback(async (newModel: string) => {
    if (!userId) return;

    setModel(newModel);

    await supabase
      .from('user_preferences')
      .upsert({ id: userId, ai_model: newModel }, { onConflict: 'id' });
  }, [userId]);

  return { model, isLoading, saveModel };
}
