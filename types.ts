export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  isThinking?: boolean;
  images?: string[];
  sources?: Array<{
    title: string;
    uri: string;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export enum AppMode {
  CHAT = 'chat',
  LIVE = 'live',
  IMAGE = 'image',
  TTS = 'tts',
  SYSTEM = 'system'
}

export interface Blob {
  data: string;
  mimeType: string;
}

export interface LiveState {
  isConnected: boolean;
  isMuted: boolean;
  volume: number;
}
