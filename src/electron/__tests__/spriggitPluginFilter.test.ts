/**
 * Unit tests for Spriggit plugin-filtering helpers (spriggitPluginFilter.ts).
 *
 * These tests verify the exact behaviour that was broken in the bug report:
 *   • Vanilla/DLC ESMs (DLCCoast.esm, DLCNukaWorld.esm, etc.) must be
 *     excluded from the Spriggit digest so they can't crash the process and
 *     trigger the early-exit heuristic that marks all remaining plugins failed.
 *   • User-created .esp / .esl / custom .esm files must always be included.
 *   • skippedVanillaCount must be accurate.
 *   • The correct error string is returned for empty folders vs vanilla-only folders.
 */

import { describe, it, expect } from 'vitest';
import {
  VANILLA_FO4_PLUGINS,
  isVanillaPlugin,
  filterPluginsForSpriggit,
  buildNoPluginsError,
} from '../spriggitPluginFilter';

// ─── isVanillaPlugin ────────────────────────────────────────────────────────

describe('isVanillaPlugin', () => {
  it('returns true for all known vanilla ESMs (exact case)', () => {
    const vanilla = [
      'Fallout4.esm',
      'DLCCoast.esm',
      'DLCNukaWorld.esm',
      'DLCRobot.esm',
      'DLCworkshop01.esm',
      'DLCworkshop02.esm',
      'DLCworkshop03.esm',
    ];
    for (const f of vanilla) {
      expect(isVanillaPlugin(f), f).toBe(true);
    }
  });

  it('returns true regardless of filename casing', () => {
    expect(isVanillaPlugin('FALLOUT4.ESM')).toBe(true);
    expect(isVanillaPlugin('dlccoast.esm')).toBe(true);
    expect(isVanillaPlugin('DlcNukaWorld.Esm')).toBe(true);
  });

  it('returns false for user-created mods', () => {
    const userMods = [
      'MyAwesomeMod.esp',
      'SomeBigOverhaul.esm',
      'PatchFile.esl',
      'WeaponPack.esp',
    ];
    for (const f of userMods) {
      expect(isVanillaPlugin(f), f).toBe(false);
    }
  });

  it('returns false for filenames that merely contain a vanilla name', () => {
    expect(isVanillaPlugin('Fallout4_Patch.esp')).toBe(false);
    expect(isVanillaPlugin('DLCCoastFix.esp')).toBe(false);
    expect(isVanillaPlugin('NotDLCRobot.esm')).toBe(false);
  });
});

// ─── VANILLA_FO4_PLUGINS set ─────────────────────────────────────────────────

describe('VANILLA_FO4_PLUGINS', () => {
  it('contains exactly 7 entries', () => {
    expect(VANILLA_FO4_PLUGINS.size).toBe(7);
  });

  it('stores filenames in lowercase', () => {
    for (const entry of VANILLA_FO4_PLUGINS) {
      expect(entry).toBe(entry.toLowerCase());
    }
  });
});

// ─── filterPluginsForSpriggit ────────────────────────────────────────────────

describe('filterPluginsForSpriggit', () => {
  it('removes all vanilla ESMs from the list — the scenario from the bug report', () => {
    // Exactly the files shown in the screenshot that were crashing Spriggit
    const dataFolder = [
      'DLCCoast.esm',
      'DLCNukaWorld.esm',
      'DLCRobot.esm',
      'DLCworkshop01.esm',
      'DLCworkshop02.esm',
      'DLCworkshop03.esm',
      'Fallout4.esm',
    ];
    const { pluginFiles, skippedVanillaCount } = filterPluginsForSpriggit(dataFolder);
    expect(pluginFiles).toHaveLength(0);
    expect(skippedVanillaCount).toBe(7);
  });

  it('keeps user mods and still counts skipped vanilla files', () => {
    const dataFolder = [
      'Fallout4.esm',
      'DLCCoast.esm',
      'DLCNukaWorld.esm',
      'MyMod.esp',
      'AnotherMod.esl',
      'BigOverhaul.esm',
    ];
    const { pluginFiles, skippedVanillaCount } = filterPluginsForSpriggit(dataFolder);
    expect(pluginFiles).toEqual(['MyMod.esp', 'AnotherMod.esl', 'BigOverhaul.esm']);
    expect(skippedVanillaCount).toBe(3);
  });

  it('returns all files unchanged when there are no vanilla ESMs', () => {
    const dataFolder = ['MyMod.esp', 'MyPatch.esl', 'CustomOverhaul.esm'];
    const { pluginFiles, skippedVanillaCount } = filterPluginsForSpriggit(dataFolder);
    expect(pluginFiles).toEqual(dataFolder);
    expect(skippedVanillaCount).toBe(0);
  });

  it('handles an empty folder without throwing', () => {
    const { pluginFiles, skippedVanillaCount } = filterPluginsForSpriggit([]);
    expect(pluginFiles).toHaveLength(0);
    expect(skippedVanillaCount).toBe(0);
  });

  it('is case-insensitive for vanilla filenames', () => {
    const dataFolder = ['FALLOUT4.ESM', 'dlccoast.esm', 'MyMod.esp'];
    const { pluginFiles, skippedVanillaCount } = filterPluginsForSpriggit(dataFolder);
    expect(pluginFiles).toEqual(['MyMod.esp']);
    expect(skippedVanillaCount).toBe(2);
  });

  it('skippedVanillaCount + pluginFiles.length always equals allPluginFiles.length', () => {
    const dataFolder = [
      'Fallout4.esm', 'DLCCoast.esm', 'MyMod.esp', 'Patch.esl', 'DLCRobot.esm',
    ];
    const { pluginFiles, skippedVanillaCount } = filterPluginsForSpriggit(dataFolder);
    expect(pluginFiles.length + skippedVanillaCount).toBe(dataFolder.length);
  });
});

// ─── buildNoPluginsError ─────────────────────────────────────────────────────

describe('buildNoPluginsError', () => {
  it('returns the "empty folder" message when allPluginFiles is empty', () => {
    const msg = buildNoPluginsError([]);
    expect(msg).toContain('No plugin files');
    expect(msg).not.toContain('vanilla');
  });

  it('returns the "vanilla only" message when allPluginFiles is non-empty', () => {
    const msg = buildNoPluginsError(['DLCCoast.esm', 'Fallout4.esm']);
    expect(msg).toContain('Only vanilla/DLC');
    expect(msg).toContain('custom mods');
    expect(msg).not.toContain('No plugin files');
  });

  it('vanilla-only message mentions what to do next', () => {
    const msg = buildNoPluginsError(['DLCCoast.esm']);
    expect(msg).toContain('try again');
  });
});
