export type FaultReason =
  | 'TOO_SHORT'
  | 'GENERIC'
  | 'NO_CONTENT'
  | 'ALL_CAPS'
  | 'REPEATED'
  | 'PROFANITY'
  | 'LOW_SIGNAL';

export type FlaggedComment = {
  text: string;
  reasons: FaultReason[];
};

export type EPACheckSummary = {
  totalComments: number;
  flaggedComments: number;
  reasonCounts: Record<FaultReason, number>;
  examples: FlaggedComment[];
};

export type FormFlagSummary = {
  totalComments: number;
  flaggedComments: number;
  topReason: FaultReason | null;
};

const DETAIL_TERMS = [
  'diagnosis',
  'diagnoses',
  'diagnostic',
  'treatment',
  'treatments',
  'management',
  'assessment',
  'differential',
  'investigation',
  'screening',
  'interpreting',
  'interpretation',
  'result',
  'results',
  'plan',
  'follow-up',
  'followup',
  'risk',
  'symptom',
  'history',
  'exam',
  'test',
  'tests',
  'finding',
  'findings',
  'intervention',
  'interventions',
];

const CONNECTOR_TERMS = [
  'because',
  'so that',
  'however',
  'but',
  'improve',
  'suggest',
  'recommend',
  'next time',
  'specific',
  'example',
  'when',
  'therefore',
  'due to',
];

const GENERIC_EXACT = new Set([
  'good',
  'nice',
  'ok',
  'okay',
  'great',
  'excellent',
  'well done',
  'n/a',
  'na',
  'none',
  'no comment',
  'nothing',
  'all good',
  'looks good',
  'fine',
]);

const GENERIC_PHRASES = [
  'good job',
  'keep it up',
  'keep up the good work',
  'great work',
  'nice work',
  'doing well',
  'no issues',
  'nothing to add',
];

const PROFANITY = new Set(['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'cunt']);
const PRAISE_WORDS = ['good', 'great', 'nice', 'excellent', 'well done', 'amazing'];

function normalize(value: string) {
  if (!value || typeof value !== 'string') return '';

  return Array.from(value.trim().split(/\s+/).join(' '), (char) => {
    if (char === '\u201c' || char === '\u201d') return '"';
    if (char === '\u2019') return "'";
    return char;
  }).join('');
}

function isAsciiLetter(char: string) {
  const code = char.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isAsciiDigit(char: string) {
  const code = char.charCodeAt(0);
  return code >= 48 && code <= 57;
}

function alphaOnly(value: string) {
  return Array.from(value).filter(isAsciiLetter).join('');
}

function normalizedWords(value: string) {
  const words: string[] = [];
  let current = '';

  for (const char of value.toLowerCase()) {
    if (isAsciiLetter(char) || isAsciiDigit(char)) {
      current += char;
    } else if (current) {
      words.push(current);
      current = '';
    }
  }

  if (current) words.push(current);
  return words;
}

function commentKey(value: string) {
  return Array.from(normalize(value).toLowerCase())
    .filter((char) => isAsciiLetter(char) || isAsciiDigit(char) || char === ' ')
    .join('');
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function isMostlyPunctOrEmpty(value: string) {
  const trimmed = value.trim();
  return !trimmed || alphaOnly(trimmed).length === 0;
}

function isRepeatedCharSpam(value: string) {
  let previous = '';
  let runLength = 0;

  for (const char of value) {
    runLength = char === previous ? runLength + 1 : 1;
    previous = char;
    if (runLength >= 6) return true;
  }

  return false;
}

function isRepeatedWordSpam(value: string) {
  const words = normalizedWords(value);
  let previous = '';
  let runLength = 0;

  for (const word of words) {
    runLength = word === previous ? runLength + 1 : 1;
    previous = word;
    if (runLength >= 4) return true;
  }

  return false;
}

export function detectFaultReasons(textRaw: string): FaultReason[] {
  const text = normalize(textRaw);
  const lower = text.toLowerCase();
  const reasons: FaultReason[] = [];

  if (isMostlyPunctOrEmpty(text)) reasons.push('NO_CONTENT');

  const words = normalizedWords(text);
  const wordCount = words.length;
  if (wordCount > 0 && wordCount <= 3) reasons.push('TOO_SHORT');

  const hasClinicalSpecificity = includesAny(lower, DETAIL_TERMS);
  const hasConnector = includesAny(lower, CONNECTOR_TERMS);
  const hasDetailSignal = hasConnector || hasClinicalSpecificity || wordCount >= 12;

  const letters = alphaOnly(text);
  if (letters.length >= 10 && letters === letters.toUpperCase()) reasons.push('ALL_CAPS');

  if (GENERIC_EXACT.has(lower)) reasons.push('GENERIC');

  if (GENERIC_PHRASES.some((phrase) => lower.includes(phrase))) {
    const tooVagueTemplate = !hasDetailSignal || (wordCount < 8 && !hasClinicalSpecificity);
    if (tooVagueTemplate) reasons.push('GENERIC');
  }

  if (words.some((word) => PROFANITY.has(word))) reasons.push('PROFANITY');
  if (isRepeatedCharSpam(text) || isRepeatedWordSpam(text)) reasons.push('REPEATED');

  const hasPraise = PRAISE_WORDS.some((word) => lower.includes(word));
  if (hasPraise && !hasDetailSignal && wordCount <= 10) reasons.push('LOW_SIGNAL');

  return Array.from(new Set(reasons));
}

export function analyzeCommentsQuality(
  comments: string[],
): { flagged: FlaggedComment[]; total: number; reasonCounts: Record<FaultReason, number> } {
  const flagged: FlaggedComment[] = [];
  const reasonCounts: Record<FaultReason, number> = {
    NO_CONTENT: 0,
    TOO_SHORT: 0,
    GENERIC: 0,
    ALL_CAPS: 0,
    REPEATED: 0,
    PROFANITY: 0,
    LOW_SIGNAL: 0,
  };
  const countsByKey = new Map<string, number>();

  for (const comment of comments) {
    const key = commentKey(comment);
    countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);
  }

  for (const raw of comments) {
    const text = normalize(raw);
    const reasons = detectFaultReasons(text);
    if ((countsByKey.get(commentKey(text)) ?? 0) >= 3) reasons.push('REPEATED');

    const unique = Array.from(new Set(reasons));
    if (unique.length === 0) continue;

    flagged.push({ text, reasons: unique });
    unique.forEach((reason) => {
      reasonCounts[reason] += 1;
    });
  }

  return { flagged, total: comments.length, reasonCounts };
}

export function reasonLabel(reason: FaultReason) {
  switch (reason) {
    case 'NO_CONTENT':
      return 'No content / empty';
    case 'TOO_SHORT':
      return 'Comment too short';
    case 'GENERIC':
      return 'Generic / unhelpful';
    case 'ALL_CAPS':
      return 'All caps';
    case 'REPEATED':
      return 'Repeated comment';
    case 'PROFANITY':
      return 'Contains profanity';
    case 'LOW_SIGNAL':
      return 'Low signal (not specific)';
    default:
      return reason;
  }
}
