// Tests for report-export-utils.ts and speech-to-text-utils.ts (small utility files)
import {
  hasRequiredReportParams,
  buildPrintReportUrl,
  buildCsvUrl,
  parseCsvFilename,
} from '@/utils/report-export-utils';

import {
  isSpeechRecognitionSupported,
  toggleListeningState,
  appendFinalTranscript,
  appendTranscriptSegments,
  type TranscriptSegment,
} from '@/utils/speech-to-text-utils';

describe('report-export-utils.ts', () => {
  describe('hasRequiredReportParams', () => {
    it('should return true when both params are present', () => {
      expect(hasRequiredReportParams('student-123', 'report-456')).toBe(true);
    });

    it('should return false when studentId is missing', () => {
      expect(hasRequiredReportParams(undefined, 'report-456')).toBe(false);
    });

    it('should return false when reportId is missing', () => {
      expect(hasRequiredReportParams('student-123', undefined)).toBe(false);
    });

    it('should return false when both params are missing', () => {
      expect(hasRequiredReportParams()).toBe(false);
    });

    it('should return false when params are empty strings', () => {
      expect(hasRequiredReportParams('', '')).toBe(false);
    });

    it('should return false when studentId is empty', () => {
      expect(hasRequiredReportParams('', 'report-456')).toBe(false);
    });
  });

  describe('buildPrintReportUrl', () => {
    it('should build the correct print report URL', () => {
      const url = buildPrintReportUrl('s-1', 'r-2', '/dashboard');
      expect(url).toBe('/dashboard/print-report?studentId=s-1&reportId=r-2&from=%2Fdashboard');
    });

    it('should URL-encode the from parameter', () => {
      const url = buildPrintReportUrl('s-1', 'r-2', '/dashboard/student/report');
      expect(url).toContain('from=%2Fdashboard%2Fstudent%2Freport');
    });

    it('should include all required query params', () => {
      const url = buildPrintReportUrl('abc', 'xyz', '/test');
      expect(url).toContain('studentId=abc');
      expect(url).toContain('reportId=xyz');
    });
  });

  describe('buildCsvUrl', () => {
    it('should build the correct CSV URL', () => {
      const url = buildCsvUrl('student-1', 'report-2');
      expect(url).toBe('/api/generate-csv?studentId=student-1&reportId=report-2');
    });

    it('should include both student and report IDs', () => {
      const url = buildCsvUrl('s-abc', 'r-xyz');
      expect(url).toContain('studentId=s-abc');
      expect(url).toContain('reportId=r-xyz');
    });
  });

  describe('parseCsvFilename', () => {
    it('should extract filename from Content-Disposition header', () => {
      const result = parseCsvFilename('attachment; filename="report-2024.csv"', 'report-1');
      expect(result).toBe('report-2024.csv');
    });

    it('should fall back to report-<id>.csv when header is null', () => {
      const result = parseCsvFilename(null, 'report-123');
      expect(result).toBe('report-report-123.csv');
    });

    it('should fall back when header has no filename', () => {
      const result = parseCsvFilename('attachment', 'report-456');
      expect(result).toBe('report-report-456.csv');
    });

    it('should handle malformed Content-Disposition', () => {
      const result = parseCsvFilename('filename=no-quotes.csv', 'report-789');
      expect(result).toBe('report-report-789.csv');
    });
  });
});

describe('speech-to-text-utils.ts', () => {
  describe('isSpeechRecognitionSupported', () => {
    it('should return true when hasSpeechRecognition is true', () => {
      expect(isSpeechRecognitionSupported(true, false)).toBe(true);
    });

    it('should return true when hasWebkit is true', () => {
      expect(isSpeechRecognitionSupported(false, true)).toBe(true);
    });

    it('should return true when both are true', () => {
      expect(isSpeechRecognitionSupported(true, true)).toBe(true);
    });

    it('should return false when both are false', () => {
      expect(isSpeechRecognitionSupported(false, false)).toBe(false);
    });
  });

  describe('toggleListeningState', () => {
    it('should toggle false to true', () => {
      expect(toggleListeningState(false)).toBe(true);
    });

    it('should toggle true to false', () => {
      expect(toggleListeningState(true)).toBe(false);
    });
  });

  describe('appendFinalTranscript', () => {
    it('should append final transcript segment', () => {
      const segment: TranscriptSegment = { transcript: 'hello', isFinal: true };
      expect(appendFinalTranscript('start ', segment)).toBe('start hello');
    });

    it('should not append non-final transcript segment', () => {
      const segment: TranscriptSegment = { transcript: 'interim', isFinal: false };
      expect(appendFinalTranscript('start ', segment)).toBe('start ');
    });

    it('should append to empty string', () => {
      const segment: TranscriptSegment = { transcript: 'first words', isFinal: true };
      expect(appendFinalTranscript('', segment)).toBe('first words');
    });
  });

  describe('appendTranscriptSegments', () => {
    it('should append multiple final segments', () => {
      const segments: TranscriptSegment[] = [
        { transcript: 'hello ', isFinal: true },
        { transcript: 'world', isFinal: true },
      ];
      expect(appendTranscriptSegments('', segments)).toBe('hello world');
    });

    it('should skip non-final segments', () => {
      const segments: TranscriptSegment[] = [
        { transcript: 'final ', isFinal: true },
        { transcript: 'interim', isFinal: false },
        { transcript: 'also final', isFinal: true },
      ];
      expect(appendTranscriptSegments('', segments)).toBe('final also final');
    });

    it('should return existing string for empty segments array', () => {
      expect(appendTranscriptSegments('existing', [])).toBe('existing');
    });
  });
});
