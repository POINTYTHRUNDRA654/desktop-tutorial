import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, FolderOpen, Hammer, Wrench, ShieldCheck, ArrowDownToLine, RefreshCcw, AlertCircle, Package, GitBranch, Search, Download } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useI18n } from './i18n';
import { openExternal } from './utils/openExternal';

type WizardTopic = 'xedit' | 'ss2' | 'prp' | 'patching';

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
  topic: WizardTopic;
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

const topicKeywords: Record<WizardTopic, string[]> = {
  xedit: ['xedit', 'fo4edit', 'apply script', 'edit scripts', 'conflict', 'override'],
  ss2: ['ss2', 'sim settlements 2', 'plot', 'plot building', 'city plan', 'workshop framework'],
  prp: ['prp', 'previs', 'precombine', 'previsibines repair pack', 'optimization'],
  patching: ['patch', 'patches', 'conflict', 'load order', 'merge', 'override', 'xedit'],
};

const builtInLinks: Record<WizardTopic, Array<{ label: string; url: string; note?: string }>> = {
  xedit: [
    { label: 'xEdit (GitHub repository)', url: 'https://github.com/TES5Edit/TES5Edit', note: 'Primary upstream source for xEdit/FO4Edit builds.' },
  ],
  ss2: [
    { label: 'Sim Settlements 2 (official site)', url: 'https://simsettlements2.com', note: 'Official hub; downloads are typically linked from there.' },
    { label: 'Nexus search: Sim Settlements 2', url: 'https://www.nexusmods.com/fallout4/search/?gsearch=Sim%20Settlements%202&gsearchtype=mods', note: 'Search results in case you install via Nexus.' },
  ],
  prp: [
    { label: 'Nexus search: PRP', url: 'https://www.nexusmods.com/fallout4/search/?gsearch=PRP&gsearchtype=mods', note: 'Search for “Previsibines Repair Pack (PRP)”.' },
    { label: 'Nexus search: Previsibines Repair Pack', url: 'https://www.nexusmods.com/fallout4/search/?gsearch=Previsibines%20Repair%20Pack&gsearchtype=mods' },
  ],
  patching: [
    { label: 'Nexus search: xEdit scripts', url: 'https://www.nexusmods.com/fallout4/search/?gsearch=xEdit%20script&gsearchtype=mods', note: 'Useful for automation scripts and helpers.' },
  ],
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
      if (!Array.isArray(parsed)) {
        setVaultImportStatus('Import failed: JSON must be an array of items.');
        return;
      }
      const normalized = normalizeVaultItems(parsed);
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
      const resp = await fetch('/knowledge/seed-vault.json', { cache: 'no-cache' });
      if (!resp.ok) {
        setVaultImportStatus('Bundled vault not found.');
        return;
      }
      const text = await resp.text();
      await importVaultJson(text);
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

  const toggleChecked = (topic: WizardTopic, sectionId: string, stepId: string) => {
    const key = `${topic}:${sectionId}:${stepId}`;
    setState((s) => ({
      ...s,
      checked: { ...s.checked, [key]: !s.checked[key] },
    }));
  };

  const isChecked = (topic: WizardTopic, sectionId: string, stepId: string) => {
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
      ? 'MO2: install via “Install a new mod from an archive” and keep it enabled in the left pane; plugins in right pane.'
      : mm === 'vortex'
      ? 'Vortex: install from file, enable, deploy, then check Plugins page for enabled state.'
      : 'Manual: copy into Fallout 4 Data folder only when you know exactly what files are overwriting.';

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
              details: <>Launch xEdit, select the plugins you want to work with, and wait for “Background Loader: finished”. This makes sure scripts and caches are in place.</>,
            },
            {
              id: 'scripts-folder',
              title: 'Confirm “Edit Scripts” folder exists',
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
              title: 'Verify scripts show up in “Apply Script”',
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
              title: 'Find the SS2 requirements list',
              details: <>SS2 has required dependencies. Use the links section below (from your Knowledge Vault, if present) or the official site to confirm the current required mods for your SS2 version.</>,
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
              title: 'Download SS2 + required dependencies',
              details: <>Download SS2 and all required dependencies (and optional add-ons you want). Keep versions compatible with your Fallout 4 runtime.</>,
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
              id: 'plots',
              title: 'Plot building basics (first run)',
              details: <>In-game: confirm the SS2 HUD/holotape/menu appears. Then try placing a basic plot and ensure it upgrades/constructs as expected.</>,
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
          ],
        },
        {
          id: 'troubleshoot',
          title: t('installWizard.section.troubleshoot', 'Troubleshoot'),
          icon: AlertCircle,
          steps: [
            {
              id: 'version',
              title: 'If SS2 won’t start or menus are missing',
              details: <>Re-check dependencies and the Fallout 4 runtime version requirements. Then re-run your load order sorting and ensure plugins are enabled.</>,
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
              title: 'Know what PRP affects',
              details: <>PRP affects precombines/previs. It can conflict with mods that edit worldspaces/cells. Plan your load order and patch strategy before installing.</>,
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
              details: <>Use the links section below. Make sure you grab the correct main file plus any compatibility patches relevant to your mod list.</>,
            },
          ],
        },
        {
          id: 'install',
          title: t('installWizard.section.installConfigure', 'Install / Configure'),
          icon: Package,
          steps: [
            {
              id: 'install',
              title: 'Install PRP in your mod manager',
              details: <>Install, enable, deploy (Vortex) / ensure enabled (MO2). Then sort load order. PRP often wants to be late, but follow the author’s guidance.</>,
            },
            {
              id: 'patches',
              title: 'Install PRP compatibility patches',
              details: <>If you have settlement/worldspace mods or big overhauls, install the PRP compatibility patches that match them. Missing patches can cause broken previs, flicker, or performance issues.</>,
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
              title: 'Test in a PRP-heavy area',
              details: <>Load into an affected exterior cell and look for: flickering geometry, objects popping, or severe performance spikes. If present, a conflict or wrong PRP option is likely.</>,
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
              details: <>You likely have a mod editing the same cells without a PRP patch. Identify the conflicting plugin and install/create a compatibility patch. Mossy can help you find conflicts in xEdit.</>,
            },
          ],
        },
      ];
    }

    // patching
    return [
      {
        id: 'prereqs',
        title: t('installWizard.section.prereqs', 'Prereqs'),
        icon: Wrench,
        steps: [
          {
            id: 'goal',
            title: 'Define what you are patching',
            details: <>Patching means deciding which mod “wins” for specific records. Be specific: leveled lists? worldspace edits? weapon stats? SS2/PRP conflicts?</>,
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
            details: <>Most patching workflows depend on xEdit. If you haven’t done the xEdit wizard steps, do those first.</>,
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
        ],
      },
      {
        id: 'troubleshoot',
        title: t('installWizard.section.troubleshoot', 'Troubleshoot'),
        icon: AlertCircle,
        steps: [
          {
            id: 'esl',
            title: 'If your patch won’t load',
            details: <>Check for missing masters, bad ESL flags, or incorrect load order. Fix those before continuing.</>,
          },
        ],
      },
    ];
  }, [state.modManager, state.topic, t]);

  const topicMeta = {
    xedit: {
      title: t('installWizard.topic.xedit.title', 'xEdit / FO4Edit Setup'),
      subtitle: t('installWizard.topic.xedit.subtitle', 'Install, configure, and verify xEdit so you can patch safely.'),
    },
    ss2: {
      title: t('installWizard.topic.ss2.title', 'Sim Settlements 2 Setup'),
      subtitle: t('installWizard.topic.ss2.subtitle', 'Dependencies + install + basic verification for plot building.'),
    },
    prp: {
      title: t('installWizard.topic.prp.title', 'PRP Setup'),
      subtitle: t('installWizard.topic.prp.subtitle', 'Precombines/previs install with conflict-aware verification.'),
    },
    patching: {
      title: t('installWizard.topic.patching.title', 'Patch Building'),
      subtitle: t('installWizard.topic.patching.subtitle', 'A safe, repeatable workflow for building compatibility patches.'),
    },
  } as const;

  const activeMeta = topicMeta[state.topic];
  const topicOptions: Array<{ id: WizardTopic; label: string }> = [
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
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
                  state.topic === topic.id
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
                    className={`flex-1 px-2 py-2 rounded-lg border text-[11px] font-black transition-colors ${
                      state.modManager === m.id
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
                {builtInLinks[state.topic].map((l) => (
                  <button
                    key={l.url}
                    type="button"
                    onClick={() => openUrl(l.url)}
                    className="text-left rounded-lg border border-slate-800 bg-slate-900/20 hover:border-slate-600 p-3 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">{l.label}</div>
                        <div className="text-[10px] text-slate-500 truncate">{l.url}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </div>
                    {l.note && <div className="mt-2 text-[11px] text-slate-400">{l.note}</div>}
                  </button>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs font-black tracking-widest uppercase text-slate-400">{t('installWizard.fromVault', 'From your Knowledge Vault')}</div>
                  <div className="text-[11px] text-slate-500">{t('installWizard.openVault', 'Open Memory Vault')}</div>
                </div>

                {vaultLinks.length === 0 ? (
                  <div className="mt-2 text-[11px] text-slate-400">
                    No direct URLs found for this topic in your local Vault yet. If you’ve saved guides with links, add them to the Vault so Mossy can cite them.
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openUrl(`https://www.nexusmods.com/fallout4/search/?gsearch=${encodeURIComponent(state.topic)}&gsearchtype=mods`)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-900/20 border border-blue-500/30 text-blue-200 text-xs font-bold hover:bg-blue-900/30 transition-colors"
                      >
                        <Search className="w-4 h-4" />
                        {t('installWizard.searchNexus', 'Search Nexus')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vaultLinks.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => openUrl(u)}
                        className="text-left rounded-lg border border-emerald-500/20 bg-emerald-900/10 hover:border-emerald-400/30 p-3 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-black text-emerald-100 truncate">{t('installWizard.vaultLink', 'Vault link')}</div>
                            <div className="text-[10px] text-emerald-200/60 truncate">{u}</div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-emerald-300" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-black/40 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-black tracking-widest uppercase text-slate-400">Optional: Knowledge Vault Import</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Import a Mossy Vault JSON export (from Memory Vault) or load the bundled vault. This does not include app scan data.
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">Current items: {vault.length}</div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs font-bold text-slate-200 hover:border-slate-600 transition-colors cursor-pointer">
                  <ArrowDownToLine className="w-4 h-4" />
                  Import JSON
                  <input type="file" accept="application/json" onChange={handleVaultFile} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={loadBundledVault}
                  disabled={vaultImportBusy}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 text-xs font-bold hover:bg-emerald-900/30 transition-colors disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  Load bundled vault
                </button>
                <div className="text-[11px] text-slate-500">Open Memory Vault from the sidebar if you need to manage items.</div>
              </div>
              {vaultImportStatus && (
                <div className="mt-3 text-[11px] text-slate-300">{vaultImportStatus}</div>
              )}
            </div>

            {/* Steps */}
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.id} className="rounded-xl border border-slate-800 bg-black/40 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <section.icon className="w-5 h-5 text-emerald-300" />
                    <div className="text-sm font-black tracking-widest uppercase text-slate-200">{section.title}</div>
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
              ))}
            </div>

            {/* Tip: saved scripts location */}
            <div className="rounded-xl border border-slate-800 bg-black/40 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black tracking-widest uppercase text-slate-400">{t('installWizard.tutorTip', 'Tutor Tip')}</div>
                  <div className="mt-2 text-[11px] text-slate-300 leading-relaxed">
                    When Mossy generates scripts (Papyrus / xEdit / Blender), she saves a real file and includes a <b>Saved:</b> path in the chat.
                    Use the <b>Open folder</b> button in chat to jump straight to it.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const downloads = (localStorage.getItem('mossy_last_download_path') || '').trim();
                    if (downloads) revealPath(downloads);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs font-bold text-slate-200 hover:border-slate-600 transition-colors"
                  title={t('installWizard.openLastLocationTitle', '(Optional) Open last saved location if available')}
                >
                  <FolderOpen className="w-4 h-4" />
                  {t('installWizard.openLastLocation', 'Open last location')}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallWizard;
