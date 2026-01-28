type KnowledgeVaultItem = {
  id?: string;
  title?: string;
  content?: string;
  source?: string;
  date?: string;
  tags?: string[];
  status?: string;
};

const STORAGE_KEY = 'mossy_knowledge_vault';

const safeParse = (raw: string | null): KnowledgeVaultItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as KnowledgeVaultItem[]) : [];
  } catch {
    return [];
  }
};

const normalize = (s: unknown) => String(s || '').toLowerCase();

const SHORT_OK = new Set<string>([
  'ck', // Creation Kit
  'mo', // Mod Organizer (generic)
  'prp',
  'ss2',
  'mo2',
  'f4se',
]);

const expandAliasKeywords = (rawQuery: string): string[] => {
  const q = normalize(rawQuery);
  const extras: string[] = [];

  // xEdit / FO4Edit (handles common mis-hearings)
  if (/(\bx\s*headed\b|\bx\s*edit\b|\bx-?edit\b|\bfo4\s*edit\b|\bfallout\s*4\s*edit\b)/i.test(rawQuery)) {
    extras.push('xedit', 'fo4edit', 'apply script', 'edit scripts');
  }

  // Sim Settlements 2 plot building
  if (/(\bss2\b|\bsim\s*settlements?\s*2\b|\bplot\s*building\b|\bcity\s*plans?\b|\bplots?\b)/i.test(rawQuery)) {
    extras.push('ss2', 'sim settlements 2', 'plot', 'city plan', 'workshop framework');
  }

  // PRP / previs-precombine topics
  if (/(\bprp\b|\bprevis\b|\bprecombine\b|\bprecombines\b|\bprevisibines\b|\bprevisibines\s*repair\s*pack\b)/i.test(rawQuery)) {
    extras.push('prp', 'previs', 'precombine', 'previsibines repair pack', 'optimization');
  }

  // Patch building / conflict resolution
  if (/(\bpatch(es)?\b|\bconflict(s)?\b|\bload\s*order\b|\bresolution\b)/i.test(q)) {
    extras.push('patch', 'conflict', 'load order', 'mo2', 'vortex', 'xedit');
  }

  return extras;
};

const extractKeywords = (query: string): string[] => {
  const base = normalize(query)
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 || SHORT_OK.has(w) || (w.length >= 2 && /\d/.test(w)));

  const expanded = expandAliasKeywords(query)
    .flatMap((s) =>
      normalize(s)
        .replace(/[^a-z0-9_\-\s]/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 3 || SHORT_OK.has(w) || (w.length >= 2 && /\d/.test(w)))
    );

  const q = [...base, ...expanded];

  // De-dupe but preserve order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of q) {
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out.slice(0, 24);
};

const scoreItem = (item: KnowledgeVaultItem, keywords: string[]): number => {
  if (keywords.length === 0) return 0;

  const title = normalize(item.title);
  const content = normalize(item.content);
  const tags = (item.tags || []).map(normalize).join(' ');

  let score = 0;
  for (const k of keywords) {
    if (title.includes(k)) score += 5;
    if (tags.includes(k)) score += 3;
    if (content.includes(k)) score += 1;
  }

  // Mild recency bonus if date parses
  if (item.date) {
    const t = Date.parse(item.date);
    if (!Number.isNaN(t)) {
      const ageDays = Math.max(0, (Date.now() - t) / (24 * 60 * 60 * 1000));
      score += Math.max(0, 2 - ageDays / 30); // up to +2, fades over ~60 days
    }
  }

  return score;
};

export const loadKnowledgeVault = (): KnowledgeVaultItem[] => {
  return safeParse(typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null);
};

export const buildKnowledgeManifestForModel = (): string => {
  const items = loadKnowledgeVault();
  if (items.length === 0) return '';

  return (
    `\n**KNOWLEDGE BASE STATUS:**\n` +
    `- Knowledge Vault loaded: ${items.length} items\n` +
    `- Do NOT ask the user to repeat information that could be in the Knowledge Vault.\n` +
    `- If you need a detail, say you will search the Knowledge Vault and ask for a keyword or the relevant title/tag.\n` +
    `- When the user needs installs/tools/mods (xEdit/SS2/PRP/patching), give a step-by-step checklist: what to get, where to download (ONLY if the URL is in the Knowledge Vault or user provided it), how to install (MO2/Vortex/manual), how to verify it works, and common gotchas.\n`
  );
};

export const buildRelevantKnowledgeVaultContext = (query: string, opts?: {
  maxItems?: number;
  maxChars?: number;
}): string => {
  const items = loadKnowledgeVault();
  if (items.length === 0) return '';

  const maxItems = opts?.maxItems ?? 8;
  const maxChars = opts?.maxChars ?? 5000;

  const keywords = extractKeywords(query);

  // If query has no useful keywords, just show recent titles
  const ranked = keywords.length
    ? items
        .map((it) => ({ it, s: scoreItem(it, keywords) }))
        .sort((a, b) => b.s - a.s)
        .filter((x) => x.s > 0)
        .slice(0, Math.max(maxItems, 3))
        .map((x) => x.it)
    : items.slice(-maxItems).reverse();

  if (ranked.length === 0) {
    // No keyword matches; show small recent index
    const recent = items.slice(-maxItems).reverse();
    const list = recent
      .map((it) => `- ${String(it.title || 'Untitled').trim()}`)
      .join('\n');
    return `\n**KNOWLEDGE VAULT (INDEX):**\n${list}\n`;
  }

  let used = 0;
  const lines: string[] = [];
  for (const it of ranked.slice(0, maxItems)) {
    const title = String(it.title || 'Untitled').trim();
    const tags = Array.isArray(it.tags) && it.tags.length ? ` [${it.tags.join(', ')}]` : '';
    const content = String(it.content || '').replace(/\s+/g, ' ').trim();
    const excerptMax = 1200;
    const excerpt = content.length > 0 ? content.slice(0, excerptMax) + (content.length > excerptMax ? '…' : '') : '';

    const block = `- ${title}${tags}${excerpt ? `: ${excerpt}` : ''}`;
    if (used + block.length > maxChars) break;
    lines.push(block);
    used += block.length;
  }

  if (lines.length === 0) return '';
  return `\n**KNOWLEDGE VAULT (RELEVANT EXCERPTS):**\n${lines.join('\n')}\n`;
};

export const buildRecentKnowledgeIndex = (maxItems = 10): string => {
  const items = loadKnowledgeVault();
  if (items.length === 0) return '';

  const recent = items.slice(-maxItems).reverse();
  const list = recent
    .map((it) => {
      const title = String(it.title || 'Untitled').trim();
      const tags = Array.isArray(it.tags) && it.tags.length ? ` [${it.tags.join(', ')}]` : '';
      return `- ${title}${tags}`;
    })
    .join('\n');

  return `\n**KNOWLEDGE VAULT (RECENT INDEX):**\n${list}\n`;
};
