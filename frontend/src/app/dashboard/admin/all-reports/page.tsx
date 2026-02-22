'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getEPAKFDescs } from '@/utils/get-epa-data';
import { useRequireRole } from '@/utils/useRequiredRole';
import dynamic from 'next/dynamic';
import DownloadPDFButton from '@/components/(StudentComponents)/DownloadPDFButton';

const EPABox = dynamic(() => import('@/components/(StudentComponents)/EPABox'), { ssr: false });

const supabase = createClient();

interface Student {
  id: string;
  display_name: string;
}

interface StudentReport {
  id: string;
  user_id: string;
  title: string;
  time_window: '3m' | '6m' | '12m';
  report_data: Record<string, number>;
  llm_feedback: string | null;
  created_at: string;
}

interface FormResult {
  response_id: string;
  created_at: string;
  results: Record<string, number>;
}

interface KeyFunctionResponse {
  text?: string[];
  [key: string]: boolean | string[] | undefined;
}

interface EPAResponse {
  [kfId: string]: KeyFunctionResponse;
}

interface FullResponseStructure {
  response?: {
    [epaId: string]: EPAResponse;
  };
}

interface FormResponsesInner {
  response?: FullResponseStructure;
  form_requests: {
    student_id: string;
    clinical_settings?: string;
  };
}

interface SupabaseRow {
  response_id: string;
  created_at: string;
  results: Record<string, number>;
  form_responses: FormResponsesInner;
}

const REPORT_EPAS = Array.from({ length: 13 }, (_, i) => i + 1);

