export type AIModelTier = 'balanced' | 'powerful';

export interface AIModelOption {
  id: string;
  name: string;
  provider: string;
  providerIcon: string;
  tier: AIModelTier;
  contextWindow: number;
  latencyMs: number;
  tokensPerSec: number;
  description: string;
  strengths: string[];
  bestFor: string;
  badge?: string;
}

// Confirmed free from live OpenRouter API Feb 2026
export const FREE_AI_MODELS: AIModelOption[] = [
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    providerIcon: 'bi-cpu',
    tier: 'balanced',
    contextWindow: 131072,
    latencyMs: 800,
    tokensPerSec: 50,
    description:
      "Meta's flagship open-source 70B model. Reliable, well-tested, and consistently available. Strong instruction following for clinical summarization.",
    strengths: ['128K context', 'Reliable', 'Strong instruction following'],
    bestFor: 'Everyday summarization & quick reports',
    badge: 'Fast',
  },
  {
    id: 'qwen/qwen3-235b-a22b:free',
    name: 'Qwen3 235B',
    provider: 'Qwen',
    providerIcon: 'bi-stars',
    tier: 'powerful',
    contextWindow: 262144,
    latencyMs: 1200,
    tokensPerSec: 35,
    description:
      'Qwen3 flagship MoE model with 235B total parameters. Exceptional reasoning and instruction following with a 262K context window.',
    strengths: ['262K context', 'Top reasoning', 'MoE efficiency'],
    bestFor: 'High-quality clinical summaries',
    badge: 'Best Quality',
  },
];

export const DEFAULT_MODEL_ID = 'meta-llama/llama-3.3-70b-instruct:free';

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