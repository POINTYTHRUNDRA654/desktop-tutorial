/**
 * Main Application Component
 * 
 * Chat interface with message history, input, and voice controls.
 * Demonstrates usage of window.electronAPI for IPC communication.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Message, Settings } from '@shared/types';

/**
 * Voice Recognition Hook (Web Speech API)
 * TODO: Replace or augment with backend STT for better accuracy
 */
function useVoiceRecognition(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if Web Speech API is available
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onResult]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { isListening, startListening, stopListening };
}

/**
 * Text-to-Speech Hook (Web Speech Synthesis API)
 * TODO: Replace or augment with backend TTS for better quality
 */
function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = (text: string, settings?: Settings) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      if (settings) {
        utterance.rate = settings.ttsRate;
        utterance.pitch = settings.ttsPitch;
        // Note: voice selection requires matching available voices
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Text-to-Speech not supported in this browser');
    }
  };

  const stop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return { isSpeaking, speak, stop };
}

/**
 * Main App Component
 */
function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isSpeaking, speak, stop: stopSpeaking } = useTextToSpeech();
  
  const { isListening, startListening, stopListening } = useVoiceRecognition((transcript) => {
    setInputValue(transcript);
  });

  // Load settings on mount
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then(setSettings);
    }
  }, []);

  // Listen for new messages from main process
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubscribe = window.electronAPI.onMessage((message: Message) => {
      setMessages((prev) => [...prev, message]);
      setIsLoading(false);

      // Auto-speak assistant responses if TTS is enabled
      if (message.role === 'assistant' && settings?.ttsEnabled) {
        speak(message.content, settings);
      }
    });

    return unsubscribe;
  }, [settings, speak]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || !window.electronAPI) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      await window.electronAPI.sendMessage(userMessage.content);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🤖 Desktop AI Assistant</h1>
        <p className="subtitle">DI AI - Your personal AI companion</p>
      </header>

      <main className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>👋 Welcome! Start a conversation with your AI assistant.</p>
              <p className="hint">Type a message or click the microphone to speak.</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className={`message message-${message.role}`}>
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                <div className="message-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message message-assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="message-text loading">Thinking...</div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form className="input-form" onSubmit={handleSendMessage}>
          <div className="input-group">
            <input
              type="text"
              className="message-input"
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            
            <button
              type="button"
              className={`voice-button ${isListening ? 'listening' : ''}`}
              onClick={handleVoiceInput}
              title={isListening ? 'Stop listening' : 'Start voice input'}
              disabled={isLoading}
            >
              {isListening ? '🔴' : '🎤'}
            </button>

            {isSpeaking && (
              <button
                type="button"
                className="stop-speech-button"
                onClick={stopSpeaking}
                title="Stop speaking"
              >
                🔇
              </button>
            )}

            <button
              type="submit"
              className="send-button"
              disabled={!inputValue.trim() || isLoading}
            >
              Send
            </button>
          </div>
        </form>
      </main>

      <footer className="app-footer">
        <p className="info-text">
          💡 <strong>Tip:</strong> Configure your LLM API key in settings to enable AI responses.
        </p>
      </footer>
    </div>
  );
}

export default App;
