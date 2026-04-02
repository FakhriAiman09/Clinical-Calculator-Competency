import { beforeAll, beforeEach, describe, jest, test } from '@jest/globals';
import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------
// DB fixture — real student/request loaded from Supabase when env
// vars are present; safe fallback values used otherwise.
// ----------------------------------------------------------------
type DbFixture = {
  requestId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  completedBy: string;
  source: 'database' | 'fallback';
};

let dbFixture: DbFixture = {
  requestId: 'req-test-1',
  studentId: 'student-test-1',
  studentName: 'Nur Fatihah',
  studentEmail: 'rfatihah89@gmail.com',
  completedBy: 'rater-test-1',
  source: 'fallback',
};

async function loadDbFixture(): Promise<DbFixture> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return dbFixture;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Find Nur Fatihah's profile by display_name.
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, display_name')
    .ilike('display_name', '%fatihah%')
    .limit(1)
    .maybeSingle();

  if (!profileRow?.id) return dbFixture;

  const studentId = String(profileRow.id);
  const studentName = String(profileRow.display_name).trim();

  // Find a form_request belonging to Nur Fatihah.
  const { data: requestRow } = await supabase
    .from('form_requests')
    .select('id, completed_by')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle();

  if (!requestRow?.id) return dbFixture;

  // Resolve her email from the auth users RPC.
  let studentEmail = dbFixture.studentEmail;
  const { data: users } = await supabase.rpc('fetch_users');
  if (Array.isArray(users)) {
    const studentUser = users.find(
      (u: { user_id?: string; email?: string }) => u.user_id === studentId
    );
    studentEmail = studentUser?.email ?? studentEmail;
  }

  return {
    requestId: String(requestRow.id),
    studentId,
    studentName,
    studentEmail,
    completedBy: String(requestRow.completed_by ?? 'rater-1'),
    source: 'database',
  };
}

// ----------------------------------------------------------------
// Controllable SpeechRecognition mock
// Captures the instance created by useEffect so tests can fire
// onresult / onstart / onend callbacks directly.
// ----------------------------------------------------------------
let mockRecognitionInstance: MockSpeechRecognition | null = null;

class MockSpeechRecognition {
  lang = '';
  interimResults = false;
  continuous = false;
  onstart: ((e: Event) => void) | null = null;
  onend: ((e: Event) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onresult: ((e: {
    resultIndex: number;
    results: Array<{ isFinal: boolean } & { 0: { transcript: string } }>;
  }) => void) | null = null;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockRecognitionInstance = this;
  }

  start() {
    if (this.onstart) this.onstart(new Event('start'));
  }

  stop() {
    if (this.onend) this.onend(new Event('end'));
  }
}

// Fires a finalised transcript through the recognition instance.
function simulateTranscript(transcript: string) {
  if (!mockRecognitionInstance?.onresult) return;
  const result = Object.assign([{ transcript }], { isFinal: true }) as unknown as {
    isFinal: boolean;
  } & { 0: { transcript: string } };
  mockRecognitionInstance.onresult({ resultIndex: 0, results: [result] });
}

// ----------------------------------------------------------------
// All jest.mock calls must appear before any imports of mocked modules.
// ----------------------------------------------------------------

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: jest.fn(),
}));

jest.mock('@/context/UserContext', () => ({
  useUser: () => ({ user: { id: 'rater-1' } }),
}));

const incrementUsageMock = jest.fn(async () => {});
jest.mock('@/utils/useAIPreferences', () => ({
  useAIPreferences: () => ({
    model: 'z-ai/glm-4.5-air:free',
    incrementUsage: incrementUsageMock,
  }),
}));

// useSearchParams returns the DB-backed requestId — read lazily so beforeAll update is picked up.
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 'id' ? dbFixture.requestId : null) }),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock('lodash', () => ({
  debounce: (fn: (...args: unknown[]) => void) => fn,
}));

// EPA 3 key-function question data used to render the form.
jest.mock('@/utils/get-epa-data', () => ({
  getLatestMCQs: jest.fn(async () => [
    {
      epa: '3',
      kf: '1',
      question: 'Describe clinical reasoning for EPA 3',
      options: {
        '3.1.1': 'Observed',
        '3.1.2': 'Not observed',
      },
    },
  ]),
}));

jest.mock('@/app/dashboard/rater/form/rater-email-api/send-email-rater.server', () => ({
  sendEmail: jest.fn(async () => ({ message: 'Rater notification email sent', id: 'msg-1' })),
}));

