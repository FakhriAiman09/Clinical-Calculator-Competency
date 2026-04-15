export const DEV_LEVEL_LABELS = ['Remedial', 'Early-Developing', 'Developing', 'Entrustable'] as const;

export const REPORT_TIME_WINDOWS = [3, 6, 12] as const;

export type ReportTimeWindow = (typeof REPORT_TIME_WINDOWS)[number];

export function getEpaLevelFromScores(scores: number[]): number | null {
  if (scores.length < 3) return null;

  const flooredScores = scores.map((score) => Math.floor(score));
  const allEntrustable = flooredScores.every((score) => score === 3);
  const average = Math.floor(flooredScores.reduce((sum, score) => sum + score, 0) / flooredScores.length);

  if (allEntrustable) return 3;
  return average === 3 ? 2 : average;
}

export function getReportTimeWindowMonths(timeWindow: string | number): number {
  if (typeof timeWindow === 'string' && timeWindow.toLowerCase().includes('all')) return 1200;

  const parsed =
    typeof timeWindow === 'number'
      ? timeWindow
      : Number(timeWindow.match(/\d+/)?.[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

export function isAllTimeReport(timeWindow: string | number): boolean {
  return getReportTimeWindowMonths(timeWindow) >= 1200;
}

export function formatReportTimeWindowLabel(timeWindow: string | number): string {
  if (isAllTimeReport(timeWindow)) return 'All time';
  return `Last ${getReportTimeWindowMonths(timeWindow)} months`;
}
