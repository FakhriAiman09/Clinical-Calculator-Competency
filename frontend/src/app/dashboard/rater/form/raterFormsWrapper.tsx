'use client';

import { Suspense } from 'react';
import RaterFormsPage from '@/app/dashboard/rater/form/RaterFormsPage';

export default function RaterFormsWrapper() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <RaterFormsPage />
    </Suspense>
  );
}
