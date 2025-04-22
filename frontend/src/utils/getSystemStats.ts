import { createClient } from '@/utils/supabase/client';

export interface SystemStats {
  totalSubmittedForms: number;
  activeFormRequests: number;
  delinquentFormRequests: number;
  averageTurnaroundDays: number | null;
  topDelinquentRaters: {
    rater_id: string;
    display_name: string;
    email: string;
    count: number;
  }[];
  monthlySubmissionTrends: { month: string; count: number }[];
  monthlyEPADistribution: Record<string, { month: string; count: number }[]>;
}

type DelinquentRaterRow = {
  rater_id: string;
  display_name: string | null;
  email: string | null;
  count: number;
};

let cachedStats: SystemStats | null = null;
let lastFetched: number | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getSystemStats(): Promise<SystemStats> {
  const now = Date.now();
  if (cachedStats && lastFetched && now - lastFetched < CACHE_TTL_MS) {
    return cachedStats;
  }

  const supabase = createClient();

  const { count: totalSubmittedForms } = await supabase
    .from('form_responses')
    .select('*', { count: 'exact', head: true });

  const { count: activeFormRequests } = await supabase
    .from('form_requests')
    .select('*', { count: 'exact', head: true })
    .eq('active_status', true);

  const { count: delinquentFormRequests } = await supabase
    .from('form_requests')
    .select('*', { count: 'exact', head: true })
    .eq('active_status', true)
    .lt('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

  const { data: turnaroundData } = await supabase.rpc('average_turnaround_days');

  const { data: delinquentRatersData } = await supabase.rpc('get_delinquent_raters');
  const topDelinquentRaters: SystemStats['topDelinquentRaters'] = (delinquentRatersData || []).map(
    (row: DelinquentRaterRow) => ({
      rater_id: row.rater_id,
      display_name: row.display_name ?? 'Unknown',
      email: row.email ?? 'Unavailable',
      count: row.count ?? 0,
    })
  );

  const { data: monthlyData } = await supabase.rpc('monthly_form_submissions');

  const { data: monthlyEPAs } = await supabase.rpc('monthly_epa_distribution');

  console.log('🧪 Raw monthlyEPAs from Supabase:', monthlyEPAs);

  interface MonthlyEPAData {
    epa: string;
    month: string;
    count: number;
  }

  const monthlyEPADistribution =
    monthlyEPAs?.reduce((acc: Record<string, { month: string; count: number }[]>, row: MonthlyEPAData) => {
      if (!acc[row.epa]) acc[row.epa] = [];
      acc[row.epa].push({ month: row.month, count: row.count });
      return acc;
    }, {} as Record<string, { month: string; count: number }[]>) ?? {};

  console.log('✅ Parsed monthlyEPADistribution:', monthlyEPADistribution);

  cachedStats = {
    totalSubmittedForms: totalSubmittedForms ?? 0,
    activeFormRequests: activeFormRequests ?? 0,
    delinquentFormRequests: delinquentFormRequests ?? 0,
    averageTurnaroundDays: turnaroundData ?? null,
    topDelinquentRaters,
    monthlySubmissionTrends: monthlyData ?? [],
    monthlyEPADistribution,
  };

  lastFetched = now;
  return cachedStats;
}
