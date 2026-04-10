export type OpenRouterPricing = {
  prompt: number | null;
  completion: number | null;
  request: number | null;
  image: number | null;
  webSearch: number | null;
};

export type OpenRouterModel = {
  id: string;
  name: string;
  description: string | null;
  contextWindow: number | null;
  maxCompletionTokens: number | null;
  pricing: OpenRouterPricing;
  provider: string;
  architecture: {
    inputModalities: string[];
    outputModalities: string[];
    tokenizer: string | null;
    instructType: string | null;
  };
  capabilities: string[];
  raw: Record<string, unknown>;
};

export type OpenRouterChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OpenRouterUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type OpenRouterRateLimits = {
  requestsLimit: number | null;
  requestsRemaining: number | null;
  requestsResetAt: string | null;
  tokensLimit: number | null;
  tokensRemaining: number | null;
  tokensResetAt: string | null;
  raw: Record<string, string>;
};

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

function parseNumericString(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function humanizeCapability(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseResetHeader(value: string | null): string | null {
  if (!value) return null;

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (numeric > 10_000_000_000) {
      return new Date(numeric).toISOString();
    }

    if (numeric > 1_000_000_000) {
      return new Date(numeric * 1000).toISOString();
    }

    return new Date(Date.now() + numeric * 1000).toISOString();
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function readHeader(headers: Headers, names: string[]): string | null {
  for (const name of names) {
    const value = headers.get(name);
    if (value) return value;
  }
  return null;
}

function inferProvider(id: string, name: string): string {
  const vendor = id.split('/')[0]?.trim();
  if (vendor) {
    return vendor
      .split(/[-_]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return name.split(' ')[0] || 'Unknown';
}

function deriveCapabilities(model: Record<string, unknown>): string[] {
  const architecture = (model.architecture ?? {}) as Record<string, unknown>;
  const inputModalities = Array.isArray(architecture.input_modalities)
    ? architecture.input_modalities.map(String)
    : [];
  const outputModalities = Array.isArray(architecture.output_modalities)
    ? architecture.output_modalities.map(String)
    : [];
  const topProvider = (model.top_provider ?? {}) as Record<string, unknown>;

  const capabilitySet = new Set<string>();

  inputModalities.forEach((item) => capabilitySet.add(`Input: ${humanizeCapability(item)}`));
  outputModalities.forEach((item) => capabilitySet.add(`Output: ${humanizeCapability(item)}`));

  if (parseNumericString(model.context_length)) capabilitySet.add('Long Context');
  if (parseNumericString(topProvider.max_completion_tokens)) capabilitySet.add('Large Output Window');
  if (topProvider.is_moderated === true) capabilitySet.add('Moderated');

  return Array.from(capabilitySet);
}

export function normalizeOpenRouterModel(rawModel: Record<string, unknown>): OpenRouterModel {
  const architecture = (rawModel.architecture ?? {}) as Record<string, unknown>;
  const pricing = (rawModel.pricing ?? {}) as Record<string, unknown>;

  return {
    id: String(rawModel.id ?? ''),
    name: String(rawModel.name ?? rawModel.id ?? 'Unnamed model'),
    description: typeof rawModel.description === 'string' ? rawModel.description : null,
    contextWindow: parseNumericString(rawModel.context_length),
    maxCompletionTokens: parseNumericString((rawModel.top_provider as Record<string, unknown> | undefined)?.max_completion_tokens),
    pricing: {
      prompt: parseNumericString(pricing.prompt),
      completion: parseNumericString(pricing.completion),
      request: parseNumericString(pricing.request),
      image: parseNumericString(pricing.image),
      webSearch: parseNumericString(pricing.web_search),
    },
    provider: inferProvider(String(rawModel.id ?? ''), String(rawModel.name ?? rawModel.id ?? '')),
    architecture: {
      inputModalities: Array.isArray(architecture.input_modalities) ? architecture.input_modalities.map(String) : [],
      outputModalities: Array.isArray(architecture.output_modalities) ? architecture.output_modalities.map(String) : [],
      tokenizer: typeof architecture.tokenizer === 'string' ? architecture.tokenizer : null,
      instructType: typeof architecture.instruct_type === 'string' ? architecture.instruct_type : null,
    },
    capabilities: deriveCapabilities(rawModel),
    raw: rawModel,
  };
}

export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_SITE_NAME || 'Clinical Competency Calculator',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`OpenRouter models request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const rawModels = Array.isArray(payload?.data) ? payload.data : [];

  return rawModels
    .map((model: unknown) => normalizeOpenRouterModel(model as Record<string, unknown>))
    .filter((model: OpenRouterModel) => Boolean(model.id))
    .sort((a: OpenRouterModel, b: OpenRouterModel) => a.name.localeCompare(b.name));
}

export function pickDefaultModelId(models: OpenRouterModel[]): string | null {
  return models[0]?.id ?? null;
}

export function extractUsage(payload: Record<string, unknown> | null | undefined): OpenRouterUsage {
  const usage = (payload?.usage ?? {}) as Record<string, unknown>;

  const promptTokens = parseNumericString(usage.prompt_tokens) ?? 0;
  const completionTokens = parseNumericString(usage.completion_tokens) ?? 0;
  const totalTokens = parseNumericString(usage.total_tokens) ?? promptTokens + completionTokens;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

export function estimateCostUsd(usage: OpenRouterUsage, pricing: OpenRouterPricing): number | null {
  const promptCost = pricing.prompt != null ? usage.promptTokens * pricing.prompt : 0;
  const completionCost = pricing.completion != null ? usage.completionTokens * pricing.completion : 0;
  const requestCost = pricing.request ?? 0;
  const total = promptCost + completionCost + requestCost;

  return Number.isFinite(total) ? total : null;
}

export function extractRateLimits(headers: Headers): OpenRouterRateLimits {
  const rawEntries = Array.from(headers.entries()).filter(([name]) => name.toLowerCase().includes('ratelimit'));
  const raw = Object.fromEntries(rawEntries);

  return {
    requestsLimit: parseNumericString(
      readHeader(headers, ['x-ratelimit-limit-requests', 'ratelimit-limit-requests', 'x-ratelimit-limit'])
    ),
    requestsRemaining: parseNumericString(
      readHeader(headers, ['x-ratelimit-remaining-requests', 'ratelimit-remaining-requests', 'x-ratelimit-remaining'])
    ),
    requestsResetAt: parseResetHeader(
      readHeader(headers, ['x-ratelimit-reset-requests', 'ratelimit-reset-requests', 'x-ratelimit-reset'])
    ),
    tokensLimit: parseNumericString(
      readHeader(headers, ['x-ratelimit-limit-tokens', 'ratelimit-limit-tokens'])
    ),
    tokensRemaining: parseNumericString(
      readHeader(headers, ['x-ratelimit-remaining-tokens', 'ratelimit-remaining-tokens'])
    ),
    tokensResetAt: parseResetHeader(
      readHeader(headers, ['x-ratelimit-reset-tokens', 'ratelimit-reset-tokens'])
    ),
    raw,
  };
}

export async function callOpenRouterChat(args: {
  apiKey: string;
  model: string;
  messages: OpenRouterChatMessage[];
  temperature?: number;
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_SITE_NAME || 'Clinical Competency Calculator',
      },
      body: JSON.stringify({
        model: args.model,
        messages: args.messages,
        temperature: args.temperature ?? 0.2,
      }),
    });

    const latencyMs = Date.now() - startedAt;
    const rawText = await response.text();
    const payload = rawText ? JSON.parse(rawText) : null;

    return {
      response,
      payload,
      rawText,
      latencyMs,
      usage: extractUsage(payload),
      rateLimits: extractRateLimits(response.headers),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
