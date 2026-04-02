export type TranscriptSegment = {
  transcript: string;
  isFinal: boolean;
};

export function isSpeechRecognitionSupported(hasSpeechRecognition: boolean, hasWebkit: boolean): boolean {
  return hasSpeechRecognition || hasWebkit;
}

export function toggleListeningState(current: boolean): boolean {
  return !current;
}

export function appendFinalTranscript(existing: string, segment: TranscriptSegment): string {
  if (!segment.isFinal) return existing;
  return `${existing}${segment.transcript}`;
}

export function appendTranscriptSegments(existing: string, segments: TranscriptSegment[]): string {
  return segments.reduce((acc, segment) => appendFinalTranscript(acc, segment), existing);
}
