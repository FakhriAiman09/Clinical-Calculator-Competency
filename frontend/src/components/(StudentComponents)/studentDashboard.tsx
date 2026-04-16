'use client';

import React, { useEffect, useState } from 'react';
import EPACard from './EPACard';
import EPAModal from './EPAModal';
import ToggleControl from '@/components/(StudentComponents)/ToggleControl';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/context/UserContext';
import { getEpaLevelFromScores } from '@/utils/epa-scoring';

const supabase = createClient();

interface HistoryEntry {
  date: string;
  level: string;
}

interface KeyFunction {
  id: string;
  description: string; 
  history: HistoryEntry[];
}

interface EPA {
  epa: number;
  title: string;
  keyFunctions: KeyFunction[];
}

const devLevelMap: Record<string, number> = {
  remedial: 0,
  'early-developing': 1,
  developing: 2,
  entrustable: 3,
};

type DevLevel = keyof typeof devLevelMap;

interface FormRequest {
  id: string;
  created_at: string;
  student_id: string;
}

interface FormResponses {
  response_id: string;
  request_id: string;
  form_requests: FormRequest;
}

interface FormResultsEntry {
  id: number;
  created_at: string;
  parent_response_id: string;
  results: Record<string, number>;
  form_responses: FormResponses;
}

function buildEpaMap(entries: FormResultsEntry[]): Record<number, EPA> {
  const epaMap: Record<number, EPA> = {};
  entries.forEach((entry) => {
    const { form_responses, created_at } = entry;
    if (
      entry.parent_response_id !== form_responses.response_id ||
      form_responses.request_id !== form_responses.form_requests.id
    ) {
      console.error('ID mismatch in joined data:', entry);
      return;
    }
    Object.entries(entry.results as Record<string, number>).forEach(([key, value]) => {
      const epaId = parseInt(key.split('.')[0], 10);
      const clampedLevel = Math.min(Math.floor(value), 3);
      const levelName =
        (Object.keys(devLevelMap) as DevLevel[]).find((lvl) => devLevelMap[lvl] === clampedLevel) || 'none';
      if (!epaMap[epaId]) {
        epaMap[epaId] = { epa: epaId, title: '', keyFunctions: [] };
      }
      epaMap[epaId].keyFunctions.push({ id: key, history: [{ date: created_at, level: levelName }], description: '' });
    });
  });
  return epaMap;
}

function applyDescriptions(epas: EPA[], epaDescRow: Record<string, unknown>): EPA[] {
  const formattedEPAs = Object.entries(epaDescRow.epa_descriptions as Record<string, string>).map(
    ([key, value]) => ({ id: parseInt(key, 10), description: value })
  );
  const formattedKFs = Object.entries(epaDescRow.kf_descriptions as Record<string, string>).map(
    ([key, value]) => ({ id: key, description: value })
  );
  return epas
    .map((epa) => {
      const match = formattedEPAs.find((item) => item.id === epa.epa);
      return { ...epa, title: match ? match.description : epa.title };
    })
    .map((epa) => ({
      ...epa,
      keyFunctions: epa.keyFunctions.map((kf) => ({
        ...kf,
        description: formattedKFs.find((item) => item.id === kf.id)?.description || '',
      })),
    }));
}

const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<EPA[]>([]);
  const [range, setRange] = useState<3 | 6 | 12>(3);
  const [selectedEpa, setSelectedEpa] = useState<EPA | null>(null);
  const { user, loading } = useUser();

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const { data: formResultsData, error: formError } = await supabase
        .from('form_results')
        .select(`
          id,
          created_at,
          parent_response_id: response_id,
          results,
          form_responses!inner(
            response_id,
            request_id,
            form_requests!inner(
              id,
              created_at,
              student_id
            )
          )
        `)
        .filter('form_responses.form_requests.student_id', 'eq', user?.id || '');

      if (formError) { console.error('Data Fetch Error:', formError); return; }
      if (!formResultsData || !Array.isArray(formResultsData) || formResultsData.length === 0) {
        console.warn('No valid data found in form_results for this student');
        return;
      }

      const epasArray = Object.values(buildEpaMap(formResultsData as unknown as FormResultsEntry[]));

      const { data: epaDescData, error: epaDescError } = await supabase
        .from('epa_kf_descriptions')
        .select('*');

      if (epaDescError) { console.error('EPA Fetch Error:', epaDescError); setData(epasArray); return; }
      if (!epaDescData || !epaDescData.length) { console.warn('EPA descriptions not found'); setData(epasArray); return; }

      setData(applyDescriptions(epasArray, epaDescData[0]));
    }

    fetchData();
  }, [user]);


  const getAverage = (kf: KeyFunction): number | null => {
    const all = kf.history.filter((h) => h.level !== 'none');
    if (all.length < 1) return null;
    const avg = all.reduce((sum, h) => sum + devLevelMap[h.level], 0) / all.length;
    return Math.floor(avg);
  };


  const getEPADevLevel = (kfList: KeyFunction[]): number | null => {
    const scores = kfList.map(getAverage).filter((v): v is number => v !== null);
    return getEpaLevelFromScores(scores);
  };

  if (loading) return <div>Loading...</div>;
  return (
    <div className='container mt-4'>
      <div className='d-flex justify-content-center mb-4 gap-2'>
        <ToggleControl selected={range} onSelect={(value: 3 | 6 | 12) => setRange(value)} />
      </div>
      <div className='row'>
        {data.map((epa) => (
          <EPACard
            key={epa.epa}
            epa={epa}
            onClick={(epa: EPA) => setSelectedEpa(epa)}
            getEPADevLevel={getEPADevLevel}
            getAverage={getAverage}
            range={range}
          />
        ))}
      </div>
      <EPAModal selectedEpa={selectedEpa} onClose={() => setSelectedEpa(null)} range={range} />
    </div>
  );
};

export default StudentDashboard;
