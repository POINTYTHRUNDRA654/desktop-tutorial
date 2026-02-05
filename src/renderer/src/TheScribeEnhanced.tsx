import React, { useEffect, useMemo, useState } from 'react';
import { Code, FileCode, Palette, Check, X, AlertTriangle, Zap, Copy, Play, BookOpen, Save, Trash2, Upload, ArrowDownToLine, Info, Search, ExternalLink } from 'lucide-react';
import ProjectWizard from './components/ProjectWizard';
import type { ScriptBundle, ScriptTemplate, Settings } from '../../shared/types';
import { useNavigate } from 'react-router-dom';

type ScriptType = 'papyrus' | 'xedit' | 'blender';

interface ValidationError {
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export const TheScribe: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ScriptType>('papyrus');
  const [code, setCode] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [launching, setLaunching] = useState(false);
  const [toolVersion, setToolVersion] = useState('');

  const [xeditLibrary, setXeditLibrary] = useState<ScriptTemplate[]>([]);
  const [blenderLibrary, setBlenderLibrary] = useState<ScriptTemplate[]>([]);
  const [librarySelectedId, setLibrarySelectedId] = useState<string>('');
  const [libraryTitle, setLibraryTitle] = useState<string>('');
  const [libraryAuthor, setLibraryAuthor] = useState<string>('');
  const [libraryDescription, setLibraryDescription] = useState<string>('');
  const [libraryImportText, setLibraryImportText] = useState<string>('');
  const [libraryStatus, setLibraryStatus] = useState<string>('');

  const [runningScript, setRunningScript] = useState(false);
  const [runStatus, setRunStatus] = useState<string>('');
  const [runOutput, setRunOutput] = useState<string>('');

  const [xeditScriptStatus, setXeditScriptStatus] = useState<string>('');

  const [scriptBundles, setScriptBundles] = useState<ScriptBundle[]>([]);
  const [bundleSelectedId, setBundleSelectedId] = useState<string>('');
  const [bundleTitle, setBundleTitle] = useState<string>('');
  const [bundleAuthor, setBundleAuthor] = useState<string>('');
  const [bundleDescription, setBundleDescription] = useState<string>('');
  const [bundleImportText, setBundleImportText] = useState<string>('');
  const [bundleStatus, setBundleStatus] = useState<string>('');

