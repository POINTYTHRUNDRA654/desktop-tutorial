/**
 * Tests for Electron types
 */

import { describe, it, expect } from 'vitest';
import { InstalledProgram, IPC_CHANNELS } from '../types';

describe('Electron Types', () => {
  describe('InstalledProgram', () => {
    it('should have required fields', () => {
      const program: InstalledProgram = {
        name: 'example',
        displayName: 'Example App',
        path: 'C:\\Program Files\\Example\\app.exe',
      };

      expect(program.name).toBe('example');
      expect(program.displayName).toBe('Example App');
      expect(program.path).toBe('C:\\Program Files\\Example\\app.exe');
    });

    it('should support optional fields', () => {
      const program: InstalledProgram = {
        name: 'example',
        displayName: 'Example App',
        path: 'C:\\Program Files\\Example\\app.exe',
        icon: 'C:\\Program Files\\Example\\app.ico',
        version: '1.0.0',
        publisher: 'Example Publisher',
      };

      expect(program.icon).toBe('C:\\Program Files\\Example\\app.ico');
      expect(program.version).toBe('1.0.0');
      expect(program.publisher).toBe('Example Publisher');
    });
  });

  describe('IPC_CHANNELS', () => {
    it('should have detect programs channel', () => {
      expect(IPC_CHANNELS.DETECT_PROGRAMS).toBe('detect-programs');
    });

    it('should have open program channel', () => {
      expect(IPC_CHANNELS.OPEN_PROGRAM).toBe('open-program');
    });

    it('should have duplicate finder channels', () => {
      expect(IPC_CHANNELS.DEDUPE_PICK_FOLDERS).toBe('dedupe-pick-folders');
      expect(IPC_CHANNELS.DEDUPE_SCAN).toBe('dedupe-scan');
      expect(IPC_CHANNELS.DEDUPE_CANCEL).toBe('dedupe-cancel');
      expect(IPC_CHANNELS.DEDUPE_PROGRESS).toBe('dedupe-progress');
      expect(IPC_CHANNELS.DEDUPE_TRASH).toBe('dedupe-trash');
    });

    it('should have generic file helper channels', () => {
      expect(IPC_CHANNELS.PICK_JSON_FILE).toBe('pick-json-file');
      expect(IPC_CHANNELS.PICK_DIRECTORY).toBe('pick-directory');
      expect(IPC_CHANNELS.SAVE_FILE).toBe('save-file');
    });

    it('should have local ML channels', () => {
      expect(IPC_CHANNELS.ML_INDEX_BUILD).toBe('ml-index-build');
      expect(IPC_CHANNELS.ML_INDEX_QUERY).toBe('ml-index-query');
      expect(IPC_CHANNELS.ML_INDEX_STATUS).toBe('ml-index-status');
      expect(IPC_CHANNELS.ML_CAPS_STATUS).toBe('ml-caps-status');
      expect(IPC_CHANNELS.ML_LLM_STATUS).toBe('ml-llm-status');
      expect(IPC_CHANNELS.ML_LLM_GENERATE).toBe('ml-llm-generate');
    });
  });
});
