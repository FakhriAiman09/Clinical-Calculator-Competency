/** @jest-environment jsdom */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSingle   = jest.fn();
const mockUpsert   = jest.fn().mockResolvedValue({ error: null });
const mockEq       = jest.fn().mockReturnThis();
const mockSelect   = jest.fn().mockReturnThis();
const mockFromFn   = jest.fn(() => ({
  select: mockSelect,
  eq:     mockEq,
  single: mockSingle,
  upsert: mockUpsert,
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({ from: mockFromFn })),
}));

jest.mock('@/utils/ai-models', () => ({
  DEFAULT_MODEL_ID:  'z-ai/glm-4.5-air:free',
  FREE_AI_MODELS:    [
    { id: 'z-ai/glm-4.5-air:free',       name: 'GLM 4.5 Air' },
    { id: 'meta-llama/llama-3:free',      name: 'Llama 3' },
  ],
}));

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ replace: mockReplace })),
}));

const mockUseUser = jest.fn();
jest.mock('@/context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { useAIPreferences, FREE_LIMIT } from '@/utils/useAIPreferences';
import { useRequireRole }               from '@/utils/useRequiredRole';

// ─── useAIPreferences ─────────────────────────────────────────────────────────

describe('useAIPreferences', () => {
  const TODAY = new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  test('returns defaults and sets isLoading=false when userId is undefined', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAIPreferences(undefined));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.model).toBe('z-ai/glm-4.5-air:free');
    expect(result.current.usageCount).toBe(0);
    expect(result.current.remaining).toBe(FREE_LIMIT);
  });

  test('loads preferences from supabase when userId is provided', async () => {
    mockSingle.mockResolvedValue({
      data:  { ai_model: 'meta-llama/llama-3:free', ai_usage_count: 10, ai_usage_date: TODAY },
      error: null,
    });

    const { result } = renderHook(() => useAIPreferences('user-123'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.model).toBe('meta-llama/llama-3:free');
    expect(result.current.usageCount).toBe(10);
    expect(result.current.remaining).toBe(FREE_LIMIT - 10);
  });

  test('falls back to DEFAULT_MODEL_ID when stored model is not in FREE_AI_MODELS', async () => {
    mockSingle.mockResolvedValue({
      data:  { ai_model: 'unknown-model', ai_usage_count: 0, ai_usage_date: TODAY },
      error: null,
    });

    const { result } = renderHook(() => useAIPreferences('user-123'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.model).toBe('z-ai/glm-4.5-air:free');
  });

  test('handles supabase error gracefully — keeps defaults', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('DB error') });

    const { result } = renderHook(() => useAIPreferences('user-123'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.model).toBe('z-ai/glm-4.5-air:free');
    expect(result.current.usageCount).toBe(0);
  });

  test('treats usage from a past date as 0 (effectiveCount resets)', async () => {
    mockSingle.mockResolvedValue({
      data:  { ai_model: null, ai_usage_count: 30, ai_usage_date: '2000-01-01' },
      error: null,
    });

    const { result } = renderHook(() => useAIPreferences('user-123'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // usageDate !== today → effectiveCount is 0
    expect(result.current.usageCount).toBe(0);
    expect(result.current.remaining).toBe(FREE_LIMIT);
  });

  test('saveModel updates state and calls supabase upsert', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAIPreferences('user-123'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.saveModel('meta-llama/llama-3:free');
    });

    expect(result.current.model).toBe('meta-llama/llama-3:free');
    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'user-123', ai_model: 'meta-llama/llama-3:free' },
      { onConflict: 'id' },
    );
  });

  test('saveModel does nothing when userId is undefined', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAIPreferences(undefined));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.saveModel('meta-llama/llama-3:free');
    });

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  test('incrementUsage increments count on the same day', async () => {
    mockSingle.mockResolvedValue({
      data:  { ai_model: null, ai_usage_count: 5, ai_usage_date: TODAY },
      error: null,
    });

    const { result } = renderHook(() => useAIPreferences('user-123'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.incrementUsage();
    });

    expect(result.current.usageCount).toBe(6);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ ai_usage_count: 6, ai_usage_date: TODAY }),
      { onConflict: 'id' },
    );
  });

  test('incrementUsage resets to 1 when it is a new day', async () => {
    mockSingle.mockResolvedValue({
      data:  { ai_model: null, ai_usage_count: 20, ai_usage_date: '2000-01-01' },
      error: null,
    });

    const { result } = renderHook(() => useAIPreferences('user-123'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.incrementUsage();
    });

    expect(result.current.usageCount).toBe(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ ai_usage_count: 1, ai_usage_date: TODAY }),
      { onConflict: 'id' },
    );
  });

  test('incrementUsage does nothing when userId is undefined', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAIPreferences(undefined));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.incrementUsage();
    });

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  test('handles missing ai_usage_count and ai_usage_date (null) from DB', async () => {
    mockSingle.mockResolvedValue({
      data:  { ai_model: null, ai_usage_count: null, ai_usage_date: null },
      error: null,
    });

    const { result } = renderHook(() => useAIPreferences('user-123'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.usageCount).toBe(0);
    expect(result.current.remaining).toBe(FREE_LIMIT);
  });
});

