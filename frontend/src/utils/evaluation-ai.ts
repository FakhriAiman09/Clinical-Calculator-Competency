/**
 * Returns true if the comment text is non-empty and eligible for AI summarization.
 * @param {string} commentText - The rater comment to check.
 */
export function canGenerateSummary(commentText: string): boolean {
  return commentText.trim().length > 0;
}

/**
 * Appends an AI summary to the existing comment text, separated by a newline.
 * Returns the summary alone if original is empty, or original unchanged if summary is empty.
 * @param {string} original - The existing comment text.
 * @param {string} summary - The AI-generated summary to append.
 */
export function insertSummary(original: string, summary: string): string {
  const trimmedSummary = summary.trim();
  if (!trimmedSummary) return original;
  if (!original) return trimmedSummary;
  return `${original}\n${trimmedSummary}`;
}

/**
 * Returns the trimmed AI summary, replacing whatever was in the field before.
 * @param {string} summary - The AI-generated summary.
 */
export function replaceWithSummary(summary: string): string {
  return summary.trim();
}

/**
 * Returns true if the summary is non-empty, used to conditionally render summary action buttons.
 * @param {string} summary - The current summary text in the field.
 */
export function shouldShowSummaryActions(summary: string): boolean {
  return summary.trim().length > 0;
}
