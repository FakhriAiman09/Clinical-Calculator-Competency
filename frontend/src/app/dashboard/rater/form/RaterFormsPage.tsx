'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { createClient } from '@/utils/supabase/client';
import { getLatestMCQs } from '@/utils/get-epa-data';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRequireRole } from '@/utils/useRequiredRole';
import { useUser } from '@/context/UserContext';
import { useAIPreferences } from '@/utils/useAIPreferences';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import { sendEmail as sendRaterEmail } from './rater-email-api/send-email-rater.server';

const supabase = createClient();

interface EPA {
  id: number;
  description: string;
}

interface KeyFunction {
  kf: string;
  epa: number;
  question: string;
  options: { [key: string]: string };
  questionId: string;
}

interface FormRequest {
  id: string;
  created_at: string;
  student_id: string;
  completed_by: string;
  clinical_settings: string;
  notes: string;
  goals: string;
  display_name?: string;
  email?: string;
}

type FormRequestRow = Omit<FormRequest, 'display_name' | 'email'>;

type ExistingResponseData = {
  response?: Record<string, Record<string, Record<string, unknown>>>;
};

type EpaDescriptionRow = {
  epa_descriptions?: Record<string, string>;
};

type QuestionResponse = Record<string, boolean | string> & { text: string };
type Responses = Record<number, Record<string, QuestionResponse>>;

type TextInputs = Record<number, Record<string, string>>;

interface AggregatedResponseForKF {
  [optionKey: string]: boolean | string[];
  text: string[];
}

type AggregatedResponses = {
  [epa: number]: {
    [kf: string]: AggregatedResponseForKF;
  };
};

