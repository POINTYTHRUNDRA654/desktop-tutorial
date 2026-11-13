import { describe, it, expect, beforeEach, vi } from 'vitest';
import { asksToGoOnline, noteUserMessage, userAskedToGoOnline } from '../webConsent';
import { executeMossyTool } from '../MossyTools';

vi.mock('../lib/bridgeClient', () => ({ bridgeFetch: vi.fn() }));

const ctx = {
  isBlenderLinked: false,
  setProfile: () => {},
  setProjectData: () => {},
  setProjectContext: () => {},
  setShowProjectPanel: () => {},
};

describe('asksToGoOnline', () => {
  it('is true when the user asks to go online', () => {
    for (const t of [
      'Can you search online for the best ENB?',
      'look it up online please',
      'go online and check what is new',
      'search the web for Sim Settlements 2 add-ons',
      'is there anything new on the internet about F4SE?',
    ]) expect(asksToGoOnline(t)).toBe(true);
  });
  it('is false for ordinary modding questions', () => {
    for (const t of [
      'How do I add collision to my tree in Blender?',
      'scan my mod list for conflicts',
      'what is the latest version of my plugin?',
      'my textures smear with ENB parallax',
    ]) expect(asksToGoOnline(t)).toBe(false);
  });
});

describe('search tools only run when the user asked', () => {
  let webSearch: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    webSearch = vi.fn().mockResolvedValue({ success: true, text: 'Wiki text about precombines', url: 'https://fallout.wiki/w/Precombine' });
    (window as any).electronAPI = { getSettings: vi.fn().mockResolvedValue({}), webSearch, openExternal: vi.fn() };
  });

  it('does not search when the message did not ask to go online', async () => {
    noteUserMessage('How do precombines work?');
    expect(userAskedToGoOnline()).toBe(false);
    const wiki = await executeMossyTool('search_fallout4_wiki', { query: 'precombines' }, ctx);
    const scan = await executeMossyTool('scan_fallout4_live', { topic: 'precombines' }, ctx);
    expect(webSearch).not.toHaveBeenCalled();
    expect(wiki.result).toContain('Not searched');
    expect(scan.result).toContain('search online');
  });

  it('searches when the message asked to go online', async () => {
    noteUserMessage('Can you look it up online? How do precombines work?');
    expect(userAskedToGoOnline()).toBe(true);
    const wiki = await executeMossyTool('search_fallout4_wiki', { query: 'precombines' }, ctx);
    expect(webSearch).toHaveBeenCalledWith('precombines', 'wiki');
    expect(wiki.result).toContain('Wiki text about precombines');
  });

  it('searches for a caller acting for the user directly (MCP bridge)', async () => {
    noteUserMessage('How do precombines work?');
    await executeMossyTool('search_fallout4_wiki', { query: 'precombines' }, { ...ctx, allowWeb: true });
    expect(webSearch).toHaveBeenCalledTimes(1);
  });
});
