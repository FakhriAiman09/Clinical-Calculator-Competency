'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface ReportGenerationFormProps {
  studentId: string;
  onGenerated: () => void;
}

const ReportGenerationForm: React.FC<ReportGenerationFormProps> = ({ studentId, onGenerated }) => {
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => setSuccess(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [success]);

  const generateReport = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || title.trim() === '') return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error } = await supabase.rpc('generate_report', {
        student_id_input: studentId,
        time_range_input: 1200,
        report_title: title.trim(),
      });

      if (error) {
        console.error('Supabase RPC Error:', error);
        let message = 'An error occurred while generating the report.';
        if (error.message) message += `\nMessage: ${error.message}`;
        if (error.code) message += `\nCode: ${error.code}`;
        if (error.details) message += `\nDetails: ${error.details}`;
        throw new Error(message);
      }

      setSuccess(true);
      setTitle('');
      onGenerated();
    } catch (err) {
      console.error('Report generation failed:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during report generation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='card shadow-sm p-4'>
      <h4 className='mb-3 fw-semibold'>Generate New Report</h4>

      <form onSubmit={generateReport}>
        <div className='mb-3'>
          <label htmlFor='report-title' className='form-label'>
            Report Title
          </label>
          <input
            id='report-title'
            type='text'
            className={`form-control ${title.trim() === '' && error ? 'is-invalid' : ''}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Enter report title'
            required
            disabled={loading}
          />
        </div>

        <div className='d-flex justify-content-between align-items-center mt-4'>
          <button
            type='submit'
            className='btn btn-success'
            disabled={loading || title.trim() === ''}
            aria-disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>

          {success && (
            <span className='text-success fw-semibold d-flex align-items-center gap-1'>
              <i className='bi bi-check-circle-fill' aria-hidden='true'></i>
              Report generated!
            </span>
          )}
        </div>

        {error && (
          <div className='alert alert-danger mt-4' style={{ whiteSpace: 'pre-wrap' }}>
            <strong>Error:</strong>
            <br />
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default ReportGenerationForm;
