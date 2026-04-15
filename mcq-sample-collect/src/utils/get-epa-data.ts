'use server';

import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { createClient } from './supabase/server';
import { MCQ, type EPAKFDesc } from './types';
import { Tables } from './supabase/database.types';

function logFetchError(label: string, message: string): undefined {
  console.error(`Failed to fetch ${label}:`, message);
  return undefined;
}

function logMissingData(label: string): undefined {
  console.error(`Failed to fetch ${label}: No data`);
  return undefined;
}

function unwrapResponse<T>(response: PostgrestSingleResponse<T>, label: string): T | undefined;
function unwrapResponse<T>(response: PostgrestResponse<T>, label: string): T[] | undefined;
function unwrapResponse<T>(
  response: PostgrestSingleResponse<T> | PostgrestResponse<T>,
  label: string,
): T | T[] | undefined {
  if (response.error) {
    return logFetchError(label, response.error.message);
  }

  if (!response.data) {
    return logMissingData(label);
  }

  return response.data;
}

export async function getEPAKFDescs(): Promise<EPAKFDesc | undefined> {
  const supabase = await createClient();
  const response = (await supabase
    .schema('public')
    .from('epa_kf_descriptions')
    .select('epa_descriptions, kf_descriptions')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()) satisfies PostgrestSingleResponse<Tables<'epa_kf_descriptions'>>;

  const data = unwrapResponse(response, 'EPA and KF descriptions');
  if (!data) return undefined;

  return {
    epa_desc: data.epa_descriptions,
    kf_desc: data.kf_descriptions,
  } as EPAKFDesc;
}

export async function getKFSampleCounts(): Promise<{ kf: string; count: number }[] | undefined> {
  const supabase = await createClient();

  const response = (await supabase
    .schema('trainingdata')
    .from('mcq_table_row_counts')
    .select('table_name, row_count'));

  const data = unwrapResponse(response, 'KF sample counts');
  if (!data) return undefined;

  return data.map(({ table_name, row_count }) => ({
    kf: table_name,
    count: row_count,
  }));
}

export async function getLatestMCQs(): Promise<MCQ[] | undefined> {
  const supabase = await createClient();

  const response = (await supabase
    .schema('public')
    .from('mcqs_options')
    .select('data')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()) satisfies PostgrestSingleResponse<Tables<'mcqs_options'>>;

  const data = unwrapResponse(response, 'MCQs');
  if (!data) return undefined;

  return data.data as MCQ[];
}

export async function getHistoricalMCQs(): Promise<Tables<'mcqs_options'>[] | undefined> {
  const supabase = await createClient();

  const response = (await supabase
    .schema('public')
    .from('mcqs_options')
    .select()
    .order('updated_at', { ascending: false })) satisfies PostgrestResponse<Tables<'mcqs_options'>>;

  const data = unwrapResponse(response, 'MCQs');
  if (!data) return undefined;

  return data as Tables<'mcqs_options'>[];
}
