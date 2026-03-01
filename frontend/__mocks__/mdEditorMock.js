export default function MDEditor({ value, onChange }) {
    return (
      <textarea 
        data-testid="mdeditor" 
        value={value} 
        onChange={(e) => onChange?.(e.target.value)} 
      />
    );
  }