export type AIModelTier = 'balanced' | 'powerful';

export interface AIModelOption {
  id: string;
  name: string;
  provider: string;
  providerLogo: string;   // short initials shown in the icon box e.g. "Z" or "SF"
  tier: AIModelTier;
  contextWindow: number;
  latencyMs: number;
  tokensPerSec: number;
  description: string;
  strengths: string[];
  bestFor: string;
  badge?: string;
}

// Paid OpenRouter endpoints. Requires a funded OpenRouter account.
export const FREE_AI_MODELS: AIModelOption[] = [
  {
    id: 'google/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    providerLogo: 'G',
    tier: 'balanced',
    contextWindow: 1048576,
    latencyMs: 300,
    tokensPerSec: 150,
    description:
      'Google\'s fastest production model. Sub-300ms latency, 1M context window, and high throughput — ideal for instant clinical comment rewriting.',
    strengths: ['1M context', 'Ultra-fast', 'Low latency'],
    bestFor: 'Quick summarization',
    badge: 'Fastest',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    providerLogo: 'A',
    tier: 'powerful',
    contextWindow: 200000,
    latencyMs: 1500,
    tokensPerSec: 80,
    description:
      "Anthropic's flagship model. Exceptional instruction-following and clinical language precision — ideal when comment quality matters most.",
    strengths: ['200K context', 'Best instruction-following', 'Clinical precision'],
    bestFor: 'High-quality clinical summaries',
    badge: 'Best Quality',
  },
];

export const DEFAULT_MODEL_ID = 'google/gemini-2.0-flash';

export const VALID_MODEL_IDS = new Set(FREE_AI_MODELS.map((m) => m.id));

export function getTierLabel(tier: AIModelTier): string {
  return { balanced: 'Balanced', powerful: 'Powerful' }[tier];
}

export function getTierColor(tier: AIModelTier): string {
  return { balanced: 'primary', powerful: 'warning' }[tier];
}

export function formatContext(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
  return `${tokens}`;
}

export function formatLatency(ms: number): string {
  if (ms >= 1000) return `~${(ms / 1000).toFixed(1)}s`;
  return `~${ms}ms`;
}