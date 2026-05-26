import { installWizardResources } from './installWizardResources';

export type KnowledgeVaultItem = {
  id?: string;
  title?: string;
  content?: string;
  source?: string;
  creditName?: string;
  creditUrl?: string;
  trustLevel?: 'personal' | 'community' | 'official';
  date?: string;
  tags?: string[];
  status?: string;
};

export type KnowledgeCitation = {
  title: string;
  source?: string;
  creditName?: string;
  creditUrl?: string;
  trustLevel?: 'personal' | 'community' | 'official';
  tags?: string[];
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

  // Blender add-on / plugin topics
  if (/(\bblender\b|\b3d\s*model\b|\bblend\s*file\b|\bblend\b|\bnif\s*(tools|plugin)\b|\bio_scene_nif\b|\bblender[\s_-]?addon\b|\bblender[\s_-]?plugin\b)/i.test(rawQuery)) {
    extras.push('blender', 'blender-addon', '3d modeling', 'mesh', 'nif');
  }

  // Third-party Blender add-on look-up (e.g. "how do I use RigifyPlus in Blender")
  if (/(\badd[\s-]?on\b|\bplugin\b|\bextension\b)/i.test(rawQuery) &&
    /\bblender\b/i.test(rawQuery)) {
    extras.push('blender-addon', 'blender', 'third-party');
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

/**
 * Count non-overlapping occurrences of needle in haystack.
 */
const countOccurrences = (haystack: string, needle: string): number => {
  if (!needle) return 0;
  let count = 0;
  let start = 0;
  while ((start = haystack.indexOf(needle, start)) !== -1) {
    count++;
    start += needle.length;
  }
  return count;
};

const scoreItem = (item: KnowledgeVaultItem, keywords: string[], rawQuery: string): number => {
  if (keywords.length === 0) return 0;

  const title = normalize(item.title);
  const content = normalize(item.content);
  const tags = (item.tags || []).map(normalize).join(' ');

  let score = 0;
  const normQuery = normalize(rawQuery);

  // --- Unigram / keyword scoring ---
  for (const k of keywords) {
    const titleHits = countOccurrences(title, k);
    const tagHits = countOccurrences(tags, k);
    const contentHits = countOccurrences(content, k);

    // Title and tag matches are high-signal; content matches use sqrt to prevent
    // long documents from dominating just due to repetition.
    if (titleHits > 0) score += 6 * titleHits;
    if (tagHits > 0)   score += 4 * tagHits;
    if (contentHits > 0) score += Math.sqrt(contentHits); // frequency-dampened
  }

  // --- Phrase match bonus: full query substring in title/tags/content ---
  // Rewards items that match the full query phrase, not just individual keywords.
  if (normQuery.length >= 4) {
    if (title.includes(normQuery))   score += 15;
    if (tags.includes(normQuery))    score += 10;
    if (content.includes(normQuery)) score += 4;
  }

  // --- Trust level boost ---
  // Official docs and personal user notes are higher-fidelity than community items.
  const trust = item.trustLevel ?? 'personal';
  if (trust === 'official')  score *= 1.15;
  else if (trust === 'personal') score *= 1.05;
  // community stays at 1.0

  // --- Recency bonus: items added recently are slightly preferred ---
  if (item.date) {
    const t = Date.parse(item.date);
    if (!Number.isNaN(t)) {
      const ageDays = Math.max(0, (Date.now() - t) / (24 * 60 * 60 * 1000));
      score += Math.max(0, 2.5 - ageDays / 45); // up to +2.5, fades over ~112 days
    }
  }

  return score;
};

const getInstallWizardKnowledgeItems = (): KnowledgeVaultItem[] => {
  return Object.entries(installWizardResources).flatMap(([topic, resources]) =>
    resources.map((resource, index) => ({
      id: `install-wizard-${topic}-${index}`,
      title: resource.label,
      content: `${resource.content}${resource.note ? ` Source note: ${resource.note}` : ''}`,
      source: resource.url,
      creditName: 'Mossy Install Wizard',
      trustLevel: 'official' as const,
      tags: Array.from(new Set([...resource.tags, topic, 'downloads', 'sources'])),
      status: 'built-in',
    }))
  );
};

const filterVisibleKnowledgeItems = (items: KnowledgeVaultItem[], excludeTerms?: string[]): KnowledgeVaultItem[] => {
  const blockedTerms = (excludeTerms || []).map((w) => normalize(w)).filter(Boolean);
  if (blockedTerms.length === 0) return items;

  return items.filter((it) => {
    const text = `${normalize(it.title)} ${normalize(it.content)} ${normalize(it.source)}`;
    return !blockedTerms.some((w) => text.includes(w));
  });
};

const rankKnowledgeItems = (
  items: KnowledgeVaultItem[],
  keywords: string[],
  maxItems: number,
  rawQuery = '',
): KnowledgeVaultItem[] => {
  if (keywords.length === 0) return items.slice(-maxItems).reverse();

  return items
    .map((it) => ({ it, s: scoreItem(it, keywords, rawQuery) }))
    .sort((a, b) => b.s - a.s)
    .filter((x) => x.s > 0)
    .slice(0, Math.max(maxItems, 3))
    .map((x) => x.it);
};

export const loadKnowledgeVault = (): KnowledgeVaultItem[] => {
  return safeParse(typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null);
};

/**
 * Auto-fetched item prefixes (IDs created by LocalAIEngine or MossyTools web search).
 * User-added items (uploaded docs, personal notes) are never pruned.
 */
const AUTO_ID_PREFIXES = ['auto-web-', 'live-scan-wiki-', 'live-scan-web-'];
const isAutoFetched = (id?: string) => AUTO_ID_PREFIXES.some((p) => String(id || '').startsWith(p));

/** Maximum number of auto-fetched vault items to retain. Oldest are pruned first. */
const MAX_AUTO_ITEMS = 200;

/**
 * Prune auto-fetched Knowledge Vault entries when the count exceeds MAX_AUTO_ITEMS.
 * User-uploaded / manually-added items are never touched.
 * Call this after adding a new auto-fetched item.
 */
export const pruneAutoFetchedVaultItems = (vault: KnowledgeVaultItem[]): KnowledgeVaultItem[] => {
  const userItems = vault.filter((it) => !isAutoFetched(it.id));
  const autoItems = vault.filter((it) => isAutoFetched(it.id));
  if (autoItems.length <= MAX_AUTO_ITEMS) return vault;
  // Keep only the most-recent MAX_AUTO_ITEMS auto items (newest at the end of the array)
  const trimmed = autoItems.slice(-MAX_AUTO_ITEMS);
  return [...userItems, ...trimmed];
};

/**
 * Returns true when a vault already contains a sufficiently similar item for
 * the same topic so that we can skip adding a duplicate.
 * Comparison: items with the same first 80 chars of title added within 7 days.
 * Items with a missing or unparseable date are treated as "now" (conservative).
 */
export const isDuplicateVaultEntry = (vault: KnowledgeVaultItem[], title: string): boolean => {
  const norm = String(title || '').trim().slice(0, 80).toLowerCase();
  if (!norm) return false;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
  return vault.some((it) => {
    const itNorm = String(it.title || '').trim().slice(0, 80).toLowerCase();
    if (itNorm !== norm) return false;
    // Treat missing/unparseable date as "now" — conservative: counts as duplicate.
    const t = it.date ? Date.parse(it.date) : Date.now();
    return Number.isNaN(t) ? true : t > cutoff;
  });
};

export const buildKnowledgeManifestForModel = (): string => {
  const items = loadKnowledgeVault();
  if (items.length === 0) return '';

  return (
    `\n**KNOWLEDGE BASE STATUS:**\n` +
    `- Knowledge Vault loaded: ${items.length} items\n` +
    `- Do NOT ask the user to repeat information that could be in the Knowledge Vault.\n` +
    `- If you need a detail, say you will search the Knowledge Vault and ask for a keyword or the relevant title/tag.\n` +
    `- When the user needs installs/tools/mods (xEdit/SS2/PRP/patching), give a step-by-step checklist: what to get, where to download (ONLY if the URL is in the Knowledge Vault or user provided it), how to install (MO2/Vortex/manual), how to verify it works, and common gotchas.\n` +
    `- Always preserve credit: if a Knowledge Vault item includes a credit name or source, surface it in your answer.\n`
  );
};

export const getRelevantKnowledgeVaultItems = (
  query: string,
  opts?: { maxItems?: number; excludeTerms?: string[] }
): KnowledgeCitation[] => {
  const maxItems = opts?.maxItems ?? 6;
  const keywords = extractKeywords(query);
  const visibleItems = filterVisibleKnowledgeItems(loadKnowledgeVault(), opts?.excludeTerms);
  const visibleInstallWizardItems = keywords.length
    ? filterVisibleKnowledgeItems(getInstallWizardKnowledgeItems(), opts?.excludeTerms)
    : [];
  const ranked = rankKnowledgeItems(
    [...visibleItems, ...visibleInstallWizardItems],
    keywords,
    maxItems,
    query,
  );
  if (ranked.length === 0) return [];

  return ranked.slice(0, maxItems).map((it) => ({
    title: String(it.title || 'Untitled').trim(),
    source: it.source,
    creditName: it.creditName,
    creditUrl: it.creditUrl,
    trustLevel: it.trustLevel,
    tags: Array.isArray(it.tags) ? it.tags : undefined,
  }));
};

export const buildRelevantKnowledgeVaultContext = (query: string, opts?: {
  maxItems?: number;
  maxChars?: number;
  excludeTerms?: string[];
}): string => {
  const maxItems = opts?.maxItems ?? 8;
  const maxChars = opts?.maxChars ?? 5000;
  const keywords = extractKeywords(query);
  const visibleItems = filterVisibleKnowledgeItems(loadKnowledgeVault(), opts?.excludeTerms);
  const visibleInstallWizardItems = keywords.length
    ? filterVisibleKnowledgeItems(getInstallWizardKnowledgeItems(), opts?.excludeTerms)
    : [];
  const ranked = rankKnowledgeItems(
    [...visibleItems, ...visibleInstallWizardItems],
    keywords,
    maxItems,
    query,
  );

  if (ranked.length === 0) {
    const recent = visibleItems.slice(-maxItems).reverse();
    if (recent.length === 0) return '';
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
    const trust = it.trustLevel ? ` trust:${it.trustLevel}` : '';
    const credit = it.creditName ? ` credit:${it.creditName}` : '';
    const source = it.source ? ` source:${it.source}` : '';
    const content = String(it.content || '').replace(/\s+/g, ' ').trim();
    const excerptMax = 1200;
    const excerpt = content.length > 0 ? content.slice(0, excerptMax) + (content.length > excerptMax ? '…' : '') : '';

    const block = `- ${title}${tags}${trust}${credit}${source}${excerpt ? `: ${excerpt}` : ''}`;
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

/**
 * Returns a formatted context block containing all vault items tagged as
 * Blender add-on tutorials. Injected into the system prompt whenever Blender
 * is linked, so Mossy can guide the user with any third-party add-on docs they
 * have ingested.
 *
 * @param addonName  Optional: narrow results to a specific add-on name.
 */
export const buildBlenderAddonContext = (addonName?: string, opts?: {
  maxItems?: number;
  maxChars?: number;
}): string => {
  const items = loadKnowledgeVault();
  if (items.length === 0) return '';

  const maxItems = opts?.maxItems ?? 10;
  const maxChars = opts?.maxChars ?? 6000;

  const normalize = (s: unknown) => String(s || '').toLowerCase();

  // Keep items that are tagged as blender-addon or blender
  const addonItems = items.filter((it) => {
    const tags = (it.tags || []).map((t) => normalize(t));
    const hasAddonTag =
      tags.some((t) => t.includes('blender-addon') || t.includes('blender_addon')) ||
      tags.includes('blender');
    if (!hasAddonTag) return false;

    // If a specific add-on name was requested, filter by it
    if (addonName) {
      const needle = normalize(addonName);
      return (
        normalize(it.title).includes(needle) ||
        (it.tags || []).some((t) => normalize(t).includes(needle)) ||
        normalize(it.content).includes(needle)
      );
    }
    return true;
  });

  if (addonItems.length === 0) return '';

  let used = 0;
  const lines: string[] = [];
  for (const it of addonItems.slice(0, maxItems)) {
    const title = String(it.title || 'Untitled').trim();
    const tags = Array.isArray(it.tags) && it.tags.length ? ` [${it.tags.join(', ')}]` : '';
    const credit = it.creditName ? ` credit:${it.creditName}` : '';
    const source = it.source ? ` source:${it.source}` : '';
    const content = String(it.content || '').replace(/\s+/g, ' ').trim();
    const excerptMax = 1200;
    const excerpt = content.length > 0
      ? content.slice(0, excerptMax) + (content.length > excerptMax ? '…' : '')
      : '';
    const block = `- ${title}${tags}${credit}${source}${excerpt ? `: ${excerpt}` : ''}`;
    if (used + block.length > maxChars) break;
    lines.push(block);
    used += block.length;
  }

  if (lines.length === 0) return '';
  return (
    `\n**BLENDER ADD-ON KNOWLEDGE (${lines.length} tutorial${lines.length === 1 ? '' : 's'} loaded):**\n` +
    `Use the following docs to guide the user with their Blender add-on(s). ` +
    `Always credit the original author when citing steps.\n` +
    lines.join('\n') + '\n'
  );
};

/**
 * Returns a formatted context block with Creation Kit resources and video tutorials.
 * Includes references to multiple community educators: Sheldon Seddon and Darkfox127.
 * Injected whenever user asks about Creation Kit, scripting, quest design, or modding.
 */
export const buildCreationKitResourcesContext = (opts?: {
  maxItems?: number;
  maxChars?: number;
}): string => {
  const maxItems = opts?.maxItems ?? 8;
  const maxChars = opts?.maxChars ?? 5000;

  // Start with primary video resources
  let context = `
**CREATION KIT & MODDING RESOURCES:**

**📺 VIDEO TUTORIALS - COMMUNITY EDUCATORS:**

**SHELDON SEDDON'S CREATION KIT CHANNEL:**
- **Channel:** https://www.youtube.com/user/seddon4494
- **Focus:** Comprehensive Creation Kit and GECK knowledge repository
- **Content:** Quest scripting, NPC creation, dialogue design, worldbuilding, precombine/previs optimization, Papyrus scripting, and advanced CK techniques
- **Format:** Free video tutorials covering both beginner and advanced topics

**DARKFOX127 (RICHARD) - CREATION KIT TUTORIALS:**
- **YouTube:** https://www.youtube.com/@Darkfox127
- **Playlists:** https://www.youtube.com/@Darkfox127/playlists
- **Twitch (Live Streams):** https://www.twitch.tv/darkfox127
- **Website:** https://darkfox127.com
- **Content:** CK fundamentals, modding tutorials, world editing, NPC/quest creation, best practices, live mod demonstrations
- **Format:** Video tutorials, curated playlists, Twitch livestreams for interactive learning

**KEY RESOURCES:**
- Direct users to these channels for free, comprehensive Creation Kit education
- Sheldon Seddon: Structured, accumulated CK knowledge
- Darkfox127: Tutorial series + live interactive learning on Twitch
- Both creators provide freely shared educational content for the modding community
`;

  // Add any CK-tagged vault items
  const items = loadKnowledgeVault();
  const ckItems = items.filter((it) => {
    const tags = (it.tags || []).map((t) => String(t).toLowerCase());
    return (
      tags.some((t) => t.includes('creation kit') || t.includes('ck') || t.includes('papyrus') || t.includes('quest') || t.includes('sheldon') || t.includes('darkfox'))
    );
  });

  if (ckItems.length > 0) {
    context += `\n**LOCAL KNOWLEDGE VAULT (CK-RELATED):**\n`;
    let used = context.length;
    for (const it of ckItems.slice(0, maxItems)) {
      const title = String(it.title || 'Untitled').trim();
      const tags = Array.isArray(it.tags) && it.tags.length ? ` [${it.tags.join(', ')}]` : '';
      const credit = it.creditName ? ` credit:${it.creditName}` : '';
      const block = `- ${title}${tags}${credit}`;
      if (used + block.length > maxChars) break;
      context += block + '\n';
      used += block.length;
    }
  }

  context += `
**REMEMBER:** When answering Creation Kit questions:
- Direct users to Sheldon Seddon's YouTube channel for comprehensive, accumulated CK knowledge
- Direct users to Darkfox127's YouTube tutorials for structured guides and Twitch for live, interactive learning
- Both channels provide freely shared educational resources for the Fallout modding community
- Always credit the original creators when recommending their content
`;

  return context;
};

// ---------------------------------------------------------------------------
// File-backed persistence helpers
// These ensure that knowledge the user feeds to Mossy is not lost when
// localStorage gets cleared or when the app is reinstalled.
// The file is stored at userData/knowledge-vault.json (persists across
// app updates and localStorage clears).
// ---------------------------------------------------------------------------

const getElectronBridge = (): any =>
  typeof window !== 'undefined'
    ? (window as any).electron?.api || (window as any).electronAPI
    : null;

/**
 * Validate that a value looks like a KnowledgeVaultItem before accepting it
 * from untrusted IPC / file data. Accepts any object with at least an id string;
 * unknown extra fields are preserved.
 */
const isValidVaultItem = (v: unknown): v is KnowledgeVaultItem =>
  v !== null &&
  typeof v === 'object' &&
  typeof (v as Record<string, unknown>).id === 'string';

/**
 * Save the full Knowledge Vault array to the userData file via IPC.
 * Silently succeeds if not running in Electron (e.g., browser preview).
 */
export const saveKnowledgeVaultToFile = async (items: unknown[]): Promise<void> => {
  try {
    const bridge = getElectronBridge();
    if (!bridge?.saveKnowledgeVault) return;
    const result = await bridge.saveKnowledgeVault(items);
    if (!result?.ok) {
      console.warn('[KnowledgeVault] File save failed:', result?.error);
    }
  } catch (e) {
    console.warn('[KnowledgeVault] saveKnowledgeVaultToFile error:', e);
  }
};

/**
 * Load the Knowledge Vault from the userData file via IPC.
 * Returns [] if the file doesn't exist or isn't in Electron.
 * Validates each item before accepting it to guard against corrupted file data.
 * Also writes the validated items back to localStorage for the in-memory layer.
 */
export const restoreKnowledgeVaultFromFile = async (): Promise<KnowledgeVaultItem[]> => {
  try {
    const bridge = getElectronBridge();
    if (!bridge?.loadKnowledgeVaultFromFile) return [];
    const raw = await bridge.loadKnowledgeVaultFromFile();
    if (!Array.isArray(raw) || raw.length === 0) return [];
    // Validate every item so corrupted or malicious file data can't inject
    // unexpected objects into the application state.
    const items = (raw as unknown[]).filter(isValidVaultItem);
    if (items.length === 0) return [];
    // Write back to localStorage so all existing callers that read localStorage still work
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
    return items;
  } catch (e) {
    console.warn('[KnowledgeVault] restoreKnowledgeVaultFromFile error:', e);
    return [];
  }
};
