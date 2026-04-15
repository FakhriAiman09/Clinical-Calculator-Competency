import { detectFaultReasons, analyzeCommentsQuality, reasonLabel } from '@/utils/comment-quality';

describe('detectFaultReasons', () => {
  test('NO_CONTENT for empty string', () => {
    expect(detectFaultReasons('')).toContain('NO_CONTENT');
  });

  test('NO_CONTENT for whitespace only', () => {
    expect(detectFaultReasons('   ')).toContain('NO_CONTENT');
  });

  test('NO_CONTENT for punctuation only', () => {
    expect(detectFaultReasons('...')).toContain('NO_CONTENT');
  });

  test('TOO_SHORT for one word', () => {
    expect(detectFaultReasons('okay')).toContain('TOO_SHORT');
  });

  test('TOO_SHORT for three words', () => {
    expect(detectFaultReasons('good job done')).toContain('TOO_SHORT');
  });

  test('no TOO_SHORT for four or more words', () => {
    expect(detectFaultReasons('the student did well here')).not.toContain('TOO_SHORT');
  });

  test('GENERIC for exact generic word', () => {
    expect(detectFaultReasons('good')).toContain('GENERIC');
  });

  test('GENERIC for well done', () => {
    expect(detectFaultReasons('well done')).toContain('GENERIC');
  });

  test('GENERIC for phrase without detail signal', () => {
    expect(detectFaultReasons('great work')).toContain('GENERIC');
  });

  test('no GENERIC for phrase with clinical specificity', () => {
    const result = detectFaultReasons(
      'Good job explaining the diagnosis and treatment plan to the patient.'
    );
    expect(result).not.toContain('GENERIC');
  });

  test('ALL_CAPS for long uppercase comment', () => {
    expect(detectFaultReasons('ALL CAPS COMMENT WITH NO DETAILS')).toContain('ALL_CAPS');
  });

  test('no ALL_CAPS for short uppercase text', () => {
    // fewer than 10 alpha chars — threshold not triggered
    expect(detectFaultReasons('OK')).not.toContain('ALL_CAPS');
  });

  test('PROFANITY for profane word', () => {
    expect(detectFaultReasons('this is shit feedback')).toContain('PROFANITY');
  });

  test('REPEATED for repeated characters', () => {
    expect(detectFaultReasons('aaaaaaa')).toContain('REPEATED');
  });

  test('REPEATED for repeated words', () => {
    expect(detectFaultReasons('good good good good')).toContain('REPEATED');
  });

  test('LOW_SIGNAL for vague praise under 10 words', () => {
    expect(detectFaultReasons('great student')).toContain('LOW_SIGNAL');
  });

  test('no LOW_SIGNAL when clinical detail is present', () => {
    const result = detectFaultReasons(
      'Excellent differential diagnosis including infection and malignancy was presented with clear reasoning.'
    );
    expect(result).not.toContain('LOW_SIGNAL');
  });

  test('returns empty array for high-quality comment', () => {
    const result = detectFaultReasons(
      'The student demonstrated a structured approach to history taking, identified key risk factors, and proposed an appropriate investigation and management plan.'
    );
    expect(result).toHaveLength(0);
  });

  test('deduplicates reasons', () => {
    const result = detectFaultReasons('good');
    const unique = new Set(result);
    expect(result.length).toBe(unique.size);
  });

  test('handles smart quotes in normalization', () => {
    // Should not throw and should treat "\u201c" as a regular quote
    expect(() => detectFaultReasons('\u201cgreat\u201d')).not.toThrow();
  });
});

describe('analyzeCommentsQuality', () => {
  test('returns zero flagged for all high-quality comments', () => {
    const comments = [
      'The student took a focused history identifying key symptoms and formulated a differential diagnosis.',
      'Physical examination was systematic and all findings were clearly documented in the notes.',
    ];
    const result = analyzeCommentsQuality(comments);
    expect(result.flagged).toHaveLength(0);
    expect(result.total).toBe(2);
  });

  test('flags generic comments', () => {
    const result = analyzeCommentsQuality(['good', 'okay', 'great']);
    expect(result.flagged.length).toBeGreaterThan(0);
  });

  test('flags comment repeated 3 or more times', () => {
    const result = analyzeCommentsQuality(['good job', 'good job', 'good job']);
    const repeated = result.flagged.filter((f) => f.reasons.includes('REPEATED'));
    expect(repeated.length).toBeGreaterThan(0);
  });

  test('increments reasonCounts correctly', () => {
    const result = analyzeCommentsQuality(['good', 'shit comment here']);
    expect(result.reasonCounts.PROFANITY).toBeGreaterThanOrEqual(1);
  });

  test('total always equals input array length', () => {
    const comments = ['good', 'great', 'nice'];
    const result = analyzeCommentsQuality(comments);
    expect(result.total).toBe(3);
  });

  test('empty array returns empty flagged and zero totals', () => {
    const result = analyzeCommentsQuality([]);
    expect(result.flagged).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('reasonLabel', () => {
  const cases: Array<[Parameters<typeof reasonLabel>[0], string]> = [
    ['NO_CONTENT', 'No content / empty'],
    ['TOO_SHORT', 'Comment too short'],
    ['GENERIC', 'Generic / unhelpful'],
    ['ALL_CAPS', 'All caps'],
    ['REPEATED', 'Repeated comment'],
    ['PROFANITY', 'Contains profanity'],
    ['LOW_SIGNAL', 'Low signal (not specific)'],
  ];

  test.each(cases)('reasonLabel(%s) returns "%s"', (reason, expected) => {
    expect(reasonLabel(reason)).toBe(expected);
  });
});
