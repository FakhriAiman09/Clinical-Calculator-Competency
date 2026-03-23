import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendReminderEmail } from '@/app/dashboard/rater/form/rater-email-api/send-reminder-rater.server';

interface FetchUserRecord {
  id: string;
  email: string;
  role: string;
}

interface FormRequestRecord {
  id: string;
  student_id: string;
  completed_by: string;
  created_at: string;
}

interface ProfileRecord {
  id: string;
  display_name: string | null;
}

interface ReminderLogRow {
  request_id: string;
  rater_id: string;
  rater_email: string;
  student_id: string;
  student_name: string;
  faculty_name: string | null;
  threshold_hours: number;
  cycle_days: number;
  sent_at: string;
}

function parseDateOnlyUtc(dateText: string): Date | null {
  const trimmed = dateText.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function shouldRunCycle(now: Date, startDate: Date, cycleDays: number): boolean {
  if (now.getTime() < startDate.getTime()) {
    return false;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / msPerDay);
  return daysSinceStart % cycleDays === 0;
}

function isAuthorized(req: NextRequest): boolean {
  const expectedSecret = process.env.REMINDER_API_SECRET ?? process.env.CRON_SECRET;
  if (!expectedSecret) {
    return true;
  }

  const headerSecret = req.headers.get('x-reminder-secret');
  if (headerSecret && headerSecret === expectedSecret) {
    return true;
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return false;
  }

  const bearerPrefix = 'Bearer ';
  if (!authHeader.startsWith(bearerPrefix)) {
    return false;
  }

  const bearerToken = authHeader.slice(bearerPrefix.length).trim();
  return bearerToken === expectedSecret;
}

async function processReminders(req: NextRequest, body?: { thresholdHours?: number; cycleDays?: number; forceRun?: boolean }) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thresholdHoursRaw = Number(body?.thresholdHours ?? process.env.REMINDER_THRESHOLD_HOURS ?? 96);
    const thresholdHours = Number.isFinite(thresholdHoursRaw) && thresholdHoursRaw > 0 ? thresholdHoursRaw : 96;

    const cycleDaysRaw = Number(body?.cycleDays ?? process.env.REMINDER_REPEAT_DAYS ?? 4);
    const cycleDays = Number.isFinite(cycleDaysRaw) && cycleDaysRaw > 0 ? cycleDaysRaw : 4;

    const configuredStartDate = process.env.REMINDER_CYCLE_START_DATE ?? '2026-03-22';
    const cycleStartDate = parseDateOnlyUtc(configuredStartDate);
    if (!cycleStartDate) {
      return NextResponse.json(
        { error: 'Invalid REMINDER_CYCLE_START_DATE. Expected format: YYYY-MM-DD' },
        { status: 500 }
      );
    }

    const now = new Date();
    const forceRun = body?.forceRun === true;
    if (!forceRun && !shouldRunCycle(now, cycleStartDate, cycleDays)) {
      return NextResponse.json({
        message: 'Not a reminder cycle day',
        cycleStartDate: configuredStartDate,
        cycleDays,
        sent: 0,
        skipped: 0,
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration for reminder notifications' },
        { status: 500 }
      );
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);

    const cutoffUpper = new Date(now.getTime() - thresholdHours * 60 * 60 * 1000).toISOString();

    const { data: overdueRequests, error: requestError } = await supabase
      .from('form_requests')
      .select('id, student_id, completed_by, created_at')
      .eq('active_status', true)
      .lte('created_at', cutoffUpper);

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    const requestRows = (overdueRequests ?? []) as FormRequestRecord[];
    if (requestRows.length === 0) {
      return NextResponse.json({ message: 'No overdue assessments found', sent: 0, skipped: 0 });
    }

    const { data: users, error: usersError } = await supabase.rpc('fetch_users');
    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const userRows = ((users ?? []) as FetchUserRecord[]).filter((user) => user.role === 'rater');

    const profileIds = Array.from(new Set(requestRows.flatMap((row) => [row.student_id, row.completed_by])));
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', profileIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const profileMap = new Map((profiles as ProfileRecord[]).map((profile) => [profile.id, profile.display_name]));
    const raterMap = new Map(userRows.map((user) => [user.id, user.email]));

    let sent = 0;
    let skipped = 0;
    const sentDetails: Array<{
      requestId: string;
      raterId: string;
      raterEmail: string;
      studentId: string;
      studentName: string;
      facultyName: string | null;
      sentAt: string;
    }> = [];

    for (const request of requestRows) {
      const facultyEmail = raterMap.get(request.completed_by);
      if (!facultyEmail) {
        skipped += 1;
        continue;
      }

      const studentName = profileMap.get(request.student_id) ?? 'Student';
      const facultyName = profileMap.get(request.completed_by) ?? undefined;

      await sendReminderEmail({
        to: facultyEmail,
        studentName,
        requestId: request.id,
        thresholdHours,
        facultyName,
      });

      const sentAt = new Date().toISOString();
      sentDetails.push({
        requestId: request.id,
        raterId: request.completed_by,
        raterEmail: facultyEmail,
        studentId: request.student_id,
        studentName,
        facultyName: facultyName ?? null,
        sentAt,
      });

      sent += 1;
    }

    const reminderLogTable = process.env.REMINDER_LOG_TABLE;
    let logSaved = false;
    let logWarning: string | null = null;
    if (reminderLogTable && sentDetails.length > 0) {
      const logRows: ReminderLogRow[] = sentDetails.map((detail) => ({
        request_id: detail.requestId,
        rater_id: detail.raterId,
        rater_email: detail.raterEmail,
        student_id: detail.studentId,
        student_name: detail.studentName,
        faculty_name: detail.facultyName,
        threshold_hours: thresholdHours,
        cycle_days: cycleDays,
        sent_at: detail.sentAt,
      }));

      const { error: logError } = await supabase.from(reminderLogTable).insert(logRows);
      if (logError) {
        logWarning = logError.message;
      } else {
        logSaved = true;
      }
    }

    return NextResponse.json({
      message: 'Reminder processing complete',
      thresholdHours,
      cycleDays,
      cycleStartDate: configuredStartDate,
      overdueCount: requestRows.length,
      sent,
      skipped,
      logSaved,
      logWarning,
      sentDetails,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected reminder processing error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return processReminders(req);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return processReminders(req, body);
}
