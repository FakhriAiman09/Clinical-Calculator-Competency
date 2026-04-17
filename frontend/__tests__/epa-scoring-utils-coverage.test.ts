import {
  DEV_LEVEL_LABELS,
  REPORT_TIME_WINDOWS,
  formatReportTimeWindowLabel,
  getEpaLevelFromScores,
  getReportTimeWindowMonths,
  isAllTimeReport,
} from '@/utils/epa-scoring';

describe('epa-scoring utils coverage', () => {
  it('exports expected constants', () => {
    expect(DEV_LEVEL_LABELS).toEqual(['Remedial', 'Early-Developing', 'Developing', 'Entrustable']);
    expect(REPORT_TIME_WINDOWS).toEqual([3, 6, 12]);
  });

  it('returns null when fewer than 3 scores are provided', () => {
    expect(getEpaLevelFromScores([1, 2])).toBeNull();
  });

  it('returns entrustable level when all floored scores are 3', () => {
    expect(getEpaLevelFromScores([3.8, 3.1, 3.0])).toBe(3);
  });

  it('returns level 2 when average floors to 3 but not all are exactly 3', () => {
    expect(getEpaLevelFromScores([4, 3, 3])).toBe(2);
  });

  it('returns floored average for normal score mixes', () => {
    expect(getEpaLevelFromScores([2.9, 2.1, 1.9])).toBe(1);
  });

  it('parses report time windows from strings and numbers', () => {
    expect(getReportTimeWindowMonths('all time')).toBe(1200);
    expect(getReportTimeWindowMonths('Last 12 months')).toBe(12);
    expect(getReportTimeWindowMonths(6)).toBe(6);
  });

  it('falls back to default report window on invalid inputs', () => {
    expect(getReportTimeWindowMonths('invalid')).toBe(3);
    expect(getReportTimeWindowMonths(0)).toBe(3);
    expect(getReportTimeWindowMonths(-5)).toBe(3);
  });

  it('identifies all-time reports and formats labels', () => {
    expect(isAllTimeReport('all')).toBe(true);
    expect(isAllTimeReport(1200)).toBe(true);
    expect(isAllTimeReport(12)).toBe(false);

    expect(formatReportTimeWindowLabel('all time')).toBe('All time');
    expect(formatReportTimeWindowLabel('6 months')).toBe('Last 6 months');
  });
});
