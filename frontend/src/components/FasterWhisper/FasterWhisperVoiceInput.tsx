'use client';

import { useState, useRef } from 'react';

interface FasterWhisperVoiceInputProps {
  onTranscription: (text: string) => void;
  onError?: (error: string) => void;
  isListening?: boolean;
  onListeningChange?: (listening: boolean) => void;
  apiUrl?: string;
  language?: 'en' | 'ms' | 'auto';
}

class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });
    this.audioChunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };
    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(audioBlob);
      };
      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

export default function FasterWhisperVoiceInput({
  onTranscription,
  onError,
  isListening = false,
  onListeningChange,
  apiUrl = 'http://localhost:8000',
  language = 'auto',
}: FasterWhisperVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (!recorderRef.current) return;

      try {
        setIsRecording(false);
        onListeningChange?.(false);
        setIsTranscribing(true);

        const audioBlob = await recorderRef.current.stopRecording();

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('language', language);
        formData.append('prompt', 'Medical student evaluation. Clinical assessment. EPA competency.');

        const response = await fetch(`${apiUrl}/transcribe`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Transcription failed');
        }

        const result = await response.json();

        if (result.text && result.text.trim()) {
          onTranscription(result.text.trim());
        }

        setIsTranscribing(false);
      } catch (error: any) {
        const errorMsg = error.message || 'Transcription failed';
        onError?.(errorMsg);
        setIsTranscribing(false);
      }
    } else {
      // Start recording
      try {
        recorderRef.current = new AudioRecorder();
        await recorderRef.current.startRecording();
        setIsRecording(true);
        onListeningChange?.(true);
      } catch (error: any) {
        const errorMsg = error.message || 'Failed to start recording';
        onError?.(errorMsg);
      }
    }
  };

  return (
    <button
      type="button"
      className={`vtt-btn ${isRecording ? 'recording' : ''} ${isTranscribing ? 'processing' : ''}`}
      onClick={toggleRecording}
      disabled={isTranscribing}
      title={isRecording ? 'Stop and transcribe' : isTranscribing ? 'Processing...' : 'Voice input (Faster Whisper)'}
    >
      {isTranscribing ? '⏳' : isRecording ? '🔴' : '🎙️'}
    </button>
  );
}