'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { useAIPreferences } from '@/utils/useAIPreferences';
import {
  FREE_AI_MODELS,
  getTierLabel,
  getTierColor,
  formatContext,
  formatLatency,
  AIModel,
} from '@/utils/ai-models';

const FREE_LIMIT = 50;

// Tier colour → CSS hex for reliable dark-mode rendering
const TIER_HEX: Record<string, { bg: string; text: string; border: string }> = {
  primary:  { bg: 'rgba(13,110,253,0.15)',  text: '#6ea8fe', border: 'rgba(13,110,253,0.35)'  },
  warning:  { bg: 'rgba(255,193,7,0.15)',   text: '#ffc107', border: 'rgba(255,193,7,0.35)'   },
  info:     { bg: 'rgba(13,202,240,0.15)',  text: '#6edff6', border: 'rgba(13,202,240,0.35)'  },
  success:  { bg: 'rgba(25,135,84,0.15)',   text: '#75b798', border: 'rgba(25,135,84,0.35)'   },
  secondary:{ bg: 'rgba(108,117,125,0.15)', text: '#adb5bd', border: 'rgba(108,117,125,0.35)' },
  danger:   { bg: 'rgba(220,53,69,0.15)',   text: '#ea868f', border: 'rgba(220,53,69,0.35)'   },
};

// ─── Usage Counter ────────────────────────────────────────────────────────────

function UsageCounter({ remaining, isLoading }: { remaining: number; isLoading: boolean }) {
  const pct     = Math.round((remaining / FREE_LIMIT) * 100);
  const isEmpty = remaining === 0;
  const isLow   = remaining <= 10 && remaining > 0;

  const color = isEmpty ? 'danger' : isLow ? 'warning' : 'success';
  const c     = TIER_HEX[color];

  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${c.border}`,
        background: c.bg,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
      }}
    >
      <i
        className={`bi ${isEmpty ? 'bi-slash-circle' : isLow ? 'bi-exclamation-triangle' : 'bi-lightning-charge'}`}
        style={{ fontSize: '1.2rem', color: c.text, flexShrink: 0 }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: c.text }}>
          {isLoading ? 'Loading usage…' : isEmpty ? 'Daily limit reached' : `${remaining} of ${FREE_LIMIT} requests remaining today`}
        </div>
        <div style={{ fontSize: '0.72rem' }} className="text-muted">
          {isEmpty
            ? 'Resets at midnight UTC. Add ≥$10 credits to OpenRouter for 1,000/day.'
            : isLow
            ? 'Running low — resets at midnight UTC.'
            : 'Free tier · resets daily at midnight UTC'}
        </div>
        {/* Progress bar */}
        {!isLoading && (
          <div
            style={{ marginTop: 6, height: 4, borderRadius: 4, background: 'rgba(128,128,128,0.2)', overflow: 'hidden' }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                borderRadius: 4,
                background: c.text,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────

function StatChip({ icon, label, value, color }: {
  icon: string; label: string; value: string; color: string;
}) {
  const c = TIER_HEX[color] ?? TIER_HEX.secondary;
  return (
    <div
      style={{ minWidth: 80, flex: 1, background: c.bg, borderRadius: 10, padding: '8px 4px' }}
      className="d-flex flex-column align-items-center justify-content-center"
    >
      <i className={`bi ${icon} mb-1`} style={{ fontSize: '1.1rem', color: c.text }} />
      <span className="fw-semibold" style={{ fontSize: '0.82rem' }}>{value}</span>
      <span className="text-muted" style={{ fontSize: '0.68rem' }}>{label}</span>
    </div>
  );
}

// ─── Model Card ───────────────────────────────────────────────────────────────

function ModelCard({ model, selected, onSelect }: {
  model: AIModel; selected: boolean; onSelect: (id: string) => void;
}) {
  const bsColor = getTierColor(model.tier);
  const c       = TIER_HEX[bsColor] ?? TIER_HEX.secondary;

  return (
    <div
      onClick={() => onSelect(model.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(model.id)}
      className={`card h-100 position-relative ${selected ? 'border-primary shadow-sm' : ''}`}
      style={{
        cursor: 'pointer',
        transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
        borderWidth: selected ? 2 : 1,
        outline: selected ? '2px solid var(--bs-primary)' : 'none',
        outlineOffset: 2,
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: 12, right: 12, width: 24, height: 24,
          borderRadius: '50%', background: 'var(--bs-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
        }}>
          <i className="bi bi-check text-white" style={{ fontSize: '1rem', lineHeight: 1 }} />
        </div>
      )}

      {model.badge && (
        <div style={{ position: 'absolute', top: -11, left: 16, zIndex: 3 }}>
          <span className="badge px-2 py-1" style={{
            fontSize: '0.7rem',
            background: 'var(--bs-body-color)',
            color: 'var(--bs-body-bg)',
          }}>
            {model.badge}
          </span>
        </div>
      )}

      <div className="card-body p-4">
        {/* Header */}
        <div className="d-flex align-items-center gap-3 mb-3">
          <div style={{
            width: 48, height: 48, background: c.bg, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <i className={`bi ${model.providerIcon}`} style={{ fontSize: '1.4rem', color: c.text }} />
          </div>
          <div>
            <div className="fw-bold" style={{ fontSize: '1.05rem' }}>{model.name}</div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>{model.provider}</span>
              <span style={{
                fontSize: '0.65rem', fontWeight: 500, padding: '2px 8px', borderRadius: 6,
                background: c.bg, color: c.text, border: `1px solid ${c.border}`,
              }}>
                {getTierLabel(model.tier)}
              </span>
            </div>
          </div>
        </div>

        <p className="text-muted mb-3" style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
          {model.description}
        </p>

        <div className="d-flex gap-2 mb-3">
          <StatChip icon="bi-clock"           label="Latency"  value={formatLatency(model.latencyMs)}      color="info"      />
          <StatChip icon="bi-speedometer2"    label="Speed"    value={`${model.tokensPerSec} t/s`}         color="success"   />
          <StatChip icon="bi-textarea-resize" label="Context"  value={formatContext(model.contextWindow)}  color="secondary" />
        </div>

        <div className="mb-3">
          <div className="text-muted mb-1" style={{
            fontSize: '0.72rem', textTransform: 'uppercase',
            letterSpacing: '0.05em', fontWeight: 600,
          }}>
            Strengths
          </div>
          <div className="d-flex flex-wrap gap-1">
            {model.strengths.map((s) => (
              <span key={s} style={{
                fontSize: '0.72rem', fontWeight: 400, padding: '2px 8px', borderRadius: 6,
                background: TIER_HEX.secondary.bg, color: TIER_HEX.secondary.text,
                border: `1px solid ${TIER_HEX.secondary.border}`,
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        <div style={{
          borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem',
          background: c.bg, border: `1px solid ${c.border}`,
        }}>
          <span className="text-muted">Best for: </span>
          <span style={{ fontWeight: 600, color: c.text }}>{model.bestFor}</span>
        </div>
      </div>

      <div className="card-footer bg-transparent pt-0 pb-3 px-4 border-0">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(model.id); }}
          className={`btn w-100 ${selected ? 'btn-primary' : 'btn-outline-primary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          {selected
            ? <><i className="bi bi-check-circle-fill me-2" />Selected</>
            : <><i className="bi bi-circle me-2" />Select this model</>}
        </button>
      </div>
    </div>
  );
}

