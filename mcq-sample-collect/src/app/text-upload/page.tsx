import { redirect } from 'next/navigation';

import { supabase_authorize } from '@/utils/async-util';

import FileInputForm from './input-form';

export default async function TextUpload() {
  const authorized = await supabase_authorize(['mcqs_options.select', 'mcqs_options.insert']);
  if (!authorized) redirect('/no-auth');

  return (
    <div className='container-lg p-5'>
      <h3 className='mb-3'>Upload text samples</h3>
      <p className='mb-3'>
        Please upload a CSV file with <code>text</code>, <code>epa</code>, and <code>level</code> columns.
      </p>
      <FileInputForm />
    </div>
  );
}
