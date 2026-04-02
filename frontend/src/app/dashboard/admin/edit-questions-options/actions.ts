'use server';

import { getLatestMCQs } from '@/utils/get-epa-data';
import { createClient } from '@/utils/supabase/server';
import type { MCQ } from '@/utils/types';

/**
 * Fetches the display name and email of a user by their Supabase ID.
 * Used to show who last updated an MCQ question or option.
 * @param {string} id - Supabase user ID of the updater.
 * @returns The user's id, display_name, and email, or null values if not found.
 */
export async function getUpdaterDetails(
  id: string
): Promise<{ id: string; display_name: string | null; email: string } | null> {
  const supabase = await createClient();

  const { data: profileData, error: fetchProfileError } = await supabase
    .schema('public')
    .from('profiles')
    .select('display_name')
    .eq('id', id)
    .single();

  if (fetchProfileError) console.error('Error fetching updater details:', fetchProfileError);

  const { data: emailData, error: fetchEmailError } = await supabase
    .schema('public')
    .rpc('get_email_by_user_id', { user_id: id });

  if (fetchEmailError) console.error('Error fetching updater email:', fetchEmailError);

  if (!emailData || emailData.length === 0) console.error('No email data found for updater ID:', id);

  return {
    id,
    display_name: profileData?.display_name ?? null,
    email: emailData ?? null,
  };
}

/**
 * Updates the text of an MCQ option across all questions that use it.
 * Inserts a new version of the MCQ dataset into `mcqs_options`.
 * @param {string} key - The option key to update (e.g. 'optionA').
 * @param {string} newText - The new text for the option.
 */
export async function submitNewOption(key: string, newText: string) {
  const supabase = await createClient();

  const mcqs = await getLatestMCQs();

  if (!mcqs) {
    console.error('No MCQs found');
    return;
  }

  const newMCQs = mcqs.map((mcq) => {
    if (mcq.options[key]) mcq.options[key] = newText;
    return mcq;
  });

  const { error } = await supabase.schema('public').from('mcqs_options').insert({ data: newMCQs });

  if (error) console.error('Error updating MCQ option:', error);
}

/**
 * Updates the question text of a specific MCQ.
 * Inserts a new version of the MCQ dataset into `mcqs_options`.
 * @param {MCQ} mcq - The MCQ object whose question text should be updated.
 * @param {string} newText - The new question text.
 */
export async function submitNewQuestion(mcq: MCQ, newText: string) {
  const supabase = await createClient();

  const mcqs = await getLatestMCQs();

  if (!mcqs) {
    console.error('No MCQs found');
    return;
  }

  const newMCQs = mcqs.map((m) => {
    if (m.question === mcq.question) m.question = newText;
    return m;
  });

  const { error } = await supabase.schema('public').from('mcqs_options').insert({ data: newMCQs });

  if (error) console.error('Error updating MCQ question:', error);
}
