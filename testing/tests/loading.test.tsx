import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Loading from '../../frontend/src/components/loading';
import React from 'react';

test('renders the loading spinner', () => {
  render(<Loading />);
  
  // Check if the spinner div is in the document
  const spinner = screen.getByRole('status');
  expect(spinner).toBeInTheDocument();

  // Check if the visually hidden text is present
  const hiddenText = screen.getByText('Loading...');
  expect(hiddenText).toBeInTheDocument();
});
