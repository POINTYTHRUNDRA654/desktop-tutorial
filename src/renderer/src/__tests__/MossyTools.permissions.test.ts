import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeMossyTool } from '../MossyTools';

vi.mock('../lib/bridgeClient', () => ({
  bridgeFetch: vi.fn(),
}));
import { bridgeFetch } from '../lib/bridgeClient';
const mockedBridgeFetch = bridgeFetch as unknown as ReturnType<typeof vi.fn>;

const noopContext = {
  isBlenderLinked: false,
  setProfile: () => {},
  setProjectData: () => {},
  setProjectContext: () => {},
  setShowProjectPanel: () => {},
};

describe('executeMossyTool — launch_program respects mossy_apps approval', () => {
  let openProgram: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    openProgram = vi.fn().mockResolvedValue({ success: true });
    (window as any).electronAPI = {
      getSettings: vi.fn().mockResolvedValue({}), // no hardcoded settings-field match for TestModTool*
      openProgram,
    };
  });

  it('refuses to launch a tool the user denied, even though it was detected', async () => {
    localStorage.setItem('mossy_apps', JSON.stringify([
      { id: 'a', name: 'TestModTool', path: 'C:\\Tools\\TestModTool.exe', checked: false },
    ]));
    // It really was detected — proves the refusal is a permission decision, not "not found".
    localStorage.setItem('mossy_all_detected_apps', JSON.stringify([
      { name: 'TestModTool', path: 'C:\\Tools\\TestModTool.exe' },
    ]));

    const outcome = await executeMossyTool('launch_program', { programName: 'TestModTool', reason: 'test' }, noopContext);

    expect(openProgram).not.toHaveBeenCalled();
    expect(outcome.result.toLowerCase()).toContain('approved');
    expect(outcome.result).not.toContain('Launched');
  });

  it('launches a tool the user approved', async () => {
    localStorage.setItem('mossy_apps', JSON.stringify([
      { id: 'b', name: 'TestModTool2', path: 'C:\\Tools\\TestModTool2.exe', checked: true },
    ]));

    const outcome = await executeMossyTool('launch_program', { programName: 'TestModTool2', reason: 'test' }, noopContext);

    expect(openProgram).toHaveBeenCalledWith('C:\\Tools\\TestModTool2.exe');
    expect(outcome.result).toContain('Launched');
  });
});

describe('executeMossyTool — ck_* functions no longer fabricate results', () => {
  beforeEach(() => {
    localStorage.clear();
    (window as any).electronAPI = { getSettings: vi.fn().mockResolvedValue({}) };
  });

  it('ck_execute_command says plainly it cannot actually run anything, bridge flag on or off', async () => {
    for (const bridgeActive of ['true', 'false', null]) {
      if (bridgeActive) localStorage.setItem('mossy_bridge_active', bridgeActive);
      else localStorage.removeItem('mossy_bridge_active');

      const outcome = await executeMossyTool('ck_execute_command', { command: 'bat SomeScript' }, noopContext);
      expect(outcome.result).toContain('Not available');
      expect(outcome.result).toContain('no scripting interface');
      expect(outcome.result).not.toContain('Command Executed');
      expect(outcome.result).not.toContain('✓ Command sent');
    }
  });

  it('check_previs_status refuses honestly (not a fabricated "no conflicts") when the Bridge is offline', async () => {
    localStorage.removeItem('mossy_bridge_active');
    const outcome = await executeMossyTool('check_previs_status', { cell: 'DiamondCityExt01' }, noopContext);
    expect(outcome.result).toContain('Desktop Bridge is offline');
    expect(outcome.result).not.toContain('PreVis Status: VALID');
    expect(outcome.result).not.toContain('Conflicts: None detected');
  });
});

describe('executeMossyTool — check_previs_status reads real CKPE log data via the Bridge', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mossy_bridge_active', 'true');
    (window as any).electronAPI = { getSettings: vi.fn().mockResolvedValue({}) };
    mockedBridgeFetch.mockReset();
  });

  const jsonResponse = (body: unknown) => ({ json: async () => body } as Response);

  it('reports CKPE not detected honestly, not as a fabricated pass', async () => {
    mockedBridgeFetch.mockResolvedValue(jsonResponse({
      detected: false, reason: 'CKPE not detected — this diagnosis needs it.',
    }));
    const outcome = await executeMossyTool('check_previs_status', {}, noopContext);
    expect(outcome.result).toContain('Not available');
    expect(outcome.result).toContain('CKPE not detected');
    expect(outcome.result).not.toContain('Conflicts: None detected');
  });

  it('reports an unparseable log honestly instead of guessing', async () => {
    mockedBridgeFetch.mockResolvedValue(jsonResponse({
      detected: true, parsed: false, logPath: 'C:\\fake\\log.log',
      reason: "Found the CKPE log, but its format doesn't match what Mossy knows how to read.",
    }));
    const outcome = await executeMossyTool('check_previs_status', {}, noopContext);
    expect(outcome.result).toContain("Couldn't diagnose");
    expect(outcome.result).not.toContain('VALID');
  });

  it('surfaces a real conflict for the requested cell, by real data not a hardcoded string', async () => {
    mockedBridgeFetch.mockResolvedValue(jsonResponse({
      detected: true, parsed: true, logPath: 'C:\\fake\\log.log',
      sessionTimestamp: 'Thursday 13 Aug 2026', activePlugin: 'TestMod.esp',
      conflictCount: 1,
      conflicts: [{ cell: 'DiamondCityExt01', cellFormId: '00001234', ownerFile: 'TestMod.esp', refName: 'SomeRef', refFormId: '00005678' }],
    }));
    const outcome = await executeMossyTool('check_previs_status', { cell: 'DiamondCityExt01' }, noopContext);
    expect(outcome.result).toContain('DiamondCityExt01');
    expect(outcome.result).toContain('SomeRef');
    expect(outcome.result).toContain('1 precombine-ownership conflict');
  });

  it('reports a real zero-conflict result distinctly from "never checked"', async () => {
    mockedBridgeFetch.mockResolvedValue(jsonResponse({
      detected: true, parsed: true, logPath: 'C:\\fake\\log.log',
      sessionTimestamp: 'Thursday 13 Aug 2026', activePlugin: 'TestMod.esp',
      conflictCount: 0, conflicts: [],
    }));
    const outcome = await executeMossyTool('check_previs_status', { cell: 'SomeOtherCell' }, noopContext);
    expect(outcome.result).toContain('no precombine-ownership conflicts');
  });
});
