export function canGenerateSummary(commentText: string): boolean {
  return commentText.trim().length > 0;
}

export function insertSummary(original: string, summary: string): string {
  const trimmedSummary = summary.trim();
  if (!trimmedSummary) return original;
  if (!original) return trimmedSummary;
  return `${original}\n${trimmedSummary}`;
}

export function replaceWithSummary(summary: string): string {
  return summary.trim();
}

export function shouldShowSummaryActions(summary: string): boolean {
  return summary.trim().length > 0;
}
