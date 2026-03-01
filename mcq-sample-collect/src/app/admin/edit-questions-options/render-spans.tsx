export const renderQuestion = ((kf: string, question: string) => (
  <span>
    <span className='badge text-bg-primary'>{kf}</span> {question}
  </span>
));

export const renderOption = (key: string, text: string) => (
  <span>
    <span className='badge border text-dark'>{key}</span> {text}
  </span>
);