// Mocked DB insert and update — assertions in the submit test use these.
const insertMock = jest.fn(async (_payload: unknown) => ({ error: null }));
const updateMock = jest.fn(() => ({
  eq: jest.fn(async () => ({ error: null })),
}));

// Single fromMock that returns the right chain per table, referencing dbFixture lazily.
const fromMock = jest.fn((table: string) => {
  if (table === 'form_requests') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(async () => ({
            data: {
              id: dbFixture.requestId,
              created_at: '2026-03-01T00:00:00Z',
              student_id: dbFixture.studentId,
              completed_by: dbFixture.completedBy,
              clinical_settings: 'Clinic',
              notes: 'Observed during EPA 3',
              goals: 'Improve clinical reasoning',
              email: dbFixture.studentEmail,
            },
            error: null,
          })),
        })),
      })),
      update: updateMock,
    };
  }

  if (table === 'form_responses') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(async () => ({ data: null, error: { message: 'Not found' } })),
        })),
      })),
      insert: insertMock,
    };
  }

  if (table === 'epa_kf_descriptions') {
    return {
      select: jest.fn(async () => ({
        data: [
          {
            epa_descriptions: {
              '3': 'Manages patients with common acute and chronic conditions',
            },
          },
        ],
        error: null,
      })),
    };
  }

  return { select: jest.fn(async () => ({ data: [], error: null })) };
});

const rpcMock = jest.fn(async () => ({
  data: [
    {
      user_id: dbFixture.studentId,
      display_name: dbFixture.studentName,
      email: dbFixture.studentEmail,
    },
  ],
  error: null,
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ from: fromMock, rpc: rpcMock }),
}));

// Import the component after all mocks are registered.
import RaterFormsPage from '@/app/dashboard/rater/form/RaterFormsPage';

