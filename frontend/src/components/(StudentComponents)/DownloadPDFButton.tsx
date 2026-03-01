'use client';

import React from 'react';

const DownloadPDFButton: React.FC = () => {
  const handlePrint = () => {
    const allCards = document.querySelectorAll('.card');
    allCards.forEach((card) => {
      const header = card.querySelector('.card-header');
      if (header && header instanceof HTMLElement && !card.classList.contains('expanded')) {
        header.click();
      }
    });
    setTimeout(() => window.print(), 600); // Give it time to expand before printing
  };

  return (
    <div className='text-end d-print-none mb-3'>
      <button className='btn btn-success' onClick={handlePrint}>
        Print Report
      </button>
    </div>
  );
};

export default DownloadPDFButton;
