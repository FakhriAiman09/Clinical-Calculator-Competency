export function hasRequiredReportParams(studentId?: string, reportId?: string): boolean {
  return Boolean(studentId && reportId);
}

export function buildPrintReportUrl(studentId: string, reportId: string, from: string): string {
  return `/dashboard/print-report?studentId=${studentId}&reportId=${reportId}&from=${encodeURIComponent(from)}`;
}

export function buildCsvUrl(studentId: string, reportId: string): string {
  return `/api/generate-csv?studentId=${studentId}&reportId=${reportId}`;
}

export function parseCsvFilename(contentDisposition: string | null, reportId: string): string {
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  return filenameMatch ? filenameMatch[1] : `report-${reportId}.csv`;
}
