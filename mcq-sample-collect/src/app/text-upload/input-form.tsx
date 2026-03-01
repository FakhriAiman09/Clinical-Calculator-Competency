'use client';

import { useState } from 'react';

import { parseCSV, submitSamples } from './actions';
import type { CSVRow } from './util';

export default function FileInputForm() {
  type Error = 'extension' | 'content' | 'empty' | 'submit';
  const [error, setError] = useState<Error | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [clearDisabled, setClearDisabled] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setClearDisabled(false);
    if (!file) return setClearDisabled(true);
    setFile(file);
    if (file.type !== 'text/csv') return setError('extension');
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      parseCSV(e.target?.result as string)
        .then((data) => {
          if (data.length === 0) setError('empty');
          else setParsedData(data);
        })
        .catch((error) => {
          setError('content');
          setErrorText(error instanceof Error ? error.message : null);
        });
    };

    reader.readAsText(file);
  };

  const clearInput = () => {
    const inputElement = document.getElementById('text-csv') as HTMLInputElement;
    if (inputElement) inputElement.value = '';
    setFile(null);
    setError(null);
    setParsedData([]);
    setClearDisabled(true);
  };

  const handleSubmit = () => {
    submitSamples(parsedData).then((success) => {
      if (success) clearInput();
      else setError('submit');
    });
  };

  return (
    <>
      <div className='d-flex gap-2 mb-3'>
        <input className='form-control' type='file' name='text-csv' id='text-csv' onChange={handleFileChange} />
        <button className='btn btn-outline-secondary' disabled={clearDisabled} onClick={clearInput}>
          Clear
        </button>
        <button className='btn btn-outline-primary' disabled={!!error || !parsedData.length} onClick={handleSubmit}>
          Submit
        </button>
      </div>

      <div className={`alert alert-danger ${error === 'extension' || 'd-none'}`}>
        The file is in the wrong format. Please upload a CSV file.
      </div>
      <div className={`alert alert-danger ${error === 'content' || 'd-none'}`}>
        {errorText ?? 'Error parsing CSV. Please check the file content.'}
      </div>
      <div className={`alert alert-danger ${error === 'empty' || 'd-none'}`}>
        The file is empty or does not contain the required columns.
      </div>
      <div className={`alert alert-danger ${error === 'submit' || 'd-none'}`}>
        Error submitting the data. Please try again later or contact support.
      </div>

      <div className={file ? '' : 'd-none'}>
        <h5 className='mt-4 mb-2'>Data preview</h5>
        <table
          className='table table-responsive table-striped table-hover table-bordered'
          style={{ fontSize: '0.8rem' }}
        >
          <thead>
            <tr>
              <th scope='col'>text</th>
              <th scope='col'>epa</th>
              <th scope='col'>level</th>
            </tr>
          </thead>
          <tbody>
            {parsedData.map((row, index) => (
              <tr key={index}>
                <td>{row.text}</td>
                <td>{row.epa}</td>
                <td>{row.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
