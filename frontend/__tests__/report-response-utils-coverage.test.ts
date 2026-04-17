import {
  collectCommentsPerEpa,
  extractCommentTextsForEpa,
  groupKfDescriptions,
  type FormResponsesInner,
  type SupabaseRow,
} from '@/utils/report-response';

describe('report-response utils coverage', () => {
  it('extracts non-empty text comments only', () => {
    const formResponse: FormResponsesInner = {
      response: {
        response: {
          '1': {
            '1-1': { text: ['Strong data gathering', '   ', 'Clear summary'] },
            '1-2': { text: [''] },
            '1-3': { checked: true },
            '1-4': {},
          },
        },
      },
      form_requests: { student_id: 'stu-1' },
    };

    expect(extractCommentTextsForEpa(formResponse, '1')).toEqual(['Strong data gathering', 'Clear summary']);
  });

  it('returns empty comments when epa key does not exist', () => {
    const formResponse: FormResponsesInner = {
      response: { response: {} },
      form_requests: { student_id: 'stu-1' },
    };

    expect(extractCommentTextsForEpa(formResponse, '9')).toEqual([]);
  });

  it('collects comments per epa filtered by date and selected student', () => {
    const reportCreatedAt = new Date('2026-04-15T00:00:00.000Z');
    const rows: SupabaseRow[] = [
      {
        response_id: 'r-1',
        created_at: '2026-04-10T10:00:00.000Z',
        results: { '1': 2 },
        form_responses: {
          response: {
            response: {
              '1': {
                '1-1': { text: ['KF 1 comment'] },
              },
              '2': {
                '2-1': { text: ['KF 2 comment'] },
              },
            },
          },
          form_requests: { student_id: 'stu-1' },
        },
      },
      {
        response_id: 'r-2',
        created_at: '2026-04-11T10:00:00.000Z',
        results: { '1': 1 },
        form_responses: {
          response: {
            response: {
              '1': {
                '1-1': { text: ['Wrong student'] },
              },
            },
          },
          form_requests: { student_id: 'stu-2' },
        },
      },
      {
        response_id: 'r-3',
        created_at: '2026-04-20T10:00:00.000Z',
        results: { '1': 3 },
        form_responses: {
          response: {
            response: {
              '1': {
                '1-1': { text: ['After report date'] },
              },
            },
          },
          form_requests: { student_id: 'stu-1' },
        },
      },
    ];

    expect(collectCommentsPerEpa(rows, 'stu-1', reportCreatedAt, [1, 2])).toEqual({
      1: ['KF 1 comment'],
      2: ['KF 2 comment'],
    });
  });

  it('initializes all requested epas even with null result data', () => {
    expect(collectCommentsPerEpa(null, 'stu-1', new Date('2026-01-01'), [1, 3])).toEqual({
      1: [],
      3: [],
    });
  });

  it('groups key function descriptions by epa id', () => {
    const grouped = groupKfDescriptions({
      '1-1': 'History taking',
      '1-2': 'Focused exam',
      '10-1': 'Urgency recognition',
      invalid: 'Falls back to NaN group',
    });

    expect(grouped['1']).toEqual(['History taking', 'Focused exam']);
    expect(grouped['10']).toEqual(['Urgency recognition']);
    expect(grouped.NaN).toEqual(['Falls back to NaN group']);
  });

  it('returns empty object when no descriptions are provided', () => {
    expect(groupKfDescriptions(undefined)).toEqual({});
  });
});