// ─── Header Badge ─────────────────────────────────────────────────────────────

function HeaderBadge({ icon, label, color }: { icon: string; label: string; color: string }) {
  const c = TIER_HEX[color] ?? TIER_HEX.secondary;
  return (
    <span style={{
      fontSize: '0.7rem', padding: '3px 10px', borderRadius: 20,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <i className={`bi ${icon}`} />{label}
    </span>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function AIPreferencesSection() {
  const { user } = useUser();
  const { model, remaining, isLoading, saveModel } = useAIPreferences(user?.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved]           = useState(false);
  const [saving, setSaving]         = useState(false);

  // Use saved model from Supabase once loaded, or local selection
  const activeId = selectedId ?? model;
  const hasChanges = selectedId !== null && selectedId !== model;

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    await saveModel(selectedId);
    setSaving(false);
    setSelectedId(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [selectedId, saveModel]);

  return (
    <div className="card mb-4 shadow-sm">
      <div className="card-header d-flex align-items-center justify-content-between py-3">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-robot fs-5" />
          <span className="fw-semibold fs-6">AI Summarizer</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <HeaderBadge icon="bi-tag"   label="Free only"  color="success" />
          <HeaderBadge icon="bi-cloud" label="OpenRouter" color="info"    />
        </div>
      </div>

      <div className="card-body px-4 pt-4 pb-3">

        {/* Usage counter */}
        <UsageCounter remaining={remaining} isLoading={isLoading} />

        {/* Model cards */}
        <div className="row g-3 mb-4">
          {FREE_AI_MODELS.map((m) => (
            <div className="col-12 col-md-6" key={m.id}>
              <ModelCard model={m} selected={activeId === m.id} onSelect={handleSelect} />
            </div>
          ))}
        </div>

        {/* Stat legend */}
        <div className="d-flex gap-4 flex-wrap mb-3">
          {[
            { icon: 'bi-clock',           label: 'Time to first token', color: 'info'      },
            { icon: 'bi-speedometer2',    label: 'Output tokens/sec',   color: 'success'   },
            { icon: 'bi-textarea-resize', label: 'Max context window',  color: 'secondary' },
          ].map((item) => (
            <div key={item.label} className="d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
              <i className={`bi ${item.icon}`} style={{ color: TIER_HEX[item.color]?.text }} />
              <span className="text-muted">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Rate limit note */}
        <div
          className="rounded-3 px-3 py-2 border mb-4"
          style={{ background: 'var(--bs-tertiary-bg, var(--bs-secondary-bg, rgba(128,128,128,0.08)))', fontSize: '0.78rem' }}
        >
          <i className="bi bi-info-circle me-2 text-muted" />
          <span className="text-muted">
            Free models are rate-limited by OpenRouter:{' '}
            <strong>50 requests/day</strong> on a free account, or{' '}
            <strong>1,000/day</strong> after any credit purchase. Resets daily at midnight UTC.
          </span>
        </div>

        {/* Save row */}
        <div className="d-flex justify-content-end align-items-center gap-3">
          {saved && (
            <span className="text-success d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
              <i className="bi bi-check-circle-fill" />
              Preference saved!
            </span>
          )}
          <button
            className="btn btn-primary px-4"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
              : <><i className="bi bi-floppy me-2" />Save preference</>}
          </button>
        </div>
      </div>
    </div>
  );
}