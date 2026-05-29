import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, FolderOpen, Hammer, Wrench, ShieldCheck, ArrowDownToLine, RefreshCcw, AlertCircle, Package, GitBranch, Search, Download } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useI18n } from './i18n';
import { openExternal } from './utils/openExternal';
import { getPublicAssetUrl } from './utils/publicAssetUrl';
import { installWizardBuiltInLinks, type InstallWizardTopic } from './installWizardResources';

type WizardStep = {
  id: string;
  title: string;
  details: React.ReactNode;
};

type WizardSection = {
  id: 'prereqs' | 'download' | 'install' | 'verify' | 'troubleshoot';
  title: string;
  icon: React.ComponentType<any>;
  steps: WizardStep[];
};

type WizardState = {
  topic: InstallWizardTopic;
  checked: Record<string, boolean>; // key = `${topic}:${sectionId}:${stepId}`
  modManager: 'mo2' | 'vortex' | 'manual';
};

type KnowledgeVaultItem = {
  title?: string;
  content?: string;
  source?: string;
  tags?: string[];
  date?: string;
};

const STORAGE_KEY = 'mossy_install_wizard_state_v1';

const DEFAULT_STATE: WizardState = {
  topic: 'xedit',
  checked: {},
  modManager: 'mo2',
};

const safeParseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const extractUrls = (text: string): string[] => {
  const urls = text.match(/https?:\/\/[^\s)\]]+/gi) || [];
  // Trim trailing punctuation that often gets captured
  return urls.map(u => u.replace(/[).,;]+$/g, ''));
};

const uniq = (xs: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const k = x.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
};

const extractVaultItems = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)) {
    return (data as { items: unknown[] }).items;
  }
  return [];
};

const loadVault = (): KnowledgeVaultItem[] => {
  const raw = localStorage.getItem('mossy_knowledge_vault');
  const parsed = safeParseJson<unknown>(raw, []);
  return Array.isArray(parsed) ? (parsed as KnowledgeVaultItem[]) : [];
};

const normalizeVaultItems = (items: any[]): KnowledgeVaultItem[] => {
  return items
    .filter((it) => it && typeof it === 'object')
    .map((it) => ({
      title: typeof it.title === 'string' ? it.title : undefined,
      content: typeof it.content === 'string' ? it.content : undefined,
      source: typeof it.source === 'string' ? it.source : undefined,
      tags: Array.isArray(it.tags) ? it.tags.filter((t: any) => typeof t === 'string') : undefined,
      date: typeof it.date === 'string' ? it.date : undefined,
    }))
    .filter((it) => (it.title && it.title.trim()) || (it.content && it.content.trim()));
};

const vaultKey = (item: KnowledgeVaultItem) => {
  const title = (item.title || '').trim();
  const content = (item.content || '').trim();
  return `t:${title.toLowerCase()}|c:${content.slice(0, 160).toLowerCase()}`;
};

const topicKeywords: Record<InstallWizardTopic, string[]> = {
  f4se: ['f4se', 'script extender', 'f4se_loader', 'address library', 'mcm', 'hudframework', 'hud framework', 'mod configuration menu'],
  xedit: ['xedit', 'fo4edit', 'apply script', 'edit scripts', 'conflict', 'override'],
  ss2: ['ss2', 'sim settlements 2', 'plot', 'plot building', 'city plan', 'workshop framework'],
  prp: ['prp', 'previs', 'precombine', 'previsibines repair pack', 'optimization', 'pjm', 'pjmscripts', 'patching scripts', 'fo4check_previsbines'],
  patching: ['patch', 'patches', 'conflict', 'load order', 'merge', 'override', 'xedit'],
};

const openUrl = (url: string) => {
  void openExternal(url);
};

const revealPath = async (path: string) => {
  const bridge = (window as any).electron?.api || (window as any).electronAPI;
  try {
    if (bridge?.revealInFolder) {
      await bridge.revealInFolder(path);
      return;
    }
    if (bridge?.openExternal) {
      await bridge.openExternal(path);
    }
  } catch {
    // ignore
  }
};

const StepRow: React.FC<{
  checked: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ checked, onToggle, title, children }) => {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-slate-800 bg-black/40 p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
          aria-label={checked
            ? t('installWizard.step.markIncomplete', 'Mark step incomplete')
            : t('installWizard.step.markComplete', 'Mark step complete')
          }
          title={checked
            ? t('installWizard.step.completed', 'Completed')
            : t('installWizard.step.notCompleted', 'Not completed')
          }
        >
          {checked ? <CheckCircle2 className="w-4 h-4 text-white" /> : null}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-white tracking-tight">{title}</div>
          <div className="mt-2 text-xs text-slate-300 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
};

type InstallWizardProps = {
  embedded?: boolean;
};