type ActiveTarget =
  | { type: 'epa'; epaId: number; questionId: string }
  | { type: 'professionalism' }
  | null;

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function compareNumericDotStrings(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const NOT_CLINICAL_SUMMARY = 'Not clinical evaluation content.';
const UNCLEAR_SOURCE_SUMMARY = 'Unclear source text.';

function isKFMismatchSummary(summary: string): boolean {
  return /^Not related to .+\.$/.test(summary.trim());
}

function getSummaryGuard(summary: string, kf?: string | null) {
  const trimmed = summary.trim();
  if (!trimmed) {
    return { canApply: false, message: '' };
  }

  if (trimmed === NOT_CLINICAL_SUMMARY) {
    return {
      canApply: false,
      message: 'This result cannot be inserted or replaced.',
    };
  }

  if (trimmed === UNCLEAR_SOURCE_SUMMARY) {
    return {
      canApply: false,
      message: 'This result cannot be inserted or replaced.',
    };
  }

  if (kf && isKFMismatchSummary(trimmed)) {
    return {
      canApply: false,
      message: 'This result cannot be inserted or replaced.',
    };
  }

  return { canApply: true, message: '' };
}

const professionalismFieldKey = 'professionalism';

function makeFieldKey(epaId: number, questionId: string) {
  return `${epaId}::${questionId}`;
}

function getTargetFieldKey(target: ActiveTarget) {
  if (!target) return null;
  return target.type === 'professionalism'
    ? professionalismFieldKey
    : makeFieldKey(target.epaId, target.questionId);
}

function stopRecognitionSafely(recognition: { stop: () => void }) {
  try {
    recognition.stop();
  } catch {}
}

function appendTranscript(existing: string, transcript: string) {
  return (existing ? existing.trimEnd() + ' ' : '') + transcript.trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type SummaryGuard = ReturnType<typeof getSummaryGuard>;

type SummaryPanelProps = {
  summary: string;
  summaryGuard: SummaryGuard;
  onInsert: () => void;
  onReplace: () => void;
};

type DictationStatusProps = {
  isListening: boolean;
  vttStatus: string;
};

type SummaryStatusProps = {
  summary: string;
  isSummarizing: boolean;
  summaryGuard: SummaryGuard;
};

type EPAQuestionSectionProps = DictationStatusProps &
  SummaryStatusProps & {
    epaId: number;
    kf: KeyFunction;
    currentText: string;
    summaryErr: string;
    isChecked: (questionId: string, optionKey: string) => boolean;
    onOptionChange: (questionId: string, optionKey: string, value: boolean) => void;
    onTextChange: (questionId: string, value: string) => void;
    onRequestSummary: (questionId: string) => void;
    onToggleDictation: (questionId: string) => void;
    onInsertSummary: (questionId: string) => void;
    onReplaceSummary: (questionId: string) => void;
  };

type ProfessionalismSectionProps = DictationStatusProps & {
  professionalism: string;
  isSummarizing: boolean;
  summaryError: string;
  summary: string;
  onChange: (value: string) => void;
  onRequestSummary: () => void;
  onToggleDictation: () => void;
  onInsertSummary: () => void;
  onReplaceSummary: () => void;
  onSubmit: () => void;
  submittingFinal: boolean;
  isEditMode: boolean;
};

type CommentEditorProps = DictationStatusProps & {
  value: string;
  placeholder: string;
  rows?: number;
  isSummarizing: boolean;
  summaryError: string;
  summaryPanel: SummaryPanelProps;
  onChange: (value: string) => void;
  onRequestSummary: () => void;
  onToggleDictation: () => void;
};

function getProfessionalismSubmitLabel(submittingFinal: boolean, isEditMode: boolean) {
  if (!submittingFinal) return isEditMode ? 'Update Evaluation' : 'Submit Final Evaluation';
  return isEditMode ? 'Updating...' : 'Submitting...';
}

function SummaryPanel({
  summary,
  summaryGuard,
  onInsert,
  onReplace,
}: SummaryPanelProps) {
  if (!summary) return null;

  return (
    <div
      className='mt-2 p-2 rounded bg-body-secondary'
      style={{
        border: summaryGuard.canApply ? '1px solid var(--bs-border-color)' : '1px solid #f0ad4e',
      }}
    >
      <div className='d-flex justify-content-between align-items-center mb-1'>
        <small className='text-muted'>{summaryGuard.canApply ? 'Summary' : 'AI Result'}</small>

        <div className='d-flex gap-2'>
          <button
            type='button'
            className='btn btn-sm btn-outline-secondary'
            onClick={onInsert}
            disabled={!summaryGuard.canApply}
          >
            Insert
          </button>

          <button
            type='button'
            className='btn btn-sm btn-outline-danger'
            onClick={onReplace}
            title='Replace comments with AI summary (deletes original)'
            disabled={!summaryGuard.canApply}
          >
            Replace
          </button>
        </div>
      </div>

      {!summaryGuard.canApply ? (
        <div className='small mb-2' style={{ color: '#b26a00' }}>
          {summaryGuard.message}
        </div>
      ) : null}

      <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{summary}</div>
    </div>
  );
}

function CommentEditor({
  value,
  placeholder,
  rows,
  isListening,
  isSummarizing,
  vttStatus,
  summaryError,
  summaryPanel,
  onChange,
  onRequestSummary,
  onToggleDictation,
}: CommentEditorProps) {
  return (
    <>
      <div className='comment-wrapper'>
        <textarea
          className='form-control comment-textarea'
          placeholder={placeholder}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />

        <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 8, zIndex: 2 }}>
          <button
            type='button'
            className='vtt-btn'
            onClick={onRequestSummary}
            title='Generate AI summary from comments'
            disabled={isSummarizing}
          >
            <i className={`bi ${isSummarizing ? 'bi-hourglass-split' : 'bi-stars'}`} />
          </button>

          <button
            type='button'
            className={`vtt-btn ${isListening ? 'recording' : ''}`}
            onClick={onToggleDictation}
            title={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            <i className={`bi ${isListening ? 'bi-stop-circle-fill' : 'bi-mic-fill'}`} />
          </button>
        </div>
      </div>

      {vttStatus ? <div className='vtt-status'>{vttStatus}</div> : null}
      {summaryError ? (
        <div className='vtt-status' style={{ color: '#dc3545' }}>
          {summaryError}
        </div>
      ) : null}

      <SummaryPanel {...summaryPanel} />
    </>
  );
}

function EPAQuestionSection({
  epaId,
  kf,
  currentText,
  isListening,
  vttStatus,
  summary,
  isSummarizing,
  summaryErr,
  summaryGuard,
  isChecked,
  onOptionChange,
  onTextChange,
  onRequestSummary,
  onToggleDictation,
  onInsertSummary,
  onReplaceSummary,
}: EPAQuestionSectionProps) {
  const questionKey = kf.questionId;

  return (
    <div key={questionKey} className='mb-4'>
      <p className='fw-bold'>{kf.question}</p>

      <div className='row'>
        {Object.entries(kf.options).map(([optionKey, optionLabel]) => (
          <div key={optionKey} className='col-md-6 mb-2'>
            <div className='form-check'>
              <input
                className='form-check-input'
                type='checkbox'
                id={`epa-${epaId}-q-${questionKey}-option-${optionKey}`}
                name={`epa-${epaId}-q-${questionKey}-option-${optionKey}`}
                checked={isChecked(questionKey, optionKey)}
                onChange={(e) => onOptionChange(questionKey, optionKey, e.target.checked)}
              />
              <label
                className='form-check-label'
                htmlFor={`epa-${epaId}-q-${questionKey}-option-${optionKey}`}
              >
                {optionLabel}
              </label>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h6 className='mb-2'>Additional comments:</h6>

        <CommentEditor
          value={currentText}
          placeholder='Additional comments ...'
          isListening={isListening}
          isSummarizing={isSummarizing}
          vttStatus={vttStatus}
          summaryError={summaryErr}
          onChange={(value) => onTextChange(questionKey, value)}
          onRequestSummary={() => onRequestSummary(questionKey)}
          onToggleDictation={() => onToggleDictation(questionKey)}
          summaryPanel={{
            summary,
            summaryGuard,
            onInsert: () => onInsertSummary(questionKey),
            onReplace: () => onReplaceSummary(questionKey),
          }}
        />
      </div>

      <hr />
    </div>
  );
}

function ProfessionalismSection({
  professionalism,
  isListening,
  isSummarizing,
  vttStatus,
  summaryError,
  summary,
  onChange,
  onRequestSummary,
  onToggleDictation,
  onInsertSummary,
  onReplaceSummary,
  onSubmit,
  submittingFinal,
  isEditMode,
}: ProfessionalismSectionProps) {
  const summaryGuard = getSummaryGuard(summary, 'professionalism');
  const submitLabel = getProfessionalismSubmitLabel(submittingFinal, isEditMode);

  return (
    <div className='card mt-4'>
      <div className='card-header bg-primary text-white'>Professionalism Assessment</div>
      <div className='card-body'>
        <div className='mb-4'>
          <p className='fw-bold'>Please describe the student&apos;s professionalism:</p>

          <CommentEditor
            value={professionalism}
            placeholder="Describe the student's professionalism..."
            rows={5}
            isListening={isListening}
            isSummarizing={isSummarizing}
            vttStatus={vttStatus}
            summaryError={summaryError}
            onChange={onChange}
            onRequestSummary={onRequestSummary}
            onToggleDictation={onToggleDictation}
            summaryPanel={{
              summary,
              summaryGuard,
              onInsert: onInsertSummary,
              onReplace: onReplaceSummary,
            }}
          />
        </div>

        <button className='btn btn-success mt-3' onClick={onSubmit} disabled={submittingFinal}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Module-level helpers (keep complexity of nested functions low) ──────────

function buildKfToQuestionsMap(kfData: KeyFunction[]): Record<string, KeyFunction[]> {
  const map: Record<string, KeyFunction[]> = {};
  for (const kf of kfData) {
    const key = `${kf.epa}.${kf.kf}`;
    if (!map[key]) map[key] = [];
    map[key].push(kf);
  }
  return map;
}

function applyKfDataToQuestion(
  oneKfData: Record<string, unknown>,
  idx: number,
  questionId: string,
  epaNum: number,
  rebuiltResponses: Responses,
  rebuiltTextInputs: TextInputs,
): void {
  for (const key of Object.keys(oneKfData)) {
    if (key !== 'text' && typeof oneKfData[key] === 'boolean') {
      rebuiltResponses[epaNum][questionId][key] = oneKfData[key] as boolean;
    }
  }
  const texts = oneKfData.text;
  if (Array.isArray(texts) && texts[idx]) {
    rebuiltTextInputs[epaNum][questionId] = texts[idx] as string || '';
    rebuiltResponses[epaNum][questionId].text = texts[idx] as string || '';
  }
}

function ensureResponseBucket(epaNum: number, rebuiltResponses: Responses, rebuiltTextInputs: TextInputs) {
  rebuiltResponses[epaNum] = rebuiltResponses[epaNum] ?? {};
  rebuiltTextInputs[epaNum] = rebuiltTextInputs[epaNum] ?? {};
}

function rebuildResponsesFromAggregated(
  aggregatedResponses: Record<string, Record<string, Record<string, unknown>>>,
  kfToQuestions: Record<string, KeyFunction[]>,
): { rebuiltResponses: Responses; rebuiltTextInputs: TextInputs } {
  const rebuiltResponses: Responses = {};
  const rebuiltTextInputs: TextInputs = {};

  for (const [epaKey, epaData] of Object.entries(aggregatedResponses)) {
    const epaNum = Number.parseInt(epaKey, 10);
    ensureResponseBucket(epaNum, rebuiltResponses, rebuiltTextInputs);

    for (const [kfKey, oneKfData] of Object.entries(epaData)) {
      const questions = kfToQuestions[`${epaNum}.${kfKey}`] ?? [];

      for (const [idx, question] of questions.entries()) {
        const { questionId } = question;
        rebuiltResponses[epaNum][questionId] = rebuiltResponses[epaNum][questionId] ?? { text: '' };
        applyKfDataToQuestion(oneKfData, idx, questionId, epaNum, rebuiltResponses, rebuiltTextInputs);
      }
    }
  }
  return { rebuiltResponses, rebuiltTextInputs };
}

function mergeTextInputsIntoResponses(
  responses: Responses,
  textInputs: TextInputs,
): Responses {
  const merged: Responses = { ...responses };
  for (const epaKey of Object.keys(textInputs)) {
    const epaNum = Number.parseInt(epaKey, 10);
    if (!merged[epaNum]) merged[epaNum] = {};
    for (const questionId of Object.keys(textInputs[epaNum])) {
      if (!merged[epaNum][questionId]) merged[epaNum][questionId] = { text: '' };
      merged[epaNum][questionId].text = textInputs[epaNum][questionId];
    }
  }
  return merged;
}

function buildQuestionMapping(kfData: KeyFunction[]): Record<string, { kf: string; epa: number }> {
  const mapping: Record<string, { kf: string; epa: number }> = {};
  for (const q of kfData) mapping[q.questionId] = { kf: q.kf, epa: q.epa };
  return mapping;
}

function aggregateByKF(
  mergedResponses: Responses,
  questionMapping: Record<string, { kf: string; epa: number }>,
): AggregatedResponses {
  const aggregated: AggregatedResponses = {};
  for (const epaKey of Object.keys(mergedResponses)) {
    const epaNum = Number.parseInt(epaKey, 10);
    aggregated[epaNum] = aggregated[epaNum] ?? {};
    for (const questionId of Object.keys(mergedResponses[epaNum])) {
      const mapping = questionMapping[questionId];
      if (!mapping) continue;
      const { kf: kfKey } = mapping;
      aggregated[epaNum][kfKey] = aggregated[epaNum][kfKey] ?? { text: [] };
      const qResponse = mergedResponses[epaNum][questionId];
      for (const key of Object.keys(qResponse)) {
        if (key === 'text') continue;
        aggregated[epaNum][kfKey][key] =
          (aggregated[epaNum][kfKey][key] as boolean | undefined) ?? qResponse[key];
      }
      aggregated[epaNum][kfKey].text.push(qResponse.text);
    }
    for (const kfKey of Object.keys(aggregated[epaNum])) {
      aggregated[epaNum][kfKey].text.sort(compareNumericDotStrings);
    }
  }
  return aggregated;
}

function sortAggregatedByEpaAndKf(aggregated: AggregatedResponses): AggregatedResponses {
  const sorted: AggregatedResponses = {};
  Object.keys(aggregated)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((epaNum) => {
      sorted[epaNum] = {};
      for (const kfKey of Object.keys(aggregated[epaNum]).sort(compareNumericDotStrings)) {
        sorted[epaNum][kfKey] = aggregated[epaNum][kfKey];
      }
    });
  return sorted;
}

async function callAISummaryAPI(
  body: Record<string, unknown>,
): Promise<{ summary: string }> {
  const res = await fetch('/api/ai/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const friendlyMsg =
      data?.message ||
      (res.status === 429
        ? 'Daily AI limit reached. Resets at midnight UTC. See Settings to learn more.'
        : 'Summary failed. Please try again.');
    throw new Error(friendlyMsg);
  }
  return data as { summary: string };
}

function clearSummaryErrorAfterDelay(
  key: string,
  setSummaryErrorByField: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) {
  setTimeout(() => {
    setSummaryErrorByField((prev) => ({ ...prev, [key]: '' }));
  }, 3000);
}

function removeEpaFromProgressCache(studentId: string, epaId: number): void {
  const cachedData = localStorage.getItem(`form-progress-${studentId}`);
  if (!cachedData) return;

  try {
    const parsedData = JSON.parse(cachedData) as { responses?: Responses; textInputs?: TextInputs };
    if (parsedData.responses) delete parsedData.responses[epaId];
    if (parsedData.textInputs) delete parsedData.textInputs[epaId];
    localStorage.setItem(`form-progress-${studentId}`, JSON.stringify(parsedData));
  } catch (error) {
    console.error('Error updating cached JSON:', error);
  }
}

function pruneProgressCacheToSelectedEpas(studentId: string, selectedEPAs: number[]): void {
  const cacheKey = `form-progress-${studentId}`;
  const cachedData = localStorage.getItem(cacheKey);
  if (!cachedData) return;

  try {
    const formProgress = JSON.parse(cachedData) as { responses?: Responses; textInputs?: TextInputs };

    if (formProgress.responses) {
      Object.keys(formProgress.responses).forEach((epaKey) => {
        if (!selectedEPAs.includes(Number(epaKey))) delete formProgress.responses?.[Number(epaKey)];
      });
    }

    if (formProgress.textInputs) {
      Object.keys(formProgress.textInputs).forEach((epaKey) => {
        if (!selectedEPAs.includes(Number(epaKey))) delete formProgress.textInputs?.[Number(epaKey)];
      });
    }

    localStorage.setItem(cacheKey, JSON.stringify(formProgress));
  } catch (error) {
    console.error('Error updating cached JSON:', error);
  }
}

function buildSubmissionData(
  cachedJSON: { metadata: { student_id: string; rater_id: string }; response: Responses } | null,
  formRequest: FormRequest,
  sortedAggregatedResponses: AggregatedResponses,
) {
  const localData = cachedJSON
    ? { ...cachedJSON }
    : {
        metadata: { student_id: formRequest.student_id, rater_id: formRequest.completed_by },
        response: {} as Responses,
      };

  localData.response = sortedAggregatedResponses as unknown as Responses;
  return localData;
}

async function upsertFormResponse(
  isEditMode: boolean,
  existingResponseId: string | null,
  formRequestId: string,
  localData: { metadata: { student_id: string; rater_id: string }; response: Responses },
  professionalism: string,
) {
  if (isEditMode && existingResponseId) {
    const { error } = await supabase
      .from('form_responses')
      .update({ response: localData, professionalism })
      .eq('response_id', existingResponseId);
    if (!error) {
      console.log('Updated existing response:', existingResponseId);
    }
    return error;
  }

  const { error } = await supabase.from('form_responses').insert({
    request_id: formRequestId,
    response: localData,
    professionalism,
  });
  return error;
}

async function sendRaterNotificationEmail(formRequest: FormRequest): Promise<void> {
  if (!formRequest.email) return;

  try {
    await sendRaterEmail({
      to: formRequest.email,
      studentName: formRequest.display_name ?? 'Student',
    });
    console.log('Rater notification email sent');
  } catch (err: unknown) {
    console.error('Error sending rater notification email:', err);
  }
}

function useSpeechRecognitionControls({
  setProfessionalism,
  setTextInputs,
  setSaveStatus,
}: {
  setProfessionalism: React.Dispatch<React.SetStateAction<string>>;
  setTextInputs: React.Dispatch<React.SetStateAction<TextInputs>>;
  setSaveStatus: React.Dispatch<React.SetStateAction<string>>;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeTargetRef = useRef<ActiveTarget>(null);

  const [listeningByField, setListeningByField] = useState<Record<string, boolean>>({});
  const [statusByField, setStatusByField] = useState<Record<string, string>>({});

  const showSpeechNotSupportedMessage = useCallback(() => {
    setSaveStatus('Speech-to-text not supported. Use Chrome/Edge.');
    setTimeout(() => setSaveStatus(''), 5000);
  }, [setSaveStatus]);

  const toggleRecognitionForTarget = useCallback(
    (target: Exclude<ActiveTarget, null>, isListening: boolean) => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        showSpeechNotSupportedMessage();
        return;
      }

      try {
        if (isListening) {
          recognition.stop();
          return;
        }

        stopRecognitionSafely(recognition);
        activeTargetRef.current = target;
        recognition.start();
      } catch {}
    },
    [showSpeechNotSupportedMessage]
  );

  useEffect(() => {
    const speechWindow = window as WindowWithSpeechRecognition;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    const getCurrentFieldKey = () => getTargetFieldKey(activeTargetRef.current);

    recognition.onstart = () => {
      const key = getCurrentFieldKey();
      if (!key) return;

      setListeningByField((prev) => ({ ...prev, [key]: true }));
      setStatusByField((prev) => ({ ...prev, [key]: 'Listening…' }));
    };

    recognition.onend = () => {
      const key = getCurrentFieldKey();
      if (!key) return;

      setListeningByField((prev) => ({ ...prev, [key]: false }));
      setStatusByField((prev) => ({ ...prev, [key]: '' }));
    };

    recognition.onerror = (e) => {
      const key = getCurrentFieldKey();
      if (!key) return;

      setListeningByField((prev) => ({ ...prev, [key]: false }));
      setStatusByField((prev) => ({ ...prev, [key]: `Error: ${e?.error || 'unknown'}` }));
    };

    recognition.onresult = (event) => {
      const target = activeTargetRef.current;
      if (!target) return;

      const key = getCurrentFieldKey();
      if (!key) return;

      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }

      if (finalText.trim()) {
        if (target.type === 'professionalism') {
          setProfessionalism((prev) => appendTranscript(prev, finalText));
        } else {
          setTextInputs((prev) => {
            const existing = prev[target.epaId]?.[target.questionId] ?? '';
            const newValue = appendTranscript(existing, finalText);
            return {
              ...prev,
              [target.epaId]: {
                ...prev[target.epaId],
                [target.questionId]: newValue,
              },
            };
          });
        }
        setSaveStatus('Saving...');
      }

      if (interimText.trim()) {
        setStatusByField((prev) => ({ ...prev, [key]: `Listening… “${interimText.trim()}”` }));
      } else {
        setStatusByField((prev) => ({ ...prev, [key]: 'Listening…' }));
      }
    };

    recognitionRef.current = recognition;

    return () => {
      stopRecognitionSafely(recognition);
    };
  }, [setProfessionalism, setSaveStatus, setTextInputs]);

  const toggleDictation = useCallback(
    (epaId: number, questionId: string) => {
      const key = makeFieldKey(epaId, questionId);
      toggleRecognitionForTarget({ type: 'epa', epaId, questionId }, !!listeningByField[key]);
    },
    [listeningByField, toggleRecognitionForTarget]
  );

  const toggleProfessionalismDictation = useCallback(() => {
    toggleRecognitionForTarget(
      { type: 'professionalism' },
      !!listeningByField[professionalismFieldKey]
    );
  }, [listeningByField, toggleRecognitionForTarget]);

  return {
    listeningByField,
    statusByField,
    toggleDictation,
    toggleProfessionalismDictation,
  };
}

function useAISummaryControls({
  textInputs,
  professionalism,
  kfData,
  responses,
  aiModel,
  incrementUsage,
  setSaveStatus,
  setTextInputs,
  setProfessionalism,
}: {
  textInputs: TextInputs;
  professionalism: string;
  kfData: KeyFunction[];
  responses: Responses;
  aiModel: string;
  incrementUsage: () => Promise<void>;
  setSaveStatus: React.Dispatch<React.SetStateAction<string>>;
  setTextInputs: React.Dispatch<React.SetStateAction<TextInputs>>;
  setProfessionalism: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [summaryByField, setSummaryByField] = useState<Record<string, string>>({});
  const [summarizingByField, setSummarizingByField] = useState<Record<string, boolean>>({});
  const [summaryErrorByField, setSummaryErrorByField] = useState<Record<string, string>>({});

  const requestAISummary = useCallback(async (epaId: number, questionId: string) => {
    const key = makeFieldKey(epaId, questionId);
    const text = (textInputs[epaId]?.[questionId] ?? '').trim();

    if (!text) {
      setSummaryErrorByField((prev) => ({ ...prev, [key]: 'Nothing to summarize yet.' }));
      clearSummaryErrorAfterDelay(key, setSummaryErrorByField);
      return;
    }

    setSummarizingByField((prev) => ({ ...prev, [key]: true }));
    setSummaryErrorByField((prev) => ({ ...prev, [key]: '' }));

    try {
      const kfEntry = kfData.find((k) => k.epa === epaId && k.questionId === questionId);
      const kf = kfEntry?.kf ?? null;
      const checkedResponses = responses[epaId]?.[questionId] ?? {};
      const selectedOptions = kfEntry
        ? Object.entries(kfEntry.options)
            .filter(([optKey]) => checkedResponses[optKey] === true)
            .map(([, label]) => label)
        : [];

      const data = await callAISummaryAPI({ text, model: aiModel, kf, selectedOptions });
      await incrementUsage();
      setSummaryByField((prev) => ({ ...prev, [key]: (data.summary ?? '').trim() }));
    } catch (err: unknown) {
      setSummaryErrorByField((prev) => ({
        ...prev,
        [key]: getErrorMessage(err, 'Summary failed. Try again.'),
      }));
    } finally {
      setSummarizingByField((prev) => ({ ...prev, [key]: false }));
    }
  }, [aiModel, incrementUsage, kfData, responses, textInputs]);

  const requestProfessionalismSummary = useCallback(async () => {
    const key = professionalismFieldKey;
    const text = professionalism.trim();

    if (!text) {
      setSummaryErrorByField((prev) => ({ ...prev, [key]: 'Nothing to summarize yet.' }));
      clearSummaryErrorAfterDelay(key, setSummaryErrorByField);
      return;
    }

    setSummarizingByField((prev) => ({ ...prev, [key]: true }));
    setSummaryErrorByField((prev) => ({ ...prev, [key]: '' }));

    try {
      const data = await callAISummaryAPI({ text, model: aiModel, kf: 'professionalism' });
      await incrementUsage();
      setSummaryByField((prev) => ({ ...prev, [key]: (data.summary ?? '').trim() }));
    } catch (err: unknown) {
      setSummaryErrorByField((prev) => ({
        ...prev,
        [key]: getErrorMessage(err, 'Summary failed. Try again.'),
      }));
    } finally {
      setSummarizingByField((prev) => ({ ...prev, [key]: false }));
    }
  }, [aiModel, incrementUsage, professionalism]);

  const insertSummaryIntoTextarea = useCallback((epaId: number, questionId: string) => {
    const key = makeFieldKey(epaId, questionId);
    const summary = (summaryByField[key] ?? '').trim();
    const kf = kfData.find((item) => item.epa === epaId && item.questionId === questionId)?.kf ?? null;
    if (!getSummaryGuard(summary, kf).canApply) return;

    setTextInputs((prev) => {
      const existing = prev[epaId]?.[questionId] ?? '';
      const newValue = (existing ? existing.trimEnd() + '\n\n' : '') + `${summary}\n`;
      return {
        ...prev,
        [epaId]: {
          ...prev[epaId],
          [questionId]: newValue,
        },
      };
    });

    setSaveStatus('Saving...');
  }, [kfData, setSaveStatus, setTextInputs, summaryByField]);

  const replaceTextareaWithSummary = useCallback((epaId: number, questionId: string) => {
    const key = makeFieldKey(epaId, questionId);
    const summary = (summaryByField[key] ?? '').trim();
    const kf = kfData.find((item) => item.epa === epaId && item.questionId === questionId)?.kf ?? null;
    if (!getSummaryGuard(summary, kf).canApply) return;

    setTextInputs((prev) => ({
      ...prev,
      [epaId]: {
        ...prev[epaId],
        [questionId]: `${summary}\n`,
      },
    }));

    setSaveStatus('Saving...');
    setSummaryByField((prev) => ({ ...prev, [key]: '' }));
  }, [kfData, setSaveStatus, setTextInputs, summaryByField]);

  const insertProfessionalismSummary = useCallback(() => {
    const key = professionalismFieldKey;
    const summary = (summaryByField[key] ?? '').trim();
    if (!getSummaryGuard(summary, 'professionalism').canApply) return;

    setProfessionalism((prev) => (prev ? prev.trimEnd() + '\n\n' : '') + `${summary}\n`);
    setSaveStatus('Saving...');
  }, [setProfessionalism, setSaveStatus, summaryByField]);

  const replaceProfessionalismWithSummary = useCallback(() => {
    const key = professionalismFieldKey;
    const summary = (summaryByField[key] ?? '').trim();
    if (!getSummaryGuard(summary, 'professionalism').canApply) return;

    setProfessionalism(`${summary}\n`);
    setSaveStatus('Saving...');
    setSummaryByField((prev) => ({ ...prev, [key]: '' }));
  }, [setProfessionalism, setSaveStatus, summaryByField]);

  return {
    summaryByField,
    summarizingByField,
    summaryErrorByField,
    requestAISummary,
    requestProfessionalismSummary,
    insertSummaryIntoTextarea,
    replaceTextareaWithSummary,
    insertProfessionalismSummary,
    replaceProfessionalismWithSummary,
  };
}

async function submitFinalEvaluation({
  formRequest,
  submittingFinal,
  responses,
  textInputs,
  kfData,
  cachedJSON,
  professionalism,
  isEditMode,
  existingResponseId,
  studentId,
  router,
  setSubmittingFinal,
  setSubmitSuccess,
}: {
  formRequest: FormRequest | null;
  submittingFinal: boolean;
  responses: Responses;
  textInputs: TextInputs;
  kfData: KeyFunction[];
  cachedJSON: { metadata: { student_id: string; rater_id: string }; response: Responses } | null;
  professionalism: string;
  isEditMode: boolean;
  existingResponseId: string | null;
  studentId: string;
  router: { push: (path: string) => void };
  setSubmittingFinal: React.Dispatch<React.SetStateAction<boolean>>;
  setSubmitSuccess: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  if (!formRequest || submittingFinal) return;

  setSubmittingFinal(true);

  const mergedResponses = mergeTextInputsIntoResponses(responses, textInputs);
  const questionMapping = buildQuestionMapping(kfData);
  const sortedAggregatedResponses = sortAggregatedByEpaAndKf(
    aggregateByKF(mergedResponses, questionMapping),
  );

  const localData = buildSubmissionData(cachedJSON, formRequest, sortedAggregatedResponses);

  const { error: updateError } = await supabase.from('form_requests').update({ active_status: false }).eq('id', formRequest.id);
  if (updateError) {
    console.error('Error updating form request status:', updateError.message);
    setSubmittingFinal(false);
    return;
  }

  const responseError = await upsertFormResponse(
    isEditMode,
    existingResponseId,
    formRequest.id,
    localData,
    professionalism,
  );

  if (responseError) {
    console.error('Error submitting form:', responseError.message);
    setSubmittingFinal(false);
    return;
  }

  await sendRaterNotificationEmail(formRequest);

  localStorage.removeItem(`form-progress-${formRequest.id}`);
  localStorage.removeItem(`form-progress-${studentId}`);
  setSubmitSuccess(true);

  setTimeout(() => router.push('/dashboard'), 2000);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RaterFormsPage() {
  useRequireRole(['rater', 'dev']);

  const { user: authUser } = useUser();
  const { model: aiModel, incrementUsage } = useAIPreferences(authUser?.id);

  const [epas, setEPAs] = useState<EPA[]>([]);
  const [kfData, setKFData] = useState<KeyFunction[]>([]);
  const [selectedEPAs, setSelectedEPAs] = useState<number[]>([]);
  const [completedEPAs, setCompletedEPAs] = useState<{ [epa: number]: boolean }>({});
  const [currentEPA, setCurrentEPA] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectionCollapsed, setSelectionCollapsed] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(280);
  const isResizing = useRef(false);
  const [formRequest, setFormRequest] = useState<FormRequest | null>(null);
  const [responses, setResponses] = useState<Responses>({});
  const [cachedJSON, setCachedJSON] = useState<{
    metadata: { student_id: string; rater_id: string };
    response: Responses;
  } | null>(null);

  const [textInputs, setTextInputs] = useState<TextInputs>({});
  const [professionalism, setProfessionalism] = useState<string>('');
  const [showProfessionalismForm, setShowProfessionalismForm] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submittingFinal, setSubmittingFinal] = useState(false);

  const [existingResponseId, setExistingResponseId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams?.get('id') ?? '';

  // =========================================================
  // VOICE TO TEXT
  // =========================================================
  const {
    listeningByField,
    statusByField,
    toggleDictation,
    toggleProfessionalismDictation,
  } = useSpeechRecognitionControls({ setProfessionalism, setTextInputs, setSaveStatus });

  // =========================
  // AI SUMMARY
  // =========================
  const {
    summaryByField,
    summarizingByField,
    summaryErrorByField,
    requestAISummary,
    requestProfessionalismSummary,
    insertSummaryIntoTextarea,
    replaceTextareaWithSummary,
    insertProfessionalismSummary,
    replaceProfessionalismWithSummary,
  } = useAISummaryControls({
    textInputs,
    professionalism,
    kfData,
    responses,
    aiModel,
    incrementUsage,
    setSaveStatus,
    setTextInputs,
    setProfessionalism,
  });

  // =========================================================
  // AUTOSAVE
  // =========================================================
  const debouncedSave = useCallback(() => {
    const debouncedFunction = debounce(
      (
        newResponses: Responses,
        newTextInputs: TextInputs,
        newProfessionalism: string,
        newSelectedEPAs: number[]
      ) => {
        const formProgress = {
          responses: newResponses,
          textInputs: newTextInputs,
          professionalism: newProfessionalism,
          selectedEPAs: newSelectedEPAs,
        };
        localStorage.setItem(`form-progress-${studentId}`, JSON.stringify(formProgress));
      },
      1000
    );
    return debouncedFunction;
  }, [studentId])();

  const saveProgress = useCallback(() => {
    debouncedSave(responses, textInputs, professionalism, selectedEPAs);
  }, [debouncedSave, responses, textInputs, professionalism, selectedEPAs]);

  useEffect(() => {
    if (!studentId) return;

    const cacheKey = `form-progress-${studentId}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData) as {
          responses: Responses;
          textInputs: TextInputs;
          professionalism: string;
          selectedEPAs?: number[];
        };
        setResponses(parsedData.responses || {});
        setTextInputs(parsedData.textInputs || {});
        setProfessionalism(parsedData.professionalism || '');
        if (parsedData.selectedEPAs) setSelectedEPAs(parsedData.selectedEPAs);
      } catch (error: unknown) {
        console.error('Error parsing cached data', error);
      }
    }
  }, [studentId]);

  useEffect(() => {
    saveProgress();
  }, [responses, textInputs, professionalism, saveProgress]);

  useEffect(() => {
    if (selectedEPAs.length > 0 && selectedEPAs.every((epaId: number) => completedEPAs[epaId])) {
      setShowProfessionalismForm(true);
    } else {
      setShowProfessionalismForm(false);
    }
  }, [selectedEPAs, completedEPAs]);

  useEffect(() => {
    async function fetchFormRequestDetails(): Promise<void> {
      if (!studentId) return;

      const { data: formData, error: formError } = await supabase
        .from('form_requests')
        .select('*')
        .eq('id', studentId)
        .single();

      if (formError || !formData) {
        console.error('Failed to fetch form request:', formError?.message);
        return;
      }

      const { data: users, error: userError } = await supabase.rpc('fetch_users');
      if (userError) {
        console.error('Failed to fetch users:', userError.message);
        return;
      }

      interface User {
        user_id: string;
        display_name?: string;
        email?: string;
      }

      const student = (users as User[]).find((u) => u.user_id === formData.student_id);

      const fr: FormRequest = {
        ...(formData as FormRequestRow),
        display_name: student?.display_name ?? 'Unknown',
        email: student?.email ?? 'Unknown',
      };
      setFormRequest(fr);
    }

    fetchFormRequestDetails();
  }, [studentId]);

  useEffect(() => {
    async function fetchExistingResponse() {
      if (!studentId || !kfData || kfData.length === 0) return;

      try {
        const { data: existingResponse, error } = await supabase
          .from('form_responses')
          .select('response_id, response, professionalism')
          .eq('request_id', studentId)
          .single();

        if (error || !existingResponse) {
          setIsEditMode(false);
          return;
        }

        setExistingResponseId(existingResponse.response_id);
        setIsEditMode(true);
        setSaveStatus('Loading previous responses...');

        const responseData = existingResponse.response as ExistingResponseData;
        const aggregatedResponses = responseData?.response || {};

        const kfToQuestions = buildKfToQuestionsMap(kfData);
        const { rebuiltResponses, rebuiltTextInputs } = rebuildResponsesFromAggregated(
          aggregatedResponses,
          kfToQuestions,
        );

        setResponses(rebuiltResponses);
        setTextInputs(rebuiltTextInputs);
        setProfessionalism(existingResponse.professionalism || '');

        const selectedEPAIds = Object.keys(rebuiltResponses).map(Number);
        setSelectedEPAs(selectedEPAIds);

        const completed: { [epa: number]: boolean } = {};
        selectedEPAIds.forEach((epaId) => {
          completed[epaId] = true;
        });
        setCompletedEPAs(completed);

        setSaveStatus('Previous responses loaded');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (error) {
        console.error('Error fetching existing response:', error);
        setSaveStatus('');
      }
    }

    fetchExistingResponse();
  }, [studentId, kfData]);

  useEffect(() => {
    if (!formRequest) return;
    if (!cachedJSON) {
      setCachedJSON({
        metadata: {
          student_id: formRequest.student_id,
          rater_id: formRequest.completed_by,
        },
        response: {},
      });
    }
  }, [formRequest, cachedJSON]);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      setLoading(true);

      const { data: epaData, error: epaError } = await supabase.from('epa_kf_descriptions').select('*');
      if (epaError) {
        console.error('EPA Fetch Error:', epaError);
      } else {
        const epaDescriptions = (epaData as EpaDescriptionRow[] | null)?.[0]?.epa_descriptions;
        if (epaDescriptions) {
          const formattedEPAs: EPA[] = Object.entries(epaDescriptions).map(([key, value]) => ({
            id: Number.parseInt(key, 10),
            description: value,
          }));
          setEPAs(formattedEPAs);
        }
      }

      const latestMCQs = await getLatestMCQs();
      if (latestMCQs) {
        const formattedKFData: KeyFunction[] = latestMCQs.map(
          (mcq: { epa: string; kf: string; question: string; options: { [key: string]: string } }) => ({
            kf: mcq.kf,
            epa: Number.parseInt(mcq.epa, 10),
            question: mcq.question,
            options: mcq.options,
            questionId: Object.keys(mcq.options).sort(compareNumericDotStrings)[0],
          })
        );
        setKFData(formattedKFData);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (kfData.length === 0 || selectedEPAs.length === 0) return;

    setResponses((prev: Responses) => {
      const newResponses: Responses = { ...prev };

      for (const kf of kfData) {
        if (!selectedEPAs.includes(kf.epa)) continue;

        const epa = kf.epa;
        const questionId = kf.questionId;

        if (!newResponses[epa]) newResponses[epa] = {};

        if (!newResponses[epa][questionId]) {
          const defaults: { [key: string]: boolean } = {};
          for (const optKey of Object.keys(kf.options)) defaults[optKey] = false;
          newResponses[epa][questionId] = { ...defaults, text: '' };
        }
      }

      return newResponses;
    });
  }, [kfData, selectedEPAs]);

  const toggleEPASelection = useCallback(
    (epaId: number): void => {
      setSelectedEPAs((prev: number[]) => {
        if (prev.includes(epaId)) {
          setResponses((prevResponses) => {
            const updatedResponses = { ...prevResponses };
            delete updatedResponses[epaId];
            return updatedResponses;
          });

          setTextInputs((prevTextInputs) => {
            const updatedTextInputs = { ...prevTextInputs };
            delete updatedTextInputs[epaId];
            return updatedTextInputs;
          });

          removeEpaFromProgressCache(studentId, epaId);

          return prev.filter((id) => id !== epaId);
        }

        return [...prev, epaId];
      });
    },
    [studentId]
  );

  const toggleSelectionCollapse = useCallback((): void => {
    setSelectionCollapsed((prev: boolean) => !prev);
  }, []);

  const submitEPAs = useCallback((): void => {
    if (selectedEPAs.length === 0) return;

    pruneProgressCacheToSelectedEpas(studentId, selectedEPAs);

    setCurrentEPA(selectedEPAs[0]);
    setSelectionCollapsed(true);
  }, [selectedEPAs, studentId]);

  const handleOptionChange = useCallback((epaId: number, questionId: string, optionKey: string, value: boolean): void => {
    setResponses((prev: Responses) => {
      const epaResponses = prev[epaId] || {};
      const questionResponses = epaResponses[questionId] || { text: '' };
      return {
        ...prev,
        [epaId]: {
          ...epaResponses,
          [questionId]: {
            ...questionResponses,
            [optionKey]: value,
          },
        },
      };
    });
  }, []);

  const handleTextInputChange = (epaId: number, questionId: string, value: string): void => {
    setTextInputs((prev) => ({
      ...prev,
      [epaId]: {
        ...prev[epaId],
        [questionId]: value,
      },
    }));
    setSaveStatus('Saving...');
  };

  const handleProfessionalismChange = (value: string) => {
    setProfessionalism(value);
    setSaveStatus('Saving...');
  };

  const moveToNextEPA = useCallback(() => {
    if (!currentEPA || selectedEPAs.length === 0) return;

    const currentIndex = selectedEPAs.indexOf(currentEPA);
    if (currentIndex < selectedEPAs.length - 1) setCurrentEPA(selectedEPAs[currentIndex + 1]);
    else setCurrentEPA(null);
  }, [currentEPA, selectedEPAs]);

  const handleFormCompletion = useCallback(
    (epaId: number) => {
      setCompletedEPAs((prev) => ({ ...prev, [epaId]: true }));
      saveProgress();
      moveToNextEPA();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [saveProgress, moveToNextEPA]
  );

  const finalSubmit = useCallback(async () => {
    await submitFinalEvaluation({
      formRequest,
      submittingFinal,
      responses,
      textInputs,
      kfData,
      cachedJSON,
      professionalism,
      isEditMode,
      existingResponseId,
      studentId,
      router,
      setSubmittingFinal,
      setSubmitSuccess,
    });
  }, [
    cachedJSON,
    existingResponseId,
    formRequest,
    isEditMode,
    kfData,
    professionalism,
    responses,
    router,
    studentId,
    submittingFinal,
    textInputs,
  ]);

  return (
    <>
      <style jsx>{`
        .save-status-container {
          position: relative;
          height: 0;
        }

        .save-status {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 1000;
          max-width: 300px;
          transition: all 0.3s ease;
        }

        .save-status.sticky {
          position: sticky;
          top: 20px;
          bottom: auto;
          left: auto;
        }

        .comment-wrapper {
          position: relative;
          width: 100%;
        }

        .comment-textarea {
          padding-right: 110px;
          min-height: 90px;
          resize: vertical;
        }

        .vtt-btn {
          border: 1px solid var(--bs-border-color);
          background: var(--bs-secondary-bg);
          color: var(--bs-body-color);
          border-radius: 6px;
          padding: 6px 8px;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vtt-btn:hover {
          background: var(--bs-tertiary-bg);
          border-color: var(--bs-secondary-color);
        }

        .vtt-btn.recording {
          background: rgba(220, 53, 69, 0.15);
          border-color: #dc3545;
          color: #dc3545;
        }

        .vtt-btn i {
          font-size: 20px;
          line-height: 1;
        }

        .vtt-status {
          font-size: 12px;
          color: var(--bs-secondary-color);
          margin-top: 6px;
        }
      `}</style>

      <div className='container-fluid d-flex' style={{ position: 'relative' }}>
        {/* Sidebar */}
        <div
          style={{
            width: sidebarOpen ? sidebarWidth : 0,
            minWidth: 0,
            overflow: 'hidden',
            flexShrink: 0,
            transition: isResizing.current ? 'none' : 'width 0.3s ease',
            position: 'relative',
          }}
          className='bg-body-secondary'
        >
        <div style={{ width: sidebarWidth, padding: '1.5rem' }}>
          <h3 className='mb-3'>Selected EPAs</h3>

          <ul className='list-group'>
            {selectedEPAs.length === 0 ? (
              <li className='list-group-item'>No EPAs selected</li>
            ) : (
              <>
                {[...selectedEPAs].sort((a, b) => a - b).map((epaId) => {
                  const epaItem = epas.find((e) => e.id === epaId);

                  return (
                    <li
                      key={epaId}
                      className={`list-group-item d-flex justify-content-between align-items-center ${
                        currentEPA === epaId ? 'active' : ''
                      }`}
                      onClick={() => setCurrentEPA(epaId)}
                      data-bs-toggle='tooltip'
                      data-bs-placement='right'
                      title={epaItem?.description || ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className='badge bg-primary me-2'>EPA {epaId}</span>
                      <span className='text-truncate' style={{ maxWidth: '150px' }}>
                        {epaItem?.description || ''}
                      </span>
                      <span className={`badge bg-${completedEPAs[epaId] ? 'success' : 'danger'}`}>
                        {completedEPAs[epaId] ? '✔' : '❌'}
                      </span>
                    </li>
                  );
                })}

                {selectedEPAs.length > 0 && (
                  <li
                    className={`list-group-item d-flex justify-content-between align-items-center ${
                      showProfessionalismForm ? 'active' : ''
                    } ${selectedEPAs.every((epaId) => completedEPAs[epaId]) ? '' : 'pe-none'}`}
                    onClick={() => {
                      if (selectedEPAs.every((epaId) => completedEPAs[epaId])) setShowProfessionalismForm(true);
                    }}
                    style={{
                      cursor: selectedEPAs.every((epaId) => completedEPAs[epaId]) ? 'pointer' : 'not-allowed',
                      opacity: selectedEPAs.every((epaId) => completedEPAs[epaId]) ? 1 : 0.6,
                    }}
                  >
                    <span className='badge bg-info me-2'>Final</span>
                    <span className='text-truncate' style={{ maxWidth: '150px' }}>
                      Professionalism Assessment
                    </span>
                    <span className={`badge bg-${professionalism ? 'success' : 'danger'}`}>
                      {professionalism ? '✔' : '❌'}
                    </span>
                  </li>
                )}
              </>
            )}
          </ul>

          <div className='save-status-container'>
            <div
              className={`save-status alert alert-info ${saveStatus ? '' : 'opacity-0'}`}
              ref={(el) => {
                if (!el) return;

                const observer = new IntersectionObserver(
                  ([entry]) => {
                    if (entry) entry.target.classList.toggle('sticky', !entry.isIntersecting);
                  },
                  { threshold: [0], rootMargin: '-20px 0px 0px 0px' }
                );

                observer.observe(el);
              }}
            >
              {saveStatus}
            </div>
          </div>
        </div>{/* end inner fixed-width div */}
        </div>{/* end sliding sidebar */}

        {/* Resize handle + toggle button */}
        <div
          style={{
            width: 8,
            flexShrink: 0,
            position: 'relative',
            cursor: sidebarOpen ? 'col-resize' : 'default',
            background: 'var(--bs-border-color)',
            transition: 'background 0.15s',
          }}
          onMouseDown={(e) => {
            if (!sidebarOpen) return;
            isResizing.current = true;
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            const onMove = (ev: MouseEvent) => {
              const newWidth = Math.max(160, Math.min(500, startWidth + ev.clientX - startX));
              setSidebarWidth(newWidth);
            };
            const onUp = () => {
              isResizing.current = false;
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
          onMouseEnter={(e) => { if (sidebarOpen) (e.currentTarget as HTMLDivElement).style.background = 'var(--bs-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bs-border-color)'; }}
        >
          {/* Toggle chevron button centred on the handle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              width: 20,
              height: 40,
              padding: 0,
              border: 'none',
              borderRadius: 4,
              background: 'var(--bs-secondary-bg)',
              color: 'var(--bs-body-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <i className={`bi bi-chevron-${sidebarOpen ? 'left' : 'right'}`} style={{ fontSize: 11 }} />
          </button>
        </div>

        <div className='p-4' style={{ flex: 1, minWidth: 0 }}>
          {submitSuccess && (
            <div className='alert alert-success mb-3'>Form submitted successfully! Redirecting to dashboard...</div>
          )}

          {isEditMode && (
            <div className='alert alert-warning mb-3 d-flex align-items-center'>
              <i className='bi bi-pencil-square me-2'></i>
              <div>
                <strong>Edit Mode:</strong> You are updating a previously submitted evaluation.
                Your changes will replace the existing submission.
              </div>
            </div>
          )}

          {loading ? (
            <p>Loading data...</p>
          ) : (
            <>
              {formRequest && (
                <div className='card p-3 mb-4 shadow-sm bg-body-secondary'>
                  <div className='row'>
                    <div className='col-md-4'>
                      <h5 className='fw-bold mb-1'>{formRequest.display_name}</h5>
                      <p className='text-muted mb-1'>{formRequest.email}</p>
                      <p className='text-muted mb-0'>Setting: {formRequest.clinical_settings || 'N/A'}</p>
                      <small className='text-muted'>{new Date(formRequest.created_at).toLocaleString()}</small>
                    </div>
                    <div className='col-md-4 border-start'>
                      <div className='text-secondary fw-bold mb-1'>Relevant Activity:</div>
                      <span>{formRequest.notes || 'No notes provided'}</span>
                    </div>
                    <div className='col-md-4 border-start'>
                      <div className='text-secondary fw-bold mb-1'>Stated Goals:</div>
                      <span>{formRequest.goals || 'No goals provided'}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectionCollapsed ? (
                <button className='btn btn-secondary mb-3' onClick={toggleSelectionCollapse}>
                  Modify EPA Selection
                </button>
              ) : (
                <>
                  <h2 className='mb-3'>Select EPAs for Evaluation</h2>
                  <div className='d-flex flex-wrap gap-2'>
                    {epas.length === 0 ? (
                      <p>No EPAs available.</p>
                    ) : (
                      epas.map((epa) => (
                        <button
                          key={epa.id}
                          className={`btn ${selectedEPAs.includes(epa.id) ? 'btn-primary' : 'btn-outline-secondary'} text-start`}
                          style={{ minWidth: '150px', maxWidth: '300px' }}
                          onClick={() => toggleEPASelection(epa.id)}
                        >
                          <span className='badge bg-primary me-2'>EPA {epa.id}</span>
                          {epa.description}
                        </button>
                      ))
                    )}
                  </div>
                  <button className='btn btn-success mt-3' onClick={submitEPAs} disabled={selectedEPAs.length === 0}>
                    Submit Selection
                  </button>
                </>
              )}
            </>
          )}

          {currentEPA !== null && (
            <div key={currentEPA} className='card mt-4'>
              <div className='card-header bg-primary text-white'>
                {epas.find((e) => e.id === currentEPA)?.description || 'EPA Not Found'}
              </div>

              <div className='card-body'>
                {kfData
                  .filter((kf) => kf.epa === currentEPA)
                  .map((kf) => {
                    const questionKey = kf.questionId;
                    const currentText = textInputs[currentEPA]?.[questionKey] || '';

                    const fieldKey = makeFieldKey(currentEPA, questionKey);
                    const isListening = !!listeningByField[fieldKey];
                    const vttStatus = statusByField[fieldKey] || '';

                    const summary = summaryByField[fieldKey] || '';
                    const isSummarizing = !!summarizingByField[fieldKey];
                    const summaryErr = summaryErrorByField[fieldKey] || '';
                    const summaryGuard = getSummaryGuard(summary, kf.kf);

                    return (
                      <EPAQuestionSection
                        key={questionKey}
                        epaId={currentEPA}
                        kf={kf}
                        currentText={currentText}
                        isListening={isListening}
                        vttStatus={vttStatus}
                        summary={summary}
                        isSummarizing={isSummarizing}
                        summaryErr={summaryErr}
                        summaryGuard={summaryGuard}
                        isChecked={(qid, optionKey) => !!responses[currentEPA]?.[qid]?.[optionKey]}
                        onOptionChange={(qid, optionKey, value) =>
                          handleOptionChange(currentEPA, qid, optionKey, value)
                        }
                        onTextChange={(qid, value) => handleTextInputChange(currentEPA, qid, value)}
                        onRequestSummary={(qid) => requestAISummary(currentEPA, qid)}
                        onToggleDictation={(qid) => toggleDictation(currentEPA, qid)}
                        onInsertSummary={(qid) => insertSummaryIntoTextarea(currentEPA, qid)}
                        onReplaceSummary={(qid) => replaceTextareaWithSummary(currentEPA, qid)}
                      />
                    );
                  })}

                <button
                  className='btn btn-success mt-3'
                  onClick={() => {
                    if (currentEPA !== null) handleFormCompletion(currentEPA);
                  }}
                >
                  Mark as Completed
                </button>
              </div>
            </div>
          )}

          {showProfessionalismForm ? (
            <ProfessionalismSection
              professionalism={professionalism}
              isListening={!!listeningByField[professionalismFieldKey]}
              isSummarizing={!!summarizingByField[professionalismFieldKey]}
              vttStatus={statusByField[professionalismFieldKey] || ''}
              summaryError={summaryErrorByField[professionalismFieldKey] || ''}
              summary={summaryByField[professionalismFieldKey] || ''}
              onChange={handleProfessionalismChange}
              onRequestSummary={requestProfessionalismSummary}
              onToggleDictation={toggleProfessionalismDictation}
              onInsertSummary={insertProfessionalismSummary}
              onReplaceSummary={replaceProfessionalismWithSummary}
              onSubmit={finalSubmit}
              submittingFinal={submittingFinal}
              isEditMode={isEditMode}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
