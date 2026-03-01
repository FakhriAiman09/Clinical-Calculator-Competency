'use server';

import { redirect } from 'next/navigation';

import Header from '@/components/header';
import { supabase_authorize } from '@/utils/async-util';

import QuestionList from './question-list';

export default async function Account() {
  const authorized = await supabase_authorize(['mcqs_options.select', 'mcqs_options.insert']);
  if (!authorized) redirect('/no-auth');

  return (
    <div className='d-flex flex-column min-vh-100'>
      <div className='row sticky-top'>
        <Header />
      </div>
      <div className='container p-5' style={{ maxWidth: '720px' }}>
        <QuestionList />
      </div>
    </div>
  );
}