export const InstallWizard: React.FC<InstallWizardProps> = ({ embedded = false }) => {
  const { t } = useI18n();
  const [state, setState] = useState<WizardState>(() => safeParseJson(localStorage.getItem(STORAGE_KEY), DEFAULT_STATE));

  const [vault, setVault] = useState<KnowledgeVaultItem[]>(() => loadVault());
  const [vaultImportStatus, setVaultImportStatus] = useState('');
  const [vaultImportBusy, setVaultImportBusy] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const refreshVault = () => {
    setVault(loadVault());
  };
  const lastDownloadPath = (localStorage.getItem('mossy_last_download_path') || '').trim();

  const mergeVault = (incoming: KnowledgeVaultItem[]) => {
    const current = loadVault();
    const merged: KnowledgeVaultItem[] = [];
    const seen = new Set<string>();

    for (const it of current) {
      const key = vaultKey(it);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(it);
      }
    }

    for (const it of incoming) {
      const key = vaultKey(it);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(it);
      }
    }

    localStorage.setItem('mossy_knowledge_vault', JSON.stringify(merged));
    setVault(merged);
    window.dispatchEvent(new Event('mossy-knowledge-updated'));
    return { added: Math.max(0, merged.length - current.length), total: merged.length };
  };

  const importVaultJson = async (rawText: string) => {
    try {
      const parsed = JSON.parse(rawText);
      const items = extractVaultItems(parsed);
      if (!Array.isArray(items)) {
        setVaultImportStatus('Import failed: JSON must be an array or an object with an "items" array.');
        return;
      }
      const normalized = normalizeVaultItems(items);
      if (normalized.length === 0) {
        setVaultImportStatus('Import skipped: No usable items found.');
        return;
      }
      const res = mergeVault(normalized);
      setVaultImportStatus(`Imported ${normalized.length} items. Total now ${res.total}.`);
    } catch (e: any) {
      setVaultImportStatus(`Import failed: ${String(e?.message || e)}`);
    }
  };

  const handleVaultFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVaultImportBusy(true);
    setVaultImportStatus('');
    try {
      const text = await file.text();
      await importVaultJson(text);
    } finally {
      setVaultImportBusy(false);
      e.target.value = '';
    }
  };

  const loadBundledVault = async () => {
    setVaultImportBusy(true);
    setVaultImportStatus('');
    try {
      const resp = await fetch(getPublicAssetUrl('bundled-knowledge/core-tutorials.json'), { cache: 'no-cache' });
      if (!resp.ok) {
        setVaultImportStatus('Bundled vault not found.');
        return;
      }
      const data = await resp.json();
      const items = extractVaultItems(data);
      if (!Array.isArray(items) || items.length === 0) {
        setVaultImportStatus('Bundled vault is empty.');
        return;
      }
      await importVaultJson(JSON.stringify(items));
    } finally {
      setVaultImportBusy(false);
    }
  };

  const vaultLinks = useMemo(() => {
    const keys = topicKeywords[state.topic];
    const scored = vault
      .map((it) => {
        const hay = `${it.title || ''}\n${it.tags?.join(' ') || ''}\n${it.content || ''}\n${it.source || ''}`.toLowerCase();
        const score = keys.reduce((acc, k) => (hay.includes(k.toLowerCase()) ? acc + 1 : acc), 0);
        return { it, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.it);

    const urls = scored.flatMap((it) => {
      const out: string[] = [];
      if (it.source) out.push(...extractUrls(String(it.source)));
      if (it.content) out.push(...extractUrls(String(it.content)));
      return out;
    });

    return uniq(urls).slice(0, 12);
  }, [vault, state.topic]);

  const toggleChecked = (topic: InstallWizardTopic, sectionId: string, stepId: string) => {
    const key = `${topic}:${sectionId}:${stepId}`;
    setState((s) => ({
      ...s,
      checked: { ...s.checked, [key]: !s.checked[key] },
    }));
  };

  const isChecked = (topic: InstallWizardTopic, sectionId: string, stepId: string) => {
    const key = `${topic}:${sectionId}:${stepId}`;
    return !!state.checked[key];
  };

  const sections: WizardSection[] = useMemo(() => {
    const mm = state.modManager;

    const modManagerBlurb = mm === 'mo2'
      ? 'You are using Mod Organizer 2 (MO2). Install mods as separate entries; keep plugins organized; verify with LOOT.'
      : mm === 'vortex'
        ? 'You are using Vortex. Install/enable mods, deploy, then sort plugins; verify deployment is successful.'
        : 'You are installing manually. This is riskier; keep backups and be extra careful about overwrites.';

    const installPathHint = mm === 'mo2'
      ? 'MO2: install via "Install a new mod from an archive" and keep it enabled in the left pane; plugins in right pane.'
      : mm === 'vortex'
        ? 'Vortex: install from file, enable, deploy, then check Plugins page for enabled state.'
        : 'Manual: copy into Fallout 4 Data folder only when you know exactly what files are overwriting.';

    if (state.topic === 'f4se') {
      return [
        {
          id: 'prereqs',
          title: 'Prereqs',
          icon: ShieldCheck,
          steps: [
            {
              id: 'game-version',
              title: 'Identify your Fallout 4 version (OG vs Next-Gen)',
              details: <>Launch Fallout 4 and note the version shown on the main menu, or check <code>Fallout4.exe</code> properties → Details → File version. OG = <b>1.10.163.0</b>. Next-Gen (NG) = <b>1.10.984.0 or later</b>. You MUST install the F4SE version that exactly matches your game runtime — there is no cross-compatibility.</>,
            },
            {
              id: 'mm',
              title: 'Choose your mod manager workflow',
              details: <>{modManagerBlurb} F4SE itself is installed directly into the Fallout 4 folder, not through a mod manager — only F4SE plugins (in <code>Data\F4SE\Plugins\</code>) go through the manager.</>,
            },
          ],
        },
        {
          id: 'download',
          title: 'Download',
          icon: Download,
          steps: [
            {
              id: 'get-f4se',
              title: 'Download F4SE from the official site only',
              details: <>Go to <b>f4se.silverlock.org</b> (official site — see links panel). Download the build that matches your runtime exactly. Never use unofficial mirrors. The filename includes the game version (e.g. <code>f4se_0_06_23_fallout4_1_10_163_0.7z</code> for OG, or the NG equivalent).</>,
            },
            {
              id: 'get-address-lib',
              title: 'Download Address Library for F4SE (Nexus #47327)',
              details: <>Download the correct "All In One" bundle: OG bundle for game 1.10.163, or the Next-Gen file for 1.10.984+. Install through your mod manager. This is required by nearly every modern F4SE plugin and should be one of the first mods in your list.</>,
            },
            {
              id: 'get-mcm',
              title: 'Download MCM (Nexus #21497) — if any mod needs it',
              details: <>If any mod in your list mentions "MCM" or "Mod Configuration Menu", download it from Nexus #21497 and install through your mod manager. MCM requires a working F4SE install.</>,
            },
          ],
        },
        {
          id: 'install',
          title: 'Install / Configure',
          icon: Package,
          steps: [
            {
              id: 'install-f4se-core',
              title: 'Copy F4SE core files into Fallout 4 root directory',
              details: <>Extract the F4SE archive. Copy <code>f4se_loader.exe</code>, <code>f4se_steam_loader.dll</code>, <code>f4se_1_10_163.dll</code> (or the NG equivalent .dll) directly into the same folder as <code>Fallout4.exe</code>. Do NOT put them in the Data folder or through a mod manager. These are always a manual root install.</>,
            },
            {
              id: 'install-f4se-scripts',
              title: 'Copy F4SE Data folder contents through your mod manager',
              details: <>The F4SE archive also contains a <code>Data\Scripts\</code> sub-folder with Papyrus source files. Install those through {mm === 'mo2' ? 'MO2' : mm === 'vortex' ? 'Vortex' : 'your mod manager'} as a regular mod, or manually copy them into your game Data folder. They are needed for script compilation but NOT for launching the game.</>,
            },
            {
              id: 'launch-via-f4se',
              title: 'Always launch via f4se_loader.exe (not Fallout4.exe)',
              details: <>From this point on, launch Fallout 4 via <code>f4se_loader.exe</code> or via your mod manager's F4SE launcher entry — never directly through <code>Fallout4.exe</code> or the Steam launcher. F4SE will not be active if you bypass the loader, and any mod that requires it will silently fail or error.</>,
            },
            {
              id: 'install-plugins',
              title: '{installPathHint} — install F4SE plugin mods through your manager',
              details: <>{installPathHint} F4SE plugin mods (Address Library, MCM, HUDFramework, etc.) install normally through your mod manager and land in <code>Data\F4SE\Plugins\</code>.</>,
            },
          ],
        },
        {
          id: 'verify',
          title: 'Verify',
          icon: ShieldCheck,
          steps: [
            {
              id: 'check-version',
              title: 'Verify F4SE is active in-game',
              details: <>Launch via <code>f4se_loader.exe</code> and open the console (tilde key). Type <code>getf4seversion</code> — if F4SE is loaded you will see the version number. If you get nothing or an error, F4SE is not active. Common cause: launched via Fallout4.exe instead of f4se_loader.exe.</>,
            },
            {
              id: 'check-log',
              title: 'Check the F4SE log for plugin load errors',
              details: <>After launching, open <code>%APPDATA%\Local\Fallout4\F4SE\f4se.log</code>. Scroll to the bottom — any plugins that failed to load are listed with a reason. Common error: version mismatch between the plugin's expected runtime and your installed game version. Fix by updating the plugin or the game to match.</>,
            },
            {
              id: 'check-address-lib',
              title: 'Confirm Address Library is detected',
              details: <>Any mod that uses Address Library will fail or CTD if it is missing or the wrong variant. In the F4SE log or in-game, mods relying on Address Library log their dependency check. If you see "address library not found", confirm you installed the correct All-In-One variant for your game version from Nexus #47327.</>,
            },
          ],
        },
        {
          id: 'troubleshoot',
          title: 'Troubleshoot',
          icon: AlertCircle,
          steps: [
            {
              id: 'version-mismatch',
              title: 'F4SE fails to load — version mismatch',
              details: <>The most common F4SE failure. The loader .dll version and the game .exe version must match exactly. Check <code>f4se.log</code> for "is not the expected version" message. Fix: update F4SE from f4se.silverlock.org if you updated your game, or use Steam to revert your game to the compatible version.</>,
            },
            {
              id: 'steam-update',
              title: 'Steam auto-updated your game and broke F4SE',
              details: <>Steam can silently update Fallout 4 which breaks F4SE compatibility. To prevent this: right-click Fallout 4 in Steam → Properties → Updates → "Only update this game when I launch it" and always launch via <code>f4se_loader.exe</code> (not Steam). If already updated, wait for F4SE team to release a matching build (usually 1-2 weeks for major patches).</>,
            },
            {
              id: 'dll-error',
              title: 'Missing DLL or "failed to locate primary .dll"',
              details: <>Confirm <code>f4se_loader.exe</code>, <code>f4se_steam_loader.dll</code>, and the runtime-specific <code>f4se_1_10_XXX.dll</code> are all in the same folder as <code>Fallout4.exe</code>. If any file is missing, re-extract from the F4SE archive. Antivirus software sometimes quarantines F4SE DLLs — check your AV quarantine folder and add the Fallout 4 directory as an exclusion.</>,
            },
            {
              id: 'plugin-crashed',
              title: 'F4SE plugin crashes on load (plugin load error in f4se.log)',
              details: <>Each plugin in <code>Data\F4SE\Plugins\</code> targets a specific game runtime. If an F4SE plugin requires a different runtime version than your game, it will fail. Check the plugin's Nexus page for updated versions. If no update is available, the plugin is incompatible with your current game version — disable it until an update is released.</>,
            },
          ],
        },
      ];
    }

    if (state.topic === 'xedit') {
      return [
        {
          id: 'prereqs',
          title: t('installWizard.section.prereqs', 'Prereqs'),
          icon: Wrench,
          steps: [
            {
              id: 'mm',
              title: 'Choose your mod manager workflow',
              details: <>{modManagerBlurb}</>,
            },
            {
              id: 'backup',
              title: 'Back up your load order and plugins',
              details: <>Before touching conflicts or patches, back up your current mod list and plugins list. If you use MO2, export profiles. If you use Vortex, export/load order rules.</>,
            },
          ],
        },
        {
          id: 'download',
          title: t('installWizard.section.download', 'Download'),
          icon: Download,
          steps: [
            {
              id: 'get-xedit',
              title: 'Get xEdit / FO4Edit',
              details: <>Download from a trusted source (prefer official/upstream). Use the links section on this page. After download, unzip to a stable folder (avoid Desktop temporary paths).</>,
            },
          ],
        },
        {
          id: 'install',
          title: t('installWizard.section.installConfigure', 'Install / Configure'),
          icon: Hammer,
          steps: [
            {
              id: 'set-path',
              title: 'Point Mossy at your xEdit executable',
              details: <>Go to <Link className="text-blue-400 hover:underline" to="/settings/tools">External Tools Settings</Link> and set your xEdit/FO4Edit path so Mossy can launch it reliably.</>,
            },
            {
              id: 'run-first',
              title: 'Run xEdit once and let it initialize',
              details: <>Launch xEdit, select the plugins you want to work with, and wait for "Background Loader: finished". This makes sure scripts and caches are in place.</>,
            },
            {
              id: 'scripts-folder',
              title: 'Confirm "Edit Scripts" folder exists',
              details: <>xEdit loads scripts from an <b>Edit Scripts</b> folder near the executable. Mossy will save generated scripts there when your xEdit path is configured.</>,
            },
          ],
        },
        {
          id: 'verify',
          title: t('installWizard.section.verify', 'Verify'),
          icon: ShieldCheck,
          steps: [
            {
              id: 'apply-script',
              title: 'Verify scripts show up in "Apply Script"',
              details: <>Right-click a record → <b>Apply Script</b>. If a new script does not appear, restart xEdit (it reads scripts on startup).</>,
            },
          ],
        },
        {
          id: 'troubleshoot',
          title: t('installWizard.section.troubleshoot', 'Troubleshoot'),
          icon: AlertCircle,
          steps: [
            {
              id: 'missing-masters',
              title: 'If you see Missing Masters',
              details: <>Stop and fix your load order first. A patch built on missing masters will not load. Ensure all required mods are enabled and plugins are sorted correctly.</>,
            },
            {
              id: 'wrong-exe',
              title: 'If Mossy launches the wrong xEdit',
              details: <>Set the path in <Link className="text-blue-400 hover:underline" to="/settings/tools">External Tools Settings</Link>. That overrides detection and makes launching deterministic.</>,
            },
            {
              id: 'navmesh-find',
              title: 'Fix deleted navmesh — find [D] NAVM records',
              details: <>Deleted navmesh causes CTD and frozen NPCs. In xEdit, right-click the plugin → <b>Check for Errors</b>. Look for records labelled <b>[D] NAVM</b>. Note the FormID of each deleted record before you continue.</>,
            },
            {
              id: 'navmesh-fix',
              title: 'Fix deleted navmesh — Change FormID method',
              details: <>In the same cell, find the <em>new</em> NAVM record your mod added. Right-click it → <b>Change FormID</b> → paste the deleted record's FormID → accept <em>"Update all references?"</em>. Then remove the original <b>[D] NAVM</b> record. Re-run Check for Errors to confirm the fix. See <b>NAVMESH_FIX_GUIDE.md</b> for the full walkthrough.</>,
            },
            {
              id: 'navmesh-ck',
              title: 'Fix navmesh in the Creation Kit instead',
              details: <>Never delete a navmesh triangle outright in CK. Create a <em>new</em> triangle covering the same area first, <em>then</em> delete the old one. Always run <b>Navmesh → Finalize Cell Navmesh</b> before saving. Check borders with <b>Find Navmesh Errors</b>.</>,
            },
          ],
        },
      ];
    }

    if (state.topic === 'ss2') {
      return [
        {
          id: 'prereqs',
          title: t('installWizard.section.prereqs', 'Prereqs'),
          icon: Wrench,
          steps: [
            {
              id: 'manager',
              title: 'Choose a mod manager (recommended)',
              details: <>SS2 is best installed through a mod manager. {installPathHint}</>,
            },
            {
              id: 'readme',
              title: 'Open the dedicated SS2 learning path first',
              details: <>Go to <Link className="text-blue-400 hover:underline" to="/guides/mods/sim-settlements">SS2 Learning Path</Link> for the full beginner flow, or <Link className="text-blue-400 hover:underline" to="/guides-hub">Guides Hub</Link> to browse all 22 tutorial platforms, then return here for checklist verification.</>,
            },
            {
              id: 'requirements',
              title: 'Confirm required dependencies before add-ons',
              details: <>Install core SS2 requirements first (Sim Settlements 2 + Workshop Framework, and other dependencies listed on the active mod pages) before creator add-ons.</>,
            },
          ],
        },
        {
          id: 'download',
          title: t('installWizard.section.download', 'Download'),
          icon: Download,
          steps: [
            {
              id: 'ss2-files',
              title: 'Download SS2 + required dependencies first',
              details: <>Download SS2 and all required dependencies (and optional add-ons you want). Keep versions compatible with your Fallout 4 runtime.</>,
            },
            {
              id: 'ss2-toolkit',
              title: "Download Add-On Maker's Toolkit (Nexus #48521)",
              details: <>Install for step-by-step addon creation guides, helper resources, and beginner workflows.</>,
            },
            {
              id: 'ss2-wrk',
              title: 'Download Wasteland Reconstruction Kit (Nexus #48960)',
              details: <>Install if you are building city plans or prefab-heavy settlements and need the expanded SS2 build set.</>,
            },
            {
              id: 'ss2-contest',
              title: 'Download City Plan Contest Assistant (Nexus #50366)',
              details: <>Install for city plan contest workflows, automated setup tools, and monthly contest settlement helpers.</>,
            },
            {
              id: 'ss2-modschool',
              title: 'Open Mod School videos and SS2 wiki',
              details: <>Use the Mod School video links and wiki links in "Downloads & Sources" for beginner-friendly visual walkthroughs.</>,
            },
          ],
        },
        {
          id: 'install',
          title: t('installWizard.section.installConfigure', 'Install / Configure'),
          icon: Package,
          steps: [
            {
              id: 'install-mods',
              title: 'Install and enable in your manager',
              details: <>Install SS2 and dependencies. Then enable plugins and sort load order. If you use MO2, make sure archives are enabled if the mod ships BA2s.</>,
            },
            {
              id: 'install-order',
              title: 'Use this beginner-friendly install order',
              details: <>Core SS2 stack first, then Toolkit (#48521), then WRK (#48960), then Contest Assistant (#50366) if needed. This keeps setup clear and easy to troubleshoot.</>,
            },
            {
              id: 'plots',
              title: 'Plot building basics (first run)',
              details: <>In-game: confirm the SS2 HUD/holotape/menu appears. Then try placing a basic plot and ensure it upgrades/constructs as expected.</>,
            },
            {
              id: 'contest-updates',
              title: 'Contest Assistant monthly refresh check',
              details: <>If you use #50366 for contest work, update it on/after the 28th each month to get current contest settlement unlock behavior.</>,
            },
          ],
        },
        {
          id: 'verify',
          title: t('installWizard.section.verify', 'Verify'),
          icon: ShieldCheck,
          steps: [
            {
              id: 'in-game',
              title: 'Verify in-game SS2 initializes cleanly',
              details: <>Load a save (or new game) and check for missing textures/menus. If scripts are stuck, your dependencies/version mismatch is the first thing to check.</>,
            },
            {
              id: 'verify-tools',
              title: 'Verify creator tools are visible in your workflow',
              details: <>Confirm you can access toolkit docs (#48521), place WRK assets (#48960), and run contest helper holotape features (#50366) if installed.</>,
            },
          ],
        },
        {
          id: 'troubleshoot',
          title: t('installWizard.section.troubleshoot', 'Troubleshoot'),
          icon: AlertCircle,
          steps: [
            {
              id: 'version',
              title: "If SS2 won't start or menus are missing",
              details: <>Re-check dependencies and the Fallout 4 runtime version requirements. Then re-run your load order sorting and ensure plugins are enabled.</>,
            },
            {
              id: 'newbie-fallback',
              title: 'If overwhelmed: use the simplified learning path',
              details: <>Return to <Link className="text-blue-400 hover:underline" to="/guides/mods/sim-settlements">SS2 Learning Path</Link> and follow it top-to-bottom, one tool at a time.</>,
            },
          ],
        },
      ];
    }

    if (state.topic === 'prp') {
      return [
        {
          id: 'prereqs',
          title: t('installWizard.section.prereqs', 'Prereqs'),
          icon: Wrench,
          steps: [
            {
              id: 'understand',
              title: "Know what PRP and PJM's scripts affect",
              details: <>PRP (Previsibines Repair Pack) restores precombines/previs broken by popular mods. <b>PJM's Previs Patching Scripts</b> (Nexus #69978, by PJMail) let you find &amp; fix every flickering cell in your load order, create PRP-compatible patches, or add precombines to your own mod. Resolve all normal mod conflicts with standard patches <em>before</em> touching previs — previs patches are always the last step.</>,
            },
            {
              id: 'xedit-version',
              title: 'FO4Edit / xEdit V4.1.5f or later required',
              details: <>PJM's scripts require <b>FO4Edit64.exe (or FO4Edit.exe) V4.1.5f or later</b>. Use the GitHub upstream or the Nexus release — both are in the "Downloads &amp; Sources" panel. The 64-bit build is strongly recommended for large load orders.</>,
            },
            {
              id: 'ck-prereq',
              title: 'Fallout 4 Creation Kit (Steam) required',
              details: <>The CK is free on Steam. Install it into your <b>Fallout 4 directory</b> (same folder as <code>Fallout4.exe</code>). If you have downgraded your game to OG/pre-NG, you must also downgrade the CK to match — see PJM's FAQ post on Nexus #69978 for the exact procedure.</>,
            },
            {
              id: 'ckpe-prereq',
              title: 'CKPE V0.6 b639 or later required for Steam CK',
              details: <>CKPE (Creation Kit Platform Extended) is mandatory with the Steam CK and is an open-source platform of CK fixes/enhancements. Use <b>V0.6 b639 or later</b> on modern Steam CK setups. Requirements: <b>FO4 Creation Kit</b> + <b>Microsoft Visual C++ 2022 Redistributable (x64)</b>; CKPE supports CK <b>1.10.162.0+</b>. If CK is running alongside ENBSeries, use <code>ckpe_loader.exe</code> as recommended on the mod page. See the Downloads panel for the direct Nexus #51165 link. <em>Credit/source: CKPE by perchik71 (Nexus #51165), with contributor credits listed on that page including Nuukem, Darkfox127, and community testers.</em></>,
            },
            {
              id: 'pjmscripts-prereq',
              title: "PJMScripts V4.9 — manual download only, extract to FO4Edit directory",
              details: <>Go to <b>Nexus #69978</b> (link in the panel above) and manually download the <b>V4.9 PJMScripts bundle</b>. <em>Do NOT use a mod manager.</em> Extract so all <code>*.pas</code> scripts land in the <b>Edit Scripts</b> subdirectory inside your FO4Edit folder. Then grab every file under the "Updated Files" tab and overwrite the older copies — <code>FO4_CheckPrevisbines.pas</code> and <code>GeneratePrevisibines.bat</code> in particular are newer in that tab.</>,
            },
            {
              id: 'prp-load-order',
              title: 'PRP load order rules',
              details: <>Never use patches built for a different PRP version. Never place a mod with precombines after (below) PRP unless it was built for your exact PRP version or is a total replacer. All other mods go <em>before</em> PRP. Recommended order: (1) normal mods → (2) PRP + its patches → (3) PRP-compatible previsbine patches → (4) your final conflict-resolution patch → (5) cell-config restore patches (Lighting/Fog/Weather). Full rules and pre-built patch sources in <b>PJM_PREVIS_PATCHING_FAQ.md</b>.</>,
            },
          ],
        },
        {
          id: 'download',
          title: t('installWizard.section.download', 'Download'),
          icon: Download,
          steps: [
            {
              id: 'get-prp',
              title: 'Download PRP and the correct optional files',
              details: <>Use the links panel above. Grab the correct PRP main file plus any compatibility patches for your mod list (ELFX, SS2, etc. patches are separate optional files — only take the ones you need).</>,
            },
            {
              id: 'get-pjm',
              title: "Download PJM's scripts from Nexus #69978 (manual only)",
              details: <>On the PJM mod page click <b>Manual Download</b> for the <em>PJMScripts V4.9</em> archive — never use Vortex or MO2 to install it. After extracting, also download the updated <b>FO4_CheckPrevisbines.pas</b> and <b>GeneratePrevisibines.bat</b> from the "Updated Files" tab; they are newer than the copies inside the main kit. <em>Credit: PJM's Precombine - Previs Patching Scripts by PJMail — Nexus #69978.</em></>,
            },
            {
              id: 'get-ckpe',
              title: 'Download and install CKPE from Nexus',
              details: <>Use the direct <b>Nexus #51165</b> link in the panel. Install manually: (1) delete previous CKPE versions/libraries, (2) extract the zip into your Fallout 4 folder containing <code>CreationKit.exe</code>, (3) launch the Creation Kit. If you are on a downgraded (OG) game and need CKPE before V0.6, also convert BA2 archives to V1 via Collective Modding Toolkit and swap Interface/Shaders BA2s for OG versions — see PJM's FAQ for exact instructions. The CKPE page also links a Darkfox127 installation video reference. <em>Credit/source: Creation Kit Platform Extended by perchik71 (Nexus #51165).</em></>,
            },
          ],
        },
        {
          id: 'install',
          title: t('installWizard.section.installConfigure', 'Install / Configure'),
          icon: Package,
          steps: [
            {
              id: 'install-prp',
              title: 'Install PRP in your mod manager',
              details: <>Install, enable, and deploy PRP (Vortex) or ensure it is enabled (MO2). Sort load order — PRP usually sits late. Follow the author's README and any patch-specific notes.</>,
            },
            {
              id: 'patches',
              title: 'Install PRP compatibility patches',
              details: <>If you have settlement/worldspace mods or large overhauls, install the matching PRP compatibility patches. Missing patches cause broken previs, flickering geometry, and FPS issues.</>,
            },
            {
              id: 'extract-scripts',
              title: 'Extract PJMScripts into your FO4Edit directory',
              details: <>Unzip the PJMScripts archive so every <code>*.pas</code> file lands in <code>FO4Edit\Edit Scripts\</code>. Place <code>GeneratePrevisibines.bat</code> in the same folder as <code>FO4Edit64.exe</code>. Overwrite with the "Updated Files" versions of <code>FO4_CheckPrevisbines.pas</code> and <code>GeneratePrevisibines.bat</code>.</>,
            },
            {
              id: 'launcher-once',
              title: 'Run Fallout4Launcher.exe once, then exit immediately',
              details: <>Launch <code>Fallout4Launcher.exe</code> from your Fallout 4 directory and close it right away — do not start the game. This registers the game path so <code>GeneratePrevisibines.bat</code> can locate <code>Fallout4.exe</code>. If the bat still cannot find it, add the argument <code>"-FO4:ThePathToTheDirectoryContainingFallout4.exe"</code> (with quotes).</>,
            },
            {
              id: 'mo2-setup',
              title: state.modManager === 'mo2' ? 'Register executables in MO2 (AppID 1946160)' : 'Create steam_appid.txt (non-MO2)',
              details: state.modManager === 'mo2'
                ? <>In MO2 go to <b>Executables</b> and add both <code>FO4Edit64.exe</code> and <code>GeneratePrevisibines.bat</code>. For each, set the <b>AppID override</b> to <code>1946160</code> (the Steam ID for the Fallout 4 Creation Kit). Always launch them through MO2 so your full mod list is visible. Make sure Steam is running in the background before launching the bat.</>
                : <>Create a plain-text file named <code>steam_appid.txt</code> in the same folder as <code>FO4Edit64.exe</code>. The file should contain a single line: <code>1946160</code>. Make sure Steam is running in the background before you start <code>GeneratePrevisibines.bat</code> — Steam prompts will otherwise stall the build.</>,
            },
            {
              id: 'ckpe-toml',
              title: 'Configure CreationKitPlatformExtended.toml',
              details: <>Open <code>CreationKitPlatformExtended.toml</code> and follow its instructions, or replace it with a pre-configured copy from CKPE's Optional Files. If on a downgraded CK (before V0.6), also set <code>bOwnArchiveLoader=false</code> and <code>bBSPointerHandleExtremly=true</code> in <code>CreationKitPlatformExtended.ini</code>.</>,
            },
            {
              id: 'ckpe-faq',
              title: 'CKPE Official Troubleshooting FAQ — credit: Nuukem / perchik71 (Nexus #51165)',
              details: (
                <div className="space-y-3 text-sm">
                  <p className="italic text-yellow-400">All entries sourced from the official CKPE FAQ post on Nexus #51165 by Nuukem (perchik71). Full credits on the mod page: Nuukem, Darkfox127, pra, BenRierimanu, yarrmateys, muucow, and community testers.</p>
                  <div><b>P: CK doesn&apos;t start — memory problems.</b><br /><b>S:</b> Minimum 8 GB RAM required (at least 2 GB free at launch). Hardware released before 2010 may not meet this baseline. Some CK functions are unavailable below the threshold.</div>
                  <div><b>P: Log shows &quot;composite failed / Error Opening File Shaders&quot;; render window is black or red. (Not relevant CKPE v0.4+)</b><br /><b>S:</b> Your <code>Fallout4 - Shaders.ba2</code> is from a different game version (OG vs NG) than your editor. Match your CK version to your game version — they are not cross-compatible.</div>
                  <div><b>P: Load error V:0000065432 when opening CK through MO2.</b><br /><b>S:</b> MO2 issue — configure your startup via Steam directly (relevant for CK 1.10.162.0 Steam). Two Steam applications in the Fallout 4 root folder causes a conflict; launching directly through Steam resolves it.</div>
                  <div><b>P: Fatal error 0x5041524D.</b><br /><b>S:</b> Fix your Data folder — shorten file paths to loose files (keep under 260 characters including terminal zero; each <code>\</code> separator counts as two bytes). Pack loose files into an archive if needed. CK only reads from the Data folder — mod manager virtual mounts are ignored.</div>
                  <div><b>P: NPC face generation takes a very long time.</b><br /><b>S:</b> For fast DDS compression set <code>bD3D11Patch=true</code>. In CKPE v0.6+ this patch is mandatory and automatic — if issues persist, disable the iGPU. Face generation uses the GPU.</div>
                  <div><b>P: Cannot save a mod in CK. (Not relevant CKPE v0.4 build 625+)</b><br /><b>S:</b> Set <code>bAllowSaveESM=false</code> in your CKPE config.</div>
                  <div><b>P: Steam CK via MO2 does not see MO2&apos;s load order, or cannot save a new plugin.</b><br /><b>S:</b> For the &quot;Override Steam AppID&quot; field in MO2 use <code>1946160</code>. Other AppID values may let CK launch but will not expose the plugin list.</div>
                  <div><b>P: CK launch error — &quot;Can&apos;t find entry point&quot; or missing Steam API function.</b><br /><b>S:</b> See the CKPE GitHub page. This is a Steam Deck / new Steam API incompatibility — a workaround exists in the CKPE releases.</div>
                  <div><b>P: CK crashes to desktop in the Data window.</b><br /><b>S:</b> Launch the Creation Kit with <b>Administrator rights</b>. The crash originates in <code>comctrl32.dll</code> — antivirus blocking is also possible.</div>
                  <div><b>P: CK window does not fit on screen.</b><br /><b>S:</b> Full HD (1920×1080) monitor required. The CK is not adapted for DPI scaling above 100% — return Windows display scaling to 100% for the CK session.</div>
                  <div><b>P: Not all items from a location are loaded.</b><br /><b>S:</b> Default budgets are 177 MB (interiors) / 157 MB (exteriors). To raise to 512 MB, add to <code>CreationKit.ini</code>:<br /><code>[BudgetCaps]</code><br /><code>uLoadedAreaNonActorMemoryBudgetCap=536870912</code><br />Formula: N × 1024 × 1024.</div>
                </div>
              ),
            },
            {
              id: 'mo2-empty-mod',
              title: state.modManager === 'mo2' ? 'MO2: Create empty mod to receive generated files' : 'Non-MO2: keep Data/vis and Data/meshes/Precombined empty before each run',
              details: state.modManager === 'mo2'
                ? <>Create an <b>empty mod</b> in MO2, place it at the bottom of your load order, and activate it. For both <code>FO4Edit64.exe</code> and <code>GeneratePrevisibines.bat</code> executables, tick <b>"Create Files in Mod instead of Overwrite"</b> and set it to this empty mod. Without this, <code>GeneratePrevisbines.bat</code> will fail because MO2 intercepts the files it needs (including <code>xPrevisPatch.esp</code>). If a phase still fails due to MO2 file-moving delays, just re-run that phase.</>
                : <>Before every build run, confirm <code>Data/vis</code> and <code>Data/meshes/Precombined</code> are empty — the bat will error if loose previs or precombine files are found there.</>,
            },
          ],
        },
        {
          id: 'verify',
          title: t('installWizard.section.verify', 'Verify'),
          icon: ShieldCheck,
          steps: [
            {
              id: 'test',
              title: 'Test in a PRP-heavy area in-game',
              details: <>Load into an affected exterior cell and look for flickering geometry, objects popping, or severe FPS spikes. If present, a conflict or wrong PRP optional file is likely.</>,
            },
            {
              id: 'run-check',
              title: 'Run FO4Check_Previsbines.pas to find all conflicts',
              details: <>Launch <code>FO4Edit64.exe</code> with your full load order (via MO2 if applicable) and wait for the cache to finish. Right-click anywhere → <b>Apply Script…</b> → choose <b>FO4Check_Previsbines.pas</b> → OK. Select option <b>1) Fix all Cell Previs/config conflicts</b> → OK. This can take 1 hour or more. When the last line reads <em>"Generation Complete"</em>, exit xEdit saving and run <code>GeneratePrevisibines.bat</code>. The full batch build can take 6+ hours.</>,
            },
            {
              id: 'worldspace-browser',
              title: 'Optional: visualise conflicts with PrevisCheck.pas',
              details: <>Run the included <b>Worldspace browser with PrevisCheck.pas</b> in xEdit to see a cell-level map of which mods touch which cells and where they overlap. Right-click any cell for its details. Solid outlines = precombine files supplied; dashed slants = previs files supplied. Useful for identifying exactly which mods cause flickering before generating a full patch.</>,
            },
            {
              id: 'lighting-env-patch',
              title: 'Optional: fix overridden Lighting/Weather/Fog/Music — create a Cell Config patch',
              details: <>Mods that change Lighting, Fog, Ambient Music, Weather, or Location store those settings in CELL records — PRP and Previs patches often reset them to base game values. <b>Fix:</b> place all your Lighting/Weather/etc mods <em>before</em> PRP in your load order, then in xEdit right-click any mod → Apply Script → <b>FO4Check_Previsbines.pas</b> → option <b>"4) Fix only Cell Config Conflicts (Region/MHDT/Lighting/Weather/Fog etc)"</b>. Give the patch a name and click OK. Place the resulting patch at the very end of your load order, after all Previs mods. To create a patch for a single mod only (e.g. a PRP patch for ELFX/Ultra Interior Lighting), load only that mod and PRP in xEdit, right-click the mod → Run Script → FO4Check_Previsbines.pas → option 4 → "Only what you highlighted in xEdit". Full details and the list of all CELL/WRLD fields handled are in <b>PJM_LIGHTING_ENVIRONMENT_PATCHES.md</b>. Credit: PJMail, Nexus #69978.</>,
            },
          ],
        },
        {
          id: 'troubleshoot',
          title: t('installWizard.section.troubleshoot', 'Troubleshoot'),
          icon: AlertCircle,
          steps: [
            {
              id: 'conflicts',
              title: 'If you see flicker/pop-in after PRP',
              details: <>You likely have a mod editing the same cells without a PRP patch. Run <b>FO4Check_Previsbines.pas → option 1</b> to let PJM's script locate every conflict automatically, then create or install the appropriate compatibility patch.</>,
            },
            {
              id: 'bat-wont-run',
              title: "If GeneratePrevisibines.bat won't run — 'directories not empty'",
              details: <>The error "Precombine/Previs directories are not Empty" means your load order contains mods with <em>loose</em> previs files. These must be packed into BA2 archives before you can build a patch. Identify and fix those mods first, then re-run the bat.</>,
            },
            {
              id: 'restart-failed-step',
              title: 'How to restart GeneratePrevisibines.bat from a failed step',
              details: <>Re-run the bat with the same arguments. Use the same patch name. When prompted <em>"Plugin already exists, Use It? [Y], Exit [N], Continue from failed step [C]"</em> — press <b>C</b>. At <em>"Restart at step (1-8 or 0 to exit):"</em> press the number of the failed step. If prompted to clean a directory, press <b>Y</b>. The step re-runs and continues automatically on success. A completed run asks <em>"Remove working files [Y]?"</em> — press <b>Y</b>. The 4 resulting files are your previs patch; place them at the bottom of your load order.</>,
            },
            {
              id: 'bat-error-ref',
              title: 'GeneratePrevisibines.bat error message reference',
              details: <>Key error messages: <b>FO4Edit.exe cannot be found</b> — run FO4Edit once or place the bat in its directory. <b>CreationKit.exe cannot be found</b> — CK must be in the same folder as Fallout4.exe. <b>GeneratePrecombined ran out of Reference Handles</b> — set <code>iMaxUmbraBakeThreads</code> in CKPE .ini. <b>Archive2 failed</b> — too many files; use BSArchPro manually. Full error reference is in <b>PJM_PREVIS_PATCHING_FAQ.md</b> and on Nexus #69978.</>,
            },
            {
              id: 'ck-crash-access-violation',
              title: 'CK crashes with Access violation 0xC0000005 during Precombine build',
              details: <>This is the most common CK failure — caused by a corrupt or incompatible mesh on a Precombineable Reference (STAT or SCOL base type). <b>Step 1:</b> Check <code>CK.log</code> (in your CK directory) for the last <em>"DEFAULT: Generating for …"</em> line — that identifies the failing cell. <b>Step 2:</b> Open xEdit with just your patch mod, find that cell, note the other mods touching it (ignore base game, DLCs, UFO4P, PRP). Highlight those mods → right-click → Apply Script → <b>FO4FindNewPCStatics.pas</b>. If bad meshes are found (marked <code>!</code>), click "Exclude Bad?" and retry the Precombine phase. Credit: PJM's "Resolving Creation Kit Crashes" article, Nexus #69978.</>,
            },
            {
              id: 'ck-crash-no-start',
              title: "CK doesn't start or returns 'GeneratePrecombined failed' with an error code",
              details: <>If the CK doesn't start at all, the problem is your PC setup, not a mod. Verify <code>steam_appid.txt</code> is present with <code>1946160</code>; verify CKPE is installed and <code>.toml</code> is configured; if using MO2, confirm FO4Edit and GeneratePrevisibines.bat are registered as Executables with the correct AppID. If you get a numeric exit code like <em>-1073741819</em>, convert to hex (e.g. 0xC0000005 = Access Violation) and search "windows error 0xHHHHHHHH". Error -1073740771 / 0xC000041D at end of a CK phase can be ignored if the CK saved successfully beforehand.</>,
            },
            {
              id: 'ck-crash-mesh-replacer',
              title: 'CK still crashes after FO4FindNewPCStatics — mesh or texture replacer suspected',
              details: <><b>Mesh replacers</b> (HD model mods) don't add Cell overrides, so they won't appear in the initial scan. Load xEdit with only your patch mod, select ALL other mods, and run <b>FO4FindNewPCStatics.pas</b> against everything. If nothing is found, suspect a <b>texture replacer</b>: temporarily disable all mods containing <code>- Textures.BA2</code> or loose <code>.dds</code> files, recreate your patch, and retry. Re-enable texture mods one at a time to isolate the culprit. Note: texture mods do not need to be enabled during precombine generation.</>,
            },
            {
              id: 'ck-crash-single-cell',
              title: 'Speed up fault-finding: test a single cell only',
              details: <>Instead of a full precombine build each time, generate a single-cell test patch. Load your full load order in xEdit, find the failing cell by FormID (exterior) or EditorID (interior), right-click it → Apply Script → <b>FO4Check_Previsbines.pas</b> → choose "Build new Precomb/Previs …" AND tick "Only what you highlighted in xEdit". This produces a small <code>xPrevisPatch.esp</code> to feed to GeneratePrevisibines.bat just for that one cell.</>,
            },
            {
              id: 'manual-exclude-refr',
              title: 'Manually exclude a Reference from being Precombined',
              details: <>FO4Check_Previsbines.pas and FO4FindNewPCStatics.pas do this automatically. To do it by hand: find the REFR in xEdit and set its <b>XLRT — Location Ref Type</b> to <code>NoObjectCombinationRefType</code>. To exclude every reference sharing the same base object, find the base record (NAME — Base) and set its <b>FTYP — Force Loc Ref Type</b> to <code>NoObjectCombinationRefType</code>. Credit: PJM's "Resolving Creation Kit Crashes" article, Nexus #69978 (PJMail, Jun 2025).</>,
            },
            {
              id: 'faq',
              title: "If any step didn't complete — read PJM's FAQ and Deep Dive",
              details: <>Read the stickied <b>FAQ Post</b> and the <b>Previsbines Deep Dive</b> article on the PJM mod page (Nexus #69978). The Deep Dive is the most complete and current resource for everything precombines/previs (updated 2026). All scripts and documentation credit: PJMail.</>,
            },
          ],
        },
      ];
    }

    // patching
    if (state.topic === 'patching') {
      return [
        {
          id: 'prereqs',
          title: t('installWizard.section.prereqs', 'Prereqs'),
          icon: Wrench,
          steps: [
            {
              id: 'goal',
              title: 'Define what you are patching',
              details: <>Patching means deciding which mod "wins" for specific records. Be specific: leveled lists? worldspace edits? weapon stats? SS2/PRP conflicts?</>,
            },
            {
              id: 'scan-first',
              title: 'Scan the mod in the Auditor before patching',
              details: <>Upload the plugin's ESP/ESM in Mossy's <b>Auditor</b> tab first. Fix any <em>Deleted Navmesh (CTD Risk)</em> or missing-master errors before you build a patch — a patch on a broken plugin will inherit the same problems. Use the xEdit troubleshoot steps above if navmesh errors appear.</>,
            },
            {
              id: 'install-check',
              title: 'Verify the mod is correctly installed',
              details: <>In your mod manager, confirm the plugin is enabled and active. Run <b>LOOT</b> to sort load order and check for warnings. If the mod requires F4SE, confirm your F4SE version matches your game runtime (F4SE 0.7.7 for runtime 1.11.x).</>,
            },
          ],
        },
        {
          id: 'download',
          title: t('installWizard.section.download', 'Download'),
          icon: Download,
          steps: [
            {
              id: 'xedit',
              title: 'Ensure xEdit is installed and configured',
              details: <>Most patching workflows depend on xEdit. If you haven't done the xEdit wizard steps, do those first.</>,
            },
          ],
        },
        {
          id: 'install',
          title: t('installWizard.section.buildPatch', 'Build the patch'),
          icon: GitBranch,
          steps: [
            {
              id: 'create-plugin',
              title: 'Create a new patch plugin (ESP/ESL where appropriate)',
              details: <>In xEdit: right-click → <b>Other</b> → <b>Create Empty Plugin</b> (or equivalent), then add overrides into your patch.</>,
            },
            {
              id: 'copy-records',
              title: 'Copy records as override into your patch',
              details: <>For each conflict: copy the winning record into your patch, then edit values to reflect your intended combined behavior.</>,
            },
          ],
        },
        {
          id: 'verify',
          title: t('installWizard.section.verify', 'Verify'),
          icon: ShieldCheck,
          steps: [
            {
              id: 'loadorder',
              title: 'Place the patch late in load order',
              details: <>Your patch must load after the mods it is patching. Then test in-game and confirm the behavior change is present.</>,
            },
            {
              id: 'stability',
              title: 'Confirm stability — run CLASSIC if you get a CTD',
              details: <>If the game crashes after installing your patch, open the crash log at <code>%LOCALAPPDATA%\Fallout4\F4SE\</code> (written by Addictol, Nexus #84214) and run <b>CLASSIC</b> (Nexus #56255) on it. CLASSIC covers 250+ crash scenarios and will pinpoint missing masters, DLL version mismatches, or navmesh issues.</>,
            },
          ],
        },
        {
          id: 'troubleshoot',
          title: t('installWizard.section.troubleshoot', 'Troubleshoot'),
          icon: AlertCircle,
          steps: [
            {
              id: 'esl',
              title: 'If your patch won\'t load',
              details: <>Check for missing masters, bad ESL flags, or incorrect load order. Fix those before continuing.</>,
            },
            {
              id: 'ctd-after-patch',
              title: 'If the game CTDs in the patched area',
              details: <>Run CLASSIC on the crash log first. If it points to a NAVM error, use the xEdit topic's navmesh fix steps (Change FormID method). If it points to a DLL version mismatch, update that mod to the build matching your game runtime.</>,
            },
          ],
        },
      ];
    }
  }, [state.modManager, state.topic, t]) ?? [];

  const topicMeta = {
    f4se: {
      title: 'F4SE — Script Extender Setup',
      subtitle: 'Critical prerequisite. Install F4SE, Address Library, and MCM before any scripted mod.',
    },
    xedit: {
      title: t('installWizard.topic.xedit.title', 'xEdit / FO4Edit Setup'),
      subtitle: t('installWizard.topic.xedit.subtitle', 'Install, configure, and verify xEdit so you can patch safely.'),
    },
    ss2: {
      title: t('installWizard.topic.ss2.title', 'Sim Settlements 2 Setup'),
      subtitle: t('installWizard.topic.ss2.subtitle', 'Dependencies + install + basic verification for plot building.'),
    },
    prp: {
      title: t('installWizard.topic.prp.title', 'PRP + PJM Previs Scripts Setup'),
      subtitle: t('installWizard.topic.prp.subtitle', 'Precombines/previs install with conflict-aware verification — including PJM\'s Previs Patching Scripts (Nexus #69978) by PJMail.'),
    },
    patching: {
      title: t('installWizard.topic.patching.title', 'Patch Building'),
      subtitle: t('installWizard.topic.patching.subtitle', 'A safe, repeatable workflow for building compatibility patches.'),
    },
  } as const;

  const activeMeta = topicMeta[state.topic];
  const topicOptions: Array<{ id: InstallWizardTopic; label: string }> = [
    { id: 'f4se', label: 'F4SE (Script Extender)' },
    { id: 'xedit', label: t('installWizard.topicSelector.xedit', 'xEdit / FO4Edit') },
    { id: 'ss2', label: t('installWizard.topicSelector.ss2', 'Sim Settlements 2') },
    { id: 'prp', label: t('installWizard.topicSelector.prp', 'PRP (Previs/Precombine)') },
    { id: 'patching', label: t('installWizard.topicSelector.patching', 'Build Patches') },
  ];
  const modManagerOptions: Array<{ id: 'mo2' | 'vortex' | 'manual'; label: string }> = [
    { id: 'mo2', label: 'MO2' },
    { id: 'vortex', label: 'Vortex' },
    { id: 'manual', label: 'Manual' },
  ];

  const containerClassName = embedded
    ? 'p-4 bg-[#0a0e0a] text-slate-100'
    : 'min-h-full p-6 md:p-10 bg-[#0a0e0a] text-slate-100';

  return (
    <div className={containerClassName}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">{t('installWizard.tagline', 'Mossy Tutor - Install Wizard')}</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-2">{activeMeta.title}</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">{activeMeta.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            {!embedded && (
              <Link
                to="/reference"
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
                title={t('installWizard.actions.helpTitle', 'Open help')}
              >
                Help
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setState(DEFAULT_STATE);
              }}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-red-900/20 border border-red-500/30 text-red-200 hover:bg-red-900/30 transition-colors"
              title={t('installWizard.actions.resetTitle', 'Reset wizard progress')}
            >
              {t('installWizard.actions.reset', 'Reset')}
            </button>
          </div>
        </div>

        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description={t(
            'installWizard.verifyPanel.description',
            'This wizard is designed to avoid missing prerequisites: it links to official sources or stable search pages and gives you a minimal verification loop.'
          )}
          tools={[
            { label: 'xEdit upstream (GitHub repo)', href: 'https://github.com/TES5Edit/TES5Edit', kind: 'official', note: 'Primary upstream for xEdit/FO4Edit.' },
            { label: 'Nexus search: FO4Edit', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods', kind: 'search' },
            { label: 'Steam search: Fallout 4 Creation Kit', href: 'https://store.steampowered.com/search/?term=Fallout%204%20Creation%20Kit', kind: 'search', note: 'Use Steam search to find the official listing.' },
            { label: 'Nexus search: PRP', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=PRP&gsearchtype=mods', kind: 'search' },
            { label: 'Sim Settlements 2 (official site)', href: 'https://simsettlements2.com', kind: 'official' },
            { label: "SS2 Add-On Maker's Toolkit (#48521)", href: 'https://www.nexusmods.com/fallout4/mods/48521', kind: 'official' },
            { label: 'Wasteland Reconstruction Kit (#48960)', href: 'https://www.nexusmods.com/fallout4/mods/48960', kind: 'official' },
            { label: 'City Plan Contest Assistant (#50366)', href: 'https://www.nexusmods.com/fallout4/mods/50366', kind: 'official' },
            { label: 'SS2 Wiki Tutorials', href: 'https://wiki.simsettlements2.com', kind: 'docs' },
            { label: 'SS2 Mod School Videos', href: 'https://www.youtube.com/results?search_query=Bethesda+Mod+School+Sim+Settlements+2', kind: 'docs' },
          ]}
          verify={[
            t('installWizard.verifyPanel.verify.0', 'Pick a topic and confirm the checklist renders and checkboxes persist after refresh.'),
            t('installWizard.verifyPanel.verify.1', 'Open at least one link from "Trusted links" and confirm it opens via openExternal/window.open.'),
            t('installWizard.verifyPanel.verify.2', 'Use "Send to Chat" and confirm the checklist is copied and prefilled in Chat.'),
          ]}
          firstTestLoop={[
            t('installWizard.verifyPanel.firstTestLoop.0', 'Start with "xEdit / FO4Edit" and get one clean launch first.'),
            t('installWizard.verifyPanel.firstTestLoop.1', 'Configure your mod manager choice, then complete only the minimal "verify" steps before expanding.'),
          ]}
          troubleshooting={[
            t('installWizard.verifyPanel.troubleshooting.0', 'If links do not open, check Diagnostics and confirm openExternal is available (desktop app) or allow popups.'),
            t('installWizard.verifyPanel.troubleshooting.1', 'If checkbox state does not persist, verify localStorage is available (see Diagnostics).'),
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Topic selector */}
          <div className="rounded-xl border border-slate-800 bg-black/40 p-4 space-y-3">
            <div className="text-xs font-black tracking-widest uppercase text-slate-400">{t('installWizard.topics', 'Topics')}</div>
            {topicOptions.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setState((s) => ({ ...s, topic: topic.id }))}
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${state.topic === topic.id
                    ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
              >
                {topic.label}
              </button>
            ))}

            <div className="pt-3 border-t border-slate-800">
              <div className="text-xs font-black tracking-widest uppercase text-slate-400 mb-2">{t('installWizard.modManager', 'Mod Manager')}</div>
              <div className="flex gap-2">
                {modManagerOptions.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setState((s) => ({ ...s, modManager: m.id }))}
                    className={`flex-1 px-2 py-2 rounded-lg border text-[11px] font-black transition-colors ${state.modManager === m.id
                        ? 'bg-blue-900/30 border-blue-500/40 text-blue-200'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-xs font-black tracking-widest uppercase text-slate-400">{t('installWizard.shortcuts.title', 'Shortcuts')}</div>
              <div className="text-[11px] text-slate-500">
                Use the sidebar to open related guides or settings if you need them during setup.
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Links panel */}
            <div className="rounded-xl border border-slate-800 bg-black/40 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-black tracking-widest uppercase text-slate-400">{t('installWizard.downloadsSources', 'Downloads & Sources')}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{t('installWizard.downloadsSourcesHelp', 'Shows trusted sources and any direct URLs found inside your local Knowledge Vault.')}</div>
                </div>
                <button
                  type="button"
                  onClick={refreshVault}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs font-bold text-slate-200 hover:border-slate-600 transition-colors"
                  title={t('installWizard.refreshTitle', 'Refresh links')}
                >
                  <RefreshCcw className="w-4 h-4" />
                  {t('installWizard.refresh', 'Refresh')}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {installWizardBuiltInLinks[state.topic].map((l) => (
                  <button
                    key={l.url}
                    type="button"
        
                    onClick={() => openUrl(l.url)}
                    className="group text-left w-full p-3 rounded-lg border border-slate-800 bg-slate-900/40 hover:border-emerald-500/40 hover:bg-emerald-900/10 transition-colors"
                    title={l.url}
                  >
                    <div className="flex items-start gap-2">
                      <ExternalLink className="w-3 h-3 mt-0.5 text-emerald-400/60 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-200 truncate">{l.label}</div>
                        {l.note && <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{l.note}</div>}
                        <div className="text-[10px] text-emerald-500/60 mt-1 truncate">{l.url}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {vaultLinks.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2">{t('installWizard.fromVault', 'From Your Knowledge Vault')}</div>
                  <div className="flex flex-wrap gap-2">
                    {vaultLinks.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => openUrl(url)}
                        title={url}
                        className="text-[10px] px-2 py-1 rounded border border-slate-700 bg-slate-900/40 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200 transition-colors truncate max-w-[280px]"
                      >
                        {url.replace(/^https?:\/\//, '')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Checklist sections */}
            {sections.map((section) => {
              const sectionCompleted = section.steps.filter((s) => isChecked(state.topic, section.id, s.id)).length;
              const SectionIcon = section.icon;
              return (
                <div key={section.id} className="rounded-xl border border-slate-800 bg-black/40 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <SectionIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-white tracking-tight">{section.title}</div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 shrink-0">
                      {sectionCompleted}/{section.steps.length}
                    </div>
                    {sectionCompleted === section.steps.length && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <div className="space-y-3">
                    {section.steps.map((step) => (
                      <StepRow
                        key={step.id}
                        checked={isChecked(state.topic, section.id, step.id)}
                        onToggle={() => toggleChecked(state.topic, section.id, step.id)}
                        title={step.title}
                      >
                        {step.details}
                      </StepRow>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Knowledge Vault management */}
            <div className="rounded-xl border border-slate-700 bg-black/40 p-5">
              <div className="flex items-center gap-3 mb-4">
                <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <div className="text-xs font-black tracking-widest uppercase text-slate-400">{t('installWizard.vault.title', 'Knowledge Vault')}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t('installWizard.vault.subtitle', 'Import URLs and notes from your vault to surface relevant links above.')}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-700 text-xs font-bold text-slate-200 hover:border-slate-500 transition-colors">
                  <ArrowDownToLine className="w-3 h-3" />
                  {vaultImportBusy ? t('installWizard.vault.importing', 'Importing…') : t('installWizard.vault.importJson', 'Import JSON')}
                  <input type="file" accept=".json" className="sr-only" onChange={handleVaultFile} disabled={vaultImportBusy} />
                </label>

                <button
                  type="button"
                  onClick={loadBundledVault}
                  disabled={vaultImportBusy}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-700 text-xs font-bold text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-50"
                >
                  <Package className="w-3 h-3" />
                  {t('installWizard.vault.loadBundled', 'Load Bundled Vault')}
                </button>

                {lastDownloadPath && (
                  <button
                    type="button"
                    onClick={() => revealPath(lastDownloadPath)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-700 text-xs font-bold text-slate-200 hover:border-slate-500 transition-colors"
                  >
                    <FolderOpen className="w-3 h-3" />
                    {t('installWizard.vault.openDownloads', 'Open Last Download Location')}
                  </button>
                )}
              </div>

              {vaultImportStatus && (
                <div className="mt-3 text-[11px] text-slate-300 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700">
                  {vaultImportStatus}
                </div>
              )}

              {vault.length > 0 && (
                <div className="mt-3 text-[10px] text-slate-500">
                  {vault.length} {t('installWizard.vault.count', 'items in vault')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallWizard;
