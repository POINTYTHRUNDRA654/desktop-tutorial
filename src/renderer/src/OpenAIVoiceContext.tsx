import React, { createContext, useContext, useRef, useState, ReactNode } from 'react';

interface OpenAIVoiceContextType {
  isActive: boolean;
  isMuted: boolean;
  status: string;
  transcription: string;
  volume: number;
  mode: 'idle' | 'listening' | 'processing' | 'speaking';
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
}

const OpenAIVoiceCtx = createContext<OpenAIVoiceContextType | null>(null);

export const useOpenAIVoice = () => {
  const ctx = useContext(OpenAIVoiceCtx);
  if (!ctx) throw new Error('useOpenAIVoice must be used within OpenAIVoiceProvider');
  return ctx;
};

export const OpenAIVoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Ready to connect');
  const [transcription, setTranscription] = useState('');
  const [volume, setVolume] = useState(0);
  const [mode, setMode] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const connect = async () => {
    try {
      setStatus('Connecting...');
      
      // Check for OpenAI API key
      let apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey) {
        apiKey = prompt('Enter your OpenAI API key:');
        if (!apiKey) throw new Error('API key required');
        localStorage.setItem('openai_api_key', apiKey);
      }

      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });

      setIsActive(true);
      setMode('listening');
      setStatus('Connected - OpenAI voice chat ready');
    } catch (err) {
      console.error('[OpenAIVoice] Connection error:', err);
      setStatus(`Error: ${err instanceof Error ? err.message : 'Connection failed'}`);
      setIsActive(false);
    }
  };

  const disconnect = () => {
    setIsActive(false);
    setMode('idle');
    setStatus('Disconnected');
    setTranscription('');
  };

  return (
    <OpenAIVoiceCtx.Provider
      value={{
        isActive,
        isMuted,
        status,
        transcription,
        volume,
        mode,
        connect,
        disconnect,
        toggleMute,
      }}
    >
      {children}
    </OpenAIVoiceCtx.Provider>
  );
};
