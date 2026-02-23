'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import Select, { SingleValue } from 'react-select';

// Dark-mode aware styles for react-select
const reactSelectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: 'var(--bs-body-bg)',
    borderColor: 'var(--bs-border-color)',
    color: 'var(--bs-body-color)',
    '&:hover': { borderColor: 'var(--bs-primary)' },
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: 'var(--bs-body-bg)',
    border: '1px solid var(--bs-border-color)',
    zIndex: 9999,
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused
      ? 'var(--bs-primary)'
      : state.isSelected
      ? 'rgba(var(--bs-primary-rgb),0.2)'
      : 'var(--bs-body-bg)',
    color: state.isFocused ? '#fff' : 'var(--bs-body-color)',
    cursor: 'pointer',
  }),
  singleValue: (base: any) => ({
    ...base,
    color: 'var(--bs-body-color)',
  }),
  input: (base: any) => ({
    ...base,
    color: 'var(--bs-body-color)',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: 'var(--bs-secondary-color, #6c757d)',
  }),
  indicatorSeparator: (base: any) => ({
    ...base,
    backgroundColor: 'var(--bs-border-color)',
  }),
  dropdownIndicator: (base: any) => ({
    ...base,
    color: 'var(--bs-secondary-color, #6c757d)',
  }),
};
import { createClient } from '@/utils/supabase/client';
import { useRequireRole } from '@/utils/useRequiredRole';
import { sendEmail } from './email-api/send-email.server';

const supabase = createClient();

interface OptionType {
  label: string;
  value: string;
  email: string;
}

interface UserRecord {
  id: string;
  email: string;
  role: string;
}

interface ProfileRecord {
  id: string;
  display_name: string;
  account_status: string;
}

const FormRequests = () => {
  useRequireRole(['student', 'dev']);
  const [faculty, setFaculty] = useState<OptionType | null>(null);
  const [setting, setSetting] = useState<OptionType | null>(null);
  const [details, setDetails] = useState('');
  const [goals, setGoals] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [facultyOptions, setFacultyOptions] = useState<OptionType[]>([]);
  const [settingOptions, setSettingOptions] = useState<OptionType[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchFaculty = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const { data: users, error: usersError } = await supabase.rpc('fetch_users');
      if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
      }
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, account_status');
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }
      const facultyUsers: UserRecord[] = (users as UserRecord[] ?? []).filter((user: UserRecord) => user.role === 'rater');

      const options = facultyUsers
        .map((user: UserRecord) => {
          const profile = (profiles ?? []).find((p: ProfileRecord) => p.id === user.id);
          if (profile && profile.account_status === 'Active') {
            return { label: profile.display_name, value: user.id, email: user.email };
          }
          return null;
        })
        .filter((option): option is OptionType => option !== null);
      setFacultyOptions(options);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Unexpected error in fetchFaculty:', err.message);
      } else {
        console.error('Unexpected error in fetchFaculty:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('Error fetching user:', error?.message ?? 'User not found');
        return;
      }
      setStudentId(user.id);
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      if (profileErr || !profile) {
        console.error('Error fetching profile:', profileErr?.message ?? 'Profile not found');
        return;
      }
      setStudentName(profile.display_name);
    };

    const fetchSettings = async () => {
      const { data, error } = await supabase.from('clinical_settings').select('*');
      if (error || !data) return;
      setSettingOptions(data.map((s: { setting: string }) => ({ label: s.setting, value: s.setting, email: '' })));
    };

    fetchCurrentUser();
    fetchFaculty();
    fetchSettings();
  }, [fetchFaculty]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!faculty || !setting || !details.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }
    if (!studentId || !studentName) {
      setMessage({ type: 'error', text: 'Unable to determine student details.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = {
      student_id: studentId,
      completed_by: faculty.value,
      clinical_settings: setting.value,
      goals: goals.trim() || null,          //Optional
      notes: details.trim(),                //Additional notes
    };

    const { data, error: insertError } = await supabase
    .from('form_requests')
    .insert([formData])
    .select('id') // retrieve assessment form ID
    .single(); 

    if (insertError) {
      console.error('Insert error:', insertError.message);
      setMessage({ type: 'error', text: 'Error submitting the form. Please try again.' });
      setLoading(false);
      return;
    }

    const requestId = data?.id; // assessment form ID

    const emailPayload = {
      to: faculty.email,
      studentName,
      requestId,// assessment form ID
    };

    try {
      const result = await sendEmail(emailPayload);
      console.log('Email sent:', result);
      setMessage({ type: 'success', text: 'Request sent successfully!' });
      setFaculty(null);
      setSetting(null);
      setDetails('');
      setGoals('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Error sending email:', err.message);
      } else {
        console.error('Unexpected error:', err);
      }
      setMessage({ type: 'error', text: 'Error sending the email.' });
    }
    setLoading(false);
  };

  return (
    <main className='container mt-5'>
      <div className='card shadow-sm p-4'>
        <h2 className='mb-4 fw-semibold'>Request Assessment</h2>

        {!mounted ? (
          <p>Loading form...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Faculty Selector */}
            <div className='mb-3'>
              <label className='form-label'>Select Faculty *</label>
              <Select
                options={facultyOptions}
                value={faculty}
                onChange={(option: SingleValue<OptionType>) => setFaculty(option)}
                placeholder='Search or select faculty'
                isSearchable
                classNamePrefix='react-select'
                menuPlacement='auto'
                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                isDisabled={loading}
                styles={reactSelectStyles}
              />
            </div>

            {/* Clinical Setting Selector */}
            <div className='mb-3'>
              <label className='form-label'>Clinical Setting *</label>
              <Select
                options={settingOptions}
                value={setting}
                onChange={(option: SingleValue<OptionType>) => setSetting(option)}
                placeholder='Search or select setting'
                isSearchable
                classNamePrefix='react-select'
                menuPlacement='auto'
                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                isDisabled={loading}
                styles={reactSelectStyles}
              />
            </div>

            {/* Goals */}
            <div className='mb-3'>
              <label htmlFor='goals' className='form-label'>
                What I&apos;d like feedback on (optional)
              </label>
              <textarea
                id='goals'
                className='form-control'
                rows={3}
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Notes */}
            <div className='mb-3'>
              <label htmlFor='details' className='form-label'>
                Additional Notes *
              </label>
              <textarea
                id='details'
                className='form-control'
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <div className='d-flex justify-content-between align-items-center'>
              <button type='submit' className='btn btn-primary' disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>

              {message && (
                <span className={`fw-semibold ${message.type === 'success' ? 'text-success' : 'text-danger'}`}>
                  {message.text}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </main>
  );
};

export default FormRequests;