  const openUrl = (url: string) => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (typeof api?.openExternal === 'function') {
      api.openExternal(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openNexusSearch = (keywords: string) => {
    const query = encodeURIComponent(keywords);
    openUrl(`https://www.nexusmods.com/fallout4/search/?BH=0&search%5Bsearch_keywords%5D=${query}`);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const s = await window.electronAPI.getSettings();
        setSettings(s);
        window.electronAPI.onSettingsUpdated((next) => setSettings(next));
      } catch (e) {
        console.warn('[TheScribe] Failed to load settings', e);
      }
    };
    init();
    return () => {
      // onSettingsUpdated returns void; renderer cleans up on unload
    };
  }, []);

  useEffect(() => {
    // Keep local libraries in sync with persisted settings
    setXeditLibrary(Array.isArray(settings?.xeditScriptLibrary) ? settings!.xeditScriptLibrary! : []);
    setBlenderLibrary(Array.isArray(settings?.blenderScriptLibrary) ? settings!.blenderScriptLibrary! : []);
    setScriptBundles(Array.isArray(settings?.scriptBundles) ? settings!.scriptBundles! : []);
  }, [settings]);

  useEffect(() => {
    const fetchVersion = async () => {
      const path = getActiveToolPath();
      if (!path.trim()) {
        setToolVersion('');
        return;
      }
      try {
        const bridge = (window as any).electron?.api;
        if (bridge?.getToolVersion) {
          const v = await bridge.getToolVersion(path);
          setToolVersion(v || '');
        } else {
          setToolVersion('');
        }
      } catch (e) {
        console.warn('Tool version lookup failed', e);
        setToolVersion('');
      }
    };
    fetchVersion();
  }, [activeTab, settings]);

  const getActiveToolPath = () => {
    if (!settings) return '';
    if (activeTab === 'papyrus') return settings.creationKitPath || '';
    if (activeTab === 'xedit') return settings.xeditPath || '';
    if (activeTab === 'blender') return settings.blenderPath || '';
    return '';
  };

  const getActiveToolName = () => {
    if (activeTab === 'papyrus') return 'Creation Kit';
    if (activeTab === 'xedit') return 'xEdit';
    if (activeTab === 'blender') return 'Blender';
    return 'Tool';
  };

  const activeLibrary = useMemo(() => {
    if (activeTab === 'xedit') return xeditLibrary;
    if (activeTab === 'blender') return blenderLibrary;
    return [];
  }, [activeTab, xeditLibrary, blenderLibrary]);

  const persistLibrary = async (type: 'xedit' | 'blender', nextLibrary: ScriptTemplate[]) => {
    try {
      if (type === 'xedit') {
        await window.electronAPI.setSettings({ xeditScriptLibrary: nextLibrary });
      } else {
        await window.electronAPI.setSettings({ blenderScriptLibrary: nextLibrary });
      }
      setLibraryStatus('Saved.');
      setTimeout(() => setLibraryStatus(''), 1500);
    } catch (e) {
      console.warn('[TheScribe] Failed to persist script library', e);
      setLibraryStatus('Failed to save.');
      setTimeout(() => setLibraryStatus(''), 2000);
    }
  };

  const makeId = () => {
    try {
      // Browser/Electron renderer
      const anyCrypto: any = (globalThis as any).crypto;
      if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
    } catch {
      // ignore
    }
    return `tmpl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const persistBundles = async (nextBundles: ScriptBundle[]) => {
    try {
      await window.electronAPI.setSettings({ scriptBundles: nextBundles });
      setBundleStatus('Saved.');
      setTimeout(() => setBundleStatus(''), 1500);
    } catch (e) {
      console.warn('[TheScribe] Failed to persist bundles', e);
      setBundleStatus('Failed to save.');
      setTimeout(() => setBundleStatus(''), 2000);
    }
  };

  const selectedBundle = useMemo(() => {
    const b = scriptBundles.find((b) => b.id === bundleSelectedId) || null;
    return b;
  }, [scriptBundles, bundleSelectedId]);

  useEffect(() => {
    if (!selectedBundle) {
      setBundleTitle('');
      setBundleAuthor('');
      setBundleDescription('');
      return;
    }
    setBundleTitle(selectedBundle.title || '');
    setBundleAuthor(selectedBundle.author || '');
    setBundleDescription(selectedBundle.description || '');
  }, [selectedBundle]);

  const normalizeImportedBundle = (raw: any): ScriptBundle | null => {
    const title = String(raw?.title || '').trim();
    if (!title) return null;
    const incomingTemplates = Array.isArray(raw?.templates) ? raw.templates : [];
    const templates = incomingTemplates
      .map((t: any) => {
        const scriptTypeRaw = String(t?.scriptType || '').trim();
        const scriptType = (scriptTypeRaw === 'xedit' || scriptTypeRaw === 'blender') ? scriptTypeRaw : 'xedit';
        const body = String(t?.body || '').trimEnd();
        const tTitle = String(t?.title || '').trim();
        if (!tTitle || !body) return null;
        const createdAt = String(t?.createdAt || '').trim() || new Date().toISOString();
        const updatedAt = String(t?.updatedAt || '').trim() || createdAt;
        return {
          id: String(t?.id || '').trim() || makeId(),
          title: tTitle,
          author: String(t?.author || '').trim() || undefined,
          description: String(t?.description || '').trim() || undefined,
          scriptType,
          body,
          createdAt,
          updatedAt,
        } as ScriptTemplate;
      })
      .filter((t: ScriptTemplate | null): t is ScriptTemplate => Boolean(t));

    const now = new Date().toISOString();
    return {
      id: String(raw?.id || '').trim() || makeId(),
      title,
      author: String(raw?.author || '').trim() || undefined,
      description: String(raw?.description || '').trim() || undefined,
      templates,
      createdAt: String(raw?.createdAt || '').trim() || now,
      updatedAt: String(raw?.updatedAt || '').trim() || now,
    };
  };

  const exportBundlesJson = () => JSON.stringify({ bundles: scriptBundles }, null, 2);

  const handleExportBundlesToFile = async () => {
    try {
      const api = window.electronAPI as any;
      if (typeof api?.saveFile !== 'function') {
        setBundleStatus('Export requires Desktop Bridge saveFile support.');
        setTimeout(() => setBundleStatus(''), 2000);
        return;
      }
      const filename = `mossy-scribe-bundles.json`;
      const savedTo = await api.saveFile(exportBundlesJson(), filename);
      setBundleStatus(savedTo ? `Saved: ${savedTo}` : 'Saved.');
      setTimeout(() => setBundleStatus(''), 2500);
    } catch (e) {
      console.warn('[TheScribe] Bundle export failed', e);
      setBundleStatus('Export failed.');
      setTimeout(() => setBundleStatus(''), 2000);
    }
  };

  const handleImportBundlesMerge = async () => {
    const text = bundleImportText.trim();
    if (!text) {
      setBundleStatus('Paste JSON to import.');
      setTimeout(() => setBundleStatus(''), 2000);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.bundles)
          ? parsed.bundles
          : [];

      const normalized = incoming
        .map((b: any) => normalizeImportedBundle(b))
        .filter((b: ScriptBundle | null): b is ScriptBundle => Boolean(b));

      if (!normalized.length) {
        setBundleStatus('No valid bundles found.');
        setTimeout(() => setBundleStatus(''), 2000);
        return;
      }

      const byId = new Map(scriptBundles.map((b) => [b.id, b] as const));
      const merged: ScriptBundle[] = [...scriptBundles];
      for (const b of normalized) {
        const existing = byId.get(b.id);
        if (existing) {
          const idx = merged.findIndex((m) => m.id === existing.id);
          if (idx >= 0) merged[idx] = { ...existing, ...b, id: existing.id, createdAt: existing.createdAt };
        } else {
          merged.unshift(b);
        }
      }

      setScriptBundles(merged);
      await persistBundles(merged);
      setBundleStatus(`Imported ${normalized.length} bundle(s).`);
      setTimeout(() => setBundleStatus(''), 2000);
    } catch (e) {
      console.warn('[TheScribe] Bundle import failed', e);
      setBundleStatus('Invalid JSON.');
      setTimeout(() => setBundleStatus(''), 2000);
    }
  };

  const handleImportBundlesFromFile = async () => {
    try {
      const api = window.electronAPI as any;
      if (typeof api?.pickJsonFile !== 'function' || typeof api?.readFile !== 'function') {
        setBundleStatus('Import requires Desktop Bridge file picker + readFile support.');
        setTimeout(() => setBundleStatus(''), 2500);
        return;
      }
      const filePath = await api.pickJsonFile();
      if (!filePath) {
        setBundleStatus('Import canceled.');
        setTimeout(() => setBundleStatus(''), 1500);
        return;
      }
      const content = await api.readFile(filePath);
      setBundleImportText(String(content || ''));
      await handleImportBundlesMerge();
    } catch (e) {
      console.warn('[TheScribe] Bundle import from file failed', e);
      setBundleStatus('Import failed.');
      setTimeout(() => setBundleStatus(''), 2000);
    }
  };

  const handleNewBundle = async () => {
    const now = new Date().toISOString();
    const b: ScriptBundle = {
      id: makeId(),
      title: 'New Bundle',
      author: undefined,
      description: undefined,
      templates: [],
      createdAt: now,
      updatedAt: now,
    };
    const next = [b, ...scriptBundles];
    setScriptBundles(next);
    setBundleSelectedId(b.id);
    await persistBundles(next);
  };

  const handleSaveBundleMeta = async () => {
    if (!selectedBundle) {
      setBundleStatus('Select a bundle first.');
      setTimeout(() => setBundleStatus(''), 2000);
      return;
    }
    const title = bundleTitle.trim();
    if (!title) {
      setBundleStatus('Enter a bundle title.');
      setTimeout(() => setBundleStatus(''), 2000);
      return;
    }
    const now = new Date().toISOString();
    const next = scriptBundles.map((b) =>
      b.id === selectedBundle.id
        ? { ...b, title, author: bundleAuthor.trim() || undefined, description: bundleDescription.trim() || undefined, updatedAt: now }
        : b
    );
    setScriptBundles(next);
    await persistBundles(next);
  };

  const handleDeleteBundle = async () => {
    if (!selectedBundle) return;
    const next = scriptBundles.filter((b) => b.id !== selectedBundle.id);
    setScriptBundles(next);
    setBundleSelectedId('');
    await persistBundles(next);
  };

  const handleAddSelectedTemplateToBundle = async () => {
    if (!selectedBundle) {
      setBundleStatus('Select a bundle first.');
      setTimeout(() => setBundleStatus(''), 2000);
      return;
    }
    if (activeTab !== 'xedit' && activeTab !== 'blender') {
      setBundleStatus('Bundles are for xEdit/Blender templates.');
      setTimeout(() => setBundleStatus(''), 2000);
      return;
    }

    const fromLibrary = activeLibrary.find((t) => t.id === librarySelectedId) || null;
    const title = (fromLibrary?.title || libraryTitle).trim();
    const body = (fromLibrary?.body || code).trimEnd();
    if (!title || !body) {
      setBundleStatus('Pick a saved script or enter title+code first.');
      setTimeout(() => setBundleStatus(''), 2000);
      return;
    }

    const now = new Date().toISOString();
    const candidate: ScriptTemplate = {
      id: makeId(),
      title,
      author: (fromLibrary?.author || libraryAuthor).trim() || undefined,
      description: (fromLibrary?.description || libraryDescription).trim() || undefined,
      scriptType: activeTab,
      body,
      createdAt: now,
      updatedAt: now,
    };

    const key = `${candidate.scriptType}|${candidate.title}|${candidate.author || ''}`.toLowerCase();
    const existingKeys = new Set(selectedBundle.templates.map((t) => `${t.scriptType}|${t.title}|${t.author || ''}`.toLowerCase()));
    if (existingKeys.has(key)) {
      setBundleStatus('Already in bundle (same title/author/type).');
      setTimeout(() => setBundleStatus(''), 2000);
      return;
    }

    const next = scriptBundles.map((b) =>
      b.id === selectedBundle.id
        ? { ...b, templates: [candidate, ...b.templates], updatedAt: now }
        : b
    );
    setScriptBundles(next);
    await persistBundles(next);
  };

  const handleRemoveTemplateFromBundle = async (templateId: string) => {
    if (!selectedBundle) return;
    const now = new Date().toISOString();
    const next = scriptBundles.map((b) =>
      b.id === selectedBundle.id
        ? { ...b, templates: b.templates.filter((t) => t.id !== templateId), updatedAt: now }
        : b
    );
    setScriptBundles(next);
    await persistBundles(next);
  };

  const handleInstallBundleToLibraries = async () => {
    if (!selectedBundle) return;
    const incoming = selectedBundle.templates;
    if (!incoming.length) {
      setBundleStatus('Bundle is empty.');
      setTimeout(() => setBundleStatus(''), 2000);
      return;
    }

    const mergeInto = async (type: 'xedit' | 'blender', current: ScriptTemplate[]) => {
      const normalized = incoming.filter((t: ScriptTemplate) => t.scriptType === type);
      if (!normalized.length) return current;
      const byKey = new Map(current.map((t) => [`${t.scriptType}|${t.title}|${t.author || ''}`.toLowerCase(), t] as const));
      const next = [...current];
      for (const t of normalized) {
        const key = `${t.scriptType}|${t.title}|${t.author || ''}`.toLowerCase();
        const existing = byKey.get(key);
        if (existing) continue;
        const now = new Date().toISOString();
        next.unshift({ ...t, id: makeId(), createdAt: now, updatedAt: now });
      }
      await persistLibrary(type, next);
      return next;
    };

    const nextX = await mergeInto('xedit', xeditLibrary);
    const nextB = await mergeInto('blender', blenderLibrary);
    setXeditLibrary(nextX);
    setBlenderLibrary(nextB);
    setBundleStatus('Installed templates into libraries.');
    setTimeout(() => setBundleStatus(''), 2000);
  };

  const handleSaveToLibrary = async () => {
    if (activeTab !== 'xedit' && activeTab !== 'blender') {
      setLibraryStatus('Library is available for xEdit/Blender tabs.');
      setTimeout(() => setLibraryStatus(''), 2000);
      return;
    }

    const title = libraryTitle.trim();
    const body = code;
    if (!title) {
      setLibraryStatus('Enter a title first.');
      setTimeout(() => setLibraryStatus(''), 2000);
      return;
    }
    if (!body.trim()) {
      setLibraryStatus('Nothing to save (code is empty).');
      setTimeout(() => setLibraryStatus(''), 2000);
      return;
    }

    const now = new Date().toISOString();
    const existingIndex = activeLibrary.findIndex((t) => t.id === librarySelectedId);
    const nextTemplate: ScriptTemplate = {
      id: existingIndex >= 0 ? activeLibrary[existingIndex].id : makeId(),
      title,
      author: libraryAuthor.trim() || undefined,
      description: libraryDescription.trim() || undefined,
      scriptType: activeTab,
      body,
      createdAt: existingIndex >= 0 ? activeLibrary[existingIndex].createdAt : now,
      updatedAt: now,
    };

    const next = [...activeLibrary];
    if (existingIndex >= 0) next[existingIndex] = nextTemplate;
    else next.unshift(nextTemplate);

    setLibrarySelectedId(nextTemplate.id);
    if (activeTab === 'xedit') setXeditLibrary(next);
    else setBlenderLibrary(next);

    await persistLibrary(activeTab, next);
  };

  const handleLoadFromLibrary = () => {
    if (activeTab !== 'xedit' && activeTab !== 'blender') return;
    const tmpl = activeLibrary.find((t) => t.id === librarySelectedId);
    if (!tmpl) {
      setLibraryStatus('Pick a saved script to load.');
      setTimeout(() => setLibraryStatus(''), 2000);
      return;
    }
    setCode(tmpl.body || '');
    setLibraryTitle(tmpl.title || '');
    setLibraryAuthor(tmpl.author || '');
    setLibraryDescription(tmpl.description || '');
    setValidationErrors([]);
    setLibraryStatus('Loaded.');
    setTimeout(() => setLibraryStatus(''), 1500);
  };

  const handleDeleteFromLibrary = async () => {
    if (activeTab !== 'xedit' && activeTab !== 'blender') return;
    const id = librarySelectedId;
    if (!id) {
      setLibraryStatus('Pick a saved script to delete.');
      setTimeout(() => setLibraryStatus(''), 2000);
      return;
    }
    const next = activeLibrary.filter((t) => t.id !== id);
    setLibrarySelectedId('');
    if (activeTab === 'xedit') setXeditLibrary(next);
    else setBlenderLibrary(next);
    await persistLibrary(activeTab, next);
  };

  const exportLibraryJson = () => {
    const payload = { templates: activeLibrary };
    return JSON.stringify(payload, null, 2);
  };

  const handleCopyLibraryExport = async () => {
    try {
      await navigator.clipboard.writeText(exportLibraryJson());
      setLibraryStatus('Export JSON copied.');
      setTimeout(() => setLibraryStatus(''), 1500);
    } catch {
      setLibraryStatus('Copy failed.');
      setTimeout(() => setLibraryStatus(''), 2000);
    }
  };

  const handleExportLibraryToFile = async () => {
    if (activeTab !== 'xedit' && activeTab !== 'blender') return;
    try {
      const api = window.electronAPI as any;
      if (typeof api?.saveFile !== 'function') {
        setLibraryStatus('Export requires Desktop Bridge saveFile support.');
        setTimeout(() => setLibraryStatus(''), 2000);
        return;
      }
      const filename = `mossy-scribe-${activeTab}-library.json`;
      const savedTo = await api.saveFile(exportLibraryJson(), filename);
      setLibraryStatus(savedTo ? `Saved: ${savedTo}` : 'Saved.');
      setTimeout(() => setLibraryStatus(''), 2500);
    } catch (e) {
      console.warn('[TheScribe] Export to file failed', e);
      setLibraryStatus('Export failed.');
      setTimeout(() => setLibraryStatus(''), 2000);
    }
  };

  const normalizeImportedTemplate = (raw: any, fallbackType: 'xedit' | 'blender'): ScriptTemplate | null => {
    const title = String(raw?.title || '').trim();
    const body = String(raw?.body || '').trimEnd();
    if (!title || !body) return null;

    const scriptTypeRaw = String(raw?.scriptType || '').trim();
    const scriptType = (scriptTypeRaw === 'xedit' || scriptTypeRaw === 'blender') ? scriptTypeRaw : fallbackType;
    const createdAt = String(raw?.createdAt || '').trim() || new Date().toISOString();
    const updatedAt = String(raw?.updatedAt || '').trim() || createdAt;

    return {
      id: String(raw?.id || '').trim() || makeId(),
      title,
      author: String(raw?.author || '').trim() || undefined,
      description: String(raw?.description || '').trim() || undefined,
      scriptType,
      body,
      createdAt,
      updatedAt,
    };
  };

  const handleImportMerge = async () => {
    if (activeTab !== 'xedit' && activeTab !== 'blender') return;
    const text = libraryImportText.trim();
    if (!text) {
      setLibraryStatus('Paste JSON to import.');
      setTimeout(() => setLibraryStatus(''), 2000);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.templates)
          ? parsed.templates
          : [];

      const normalized = incoming
        .map((t: any) => normalizeImportedTemplate(t, activeTab))
        .filter((t: ScriptTemplate | null): t is ScriptTemplate => Boolean(t))
        .filter((t: ScriptTemplate) => t.scriptType === activeTab);

      if (normalized.length === 0) {
        setLibraryStatus('No valid templates found for this tab.');
        setTimeout(() => setLibraryStatus(''), 2000);
        return;
      }

      const byId = new Map(activeLibrary.map((t) => [t.id, t] as const));
      const byKey = new Map(activeLibrary.map((t) => [`${t.scriptType}|${t.title}|${t.author || ''}`.toLowerCase(), t] as const));

      const merged: ScriptTemplate[] = [...activeLibrary];
      for (const t of normalized) {
        const key = `${t.scriptType}|${t.title}|${t.author || ''}`.toLowerCase();
        const existingById = byId.get(t.id);
        const existingByKey = byKey.get(key);
        const existing = existingById || existingByKey;
        if (existing) {
          const idx = merged.findIndex((m) => m.id === existing.id);
          if (idx >= 0) merged[idx] = { ...existing, ...t, id: existing.id, createdAt: existing.createdAt };
        } else {
          merged.unshift(t);
        }
      }

      if (activeTab === 'xedit') setXeditLibrary(merged);
      else setBlenderLibrary(merged);
      await persistLibrary(activeTab, merged);
      setLibraryStatus(`Imported ${normalized.length} template(s).`);
      setTimeout(() => setLibraryStatus(''), 2000);
    } catch (e) {
      console.warn('[TheScribe] Import failed', e);
      setLibraryStatus('Invalid JSON.');
      setTimeout(() => setLibraryStatus(''), 2000);
    }
  };

  const handleImportFromFile = async () => {
    if (activeTab !== 'xedit' && activeTab !== 'blender') return;
    try {
      const api = window.electronAPI as any;
      if (typeof api?.pickJsonFile !== 'function' || typeof api?.readFile !== 'function') {
        setLibraryStatus('Import requires Desktop Bridge file picker + readFile support.');
        setTimeout(() => setLibraryStatus(''), 2500);
        return;
      }
      const filePath = await api.pickJsonFile();
      if (!filePath) {
        setLibraryStatus('Import canceled.');
        setTimeout(() => setLibraryStatus(''), 1500);
        return;
      }
      const content = await api.readFile(filePath);
      setLibraryImportText(String(content || ''));
      // Merge immediately
      await handleImportMerge();
    } catch (e) {
      console.warn('[TheScribe] Import from file failed', e);
      setLibraryStatus('Import failed.');
      setTimeout(() => setLibraryStatus(''), 2000);
    }
  };

  const handleLaunchTool = async () => {
    const path = getActiveToolPath();
    const toolName = getActiveToolName();
    if (!path || !path.trim()) {
      alert(`Set a path for ${toolName} in Tool Settings before launching.`);
      return;
    }
    setLaunching(true);
    try {
      const bridge = (window as any).electron?.api || (window as any).electronAPI;
      if (bridge?.openProgram) {
        await bridge.openProgram(path);
      } else if (bridge?.openExternal) {
        await bridge.openExternal(path);
      } else {
        alert('Launching external tools requires the Desktop Bridge (Electron).');
      }
    } catch (err) {
      console.error('Failed to launch tool:', err);
      alert(`Could not launch ${toolName}. Check the configured path in Tool Settings.`);
    } finally {
      setLaunching(false);
    }
  };

  const dirnamePortable = (p: string) => {
    const s = String(p || '').replace(/\//g, '\\');
    const idx = s.lastIndexOf('\\');
    if (idx <= 0) return '';
    return s.slice(0, idx);
  };

  const joinPortable = (a: string, b: string) => {
    const left = String(a || '').replace(/[\\/]+$/g, '');
    const right = String(b || '').replace(/^[\\/]+/g, '');
    if (!left) return right;
    if (!right) return left;
    return `${left}\\${right}`;
  };

  const safeFilenameBase = (name: string) => {
    const s = String(name || '').trim();
    const cleaned = s.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();
    return cleaned || 'scribe_script';
  };

  const getXeditScriptsDir = () => {
    const override = String(settings?.xeditScriptsDirOverride || '').trim();
    if (override) return override;
    const exe = String(settings?.xeditPath || '').trim();
    if (!exe) return '';
    const dir = dirnamePortable(exe);
    if (!dir) return '';
    return joinPortable(dir, 'Edit Scripts');
  };

  const handleExportXeditScriptToFile = async () => {
    if (activeTab !== 'xedit') return;
    try {
      const api: any = (window as any).electron?.api || (window as any).electronAPI;
      if (typeof api?.saveFile !== 'function') {
        setXeditScriptStatus('Export requires Desktop Bridge saveFile support.');
        setTimeout(() => setXeditScriptStatus(''), 2500);
        return;
      }
      const body = String(code || '').trimEnd();
      if (!body.trim()) {
        setXeditScriptStatus('Nothing to export (editor is empty).');
        setTimeout(() => setXeditScriptStatus(''), 2000);
        return;
      }
      const base = safeFilenameBase(libraryTitle || 'xedit_script');
      const filename = base.toLowerCase().endsWith('.pas') ? base : `${base}.pas`;
      const savedTo = await api.saveFile(body, filename);
      setXeditScriptStatus(savedTo ? `Exported: ${savedTo}` : 'Exported.');
      setTimeout(() => setXeditScriptStatus(''), 2500);
    } catch (e) {
      console.warn('[TheScribe] xEdit export failed', e);
      setXeditScriptStatus('Export failed.');
      setTimeout(() => setXeditScriptStatus(''), 2000);
    }
  };

  const handleInstallXeditScriptToFolder = async () => {
    if (activeTab !== 'xedit') return;
    try {
      const api: any = (window as any).electron?.api || (window as any).electronAPI;
      
      const body = String(code || '').trimEnd();
      if (!body.trim()) {
        setXeditScriptStatus('Nothing to install (editor is empty).');
        setTimeout(() => setXeditScriptStatus(''), 2000);
        return;
      }

      const base = safeFilenameBase(libraryTitle || 'xedit_script');
      setXeditScriptStatus('Installing...');

      // Phase 4: Use the new centralized installScript API
      const result = await api.installScript('xedit', base, body);
      
      if (result && result.success) {
        setXeditScriptStatus(`Installed to: ${result.path}`);
        
        // Try to reveal the new file for convenience
        try {
          if (typeof api?.revealInFolder === 'function') await api.revealInFolder(result.path);
        } catch { /* ignore */ }
      } else {
        setXeditScriptStatus(`Failed: ${result?.error || 'Unknown error'}`);
      }
      
      setTimeout(() => setXeditScriptStatus(''), 5000);
    } catch (e: any) {
      console.warn('[TheScribe] xEdit install failed', e);
      setXeditScriptStatus(`Error: ${e.message}`);
      setTimeout(() => setXeditScriptStatus(''), 5000);
    }
  };

  const handleInstallPapyrusScript = async () => {
    if (activeTab !== 'papyrus') return;
    try {
      const api: any = (window as any).electron?.api || (window as any).electronAPI;
      
      const body = String(code || '').trimEnd();
      if (!body.trim()) {
        setXeditScriptStatus('Nothing to install (editor is empty).');
        setTimeout(() => setXeditScriptStatus(''), 2000);
        return;
      }

      // Try to extract script name from code
      const nameMatch = body.match(/Scriptname\s+([\w\d_]+)/i);
      const scriptName = nameMatch ? nameMatch[1] : (libraryTitle || 'MyScript');

      setXeditScriptStatus('Installing...');

      const result = await api.installScript('papyrus', scriptName, body);
      
      if (result && result.success) {
        setXeditScriptStatus(`Installed to: ${result.path}`);
      } else {
        setXeditScriptStatus(`Failed: ${result?.error || 'Unknown error'}`);
      }
      

      setTimeout(() => setXeditScriptStatus(''), 5000);
    } catch (e: any) {
      console.warn('[TheScribe] Papyrus install failed', e);
      setXeditScriptStatus(`Error: ${e.message}`);
      setTimeout(() => setXeditScriptStatus(''), 5000);
    }
  };

  const handleRunBlenderScript = async () => {
    if (activeTab !== 'blender') return;
    const exe = getActiveToolPath().trim();
    if (!exe) {
      alert('Set a Blender path in Tool Settings before running scripts.');
      return;
    }

    const bridge: any = (window as any).electron?.api || (window as any).electronAPI;
    if (typeof bridge?.runTool !== 'function' || typeof bridge?.writeLoadOrderUserDataFile !== 'function') {
      setRunStatus('Run requires Desktop Bridge (runTool + userData writer).');
      setTimeout(() => setRunStatus(''), 2500);
      return;
    }

    const scriptBody = String(code || '').trim();
    if (!scriptBody) {
      setRunStatus('Nothing to run (editor is empty).');
      setTimeout(() => setRunStatus(''), 2000);
      return;
    }

    setRunningScript(true);
    setRunStatus('Running Blender headless...');
    setRunOutput('');

    try {
      const filename = `scribe_blender_${Date.now()}.py`;
      const scriptPath: string = await bridge.writeLoadOrderUserDataFile(filename, scriptBody);
      if (!scriptPath) {
        setRunStatus('Failed to write temp script.');
        return;
      }

      const res = await bridge.runTool({
        cmd: exe,
        args: ['--background', '--python', scriptPath],
        cwd: undefined,
      });

      const stdout = String(res?.stdout || '').trim();
      const stderr = String(res?.stderr || '').trim();
      const exitCode = Number(res?.exitCode ?? -1);
      setRunStatus(`Finished (exit ${exitCode}).`);
      const joined = [stdout && `STDOUT\n${stdout}`, stderr && `STDERR\n${stderr}`].filter(Boolean).join('\n\n');
      setRunOutput(joined || '(no output)');
    } catch (e) {
      console.warn('[TheScribe] Blender run failed', e);
      setRunStatus('Run failed.');
      setRunOutput(String((e as any)?.message || e || 'Unknown error'));
    } finally {
      setRunningScript(false);
      setTimeout(() => setRunStatus(''), 4000);
    }
  };

  const validatePapyrus = (code: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    const lines = code.split('\n');

    // Identify first non-empty, non-comment line
    const firstRealLineIndex = lines.findIndex((l) => l.trim() && !l.trim().startsWith(';'));
    const firstRealLine = firstRealLineIndex >= 0 ? lines[firstRealLineIndex].trim() : '';

    // Validate ScriptName and extends
    let extendsType: 'Quest' | 'Actor' | 'ObjectReference' | undefined;
    if (!firstRealLine || !/^ScriptName\s+\w+/i.test(firstRealLine)) {
      errors.push({
        line: Math.max(1, firstRealLineIndex + 1),
        message: 'Script must start with "ScriptName <Name>" declaration',
        severity: 'error',
      });
    } else {
      const m = firstRealLine.match(/ScriptName\s+\w+(?:\s+extends\s+(\w+))?/i);
      if (m) {
        if (!m[1]) {
          errors.push({
            line: firstRealLineIndex + 1,
            message: 'Script should declare base type with "extends" (e.g., Quest/Actor/ObjectReference)',
            severity: 'warning',
          });
        } else if (!/^(Quest|Actor|ObjectReference)$/i.test(m[1])) {
          errors.push({
            line: firstRealLineIndex + 1,
            message: `Unknown extends type "${m[1]}"; common bases are Quest, Actor, ObjectReference`,
            severity: 'info',
          });
        } else {
          extendsType = m[1] as any;
        }
      }
    }

    // Track block starts/ends for Event/Function/If/While
    const stack: { kind: 'Event' | 'Function' | 'If' | 'While'; name?: string; line: number }[] = [];
    const pushBlock = (kind: 'Event' | 'Function' | 'If' | 'While', name: string | undefined, line: number) => stack.push({ kind, name, line });
    const popBlock = (kind: 'Event' | 'Function' | 'If' | 'While', line: number, endToken: string) => {
      const idx = [...stack].reverse().findIndex((s) => s.kind === kind);
      if (idx === -1) {
        errors.push({ line, message: `${endToken} without matching start`, severity: 'error' });
      } else {
        stack.splice(stack.length - 1 - idx, 1);
      }
    };

    // Valid event names per base type (subset, heuristic)
    const validEvents: Record<string, string[]> = {
      Quest: ['OnQuestInit', 'OnStoryScript','OnStageSet'],
      Actor: ['OnInit', 'OnCombatStateChanged', 'OnDeath', 'OnLocationChange'],
      ObjectReference: ['OnActivate', 'OnContainerChanged', 'OnInit', 'OnLoad'],
    };

    const hasImport = (name: string) => new RegExp(`^\\s*Import\\s+${name}\\b`, 'im').test(code);

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith(';')) return;

      // Event/Function starts
      const eventStart = trimmedLine.match(/^Event\s+([A-Za-z0-9_.]+)/);
      const funcStart = trimmedLine.match(/^Function\s+([A-Za-z0-9_]+)\s*\(/);
      if (eventStart) {
        const evNameRaw = eventStart[1];
        const evName = evNameRaw.includes('.') ? evNameRaw.split('.')[1] : evNameRaw;
        pushBlock('Event', evName, lineNum);
        if (extendsType && validEvents[extendsType]) {
          const allowed = validEvents[extendsType].map((e) => e.toLowerCase());
          if (!allowed.includes(evName.toLowerCase())) {
            errors.push({
              line: lineNum,
              message: `Event "${evNameRaw}" may not be valid for base ${extendsType}`,
              severity: 'warning',
            });
          }
        }
      } else if (funcStart) {
        pushBlock('Function', funcStart[1], lineNum);
      }

      // Block ends
      if (/^EndEvent\b/.test(trimmedLine)) popBlock('Event', lineNum, 'EndEvent');
      if (/^EndFunction\b/.test(trimmedLine)) popBlock('Function', lineNum, 'EndFunction');
      if (/^EndIf\b/.test(trimmedLine)) popBlock('If', lineNum, 'EndIf');
      if (/^EndWhile\b/.test(trimmedLine)) popBlock('While', lineNum, 'EndWhile');

      // Control structures
      if (/^If\b/.test(trimmedLine)) pushBlock('If', undefined, lineNum);
      if (/^While\b/.test(trimmedLine)) pushBlock('While', undefined, lineNum);

      // Property declarations
      const propDecl = trimmedLine.match(/^([A-Za-z0-9_]+)\s+Property\s+([A-Za-z0-9_]+)(.*)$/i);
      if (propDecl) {
        const suffix = propDecl[3] || '';
        if (!/\bAuto\b/i.test(suffix) && !/=/.test(suffix)) {
          errors.push({
            line: lineNum,
            message: 'Property should use Auto or explicit getter/setter implementation',
            severity: 'info',
          });
        }
      }

      // F4SE-related usage without import
      const usesF4SE = /(\bF4SE\b|\bUI\.|\bInput\.|\bConsoleUtil\.)/.test(trimmedLine);
      if (usesF4SE && !(hasImport('F4SE') || hasImport('UI') || hasImport('Input') || hasImport('ConsoleUtil')) ) {
        errors.push({
          line: lineNum,
          message: 'Using F4SE/UI/Input/ConsoleUtil functions requires Import at script top',
          severity: 'error',
        });
      }

      // Deprecated patterns
      if (/\bGetDistance\s*\(/.test(trimmedLine)) {
        errors.push({
          line: lineNum,
          message: 'Prefer GetDistance(ObjectReference) or vector math over deprecated forms',
          severity: 'warning',
        });
      }
    });

    // Unclosed blocks leftover
    for (const s of stack) {
      const endToken = s.kind === 'Event' ? 'EndEvent' : s.kind === 'Function' ? 'EndFunction' : s.kind === 'If' ? 'EndIf' : 'EndWhile';
      errors.push({ line: s.line, message: `${s.kind} started here is missing matching ${endToken}`, severity: 'error' });
    }

    return errors;
  };

  const validateXEdit = (code: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    const lines = code.split('\n');

    const firstRealLineIndex = lines.findIndex((l) => l.trim());
    const firstRealLine = firstRealLineIndex >= 0 ? lines[firstRealLineIndex].trim() : '';
    if (!/^unit\s+\w+;?/i.test(firstRealLine)) {
      errors.push({ line: Math.max(1, firstRealLineIndex + 1), message: 'xEdit script must start with "unit <Name>;"', severity: 'error' });
    }

    const hasInitialize = /function\s+Initialize\s*:\s*integer\s*;/i.test(code);
    const hasProcess = /function\s+Process\s*\(.*IInterface.*\)\s*:\s*integer\s*;/i.test(code);
    const hasFinalize = /function\s+Finalize\s*:\s*integer\s*;/i.test(code);
    if (!hasInitialize && !hasProcess) {
      errors.push({ line: 1, message: 'Script should implement Initialize or Process function', severity: 'warning' });
    }
    if (!hasFinalize) {
      errors.push({ line: 1, message: 'Consider adding Finalize for cleanup/logging', severity: 'info' });
    }

    // Ensure end.
    if (!/end\./i.test(code.trim())) {
      errors.push({ line: lines.length, message: 'Script should end with "end."', severity: 'error' });
    }

    // Validate function bodies have begin/end; and set Result
    const fnRegex = /function\s+(Initialize|Process|Finalize)[\s\S]*?begin([\s\S]*?)end\s*;/gi;
    let m: RegExpExecArray | null;
    const seenFns: string[] = [];
    while ((m = fnRegex.exec(code)) !== null) {
      const fnName = m[1];
      seenFns.push(fnName.toLowerCase());
      const body = m[2];
      if (!/Result\s*:=\s*0\s*;/.test(body)) {
        errors.push({ line: 1, message: `${fnName} should set Result := 0;`, severity: 'info' });
      }
    }

    // If any declared function lacks a begin/end pair
    const declaredFns = (code.match(/function\s+(Initialize|Process|Finalize)/gi) || []).map((s) => s.toLowerCase());
    for (const d of declaredFns) {
      if (!seenFns.includes(d)) {
        errors.push({ line: 1, message: `Function ${d} missing begin/end; block`, severity: 'error' });
      }
    }

    return errors;
  };

  const validateBlender = (code: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    const lines = code.split('\n');

    if (!/\bimport\s+bpy\b/.test(code)) {
      errors.push({ line: 1, message: 'Blender scripts must import bpy', severity: 'error' });
    }

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Guarded access to context object
      if (/\bbpy\.context\.object\b/.test(trimmedLine) && !/if\s+bpy\.context\.object/.test(code)) {
        errors.push({ line: lineNum, message: 'Guard access: use "if bpy.context.object:" before bpy.context.object', severity: 'warning' });
      }

      // Deprecated operators
      if (/\bbpy\.ops\.object\.select_name\b/.test(trimmedLine)) {
        errors.push({ line: lineNum, message: 'select_name is deprecated; use obj.select_set(True)', severity: 'warning' });
      }
    });

    // Heuristic: using bpy.ops requires active object/context
    const usesOps = /\bbpy\.ops\./.test(code);
    const hasContextSetup = /(bpy\.context\.view_layer\.objects\.active\s*=|obj\.select_set\(|with\s+bpy\.context\.temp_override)/.test(code);
    if (usesOps && !hasContextSetup) {
      errors.push({ line: 1, message: 'bpy.ops calls usually require active object or context override', severity: 'info' });
    }

    // Recommend using os.path.join for file path assembly when exporting
    if (/\bbpy\.ops\.export_/.test(code) && !/os\.path\.join\(/.test(code)) {
      errors.push({ line: 1, message: 'Use os.path.join() for stable export file paths', severity: 'info' });
    }

    return errors;
  };

  const handleValidate = () => {
    let errors: ValidationError[] = [];
    
    switch (activeTab) {
      case 'papyrus':
        errors = validatePapyrus(code);
        break;
      case 'xedit':
        errors = validateXEdit(code);
        break;
      case 'blender':
        errors = validateBlender(code);
        break;
    }

    setValidationErrors(errors);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const templates = {
    papyrus: {
      quest: `ScriptName MyQuestScript extends Quest

Event OnQuestInit()
    Debug.Trace("Quest initialized")
    RegisterForRemoteEvent(Game.GetPlayer(), "OnLocationChange")
EndEvent

Event Actor.OnLocationChange(Actor akSender, Location akOldLoc, Location akNewLoc)
    Debug.Notification("Location changed!")
EndEvent`,
      actor: `ScriptName MyActorScript extends Actor

Event OnInit()
    Debug.Trace("Actor initialized")
EndEvent

Event OnCombatStateChanged(Actor akTarget, int aeCombatState)
    If aeCombatState == 1
        Debug.Notification("Entering combat!")
    EndIf
EndEvent

Event OnDeath(Actor akKiller)
    Debug.Trace("Actor died")
EndEvent`,
      objectReference: `ScriptName MyObjectScript extends ObjectReference

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Debug.Notification("Player activated object")
        ; Your code here
    EndIf
EndEvent

Event OnContainerChanged(ObjectReference akNewContainer, ObjectReference akOldContainer)
    Debug.Trace("Container changed")
EndEvent`,
    },
    xedit: {
      basic: `unit UserScript;

function Initialize: integer;
begin
  Result := 0;
  AddMessage('Script initialized');
end;

function Process(e: IInterface): integer;
begin
  Result := 0;
  
  // Process each record
  AddMessage('Processing: ' + GetEditValue(e, 'EDID'));
  
  // Your code here
  
end;

function Finalize: integer;
begin
  Result := 0;
  AddMessage('Script complete');
end;

end.`,
      renumber: `unit RenumberFormIDs;

var
  targetPlugin: IInterface;
  newFormIDBase: integer;

function Initialize: integer;
begin
  Result := 0;
  targetPlugin := FileByName('MyMod.esp');
  newFormIDBase := $01000800; // New FormID base
end;

function Process(e: IInterface): integer;
var
  oldFormID, newFormID: integer;
begin
  Result := 0;
  
  if GetFile(e) <> targetPlugin then
    Exit;
  
  oldFormID := GetLoadOrderFormID(e);
  newFormID := newFormIDBase;
  Inc(newFormIDBase);
  
  // Renumber
  SetLoadOrderFormID(e, newFormID);
  AddMessage(Format('Changed %s from %s to %s', [GetEditValue(e, 'EDID'), IntToHex(oldFormID, 8), IntToHex(newFormID, 8)]));
end;

end.`,
    },
    blender: {
      basic: `import bpy

# Get active object
obj = bpy.context.active_object

if obj:
    print(f"Selected object: {obj.name}")
    
    # Modify object
    obj.location = (0, 0, 0)
    obj.scale = (1, 1, 1)
else:
    print("No object selected")`,
      export: `import bpy
import os

# Export settings
export_path = "D:/FO4/Data/Meshes/"
export_name = "my_mesh.nif"

# Select all mesh objects
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.select_set(True)

# Export as NIF (requires PyNifly plugin)
filepath = os.path.join(export_path, export_name)
bpy.ops.export_scene.nif(
    filepath=filepath,
    use_selection=True,
    apply_scale=True
)

print(f"Exported to {filepath}")`,
      batch: `import bpy

# Batch process all meshes
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    
    # Select object
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    
    # Apply transformations
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # Add modifier
    mod = obj.modifiers.new(name="EdgeSplit", type='EDGE_SPLIT')
    mod.split_angle = 0.523599  # 30 degrees
    
    # Apply modifier
    bpy.ops.object.modifier_apply(modifier="EdgeSplit")
    
    obj.select_set(False)
    print(f"Processed: {obj.name}")

print("Batch processing complete")`,
    },
  };

  const loadTemplate = (template: string) => {
    const templates_for_type = templates[activeTab];
    if (templates_for_type && template in templates_for_type) {
      setCode((templates_for_type as any)[template]);
      setValidationErrors([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">The Scribe</h1>
              <p className="text-sm text-slate-400">Script Writing & Validation</p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => { setActiveTab('papyrus'); setCode(''); setValidationErrors([]); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === 'papyrus'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Code className="w-4 h-4" />
              Papyrus
            </button>
            <button
              onClick={() => { setActiveTab('xedit'); setCode(''); setValidationErrors([]); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === 'xedit'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-4 h-4" />
              xEdit
            </button>
            <button
              onClick={() => { setActiveTab('blender'); setCode(''); setValidationErrors([]); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === 'blender'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Palette className="w-4 h-4" />
              Blender
            </button>
          </div>
        </div>

        <div className="mt-5 bg-slate-950/50 border border-slate-700 rounded-lg p-4">
          <div className="text-sm font-bold text-purple-300 mb-2">🧰 Tools / Install / Verify (No Guesswork)</div>
          <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
            <li><strong>Papyrus:</strong> Creation Kit installed (for compiling <span className="font-mono">.psc → .pex</span>).</li>
            <li><strong>xEdit scripts:</strong> FO4Edit installed (to run scripts and patch records).</li>
            <li><strong>Blender scripts:</strong> Blender installed (run from Blender’s Text Editor / Scripting workspace).</li>
          </ul>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => openUrl('https://store.steampowered.com/search/?term=Fallout%204%20Creation%20Kit')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
            >
              Steam: Creation Kit (search)
            </button>
            <button
              onClick={() => openNexusSearch('FO4Edit xEdit')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
            >
              Nexus: FO4Edit (search)
            </button>
            <button
              onClick={() => openUrl('https://www.blender.org/download/')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
            >
              Blender (official)
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/settings/tools')}
              className="px-3 py-2 rounded bg-purple-700 hover:bg-purple-600 text-xs font-bold text-white"
            >
              Tool Settings
            </button>
            <button
              onClick={() => navigate('/script-analyzer')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
            >
              Script Analyzer
            </button>
            <button
              onClick={() => navigate('/workshop')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
            >
              Workshop
            </button>
            <button
              onClick={() => navigate('/ck-quest-dialogue')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
            >
              CK Wizard
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Editor */}
        <div className="flex-1 flex flex-col border-r border-slate-700/50 min-w-0">
          {/* Project Wizard (Phase 3) */}
          <div className="p-3 bg-slate-900/80 border-b border-slate-700">
            {activeTab === 'papyrus' && (
              <ProjectWizard 
                wizardId="script-writer" 
                onActionComplete={(res) => {
                  if (res.content) setCode(res.content);
                  setRunStatus(res.message);
                }}
              />
            )}
            {activeTab === 'blender' && (
              <ProjectWizard 
                wizardId="blender-companion" 
                onActionComplete={(res) => setRunStatus(res.message)}
              />
            )}
          </div>
          
          {/* Toolbar */}
          <div className="p-3 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
            <div className="flex gap-2">
              <select
                onChange={(e) => loadTemplate(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Load Template...</option>
                {activeTab === 'papyrus' && (
                  <>
                    <option value="quest">Quest Script</option>
                    <option value="actor">Actor Script</option>
                    <option value="objectReference">Object Reference</option>
                  </>
                )}
                {activeTab === 'xedit' && (
                  <>
                    <option value="basic">Basic Script</option>
                    <option value="renumber">Renumber FormIDs</option>
                  </>
                )}
                {activeTab === 'blender' && (
                  <>
                    <option value="basic">Basic Script</option>
                    <option value="export">Export NIF</option>
                    <option value="batch">Batch Process</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleLaunchTool}
                disabled={launching || !getActiveToolPath().trim()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {activeTab === 'papyrus' && 'Launch CK'}
                {activeTab === 'xedit' && 'Launch xEdit'}
                {activeTab === 'blender' && 'Launch Blender'}
              </button>
              {activeTab === 'xedit' && (
                <>
                  <button
                    onClick={() => void handleInstallXeditScriptToFolder()}
                    disabled={launching || !getActiveToolPath().trim()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                    title="Writes a .pas into your xEdit 'Edit Scripts' folder (best-effort, version-agnostic)."
                  >
                    <Upload className="w-4 h-4" />
                    Install Script
                  </button>
                  <button
                    onClick={() => void handleExportXeditScriptToFile()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
                    title="Exports this script as a .pas file (works for any xEdit version)."
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Export .pas
                  </button>
                </>
              )}
              {activeTab === 'blender' && (
                <button
                  onClick={() => void handleRunBlenderScript()}
                  disabled={runningScript || launching || !getActiveToolPath().trim()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                  title="Runs Blender in background with this script (writes a temp .py to app userData)."
                >
                  <Play className="w-4 h-4" />
                  {runningScript ? 'Running…' : 'Run Script'}
                </button>
              )}
              {getActiveToolPath().trim() && (
                <span className="text-[11px] text-slate-400 px-2 py-1 bg-slate-800 border border-slate-700 rounded">
                  {toolVersion ? `Version: ${toolVersion}` : 'Version: unknown'}
                </span>
              )}
              <button
                onClick={handleValidate}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                Validate
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>

              {activeTab === 'papyrus' && (
                <button
                  onClick={handleInstallPapyrusScript}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors"
                  title="Install this script directly into your Data/Scripts/Source/User folder."
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Install Script
                </button>
              )}

              {activeTab === 'xedit' && (
                <button
                  onClick={() => void handleInstallXeditScriptToFolder()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors"
                  title="Install this script directly into your xEdit 'Edit Scripts' folder."
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Install Script
                </button>
              )}
            </div>
          </div>

          {(activeTab === 'xedit' || activeTab === 'papyrus') && (
            <div className="border-b border-slate-700/50 bg-slate-900/30 p-3">
              <div className="text-[11px] text-slate-400">
                {activeTab === 'xedit' ? (
                  <>Tip: Use “Install Script” to write directly to <span className="font-mono">Edit Scripts</span>, then run it from xEdit’s Apply Script menu.</>
                ) : (
                  <>Tip: “Install Script” writes to <span className="font-mono">Data/Scripts/Source/User</span>. You must still compile it in the Creation Kit.</>
                )}
              </div>
              {xeditScriptStatus && <div className="text-xs text-amber-400 mt-2 font-medium">{xeditScriptStatus}</div>}
            </div>
          )}

          {(runStatus || runOutput) && activeTab === 'blender' && (
            <div className="border-b border-slate-700/50 bg-slate-900/30 p-3">
              {runStatus && <div className="text-xs text-slate-200 mb-2">{runStatus}</div>}
              {runOutput && (
                <pre className="text-[11px] whitespace-pre-wrap text-slate-300 bg-slate-950/50 border border-slate-700 rounded p-2 max-h-40 overflow-auto">
                  {runOutput}
                </pre>
              )}
            </div>
          )}

          {/* Code Editor */}
          <div className="flex-1 p-4 overflow-auto bg-slate-950">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Enter your ${activeTab} code here...`}
              className="w-full h-full bg-transparent text-emerald-400 font-mono text-sm resize-none focus:outline-none"
              spellCheck={false}
              style={{ 
                minHeight: '100%',
                lineHeight: '1.5',
                tabSize: 4,
              }}
            />
          </div>
        </div>

        {/* Right Panel - Validation Results */}
        <div className="w-96 flex flex-col bg-slate-900/50">
          <div className="p-4 border-b border-slate-700/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Validation Results
            </h2>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-2">
            {validationErrors.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Check className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No issues detected</p>
                <p className="text-sm mt-1">Click &quot;Validate&quot; to check your code</p>
              </div>
            )}

            {validationErrors.map((error, index) => {
              const colors = {
                error: 'border-red-500/50 bg-red-900/20 text-red-400',
                warning: 'border-amber-500/50 bg-amber-900/20 text-amber-400',
                info: 'border-blue-500/50 bg-blue-900/20 text-blue-400',
              };

              const icons = {
                error: X,
                warning: AlertTriangle,
                info: Zap,
              };

              const Icon = icons[error.severity];

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-3 ${colors[error.severity]}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase">{error.severity}</span>
                        <span className="text-xs opacity-70">Line {error.line}</span>
                      </div>
                      <p className="text-sm">{error.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Script Library */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-900/40">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Save className="w-4 h-4 text-purple-300" />
              Script Library
              <span className="text-[11px] text-slate-400 font-normal">({activeLibrary.length})</span>
            </h3>

            {activeTab === 'papyrus' ? (
              <div className="text-xs text-slate-400">
                For Papyrus, use the Creation Kit Link Template Library (Desktop Bridge → CK).
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={libraryTitle}
                    onChange={(e) => setLibraryTitle(e.target.value)}
                    placeholder="Title"
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <input
                    value={libraryAuthor}
                    onChange={(e) => setLibraryAuthor(e.target.value)}
                    placeholder="Author (optional)"
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <textarea
                  value={libraryDescription}
                  onChange={(e) => setLibraryDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                  rows={2}
                />

                <div className="flex gap-2">
                  <select
                    value={librarySelectedId}
                    onChange={(e) => setLibrarySelectedId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Load saved script…</option>
                    {activeLibrary.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}{t.author ? ` — ${t.author}` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleLoadFromLibrary}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                  >
                    Load
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveToLibrary}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-purple-700 hover:bg-purple-600 text-xs font-bold text-white"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </button>
                  <button
                    onClick={handleDeleteFromLibrary}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                  <button
                    onClick={handleCopyLibraryExport}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                    title="Copy export JSON"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Export
                  </button>

                  <button
                    onClick={handleExportLibraryToFile}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                    title="Save export JSON to a file"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Export to file
                  </button>
                </div>

                <textarea
                  value={libraryImportText}
                  onChange={(e) => setLibraryImportText(e.target.value)}
                  placeholder='Paste JSON to import (array or { "templates": [...] })'
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-purple-500"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={handleImportMerge}
                      className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import + merge
                    </button>
                    <button
                      onClick={handleImportFromFile}
                      className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                      title="Pick a JSON file and import it"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import from file
                    </button>
                  </div>

                  {libraryStatus && <div className="text-[11px] text-slate-300">{libraryStatus}</div>}
                </div>
              </div>
            )}
          </div>

          {activeTab !== 'papyrus' && (
            <div className="p-4 border-t border-slate-700/50 bg-slate-800/20">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                Script Bundles (shareable)
              </h3>
              <div className="text-xs text-slate-400 mb-3">
                Bundles are portable packs of xEdit/Blender templates. Import/export one JSON, then optionally install templates into your libraries.
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={bundleSelectedId}
                    onChange={(e) => setBundleSelectedId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select bundle…</option>
                    {scriptBundles.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}{b.author ? ` — ${b.author}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void handleNewBundle()}
                    className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white"
                  >
                    New
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    value={bundleTitle}
                    onChange={(e) => setBundleTitle(e.target.value)}
                    placeholder="Bundle title"
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    value={bundleAuthor}
                    onChange={(e) => setBundleAuthor(e.target.value)}
                    placeholder="Bundle author (optional)"
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <textarea
                  value={bundleDescription}
                  onChange={(e) => setBundleDescription(e.target.value)}
                  placeholder="Bundle description (optional)"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                  rows={2}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void handleSaveBundleMeta()}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save bundle
                  </button>
                  <button
                    onClick={() => void handleDeleteBundle()}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete bundle
                  </button>
                  <button
                    onClick={() => void handleAddSelectedTemplateToBundle()}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white"
                    title="Adds the selected saved script (or current editor) into this bundle"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Add current script
                  </button>
                  <button
                    onClick={() => void handleInstallBundleToLibraries()}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                    title="Copies templates from this bundle into your xEdit/Blender libraries (deduped by title/author/type)."
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Install into libraries
                  </button>
                  <button
                    onClick={() => void handleExportBundlesToFile()}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                    title="Save bundles JSON to a file"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Export bundles
                  </button>
                </div>

                {selectedBundle?.templates?.length ? (
                  <div className="bg-slate-950/30 border border-slate-700 rounded p-2">
                    <div className="text-[11px] text-slate-400 mb-1">Templates in bundle</div>
                    <div className="space-y-1">
                      {selectedBundle.templates.map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs text-slate-100 truncate">{t.title}</div>
                            <div className="text-[10px] text-slate-500 truncate">{t.scriptType}{t.author ? ` • ${t.author}` : ''}</div>
                          </div>
                          <button
                            onClick={() => void handleRemoveTemplateFromBundle(t.id)}
                            className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic">Select a bundle to see its templates.</div>
                )}

                <textarea
                  value={bundleImportText}
                  onChange={(e) => setBundleImportText(e.target.value)}
                  placeholder='Paste bundles JSON to import (array or { "bundles": [...] })'
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleImportBundlesMerge()}
                      className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import + merge
                    </button>
                    <button
                      onClick={() => void handleImportBundlesFromFile()}
                      className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white"
                      title="Pick a JSON file and import it"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import from file
                    </button>
                  </div>
                  {bundleStatus && <div className="text-[11px] text-slate-300">{bundleStatus}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Quick Tips */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Quick Tips
            </h3>
            <div className="space-y-1 text-xs text-slate-400">
              {activeTab === 'papyrus' && (
                <>
                  <p>• Always start with ScriptName declaration</p>
                  <p>• Close all Event/Function blocks</p>
                  <p>• Import F4SE if using F4SE functions</p>
                  <p>• Use &quot;Auto&quot; for simple properties</p>
                </>
              )}
              {activeTab === 'xedit' && (
                <>
                  <p>• Start with &quot;unit&quot; declaration</p>
                  <p>• Implement Initialize/Process/Finalize</p>
                  <p>• Use AddMessage() for logging</p>
                  <p>• End with &quot;end.&quot;</p>
                </>
              )}
              {activeTab === 'blender' && (
                <>
                  <p>• Always import bpy first</p>
                  <p>• Check if objects exist before accessing</p>
                  <p>• Use bpy.context for active objects</p>
                  <p>• Use bpy.data for all data</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Technical Reference */}
        <div className="w-80 border-l border-slate-700/50 bg-slate-900/50 flex flex-col hidden lg:flex">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/20">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400" />
              Technical Inspector
            </h3>
            <span className="text-[10px] bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 uppercase tracking-tighter font-bold">Live</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 text-left">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search technical docs..."
                className="w-full bg-slate-950/50 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Contextual Reference Content */}
            <div className="space-y-4">
              {activeTab === 'papyrus' && (
                <>
                  <div className="group rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 hover:border-purple-500/30 transition-colors">
                    <div className="text-xs font-bold text-purple-300 mb-1 flex items-center justify-between">
                      OnQuestInit()
                      <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Fires when a quest starts for the first time. Excellent for initializing variables or starting timers.</p>
                  </div>
                  <div className="group rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 hover:border-purple-500/30 transition-colors">
                    <div className="text-xs font-bold text-purple-300 mb-1 flex items-center justify-between">
                      RegisterForRemoteEvent()
                      <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Allows this script to listen for events on other objects. Required for modern mod interactions.</p>
                  </div>
                </>
              )}

              {activeTab === 'xedit' && (
                <>
                  <div className="group rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 hover:border-amber-500/30 transition-colors">
                    <div className="text-xs font-bold text-amber-300 mb-1 flex items-center justify-between">
                      ReferencedBy()
                      <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Returns a list of all records that point to the current record. Essential for safe patching.</p>
                  </div>
                  <div className="group rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 hover:border-amber-500/30 transition-colors">
                    <div className="text-xs font-bold text-amber-300 mb-1 flex items-center justify-between">
                      ElementByPath()
                      <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Direct access to nested fields using strings like "DATA\Value".</p>
                  </div>
                </>
              )}

              {activeTab === 'blender' && (
                <>
                  <div className="group rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 hover:border-blue-500/30 transition-colors">
                    <div className="text-xs font-bold text-blue-300 mb-1 flex items-center justify-between">
                      bpy.ops.wm.call_menu()
                      <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Invokes UI menus programmatically. Useful for multi-tool scripts.</p>
                  </div>
                  <div className="group rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 hover:border-blue-500/30 transition-colors">
                    <div className="text-xs font-bold text-blue-300 mb-1 flex items-center justify-between">
                      depsgraph_get()
                      <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Access evaluated data (meshes with modifiers applied) for real-time exports.</p>
                  </div>
                </>
              )}
            </div>

            {/* Wiki Quick Link */}
            <div className="pt-4 border-t border-slate-700/50">
              <button 
                onClick={() => openUrl(activeTab === 'papyrus' ? 'https://www.creationkit.com/fallout4/index.php?title=Category:Papyrus' : 'https://tes5edit.github.io/docs/')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold border border-slate-700 shadow-sm transition-all"
              >
                <BookOpen className="w-3 h-3" />
                Open Wiki Index
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-950/20 text-[10px] text-slate-500 border-t border-slate-700/30 italic">
            Technical Inspector provides context-aware documentation links for the current scripting environment.
          </div>
        </div>
      </div>
    </div>
  );
};

