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
  });
});
