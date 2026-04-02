'use server';

import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { createClient } from './supabase/server';
import { MCQ, type EPAKFDesc } from './types';
import { Tables } from './supabase/database.types';

/**
 * Fetches the latest EPA and Key Function descriptions from Supabase.
 * @returns An `EPAKFDesc` object with `epa_desc` and `kf_desc`, or undefined on error.
 */
export async function getEPAKFDescs(): Promise<EPAKFDesc | undefined> {
  const supabase = await createClient();
  const { data, error } = (await supabase
    .schema('public')
    .from('epa_kf_descriptions')
    .select('epa_descriptions, kf_descriptions')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()) satisfies PostgrestSingleResponse<Tables<'epa_kf_descriptions'>>;

  if (error) {
    console.error('Failed to fetch EPA and KF descriptions:', error.message);
    return undefined;
  }

  if (!data) {
    console.error('Failed to fetch EPA and KF descriptions: No data');
    return undefined;
  }

  return {
    epa_desc: data.epa_descriptions,
    kf_desc: data.kf_descriptions,
  } as EPAKFDesc;
}

/**
 * Fetches the most recent MCQ questions and options from Supabase.
 * @returns An array of `MCQ` objects, or undefined on error.
 */
export async function getLatestMCQs(): Promise<MCQ[] | undefined> {
  const supabase = await createClient();

  const { data, error } = (await supabase
    .schema('public')
    .from('mcqs_options')
    .select('data')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()) satisfies PostgrestSingleResponse<Tables<'mcqs_options'>>;

  if (error) {
    console.error('Failed to fetch MCQs:', error.message);
    return undefined;
  }

  if (!data) {
    console.error('Failed to fetch MCQs: No data');
    return undefined;
  }

  return data.data as MCQ[];
}
/**
 * Fetches the number of training samples available per Key Function from the training data schema.
 * @returns An array of `{ kf, count }` objects, or undefined on error.
 */
export async function getKFSampleCounts(): Promise<{ kf: string; count: number }[] | undefined> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .schema('trainingdata')
    .from('mcq_table_row_counts')
    .select('table_name, row_count');

  if (error) {
    console.error('Failed to fetch KF sample counts:', error.message);
    return undefined;
  }

  if (!data) {
    console.error('Failed to fetch KF sample counts: No data');
    return undefined;
  }

  return data.map(({ table_name, row_count }) => ({
    kf: table_name,
    count: row_count,
  }));
}
/**
 * Fetches all historical MCQ snapshots from Supabase, ordered by most recent first.
 * Used in the admin panel to review MCQ version history.
 * @returns An array of `mcqs_options` rows, or undefined on error.
 */
export async function getHistoricalMCQs(): Promise<Tables<'mcqs_options'>[] | undefined> {
  const supabase = await createClient();

  const { data, error } = (await supabase
    .schema('public')
    .from('mcqs_options')
    .select()
    .order('updated_at', { ascending: false })) satisfies PostgrestResponse<Tables<'mcqs_options'>>;

  if (error) {
    console.error('Failed to fetch MCQs:', error.message);
    return undefined;
  }

  if (!data) {
    console.error('Failed to fetch MCQs: No data');
    return undefined;
  }

  return data as Tables<'mcqs_options'>[];
}
