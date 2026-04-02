import { describe, expect, test } from '@jest/globals';
import {
  appendFinalTranscript,
  appendTranscriptSegments,
  isSpeechRecognitionSupported,
  toggleListeningState,
} from '../../frontend/src/utils/speech-to-text-utils';

// This file unit-tests speech-to-text transcript and state helpers.

describe('Speech-to-text unit tests', () => {
  // Ensures browser support is true when either API variant exists.
  test('isSpeechRecognitionSupported handles both API flags', () => {
    expect(isSpeechRecognitionSupported(true, false)).toBe(true);
    expect(isSpeechRecognitionSupported(false, true)).toBe(true);
    expect(isSpeechRecognitionSupported(false, false)).toBe(false);
  });

  // Ensures listening state toggles deterministically.
  test('toggleListeningState flips current state', () => {
    expect(toggleListeningState(false)).toBe(true);
    expect(toggleListeningState(true)).toBe(false);
  });

  // Ensures non-final transcript segments do not mutate final text.
  test('appendFinalTranscript ignores non-final segments', () => {
    expect(appendFinalTranscript('Hello', { transcript: ' world', isFinal: false })).toBe('Hello');
  });

  // Ensures final transcript segments are appended correctly.
  test('appendFinalTranscript appends final segments', () => {
    expect(appendFinalTranscript('Hello', { transcript: ' world', isFinal: true })).toBe('Hello world');
  });

  // Ensures a batch of segments appends only final segments in order.
  test('appendTranscriptSegments combines only final transcripts', () => {
    const result = appendTranscriptSegments('Start:', [
      { transcript: ' one', isFinal: true },
      { transcript: ' two', isFinal: false },
      { transcript: ' three', isFinal: true },
    ]);

    expect(result).toBe('Start: one three');
  });
});
