/**
 * Smoke tests for shared types
 * 
 * These basic tests verify that the type definitions and constants
 * are correctly structured and accessible.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, IPC_CHANNELS, Message, Settings } from '../types';

describe('Shared Types', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('should have all required settings properties', () => {
      expect(DEFAULT_SETTINGS).toHaveProperty('llmApiEndpoint');
      expect(DEFAULT_SETTINGS).toHaveProperty('llmModel');
      expect(DEFAULT_SETTINGS).toHaveProperty('ttsEnabled');
      expect(DEFAULT_SETTINGS).toHaveProperty('sttEnabled');
      expect(DEFAULT_SETTINGS).toHaveProperty('theme');
    });

    it('should have sensible default values', () => {
      expect(DEFAULT_SETTINGS.ttsEnabled).toBe(true);
      expect(DEFAULT_SETTINGS.sttEnabled).toBe(true);
      expect(DEFAULT_SETTINGS.alwaysOnTop).toBe(false);
      expect(DEFAULT_SETTINGS.autoStart).toBe(false);
    });

    it('should have valid LLM endpoint', () => {
      expect(DEFAULT_SETTINGS.llmApiEndpoint).toMatch(/^https?:\/\//);
    });
  });

  describe('IPC_CHANNELS', () => {
    it('should define all required channels', () => {
      expect(IPC_CHANNELS).toHaveProperty('SEND_MESSAGE');
      expect(IPC_CHANNELS).toHaveProperty('ON_MESSAGE');
      expect(IPC_CHANNELS).toHaveProperty('GET_SETTINGS');
      expect(IPC_CHANNELS).toHaveProperty('SET_SETTINGS');
      expect(IPC_CHANNELS).toHaveProperty('TTS_SPEAK');
      expect(IPC_CHANNELS).toHaveProperty('STT_START');
    });

    it('should have unique channel names', () => {
      const channelValues = Object.values(IPC_CHANNELS);
      const uniqueValues = new Set(channelValues);
      expect(channelValues.length).toBe(uniqueValues.size);
    });
  });

  describe('Message interface', () => {
    it('should accept valid message structure', () => {
      const message: Message = {
        id: '123',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };

      expect(message.id).toBe('123');
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello');
      expect(typeof message.timestamp).toBe('number');
    });
  });

  describe('Settings interface', () => {
    it('should accept valid settings structure', () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        llmApiKey: 'test-key',
      };

      expect(settings.llmApiKey).toBe('test-key');
    });

    it('should accept partial settings updates', () => {
      const partialSettings: Partial<Settings> = {
        ttsEnabled: false,
        theme: 'dark',
      };

      expect(partialSettings.ttsEnabled).toBe(false);
      expect(partialSettings.theme).toBe('dark');
    });
  });
});
