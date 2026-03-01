'use server';

import { createClient } from '@/utils/supabase/server';
import * as csv from '@fast-csv/parse';

import type { CSVRow } from './util';
import type { Database } from '@/utils/supabase/database.types';

export const parseCSV = async (fileContents: string): Promise<CSVRow[]> => {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = [];
    csv
      .parseString(fileContents, { headers: true, ignoreEmpty: true })
      .on('data', (row: CSVRow) => {
        if (row.text && row.epa && row.level)
          results.push({
            text: row.text.trim(),
            epa: row.epa,
            level: row.level,
          });
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(new Error(`Error parsing CSV: ${error.message}`));
      });
  });
};

export const submitSamples = async (data: CSVRow[]) => {
  const supabase = await createClient({ db: { schema: 'trainingdata' } });

  const payload = data.map(
    (row) =>
      ({
        text: row.text,
        epa: row.epa,
        dev_level: row.level,
      }) satisfies Database['trainingdata']['Tables']['text_responses']['Insert']
  );

  const { error } = await supabase.from('text_responses').insert(payload);

  if (error) {
    console.log(error);
    return false;
  }

  return true;
};
