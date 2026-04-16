import {
  getNavItemsByRole,
  getNavButtonClass,
} from '@/utils/header-nav-utils';
import {
  isValidEmailFormat,
  validateForgotPasswordEmail,
} from '@/utils/forgot-password-utils';
import {
  canGenerateSummary,
  insertSummary,
  replaceWithSummary,
  shouldShowSummaryActions,
} from '@/utils/evaluation-ai';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/utils/supabase/server';
import {
  getEPAKFDescs,
  getLatestMCQs,
  getKFSampleCounts,
  getHistoricalMCQs,
} from '@/utils/get-epa-data';

type TableQuerySpec = {
  select: (...args: unknown[]) => unknown;
};

function makeSupabaseMock(specByTable: Record<string, TableQuerySpec>) {
  return {
    schema: jest.fn(() => ({
      from: jest.fn((table: string) => {
        const spec = specByTable[table];
        if (!spec) throw new Error(`Missing test query spec for table: ${table}`);
        return { select: spec.select };
      }),
    })),
  };
}

describe('header-nav-utils', () => {
  test('returns student links and about-us for student role', () => {
    const links = getNavItemsByRole({
      userRoleStudent: true,
      userRoleAuthorized: false,
      userRoleRater: false,
      userRoleDev: false,
    });

    expect(links).toEqual(
      expect.arrayContaining([
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/dashboard/student/form-requests', label: 'Request Assessment' },
        { href: '/dashboard/student/report', label: 'Comprehensive Report' },
        { href: '/dashboard/AboutUsPage', label: 'About Us' },
      ]),
    );
    expect(links).not.toEqual(expect.arrayContaining([{ href: '/tickets', label: 'Tickets' }]));
  });

  test('returns admin links for authorized role', () => {
    const links = getNavItemsByRole({
      userRoleStudent: false,
      userRoleAuthorized: true,
      userRoleRater: false,
      userRoleDev: false,
    });

    expect(links).toEqual(
      expect.arrayContaining([
        { href: '/dashboard/admin/userList', label: 'Manage Users' },
        { href: '/dashboard/admin/all-reports', label: 'All Reports' },
        { href: '/dashboard/admin/edit-questions-options', label: 'Edit Questions' },
        { href: '/dashboard/admin/form', label: 'Add MCQ Data' },
      ]),
    );
  });

  test('returns rater home when only rater role is true', () => {
    const links = getNavItemsByRole({
      userRoleStudent: false,
      userRoleAuthorized: false,
      userRoleRater: true,
      userRoleDev: false,
    });

    expect(links).toContainEqual({ href: '/dashboard', label: 'Home' });
  });

  test('adds tickets link for dev role', () => {
    const links = getNavItemsByRole({
      userRoleStudent: false,
      userRoleAuthorized: false,
      userRoleRater: false,
      userRoleDev: true,
    });

    expect(links).toContainEqual({ href: '/tickets', label: 'Tickets' });
  });

  test('returns active vs inactive button classes', () => {
    expect(getNavButtonClass('/dashboard', '/dashboard')).toBe('btn btn-secondary');
    expect(getNavButtonClass('/dashboard', '/tickets')).toBe('btn btn-outline-secondary');
  });
});

describe('forgot-password-utils', () => {
  test('validates email format edge cases', () => {
    expect(isValidEmailFormat('a@example.com')).toBe(true);
    expect(isValidEmailFormat('a@b')).toBe(false);
    expect(isValidEmailFormat('a@@example.com')).toBe(false);
    expect(isValidEmailFormat('@example.com')).toBe(false);
    expect(isValidEmailFormat('a@example.com ')).toBe(true);
    expect(isValidEmailFormat('a@exa mple.com')).toBe(false);
  });

  test('returns required and invalid messages as needed', () => {
    expect(validateForgotPasswordEmail('')).toEqual({ valid: false, message: 'Email is required' });
    expect(validateForgotPasswordEmail('bad@email')).toEqual({
      valid: false,
      message: 'Invalid email format',
    });
    expect(validateForgotPasswordEmail('ok@example.com')).toEqual({ valid: true, message: '' });
  });
});

describe('evaluation-ai utils', () => {
  test('canGenerateSummary checks trimmed content', () => {
    expect(canGenerateSummary('')).toBe(false);
    expect(canGenerateSummary('   ')).toBe(false);
    expect(canGenerateSummary('  useful comment  ')).toBe(true);
  });

  test('insertSummary handles empty summary and empty original', () => {
    expect(insertSummary('original', '   ')).toBe('original');
    expect(insertSummary('', ' summary ')).toBe('summary');
    expect(insertSummary('original', ' summary ')).toBe('original\nsummary');
  });

  test('replaceWithSummary and shouldShowSummaryActions use trimmed value', () => {
    expect(replaceWithSummary(' summary ')).toBe('summary');
    expect(shouldShowSummaryActions('   ')).toBe(false);
    expect(shouldShowSummaryActions(' summary ')).toBe(true);
  });
});

describe('get-epa-data', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('getEPAKFDescs maps Supabase row into EPAKFDesc shape', async () => {
    const response = {
      data: {
        epa_descriptions: { epa1: 'EPA desc' },
        kf_descriptions: { kf1: 'KF desc' },
      },
      error: null,
    };

    const supabase = makeSupabaseMock({
      epa_kf_descriptions: {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => response),
            })),
          })),
        })),
      },
    });

    mockCreateClient.mockResolvedValue(supabase as never);

    await expect(getEPAKFDescs()).resolves.toEqual({
      epa_desc: { epa1: 'EPA desc' },
      kf_desc: { kf1: 'KF desc' },
    });
  });

  test('getEPAKFDescs returns undefined and logs on Supabase error', async () => {
    const response = { data: null, error: { message: 'db down' } };

    const supabase = makeSupabaseMock({
      epa_kf_descriptions: {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => response),
            })),
          })),
        })),
      },
    });

    mockCreateClient.mockResolvedValue(supabase as never);

    await expect(getEPAKFDescs()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch EPA and KF descriptions:', 'db down');
  });

  test('getLatestMCQs returns undefined and logs when response has no data', async () => {
    const response = { data: null, error: null };

    const supabase = makeSupabaseMock({
      mcqs_options: {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => response),
            })),
          })),
        })),
      },
    });

    mockCreateClient.mockResolvedValue(supabase as never);

    await expect(getLatestMCQs()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch MCQs: No data');
  });

  test('getKFSampleCounts maps table_name/row_count pairs', async () => {
    const response = {
      data: [
        { table_name: 'kf_1_1', row_count: 10 },
        { table_name: 'kf_1_2', row_count: 5 },
      ],
      error: null,
    };

    const supabase = makeSupabaseMock({
      mcq_table_row_counts: {
        select: jest.fn(() => response),
      },
    });

    mockCreateClient.mockResolvedValue(supabase as never);

    await expect(getKFSampleCounts()).resolves.toEqual([
      { kf: 'kf_1_1', count: 10 },
      { kf: 'kf_1_2', count: 5 },
    ]);
  });

  test('getHistoricalMCQs returns undefined and logs on response error', async () => {
    const response = { data: null, error: { message: 'history failure' } };

    const supabase = makeSupabaseMock({
      mcqs_options: {
        select: jest.fn(() => ({
          order: jest.fn(() => response),
        })),
      },
    });

    mockCreateClient.mockResolvedValue(supabase as never);

    await expect(getHistoricalMCQs()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch MCQs:', 'history failure');
  });
});
