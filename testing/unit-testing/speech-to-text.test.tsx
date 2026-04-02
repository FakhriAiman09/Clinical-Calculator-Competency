import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock Speech Recognition API
let mockRecognitionInstance: any = null;

class MockSpeechRecognition {
  lang = 'en-US';
  interimResults = false;
  continuous = false;
  onstart: any = null;
  onend: any = null;
  onerror: any = null;
  onresult: any = null;

  constructor() {
    mockRecognitionInstance = this;
  }

  start() {
    if (this.onstart) this.onstart(new Event('start'));
  }

  stop() {
    if (this.onend) this.onend(new Event('end'));
  }

  abort() {
    if (this.onend) this.onend(new Event('end'));
  }
}

// Simple Mic Button Component
const MicButton: React.FC<{ onTranscript: (text: string) => void }> = ({ onTranscript }) => {
  const [listening, setListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const recognitionRef = React.useRef<any>(null);

  React.useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript;
          setTranscript((prev) => prev + text);
          onTranscript(text);
        }
      }
    };

    recognitionRef.current = recognition;
  }, [onTranscript]);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  return (
    <div>
      <button
        onClick={toggleMic}
        data-testid="mic-button"
        title={listening ? 'Stop recording' : 'Start recording'}
      >
        🎤 {listening ? 'Recording...' : 'Mic'}
      </button>
      {transcript && <p data-testid="transcript">{transcript}</p>}
    </div>
  );
};

// Tests
describe('Speech-to-Text Mic Button', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'SpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
    });
  });

  beforeEach(() => {
    mockRecognitionInstance = null;
  });

  test('should render mic button', () => {
    render(<MicButton onTranscript={jest.fn()} />);
    expect(screen.getByTestId('mic-button')).toBeInTheDocument();
  });

  test('should start listening when clicked', async () => {
    render(<MicButton onTranscript={jest.fn()} />);
    const button = screen.getByTestId('mic-button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveTextContent('Recording...');
    });
  });

  test('should stop listening when clicked again', async () => {
    render(<MicButton onTranscript={jest.fn()} />);
    const button = screen.getByTestId('mic-button');

    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveTextContent('Recording...'));

    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveTextContent('Mic'));
  });

  test('should capture and display transcript', async () => {
    const mockOnTranscript = jest.fn();
    render(<MicButton onTranscript={mockOnTranscript} />);

    const button = screen.getByTestId('mic-button');
    fireEvent.click(button);

    await waitFor(() => expect(button).toHaveTextContent('Recording...'));

    // Simulate transcript
    act(() => {
      const result = {
        0: { transcript: 'Hello world' },
        length: 1,
        isFinal: true,
      } as any;
      mockRecognitionInstance.onresult({
        resultIndex: 0,
        results: [result],
      });
    });

    await waitFor(() => {
      expect(mockOnTranscript).toHaveBeenCalledWith('Hello world');
      expect(screen.getByTestId('transcript')).toHaveTextContent('Hello world');
    });
  });

  test('should concatenate multiple transcripts', async () => {
    const mockOnTranscript = jest.fn();
    render(<MicButton onTranscript={mockOnTranscript} />);

    const button = screen.getByTestId('mic-button');
    fireEvent.click(button);

    await waitFor(() => expect(button).toHaveTextContent('Recording...'));

    // First transcript
    act(() => {
      const result = { 0: { transcript: 'Hello' }, length: 1, isFinal: true } as any;
      mockRecognitionInstance.onresult({ resultIndex: 0, results: [result] });
    });

    await waitFor(() => expect(screen.getByTestId('transcript')).toHaveTextContent('Hello'));

    // Second transcript
    act(() => {
      const result = { 0: { transcript: ' world' }, length: 1, isFinal: true } as any;
      mockRecognitionInstance.onresult({ resultIndex: 0, results: [result] });
    });

    await waitFor(() =>
      expect(screen.getByTestId('transcript')).toHaveTextContent('Hello world')
    );
  });

  test('should handle clinical transcript', async () => {
    const mockOnTranscript = jest.fn();
    render(<MicButton onTranscript={mockOnTranscript} />);

    fireEvent.click(screen.getByTestId('mic-button'));

    await waitFor(() => expect(screen.getByTestId('mic-button')).toHaveTextContent('Recording...'));

    const clinicalText = 'Patient showed excellent clinical reasoning during evaluation';

    act(() => {
      const result = { 0: { transcript: clinicalText }, length: 1, isFinal: true } as any;
      mockRecognitionInstance.onresult({ resultIndex: 0, results: [result] });
    });

    await waitFor(() => {
      expect(mockOnTranscript).toHaveBeenCalledWith(clinicalText);
      expect(screen.getByTestId('transcript')).toHaveTextContent(clinicalText);
    });
  });
});
