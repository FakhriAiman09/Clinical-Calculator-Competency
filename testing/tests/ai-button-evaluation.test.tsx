import { describe, expect, test } from '@jest/globals';
import {
  canGenerateSummary,
  insertSummary,
  replaceWithSummary,
  shouldShowSummaryActions,
} from '../../frontend/src/utils/evaluation-ai';

// This file unit-tests AI evaluation helper logic (no UI rendering).

describe('AI evaluation unit tests', () => {
  // Ensures summary generation is blocked for empty comment input.
  test('canGenerateSummary returns false for empty text', () => {
    expect(canGenerateSummary('   ')).toBe(false);
  });

  // Ensures summary generation is allowed for non-empty comment input.
  test('canGenerateSummary returns true for valid text', () => {
    expect(canGenerateSummary('Student showed good progress')).toBe(true);
  });

  // Ensures Insert keeps original text and appends summary.
  test('insertSummary appends summary after original text', () => {
    expect(insertSummary('Original note', 'AI summary')).toBe('Original note\nAI summary');
  });

  // Ensures Insert ignores empty summary values.
  test('insertSummary keeps original when summary is empty', () => {
    expect(insertSummary('Original note', '   ')).toBe('Original note');
  });

  // Ensures Replace returns only summary content.
  test('replaceWithSummary returns trimmed summary', () => {
    expect(replaceWithSummary('  AI rewritten note  ')).toBe('AI rewritten note');
  });

  // Ensures summary action buttons are shown only when summary exists.
  test('shouldShowSummaryActions matches summary presence', () => {
    expect(shouldShowSummaryActions('AI summary')).toBe(true);
    expect(shouldShowSummaryActions('')).toBe(false);
  });
});