// ----------------------------------------------------------------
// Test suite
// ----------------------------------------------------------------
describe('Functional requirement: rater EPA 3 evaluation via speech-to-text and AI assistant', () => {
  beforeAll(async () => {
    // Install SpeechRecognition mock on window before any component mounts.
    Object.defineProperty(window, 'SpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
    });

    // Load real student/request data from Supabase if env vars exist.
    dbFixture = await loadDbFixture();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockRecognitionInstance = null;

    // Mock fetch to return a deterministic AI summary.
    Object.defineProperty(global, 'fetch', {
      value: jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          summary: 'AI-generated clinical summary for EPA 3.',
        }),
      })),
      writable: true,
    });

    Object.defineProperty(window, 'scrollTo', { value: jest.fn(), writable: true });
    Object.defineProperty(global, 'IntersectionObserver', {
      value: class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
      writable: true,
    });
  });

  // ----------------------------------------------------------------
  // Shared helper: render page, select EPA 3, open the EPA form, return textarea.
  // ----------------------------------------------------------------
  async function openEPA3Form() {
    render(React.createElement(RaterFormsPage));

    // Wait for the EPA selection panel.
    await waitFor(() => {
      expect(screen.getByText('Submit Selection')).toBeInTheDocument();
    });

    // Select EPA 3.
    fireEvent.click(screen.getByRole('button', { name: /EPA\s*3/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit Selection' })).not.toBeDisabled();
    });

    // Collapse selection and open the EPA 3 form.
    fireEvent.click(screen.getByRole('button', { name: 'Submit Selection' }));

    // The EPA 3 comment textarea should now be visible.
    const textarea = await screen.findByPlaceholderText('Additional comments ...');
    return textarea as HTMLTextAreaElement;
  }

  // ----------------------------------------------------------------
  // Test 1: Mic button starts listening and transcribed text lands in textarea.
  // ----------------------------------------------------------------
  test('mic button starts listening and transcribes voice input into EPA 3 comment field', async () => {
    const textarea = await openEPA3Form();

    const micButton = screen.getByTitle('Start voice input');
    expect(micButton).toBeInTheDocument();

    // Start recording — triggers MockSpeechRecognition.start() → onstart fires.
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(screen.getByTitle('Stop voice input')).toBeInTheDocument();
    });

    // Simulate a finalised spoken transcript.
    act(() => {
      simulateTranscript(
        'Student demonstrated strong clinical reasoning during the EPA 3 encounter.'
      );
    });

    await waitFor(() => {
      expect(textarea.value).toContain(
        'Student demonstrated strong clinical reasoning during the EPA 3 encounter.'
      );
    });

    // Stop recording.
    fireEvent.click(screen.getByTitle('Stop voice input'));

    await waitFor(() => {
      expect(screen.getByTitle('Start voice input')).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------------
  // Test 2: AI button generates a summary from comment text.
  // ----------------------------------------------------------------
  test('AI button generates an improved summary from the EPA 3 comment field', async () => {
    const textarea = await openEPA3Form();

    // Simulate transcript text already in the field (e.g. from mic or manual entry).
    fireEvent.change(textarea, {
      target: { value: 'Student demonstrated strong clinical reasoning during the EPA 3 encounter.' },
    });

    // Click AI summary button.
    fireEvent.click(screen.getByTitle('Generate AI summary from comments'));

    await waitFor(() => {
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('AI-generated clinical summary for EPA 3.')).toBeInTheDocument();
      expect(screen.getByText('Insert')).toBeInTheDocument();
      expect(screen.getByText('Replace')).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------------
  // Test 3: Insert appends AI summary while keeping the original comment.
  // ----------------------------------------------------------------
  test('Insert action appends AI summary to existing comment without losing original text', async () => {
    const textarea = await openEPA3Form();

    fireEvent.change(textarea, {
      target: { value: 'Student demonstrated strong clinical reasoning during the EPA 3 encounter.' },
    });

    fireEvent.click(screen.getByTitle('Generate AI summary from comments'));
    await waitFor(() => expect(screen.getByText('Insert')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Insert'));

    await waitFor(() => {
      expect(textarea.value).toContain(
        'Student demonstrated strong clinical reasoning during the EPA 3 encounter.'
      );
      expect(textarea.value).toContain('AI-generated clinical summary for EPA 3.');
    });
  });

  // ----------------------------------------------------------------
  // Test 4: Replace swaps the original comment with the AI summary only.
  // ----------------------------------------------------------------
  test('Replace action replaces original comment with AI summary only', async () => {
    const textarea = await openEPA3Form();

    fireEvent.change(textarea, {
      target: { value: 'Student demonstrated strong clinical reasoning during the EPA 3 encounter.' },
    });

    fireEvent.click(screen.getByTitle('Generate AI summary from comments'));
    await waitFor(() => expect(screen.getByText('Replace')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Replace'));

    await waitFor(() => {
      expect(textarea.value).toBe('AI-generated clinical summary for EPA 3.\n');
      expect(textarea.value).not.toContain('demonstrated strong clinical reasoning');
    });
  });

  // ----------------------------------------------------------------
  // Test 5: Full flow — voice input → AI improve → Insert → mark complete
  //          → professionalism → Submit Final Evaluation → DB insert called.
  // ----------------------------------------------------------------
  test('completes EPA 3 evaluation from voice transcript to final submission into database', async () => {
    const textarea = await openEPA3Form();

    // Step 1: Simulate speech-to-text transcript via mic.
    const micButton = screen.getByTitle('Start voice input');
    fireEvent.click(micButton);

    await waitFor(() => expect(screen.getByTitle('Stop voice input')).toBeInTheDocument());

    act(() => {
      simulateTranscript('Student showed excellent management of acute conditions in clinic.');
    });

    await waitFor(() => {
      expect(textarea.value).toContain(
        'Student showed excellent management of acute conditions in clinic.'
      );
    });

    fireEvent.click(screen.getByTitle('Stop voice input'));

    // Step 2: Generate AI summary from the transcribed comment.
    fireEvent.click(screen.getByTitle('Generate AI summary from comments'));
    await waitFor(() => expect(screen.getByText('Insert')).toBeInTheDocument());

    // Step 3: Insert AI summary — keeping the original + AI summary in textarea.
    fireEvent.click(screen.getByText('Insert'));
    await waitFor(() => {
      expect(textarea.value).toContain('AI-generated clinical summary for EPA 3.');
    });

    // Step 4: Mark EPA 3 as completed — triggers professionalism form.
    fireEvent.click(screen.getByText('Mark as Completed'));

    // Step 5: Professionalism form should appear.
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Describe the student's professionalism...")
      ).toBeInTheDocument();
    });

    // Step 6: Fill in the professionalism comment.
    const profTextarea = screen.getByPlaceholderText(
      "Describe the student's professionalism..."
    );
    fireEvent.change(profTextarea, {
      target: { value: 'Student showed excellent communication and professionalism throughout.' },
    });

    // Step 7: Submit final evaluation — triggers DB insert into form_responses.
    fireEvent.click(screen.getByText('Submit Final Evaluation'));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: dbFixture.requestId,
          professionalism: expect.stringContaining('excellent communication and professionalism'),
        })
      );
    });
  });
});
