export type LootParseResult = {
  plugins: string[];
  format: 'json' | 'text';
};

const uniqSorted = (items: string[]) => {
  const set = new Set(items.map(s => s.trim()).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b));
};

const extractPluginNamesFromText = (text: string): string[] => {
  const re = /([A-Za-z0-9 _.-]+\.(?:esm|esp|esl))/gi;
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match[1]) out.push(match[1]);
  }
  return uniqSorted(out);
};

const extractFromJsonAny = (value: any): string[] => {
  const found: string[] = [];
  const visit = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node === 'object') {
      // Common LOOT-ish shapes:
      // - { plugins: [{ name: 'X.esp', ... }, ...] }
      // - { name: 'X.esp' }
      // - { plugin: 'X.esp' }
      for (const key of Object.keys(node)) {
        const v = (node as any)[key];
        if ((key === 'name' || key === 'plugin' || key === 'filename') && typeof v === 'string') {
          if (/\.(esm|esp|esl)$/i.test(v.trim())) found.push(v.trim());
        }
        visit(v);
      }
      return;
    }
    if (typeof node === 'string') {
      if (/\.(esm|esp|esl)$/i.test(node.trim())) found.push(node.trim());
    }
  };
  visit(value);
  return uniqSorted(found);
};

export const parseLootReport = (filePath: string, content: string): LootParseResult => {
  const trimmed = (content || '').trim();
  const looksJson = filePath.toLowerCase().endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[');

  if (looksJson) {
    try {
      const json = JSON.parse(trimmed);
      const plugins = extractFromJsonAny(json);
      if (plugins.length) return { plugins, format: 'json' };
    } catch {
      // fall through to text
    }
  }

  return { plugins: extractPluginNamesFromText(content || ''), format: 'text' };
};
