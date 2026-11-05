import { describe, it, expect } from 'vitest';
import { parseCrashLog } from '../CrashLogAnalyzer';

// Sample written in the exact format of CEFCrashLog.cpp's WriteReport (CEF 1.0.5a source).
const cefLog = (at: string, frames: string[], modules: string[]) => [
  'CEF crash log 1.0 (CEFCrashLog.dll). Written on this PC only; nothing is sent anywhere.',
  'Explain it in plain English: run analyze_logs.py (see the CEF README).',
  '',
  'time: 2026-11-05 21:14:03, 1834 s after game start',
  'game: runtime 1.11.240, exe stamp 6A727FCC, image size 0425A000',
  'F4SE: 0.7.9',
  '',
  'exception: C0000005 (EXCEPTION_ACCESS_VIOLATION)',
  'access: read of address 0x0000000000000010',
  `at: ${at}`,
  'thread: 10432 (main thread)',
  'CEF plugins loaded: FCStruct2 yes, FCRender2 no',
  '',
  'memory: physical 21034 / 32684 MB used, commit 30211 / 48684 MB used',
  'game process: private 9120 MB, working set 8456 MB',
  '',
  'call stack (innermost first):',
  ...frames,
  '',
  'registers:',
  '  RAX 0x0000000000000000',
  '',
  `modules (${modules.length}):`,
  ...modules.map(m => `  ${m.padEnd(40)} 0x00007FF6A0000000  size 0x4000`),
  '',
].join('\n');

describe('CrashLogAnalyzer: CEF crash logs', () => {
  it('reads the CEF header, game version, exception and memory', () => {
    const p = parseCrashLog(cefLog('Fallout4.exe+0x1A2B3C', ['   0  Fallout4.exe+0x1A2B3C'], ['Fallout4.exe', 'f4se_1_11_240.dll']));
    expect(p.version).toBe('CEF 1.0');
    expect(p.gameVersion).toBe('1.11.240');
    expect(p.crashTime).toBe('2026-11-05 21:14:03');
    expect(p.exception).toContain('EXCEPTION_ACCESS_VIOLATION');
    expect(p.exception).toContain('read of address 0x0000000000000010');
    expect(p.exception).toContain('at Fallout4.exe+0x1A2B3C');
    expect(p.callstack.length).toBe(1);
    expect(p.systemInfo.ram).toContain('physical 21034 / 32684 MB used');
    expect(p.formIdHits.length).toBe(0); // 16-digit addresses must not be read as FormIDs
  });

  it('flags a crash inside a CEF plugin first', () => {
    const p = parseCrashLog(cefLog('FCStruct2.dll+0x2F10', ['   0  FCStruct2.dll+0x2F10', '   1  Fallout4.exe+0x99AA0'], ['Fallout4.exe', 'FCStruct2.dll']));
    expect(p.probableCauses[0].description).toContain('FCStruct2.dll');
    expect(p.probableCauses[0].severity).toBe('critical');
    expect(p.probableCauses[0].fix).toContain('F6');
  });

  it('flags a crash in a game function FCStruct2 hooks', () => {
    const p = parseCrashLog(cefLog('Fallout4.exe+0x500100', [
      '   0  Fallout4.exe+0x500100   [function Fallout4.exe+0x500000, Address Library ID 2209309: BSFaceGenManager::Update (FCStruct2 hooks calls to it)]',
    ], ['Fallout4.exe', 'FCStruct2.dll']));
    expect(p.probableCauses[0].description).toContain('FCStruct2');
    expect(p.probableCauses[0].severity).toBe('high');
  });

  it('warns about two crash loggers when Addictol\'s is loaded too', () => {
    const p = parseCrashLog(cefLog('Fallout4.exe+0x1A2B3C', ['   0  Fallout4.exe+0x1A2B3C'], ['Fallout4.exe', 'AddictolCrashLogger.dll', 'CEFCrashLog.dll']));
    expect(p.probableCauses.some(c => c.description.includes('Two crash loggers'))).toBe(true);
  });

  it('still reads Buffout 4 logs', () => {
    const p = parseCrashLog([
      'Fallout 4 v1.10.163',
      'Buffout 4 v1.28.6',
      '',
      'Unhandled exception "EXCEPTION_ACCESS_VIOLATION" at 0x7FF6A0123456 Fallout4.exe+0123456',
      '',
      'PLUGINS:',
      '\t[00]     Fallout4.esm',
      '\t[01]     DLCRobot.esm',
    ].join('\n'));
    expect(p.version).toBe('Buffout 1.28.6');
    expect(p.exception).toContain('EXCEPTION_ACCESS_VIOLATION');
    expect(p.probableCauses.some(c => c.description.includes('CEF'))).toBe(false);
  });
});
