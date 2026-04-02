/**
 * Checks whether both studentId and reportId are present and truthy.
 * @param {string} [studentId] - The student's Supabase user ID.
 * @param {string} [reportId] - The report's database ID.
 */
export function hasRequiredReportParams(studentId?: string, reportId?: string): boolean {
  return Boolean(studentId && reportId);
}

/**
 * Builds the URL for the print/PDF report page.
 * @param {string} studentId - The student's Supabase user ID.
 * @param {string} reportId - The report's database ID.
 * @param {string} from - The page to return to after printing (URL-encoded).
 */
export function buildPrintReportUrl(studentId: string, reportId: string, from: string): string {
  return `/dashboard/print-report?studentId=${studentId}&reportId=${reportId}&from=${encodeURIComponent(from)}`;
}

/**
 * Builds the URL for the CSV export API endpoint.
 * @param {string} studentId - The student's Supabase user ID.
 * @param {string} reportId - The report's database ID.
 */
export function buildCsvUrl(studentId: string, reportId: string): string {
  return `/api/generate-csv?studentId=${studentId}&reportId=${reportId}`;
}

/**
 * Extracts the filename from a Content-Disposition header.
 * Falls back to `report-<reportId>.csv` if the header is missing or malformed.
 * @param {string | null} contentDisposition - The Content-Disposition response header value.
 * @param {string} reportId - Used as fallback in the filename.
 */
export function parseCsvFilename(contentDisposition: string | null, reportId: string): string {
  const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
  return filenameMatch ? filenameMatch[1] : `report-${reportId}.csv`;
}
