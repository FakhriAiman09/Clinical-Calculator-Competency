'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface FasterWhisperVoiceInputProps {
  onTranscribe: (text: string) => void;
  onError?: (error: string) => void;
  onListening?: (listening: boolean) => void;
  apiUrl?: string;
  language?: 'en' | 'es' | 'auto';
  chunkDuration?: number;
  className?: string;
}

export default function FasterWhisperVoiceInput({
  onTranscribe,
  onError,
  onListening,
  apiUrl = 'http://localhost:8000',
  language = 'auto',
  chunkDuration = 2500,
  className = '',
}: FasterWhisperVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  // Notify parent of listening state
  useEffect(() => {
    if (onListening) {
      onListening(isRecording);
    }
  }, [isRecording, onListening]);

  // Silence detection
  const detectSilence = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkVolume = () => {
      if (!analyserRef.current || !isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      
      // If very quiet for 4 seconds, auto-stop
      if (average < 8) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            console.log('Auto-stopping due to silence');
            stopRecording();
          }, 4000);
        }
      } else if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      if (isRecording) {
        requestAnimationFrame(checkVolume);
      }
    };
    
    checkVolume();
  }, [isRecording]);

  const transcribeChunk = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('language', language);

      const response = await fetch(`${apiUrl}/transcribe/realtime`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (result.text?.trim()) {
        onTranscribe(result.text.trim());
        
        if (result.language) {
          setDetectedLanguage(result.language);
        }
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      const errorMsg = err.message || 'Transcription failed';
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const processChunk = useCallback(() => {
    if (chunksRef.current.length > 0 && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Stop current recording to get the chunk
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;

      // Setup audio analysis for silence detection
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          transcribeChunk(audioBlob);
          chunksRef.current = [];
        }
        
        // Restart recording if still in recording mode
        if (isRecording && streamRef.current) {
          const newRecorder = new MediaRecorder(streamRef.current, options);
          mediaRecorderRef.current = newRecorder;
          chunksRef.current = [];
          
          newRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };
          
          newRecorder.onstop = mediaRecorder.onstop;
          newRecorder.start();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError('');

      // Timer for display
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Process chunks at intervals
      chunkIntervalRef.current = setInterval(processChunk, chunkDuration);

      // Start silence detection
      detectSilence();

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to access microphone';
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
      setTimeout(() => setError(''), 3000);
    }
  };

  const stopRecording = () => {
    // Clear all timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLanguageFlag = (lang: string): string => {
    const flags: Record<string, string> = {
      'en': '🇬🇧',
      'es': '🇪🇸',
      'ms': '🇲🇾',
    };
    return flags[lang] || '🌍';
  };

  return (
    <div className={`voice-input-wrapper ${className}`}>
      {/* Recording button */}
      <button
        type="button"
        className={`mic-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
        title={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-mic-fill" viewBox="0 0 16 16">
            <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z"/>
            <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-mic" viewBox="0 0 16 16">
            <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5"/>
            <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3"/>
          </svg>
        )}
      </button>

      <style jsx>{`
        .voice-input-wrapper {
          display: inline-flex;
          align-items: center;
        }

        .mic-button {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
          opacity: 0.6;
        }

        .mic-button:hover {
          opacity: 1;
          transform: scale(1.1);
        }

        .mic-button:active {
          transform: scale(0.95);
        }

        .mic-button svg {
          color: #6c757d;
          transition: all 0.2s ease;
        }

        .mic-button.recording svg {
          color: #dc3545;
          opacity: 1;
          filter: drop-shadow(0 0 6px rgba(220, 53, 69, 0.6));
          animation: pulse-glow 1.5s ease-in-out infinite;
        }

        .mic-button.processing svg {
          color: #ffc107;
          opacity: 1;
        }

        @keyframes pulse-glow {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(220, 53, 69, 0.6));
          }
          50% {
            filter: drop-shadow(0 0 10px rgba(220, 53, 69, 0.9));
          }
        }
      `}</style>
    </div>
  );
}