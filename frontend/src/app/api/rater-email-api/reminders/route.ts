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
  rater_email: string;
  cycle_marker: string;
  sent_at: string;
}

/**
 * Parses a YYYY-MM-DD date string as midnight UTC.
 * @param {string} dateText - Date string in YYYY-MM-DD format.
 * @returns A Date object at 00:00:00 UTC, or null if the format is invalid.
 */
function parseDateOnlyUtc(dateText: string): Date | null {
  const trimmed = dateText.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Determines whether today falls on a reminder cycle day.
 * @param {Date} now - Current date/time.
 * @param {Date} startDate - The cycle anchor date.
 * @param {number} cycleDays - Number of days between reminder cycles.
 * @returns True if today is a cycle day (i.e. days since start is divisible by cycleDays).
 */
function shouldRunCycle(now: Date, startDate: Date, cycleDays: number): boolean {
  if (now.getTime() < startDate.getTime()) {
    return false;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / msPerDay);
  return daysSinceStart % cycleDays === 0;
}

/**
 * Returns the ISO date string (YYYY-MM-DD) of the start of the current cycle.
 * Used as a deduplication key to prevent sending duplicate reminders in the same cycle.
 * @param {Date} now - Current date/time.
 * @param {Date} startDate - The cycle anchor date.
 * @param {number} cycleDays - Number of days between reminder cycles.
 * @returns YYYY-MM-DD string representing the current cycle's start date.
 */
function getCycleMarker(now: Date, startDate: Date, cycleDays: number): string {
  if (now.getTime() < startDate.getTime()) {
    return now.toISOString().slice(0, 10);
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / msPerDay);
  const cycleOffsetDays = Math.floor(daysSinceStart / cycleDays) * cycleDays;
  const cycleStart = new Date(startDate.getTime() + cycleOffsetDays * msPerDay);
  return cycleStart.toISOString().slice(0, 10);
}

/**
 * Checks if the request is authorized via bearer token or x-reminder-secret header.
 * If no secret is configured in the environment, all requests are allowed.
 * @param {NextRequest} req - The incoming request.
 * @returns True if authorized.
 */
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

/**
 * Core reminder processing logic. Finds overdue form requests and sends email reminders
 * to raters who have not yet completed them, deduplicating by cycle marker.
 * @param {NextRequest} req - The incoming request (used for auth check).
 * @param body - Optional config: `thresholdHours` (default 96), `cycleDays` (default 4), `forceRun` (skip cycle check).
 * @returns JSON response with counts of sent/skipped reminders and tracking status.
 */
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
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration for reminder notifications' },
        { status: 500 }
      );
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey ?? supabaseAnonKey!);

    const cutoffUpper = new Date(now.getTime() - thresholdHours * 60 * 60 * 1000).toISOString();

    const { data: overdueRequests, error: requestError } = supabaseServiceRoleKey
      ? await supabase
          .from('form_requests')
          .select('id, student_id, completed_by, created_at')
          .eq('active_status', true)
          .lte('created_at', cutoffUpper)
      : await supabase.rpc('fetch_overdue_requests', { cutoff_timestamp: cutoffUpper });

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

    const reminderLogTable = 'reminder_notification';
    const cycleMarker = getCycleMarker(now, cycleStartDate, cycleDays);

    const requestIds = requestRows.map((request) => request.id);
    const alreadySentRequestIds = new Set<string>();

    if (requestIds.length > 0) {
      const { data: existingLogs, error: existingLogsError } = await supabase
        .from(reminderLogTable)
        .select('request_id')
        .eq('cycle_marker', cycleMarker)
        .in('request_id', requestIds);

      if (existingLogsError) {
        console.error('Error checking existing reminder logs:', existingLogsError.message);
      } else {
        (existingLogs ?? []).forEach((row: { request_id: string }) => alreadySentRequestIds.add(row.request_id));
      }
    }

    let sent = 0;
    let skipped = 0;
    let trackingWriteOk = true;
    let trackingError: string | null = null;
    let trackedCount = 0;
    let trackingSkippedCount = 0;
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
      if (alreadySentRequestIds.has(request.id)) {
        skipped += 1;
        continue;
      }

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

    if (sentDetails.length > 0) {
      const logRows: ReminderLogRow[] = sentDetails.map((detail) => ({
        request_id: detail.requestId,
        rater_email: detail.raterEmail,
        cycle_marker: cycleMarker,
        sent_at: detail.sentAt,
      }));

      const { error: logError } = await supabase
        .from(reminderLogTable)
        .upsert(logRows, { onConflict: 'request_id,cycle_marker', ignoreDuplicates: true });

      if (logError) {
        trackingWriteOk = false;
        trackingError = logError.message;
        console.error('Error saving reminder logs:', logError.message);
      } else {
        trackedCount = logRows.length;
      }
    }

    trackingSkippedCount = Math.max(sent - trackedCount, 0);

    const todayStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStartUtc = new Date(todayStartUtc.getTime() + 24 * 60 * 60 * 1000);
    let sentTodayCount = sent;

    const { count: sentTodayDbCount, error: sentTodayError } = await supabase
      .from(reminderLogTable)
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', todayStartUtc.toISOString())
      .lt('sent_at', tomorrowStartUtc.toISOString());

    if (sentTodayError) {
      console.error('Error counting today reminder logs:', sentTodayError.message);
    } else {
      sentTodayCount = sentTodayDbCount ?? 0;
    }

    return NextResponse.json({
      message: 'Reminder processing complete',
      mode: supabaseServiceRoleKey ? 'service_role' : 'anon_rpc',
      thresholdHours,
      cycleDays,
      cycleStartDate: configuredStartDate,
      cycleMarker,
      overdueCount: requestRows.length,
      sent,
      sentThisRun: sent > 0,
      sentTodayCount,
      trackingWriteOk,
      trackingError,
      trackedCount,
      trackingSkippedCount,
      skipped,
      sentDetails,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected reminder processing error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/rater-email-api/reminders
 * Triggers reminder processing via query params.
 * Accepts: `forceRun`, `thresholdHours`, `cycleDays`.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const forceRun = url.searchParams.get('forceRun') === 'true';

  const thresholdParam = url.searchParams.get('thresholdHours');
  const thresholdHours = thresholdParam ? Number(thresholdParam) : undefined;

  const cycleParam = url.searchParams.get('cycleDays');
  const cycleDays = cycleParam ? Number(cycleParam) : undefined;

  return processReminders(req, { forceRun, thresholdHours, cycleDays });
}

/**
 * POST /api/rater-email-api/reminders
 * Triggers reminder processing via JSON body.
 * Accepts: `{ thresholdHours?, cycleDays?, forceRun? }`.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return processReminders(req, body);
}
