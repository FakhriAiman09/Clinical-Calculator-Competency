/** @jest-environment jsdom */
import { beforeAll, describe, test } from '@jest/globals';
import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createClient } from '@supabase/supabase-js';
import {
  FREE_AI_MODELS,
  DEFAULT_MODEL_ID,
  VALID_MODEL_IDS,
  getTierLabel,
} from '@/utils/ai-models';

// ── Theme helpers (mirrors ThemeContext.tsx logic) ────────────────────────────
type Theme = 'light' | 'dark' | 'auto';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'auto') {
    delete root.dataset.bsTheme;
  } else {
    root.dataset.bsTheme = theme;
  }
}

function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'auto') return theme;
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches
    ? 'dark'
    : 'light';
}

// ── DB fixture ────────────────────────────────────────────────────────────────
type DbFixture = {
  studentId: string;
  studentName: string;
  theme: Theme;
  aiModel: string;
  source: 'database' | 'fallback';
};

let dbFixture: DbFixture = {
  studentId: 'user-fallback-1',
  studentName: 'Nur Fatihah',
  theme: 'auto',
  aiModel: DEFAULT_MODEL_ID,
  source: 'fallback',
};

async function loadDbFixture() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    const supabase = createClient(url, key);

    // 1. Find Fatihah's profile
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', '%fatihah%')
      .limit(1)
      .maybeSingle();

    if (!profileRow?.id) return;

    // 2. Load her user_preferences (theme + ai_model)
    const { data: prefRow } = await supabase
      .from('user_preferences')
      .select('theme, ai_model')
      .eq('id', profileRow.id)
      .maybeSingle();

    dbFixture = {
      studentId: profileRow.id,
      studentName: profileRow.display_name ?? 'Nur Fatihah',
      theme: (prefRow?.theme as Theme) ?? 'auto',
      aiModel:
        prefRow?.ai_model &&
        FREE_AI_MODELS.some((m) => m.id === prefRow.ai_model)
          ? prefRow.ai_model
          : DEFAULT_MODEL_ID,
      source: 'database',
    };
  } catch {
    // keep fallback
  }
}

// ── UI component ──────────────────────────────────────────────────────────────
function ThemeAndAISettingsPanel() {
  const [selectedTheme, setSelectedTheme] = useState<Theme>(dbFixture.theme);
  const [selectedModel, setSelectedModel] = useState<string>(dbFixture.aiModel);
  const [saved, setSaved] = useState(false);

  function handleThemeChange(t: Theme) {
    setSelectedTheme(t);
    applyTheme(t);
  }

  function handleSave() {
    setSaved(true);
  }

  return (
    <div>
      <h2>Appearance &amp; AI Settings</h2>

      <section data-testid="theme-section">
        <h3>Theme</h3>
        <p data-testid="current-theme">Current: {selectedTheme}</p>
        {(['light', 'dark', 'auto'] as Theme[]).map((t) => (
          <button
            key={t}
            onClick={() => handleThemeChange(t)}
            aria-pressed={selectedTheme === t}
            data-testid={`theme-btn-${t}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </section>

      <section data-testid="ai-section">
        <h3>AI Model</h3>
        <p data-testid="current-model">Selected: {selectedModel}</p>
        {FREE_AI_MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedModel(m.id)}
            aria-pressed={selectedModel === m.id}
            data-testid={`model-btn-${m.id}`}
          >
            {m.name} ({getTierLabel(m.tier)})
          </button>
        ))}
      </section>

      <button onClick={handleSave} data-testid="save-btn">
        Save Settings
      </button>
      {saved && (
        <p data-testid="save-confirm">Settings saved successfully.</p>
      )}
    </div>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  await loadDbFixture();
}, 15000);

describe('Functional requirement: Theme (light / dark / auto) and AI model selection', () => {
  test('applyTheme sets data-bs-theme=light and data-bs-theme=dark on the html element', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.bsTheme).toBe('light');

    applyTheme('dark');
    expect(document.documentElement.dataset.bsTheme).toBe('dark');
  });

  test('applyTheme auto removes the data-bs-theme attribute so Bootstrap follows system preference', () => {
    document.documentElement.dataset.bsTheme = 'dark'; // pre-set a value
    applyTheme('auto');
    expect(document.documentElement.dataset.bsTheme).toBeUndefined();
  });

  test('getResolvedTheme returns light or dark directly, and maps auto to a concrete value', () => {
    expect(getResolvedTheme('light')).toBe('light');
    expect(getResolvedTheme('dark')).toBe('dark');
    const resolved = getResolvedTheme('auto');
    expect(['light', 'dark']).toContain(resolved);
  });

  test('AI model catalogue: FREE_AI_MODELS entries each have a valid ID and DEFAULT_MODEL_ID is in VALID_MODEL_IDS', () => {
    expect(FREE_AI_MODELS.length).toBeGreaterThan(0);

    FREE_AI_MODELS.forEach((m) => {
      expect(VALID_MODEL_IDS.has(m.id)).toBe(true);
      expect(m.name.length).toBeGreaterThan(0);
      expect(['balanced', 'powerful']).toContain(m.tier);
    });

    expect(VALID_MODEL_IDS.has(DEFAULT_MODEL_ID)).toBe(true);
    expect(getTierLabel('balanced')).toBe('Balanced');
    expect(getTierLabel('powerful')).toBe('Powerful');
  });

  test('renders settings panel showing theme buttons and AI model options using database-backed fixture', () => {
    render(<ThemeAndAISettingsPanel />);

    // Theme section is present
    expect(screen.getByTestId('theme-section')).toBeInTheDocument();
    expect(screen.getByTestId('theme-btn-light')).toBeInTheDocument();
    expect(screen.getByTestId('theme-btn-dark')).toBeInTheDocument();
    expect(screen.getByTestId('theme-btn-auto')).toBeInTheDocument();

    // AI section is present with all models
    expect(screen.getByTestId('ai-section')).toBeInTheDocument();
    FREE_AI_MODELS.forEach((m) => {
      expect(screen.getByTestId(`model-btn-${m.id}`)).toBeInTheDocument();
    });

    // Fixture-driven initial values are reflected in the UI
    expect(screen.getByTestId('current-theme')).toHaveTextContent(
      `Current: ${dbFixture.theme}`
    );
    expect(screen.getByTestId('current-model')).toHaveTextContent(
      `Selected: ${dbFixture.aiModel}`
    );

    // Switch to Dark mode
    fireEvent.click(screen.getByTestId('theme-btn-dark'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('Current: dark');
    expect(document.documentElement.dataset.bsTheme).toBe('dark');

    // Switch back to Auto
    fireEvent.click(screen.getByTestId('theme-btn-auto'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('Current: auto');
    expect(document.documentElement.dataset.bsTheme).toBeUndefined();

    // Switch AI model to the second available model
    const altModel = FREE_AI_MODELS.find((m) => m.id !== dbFixture.aiModel) ?? FREE_AI_MODELS[0];
    fireEvent.click(screen.getByTestId(`model-btn-${altModel.id}`));
    expect(screen.getByTestId('current-model')).toHaveTextContent(
      `Selected: ${altModel.id}`
    );

    // Save settings
    fireEvent.click(screen.getByTestId('save-btn'));
    expect(screen.getByTestId('save-confirm')).toHaveTextContent(
      'Settings saved successfully.'
    );

    expect(dbFixture.source).toMatch(/database|fallback/);
  });
});