// ─── useRequireRole ───────────────────────────────────────────────────────────

describe('useRequireRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not redirect while loading', () => {
    mockUseUser.mockReturnValue({
      loading:             true,
      userRoleAuthorized:  false,
      userRoleRater:       false,
      userRoleStudent:     false,
      userRoleDev:         false,
    });

    renderHook(() => useRequireRole(['admin']));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('does not redirect when admin role is required and userRoleAuthorized is true', () => {
    mockUseUser.mockReturnValue({
      loading:             false,
      userRoleAuthorized:  true,
      userRoleRater:       false,
      userRoleStudent:     false,
      userRoleDev:         false,
    });

    renderHook(() => useRequireRole(['admin']));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('does not redirect when rater role is required and userRoleRater is true', () => {
    mockUseUser.mockReturnValue({
      loading:             false,
      userRoleAuthorized:  false,
      userRoleRater:       true,
      userRoleStudent:     false,
      userRoleDev:         false,
    });

    renderHook(() => useRequireRole(['rater']));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('does not redirect when student role is required and userRoleStudent is true', () => {
    mockUseUser.mockReturnValue({
      loading:             false,
      userRoleAuthorized:  false,
      userRoleRater:       false,
      userRoleStudent:     true,
      userRoleDev:         false,
    });

    renderHook(() => useRequireRole(['student']));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('does not redirect when dev role is required and userRoleDev is true', () => {
    mockUseUser.mockReturnValue({
      loading:             false,
      userRoleAuthorized:  false,
      userRoleRater:       false,
      userRoleStudent:     false,
      userRoleDev:         true,
    });

    renderHook(() => useRequireRole(['dev']));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('redirects to /no-auth when role is not matched after loading', () => {
    mockUseUser.mockReturnValue({
      loading:             false,
      userRoleAuthorized:  false,
      userRoleRater:       false,
      userRoleStudent:     false,
      userRoleDev:         false,
    });

    renderHook(() => useRequireRole(['admin']));

    expect(mockReplace).toHaveBeenCalledWith('/no-auth');
  });

  test('does not redirect when one of multiple required roles matches', () => {
    mockUseUser.mockReturnValue({
      loading:             false,
      userRoleAuthorized:  false,
      userRoleRater:       true,
      userRoleStudent:     false,
      userRoleDev:         false,
    });

    renderHook(() => useRequireRole(['admin', 'rater']));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('redirects when no role from the required list matches', () => {
    mockUseUser.mockReturnValue({
      loading:             false,
      userRoleAuthorized:  false,
      userRoleRater:       false,
      userRoleStudent:     true,
      userRoleDev:         false,
    });

    renderHook(() => useRequireRole(['admin', 'rater', 'dev']));

    expect(mockReplace).toHaveBeenCalledWith('/no-auth');
  });
});
