const profileSelectMock = jest.fn();
const rpcMock = jest.fn();
const insertMock = jest.fn();

function makeSupabaseMock() {
  return {
    schema: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => profileSelectMock()),
    rpc: jest.fn().mockImplementation((...args: unknown[]) => rpcMock(...args)),
    insert: jest.fn().mockImplementation((...args: unknown[]) => insertMock(...args)),
  };
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(async () => makeSupabaseMock()),
}));

jest.mock('@/utils/get-epa-data', () => ({
  getLatestMCQs: jest.fn(),
}));

import { getUpdaterDetails, submitNewOption, submitNewQuestion } from '@/app/dashboard/admin/edit-questions-options/actions';
import { getLatestMCQs } from '@/utils/get-epa-data';

const getLatestMCQsMock = getLatestMCQs as jest.Mock;

describe('getUpdaterDetails', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns updater details when both profile and email found', async () => {
    profileSelectMock.mockResolvedValueOnce({
      data: { display_name: 'Dr. Smith' },
      error: null,
    });
    rpcMock.mockResolvedValueOnce({ data: 'dr.smith@example.com', error: null });

    const result = await getUpdaterDetails('user-id-1');
    expect(result).toEqual({
      id: 'user-id-1',
      display_name: 'Dr. Smith',
      email: 'dr.smith@example.com',
    });
  });

  test('returns null display_name when profile fetch fails', async () => {
    profileSelectMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    });
    rpcMock.mockResolvedValueOnce({ data: 'fallback@example.com', error: null });

    const result = await getUpdaterDetails('user-id-2');
    expect(result?.display_name).toBeNull();
    expect(result?.email).toBe('fallback@example.com');
  });

  test('returns null email when email fetch fails', async () => {
    profileSelectMock.mockResolvedValueOnce({
      data: { display_name: 'Admin' },
      error: null,
    });
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'RPC error' } });

    const result = await getUpdaterDetails('user-id-3');
    expect(result?.email).toBeNull();
  });
});

describe('submitNewOption', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('does nothing when no MCQs are found', async () => {
    getLatestMCQsMock.mockResolvedValueOnce(null);
    await expect(submitNewOption('optionA', 'New text')).resolves.toBeUndefined();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test('inserts updated MCQs when option key exists', async () => {
    const mcqs = [
      { question: 'Q1', options: { optionA: 'Old text', optionB: 'Another option' } },
      { question: 'Q2', options: { optionB: 'Only B here' } },
    ];
    getLatestMCQsMock.mockResolvedValueOnce(mcqs);
    insertMock.mockResolvedValueOnce({ error: null });

    await submitNewOption('optionA', 'Updated text');
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  test('does not mutate MCQs that lack the target key', async () => {
    const mcqs = [
      { question: 'Q1', options: { optionA: 'Old', optionB: 'B' } },
      { question: 'Q2', options: { optionB: 'only B' } },
    ];
    getLatestMCQsMock.mockResolvedValueOnce(mcqs);
    insertMock.mockResolvedValueOnce({ error: null });

    await submitNewOption('optionA', 'New A');

    // insertMock receives the object passed to supabase.insert({ data: [...] })
    const arg = insertMock.mock.calls[0]?.[0] as { data: typeof mcqs } | undefined;
    const updatedMcqs = arg?.data;
    const q2 = updatedMcqs?.find((m) => m.question === 'Q2');
    expect(q2).toBeDefined();
    expect((q2?.options as Record<string, string>).optionA).toBeUndefined();
  });
});

describe('submitNewQuestion', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('does nothing when no MCQs are found', async () => {
    getLatestMCQsMock.mockResolvedValueOnce(null);
    await expect(
      submitNewQuestion({ question: 'Old Q', options: {} }, 'New Q')
    ).resolves.toBeUndefined();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test('updates matching question text and inserts snapshot', async () => {
    const mcqs = [
      { question: 'Old Question', options: { optionA: 'A' } },
      { question: 'Other Question', options: { optionA: 'B' } },
    ];
    getLatestMCQsMock.mockResolvedValueOnce(mcqs);
    insertMock.mockResolvedValueOnce({ error: null });

    await submitNewQuestion({ question: 'Old Question', options: { optionA: 'A' } }, 'Updated Question');
    expect(insertMock).toHaveBeenCalledTimes(1);

    const arg = insertMock.mock.calls[0]?.[0] as { data: typeof mcqs } | undefined;
    const updatedMcqs = arg?.data;
    expect(updatedMcqs?.some((m) => m.question === 'Updated Question')).toBe(true);
    expect(updatedMcqs?.some((m) => m.question === 'Other Question')).toBe(true);
  });

  test('does not change MCQs with non-matching question', async () => {
    const mcqs = [{ question: 'Different Question', options: {} }];
    getLatestMCQsMock.mockResolvedValueOnce(mcqs);
    insertMock.mockResolvedValueOnce({ error: null });

    await submitNewQuestion({ question: 'Target Question', options: {} }, 'New Text');

    const arg = insertMock.mock.calls[0]?.[0] as { data: typeof mcqs } | undefined;
    expect(arg?.data?.[0]?.question).toBe('Different Question');
  });
});
