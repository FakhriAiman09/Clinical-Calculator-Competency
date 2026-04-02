import { describe, expect, test } from '@jest/globals';
import {
  buildCsvUrl,
  buildPrintReportUrl,
  hasRequiredReportParams,
  parseCsvFilename,
} from '../../frontend/src/utils/report-export-utils';

// This file unit-tests PDF/CSV export URL and filename helper logic.

describe('Report export unit tests', () => {
  // Ensures required parameters are validated before export actions.
  test('hasRequiredReportParams validates IDs', () => {
    expect(hasRequiredReportParams('student-1', 'report-1')).toBe(true);
    expect(hasRequiredReportParams(undefined, 'report-1')).toBe(false);
    expect(hasRequiredReportParams('student-1', undefined)).toBe(false);
  });

  // Ensures print URL includes encoded return path.
  test('buildPrintReportUrl returns correct encoded URL', () => {
    expect(buildPrintReportUrl('s1', 'r1', '/dashboard/student/report')).toBe(
      '/dashboard/print-report?studentId=s1&reportId=r1&from=%2Fdashboard%2Fstudent%2Freport'
    );
  });

  // Ensures CSV endpoint URL is assembled correctly.
  test('buildCsvUrl returns expected query string', () => {
    expect(buildCsvUrl('s1', 'r1')).toBe('/api/generate-csv?studentId=s1&reportId=r1');
  });

  // Ensures filename parser reads Content-Disposition filename when present.
  test('parseCsvFilename extracts filename from response header', () => {
    expect(parseCsvFilename('attachment; filename="custom-report.csv"', 'r1')).toBe('custom-report.csv');
  });

  // Ensures fallback filename is used when header is missing.
  test('parseCsvFilename returns fallback filename when header missing', () => {
    expect(parseCsvFilename(null, 'r1')).toBe('report-r1.csv');
  });
});
