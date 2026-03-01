'use client';

import { useState, useEffect, FormEvent } from 'react';
import Select, { SingleValue } from 'react-select';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface OptionType {
  label: string;
  value: string;
}

interface Props {
  raterId: string;
  hasActiveRequestForStudent: (studentId: string) => boolean;
  onSuccess: (newRequestId: string) => void;
}

// Custom styles for react-select that respect Bootstrap's CSS variables,
// ensuring the dropdown adapts correctly in both light and dark mode.
const selectStyles = {
  control: (base: object) => ({
    ...base,
    backgroundColor: 'var(--bs-body-bg)',
    borderColor: 'var(--bs-border-color)',
    color: 'var(--bs-body-color)',
    boxShadow: 'none',
    '&:hover': { borderColor: 'var(--bs-primary)' },
  }),
  menu: (base: object) => ({
    ...base,
    backgroundColor: 'var(--bs-body-bg)',
    border: '1px solid var(--bs-border-color)',
    zIndex: 9999,
  }),
  menuList: (base: object) => ({
    ...base,
    backgroundColor: 'var(--bs-body-bg)',
    padding: 0,
  }),
  option: (base: object, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--bs-primary)'
      : state.isFocused
        ? 'var(--bs-secondary-bg)'
        : 'var(--bs-body-bg)',
    color: state.isSelected ? '#fff' : 'var(--bs-body-color)',
    cursor: 'pointer',
  }),
  singleValue: (base: object) => ({
    ...base,
    color: 'var(--bs-body-color)',
  }),
  input: (base: object) => ({
    ...base,
    color: 'var(--bs-body-color)',
  }),
  placeholder: (base: object) => ({
    ...base,
    color: 'var(--bs-secondary-color)',
  }),
  clearIndicator: (base: object) => ({
    ...base,
    color: 'var(--bs-secondary-color)',
    '&:hover': { color: 'var(--bs-body-color)' },
  }),
  dropdownIndicator: (base: object) => ({
    ...base,
    color: 'var(--bs-secondary-color)',
    '&:hover': { color: 'var(--bs-body-color)' },
  }),
  indicatorSeparator: (base: object) => ({
    ...base,
    backgroundColor: 'var(--bs-border-color)',
  }),
};

const UnlistedStudentForm = ({ raterId, hasActiveRequestForStudent, onSuccess }: Props) => {
  const [student, setStudent] = useState<OptionType | null>(null);
  const [setting, setSetting] = useState<OptionType | null>(null);
  const [details, setDetails] = useState('');
  const [goals, setGoals] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentOptions, setStudentOptions] = useState<OptionType[]>([]);
  const [settingOptions, setSettingOptions] = useState<OptionType[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'student');
      const ids = roles?.map((r) => r.user_id) ?? [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', ids)
        .eq('account_status', 'Active');

      const options = profiles?.map((p) => ({ label: p.display_name, value: p.id })) ?? [];
      setStudentOptions(options);
    };

    const fetchSettings = async () => {
      const { data } = await supabase.from('clinical_settings').select('*');
      const options = data?.map((s) => ({ label: s.setting, value: s.setting })) ?? [];
      setSettingOptions(options);
    };

    fetchStudents();
    fetchSettings();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!student || !setting || !details) {
      setMessage('All fields are required.');
      return;
    }

    if (hasActiveRequestForStudent(student.value)) {
      setMessage('This student already has an active evaluation request. Please check your dashboard.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('form_requests')
      .insert([
        {
          student_id: student.value,
          completed_by: raterId,
          clinical_settings: setting.value,
          notes: details,
          goals,
          active_status: true,
        },
      ])
      .select('id')
      .single();

    if (error || !data) {
      console.error(error?.message);
      setMessage('Error submitting form.');
    } else {
      onSuccess(data.id);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className='mb-3'>
        <label className='form-label'>Select Student</label>
        <Select
          aria-label='Select Student'
          options={studentOptions}
          value={student}
          onChange={(option: SingleValue<OptionType>) => setStudent(option)}
          placeholder='Search student...'
          isClearable
          styles={selectStyles}
        />
      </div>

      <div className='mb-3'>
        <label className='form-label'>Clinical Setting</label>
        <Select
          aria-label='Clinical Setting'
          options={settingOptions}
          value={setting}
          onChange={(option: SingleValue<OptionType>) => setSetting(option)}
          placeholder='Search setting...'
          isClearable
          styles={selectStyles}
        />
      </div>

      <div className='mb-3'>
        <label aria-label='Student Goal(s)' className='form-label'>Student Goal(s)</label>
        <textarea aria-label='student-goals-value' className='form-control' rows={3} value={goals} onChange={(e) => setGoals(e.target.value)} />
      </div>

      <div className='mb-3'>
        <label aria-label='Additional notes' className='form-label'>Additional notes</label>
        <textarea aria-label='additional-notes-value' className='form-control' rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>

      <button type='submit' className='btn btn-primary' disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </button>

      {message && <p className='mt-2 text-danger'>{message}</p>}
    </form>
  );
};

export default UnlistedStudentForm;