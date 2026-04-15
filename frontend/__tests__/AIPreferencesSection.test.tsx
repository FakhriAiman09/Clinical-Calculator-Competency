/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Supabase client used by useAIPreferences
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockResolvedValue({ error: null }),
  })),
}));

// Mock UserContext
jest.mock('@/context/UserContext', () => ({
  useUser: jest.fn(() => ({ user: { id: 'test-user-id' } })),
}));

// Mock useAIPreferences to control hook state
const saveModelMock = jest.fn();
jest.mock('@/utils/useAIPreferences', () => ({
  FREE_LIMIT: 50,
  useAIPreferences: jest.fn(() => ({
    model: 'z-ai/glm-4.5-air:free',
    remaining: 45,
    isLoading: false,
    saveModel: saveModelMock,
  })),
}));

import AIPreferencesSection from '@/components/AIPreferencesSection';
import { useAIPreferences } from '@/utils/useAIPreferences';

const mockUseAIPreferences = useAIPreferences as jest.Mock;

describe('AIPreferencesSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    saveModelMock.mockResolvedValue(undefined);
    mockUseAIPreferences.mockReturnValue({
      model: 'z-ai/glm-4.5-air:free',
      remaining: 45,
      isLoading: false,
      saveModel: saveModelMock,
    });
  });

  test('renders the AI Summarizer heading', () => {
    render(<AIPreferencesSection />);
    expect(screen.getByText('AI Summarizer')).toBeInTheDocument();
  });

  test('renders usage counter with remaining count', () => {
    render(<AIPreferencesSection />);
    expect(screen.getByText(/45 of 50 requests remaining today/i)).toBeInTheDocument();
  });

  test('renders a model card for each free model', async () => {
    const { FREE_AI_MODELS } = await import('@/utils/ai-models');
    render(<AIPreferencesSection />);
    for (const model of FREE_AI_MODELS) {
      expect(screen.getByText(model.name)).toBeInTheDocument();
    }
  });

  test('Save button is disabled when no model change is made', () => {
    render(<AIPreferencesSection />);
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  test('Save button enables after selecting a different model', async () => {
    const { FREE_AI_MODELS } = await import('@/utils/ai-models');
    // Find a model that is not the current one
    const otherModel = FREE_AI_MODELS.find((m) => m.id !== 'z-ai/glm-4.5-air:free');
    if (!otherModel) return;

    render(<AIPreferencesSection />);

    const selectButtons = screen.getAllByRole('button', { name: /select this model/i });
    fireEvent.click(selectButtons[0]);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  test('calls saveModel when Save button is clicked', async () => {
    render(<AIPreferencesSection />);

    const selectButtons = screen.getAllByRole('button', { name: /select this model/i });
    fireEvent.click(selectButtons[0]);

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveModelMock).toHaveBeenCalled();
    });
  });

  test('shows loading state when isLoading is true', () => {
    mockUseAIPreferences.mockReturnValue({
      model: 'z-ai/glm-4.5-air:free',
      remaining: 50,
      isLoading: true,
      saveModel: saveModelMock,
    });

    render(<AIPreferencesSection />);
    expect(screen.getByText(/loading usage/i)).toBeInTheDocument();
  });

  test('shows daily limit reached when remaining is 0', () => {
    mockUseAIPreferences.mockReturnValue({
      model: 'z-ai/glm-4.5-air:free',
      remaining: 0,
      isLoading: false,
      saveModel: saveModelMock,
    });

    render(<AIPreferencesSection />);
    expect(screen.getByText(/daily limit reached/i)).toBeInTheDocument();
  });

  test('shows running low warning when remaining is low', () => {
    mockUseAIPreferences.mockReturnValue({
      model: 'z-ai/glm-4.5-air:free',
      remaining: 5,
      isLoading: false,
      saveModel: saveModelMock,
    });

    render(<AIPreferencesSection />);
    expect(screen.getByText(/running low/i)).toBeInTheDocument();
  });
});
