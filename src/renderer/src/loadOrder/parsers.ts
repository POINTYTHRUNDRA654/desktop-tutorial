import type { Mo2ModEntry, Mo2PluginEntry } from './types';

const normalizeLine = (line: string) => line.replace(/\r/g, '').trim();

export const parseMo2Modlist = (text: string): Mo2ModEntry[] => {
  // MO2 modlist.txt format:
  // +ModName  (enabled)
  // -ModName  (disabled)
  // # comment
  const mods: Mo2ModEntry[] = [];
  for (const raw of text.split('\n')) {
    const line = normalizeLine(raw);
    if (!line || line.startsWith('#')) continue;
    const prefix = line[0];
    if (prefix !== '+' && prefix !== '-') continue;
    const name = line.slice(1).trim();
    if (!name) continue;
    mods.push({ name, enabled: prefix === '+' });
  }
  return mods;
};

export const parseMo2PluginsTxt = (text: string): Mo2PluginEntry[] => {
  // MO2 plugins.txt format (similar to Skyrim):
  // *Plugin.esp  (enabled)
  // Plugin.esp   (disabled)
  // # comment
  const plugins: Mo2PluginEntry[] = [];
  for (const raw of text.split('\n')) {
    const line = normalizeLine(raw);
    if (!line || line.startsWith('#')) continue;

    const enabled = line.startsWith('*');
    const name = (enabled ? line.slice(1) : line).trim();
    if (!name) continue;
    plugins.push({ name, enabled });
  }
  return plugins;
};

export const extractPluginNamesFromText = (text: string): string[] => {
  // Loose heuristic: find things that look like plugin filenames.
  const re = /([A-Za-z0-9 _.-]+\.(?:esm|esp|esl))/gi;
  const set = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const name = (match[1] || '').trim();
    if (name) set.add(name);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
};
