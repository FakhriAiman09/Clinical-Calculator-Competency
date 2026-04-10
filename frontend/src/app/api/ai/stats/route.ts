import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type TimeBucket = {
  label: string;
  requests: number;
  tokens: number;
  avgLatencyMs: number | null;
  costUsd: number;
};

const WINDOW_TO_HOURS: Record<string, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
};

function getWindowHours(rawValue: string | null): number {
  if (rawValue && rawValue in WINDOW_TO_HOURS) {
    return WINDOW_TO_HOURS[rawValue];
  }

  return WINDOW_TO_HOURS['24h'];
}

function formatBucketLabel(date: Date, windowHours: number): string {
  if (windowHours <= 24) {
    return `${String(date.getHours()).padStart(2, '0')}:00`;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function createBucketStart(date: Date, windowHours: number): Date {
  const bucket = new Date(date);

  if (windowHours <= 24) {
    bucket.setMinutes(0, 0, 0);
    return bucket;
  }

  bucket.setHours(0, 0, 0, 0);
  return bucket;
}

export async function GET(req: NextRequest) {
  try {
    const windowHours = getWindowHours(req.nextUrl.searchParams.get('window'));
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'You must be signed in to view AI dashboard stats.' },
        { status: 401 }
      );
    }

    const [allLogsResult, windowLogsResult, latestLimitResult] = await Promise.all([
      supabase
        .from('ai_request_logs')
        .select('id, total_tokens, latency_ms, estimated_cost_usd, created_at')
        .eq('user_id', user.id),
      supabase
        .from('ai_request_logs')
        .select('id, model_id, total_tokens, latency_ms, estimated_cost_usd, created_at, status_code')
        .eq('user_id', user.id)
        .gte('created_at', windowStart)
        .order('created_at', { ascending: true }),
      supabase
        .from('ai_request_logs')
        .select('requests_limit, requests_remaining, requests_reset_at, tokens_limit, tokens_remaining, tokens_reset_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const allLogs = allLogsResult.data ?? [];
    const windowLogs = windowLogsResult.data ?? [];
    const latestLimit = latestLimitResult.data ?? null;

    const totals = allLogs.reduce(
      (acc, log) => {
        acc.totalRequests += 1;
        acc.totalTokens += log.total_tokens ?? 0;
        acc.totalLatency += log.latency_ms ?? 0;
        acc.totalCost += Number(log.estimated_cost_usd ?? 0);
        return acc;
      },
      { totalRequests: 0, totalTokens: 0, totalLatency: 0, totalCost: 0 }
    );

    const buckets = new Map<string, TimeBucket>();

    for (const log of windowLogs) {
      const createdAt = new Date(log.created_at);
      const bucketStart = createBucketStart(createdAt, windowHours);
      const bucketKey = bucketStart.toISOString();
      const existing = buckets.get(bucketKey);

      if (existing) {
        existing.requests += 1;
        existing.tokens += log.total_tokens ?? 0;
        existing.costUsd += Number(log.estimated_cost_usd ?? 0);
        existing.avgLatencyMs =
          existing.avgLatencyMs == null
            ? log.latency_ms ?? null
            : Math.round((((existing.avgLatencyMs * (existing.requests - 1)) + (log.latency_ms ?? 0)) / existing.requests) * 100) / 100;
      } else {
        buckets.set(bucketKey, {
          label: formatBucketLabel(bucketStart, windowHours),
          requests: 1,
          tokens: log.total_tokens ?? 0,
          avgLatencyMs: log.latency_ms ?? null,
          costUsd: Number(log.estimated_cost_usd ?? 0),
        });
      }
    }

    const series = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      windowHours,
      totals: {
        totalRequests: totals.totalRequests,
        totalTokens: totals.totalTokens,
        avgLatencyMs:
          totals.totalRequests > 0 ? Math.round(totals.totalLatency / totals.totalRequests) : null,
        estimatedCostUsd: totals.totalCost,
      },
      rateLimits: latestLimit
        ? {
            requestsLimit: latestLimit.requests_limit,
            requestsRemaining: latestLimit.requests_remaining,
            requestsResetAt: latestLimit.requests_reset_at,
            tokensLimit: latestLimit.tokens_limit,
            tokensRemaining: latestLimit.tokens_remaining,
            tokensResetAt: latestLimit.tokens_reset_at,
            observedAt: latestLimit.created_at,
          }
        : null,
      series,
      recentRequests: windowLogs.slice(-10).reverse(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'stats_fetch_failed',
        message: error instanceof Error ? error.message : 'Failed to fetch AI dashboard stats.',
      },
      { status: 500 }
    );
  }
}
