import { describe, it, expect } from 'vitest';
import { mergeRescannedTools, mergeExistingCheckedState, getApprovedToolsFromStorage } from './toolPermissions';

describe('mergeRescannedTools', () => {
  it('preserves an existing checked:false when the rescan re-finds the same tool', () => {
    const existing = [
      { id: 'old-1', name: 'BodySlide', path: 'C:\\Tools\\BodySlide.exe', checked: false, category: 'Tool' },
    ];
    // Rescan finds the same tool again (same path) and would, pre-fix, default it to checked:true.
    const freshlyFound = [
      { id: 'scan-new', name: 'BodySlide', path: 'C:\\Tools\\BodySlide.exe', checked: true, category: 'Tool' },
    ];
    const merged = mergeRescannedTools(freshlyFound, existing);
    expect(merged).toHaveLength(1);
    expect(merged[0].checked).toBe(false);
  });

  it('defaults a genuinely new tool to checked:true', () => {
    const existing = [
      { id: 'old-1', name: 'BodySlide', path: 'C:\\Tools\\BodySlide.exe', checked: false, category: 'Tool' },
    ];
    const freshlyFound = [
      { id: 'scan-new', name: 'NifSkope', path: 'C:\\Tools\\NifSkope.exe', checked: true, category: 'Tool' },
    ];
    const merged = mergeRescannedTools(freshlyFound, existing);
    const nifskope = merged.find((t) => t.name === 'NifSkope');
    const bodyslide = merged.find((t) => t.name === 'BodySlide');
    expect(nifskope?.checked).toBe(true);
    expect(bodyslide?.checked).toBe(false);
  });

  it('keeps a previously-known tool the rescan did not happen to re-find', () => {
    const existing = [
      { id: 'old-1', name: 'Vortex', path: 'C:\\Tools\\Vortex.exe', checked: true, category: 'Tool' },
    ];
    // This rescan's narrower keyword filter didn't turn up Vortex at all.
    const freshlyFound: typeof existing = [];
    const merged = mergeRescannedTools(freshlyFound, existing);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('Vortex');
  });

  it('matches by path when names differ but path is identical (denial survives a display-name change)', () => {
    const existing = [
      { id: 'old-1', name: 'FO4Edit', path: 'C:\\Tools\\xEdit.exe', checked: false, category: 'Tool' },
    ];
    const freshlyFound = [
      { id: 'scan-new', name: 'xEdit', path: 'C:\\Tools\\xEdit.exe', checked: true, category: 'Tool' },
    ];
    const merged = mergeRescannedTools(freshlyFound, existing);
    expect(merged).toHaveLength(1);
    expect(merged[0].checked).toBe(false);
  });
});

describe('mergeExistingCheckedState (regression guard for the merge building block)', () => {
  it('only overrides checked when the existing entry has a boolean checked value', () => {
    const existing = [{ name: 'Tool A', checked: false }];
    const fresh = [{ name: 'Tool A', checked: true }];
    expect(mergeExistingCheckedState(fresh, existing)[0].checked).toBe(false);
  });
});

describe('getApprovedToolsFromStorage', () => {
  it('reflects checked:false written directly to mossy_apps (what the Approved Tools panel writes)', () => {
    localStorage.setItem('mossy_apps', JSON.stringify([
      { id: 'a', name: 'xEdit', path: 'C:\\xEdit.exe', checked: true },
      { id: 'b', name: 'BodySlide', path: 'C:\\BodySlide.exe', checked: false },
    ]));
    const tools = getApprovedToolsFromStorage();
    const denied = tools.find((t) => t.name === 'BodySlide');
    const approved = tools.find((t) => t.name === 'xEdit');
    expect(denied?.checked).toBe(false);
    expect(approved?.checked).toBe(true);
  });
});
