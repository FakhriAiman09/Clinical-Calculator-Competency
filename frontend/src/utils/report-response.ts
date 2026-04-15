import type { EPAKFDesc } from './types';

export interface KeyFunctionResponse {
  text?: string[];
  [key: string]: boolean | string[] | undefined;
}

export interface EPAResponse {
  [kfId: string]: KeyFunctionResponse;
}

export interface FullResponseStructure {
  response?: {
    [epaId: string]: EPAResponse;
  };
}

export interface FormResponsesInner {
  response?: FullResponseStructure;
  form_requests: {
    student_id: string;
    clinical_settings?: string;
  };
}

export interface SupabaseRow {
  response_id: string;
  created_at: string;
  results: Record<string, number>;
  form_responses: FormResponsesInner;
}

export function extractCommentTextsForEpa(formResponse: FormResponsesInner, epaKey: string): string[] {
  const commentBlock = formResponse.response?.response?.[epaKey];
  if (!commentBlock) return [];

  const comments: string[] = [];
  for (const kfObj of Object.values(commentBlock)) {
    if (!kfObj || typeof kfObj !== 'object' || !('text' in kfObj)) continue;

    const texts = kfObj.text;
    if (!Array.isArray(texts)) continue;

    for (const text of texts) {
      if (typeof text === 'string' && text.trim() !== '') {
        comments.push(text);
      }
    }
  }

  return comments;
}

export function collectCommentsPerEpa(
  resultData: SupabaseRow[] | null,
  selectedStudentId: string,
  reportCreatedAt: Date,
  epaIds: number[],
): Record<number, string[]> {
  const perEPAComments: Record<number, string[]> = {};

  for (const epaId of epaIds) {
    perEPAComments[epaId] = [];
  }

  for (const row of resultData ?? []) {
    if (new Date(row.created_at) > reportCreatedAt) continue;

    const formResponse = row.form_responses;
    if (formResponse?.form_requests?.student_id !== selectedStudentId) continue;

    for (const epaId of epaIds) {
      perEPAComments[epaId].push(...extractCommentTextsForEpa(formResponse, String(epaId)));
    }
  }

  return perEPAComments;
}

export function groupKfDescriptions(
  kfDescriptions: EPAKFDesc['kf_desc'] | undefined,
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  if (!kfDescriptions) return grouped;

  for (const [key, value] of Object.entries(kfDescriptions)) {
    const [epaIdRaw] = key.split('-');
    const epaId = String(Number.parseInt(epaIdRaw, 10));
    if (!grouped[epaId]) grouped[epaId] = [];
    grouped[epaId].push(value);
  }

  return grouped;
}