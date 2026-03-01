'use server';

import { createClient } from '@/utils/supabase/server';

export async function submitSample(tablename: string, payload: object) {
  const supabase = await createClient({ db: { schema: 'trainingdata' } });

  const { error } = await supabase.from(tablename).insert(payload);

  if (error) {
    console.log(error);
    return false;
  }

  return true;
}
