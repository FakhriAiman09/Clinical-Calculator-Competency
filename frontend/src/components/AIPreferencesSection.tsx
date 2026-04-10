'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useAIPreferences } from '@/utils/useAIPreferences';

type DashboardModel = {
  id: string;
  name: string;
  description: string | null;
  contextWindow: number | null;
  maxCompletionTokens: number | null;
  provider: string;
  pricing: {
    prompt: number | null;
    completion: number | null;
    request: number | null;
    image: number | null;
    webSearch: number | null;
  };
  architecture: {
    inputModalities: string[];
    outputModalities: string[];
    tokenizer: string | null;
    instructType: string | null;
  };
  capabilities: string[];
};

type ModelsResponse = {
  fetchedAt: string;
  selectedModelId: string | null;
  models: DashboardModel[];
};

type StatsBucket = {
  label: string;
  requests: number;
  tokens: number;
  avgLatencyMs: number | null;
  costUsd: number;
};

type StatsResponse = {
  fetchedAt: string;
  windowHours: number;
  totals: {
    totalRequests: number;
    totalTokens: number;
    avgLatencyMs: number | null;
    estimatedCostUsd: number;
  };
  rateLimits: {
    requestsLimit: number | null;
    requestsRemaining: number | null;
    requestsResetAt: string | null;
    tokensLimit: number | null;
    tokensRemaining: number | null;
    tokensResetAt: string | null;
    observedAt: string;
  } | null;
  series: StatsBucket[];
  recentRequests: Array<{
    id: string;
    model_id: string;
    total_tokens: number | null;
    latency_ms: number | null;
    estimated_cost_usd: number | null;
    created_at: string;
    status_code: number;
  }>;
};

type ChatResponse = {
  modelId: string;
  output: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  estimatedCostUsd: number | null;
  rateLimits: StatsResponse['rateLimits'];
  createdAt: string;
};

const POLL_INTERVAL_MS = 5000;

function formatInteger(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat().format(value);
}

function formatLatency(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}

function formatUsd(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 0.01 ? 4 : 2,
    maximumFractionDigits: value < 0.01 ? 6 : 2,
  }).format(value);
}

function formatUsdPerMillion(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return `${formatUsd(value * 1_000_000)} / 1M`;
}