export default function AdminAllReportsPage() {
  useRequireRole(['admin', 'dev']);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<StudentReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [kfDescriptions, setKfDescriptions] = useState<Record<string, string[]> | null>(null);
  const [timeRange, setTimeRange] = useState<3 | 6 | 12>(3);
  const [title, setTitle] = useState<string>('');
  const [formResults, setFormResults] = useState<FormResult[]>([]);
  const [editingEPA, setEditingEPA] = useState<number | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<string[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'student');
      const ids = roles?.map((r) => r.user_id) ?? [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', ids)
        .eq('account_status', 'Active');

      setStudents((profiles ?? []).map((p) => ({ id: p.id, display_name: p.display_name ?? 'Unnamed Student' })));
    };

    fetchStudents();
  }, []);

  const fetchReports = useCallback(async (studentId: string) => {
    const { data } = await supabase
      .from('student_reports')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });
    if (data) setReports(data);
  }, []);

  const fetchFormResults = useCallback(async () => {
    if (!selectedStudent) return;
    const { data: requests } = await supabase.from('form_requests').select('id').eq('student_id', selectedStudent.id);
    const requestIds = requests?.map((r) => r.id) ?? [];
    const { data: responses } = await supabase
      .from('form_responses')
      .select('response_id')
      .in('request_id', requestIds);
    const responseIds = responses?.map((r) => r.response_id) ?? [];
    const { data } = await supabase.from('form_results').select('*').in('response_id', responseIds);
    if (data) setFormResults(data);
  }, [selectedStudent]);

  const fetchComments = useCallback(async () => {
    if (!selectedStudent || editingEPA === null || !selectedFormId) return;
    const { data: resultData, error } = await supabase
      .from('form_results')
      .select(
        `
        response_id,
        created_at,
        results,
        form_responses:form_responses!form_results_response_id_fkey (
          response,
          form_requests:form_requests!form_responses_request_id_fkey (
            student_id,
            clinical_settings
          )
        )
      `
      )
      .returns<SupabaseRow[]>();
    if (error) {
      console.error(error);
      return;
    }
    const parsedComments: string[] = [];
    for (const row of resultData ?? []) {
      if (row.response_id !== selectedFormId) continue;
      const formResponse = row.form_responses;
      if (formResponse?.form_requests?.student_id !== selectedStudent.id) continue;
      if (formResponse.response?.response) {
        const epaKey = String(editingEPA);
        const commentBlock = formResponse.response.response[epaKey];
        if (commentBlock) {
          Object.values(commentBlock).forEach((kfObj) => {
            if (kfObj && typeof kfObj === 'object' && 'text' in kfObj) {
              const texts = (kfObj as KeyFunctionResponse).text;
              if (Array.isArray(texts)) {
                parsedComments.push(...texts.filter((t) => typeof t === 'string' && t.trim() !== ''));
              }
            }
          });
        }
      }
    }
    setComments(parsedComments);
  }, [selectedStudent, editingEPA, selectedFormId]);
  useEffect(() => {
    if (selectedStudent && selectedReport && editingEPA !== null && selectedFormId) {
      fetchComments();
    }
  }, [selectedStudent, selectedReport, editingEPA, selectedFormId, fetchComments]);

  const handleGenerate = async () => {
    if (!selectedStudent) return;
    await supabase.rpc('generate_report', {
      student_id_input: selectedStudent.id,
      time_range_input: timeRange,
      report_title: title || `Admin Generated (${timeRange}m)`,
    });
    fetchReports(selectedStudent.id);
  };

  useEffect(() => {
    getEPAKFDescs().then((descs) => {
      if (descs?.kf_desc) {
        const grouped: Record<string, string[]> = {};
        for (const key in descs.kf_desc) {
          const [epaIdRaw] = key.split('-');
          const epaId = String(Number.parseInt(epaIdRaw, 10));
          if (!grouped[epaId]) grouped[epaId] = [];
          grouped[epaId].push(descs.kf_desc[key]);
        }
        setKfDescriptions(grouped);
      }
    });
  }, []);

  const handleSave = async () => {
    if (!selectedFormId) return;
    const target = formResults.find((r) => r.response_id === selectedFormId);
    if (!target) return;
    setSaving(true);
    await supabase.from('form_results').update({ results: target.results }).eq('response_id', selectedFormId);
    setSaving(false);
    setSelectedFormId(null);
  };

  const formsForEPA = useMemo(() => {
    if (!editingEPA) return [];
    return formResults.filter((f) => Object.keys(f.results).some((k) => k.startsWith(`${editingEPA}.`)));
  }, [formResults, editingEPA]);

  const handleReportSelect = (r: StudentReport) => {
    setLoadingReport(true);
    setSelectedReport(null);
    setTimeout(() => {
      setSelectedReport(r);
      setLoadingReport(false);
    }, 500);
  };

  return (
    <div className="container py-5">
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          header,
          .d-print-none,
          .modal,
          .btn,
          .form-control,
          .form-select,
          .form-label {
            display: none !important;
          }
          .container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
          .epa-report-section {
            border: none !important;
            box-shadow: none !important;
            padding: 1rem 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-visible {
            display: block !important;
            color: black !important;
            page-break-before: always;
          }
        }
        .fade-transition {
          opacity: 0;
          transition: opacity 0.3s ease-in-out;
        }
        .fade-transition.show {
          opacity: 1;
        }

        .scrollable-box {
          max-height: 300px;
          overflow-y: auto;
        }
      `}</style>

      <div className='card shadow-sm p-4 mt-5 mb-3 d-print-none'>
        <h2 className='mb-4 d-print-none'>Student Report Generation</h2>
        {/* Student Picker */}
        <div className='d-print-none'>
          <div className='mb-3 d-print-none'>
            <label htmlFor='student-select' className='form-label d-print-none'>Select Student</label>
            <select
              id='student-select'
              className='form-select'
              value={selectedStudent?.id || ''}
              onChange={(e) => {
                const student = students.find((s) => s.id === e.target.value);
                setSelectedStudent(student ?? null);
                setReports([]);
                setSelectedReport(null);
                if (student) fetchReports(student.id);
              }}
            >
              <option value=''>-- Select Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className='d-flex gap-3 align-items-end mb-4 d-print-none'>
            <div>
              <label htmlFor='time-range-select' className='form-label'>Time Range</label>
              <select
                id='time-range-select'
                className='form-select'
                value={timeRange}
                onChange={(e) => setTimeRange(parseInt(e.target.value) as 3 | 6 | 12)}
              >
                {[3, 6, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} months
                  </option>
                ))}
              </select>
            </div>
            <div className='flex-grow-1 d-print-none'>
              <label className='form-label'>Report Title</label>
              <input type='text' className='form-control' value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <button className='btn btn-success' onClick={handleGenerate} disabled={!selectedStudent}>
              Generate Report
            </button>
          </div>
        </div>

        <hr className='d-print-none mb-5 mt-3 d-print-none' />

        {selectedStudent && reports.length > 0 && (
          <div className='mb-4 d-print-none'>
            <h5>Past Reports for {selectedStudent.display_name}</h5>
            <ul className='list-group'>
              {reports.map((r) => (
                <button
                  key={r.id}
                  className={`list-group-item list-group-item-action ${selectedReport?.id === r.id ? 'active' : ''}`}
                  onClick={() => handleReportSelect(r)}
                  style={{ cursor: 'pointer' }}
                >
                  {r.title} ({r.time_window}) – {new Date(r.created_at).toLocaleDateString()}
                </button>
              ))}
            </ul>
          </div>
        )}
      </div>
      {loadingReport && (
        <div className='text-center my-5 d-print-none'>
          <div className='spinner-border text-primary d-print-none' role='status'>
            <span className='visually-hidden d-print-none'>Loading...</span>
          </div>
        </div>
      )}

      {selectedStudent && selectedReport && !loadingReport && (
        <div className='pb-3 p-4 mb-5'>
          <div className='d-flex justify-content-between align-items-center mb-3 d-print-none'>
            <h3 className='m-0 d-print-none'>{selectedReport.title}</h3>
            <DownloadPDFButton />
          </div>

          <hr className='d-print-none' />

          {REPORT_EPAS.map((epaId) => (
            <div key={`container-${epaId}`} className={`mb-1 p-3 epa-report-section`}>
              <div className='d-flex justify-content-between align-items-center mb-2'>
                <button
                  className='btn btn-sm btn-outline-primary d-print-none'
                  onClick={async () => {
                    setEditingEPA(epaId);
                    await fetchFormResults();
                  }}
                >
                  Edit EPA {epaId}
                </button>
              </div>
              <EPABox
                key={`epabox-${epaId}-${selectedStudent.id}-${selectedReport?.id}`}
                epaId={epaId}
                timeRange={parseInt(selectedReport.time_window) as 3 | 6 | 12}
                kfDescriptions={kfDescriptions}
                studentId={selectedStudent.id}
              />
            </div>
          ))}

          {/* Modal */}
          {editingEPA && (
            <div
              className='modal fade show d-block fade-transition show'
              tabIndex={-1}
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <div className='modal-dialog modal-lg'>
                <div className='modal-content'>
                  <div className='modal-header'>
                    <h5 className='modal-title'>Select a Form Result for EPA {editingEPA}</h5>
                    <button
                      className='btn-close'
                      onClick={() => {
                        setEditingEPA(null);
                        setSelectedFormId(null);
                      }}
                    ></button>
                  </div>
                  <div className='modal-body'>
                    {formsForEPA.map((form) => (
                      <button
                        key={form.response_id}
                        className={`btn btn-outline-secondary w-100 mb-2 ${
                          selectedFormId === form.response_id ? 'active' : ''
                        }`}
                        onClick={() => setSelectedFormId(form.response_id)}
                      >
                        {new Date(form.created_at).toLocaleString()}
                      </button>
                    ))}

                    {selectedFormId && (
                      <div className='mt-4'>
                        <h6>Edit Development Levels</h6>
                        <div className='row'>
                          {Object.entries(
                            formResults.find((r) => r.response_id === selectedFormId)?.results || {}
                          )
                            .filter(([k]) => k.startsWith(`${editingEPA}.`))
                            .map(([key, val]) => {
                              const [epaStr, kfStr] = key.split('.');
                              const label = kfDescriptions?.[epaStr]?.[parseInt(kfStr) - 1] ?? key;
                              return (
                                <div key={key} className='col-md-4 mb-3'>
                                  <label className='form-label'>
                                    KF {key}
                                    <br />
                                    <small className='text-muted'>{label}</small>
                                  </label>
                                  <select
                                    className='form-select'
                                    value={Math.floor(Number(val))}
                                    onChange={(e) => {
                                      const newVal = parseInt(e.target.value);
                                      setFormResults((prev) =>
                                        prev.map((r) =>
                                          r.response_id === selectedFormId
                                            ? { ...r, results: { ...r.results, [key]: newVal } }
                                            : r
                                        )
                                      );
                                    }}
                                  >
                                    {[0, 1, 2, 3].map((n) => (
                                      <option key={n} value={n}>
                                        {n} – {['Remedial', 'Early-Developing', 'Developing', 'Entrustable'][n]}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                        </div>

                        {/* Comments Section */}
                        <div className="mt-4">
                          <h6>Comments</h6>
                          <div className="border rounded p-2 scrollable-box">
                            <ul className="list-group">
                              {comments.length > 0 ? (
                                comments.map((c, i) => (
                                  <li key={i} className="list-group-item">{c}</li>
                                ))
                              ) : (
                                <li className="list-group-item">No comments found</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className='modal-footer'>
                    <button
                      className='btn btn-secondary'
                      onClick={() => {
                        setEditingEPA(null);
                        setSelectedFormId(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button className='btn btn-primary' onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}