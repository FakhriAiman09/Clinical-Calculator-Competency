type FeedbackEntry = [string, string];

function parseFeedbackKey(key: string) {
  const [epaPart, kfPart] = key.split('.');
  return {
    epaId: Number.parseInt(epaPart, 10),
    kfId: Number.parseInt(kfPart, 10),
  };
}

export function parseFeedbackObject(feedback: unknown): Record<string, string> | null {
  if (!feedback) return null;
  if (typeof feedback === 'object' && !Array.isArray(feedback)) return feedback as Record<string, string>;
  if (typeof feedback !== 'string') return null;

  try {
    return JSON.parse(feedback) as Record<string, string>;
  } catch {
    return null;
  }
}

export function getRawFeedback(feedback: unknown): string | null {
  const raw = typeof feedback === 'string' ? feedback : feedback ? JSON.stringify(feedback) : null;
  return raw && raw !== 'Generating...' ? raw : null;
}

export function getFeedbackError(feedbackObj: Record<string, string> | null) {
  return feedbackObj && '_error' in feedbackObj ? feedbackObj._error : null;
}

export function getFeedbackEntriesForEpa(feedbackObj: Record<string, string> | null, epaId: number) {
  if (!feedbackObj || getFeedbackError(feedbackObj)) return [];

  return Object.entries(feedbackObj)
    .filter(([key, value]) => parseFeedbackKey(key).epaId === epaId && Boolean(value))
    .sort(([a], [b]) => parseFeedbackKey(a).kfId - parseFeedbackKey(b).kfId);
}

export function formatFeedbackEntries(
  entries: FeedbackEntry[],
  options: {
    includeKeyFunctionHeadings?: boolean;
    transformText?: (text: string) => string;
  } = {},
) {
  const { includeKeyFunctionHeadings = true, transformText = (text: string) => text } = options;
  const formatted = entries.map(([key, value]) => {
    const text = transformText(value);
    return includeKeyFunctionHeadings ? `**Key Function ${key}**\n\n${text}` : text;
  });

  return formatted.join('\n\n---\n\n') || null;
}

export function getRelevantFeedbackMarkdown(
  feedback: unknown,
  epaId: number,
  options: {
    includeErrors?: boolean;
    includeKeyFunctionHeadings?: boolean;
    transformText?: (text: string) => string;
  } = {},
) {
  const feedbackObj = parseFeedbackObject(feedback);
  const error = getFeedbackError(feedbackObj);
  if (error) return options.includeErrors ? `_error:${error}` : null;

  return formatFeedbackEntries(getFeedbackEntriesForEpa(feedbackObj, epaId), options);
}