function formatContextWindow(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return `${value}`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function buildPolylinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';
  if (values.length === 1) return `0,${height / 2}`;

  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${x},${y}`;
    })
    .join(' ');
}

function Sparkline({
  values,
  stroke,
}: {
  values: number[];
  stroke: string;
}) {
  if (values.length === 0) {
    return <div className='text-muted small'>No usage yet for this window.</div>;
  }

  const width = 320;
  const height = 90;
  const points = buildPolylinePoints(values, width, height);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width='100%' height='90' role='img' aria-label='usage chart'>
      <polyline
        fill='none'
        stroke={stroke}
        strokeWidth='3'
        strokeLinecap='round'
        strokeLinejoin='round'
        points={points}
      />
    </svg>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <div className='col-12 col-md-6 col-xl-3'>
      <div className='card h-100 border-0 shadow-sm'>
        <div className='card-body'>
          <div className='d-flex justify-content-between align-items-start mb-3'>
            <span className='text-muted small text-uppercase fw-semibold'>{label}</span>
            <i className={`bi ${icon} text-primary`} />
          </div>
          <div className='fw-bold fs-4 mb-1'>{value}</div>
          <div className='text-muted small'>{detail}</div>
        </div>
      </div>
    </div>
  );
}

export default function AIPreferencesSection() {
  const { user } = useUser();
  const { model: savedModelId, isLoading: preferenceLoading, saveModel } = useAIPreferences(user?.id);

  const [modelsResponse, setModelsResponse] = useState<ModelsResponse | null>(null);
  const [statsResponse, setStatsResponse] = useState<StatsResponse | null>(null);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [savingModel, setSavingModel] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [chatPrompt, setChatPrompt] = useState('Give me a one-sentence summary of why latency and rate limits matter in an AI dashboard.');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResult, setChatResult] = useState<ChatResponse | null>(null);
  const [chatError, setChatError] = useState('');

  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    if (!user?.id) return;

    if (showRefreshing) setRefreshing(true);
    setDashboardError('');

    try {
      const [modelsRes, statsRes] = await Promise.all([
        fetch('/api/ai/models', { cache: 'no-store' }),
        fetch('/api/ai/stats?window=24h', { cache: 'no-store' }),
      ]);

      const [modelsJson, statsJson] = await Promise.all([modelsRes.json(), statsRes.json()]);

      if (!modelsRes.ok) {
        throw new Error(modelsJson?.message || 'Failed to load OpenRouter models.');
      }

      if (!statsRes.ok) {
        throw new Error(statsJson?.message || 'Failed to load AI dashboard stats.');
      }

      setModelsResponse(modelsJson as ModelsResponse);
      setStatsResponse(statsJson as StatsResponse);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to load AI dashboard.');
    } finally {
      setLoadingModels(false);
      setLoadingStats(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchDashboardData();
  }, [fetchDashboardData, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const intervalId = window.setInterval(() => {
      fetchDashboardData();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchDashboardData, user?.id]);

  useEffect(() => {
    if (selectedModelId) return;

    const modelId =
      savedModelId ||
      modelsResponse?.selectedModelId ||
      modelsResponse?.models[0]?.id ||
      '';

    if (modelId) {
      setSelectedModelId(modelId);
    }
  }, [modelsResponse, savedModelId, selectedModelId]);

  const selectedModel = useMemo(() => {
    return modelsResponse?.models.find((item) => item.id === selectedModelId) ?? null;
  }, [modelsResponse, selectedModelId]);

  const hasChanges = Boolean(selectedModelId) && selectedModelId !== savedModelId;

  const handleSave = useCallback(async () => {
    if (!selectedModelId) return;

    setSavingModel(true);
    await saveModel(selectedModelId);
    setSavingModel(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
    fetchDashboardData(true);
  }, [fetchDashboardData, saveModel, selectedModelId]);

  const handleSendTestRequest = useCallback(async () => {
    if (!selectedModelId || !chatPrompt.trim()) return;

    setChatLoading(true);
    setChatError('');

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModelId,
          messages: [{ role: 'user', content: chatPrompt.trim() }],
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'OpenRouter test request failed.');
      }

      setChatResult(payload as ChatResponse);
      fetchDashboardData(true);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Failed to send OpenRouter request.');
    } finally {
      setChatLoading(false);
    }
  }, [chatPrompt, fetchDashboardData, selectedModelId]);

  const requestSeries = statsResponse?.series.map((item) => item.requests) ?? [];
  const tokenSeries = statsResponse?.series.map((item) => item.tokens) ?? [];
  const latencySeries = statsResponse?.series.map((item) => item.avgLatencyMs ?? 0) ?? [];
  const costSeries = statsResponse?.series.map((item) => item.costUsd) ?? [];

  return (
    <div className='card mb-4 shadow-sm'>
      <div className='card-header d-flex flex-wrap align-items-center justify-content-between gap-2 py-3'>
        <div className='d-flex align-items-center gap-2'>
          <i className='bi bi-cpu fs-5' />
          <span className='fw-semibold fs-6'>AI Preferences</span>
        </div>
        <div className='d-flex align-items-center gap-2'>
          <span className='badge text-bg-light border'>Auto-refresh {POLL_INTERVAL_MS / 1000}s</span>
          <button
            type='button'
            className='btn btn-sm btn-outline-secondary'
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh now'}
          </button>
        </div>
      </div>

      <div className='card-body px-4 py-4'>
        {(loadingModels || loadingStats || preferenceLoading) && (
          <div className='text-muted mb-3'>Loading live OpenRouter dashboard...</div>
        )}

        {dashboardError ? (
          <div className='alert alert-danger'>{dashboardError}</div>
        ) : null}

        <div className='row g-3 mb-4'>
          <StatCard
            label='Available models'
            value={formatInteger(modelsResponse?.models.length)}
            detail={`Fetched ${formatDateTime(modelsResponse?.fetchedAt)}`}
            icon='bi-collection'
          />
          <StatCard
            label='Total requests'
            value={formatInteger(statsResponse?.totals.totalRequests)}
            detail='All logged OpenRouter calls'
            icon='bi-arrow-repeat'
          />
          <StatCard
            label='Total tokens'
            value={formatInteger(statsResponse?.totals.totalTokens)}
            detail='Prompt + completion tokens'
            icon='bi-braces-asterisk'
          />
          <StatCard
            label='Average latency'
            value={formatLatency(statsResponse?.totals.avgLatencyMs)}
            detail='Across all logged requests'
            icon='bi-stopwatch'
          />
          <StatCard
            label='Estimated cost'
            value={formatUsd(statsResponse?.totals.estimatedCostUsd)}
            detail='Computed from live model pricing'
            icon='bi-cash-stack'
          />
          <StatCard
            label='Requests remaining'
            value={formatInteger(statsResponse?.rateLimits?.requestsRemaining)}
            detail={
              statsResponse?.rateLimits?.requestsResetAt
                ? `Resets ${formatDateTime(statsResponse.rateLimits.requestsResetAt)}`
                : 'Latest observed OpenRouter limit'
            }
            icon='bi-speedometer2'
          />
          <StatCard
            label='Token budget remaining'
            value={formatInteger(statsResponse?.rateLimits?.tokensRemaining)}
            detail='Most recent rate limit snapshot'
            icon='bi-hourglass-split'
          />
          <StatCard
            label='Tracked window'
            value={`${statsResponse?.windowHours ?? 24}h`}
            detail='Charts use recent traffic only'
            icon='bi-graph-up-arrow'
          />
        </div>

        <div className='row g-4 mb-4'>
          <div className='col-12 col-lg-6'>
            <label htmlFor='ai-model-selector' className='form-label fw-semibold'>
              Preferred OpenRouter model
            </label>
            <select
              id='ai-model-selector'
              className='form-select'
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              disabled={!modelsResponse?.models.length}
            >
              <option value=''>Select a model</option>
              {(modelsResponse?.models ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.provider})
                </option>
              ))}
            </select>
            <div className='form-text'>
              The saved model is used by the in-app AI summarizer and the live test request tool below.
            </div>
          </div>
          <div className='col-12 col-lg-6 d-flex align-items-end justify-content-lg-end'>
            <div className='d-flex align-items-center gap-3'>
              {saved ? <span className='text-success small'>Preference saved.</span> : null}
              <button
                type='button'
                className='btn btn-primary'
                disabled={!hasChanges || savingModel}
                onClick={handleSave}
              >
                {savingModel ? 'Saving...' : 'Save preference'}
              </button>
            </div>
          </div>
        </div>

        {selectedModel ? (
          <div className='card border-0 bg-body-tertiary mb-4'>
            <div className='card-body'>
              <div className='d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3'>
                <div>
                  <h5 className='mb-1'>{selectedModel.name}</h5>
                  <div className='text-muted small'>
                    {selectedModel.provider} · Context {formatContextWindow(selectedModel.contextWindow)} · Max output{' '}
                    {formatContextWindow(selectedModel.maxCompletionTokens)}
                  </div>
                </div>
                <div className='text-end small text-muted'>
                  <div>Prompt: {formatUsdPerMillion(selectedModel.pricing.prompt)}</div>
                  <div>Completion: {formatUsdPerMillion(selectedModel.pricing.completion)}</div>
                  <div>Request: {formatUsd(selectedModel.pricing.request)}</div>
                </div>
              </div>

              {selectedModel.description ? (
                <p className='text-muted mb-3'>{selectedModel.description}</p>
              ) : null}

              <div className='d-flex flex-wrap gap-2'>
                {selectedModel.capabilities.length > 0 ? (
                  selectedModel.capabilities.map((item) => (
                    <span key={item} className='badge text-bg-light border'>
                      {item}
                    </span>
                  ))
                ) : (
                  <span className='text-muted small'>No model capabilities were returned by OpenRouter.</span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className='row g-4 mb-4'>
          <div className='col-12 col-lg-6'>
            <div className='card h-100 border-0 bg-body-tertiary'>
              <div className='card-body'>
                <div className='fw-semibold mb-2'>Requests over time</div>
                <Sparkline values={requestSeries} stroke='var(--bs-primary)' />
                <div className='mt-3 small text-muted'>
                  Tokens in the same window: {formatInteger(tokenSeries.reduce((sum, value) => sum + value, 0))}
                </div>
              </div>
            </div>
          </div>
          <div className='col-12 col-lg-6'>
            <div className='card h-100 border-0 bg-body-tertiary'>
              <div className='card-body'>
                <div className='fw-semibold mb-2'>Latency over time</div>
                <Sparkline values={latencySeries} stroke='var(--bs-success)' />
                <div className='mt-3 small text-muted'>
                  Window cost estimate: {formatUsd(costSeries.reduce((sum, value) => sum + value, 0))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='row g-4 mb-4'>
          <div className='col-12 col-lg-7'>
            <div className='card border-0 bg-body-tertiary h-100'>
              <div className='card-body'>
                <div className='fw-semibold mb-3'>Live OpenRouter test request</div>
                <textarea
                  className='form-control mb-3'
                  rows={5}
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  placeholder='Enter a prompt to test the selected model.'
                />
                <div className='d-flex flex-wrap align-items-center gap-2 mb-3'>
                  <button
                    type='button'
                    className='btn btn-outline-primary'
                    onClick={handleSendTestRequest}
                    disabled={!selectedModelId || chatLoading || !chatPrompt.trim()}
                  >
                    {chatLoading ? 'Sending...' : 'Send test request'}
                  </button>
                  <span className='text-muted small'>
                    This uses the secure backend route and logs usage for analytics.
                  </span>
                </div>

                {chatError ? <div className='alert alert-danger py-2'>{chatError}</div> : null}

                {chatResult ? (
                  <div className='border rounded p-3 bg-body'>
                    <div className='d-flex flex-wrap gap-3 small text-muted mb-2'>
                      <span>Model: {chatResult.modelId}</span>
                      <span>Latency: {formatLatency(chatResult.latencyMs)}</span>
                      <span>Tokens: {formatInteger(chatResult.usage.totalTokens)}</span>
                      <span>Cost: {formatUsd(chatResult.estimatedCostUsd)}</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{chatResult.output}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className='col-12 col-lg-5'>
            <div className='card border-0 bg-body-tertiary h-100'>
              <div className='card-body'>
                <div className='fw-semibold mb-3'>Latest rate limit snapshot</div>
                {statsResponse?.rateLimits ? (
                  <div className='small'>
                    <div className='mb-2'>
                      Requests: {formatInteger(statsResponse.rateLimits.requestsRemaining)} remaining /{' '}
                      {formatInteger(statsResponse.rateLimits.requestsLimit)} limit
                    </div>
                    <div className='mb-2'>
                      Tokens: {formatInteger(statsResponse.rateLimits.tokensRemaining)} remaining /{' '}
                      {formatInteger(statsResponse.rateLimits.tokensLimit)} limit
                    </div>
                    <div className='mb-2'>
                      Request reset: {formatDateTime(statsResponse.rateLimits.requestsResetAt)}
                    </div>
                    <div className='mb-2'>
                      Token reset: {formatDateTime(statsResponse.rateLimits.tokensResetAt)}
                    </div>
                    <div className='text-muted'>
                      Observed at {formatDateTime(statsResponse.rateLimits.observedAt)}
                    </div>
                  </div>
                ) : (
                  <div className='text-muted small'>No rate limit headers have been captured yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='card border-0 bg-body-tertiary'>
          <div className='card-body'>
            <div className='fw-semibold mb-3'>Recent logged requests</div>
            {statsResponse?.recentRequests.length ? (
              <div className='table-responsive'>
                <table className='table table-sm align-middle mb-0'>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Model</th>
                      <th>Status</th>
                      <th>Tokens</th>
                      <th>Latency</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsResponse.recentRequests.map((item) => (
                      <tr key={item.id}>
                        <td>{new Date(item.created_at).toLocaleString()}</td>
                        <td className='text-break'>{item.model_id}</td>
                        <td>{item.status_code}</td>
                        <td>{formatInteger(item.total_tokens)}</td>
                        <td>{formatLatency(item.latency_ms)}</td>
                        <td>{formatUsd(item.estimated_cost_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='text-muted small'>No OpenRouter requests have been logged yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
