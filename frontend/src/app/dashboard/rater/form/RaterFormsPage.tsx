'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { createClient } from '@/utils/supabase/client';
import { getLatestMCQs } from '@/utils/get-epa-data';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRequireRole } from '@/utils/useRequiredRole';
import 'bootstrap/dist/css/bootstrap.min.css';

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

type Responses = {
  [epa: number]: {
    [questionId: string]: { [optionKey: string]: boolean } & { text: string };
  };
};

interface AggregatedResponseForKF {
  [optionKey: string]: boolean | string[];
  text: string[];
}

type AggregatedResponses = {
  [epa: number]: {
    [kf: string]: AggregatedResponseForKF;
  };
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

export default function RaterFormsPage() {
  useRequireRole(['rater', 'dev']);

  const [epas, setEPAs] = useState<EPA[]>([]);
  const [kfData, setKFData] = useState<KeyFunction[]>([]);
  const [selectedEPAs, setSelectedEPAs] = useState<number[]>([]);
  const [completedEPAs, setCompletedEPAs] = useState<{ [epa: number]: boolean }>({});
  const [currentEPA, setCurrentEPA] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectionCollapsed, setSelectionCollapsed] = useState<boolean>(false);
  const [formRequest, setFormRequest] = useState<FormRequest | null>(null);
  const [responses, setResponses] = useState<Responses>({});
  const [cachedJSON, setCachedJSON] = useState<{
    metadata: { student_id: string; rater_id: string };
    response: Responses;
  } | null>(null);

  const [textInputs, setTextInputs] = useState<{ [epa: number]: { [questionId: string]: string } }>({});
  const [professionalism, setProfessionalism] = useState<string>('');
  const [showProfessionalismForm, setShowProfessionalismForm] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submittingFinal, setSubmittingFinal] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams?.get('id') ?? '';

  // =========================================================
  // VOICE TO TEXT (interimResults + continuous)
  // =========================================================
  const recognitionRef = useRef<any>(null);
  const activeTargetRef = useRef<{ epaId: number; questionId: string } | null>(null);

  const [listeningByField, setListeningByField] = useState<Record<string, boolean>>({});
  const [statusByField, setStatusByField] = useState<Record<string, string>>({});

  const makeFieldKey = (epaId: number, questionId: string) => `${epaId}::${questionId}`;

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // change to 'ms-MY' if needed
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      const target = activeTargetRef.current;
      if (!target) return;
      const key = makeFieldKey(target.epaId, target.questionId);
      setListeningByField((prev) => ({ ...prev, [key]: true }));
      setStatusByField((prev) => ({ ...prev, [key]: 'Listening…' }));
    };

    recognition.onend = () => {
      const target = activeTargetRef.current;
      if (!target) return;
      const key = makeFieldKey(target.epaId, target.questionId);
      setListeningByField((prev) => ({ ...prev, [key]: false }));
      setStatusByField((prev) => ({ ...prev, [key]: '' }));
    };

    recognition.onerror = (e: any) => {
      const target = activeTargetRef.current;
      if (!target) return;
      const key = makeFieldKey(target.epaId, target.questionId);
      setListeningByField((prev) => ({ ...prev, [key]: false }));
      setStatusByField((prev) => ({ ...prev, [key]: `Error: ${e?.error || 'unknown'}` }));
    };

    recognition.onresult = (event: any) => {
      const target = activeTargetRef.current;
      if (!target) return;

      const key = makeFieldKey(target.epaId, target.questionId);

      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }

      if (finalText.trim()) {
        setTextInputs((prev) => {
          const existing = prev[target.epaId]?.[target.questionId] ?? '';
          const newValue = (existing ? existing.trimEnd() + ' ' : '') + finalText.trim();
          return {
            ...prev,
            [target.epaId]: {
              ...prev[target.epaId],
              [target.questionId]: newValue,
            },
          };
        });
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
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  const toggleDictation = (epaId: number, questionId: string) => {
    if (!recognitionRef.current) {
      setSaveStatus('Speech-to-text not supported. Use Chrome/Edge.');
      setTimeout(() => setSaveStatus(''), 5000);
      return;
    }

    const key = makeFieldKey(epaId, questionId);
    const isListening = !!listeningByField[key];

    try {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        try {
          recognitionRef.current.stop();
        } catch {}
        activeTargetRef.current = { epaId, questionId };
        recognitionRef.current.start();
      }
    } catch {}
  };

  // =========================
  // AI SUMMARY (per field)
  // =========================
  const [summaryByField, setSummaryByField] = useState<Record<string, string>>({});
  const [summarizingByField, setSummarizingByField] = useState<Record<string, boolean>>({});
  const [summaryErrorByField, setSummaryErrorByField] = useState<Record<string, string>>({});

  const requestAISummary = async (epaId: number, questionId: string) => {
    const key = makeFieldKey(epaId, questionId);
    const text = (textInputs[epaId]?.[questionId] ?? '').trim();

    if (!text) {
      setSummaryErrorByField((prev) => ({ ...prev, [key]: 'Nothing to summarize yet.' }));
      setTimeout(() => setSummaryErrorByField((prev) => ({ ...prev, [key]: '' })), 3000);
      return;
    }

    setSummarizingByField((prev) => ({ ...prev, [key]: true }));
    setSummaryErrorByField((prev) => ({ ...prev, [key]: '' }));

    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to summarize');
      }

      const data = (await res.json()) as { summary: string };
      setSummaryByField((prev) => ({ ...prev, [key]: (data.summary ?? '').trim() }));
    } catch (err: any) {
      setSummaryErrorByField((prev) => ({ ...prev, [key]: err?.message || 'Summary failed. Try again.' }));
    } finally {
      setSummarizingByField((prev) => ({ ...prev, [key]: false }));
    }
  };

  const insertSummaryIntoTextarea = (epaId: number, questionId: string) => {
    const key = makeFieldKey(epaId, questionId);
    const summary = (summaryByField[key] ?? '').trim();
    if (!summary) return;

    setTextInputs((prev) => {
      const existing = prev[epaId]?.[questionId] ?? '';
      const newValue = (existing ? existing.trimEnd() + '\n\n' : '') + `AI Summary:\n${summary}\n`;
      return {
        ...prev,
        [epaId]: {
          ...prev[epaId],
          [questionId]: newValue,
        },
      };
    });

    setSaveStatus('Saving...');
  };

  // ✅ NEW: Replace textarea with AI summary (deletes original comments)
  const replaceTextareaWithSummary = (epaId: number, questionId: string) => {
    const key = makeFieldKey(epaId, questionId);
    const summary = (summaryByField[key] ?? '').trim();
    if (!summary) return;

    setTextInputs((prev) => ({
      ...prev,
      [epaId]: {
        ...prev[epaId],
        [questionId]: `AI Summary:\n${summary}\n`,
      },
    }));

    setSaveStatus('Saving...');
  };

  // =========================================================
  // AUTOSAVE
  // =========================================================
  const debouncedSave = useCallback(() => {
    const debouncedFunction = debounce(
      (
        newResponses: Responses,
        newTextInputs: { [epa: number]: { [questionId: string]: string } },
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
        setSaveStatus('Autosaved at ' + new Date().toLocaleTimeString());
        setTimeout(() => setSaveStatus(''), 10000);
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
          textInputs: { [epa: number]: { [questionId: string]: string } };
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
        ...(formData as any),
        display_name: student?.display_name ?? 'Unknown',
        email: student?.email ?? 'Unknown',
      };
      setFormRequest(fr);
    }

    fetchFormRequestDetails();
  }, [studentId]);

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
      } else if (epaData && epaData.length > 0 && (epaData as any)[0].epa_descriptions) {
        const formattedEPAs: EPA[] = Object.entries((epaData as any)[0].epa_descriptions).map(([key, value]) => ({
          id: parseInt(key, 10),
          description: value as string,
        }));
        setEPAs(formattedEPAs);
      }

      const latestMCQs = await getLatestMCQs();
      if (latestMCQs) {
        const formattedKFData: KeyFunction[] = latestMCQs.map(
          (mcq: { epa: string; kf: string; question: string; options: { [key: string]: string } }) => ({
            kf: mcq.kf,
            epa: parseInt(mcq.epa, 10),
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

      kfData.forEach((kf) => {
        if (!selectedEPAs.includes(kf.epa)) return;

        const epa = kf.epa;
        const questionId = kf.questionId;

        if (!newResponses[epa]) newResponses[epa] = {} as any;

        if (!newResponses[epa][questionId]) {
          const defaults: { [key: string]: boolean } = {};
          Object.keys(kf.options).forEach((optKey) => (defaults[optKey] = false));
          newResponses[epa][questionId] = { ...defaults, text: '' } as any;
        }
      });

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

          const cachedData = localStorage.getItem(`form-progress-${studentId}`);
          if (cachedData) {
            try {
              const parsedData = JSON.parse(cachedData);
              if (parsedData.responses && parsedData.textInputs) {
                delete parsedData.responses[epaId];
                delete parsedData.textInputs[epaId];
                localStorage.setItem(`form-progress-${studentId}`, JSON.stringify(parsedData));
              }
            } catch (error) {
              console.error('Error updating cached JSON:', error);
            }
          }

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

    const cacheKey = `form-progress-${studentId}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const formProgress = JSON.parse(cachedData);

        if (formProgress.responses) {
          Object.keys(formProgress.responses).forEach((epaKey) => {
            if (!selectedEPAs.includes(Number(epaKey))) delete formProgress.responses[epaKey];
          });
        }

        if (formProgress.textInputs) {
          Object.keys(formProgress.textInputs).forEach((epaKey) => {
            if (!selectedEPAs.includes(Number(epaKey))) delete formProgress.textInputs[epaKey];
          });
        }

        localStorage.setItem(cacheKey, JSON.stringify(formProgress));
      } catch (error) {
        console.error('Error updating cached JSON:', error);
      }
    }

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

  async function finalSubmit() {
    if (!formRequest || submittingFinal) return;

    setSubmittingFinal(true);

    const mergedResponses: Responses = { ...responses };
    Object.keys(textInputs).forEach((epaKey) => {
      const epaNum = parseInt(epaKey, 10);
      if (!mergedResponses[epaNum]) mergedResponses[epaNum] = {} as any;

      Object.keys(textInputs[epaNum]).forEach((questionId) => {
        if (!mergedResponses[epaNum][questionId]) mergedResponses[epaNum][questionId] = { text: '' } as any;
        mergedResponses[epaNum][questionId].text = textInputs[epaNum][questionId];
      });
    });

    const questionMapping: { [questionId: string]: { kf: string; epa: number } } = {};
    kfData.forEach((q) => (questionMapping[q.questionId] = { kf: q.kf, epa: q.epa }));

    const aggregatedResponses: AggregatedResponses = {};
    Object.keys(mergedResponses).forEach((epaKey) => {
      const epaNum = parseInt(epaKey, 10);
      if (!aggregatedResponses[epaNum]) aggregatedResponses[epaNum] = {};

      Object.keys(mergedResponses[epaNum]).forEach((questionId) => {
        const mapping = questionMapping[questionId];
        if (!mapping) return;

        const kfKey = mapping.kf;
        if (!aggregatedResponses[epaNum][kfKey]) aggregatedResponses[epaNum][kfKey] = { text: [] };

        const qResponse = mergedResponses[epaNum][questionId];
        Object.keys(qResponse).forEach((key) => {
          if (key === 'text') return;
          aggregatedResponses[epaNum][kfKey][key] =
            (aggregatedResponses[epaNum][kfKey][key] as boolean | undefined) ?? qResponse[key];
        });

        aggregatedResponses[epaNum][kfKey].text.push(qResponse.text);
      });

      Object.keys(aggregatedResponses[epaNum]).forEach((kfKey) => {
        aggregatedResponses[epaNum][kfKey].text.sort((a, b) => compareNumericDotStrings(a, b));
      });
    });

    const sortedAggregatedResponses: AggregatedResponses = {};
    Object.keys(aggregatedResponses)
      .map((num) => parseInt(num, 10))
      .sort((a, b) => a - b)
      .forEach((epaNum) => {
        const kfGroup = aggregatedResponses[epaNum];
        const sortedKfKeys = Object.keys(kfGroup).sort(compareNumericDotStrings);
        sortedAggregatedResponses[epaNum] = {};
        sortedKfKeys.forEach((kfKey) => (sortedAggregatedResponses[epaNum][kfKey] = kfGroup[kfKey]));
      });

    const localData = cachedJSON
      ? { ...cachedJSON }
      : {
          metadata: { student_id: formRequest.student_id, rater_id: formRequest.completed_by },
          response: {} as Responses,
        };

    localData.response = sortedAggregatedResponses as unknown as Responses;

    const { error: updateError } = await supabase.from('form_requests').update({ active_status: false }).eq('id', formRequest.id);
    if (updateError) {
      console.error('Error updating form request status:', updateError.message);
      setSubmittingFinal(false);
      return;
    }

    const { error } = await supabase.from('form_responses').insert({
      request_id: formRequest.id,
      response: localData,
      professionalism,
    });

    if (error) {
      console.error('Error submitting form:', error.message);
      setSubmittingFinal(false);
      return;
    }

    localStorage.removeItem(`form-progress-${formRequest.id}`);
    localStorage.removeItem(`form-progress-${studentId}`);
    setSubmitSuccess(true);

    setTimeout(() => router.push('/dashboard'), 2000);
  }

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
          border: none;
          background: #f8f9fa;
          border-radius: 6px;
          padding: 6px 8px;
          cursor: pointer;
          font-size: 18px;
          transition: 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vtt-btn:hover {
          background: #e2e6ea;
        }

        .vtt-btn.recording {
          background: #ffe5e5;
          color: #dc3545;
        }

        .vtt-status {
          font-size: 12px;
          color: #6c757d;
          margin-top: 6px;
        }
      `}</style>

      <div className='container-fluid d-flex'>
        {/* Sidebar */}
        <div className='col-md-3 bg-light p-4 border-end'>
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

          {/* Save status indicator */}
          <div className='col-md-3 bg-light p-4 border-end position-relative'>
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
          </div>
        </div>

        {/* Main Content */}
        <div className='col-md-9 p-4'>
          {submitSuccess && (
            <div className='alert alert-success mb-3'>Form submitted successfully! Redirecting to dashboard...</div>
          )}

          {loading ? (
            <p>Loading data...</p>
          ) : (
            <>
              {formRequest && (
                <div className='card p-3 mb-4 shadow-sm bg-light'>
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

          {/* Key Function Form Display */}
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
                                  id={`epa-${currentEPA}-q-${questionKey}-option-${optionKey}`}
                                  name={`epa-${currentEPA}-q-${questionKey}-option-${optionKey}`}
                                  checked={!!responses[currentEPA]?.[questionKey]?.[optionKey]}
                                  onChange={(e) => handleOptionChange(currentEPA, questionKey, optionKey, e.target.checked)}
                                />
                                <label className='form-check-label' htmlFor={`epa-${currentEPA}-q-${questionKey}-option-${optionKey}`}>
                                  {optionLabel}
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Additional comments with AI + mic INSIDE textarea */}
                        <div>
                          <h6 className='mb-2'>Additional comments:</h6>

                          <div className='comment-wrapper'>
                            <textarea
                              className='form-control comment-textarea'
                              placeholder='Additional comments ...'
                              value={currentText}
                              onChange={(e) => handleTextInputChange(currentEPA, questionKey, e.target.value)}
                            />

                            <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 8, zIndex: 2 }}>
                              <button
                                type='button'
                                className='vtt-btn'
                                onClick={() => requestAISummary(currentEPA, questionKey)}
                                title='Generate AI summary from comments'
                                disabled={isSummarizing}
                                style={{ fontSize: 16 }}
                              >
                                {isSummarizing ? '⏳' : '✨'}
                              </button>

                              <button
                                type='button'
                                className={`vtt-btn ${isListening ? 'recording' : ''}`}
                                onClick={() => toggleDictation(currentEPA, questionKey)}
                                title={isListening ? 'Stop voice input' : 'Start voice input'}
                              >
                                {isListening ? '🛑' : '🎙️'}
                              </button>
                            </div>
                          </div>

                          {vttStatus ? <div className='vtt-status'>{vttStatus}</div> : null}
                          {summaryErr ? <div className='vtt-status' style={{ color: '#dc3545' }}>{summaryErr}</div> : null}

                          {summary ? (
                            <div className='mt-2 p-2 border rounded bg-light'>
                              <div className='d-flex justify-content-between align-items-center mb-1'>
                                <small className='text-muted'>AI Summary</small>

                                {/* ✅ Insert + Replace buttons */}
                                <div className='d-flex gap-2'>
                                  <button
                                    type='button'
                                    className='btn btn-sm btn-outline-secondary'
                                    onClick={() => insertSummaryIntoTextarea(currentEPA, questionKey)}
                                  >
                                    Insert
                                  </button>

                                  <button
                                    type='button'
                                    className='btn btn-sm btn-outline-danger'
                                    onClick={() => replaceTextareaWithSummary(currentEPA, questionKey)}
                                    title='Replace comments with AI summary (deletes original)'
                                  >
                                    Replace
                                  </button>
                                </div>
                              </div>

                              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{summary}</div>
                            </div>
                          ) : null}
                        </div>

                        <hr />
                      </div>
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

          {/* Professionalism Form */}
          {showProfessionalismForm && (
            <div className='card mt-4'>
              <div className='card-header bg-primary text-white'>Professionalism Assessment</div>
              <div className='card-body'>
                <div className='mb-4'>
                  <p className='fw-bold'>Please describe the student&apos;s professionalism:</p>
                  <textarea
                    className='form-control'
                    placeholder="Describe the student's professionalism..."
                    rows={5}
                    value={professionalism}
                    onChange={(e) => handleProfessionalismChange(e.target.value)}
                  />
                </div>

                <button className='btn btn-success mt-3' onClick={finalSubmit} disabled={submittingFinal}>
                  {submittingFinal ? 'Submitting...' : 'Submit Final Evaluation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}