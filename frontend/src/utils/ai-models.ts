/**
 * Free models available on OpenRouter.
 * All models listed here are $0/token (free tier).
 * Rate limit: 50 req/day (free), 1,000 req/day with ≥$10 credits purchased.
 *
 * Latency / throughput figures are approximate medians observed on OpenRouter.
 * "tokensPerSec" is output throughput.
 */

export type AIModelTier = 'balanced' | 'powerful';

export interface AIModel {
  id: string;           // OpenRouter model slug
  name: string;         // Human-readable name
  provider: string;     // Company
  providerIcon: string; // Bootstrap icon class
  tier: AIModelTier;
  contextWindow: number; // tokens
  latencyMs: number;    // approx time-to-first-token (ms)
  tokensPerSec: number; // approx output throughput
  description: string;
  strengths: string[];
  bestFor: string;
  badge?: string;
}

export const FREE_AI_MODELS: AIModel[] = [
  {
    id: 'qwen/qwen3-8b:free',
    name: 'Qwen3 8B',
    provider: 'Alibaba',
    providerIcon: 'bi-cpu',
    tier: 'balanced',
    contextWindow: 40960,
    latencyMs: 700,
    tokensPerSec: 55,
    description:
      'A strong 8B model with solid instruction following and multilingual capabilities. The sweet spot between speed and quality — ideal for everyday clinical report summarization.',
    strengths: ['Fast responses', 'Strong reasoning', 'Multilingual support'],
    bestFor: 'Everyday summarization & quick reports',
    badge: 'Recommended',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    providerIcon: 'bi-meta',
    tier: 'powerful',
    contextWindow: 131072,
    latencyMs: 1800,
    tokensPerSec: 30,
    description:
      "Meta's flagship open-source 70B model. Near-frontier quality for nuanced, detailed clinical summaries. Takes a bit longer but produces noticeably richer output.",
    strengths: ['Near-GPT-4 quality', '128K context window', 'Deep reasoning'],
    bestFor: 'High-stakes summaries & complex reports',
    badge: 'Best Quality',
  },
];

export const DEFAULT_MODEL_ID = 'qwen/qwen3-8b:free';

export function getTierLabel(tier: AIModelTier): string {
  return { balanced: 'Balanced', powerful: 'Powerful' }[tier];
}

export function getTierColor(tier: AIModelTier): string {
  return { balanced: 'primary', powerful: 'warning' }[tier];
}

export function formatContext(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
  return `${tokens}`;
}

export function formatLatency(ms: number): string {
  if (ms >= 1000) return `~${(ms / 1000).toFixed(1)}s`;
  return `~${ms}ms`;
}