import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '../../../utils/logger';

/**
 * GET /api/generate-csv
 * Generates and streams a CSV export of a student's competency report.
 * Includes a summary section, individual assessment scores, and AI feedback if available.
 * @param {NextRequest} req - Query params: `studentId` and `reportId`.
 * @returns A CSV file download response, or a JSON error with status code.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  const reportId = searchParams.get('reportId');

  if (!studentId || !reportId) {
    return NextResponse.json({ error: 'Missing studentId or reportId' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    // Fetch report data
    const { data: report, error: reportError } = await supabase
      .from('student_reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', studentId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Fetch student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', studentId)
      .single();

    const studentName = profile?.display_name ?? 'Unknown Student';

    // Fetch form results for this student
    const { data: requests } = await supabase
      .from('form_requests')
      .select('id')
      .eq('student_id', studentId);

    const requestIds = requests?.map((r: { id: string }) => r.id) ?? [];

    let formResults: Array<{
      response_id: string;
      created_at: string;
      results: Record<string, number>;
    }> = [];

    if (requestIds.length > 0) {
      const { data: responses } = await supabase
        .from('form_responses')
        .select('response_id')
        .in('request_id', requestIds);

      const responseIds = responses?.map((r: { response_id: string }) => r.response_id) ?? [];

      if (responseIds.length > 0) {
        const { data: results } = await supabase
          .from('form_results')
          .select('response_id, created_at, results')
          .in('response_id', responseIds);

        formResults = results ?? [];
      }
    }

    const DEV_LABELS = ['Remedial', 'Early-Developing', 'Developing', 'Entrustable'];
    const devLabel = (val: number | null | undefined) =>
      val == null ? 'N/A' : DEV_LABELS[Math.floor(val)] ?? 'N/A';

    // Build CSV rows
    const csvRows: string[][] = [];

    // Header block
    csvRows.push(['Clinical Competency Calculator - Student Report']);
    csvRows.push(['Student Name', studentName]);
    csvRows.push(['Report Title', report.title]);
    csvRows.push(['Time Window', report.time_window]);
    csvRows.push(['Generated', new Date(report.created_at).toLocaleDateString()]);
    csvRows.push(['Exported', new Date().toLocaleDateString()]);
    csvRows.push([]);

    // Summary section
    csvRows.push(['--- REPORT SUMMARY ---']);
    csvRows.push(['EPA', 'Key Function', 'Average Score', 'Level', 'Assessment Count']);

    const reportData: Record<string, number> = report.report_data ?? {};
    const epaGroups: Record<string, Record<string, number>> = {};

    for (const [key, val] of Object.entries(reportData)) {
      const [epaId, kfId] = key.split('.');
      if (!epaGroups[epaId]) epaGroups[epaId] = {};
      epaGroups[epaId][kfId] = val;
    }

    for (const epaId of Object.keys(epaGroups).sort((a, b) => Number(a) - Number(b))) {
      const kfs = epaGroups[epaId];
      for (const kfId of Object.keys(kfs).sort((a, b) => Number(a) - Number(b))) {
        const score = kfs[kfId];
        const count = formResults.filter((r) =>
          Object.keys(r.results ?? {}).some((k) => k === `${epaId}.${kfId}`)
        ).length;
        csvRows.push([
          `EPA ${epaId}`,
          `KF ${epaId}.${kfId}`,
          score != null ? score.toFixed(3) : 'N/A',
          devLabel(score),
          String(count),
        ]);
      }
    }

    csvRows.push([]);

    // Individual assessments section
    csvRows.push(['--- INDIVIDUAL ASSESSMENTS ---']);
    csvRows.push(['Date', 'EPA', 'Key Function', 'Score', 'Level']);

    for (const result of formResults.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )) {
      const dateStr = new Date(result.created_at).toLocaleDateString();
      for (const [key, val] of Object.entries(result.results ?? {}).sort()) {
        const [epaId, kfId] = key.split('.');
        csvRows.push([
          dateStr,
          `EPA ${epaId}`,
          `KF ${epaId}.${kfId}`,
          val != null ? String(val) : 'N/A',
          devLabel(val),
        ]);
      }
    }

    // AI Feedback section (if available)
    if (report.llm_feedback) {
      csvRows.push([]);
      csvRows.push(['--- AI FEEDBACK ---']);
      // Wrap feedback safely in a single cell
      csvRows.push([`"${report.llm_feedback.replace(/"/g, '""')}"`]);
    }

    // Serialize to CSV string
    const csvContent = csvRows
      .map((row) =>
        row
          .map((cell) => {
            // If already wrapped in quotes (AI feedback), pass through
            if (cell.startsWith('"') && cell.endsWith('"')) return cell;
            // Otherwise, escape and wrap if needed
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(',')
      )
      .join('\r\n');

    const filename = `competency-report-${studentName.replace(/\s+/g, '-')}-${report.time_window}-${new Date(report.created_at).toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    logger.error('[generate-csv] Error generating CSV', { studentId, reportId, detail: String(err) });
    return NextResponse.json({ error: 'Failed to generate CSV', detail: String(err) }, { status: 500 });
  }
}