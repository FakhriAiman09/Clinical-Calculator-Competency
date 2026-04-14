import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '../../../utils/logger';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type FormResult = {
  response_id: string;
  created_at: string;
  results: Record<string, number>;
};

const DEV_LABELS = ['Remedial', 'Early-Developing', 'Developing', 'Entrustable'];

function devLabel(val: number | null | undefined): string {
  return val == null ? 'N/A' : DEV_LABELS[Math.floor(val)] ?? 'N/A';
}

async function fetchFormResults(supabase: SupabaseClient, studentId: string): Promise<FormResult[]> {
  const { data: requests } = await supabase
    .from('form_requests')
    .select('id')
    .eq('student_id', studentId);

  const requestIds = requests?.map((r: { id: string }) => r.id) ?? [];
  if (requestIds.length === 0) return [];

  const { data: responses } = await supabase
    .from('form_responses')
    .select('response_id')
    .in('request_id', requestIds);

  const responseIds = responses?.map((r: { response_id: string }) => r.response_id) ?? [];
  if (responseIds.length === 0) return [];

  const { data: results } = await supabase
    .from('form_results')
    .select('response_id, created_at, results')
    .in('response_id', responseIds);

  return results ?? [];
}

function buildHeaderRows(studentName: string, report: Record<string, unknown>): string[][] {
  return [
    ['Clinical Competency Calculator - Student Report'],
    ['Student Name', studentName],
    ['Report Title', report.title as string],
    ['Time Window', report.time_window as string],
    ['Generated', new Date(report.created_at as string).toLocaleDateString()],
    ['Exported', new Date().toLocaleDateString()],
    [],
  ];
}

function buildSummaryRows(report: Record<string, unknown>, formResults: FormResult[]): string[][] {
  const rows: string[][] = [
    ['--- REPORT SUMMARY ---'],
    ['EPA', 'Key Function', 'Average Score', 'Level', 'Assessment Count'],
  ];

  const reportData: Record<string, number> = (report.report_data as Record<string, number>) ?? {};
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
      rows.push([
        `EPA ${epaId}`,
        `KF ${epaId}.${kfId}`,
        score != null ? score.toFixed(3) : 'N/A',
        devLabel(score),
        String(count),
      ]);
    }
  }

  return rows;
}

function buildAssessmentRows(formResults: FormResult[]): string[][] {
  const rows: string[][] = [
    ['--- INDIVIDUAL ASSESSMENTS ---'],
    ['Date', 'EPA', 'Key Function', 'Score', 'Level'],
  ];

  const sorted = [...formResults].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const result of sorted) {
    const dateStr = new Date(result.created_at).toLocaleDateString();
    for (const [key, val] of Object.entries(result.results ?? {}).sort(([a], [b]) => {
      const [aEpa, aKf] = a.split('.').map(Number);
      const [bEpa, bKf] = b.split('.').map(Number);
      return aEpa !== bEpa ? aEpa - bEpa : aKf - bKf;
    })) {
      const [epaId, kfId] = key.split('.');
      rows.push([dateStr, `EPA ${epaId}`, `KF ${epaId}.${kfId}`, val != null ? String(val) : 'N/A', devLabel(val)]);
    }
  }

  return rows;
}

function serializeCSV(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell.startsWith('"') && cell.endsWith('"')) return cell;
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    )
    .join('\r\n');
}

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

    const { data: report, error: reportError } = await supabase
      .from('student_reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', studentId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', studentId)
      .single();

    const studentName = profile?.display_name ?? 'Unknown Student';
    const formResults = await fetchFormResults(supabase, studentId);

    const csvRows = [
      ...buildHeaderRows(studentName, report),
      ...buildSummaryRows(report, formResults),
      [],
      ...buildAssessmentRows(formResults),
    ];

    if (report.llm_feedback) {
      csvRows.push([], ['--- AI FEEDBACK ---'], [`"${report.llm_feedback.replace(/"/g, '""')}"`]);
    }

    const csvContent = serializeCSV(csvRows);
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