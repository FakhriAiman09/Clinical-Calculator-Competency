const sendRaterEmailMock = jest.fn();

const formRequestsUpdateEqMock = jest.fn();
const formRequestsUpdateMock = jest.fn(() => ({
  eq: formRequestsUpdateEqMock,
}));

const formResponsesUpdateEqMock = jest.fn();
const formResponsesUpdateMock = jest.fn(() => ({
  eq: formResponsesUpdateEqMock,
}));

const formResponsesInsertMock = jest.fn();

const fromMock = jest.fn((table: string) => {
  if (table === 'form_requests') {
    return {
      update: formRequestsUpdateMock,
    };
  }

  if (table === 'form_responses') {
    return {
      update: formResponsesUpdateMock,
      insert: formResponsesInsertMock,
    };
  }

  return {};
});

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: fromMock,
  }),
}));

jest.mock('@/app/dashboard/rater/form/rater-email-api/send-email-rater.server', () => ({
  sendEmail: sendRaterEmailMock,
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: jest.fn(),
}));

jest.mock('@/context/UserContext', () => ({
  useUser: () => ({ user: { id: 'rater-1' } }),
}));

jest.mock('@/utils/useAIPreferences', () => ({
  useAIPreferences: () => ({ model: 'mock-model', incrementUsage: jest.fn() }),
}));

jest.mock('@/utils/get-epa-data', () => ({
  getLatestMCQs: jest.fn(async () => []),
}));

jest.mock('lodash', () => ({
  debounce: (fn: (...args: unknown[]) => void) => fn,
}));

import {
  aggregateByKF,
  appendTranscript,
  buildKfToQuestionsMap,
  buildQuestionMapping,
  buildSubmissionData,
  callAISummaryAPI,
  compareNumericDotStrings,
  getErrorMessage,
  getProfessionalismSubmitLabel,
  getSummaryGuard,
  getTargetFieldKey,
  makeFieldKey,
  mergeTextInputsIntoResponses,
  pruneProgressCacheToSelectedEpas,
  rebuildResponsesFromAggregated,
  removeEpaFromProgressCache,
  sendRaterNotificationEmail,
  sortAggregatedByEpaAndKf,
  stopRecognitionSafely,
  submitFinalEvaluation,
  upsertFormResponse,
} from '@/app/dashboard/rater/form/RaterFormsPage';

