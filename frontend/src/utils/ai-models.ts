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

// Confirmed free endpoints on OpenRouter as of Feb 2026.
// Check https://openrouter.ai/models?q=:free for the current list.
// IMPORTANT: Your OpenRouter account must have "Enable free endpoints that may train on inputs"
// turned ON in Privacy Settings or free models will return "No endpoints found" errors.
export const FREE_AI_MODELS: AIModelOption[] = [
  {
    id: 'z-ai/glm-4.5-air:free',
    name: 'GLM 4.5 Air',
    provider: 'Z-AI',
    providerLogo: 'Z',
    tier: 'balanced',
    contextWindow: 131072,
    latencyMs: 400,
    tokensPerSec: 80,
    description:
      'Lightweight MoE model built for speed. Low latency and high throughput make it ideal for quick summarization tasks.',
    strengths: ['128K context', 'Very fast', 'Low latency'],
    bestFor: 'Quick summarization',
    badge: 'Fastest',
  },
  {
    id: 'stepfun/step-3.5-flash:free',
    name: 'Step 3.5 Flash',
    provider: 'StepFun',
    providerLogo: 'SF',
    tier: 'powerful',
    contextWindow: 262144,
    latencyMs: 1000,
    tokensPerSec: 45,
    description:
      "StepFun's most capable open-source model. 196B sparse MoE with 11B active parameters and 256K context. Strong reasoning without the slowdown of a dedicated reasoning model.",
    strengths: ['256K context', 'Strong reasoning', 'MoE efficiency'],
    bestFor: 'High-quality clinical summaries',
    badge: 'Best Quality',
  },
];

export const DEFAULT_MODEL_ID = 'z-ai/glm-4.5-air:free';

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