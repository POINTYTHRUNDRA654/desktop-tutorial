export type ApprovedTool = {
  name: string;
  path?: string;
  category?: string;
  checked?: boolean;
};

const STORAGE_KEYS = {
  apps: 'mossy_apps',
  integratedTools: 'mossy_integrated_tools',
};

const safeJsonParse = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const normalizeName = (value: unknown) => String(value || '').trim();
const normalizePath = (value: unknown) => {
  const s = String(value || '').trim();
  return s.length ? s : undefined;
};

const toolKey = (t: { name?: unknown; path?: unknown }) => {
  const path = normalizePath(t.path);
  if (path) return `path:${path.toLowerCase()}`;
  return `name:${normalizeName(t.name).toLowerCase()}`;
};

export const getApprovedToolsFromStorage = (): ApprovedTool[] => {
  const apps = safeJsonParse<any[]>(localStorage.getItem(STORAGE_KEYS.apps));
  if (Array.isArray(apps) && apps.length > 0) {
    return apps
      .map((a: any) => ({
        name: normalizeName(a.name || a.displayName),
        path: normalizePath(a.path),
        category: normalizeName(a.category) || undefined,
        checked: typeof a.checked === 'boolean' ? a.checked : true,
      }))
      .filter((t) => t.name.length > 0);
  }

  const integrated = safeJsonParse<any[]>(localStorage.getItem(STORAGE_KEYS.integratedTools));
  if (Array.isArray(integrated) && integrated.length > 0) {
    return integrated
      .map((t: any) => ({
        name: normalizeName(t.name),
        path: normalizePath(t.path),
        category: normalizeName(t.category) || undefined,
        checked: true,
      }))
      .filter((t) => t.name.length > 0);
  }

  return [];
};

export const getApprovedToolsSummary = (maxNames = 8): { count: number; names: string[] } => {
  const tools = getApprovedToolsFromStorage().filter((t) => t.checked !== false);
  const names = tools
    .map((t) => t.name)
    .filter(Boolean)
    .slice(0, maxNames);
  return { count: tools.length, names };
};

export const mergeExistingCheckedState = <T extends { name?: any; path?: any; checked?: any }>(
  newTools: T[],
  existingTools: T[]
): T[] => {
  const existingByKey = new Map<string, T>();
  for (const e of existingTools) {
    existingByKey.set(toolKey(e), e);
  }

  return newTools.map((t) => {
    const existing = existingByKey.get(toolKey(t));
    if (!existing) return t;
    if (typeof existing.checked !== 'boolean') return t;
    return { ...t, checked: existing.checked };
  });
};

export const getToolPermissionsContextForModel = (opts: {
  bridgeActive: boolean;
  blenderLinked: boolean;
}): string => {
  const tools = getApprovedToolsFromStorage();
  const approved = tools.filter((t) => t.checked !== false);

  if (approved.length === 0) {
    return (
      `\n**INTEGRATION PERMISSIONS:**\n` +
      `- No approved external tools are saved yet. If the user wants you to interact with their installed programs, ask them to run a system scan and approve the tools they want integrated.`
    );
  }

  const top = approved
    .slice(0, 18)
    .map((t) => `- ${t.name}${t.path ? ` (Path: ${t.path})` : ''}`)
    .join('\n');
  const more = approved.length > 18 ? `\n- ...and ${approved.length - 18} more` : '';

  const bridgeLine = opts.bridgeActive
    ? 'Desktop Bridge is ONLINE (automation/launch/integration can be used when relevant).'
    : 'Desktop Bridge is OFFLINE right now (permission exists, but integrations may not execute until Bridge is online).';

  const blenderLine = opts.blenderLinked
    ? 'Blender Link is ACTIVE (you may generate Blender Python scripts and route them through the approved run flow).'
    : 'Blender Link is not active yet.';

  return (
    `\n**INTEGRATION PERMISSIONS (PERSISTENT):**\n` +
    `The user has already granted you permission to interact with these approved programs/tools. You do NOT need to rescan every session. Assume this permission remains valid until the user revokes it in settings or resets scan data.\n\n` +
    `${bridgeLine}\n` +
    `${blenderLine}\n\n` +
    `**APPROVED TOOLS:**\n${top}${more}\n\n` +
    `POLICY: You may propose and use integrations to help teach and guide the user, but still confirm before executing actions that change files or system state.`
  );
};