describe('RaterFormsPage helper coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    localStorage.clear();
    Object.defineProperty(globalThis, 'fetch', {
      value: jest.fn(),
      writable: true,
    });
  });

  test('covers summary guards and simple utility helpers', () => {
    expect(compareNumericDotStrings('1.2', '1.10')).toBeLessThan(0);
    expect(compareNumericDotStrings('2', '1.9')).toBeGreaterThan(0);
    expect(compareNumericDotStrings('1.0', '1')).toBe(0);

    expect(getSummaryGuard('', '1.1')).toEqual({ canApply: false, message: '' });
    expect(getSummaryGuard('Not clinical evaluation content.', '1.1')).toEqual({
      canApply: false,
      message: 'This result cannot be inserted or replaced.',
    });
    expect(getSummaryGuard('Unclear source text.', '1.1')).toEqual({
      canApply: false,
      message: 'This result cannot be inserted or replaced.',
    });
    expect(getSummaryGuard('Not related to history taking.', '1.1')).toEqual({
      canApply: false,
      message: 'This result cannot be inserted or replaced.',
    });
    expect(getSummaryGuard('Actionable summary', '1.1')).toEqual({
      canApply: true,
      message: '',
    });

    expect(makeFieldKey(3, 'q1')).toBe('3::q1');
    expect(getTargetFieldKey({ type: 'epa', epaId: 3, questionId: 'q1' })).toBe('3::q1');
    expect(getTargetFieldKey({ type: 'professionalism' })).toBe('professionalism');
    expect(getTargetFieldKey(null)).toBeNull();

    expect(appendTranscript('', '  one  ')).toBe('one');
    expect(appendTranscript('first', ' second ')).toBe('first second');
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(getErrorMessage('bad', 'fallback')).toBe('fallback');

    expect(getProfessionalismSubmitLabel(false, false)).toBe('Submit Final Evaluation');
    expect(getProfessionalismSubmitLabel(false, true)).toBe('Update Evaluation');
    expect(getProfessionalismSubmitLabel(true, false)).toBe('Submitting...');
    expect(getProfessionalismSubmitLabel(true, true)).toBe('Updating...');
  });

  test('stops recognition safely even when stop throws', () => {
    const safeStop = jest.fn();
    const throwingStop = jest.fn(() => {
      throw new Error('ignore');
    });

    expect(() => stopRecognitionSafely({ stop: safeStop })).not.toThrow();
    expect(() => stopRecognitionSafely({ stop: throwingStop })).not.toThrow();
    expect(safeStop).toHaveBeenCalled();
    expect(throwingStop).toHaveBeenCalled();
  });

  test('rebuilds and aggregates responses by EPA and key function', () => {
    const kfData = [
      {
        epa: 1,
        kf: '1',
        question: 'Question A',
        options: { good: 'Good', warn: 'Warning' },
        questionId: 'q-1',
      },
      {
        epa: 1,
        kf: '1',
        question: 'Question B',
        options: { good: 'Good', warn: 'Warning' },
        questionId: 'q-2',
      },
      {
        epa: 2,
        kf: '2',
        question: 'Question C',
        options: { ready: 'Ready' },
        questionId: 'q-3',
      },
    ];

    const aggregatedResponses = {
      '1': {
        '1': {
          good: true,
          warn: false,
          text: ['1.10', '1.2'],
        },
      },
      '2': {
        '2': {
          ready: true,
          text: ['2.1'],
        },
      },
    };

    const kfToQuestions = buildKfToQuestionsMap(kfData as never[]);
    expect(kfToQuestions['1.1']).toHaveLength(2);
    expect(kfToQuestions['2.2']).toHaveLength(1);

    const rebuilt = rebuildResponsesFromAggregated(aggregatedResponses, kfToQuestions);
    expect(rebuilt.rebuiltResponses[1]['q-1']).toMatchObject({ good: true, warn: false, text: '1.10' });
    expect(rebuilt.rebuiltResponses[1]['q-2']).toMatchObject({ good: true, warn: false, text: '1.2' });
    expect(rebuilt.rebuiltTextInputs[2]['q-3']).toBe('2.1');

    const mergedResponses = mergeTextInputsIntoResponses(
      {
        1: { 'q-1': { good: true, text: '' } },
      } as never,
      {
        1: { 'q-1': '1.10', 'q-2': '1.2' },
        2: { 'q-3': '2.1' },
      } as never,
    );

    expect(mergedResponses[1]['q-1'].text).toBe('1.10');
    expect(mergedResponses[1]['q-2'].text).toBe('1.2');

    const questionMapping = buildQuestionMapping(kfData as never[]);
    const byKf = aggregateByKF(mergedResponses as never, questionMapping);
    expect(byKf[1]['1'].good).toBe(true);
    expect(byKf[1]['1'].text).toEqual(['1.2', '1.10']);

    const sorted = sortAggregatedByEpaAndKf({
      2: { '2.10': { text: ['b'] }, '2.2': { text: ['a'] } },
      1: { '1': byKf[1]['1'] },
    } as never);

    expect(Object.keys(sorted)).toEqual(['1', '2']);
    expect(Object.keys(sorted[2])).toEqual(['2.2', '2.10']);
  });

  test('calls AI summary API with success and friendly error branches', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ summary: 'summary text' }),
    });

    await expect(callAISummaryAPI({ text: 'hello' })).resolves.toEqual({ summary: 'summary text' });

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({}),
    });

    await expect(callAISummaryAPI({ text: 'hello' })).rejects.toThrow(
      'Daily AI limit reached. Resets at midnight UTC. See Settings to learn more.'
    );

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server said no' }),
    });

    await expect(callAISummaryAPI({ text: 'hello' })).rejects.toThrow('Server said no');
  });

  test('updates cached progress for remove and prune branches', () => {
    localStorage.setItem(
      'form-progress-student-1',
      JSON.stringify({
        responses: { 1: { q1: { text: 'a' } }, 2: { q2: { text: 'b' } } },
        textInputs: { 1: { q1: 'a' }, 2: { q2: 'b' } },
      })
    );

    removeEpaFromProgressCache('student-1', 1);
    expect(JSON.parse(localStorage.getItem('form-progress-student-1') || '{}')).toEqual({
      responses: { 2: { q2: { text: 'b' } } },
      textInputs: { 2: { q2: 'b' } },
    });

    localStorage.setItem(
      'form-progress-student-1',
      JSON.stringify({
        responses: { 2: { q2: { text: 'b' } }, 3: { q3: { text: 'c' } } },
        textInputs: { 2: { q2: 'b' }, 3: { q3: 'c' } },
      })
    );

    pruneProgressCacheToSelectedEpas('student-1', [3]);
    expect(JSON.parse(localStorage.getItem('form-progress-student-1') || '{}')).toEqual({
      responses: { 3: { q3: { text: 'c' } } },
      textInputs: { 3: { q3: 'c' } },
    });
  });

  test('builds submission data from cached and uncached branches', () => {
    const formRequest = {
      id: 'req-1',
      created_at: '2026-01-01',
      student_id: 'student-1',
      completed_by: 'rater-1',
      clinical_settings: 'Clinic',
      notes: 'notes',
      goals: 'goals',
    };

    const sortedAggregatedResponses = {
      1: { '1.1': { good: true, text: ['1.1'] } },
    };

    expect(
      buildSubmissionData(null, formRequest as never, sortedAggregatedResponses as never)
    ).toEqual({
      metadata: { student_id: 'student-1', rater_id: 'rater-1' },
      response: sortedAggregatedResponses,
    });

    expect(
      buildSubmissionData(
        {
          metadata: { student_id: 'student-2', rater_id: 'rater-2' },
          response: {},
        } as never,
        formRequest as never,
        sortedAggregatedResponses as never,
      )
    ).toEqual({
      metadata: { student_id: 'student-2', rater_id: 'rater-2' },
      response: sortedAggregatedResponses,
    });
  });

  test('upserts form responses for both update and insert paths', async () => {
    formResponsesUpdateEqMock.mockResolvedValueOnce({ error: null });
    formResponsesInsertMock.mockResolvedValueOnce({ error: null });

    await expect(
      upsertFormResponse(
        true,
        'resp-1',
        'req-1',
        {
          metadata: { student_id: 'student-1', rater_id: 'rater-1' },
          response: {},
        } as never,
        'professionalism note'
      )
    ).resolves.toBeNull();

    expect(formResponsesUpdateMock).toHaveBeenCalledWith({
      response: {
        metadata: { student_id: 'student-1', rater_id: 'rater-1' },
        response: {},
      },
      professionalism: 'professionalism note',
    });
    expect(formResponsesUpdateEqMock).toHaveBeenCalledWith('response_id', 'resp-1');

    await expect(
      upsertFormResponse(
        false,
        null,
        'req-2',
        {
          metadata: { student_id: 'student-2', rater_id: 'rater-2' },
          response: {},
        } as never,
        'prof two'
      )
    ).resolves.toBeNull();

    expect(formResponsesInsertMock).toHaveBeenCalledWith({
      request_id: 'req-2',
      response: {
        metadata: { student_id: 'student-2', rater_id: 'rater-2' },
        response: {},
      },
      professionalism: 'prof two',
    });
  });

  test('sends rater notification email with success, no-email, and error branches', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    sendRaterEmailMock.mockResolvedValueOnce({ ok: true });
    await sendRaterNotificationEmail({
      id: 'req-1',
      created_at: '2026-01-01',
      student_id: 'student-1',
      completed_by: 'rater-1',
      clinical_settings: 'Clinic',
      notes: 'notes',
      goals: 'goals',
      email: 'student@example.com',
      display_name: 'Student Name',
    } as never);

    expect(sendRaterEmailMock).toHaveBeenCalledWith({
      to: 'student@example.com',
      studentName: 'Student Name',
    });
    expect(consoleLogSpy).toHaveBeenCalledWith('Rater notification email sent');

    await sendRaterNotificationEmail({
      id: 'req-2',
      created_at: '2026-01-01',
      student_id: 'student-1',
      completed_by: 'rater-1',
      clinical_settings: 'Clinic',
      notes: 'notes',
      goals: 'goals',
    } as never);

    expect(sendRaterEmailMock).toHaveBeenCalledTimes(1);

    sendRaterEmailMock.mockRejectedValueOnce(new Error('mailer failed'));
    await sendRaterNotificationEmail({
      id: 'req-3',
      created_at: '2026-01-01',
      student_id: 'student-1',
      completed_by: 'rater-1',
      clinical_settings: 'Clinic',
      notes: 'notes',
      goals: 'goals',
      email: 'student@example.com',
      display_name: 'Student Name',
    } as never);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error sending rater notification email:',
      expect.any(Error)
    );

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('submits final evaluation across early-return, error, and success branches', async () => {
    jest.useFakeTimers();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const router = { push: jest.fn() };
    const setSubmittingFinal = jest.fn();
    const setSubmitSuccess = jest.fn();
    const formRequest = {
      id: 'req-1',
      created_at: '2026-01-01',
      student_id: 'student-1',
      completed_by: 'rater-1',
      clinical_settings: 'Clinic',
      notes: 'notes',
      goals: 'goals',
      email: 'student@example.com',
      display_name: 'Student Name',
    };
    const kfData = [
      {
        epa: 1,
        kf: '1.1',
        question: 'Question A',
        options: { good: 'Good' },
        questionId: 'q-1',
      },
    ];

    await submitFinalEvaluation({
      formRequest: null,
      submittingFinal: false,
      responses: {} as never,
      textInputs: {} as never,
      kfData: [] as never,
      cachedJSON: null,
      professionalism: '',
      isEditMode: false,
      existingResponseId: null,
      studentId: 'student-1',
      router,
      setSubmittingFinal,
      setSubmitSuccess,
    });

    await submitFinalEvaluation({
      formRequest: formRequest as never,
      submittingFinal: true,
      responses: {} as never,
      textInputs: {} as never,
      kfData: [] as never,
      cachedJSON: null,
      professionalism: '',
      isEditMode: false,
      existingResponseId: null,
      studentId: 'student-1',
      router,
      setSubmittingFinal,
      setSubmitSuccess,
    });

    expect(setSubmittingFinal).not.toHaveBeenCalled();

    formRequestsUpdateEqMock.mockResolvedValueOnce({ error: { message: 'update failed' } });
    await submitFinalEvaluation({
      formRequest: formRequest as never,
      submittingFinal: false,
      responses: { 1: { 'q-1': { good: true, text: '' } } } as never,
      textInputs: { 1: { 'q-1': '1.1' } } as never,
      kfData: kfData as never,
      cachedJSON: null,
      professionalism: 'professionalism',
      isEditMode: false,
      existingResponseId: null,
      studentId: 'student-1',
      router,
      setSubmittingFinal,
      setSubmitSuccess,
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating form request status:', 'update failed');
    expect(setSubmittingFinal).toHaveBeenCalledWith(true);
    expect(setSubmittingFinal).toHaveBeenCalledWith(false);

    formRequestsUpdateEqMock.mockResolvedValueOnce({ error: null });
    formResponsesInsertMock.mockResolvedValueOnce({ error: { message: 'insert failed' } });
    await submitFinalEvaluation({
      formRequest: formRequest as never,
      submittingFinal: false,
      responses: { 1: { 'q-1': { good: true, text: '' } } } as never,
      textInputs: { 1: { 'q-1': '1.1' } } as never,
      kfData: kfData as never,
      cachedJSON: null,
      professionalism: 'professionalism',
      isEditMode: false,
      existingResponseId: null,
      studentId: 'student-1',
      router,
      setSubmittingFinal,
      setSubmitSuccess,
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error submitting form:', 'insert failed');

    localStorage.setItem('form-progress-req-1', 'cached');
    localStorage.setItem('form-progress-student-1', 'cached');
    formRequestsUpdateEqMock.mockResolvedValueOnce({ error: null });
    formResponsesInsertMock.mockResolvedValueOnce({ error: null });
    sendRaterEmailMock.mockResolvedValueOnce({ ok: true });

    await submitFinalEvaluation({
      formRequest: formRequest as never,
      submittingFinal: false,
      responses: { 1: { 'q-1': { good: true, text: '' } } } as never,
      textInputs: { 1: { 'q-1': '1.1' } } as never,
      kfData: kfData as never,
      cachedJSON: null,
      professionalism: 'professionalism',
      isEditMode: false,
      existingResponseId: null,
      studentId: 'student-1',
      router,
      setSubmittingFinal,
      setSubmitSuccess,
    });

    expect(localStorage.getItem('form-progress-req-1')).toBeNull();
    expect(localStorage.getItem('form-progress-student-1')).toBeNull();
    expect(setSubmitSuccess).toHaveBeenCalledWith(true);

    jest.advanceTimersByTime(2000);
    expect(router.push).toHaveBeenCalledWith('/dashboard');

    consoleErrorSpy.mockRestore();
  });
});