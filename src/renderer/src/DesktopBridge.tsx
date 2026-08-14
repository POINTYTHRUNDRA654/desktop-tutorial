import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Link as RouterLink } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Monitor, CheckCircle2, Wifi, Shield, Cpu, Terminal, Power, Layers, Box, Code, Image as ImageIcon, MessageSquare, Activity, RefreshCw, Lock, AlertOctagon, Link, Zap, Eye, Globe, Database, Wrench, FolderOpen, HardDrive, ArrowRightLeft, ArrowRight, Keyboard, Server, Clipboard, HelpCircle, AlertTriangle, Settings, Search, ExternalLink, Download, X, Plug } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useWheelScrollProxy } from './components/useWheelScrollProxy';
import { openExternal } from './utils/openExternal';
import { BridgeRegistry } from './bridges/BridgeRegistry';
import type { BridgeInfo } from './bridges/BridgeBase';
import { bridgeFetch } from './lib/bridgeClient';

interface LogEntry {
    id: string;
    timestamp: string;
    source: string;
    event: string;
    status: 'ok' | 'warn' | 'err' | 'success';
}

// helper that returns raw ArrayBuffer for the ZIP. exported for tests.
export const fetchBlenderAddon = async (): Promise<ArrayBuffer> => {
    const base = import.meta.env.BASE_URL || '/';
    const candidates = [`${base}mossy-blender-addons.zip`, `${base}public/mossy-blender-addons.zip`];

    for (const url of candidates) {
        try {
            const resp = await fetch(url);
            if (resp.ok) {
                return await resp.arrayBuffer();
            }
        } catch {
            // ignore and try next candidate
        }
    }

    // last resort: ask Electron main process for the blob (base64 encoded)
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (api?.readBlenderZip) {
        console.log('[DesktopBridge] falling back to electron.readBlenderZip()');
        try {
            const b64: string = await api.readBlenderZip();
            const byteString = atob(b64);
            const arr = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
                arr[i] = byteString.charCodeAt(i);
            }
            return arr.buffer;
        } catch (e) {
            console.warn('Electron API readBlenderZip failed:', e);
        }
    }

    throw new Error('Failed to fetch Blender add-on ZIP');
};

const DesktopBridge: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>(() => {
        try {
            const saved = localStorage.getItem('mossy_bridge_logs');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const logEndRef = useRef<HTMLDivElement>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const onWheel = useWheelScrollProxy(mainScrollRef);

    const [bridgeConnected, setBridgeConnected] = useState(false);
    const [bridgeVersion, setBridgeVersion] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showBlenderTutorial, setShowBlenderTutorial] = useState(false);
    const [blenderTutorialContent, setBlenderTutorialContent] = useState<string>('');
    const [blenderTutorialLoading, setBlenderTutorialLoading] = useState(false);

    // Real bridge testing state
    const [testingBridge, setTestingBridge] = useState(false);
    const [hardwareInfo, setHardwareInfo] = useState<any>(null);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [clipboardText, setClipboardText] = useState('');
    const [filePath, setFilePath] = useState('C:\\');
    const [fileList, setFileList] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'setup' | 'ck' | 'hardware' | 'vision' | 'clipboard' | 'files' | 'blender' | 'bridges'>('setup');
    const [blenderLinked, setBlenderLinked] = useState(localStorage.getItem('mossy_blender_active') === 'true');
    const [blenderLinkToken, setBlenderLinkToken] = useState<string>('');
    const [tokenCopyFeedback, setTokenCopyFeedback] = useState<string>('');
    const [showTokenModal, setShowTokenModal] = useState(false);

    // Bridge registry state — re-renders when bridges register or change status
    const [registeredBridges, setRegisteredBridges] = useState<BridgeInfo[]>(() =>
        BridgeRegistry.getAll().map(b => b.getInfo())
    );
    useEffect(() => {
        const refresh = () => setRegisteredBridges(BridgeRegistry.getAll().map(b => b.getInfo()));
        window.addEventListener('mossy-bridge-registered', refresh);
        window.addEventListener('mossy-bridge-status-changed', refresh);
        return () => {
            window.removeEventListener('mossy-bridge-registered', refresh);
            window.removeEventListener('mossy-bridge-status-changed', refresh);
        };
    }, []);

    const [addonMissing, setAddonMissing] = useState(false);

    // check for presence of the Blender add-on ZIP at startup (try both possible paths)
    useEffect(() => {
        const base = import.meta.env.BASE_URL || '/';
        const candidates = [
            `${base}mossy-blender-addons.zip`,
            `${base}public/mossy-blender-addons.zip`
        ];
        Promise.all(candidates.map((u) => fetch(u, { method: 'HEAD' }).then(r => r.ok).catch(() => false)))
            .then(results => {
                if (!results.some(Boolean)) setAddonMissing(true);
            });
    }, []);

    const [blenderAddonAutoDetected, setBlenderAddonAutoDetected] = useState(false);
    const [blenderContext, setBlenderContext] = useState<any | null>(null);
    const [blenderContextRaw, setBlenderContextRaw] = useState<string>('');
    const [blenderContextError, setBlenderContextError] = useState<string>('');
    const [blenderExportPath, setBlenderExportPath] = useState<string>('');
    const [blenderExportStatus, setBlenderExportStatus] = useState<string>('');
    const [blenderExportProfile, setBlenderExportProfile] = useState<'obj_outfit' | 'fbx_anim'>('obj_outfit');
    const [deepSeekInputPath, setDeepSeekInputPath] = useState<string>('');
    const [deepSeekOutputDir, setDeepSeekOutputDir] = useState<string>('');
    const [deepSeekRepoPath, setDeepSeekRepoPath] = useState<string>('');
    const [deepSeekPythonPath, setDeepSeekPythonPath] = useState<string>('');
    const [deepSeekPrompt, setDeepSeekPrompt] = useState<string>('<|grounding|>Convert the document to markdown.');
    const [deepSeekStatus, setDeepSeekStatus] = useState<string>('');
    const [deepSeekBusy, setDeepSeekBusy] = useState<boolean>(false);
    const [tripoInputPath, setTripoInputPath] = useState<string>('');
    const [tripoOutputDir, setTripoOutputDir] = useState<string>('');
    const [tripoRepoPath, setTripoRepoPath] = useState<string>('');
    const [tripoPythonPath, setTripoPythonPath] = useState<string>('');
    const [tripoPrompt, setTripoPrompt] = useState<string>('a Fallout 4 compatible hard-surface game asset');
    const [tripoFaces, setTripoFaces] = useState<string>('5000');
    const [tripoMode, setTripoMode] = useState<'image' | 'scribble'>('image');
    const [tripoStatus, setTripoStatus] = useState<string>('');
    const [tripoBusy, setTripoBusy] = useState<boolean>(false);

    const [havokToolsUrl, setHavokToolsUrl] = useState<string>(() => {
        try {
            return localStorage.getItem('mossy_havok_tools_url') || '';
        } catch {
            return '';
        }
    });

    type CustomToolLink = { name: string; url: string; credit?: string };

    const [customToolLinks, setCustomToolLinks] = useState<CustomToolLink[]>(() => {
        try {
            const raw = localStorage.getItem('mossy_custom_tool_links');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });

    const [newToolName, setNewToolName] = useState('');
    const [newToolUrl, setNewToolUrl] = useState('');
    const [newToolCredit, setNewToolCredit] = useState('');

    // --- Linked Directories ---
    type LinkedDirectory = { name: string; path: string };

    const [linkedDirectories, setLinkedDirectories] = useState<LinkedDirectory[]>(() => {
        try {
            const raw = localStorage.getItem('mossy_linked_directories');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && Array.isArray(parsed)) return parsed;

            // No saved directories yet — start with an empty list
            return [];
        } catch {
            return [];
        }
    });

    const [newDirName, setNewDirName] = useState('');
    const [newDirPath, setNewDirPath] = useState('');

    // --- Creation Kit / Papyrus ---
    const [ckSettings, setCkSettings] = useState<{
        creationKitPath: string;
        fallout4Path: string;
        papyrusCompilerPath: string;
        papyrusFlagsPath: string;
        papyrusImportPaths: string;
        papyrusSourcePath: string;
        papyrusOutputPath: string;
    }>({
        creationKitPath: '',
        fallout4Path: '',
        papyrusCompilerPath: '',
        papyrusFlagsPath: '',
        papyrusImportPaths: '',
        papyrusSourcePath: '',
        papyrusOutputPath: '',
    });

    const [ckBusy, setCkBusy] = useState(false);
    const [ckStatus, setCkStatus] = useState('');
    const [ckScriptName, setCkScriptName] = useState('MyQuestScript');
    const [ckScriptExtends, setCkScriptExtends] = useState('Quest');
    const [ckScriptTemplate, setCkScriptTemplate] = useState<'quest' | 'objectref' | 'actor' | 'activemagiceffect' | 'refalias' | 'blank'>('quest');
    const [ckAutoSetExtends, setCkAutoSetExtends] = useState(true);
    const [ckScriptBody, setCkScriptBody] = useState('Scriptname MyQuestScript extends Quest\n\nEvent OnInit()\nEndEvent\n');
    const [ckCompileResult, setCkCompileResult] = useState<{ exitCode: number; stdout: string; stderr: string } | null>(null);
    const [ckPathChecks, setCkPathChecks] = useState<Record<string, { exists: boolean; isFile: boolean; isDirectory: boolean }>>({});
    const [papyrusFlags, setPapyrusFlags] = useState({ release: true, optimize: true, final: false, quiet: false });

    type PapyrusSavedTemplate = {
        id: string;
        title: string;
        description?: string;
        author?: string;
        scriptName: string;
        extendsType: string;
        templateKind?: string;
        body: string;
        createdAt: string;
        updatedAt: string;
    };

    const [papyrusLibrary, setPapyrusLibrary] = useState<PapyrusSavedTemplate[]>([]);
    const [papyrusLibrarySelectedId, setPapyrusLibrarySelectedId] = useState<string>('');
    const [papyrusLibraryTitle, setPapyrusLibraryTitle] = useState<string>('');
    const [papyrusLibraryDescription, setPapyrusLibraryDescription] = useState<string>('');
    const [papyrusLibraryAuthor, setPapyrusLibraryAuthor] = useState<string>('');
    const [papyrusLibraryImportText, setPapyrusLibraryImportText] = useState<string>('');

    const setupCardRef = useRef<HTMLDivElement>(null);
    const ckCardRef = useRef<HTMLDivElement>(null);
    const blenderCardRef = useRef<HTMLDivElement>(null);
    const hardwareCardRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const el = logEndRef.current as any;
        if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    // Auto-detect Blender add-on on startup (check port 9999)
    useEffect(() => {
        const autoDetectBlender = async () => {
            if (typeof window.electronAPI?.checkBlenderAddon === 'function') {
                try {
                    const result = await window.electronAPI.checkBlenderAddon();
                    if (result.connected === true) {
                        localStorage.setItem('mossy_blender_active', 'true');
                        setBlenderLinked(true);
                        setBlenderAddonAutoDetected(true);
                        window.dispatchEvent(new CustomEvent('mossy-blender-linked', { detail: true }));
                        addLog('System', 'Auto-detected: Blender add-on found on port 9999. Neural Link active!', 'success');
                    }
                } catch (e) {
                    console.error('Error auto-detecting Blender addon:', e);
                }
            }
        };

        autoDetectBlender();
    }, []);

    const normalizeHttpUrl = (raw: string): string => {
        const s = (raw || '').trim();
        if (!s) return '';
        if (s.startsWith('http://') || s.startsWith('https://')) return s;
        return '';
    };

    const getElectronApi = () => (window as any).electronAPI || (window as any).electron?.api;

    const loadCkSettings = async () => {
        try {
            const api = getElectronApi();
            if (!api?.getSettings) return;
            const s = await api.getSettings();
            setCkSettings({
                creationKitPath: String(s?.creationKitPath || ''),
                fallout4Path: String(s?.fallout4Path || ''),
                papyrusCompilerPath: String(s?.papyrusCompilerPath || ''),
                papyrusFlagsPath: String(s?.papyrusFlagsPath || ''),
                papyrusImportPaths: String(s?.papyrusImportPaths || ''),
                papyrusSourcePath: String(s?.papyrusSourcePath || ''),
                papyrusOutputPath: String(s?.papyrusOutputPath || ''),
            });

            const lib = Array.isArray(s?.papyrusTemplateLibrary) ? s.papyrusTemplateLibrary : [];
            setPapyrusLibrary(lib);
        } catch (e: any) {
            setCkStatus(String(e?.message || e));
        }
    };

    const saveCkSettings = async () => {
        try {
            const api = getElectronApi();
            if (!api?.setSettings) {
                setCkStatus('Settings API not available (are you in the Electron desktop app?).');
                return;
            }
            await api.setSettings({
                creationKitPath: ckSettings.creationKitPath,
                fallout4Path: ckSettings.fallout4Path,
                papyrusCompilerPath: ckSettings.papyrusCompilerPath,
                papyrusFlagsPath: ckSettings.papyrusFlagsPath,
                papyrusImportPaths: ckSettings.papyrusImportPaths,
                papyrusSourcePath: ckSettings.papyrusSourcePath,
                papyrusOutputPath: ckSettings.papyrusOutputPath,
                papyrusTemplateLibrary: papyrusLibrary,
            });
            setCkStatus('Saved.');
        } catch (e: any) {
            setCkStatus(String(e?.message || e));
        }
    };

    const savePapyrusLibrary = async (nextLibrary: PapyrusSavedTemplate[]) => {
        try {
            const api = getElectronApi();
            if (!api?.setSettings) {
                setCkStatus('Settings API not available (are you in the Electron desktop app?).');
                return;
            }
            await api.setSettings({ papyrusTemplateLibrary: nextLibrary });
        } catch (e: any) {
            setCkStatus(String(e?.message || e));
        }
    };

    const loadBlenderToken = async () => {
        try {
            const api = getElectronApi();
            if (!api?.getSettings) return;
            const s = await api.getSettings();
            if (s?.blenderLinkToken) {
                setBlenderLinkToken(s.blenderLinkToken);
            }
        } catch (e: any) {
            console.warn('[DesktopBridge] Failed to load blenderLinkToken:', e);
        }
    };

    const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const normalizePapyrusTemplate = (raw: any): PapyrusSavedTemplate | null => {
        if (!raw || typeof raw !== 'object') return null;
        const id = String(raw.id || '').trim() || newId();
        const title = String(raw.title || '').trim();
        const scriptName = String(raw.scriptName || '').trim();
        const extendsType = String(raw.extendsType || '').trim();
        const body = String(raw.body || '');
        if (!title || !scriptName || !extendsType || !body) return null;
        const createdAt = String(raw.createdAt || new Date().toISOString());
        const updatedAt = String(raw.updatedAt || new Date().toISOString());
        const description = raw.description ? String(raw.description) : undefined;
        const author = raw.author ? String(raw.author) : undefined;
        const templateKind = raw.templateKind ? String(raw.templateKind) : undefined;
        return { id, title, description, author, scriptName, extendsType, templateKind, body, createdAt, updatedAt };
    };

    const upsertLibraryTemplate = async (template: PapyrusSavedTemplate) => {
        const now = new Date().toISOString();
        const next: PapyrusSavedTemplate[] = (() => {
            const idx = papyrusLibrary.findIndex((t) => t.id === template.id);
            if (idx === -1) {
                return [{ ...template, createdAt: template.createdAt || now, updatedAt: now }, ...papyrusLibrary];
            }
            const copy = [...papyrusLibrary];
            copy[idx] = { ...copy[idx], ...template, updatedAt: now };
            return copy;
        })();
        setPapyrusLibrary(next);
        await savePapyrusLibrary(next);
    };

    const deleteLibraryTemplate = async (id: string) => {
        const next = papyrusLibrary.filter((t) => t.id !== id);
        setPapyrusLibrary(next);
        setPapyrusLibrarySelectedId('');
        await savePapyrusLibrary(next);
    };

    const applyLibraryTemplate = (id: string) => {
        const t = papyrusLibrary.find((x) => x.id === id);
        if (!t) return;
        setCkScriptName(t.scriptName);
        setCkScriptExtends(t.extendsType);
        if (t.templateKind && ['quest', 'objectref', 'actor', 'activemagiceffect', 'refalias', 'blank'].includes(t.templateKind)) {
            setCkScriptTemplate(t.templateKind as any);
        }
        setCkScriptBody(t.body);
        setCkStatus(`Loaded template: ${t.title}`);
    };

    const exportPapyrusLibraryJson = () => {
        return JSON.stringify(papyrusLibrary, null, 2);
    };

    const importPapyrusLibraryJson = async (rawText?: string) => {
        try {
            const raw = String(rawText ?? papyrusLibraryImportText).trim();
            if (!raw) {
                setCkStatus('Paste JSON to import first.');
                return;
            }

            const parsed = JSON.parse(raw);
            const arr = Array.isArray(parsed)
                ? parsed
                : (Array.isArray(parsed?.templates) ? parsed.templates : null);

            if (!arr) {
                setCkStatus('Import JSON must be an array of templates (or { templates: [...] }).');
                return;
            }

            const normalized: PapyrusSavedTemplate[] = [];
            for (const item of arr) {
                const t = normalizePapyrusTemplate(item);
                if (t) normalized.push(t);
            }

            if (normalized.length === 0) {
                setCkStatus('No valid templates found in import JSON.');
                return;
            }

            const byId = new Map(papyrusLibrary.map((t) => [t.id, t] as const));
            for (const t of normalized) {
                byId.set(t.id, { ...byId.get(t.id), ...t });
            }
            const next = Array.from(byId.values()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
            setPapyrusLibrary(next);
            await savePapyrusLibrary(next);
            setCkStatus(`Imported ${normalized.length} template(s).`);
        } catch (e: any) {
            setCkStatus(`Import failed: ${String(e?.message || e)}`);
        }
    };

    const joinPath = (a: string, b: string) => {
        const left = (a || '').trim();
        const right = (b || '').trim();
        if (!left) return right;
        if (!right) return left;
        if (left.endsWith('\\') || left.endsWith('/')) return `${left}${right}`;
        return `${left}\\${right}`;
    };

    const getPscScriptPath = () => {
        const baseName = (ckScriptName || '').trim().replace(/\.psc$/i, '');
        if (!baseName) return '';
        if (!ckSettings.papyrusSourcePath.trim()) return '';
        return joinPath(ckSettings.papyrusSourcePath, `${baseName}.psc`);
    };

    const toPapyrusIdentifier = (raw: string) => {
        const base = (raw || '').trim().replace(/\.psc$/i, '');
        // Papyrus script names are typically alnum + underscore.
        const cleaned = base.replace(/[^A-Za-z0-9_]/g, '');
        return cleaned;
    };

    const upsertPapyrusHeader = (body: string, scriptName: string, extendsType: string) => {
        const name = toPapyrusIdentifier(scriptName) || 'MyScript';
        const ext = (extendsType || '').trim() || 'Quest';
        const header = `Scriptname ${name} extends ${ext}`;
        const normalized = String(body || '').replace(/\r\n/g, '\n');
        const lines = normalized.split('\n');
        const idx = lines.findIndex((l) => /^\s*Scriptname\b/i.test(l));
        if (idx === -1) {
            return [header, '', ...lines].join('\n').trimEnd() + '\n';
        }
        const next = [...lines];
        next[idx] = header;
        return next.join('\n');
    };

    const buildPapyrusTemplate = (template: typeof ckScriptTemplate, scriptName: string, extendsType: string) => {
        const name = toPapyrusIdentifier(scriptName) || 'MyScript';
        const ext = (extendsType || '').trim() || 'Quest';
        const header = `Scriptname ${name} extends ${ext}`;

        switch (template) {
            case 'blank':
                return `${header}\n\n`;
            case 'quest':
                return `${header}\n\nEvent OnInit()\nEndEvent\n`;
            case 'objectref':
                return `${header}\n\nEvent OnInit()\nEndEvent\n\nEvent OnActivate(ObjectReference akActionRef)\nEndEvent\n`;
            case 'actor':
                return `${header}\n\nEvent OnInit()\nEndEvent\n\nEvent OnDeath(Actor akKiller)\nEndEvent\n`;
            case 'activemagiceffect':
                return `${header}\n\nEvent OnEffectStart(Actor akTarget, Actor akCaster)\nEndEvent\n\nEvent OnEffectFinish(Actor akTarget, Actor akCaster)\nEndEvent\n`;
            case 'refalias':
                return `${header}\n\nEvent OnInit()\nEndEvent\n`;
            default:
                return `${header}\n\n`;
        }
    };

    const defaultExtendsForTemplate = (template: typeof ckScriptTemplate) => {
        switch (template) {
            case 'quest':
                return 'Quest';
            case 'objectref':
                return 'ObjectReference';
            case 'actor':
                return 'Actor';
            case 'activemagiceffect':
                return 'ActiveMagicEffect';
            case 'refalias':
                return 'ReferenceAlias';
            case 'blank':
            default:
                return '';
        }
    };

    const validateCkPaths = async () => {
        const api = getElectronApi();
        if (!api?.fsStat) {
            setCkStatus('fsStat API not available.');
            return;
        }

        const candidates: Array<[string, string, 'file' | 'dir' | 'either']> = [
            ['CreationKit', ckSettings.creationKitPath, 'file'],
            ['Fallout4', ckSettings.fallout4Path, 'dir'],
            ['PapyrusCompiler', ckSettings.papyrusCompilerPath, 'file'],
            ['PapyrusFlags', ckSettings.papyrusFlagsPath, 'file'],
            ['PapyrusSource', ckSettings.papyrusSourcePath, 'dir'],
            ['PapyrusOutput', ckSettings.papyrusOutputPath, 'dir'],
        ];

        const next: Record<string, { exists: boolean; isFile: boolean; isDirectory: boolean }> = {};
        for (const [key, pathValue] of candidates) {
            const p = (pathValue || '').trim();
            if (!p) continue;
            next[key] = await api.fsStat(p);
        }
        setCkPathChecks(next);
    };

    const writePapyrusScript = async () => {
        const api = getElectronApi();
        if (!api?.writeFile) {
            setCkStatus('File write API not available.');
            return;
        }

        const target = getPscScriptPath();
        if (!target) {
            setCkStatus('Set Papyrus Source Path and a script name first.');
            return;
        }

        setCkBusy(true);
        setCkStatus('Writing .psc...');
        try {
            const ok = await api.writeFile(target, ckScriptBody);
            if (!ok) {
                setCkStatus('Write failed.');
                return;
            }
            setCkStatus(`Wrote: ${target}`);
            addLog('CK', `Wrote ${target}`, 'success');
        } catch (e: any) {
            setCkStatus(String(e?.message || e));
        } finally {
            setCkBusy(false);
        }
    };

    const compilePapyrusScript = async () => {
        const api = getElectronApi();
        if (!api?.runPapyrusCompiler) {
            setCkStatus('Papyrus compile API not available.');
            return;
        }

        const target = getPscScriptPath();
        if (!target) {
            setCkStatus('Set Papyrus Source Path and a script name first.');
            return;
        }
        if (!ckSettings.papyrusCompilerPath.trim()) {
            setCkStatus('Set Papyrus Compiler Path first.');
            return;
        }

        setCkBusy(true);
        setCkStatus('Compiling...');
        setCkCompileResult(null);
        try {
            const result = await api.runPapyrusCompiler(target, {
                compilerPath: ckSettings.papyrusCompilerPath,
                flagsPath: ckSettings.papyrusFlagsPath,
                importPaths: ckSettings.papyrusImportPaths,
                outputPath: ckSettings.papyrusOutputPath,
                release: papyrusFlags.release,
                optimize: papyrusFlags.optimize,
                final: papyrusFlags.final,
                quiet: papyrusFlags.quiet,
            });
            setCkCompileResult(result);
            setCkStatus(result.exitCode === 0 ? 'Compile OK.' : `Compile failed (exit ${result.exitCode}).`);
            addLog('Papyrus', result.exitCode === 0 ? 'Compile OK' : `Compile failed (${result.exitCode})`, result.exitCode === 0 ? 'success' : 'err');
        } catch (e: any) {
            setCkStatus(String(e?.message || e));
        } finally {
            setCkBusy(false);
        }
    };

    useEffect(() => {
        try {
            localStorage.setItem('mossy_havok_tools_url', havokToolsUrl);
        } catch {
            // ignore
        }
    }, [havokToolsUrl]);

    useEffect(() => {
        try {
            localStorage.setItem('mossy_custom_tool_links', JSON.stringify(customToolLinks));
        } catch {
            // ignore
        }
    }, [customToolLinks]);

    // Load Blender Link token from settings on component mount
    useEffect(() => {
        loadBlenderToken();
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('mossy_linked_directories', JSON.stringify(linkedDirectories));
        } catch {
            // ignore
        }
    }, [linkedDirectories]);

    // Sync logs and check connection from LocalStorage (Updated by SystemBus)
    // OPTIMIZED: Only poll infrequently, and only when NOT viewing the Blender tab to avoid UI lockup
    useEffect(() => {
        const syncState = () => {
            try {
                const savedLogs = localStorage.getItem('mossy_bridge_logs');
                if (savedLogs) {
                    const parsed = JSON.parse(savedLogs);
                    setLogs(prev => JSON.stringify(prev) === JSON.stringify(parsed) ? prev : parsed);
                }

                const active = localStorage.getItem('mossy_bridge_active') === 'true';
                setBridgeConnected(prev => prev === active ? prev : active);

                const ver = localStorage.getItem('mossy_bridge_version');
                setBridgeVersion(prev => prev === ver ? prev : ver);

                const bLinked = localStorage.getItem('mossy_blender_active') === 'true';
                setBlenderLinked(prev => prev === bLinked ? prev : bLinked);
            } catch (e) {
                console.error('Failed to sync bridge state:', e);
            }
        };

        syncState(); // Initial check
        window.addEventListener('storage', syncState);
        window.addEventListener('mossy-bridge-connected', syncState);

        // Only poll every 7 seconds when NOT on Blender tab (to avoid freezing that tab with constant updates)
        // When on Blender tab, rely on manual button clicks (Scan Scene, Disconnect, etc)
        const pollInterval = activeTab === 'blender' ? null : setInterval(syncState, 7000);

        return () => {
            window.removeEventListener('storage', syncState);
            window.removeEventListener('mossy-bridge-connected', syncState);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [activeTab]);

    useEffect(() => {
        void loadCkSettings();
        try {
            const api = getElectronApi();
            if (api?.onSettingsUpdated) {
                const unsub = api.onSettingsUpdated((s: any) => {
                    setCkSettings({
                        creationKitPath: String(s?.creationKitPath || ''),
                        fallout4Path: String(s?.fallout4Path || ''),
                        papyrusCompilerPath: String(s?.papyrusCompilerPath || ''),
                        papyrusFlagsPath: String(s?.papyrusFlagsPath || ''),
                        papyrusImportPaths: String(s?.papyrusImportPaths || ''),
                        papyrusSourcePath: String(s?.papyrusSourcePath || ''),
                        papyrusOutputPath: String(s?.papyrusOutputPath || ''),
                    });

                    const lib = Array.isArray(s?.papyrusTemplateLibrary) ? s.papyrusTemplateLibrary : [];
                    setPapyrusLibrary(lib);
                });
                return () => unsub?.();
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        const next = upsertPapyrusHeader(ckScriptBody, ckScriptName, ckScriptExtends);
        if (next !== ckScriptBody) setCkScriptBody(next);
    }, [ckScriptName, ckScriptExtends]);

    // Process Heartbeat - Automatically detect Blender/Tools
    // OPTIMIZED: Only check when NOT on Blender tab to avoid constant polling that freezes the UI
    useEffect(() => {
        if (activeTab === 'blender') {
            // Skip auto-detection while viewing Blender tab (user can manually click buttons)
            return;
        }

        const heartbeat = async () => {
            const isBlenderRunning = await checkBlenderProcess();
            const currentStatus = localStorage.getItem('mossy_blender_active') === 'true';

            if (isBlenderRunning !== currentStatus) {
                localStorage.setItem('mossy_blender_active', isBlenderRunning ? 'true' : 'false');
                setBlenderLinked(isBlenderRunning);
                window.dispatchEvent(new CustomEvent('mossy-blender-linked', { detail: isBlenderRunning }));

                if (isBlenderRunning) {
                    addLog('System', 'Blender add-on connected! (Port 9999 active)', 'success');
                } else {
                    addLog('System', 'Blender add-on disconnected. (Enable toggle in Blender)', 'warn');
                }
            }
        };

        const interval = setInterval(heartbeat, 5000); // Check every 5 seconds
        heartbeat(); // Initial check

        return () => clearInterval(interval);
    }, [activeTab]);

    // ── Main bridge liveness heartbeat ──────────────────────────────────────
    // Probes /health every 10 s and clears mossy_bridge_active if the server
    // has gone away — prevents the UI from showing a stale "Online" badge.
    useEffect(() => {
        const probeBridge = async () => {
            try {
                const controller = new AbortController();
                const tid = setTimeout(() => controller.abort(), 2000);
                const res = await bridgeFetch('/health', { signal: controller.signal });
                clearTimeout(tid);
                if (res.ok) {
                    try { localStorage.setItem('mossy_bridge_active', 'true'); } catch { /* ignore */ }
                    setBridgeConnected(true);
                } else {
                    throw new Error(`HTTP ${res.status}`);
                }
            } catch {
                // Only mark offline if we previously thought it was online
                const wasOnline = (() => {
                    try { return localStorage.getItem('mossy_bridge_active') === 'true'; } catch { return false; }
                })();
                if (wasOnline) {
                    try { localStorage.setItem('mossy_bridge_active', 'false'); } catch { /* ignore */ }
                    setBridgeConnected(false);
                }
            }
        };

        const interval = setInterval(probeBridge, 10_000);
        // Run once immediately so the badge is accurate on first render
        void probeBridge();

        return () => clearInterval(interval);
    }, []);

    // ── Blender Token Sync ─────────────────────────────────────────────────
    // Save token to settings when changed
    const saveBlenderToken = async (token: string) => {
        try {
            const api = getElectronApi();
            if (!api?.setSettings) return;
            await api.setSettings({ blenderLinkToken: token });
        } catch (e) {
            console.warn('[DesktopBridge] Failed to save blenderLinkToken:', e);
        }
    };

    // Send a command to Blender add-on with authentication token
    const sendBlenderCommandWithToken = async (commandType: string, commandData?: any): Promise<any> => {
        try {
            const api = getElectronApi();
            if (!api?.sendBlenderCommand) {
                throw new Error('Blender command API not available');
            }
            return await api.sendBlenderCommand(commandType, commandData || {}, blenderLinkToken || undefined);
        } catch (e: any) {
            console.error('[DesktopBridge] Blender command error:', e?.message);
            return { success: false, status: 'error', message: String(e?.message || e) };
        }
    };

    // Copy Blender Link token to clipboard
    const copyTokenToClipboard = async () => {
        try {
            if (!blenderLinkToken) {
                setTokenCopyFeedback('No token to copy');
                setTimeout(() => setTokenCopyFeedback(''), 2000);
                return;
            }
            await navigator.clipboard.writeText(blenderLinkToken);
            setTokenCopyFeedback('✓ Token copied to clipboard!');
            setTimeout(() => setTokenCopyFeedback(''), 2000);
        } catch (e) {
            setTokenCopyFeedback('Failed to copy');
            setTimeout(() => setTokenCopyFeedback(''), 2000);
        }
    };

    // Regenerate Blender Link token
    const regenerateToken = async () => {
        try {
            const api = getElectronApi();
            if (!api?.invokeBlenderTokenRegen) {
                console.warn('Cannot regenerate token - API not available');
                return;
            }
            const newToken = await api.invokeBlenderTokenRegen?.();
            if (newToken) {
                setBlenderLinkToken(newToken);
                setShowTokenModal(true);
                addLog('System', '🔐 New Blender Link token generated. Copy it to Blender preferences.', 'success');
            }
        } catch (e: any) {
            console.error('Token regeneration failed:', e);
            addLog('System', `Token regeneration failed: ${e?.message || e}`, 'err');
        }
    };


    // Legacy Python-server download (mossy_server.py + start_mossy.bat) removed —
    // that path had no authentication at all and bound to 0.0.0.0 (all network
    // interfaces, not just loopback), which is strictly worse than the built-in
    // TypeScript bridge it duplicated. The built-in bridge (BridgeServer.ts) starts
    // automatically with the app — there is nothing left to download or run here.


    const handleDownloadAddon = async () => {
        // In development we don't ship the ZIP via Vite; warn early instead of
        // repeatedly failing.
        if (import.meta.env.DEV) {
            console.warn('[DesktopBridge] download disabled in DEV mode');
            addLog('System', 'Blender add-on download is disabled in development build', 'warn');
            toast.error('Cannot download add-on in development; build the app first.');
            return;
        }

        try {
            // use helper for fetch logic
            const buffer = await fetchBlenderAddon();

            const blob = new Blob([buffer], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mossy-blender-addons.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            addLog('System', 'Downloaded Blender Add-on package (mossy-blender-addons.zip)', 'success');
        } catch (error) {
            console.error('Failed to download Blender add-on ZIP:', error);
            const msg = import.meta.env.DEV
                ? 'Could not download add-on in development mode.'
                : 'Failed to download Blender add-on ZIP — ensure the app is fully built';
            console.error('Failed to download Blender add-on ZIP:', error);
            addLog('System', msg, 'err');
            toast.error('Could not download Blender add-on; see system log for details.');
        }
    };


    const addLog = (source: string, event: string, status: 'ok' | 'warn' | 'err' | 'success' = 'ok') => {
        const newLog = {
            id: Date.now().toString() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            source,
            event,
            status
        };

        setLogs(prev => {
            const next = [...prev.slice(-19), newLog];
            localStorage.setItem('mossy_bridge_logs', JSON.stringify(next));
            return next;
        });
    };

    // === REAL BRIDGE API TESTING FUNCTIONS ===

    const testBridgeConnection = async () => {
        setTestingBridge(true);
        addLog('Bridge', 'Testing connectivity to the Desktop Bridge...', 'ok');

        // Only one real target now: the built-in bridge, on its live discovered
        // port, authenticated with the internal token. There's no longer a
        // meaningful "custom URL" or fixed-port fallback to probe — see
        // bridgeClient.ts's module comment.
        let success = false;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500); // Fast fail

            const response = await bridgeFetch('/health', { signal: controller.signal });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                addLog('Bridge', `Connected! (v${data.version})`, 'success');
                setBridgeConnected(true);
                setBridgeVersion(data.version);
                localStorage.setItem('mossy_bridge_active', 'true');
                localStorage.setItem('mossy_bridge_version', data.version);
                success = true;
            }
        } catch (e) {
            console.warn('[DesktopBridge] Bridge health check failed', e);
        }

        if (!success) {
            addLog('Bridge', 'Connection failed: All endpoints unreachable.', 'err');
            addLog('Bridge', 'TROUBLESHOOTING: 1. Is Python server running? 2. Check Firewall. 3. Try running as Admin.', 'warn');
            setBridgeConnected(false);
            try { localStorage.setItem('mossy_bridge_active', 'false'); } catch { /* ignore */ }
        }

        setTestingBridge(false);
        return success;
    };

    const checkBlenderProcess = async () => {
        // Check if socket on port 9999 is listening (addon is active)
        if (typeof window.electronAPI?.checkBlenderAddon === 'function') {
            try {
                const result = await window.electronAPI.checkBlenderAddon();
                return result.connected === true;
            } catch (e) {
                console.error('Error checking for Blender addon socket:', e);
                return false;
            }
        }
        return false;
    };

    const testBlenderLink = async () => {
        addLog('System', 'Checking Blender add-on socket (port 9999)...', 'ok');

        const isBlenderRunning = await checkBlenderProcess();

        if (isBlenderRunning) {
            localStorage.setItem('mossy_blender_active', 'true');
            setBlenderLinked(true);
            window.dispatchEvent(new CustomEvent('mossy-blender-linked', { detail: true }));
            addLog('System', 'Blender add-on socket connected! Neural Link verified!', 'success');
            // Auto-clear previous context when reconnecting
            setBlenderContext(null);
            setBlenderContextRaw('');
            setBlenderContextError('');
        } else {
            localStorage.setItem('mossy_blender_active', 'false');
            setBlenderLinked(false);
            window.dispatchEvent(new CustomEvent('mossy-blender-linked', { detail: false }));
            addLog('System', 'Blender add-on not responding on port 9999.', 'warn');

            // Instruction for user
            addLog('System', 'Make sure: 1) Blender is open, 2) Add-on is installed, 3) Toggle is ON in Mossy panel', 'ok');
        }
    };

    const loadBlenderTutorial = async () => {
        setShowBlenderTutorial(true);
        setBlenderTutorialLoading(true);
        try {
            const base = import.meta.env.BASE_URL || '/';
            const candidates = [
                `${base}knowledge/MOSSY_LINK_BLENDER_ADDON_GUIDE.md`,
                `${base}public/knowledge/MOSSY_LINK_BLENDER_ADDON_GUIDE.md`,
            ];

            let content: string | null = null;
            for (const url of candidates) {
                try {
                    const resp = await fetch(url);
                    if (resp.ok) {
                        content = await resp.text();
                        break;
                    }
                } catch {
                    // try next candidate
                }
            }

            if (content) {
                setBlenderTutorialContent(content);
            } else {
                setBlenderTutorialContent('# Tutorial Not Found\n\nThe Blender add-on tutorial could not be loaded. Please ensure the knowledge base files are built.');
            }
        } catch (err) {
            console.error('Failed to load tutorial:', err);
            setBlenderTutorialContent('# Error Loading Tutorial\n\nFailed to load the tutorial content. Please try again.');
        } finally {
            setBlenderTutorialLoading(false);
        }
    };

    const openUrl = async (url: string) => {
        const normalized = normalizeHttpUrl(url);
        if (!normalized) return;
        try {
            await openExternal(normalized);
        } catch {
            // ignore
        }
    };

    const fetchBlenderContext = async () => {
        setBlenderContextError('');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

            try {
                const response = await bridgeFetch('/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'context' }),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    setBlenderContextError('Failed to fetch Blender context');
                    return;
                }

                const data = await response.json();
                const raw = String(data?.response || '');
                setBlenderContextRaw(raw);
                try {
                    const parsed = raw ? JSON.parse(raw) : null;
                    setBlenderContext(parsed);
                } catch {
                    setBlenderContext(null);
                }

                if (data?.status !== 'success') {
                    setBlenderContextError(String(data?.message || 'Failed to fetch Blender context'));
                } else {
                    addLog('Blender', 'Context snapshot retrieved', 'success');
                }
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') {
                setBlenderContextError('Connection timeout (3s)');
            } else {
                setBlenderContextError(String(e?.message || e));
            }
        }
    };

    const exportBlender = async () => {
        setBlenderContextError('');
        try {
            const filepath = (blenderExportPath || '').trim();
            if (!filepath) {
                setBlenderExportStatus('Set an output filepath first (e.g. .obj or .fbx).');
                return;
            }
            setBlenderExportStatus('Exporting via Blender add-on...');

            const payload =
                blenderExportProfile === 'obj_outfit'
                    ? { type: 'export_obj', filepath, use_selection: true }
                    : { type: 'export_fbx', filepath, use_selection: true, bake_anim: true };

            const response = await bridgeFetch('/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            const raw = String(data?.response || '');
            if (!response.ok || data?.status !== 'success') {
                setBlenderExportStatus(String(data?.message || 'Export failed'));
                addLog('Blender', `Export failed: ${String(data?.message || 'unknown')}`, 'err');
                return;
            }
            try {
                const parsed = raw ? JSON.parse(raw) : null;
                if (parsed?.ok === false) {
                    setBlenderExportStatus(`Export failed: ${parsed?.error || 'unknown error'}`);
                    addLog('Blender', `Export failed: ${parsed?.error || 'unknown'}`, 'err');
                    return;
                }
            } catch {
                // ignore
            }
            setBlenderExportStatus('Export command sent. Check Blender status bar / console for any errors.');
            addLog('Blender', 'Export triggered via add-on', 'success');
        } catch (e: any) {
            setBlenderExportStatus(String(e?.message || e));
            addLog('Blender', `Export error: ${String(e?.message || e)}`, 'err');
        }
    };

    const applyFo4SceneProfile = async () => {
        if (!blenderLinked) {
            setDeepSeekStatus('Blender link is offline. Connect Mossy Link first.');
            return;
        }
        setDeepSeekBusy(true);
        setDeepSeekStatus('Applying FO4 scene profile in Blender...');
        try {
            const setup = await sendBlenderCommandWithToken('run_automation', { preset: 'fo4_setup_scene' });
            const check = await sendBlenderCommandWithToken('run_automation', { preset: 'fo4_check' });

            const setupMsg = setup?.message || setup?.result || 'fo4_setup_scene sent';
            const checkMsg = check?.message || check?.result || 'fo4_check sent';
            setDeepSeekStatus(`FO4 profile applied. ${String(setupMsg)} | ${String(checkMsg)}`);
            addLog('Blender', 'Applied FO4 scene profile via Mossy Link', 'success');
        } catch (e: any) {
            setDeepSeekStatus(`FO4 profile apply failed: ${String(e?.message || e)}`);
            addLog('Blender', `FO4 profile apply failed: ${String(e?.message || e)}`, 'err');
        } finally {
            setDeepSeekBusy(false);
        }
    };

    const runDeepSeekFo4Profile = async (execute: boolean) => {
        if (!blenderLinked) {
            setDeepSeekStatus('Blender link is offline. Connect Mossy Link first.');
            return;
        }

        const inputPath = (deepSeekInputPath || '').trim();
        const outputDir = (deepSeekOutputDir || '').trim();
        if (!inputPath) {
            setDeepSeekStatus('Set an input image/PDF path first.');
            return;
        }
        if (!outputDir) {
            setDeepSeekStatus('Set an output directory first.');
            return;
        }

        setDeepSeekBusy(true);
        setDeepSeekStatus(execute ? 'Running DeepSeek-OCR-2 FO4 profile in Blender...' : 'Preparing DeepSeek-OCR-2 FO4 profile...');
        try {
            const response = await sendBlenderCommandWithToken('call_tool', {
                tool: 'deepseek-ocr2',
                action: 'run-fo4-profile',
                payload: {
                    input_path: inputPath,
                    output_dir: outputDir,
                    repo_path: (deepSeekRepoPath || '').trim() || undefined,
                    python_path: (deepSeekPythonPath || '').trim() || undefined,
                    prompt: (deepSeekPrompt || '').trim() || undefined,
                    execute,
                    fallout4_profile: true,
                },
            });

            const rawResult = response?.result;
            let parsed: any = rawResult;
            if (typeof rawResult === 'string') {
                try {
                    parsed = JSON.parse(rawResult);
                } catch {
                    parsed = { message: rawResult };
                }
            }

            const ok = Boolean(parsed?.success ?? response?.success);
            const message = parsed?.message || parsed?.status || parsed?.error || response?.message || 'Command finished.';
            setDeepSeekStatus(ok ? String(message) : `DeepSeek-OCR-2 failed: ${String(message)}`);
            addLog('Blender', ok ? 'DeepSeek-OCR-2 FO4 profile command finished' : `DeepSeek-OCR-2 FO4 profile failed: ${String(message)}`, ok ? 'success' : 'err');
        } catch (e: any) {
            setDeepSeekStatus(`DeepSeek-OCR-2 command failed: ${String(e?.message || e)}`);
            addLog('Blender', `DeepSeek-OCR-2 command failed: ${String(e?.message || e)}`, 'err');
        } finally {
            setDeepSeekBusy(false);
        }
    };

    const runTripoFo4Profile = async (execute: boolean) => {
        if (!blenderLinked) {
            setTripoStatus('Blender link is offline. Connect Mossy Link first.');
            return;
        }

        const inputPath = (tripoInputPath || '').trim();
        const outputDir = (tripoOutputDir || '').trim();
        if (!inputPath) {
            setTripoStatus('Set an input image path first.');
            return;
        }
        if (!outputDir) {
            setTripoStatus('Set an output directory first.');
            return;
        }

        const faces = Number.parseInt((tripoFaces || '').trim() || '0', 10);

        setTripoBusy(true);
        setTripoStatus(execute ? 'Running TripoSG FO4 profile in Blender...' : 'Preparing TripoSG FO4 profile...');
        try {
            const response = await sendBlenderCommandWithToken('call_tool', {
                tool: 'triposg',
                action: 'run-fo4-profile',
                payload: {
                    input_path: inputPath,
                    output_dir: outputDir,
                    repo_path: (tripoRepoPath || '').trim() || undefined,
                    python_path: (tripoPythonPath || '').trim() || undefined,
                    mode: tripoMode,
                    prompt: (tripoPrompt || '').trim() || undefined,
                    faces: Number.isFinite(faces) ? faces : 0,
                    execute,
                    fallout4_profile: true,
                },
            });

            const rawResult = response?.result;
            let parsed: any = rawResult;
            if (typeof rawResult === 'string') {
                try {
                    parsed = JSON.parse(rawResult);
                } catch {
                    parsed = { message: rawResult };
                }
            }

            const ok = Boolean(parsed?.success ?? response?.success);
            const message = parsed?.message || parsed?.status || parsed?.error || response?.message || 'Command finished.';
            setTripoStatus(ok ? String(message) : `TripoSG failed: ${String(message)}`);
            addLog('Blender', ok ? 'TripoSG FO4 profile command finished' : `TripoSG FO4 profile failed: ${String(message)}`, ok ? 'success' : 'err');
        } catch (e: any) {
            setTripoStatus(`TripoSG command failed: ${String(e?.message || e)}`);
            addLog('Blender', `TripoSG command failed: ${String(e?.message || e)}`, 'err');
        } finally {
            setTripoBusy(false);
        }
    };

    const fetchHardwareInfo = async () => {
        try {
            const response = await bridgeFetch('/hardware');
            if (response.ok) {
                const data = await response.json();
                setHardwareInfo(data);
                addLog('Hardware', 'System specs retrieved', 'success');
                return data;
            }
        } catch (e) {
            console.error('[DesktopBridge] fetchHardwareInfo failed', e);
            const message = e instanceof Error ? e.message : 'Unknown error';
            addLog('Hardware', `Failed to fetch specs: ${message}`, 'err');
        }
        return null;
    };

    const captureScreen = async () => {
        try {
            addLog('Vision', 'Requesting screenshot...', 'ok');
            const response = await bridgeFetch('/capture');
            if (response.ok) {
                const data = await response.json();
                setScreenshot(data.image);
                addLog('Vision', `Captured ${data.resolution}`, 'success');
                return data.image;
            }
        } catch (e) {
            console.error('[DesktopBridge] captureScreen failed', e);
            const message = e instanceof Error ? e.message : 'Unknown error';
            addLog('Vision', `Screen capture failed: ${message}`, 'err');
        }
        return null;
    };

    const setClipboard = async (text: string) => {
        try {
            const response = await bridgeFetch('/clipboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            if (response.ok) {
                addLog('Clipboard', 'Text copied to system clipboard', 'success');
                return true;
            }
        } catch (e) {
            console.error('[DesktopBridge] setClipboard failed', e);
            const message = e instanceof Error ? e.message : 'Unknown error';
            addLog('Clipboard', `Failed to set clipboard: ${message}`, 'err');
        }
        return false;
    };

    const listFiles = async (path: string) => {
        try {
            addLog('Files', `Scanning ${path}...`, 'ok');
            const response = await bridgeFetch('/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            if (response.ok) {
                const data = await response.json();
                setFileList(data.files);
                addLog('Files', `Found ${data.files.length} items`, 'success');
                return data.files;
            }
        } catch (e) {
            console.error('[DesktopBridge] listFiles failed', e);
            const message = e instanceof Error ? e.message : 'Unknown error';
            addLog('Files', `Directory scan failed: ${message}`, 'err');
        }
        return [];
    };

    const isOutdated = bridgeConnected && (!bridgeVersion || parseInt(bridgeVersion.split('.')[0]) < 5);

    return (
        <div className="h-full bg-[#050910] overflow-hidden flex flex-col min-h-0" onWheel={onWheel}>
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Monitor className="w-6 h-6 text-emerald-400" />
                        Desktop Bridge
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Local system integration (loopback-only, authenticated)</p>
                </div>
                <div className="flex items-center gap-4">
                    <RouterLink
                        to="/reference"
                        className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
                        title="Open help"
                    >
                        Help
                    </RouterLink>
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                        <div className={`w-2 h-2 rounded-full ${bridgeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-bold text-slate-300 uppercase">
                            {bridgeConnected ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>
                    {bridgeConnected && bridgeVersion && (
                        <div className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                            v{bridgeVersion}
                        </div>
                    )}
                    <button
                        onClick={testBridgeConnection}
                        disabled={testingBridge}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm flex items-center gap-2 transition-colors"
                    >
                        {testingBridge ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {testingBridge ? 'Testing...' : 'Test Connection'}
                    </button>
                </div>
            </div>

            {addonMissing && (
                <div className="p-4 mx-6 mt-2 rounded-lg bg-yellow-900/20 border border-yellow-700 text-yellow-200 text-sm text-center">
                    ⚠️ Blender add-on package is missing from the build. The download button below will
                    not work until you run <code>npm run predev</code> (development) or rebuild/package
                    the app. Refer to the README or developer docs for instructions.
                </div>
            )}

            {/* Scrollable content (everything below header) */}
            <div ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto pb-32">
                <div className="px-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToolsInstallVerifyPanel
                        accentClassName="text-emerald-300"
                        description="Desktop Bridge connects the UI to local capabilities (hardware info, screenshots, clipboard, file listing). The UI can render without it, but actions will fail if the local bridge server isn't reachable."
                        tools={[]}
                        verify={[
                            'Click Test Connection and confirm the status flips ONLINE (or shows a meaningful error).',
                            'Try one safe action: read clipboard text, or list a directory you have access to.',
                        ]}
                        firstTestLoop={[
                            'Open Setup tab and follow the on-screen server instructions for your machine.',
                            'Test Connection until ONLINE is stable.',
                            'Run one hardware scan and confirm the results render.',
                        ]}
                        troubleshooting={[
                            'If it stays OFFLINE, confirm the bridge server is running and the port is not blocked by firewall.',
                            'If you get timeouts, try localhost/127.0.0.1 consistency and restart the bridge process.',
                        ]}
                    />
                </div>

                {isOutdated && (
                    <div className="mx-6 mt-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-4 animate-bounce">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                        <div>
                            <h3 className="font-bold text-white">UPDATE REQUIRED</h3>
                            <p className="text-sm text-red-200">
                                You are connected to version {bridgeVersion || '?'}. Hardware scanning requires v5.0+.
                                <br />
                                <strong>Action:</strong> Download the new server script below.
                            </p>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-800 bg-slate-900 px-6 pt-4 gap-1">
                    {[
                        { id: 'setup', icon: Download, label: 'Setup' },
                        { id: 'ck', icon: Wrench, label: 'Creation Kit Link' },
                        { id: 'blender', icon: Box, label: 'Blender Link' },
                        { id: 'hardware', icon: Cpu, label: 'Hardware' },
                        { id: 'vision', icon: Eye, label: 'Vision' },
                        { id: 'clipboard', icon: Clipboard, label: 'Clipboard' },
                        { id: 'files', icon: FolderOpen, label: 'Files' },
                        { id: 'bridges', icon: Plug, label: `Bridges${registeredBridges.length > 0 ? ` (${registeredBridges.length})` : ''}` },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-3 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === tab.id
                                ? 'bg-slate-800 text-white border-t border-x border-slate-700'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-6 bg-slate-900/30">
                    {activeTab === 'setup' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Setup Instructions */}
                            <div
                                ref={setupCardRef}
                                className={`rounded-xl border p-6 ${bridgeConnected ? 'bg-emerald-900/10 border-emerald-500/50' : 'bg-slate-900 border-slate-700'
                                    }`}
                            >
                                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                                    <Server className={bridgeConnected ? 'text-emerald-400' : 'text-slate-400'} />
                                    Desktop Bridge
                                </h3>

                                {bridgeConnected ? (
                                    <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded">
                                        <div className="flex items-center gap-2 mb-2 font-bold text-emerald-400">
                                            <CheckCircle2 className="w-5 h-5" /> Bridge Active
                                        </div>
                                        <p className="text-sm text-emerald-300">The built-in Desktop Bridge is running and authenticated. All systems operational.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-black/40 rounded-lg border border-slate-700">
                                            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                                                <Keyboard className="w-4 h-4" /> Not connected
                                            </h4>
                                            <p className="text-sm text-slate-300">
                                                The Desktop Bridge is built into Mossy and starts automatically —
                                                there&apos;s nothing to download or run separately. If it&apos;s not
                                                showing as connected, click &quot;Test Connection&quot; above, or
                                                restart Mossy if that doesn&apos;t help.
                                            </p>
                                        </div>

                                        {showHelp && (
                                            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded">
                                                <h5 className="font-bold text-red-400 flex items-center gap-2 mb-2">
                                                    <AlertTriangle className="w-4 h-4" /> Common Issues
                                                </h5>
                                                <div className="space-y-3 text-sm text-slate-300">
                                                    <div>
                                                        <strong>Still shows disconnected after a Test Connection</strong>
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            Restart Mossy — the Bridge starts once at app launch. If it
                                                            keeps failing after a restart, check Windows Firewall isn&apos;t
                                                            blocking Mossy&apos;s loopback (127.0.0.1) connections.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setShowHelp(!showHelp)}
                                            className="text-sm text-blue-400 hover:text-white flex items-center gap-1"
                                        >
                                            <HelpCircle className="w-4 h-4" />
                                            {showHelp ? 'Hide' : 'Show'} Troubleshooting
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Event Log */}
                            <div className="bg-black border border-slate-800 rounded-xl flex flex-col overflow-hidden h-96">
                                <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Event Log
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${bridgeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        <span className={`text-[10px] ${bridgeConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {bridgeConnected ? 'LIVE' : 'OFFLINE'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                                    {logs.length === 0 && (
                                        <div className="text-slate-700 italic text-center mt-20">No events yet...</div>
                                    )}
                                    {logs.map(log => (
                                        <div key={log.id} className="flex gap-3 animate-fade-in">
                                            <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                                            <span className={`font-bold shrink-0 w-20 ${log.status === 'err' ? 'text-red-400' :
                                                log.status === 'success' ? 'text-emerald-400' :
                                                    'text-blue-400'
                                                }`}>{log.source}</span>
                                            <span className={`break-all ${log.status === 'warn' ? 'text-yellow-400' :
                                                log.status === 'err' ? 'text-red-400' :
                                                    log.status === 'success' ? 'text-emerald-400' :
                                                        'text-slate-300'
                                                }`}>{log.event}</span>
                                        </div>
                                    ))}
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ck' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div ref={ckCardRef} className="rounded-xl border border-emerald-500/30 bg-emerald-900/10 p-6">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Wrench className="text-emerald-400" />
                                            Creation Kit Link
                                        </h3>
                                        <p className="text-sm text-emerald-200 mt-1 leading-relaxed">
                                            Configure Papyrus paths, generate a .psc, and compile to .pex. This uses the desktop app's local tool bridge (no Python server required).
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void loadCkSettings()}
                                            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                                        >
                                            Reload Settings
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void saveCkSettings()}
                                            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white disabled:opacity-30"
                                        >
                                            Save Settings
                                        </button>
                                    </div>
                                </div>

                                {ckStatus && (
                                    <div className="mt-4 text-xs text-slate-200 bg-black/40 border border-slate-700 rounded p-3">
                                        {ckStatus}
                                    </div>
                                )}

                                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-black/40 p-4 rounded-lg border border-slate-700">
                                        <div className="text-xs font-bold text-slate-200 mb-3">Paths</div>

                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-[10px] text-slate-400 mb-1">CreationKit.exe</div>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={ckSettings.creationKitPath}
                                                        onChange={(e) => setCkSettings((s) => ({ ...s, creationKitPath: e.target.value }))}
                                                        placeholder="C:\\...\\CreationKit.exe"
                                                        className="flex-1 rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                const path = await (window as any).electronAPI?.pickCreationKitExe?.();
                                                                if (path) setCkSettings((s) => ({ ...s, creationKitPath: path }));
                                                            } catch (e) {
                                                                console.error('Error picking CK exe:', e);
                                                            }
                                                        }}
                                                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white whitespace-nowrap"
                                                    >
                                                        Browse
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] text-slate-400 mb-1">Fallout 4 Root Folder (optional)</div>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={ckSettings.fallout4Path}
                                                        onChange={(e) => setCkSettings((s) => ({ ...s, fallout4Path: e.target.value }))}
                                                        placeholder="C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4"
                                                        className="flex-1 rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                const path = await (window as any).electronAPI?.pickFallout4Folder?.();
                                                                if (path) setCkSettings((s) => ({ ...s, fallout4Path: path }));
                                                            } catch (e) {
                                                                console.error('Error picking FO4 folder:', e);
                                                            }
                                                        }}
                                                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white whitespace-nowrap"
                                                    >
                                                        Browse
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] text-slate-400 mb-1">PapyrusCompiler.exe</div>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={ckSettings.papyrusCompilerPath}
                                                        onChange={(e) => setCkSettings((s) => ({ ...s, papyrusCompilerPath: e.target.value }))}
                                                        placeholder="C:\\...\\Papyrus Compiler\\PapyrusCompiler.exe"
                                                        className="flex-1 rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                const path = await (window as any).electronAPI?.pickPapyrusCompiler?.();
                                                                if (path) setCkSettings((s) => ({ ...s, papyrusCompilerPath: path }));
                                                            } catch (e) {
                                                                console.error('Error picking Papyrus compiler:', e);
                                                            }
                                                        }}
                                                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white whitespace-nowrap"
                                                    >
                                                        Browse
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] text-slate-400 mb-1">TESV_Papyrus_Flags.flg (optional)</div>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={ckSettings.papyrusFlagsPath}
                                                        onChange={(e) => setCkSettings((s) => ({ ...s, papyrusFlagsPath: e.target.value }))}
                                                        placeholder="C:\\...\\Papyrus Compiler\\TESV_Papyrus_Flags.flg"
                                                        className="flex-1 rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                const path = await (window as any).electronAPI?.pickPapyrusFlags?.();
                                                                if (path) setCkSettings((s) => ({ ...s, papyrusFlagsPath: path }));
                                                            } catch (e) {
                                                                console.error('Error picking Papyrus flags:', e);
                                                            }
                                                        }}
                                                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white whitespace-nowrap"
                                                    >
                                                        Browse
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] text-slate-400 mb-1">Import Paths (-i) (semicolon-separated)</div>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={ckSettings.papyrusImportPaths}
                                                        onChange={(e) => setCkSettings((s) => ({ ...s, papyrusImportPaths: e.target.value }))}
                                                        placeholder="C:\\Fallout4\\Data\\Scripts\\Source;C:\\Fallout4\\Data\\Scripts\\Source\\User"
                                                        className="flex-1 rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                const path = await (window as any).electronAPI?.pickImportPaths?.();
                                                                if (path) setCkSettings((s) => ({ ...s, papyrusImportPaths: path }));
                                                            } catch (e) {
                                                                console.error('Error picking import paths:', e);
                                                            }
                                                        }}
                                                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white whitespace-nowrap"
                                                    >
                                                        Browse
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] text-slate-400 mb-1">Papyrus Source Folder (where .psc live)</div>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={ckSettings.papyrusSourcePath}
                                                        onChange={(e) => setCkSettings((s) => ({ ...s, papyrusSourcePath: e.target.value }))}
                                                        placeholder="C:\\Fallout4\\Data\\Scripts\\Source\\User"
                                                        className="flex-1 rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                const path = await (window as any).electronAPI?.pickSourceFolder?.();
                                                                if (path) setCkSettings((s) => ({ ...s, papyrusSourcePath: path }));
                                                            } catch (e) {
                                                                console.error('Error picking source folder:', e);
                                                            }
                                                        }}
                                                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white whitespace-nowrap"
                                                    >
                                                        Browse
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] text-slate-400 mb-1">Papyrus Output Folder (-o) (where .pex go)</div>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={ckSettings.papyrusOutputPath}
                                                        onChange={(e) => setCkSettings((s) => ({ ...s, papyrusOutputPath: e.target.value }))}
                                                        placeholder="C:\\Fallout4\\Data\\Scripts"
                                                        className="flex-1 rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                const path = await (window as any).electronAPI?.pickOutputFolder?.();
                                                                if (path) setCkSettings((s) => ({ ...s, papyrusOutputPath: path }));
                                                            } catch (e) {
                                                                console.error('Error picking output folder:', e);
                                                            }
                                                        }}
                                                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white whitespace-nowrap"
                                                    >
                                                        Browse
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void validateCkPaths()}
                                                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                                            >
                                                Validate Paths
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const api = getElectronApi();
                                                    if (!api?.openProgram) {
                                                        setCkStatus('openProgram API not available.');
                                                        return;
                                                    }
                                                    if (!ckSettings.creationKitPath.trim()) {
                                                        setCkStatus('Set CreationKit.exe path first.');
                                                        return;
                                                    }
                                                    setCkBusy(true);
                                                    try {
                                                        const result = await api.openProgram(ckSettings.creationKitPath.trim());
                                                        if (result?.success) {
                                                            setCkStatus('Creation Kit launched.');
                                                        } else {
                                                            setCkStatus(String(result?.error || 'Failed to launch Creation Kit.'));
                                                        }
                                                    } finally {
                                                        setCkBusy(false);
                                                    }
                                                }}
                                                disabled={ckBusy}
                                                className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-xs font-bold text-white"
                                            >
                                                Launch CK
                                            </button>
                                        </div>

                                        {Object.keys(ckPathChecks).length > 0 && (
                                            <div className="mt-4 bg-black/30 border border-slate-800 rounded p-3">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Validation</div>
                                                <div className="space-y-1 text-xs">
                                                    {Object.entries(ckPathChecks).map(([k, v]) => (
                                                        <div key={k} className="flex items-center justify-between gap-3">
                                                            <div className="text-slate-300">{k}</div>
                                                            <div className={v.exists ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                                                {v.exists ? (v.isDirectory ? 'OK (dir)' : v.isFile ? 'OK (file)' : 'OK') : 'MISSING'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-black/40 p-4 rounded-lg border border-slate-700">
                                        <div className="text-xs font-bold text-slate-200 mb-3">Script</div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <div className="text-[10px] text-slate-400 mb-1">Script Name</div>
                                                <input
                                                    value={ckScriptName}
                                                    onChange={(e) => setCkScriptName(e.target.value)}
                                                    placeholder="MyQuestScript"
                                                    className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                                />
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-400 mb-1">Extends</div>
                                                <input
                                                    value={ckScriptExtends}
                                                    onChange={(e) => setCkScriptExtends(e.target.value)}
                                                    placeholder="Quest"
                                                    list="papyrus-extends-suggestions"
                                                    className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                                />
                                                <datalist id="papyrus-extends-suggestions">
                                                    <option value="Quest" />
                                                    <option value="ObjectReference" />
                                                    <option value="Actor" />
                                                    <option value="ActiveMagicEffect" />
                                                    <option value="ReferenceAlias" />
                                                    <option value="Scene" />
                                                </datalist>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-400 mb-1">Target .psc</div>
                                                <div className="w-full rounded px-3 py-2 text-[11px] border border-slate-800 bg-black/40 text-slate-200 font-mono break-all">
                                                    {getPscScriptPath() || '—'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-end">
                                            <div className="flex-1">
                                                <div className="text-[10px] text-slate-400 mb-1">Template</div>
                                                <select
                                                    value={ckScriptTemplate}
                                                    onChange={(e) => {
                                                        const nextTemplate = e.target.value as any;
                                                        setCkScriptTemplate(nextTemplate);
                                                        if (ckAutoSetExtends) {
                                                            const nextExtends = defaultExtendsForTemplate(nextTemplate);
                                                            if (nextExtends) setCkScriptExtends(nextExtends);
                                                        }
                                                    }}
                                                    title="Select a Papyrus script template"
                                                    className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/20 text-slate-200"
                                                >
                                                    <option value="quest">Quest (OnInit)</option>
                                                    <option value="objectref">ObjectReference (OnInit, OnActivate)</option>
                                                    <option value="actor">Actor (OnInit, OnDeath)</option>
                                                    <option value="activemagiceffect">ActiveMagicEffect (OnEffectStart/Finish)</option>
                                                    <option value="refalias">ReferenceAlias (OnInit)</option>
                                                    <option value="blank">Blank</option>
                                                </select>
                                                <div className="mt-1 text-[10px] text-slate-500">
                                                    Apply Template overwrites the editor content.
                                                </div>
                                                <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={ckAutoSetExtends}
                                                        onChange={(e) => setCkAutoSetExtends(e.target.checked)}
                                                    />
                                                    Auto-set Extends from template
                                                </label>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const derivedExtends = ckAutoSetExtends
                                                        ? (defaultExtendsForTemplate(ckScriptTemplate) || ckScriptExtends)
                                                        : ckScriptExtends;
                                                    if (ckAutoSetExtends && derivedExtends && derivedExtends !== ckScriptExtends) {
                                                        setCkScriptExtends(derivedExtends);
                                                    }

                                                    const next = buildPapyrusTemplate(ckScriptTemplate, ckScriptName, derivedExtends);
                                                    setCkScriptBody(next);
                                                    setCkStatus('Template applied.');
                                                }}
                                                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                                            >
                                                Apply Template
                                            </button>
                                        </div>

                                        <div className="mt-3">
                                            <div className="text-[10px] text-slate-400 mb-1">.psc Content</div>
                                            <textarea
                                                value={ckScriptBody}
                                                onChange={(e) => setCkScriptBody(e.target.value)}
                                                rows={10}
                                                title="Papyrus script content"
                                                placeholder="Enter your Papyrus script content here"
                                                className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                            />
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void writePapyrusScript()}
                                                disabled={ckBusy}
                                                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white disabled:opacity-30"
                                            >
                                                Write .psc
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const api = getElectronApi();
                                                    if (!api?.revealInFolder) {
                                                        setCkStatus('revealInFolder API not available.');
                                                        return;
                                                    }
                                                    const target = getPscScriptPath();
                                                    if (!target) {
                                                        setCkStatus('Set Papyrus Source Path and a script name first.');
                                                        return;
                                                    }
                                                    await api.revealInFolder(target);
                                                }}
                                                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                                            >
                                                Show in Explorer
                                            </button>
                                        </div>

                                        <div className="mt-6">
                                            <div className="text-xs font-bold text-slate-200 mb-2">Compile</div>
                                            <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={papyrusFlags.release}
                                                        onChange={(e) => setPapyrusFlags((f) => ({ ...f, release: e.target.checked }))}
                                                    />
                                                    -r (release)
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={papyrusFlags.optimize}
                                                        onChange={(e) => setPapyrusFlags((f) => ({ ...f, optimize: e.target.checked }))}
                                                    />
                                                    -op (optimize)
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={papyrusFlags.final}
                                                        onChange={(e) => setPapyrusFlags((f) => ({ ...f, final: e.target.checked }))}
                                                    />
                                                    -final
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={papyrusFlags.quiet}
                                                        onChange={(e) => setPapyrusFlags((f) => ({ ...f, quiet: e.target.checked }))}
                                                    />
                                                    -q (quiet)
                                                </label>
                                            </div>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => void compilePapyrusScript()}
                                                    disabled={ckBusy}
                                                    className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-xs font-bold text-white"
                                                >
                                                    Compile .psc → .pex
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCkCompileResult(null)}
                                                    className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                                                >
                                                    Clear Output
                                                </button>
                                            </div>

                                            {ckCompileResult && (
                                                <div className="mt-4">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Compiler Output</div>
                                                    <div className="rounded border border-slate-800 bg-black/40 p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap">
                                                        {ckCompileResult.stdout || '(no stdout)'}
                                                        {ckCompileResult.stderr ? `\n\n[stderr]\n${ckCompileResult.stderr}` : ''}
                                                        {`\n\n[exitCode] ${ckCompileResult.exitCode}`}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 border-t border-slate-700/60 pt-5">
                                            <div className="text-xs font-bold text-slate-200 mb-2">Template Library</div>
                                            <div className="text-[11px] text-slate-400 mb-3">
                                                Save reusable Papyrus scripts and share them by exporting/importing JSON.
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="bg-black/30 border border-slate-800 rounded p-3">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Save Current</div>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <div className="text-[10px] text-slate-400 mb-1">Title</div>
                                                            <input
                                                                value={papyrusLibraryTitle}
                                                                onChange={(e) => setPapyrusLibraryTitle(e.target.value)}
                                                                placeholder="My Quest Init Script"
                                                                className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-slate-400 mb-1">Author (optional)</div>
                                                            <input
                                                                value={papyrusLibraryAuthor}
                                                                onChange={(e) => setPapyrusLibraryAuthor(e.target.value)}
                                                                placeholder="Your name / handle"
                                                                className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-slate-400 mb-1">Description (optional)</div>
                                                            <input
                                                                value={papyrusLibraryDescription}
                                                                onChange={(e) => setPapyrusLibraryDescription(e.target.value)}
                                                                placeholder="What this script is for"
                                                                className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200"
                                                            />
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const title = (papyrusLibraryTitle || '').trim() || toPapyrusIdentifier(ckScriptName) || 'Untitled';
                                                                    const now = new Date().toISOString();
                                                                    void upsertLibraryTemplate({
                                                                        id: papyrusLibrarySelectedId || newId(),
                                                                        title,
                                                                        author: (papyrusLibraryAuthor || '').trim() || undefined,
                                                                        description: (papyrusLibraryDescription || '').trim() || undefined,
                                                                        scriptName: toPapyrusIdentifier(ckScriptName) || 'MyScript',
                                                                        extendsType: (ckScriptExtends || '').trim() || 'Quest',
                                                                        templateKind: ckScriptTemplate,
                                                                        body: ckScriptBody,
                                                                        createdAt: now,
                                                                        updatedAt: now,
                                                                    });
                                                                    setCkStatus('Template saved.');
                                                                }}
                                                                className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                                                            >
                                                                Save Template
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPapyrusLibrarySelectedId('');
                                                                    setPapyrusLibraryTitle('');
                                                                    setPapyrusLibraryAuthor('');
                                                                    setPapyrusLibraryDescription('');
                                                                }}
                                                                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                                                            >
                                                                Clear
                                                            </button>
                                                        </div>

                                                        <div className="text-[10px] text-slate-500">
                                                            Tip: choose a template below to edit+re-save (it will update by ID).
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-black/30 border border-slate-800 rounded p-3">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Load / Manage</div>

                                                    <div>
                                                        <div className="text-[10px] text-slate-400 mb-1">Saved Templates</div>
                                                        <select
                                                            value={papyrusLibrarySelectedId}
                                                            onChange={(e) => {
                                                                const id = e.target.value;
                                                                setPapyrusLibrarySelectedId(id);
                                                                const t = papyrusLibrary.find((x) => x.id === id);
                                                                if (t) {
                                                                    setPapyrusLibraryTitle(t.title);
                                                                    setPapyrusLibraryAuthor(t.author || '');
                                                                    setPapyrusLibraryDescription(t.description || '');
                                                                }
                                                            }}
                                                            title="Select a saved Papyrus template"
                                                            className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/20 text-slate-200"
                                                        >
                                                            <option value="">(none)</option>
                                                            {papyrusLibrary
                                                                .slice()
                                                                .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
                                                                .map((t) => (
                                                                    <option key={t.id} value={t.id}>
                                                                        {t.title}
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (!papyrusLibrarySelectedId) {
                                                                    setCkStatus('Select a saved template first.');
                                                                    return;
                                                                }
                                                                applyLibraryTemplate(papyrusLibrarySelectedId);
                                                            }}
                                                            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                                                        >
                                                            Load Into Editor
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (!papyrusLibrarySelectedId) {
                                                                    setCkStatus('Select a saved template first.');
                                                                    return;
                                                                }
                                                                void deleteLibraryTemplate(papyrusLibrarySelectedId);
                                                                setCkStatus('Template deleted.');
                                                            }}
                                                            className="px-3 py-2 rounded bg-red-700/80 hover:bg-red-700 border border-red-500/30 text-xs font-bold text-white"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>

                                                    <div className="mt-4">
                                                        <div className="text-[10px] text-slate-400 mb-1">Export JSON (share)</div>
                                                        <textarea
                                                            readOnly
                                                            value={exportPapyrusLibraryJson()}
                                                            rows={6}
                                                            className="w-full rounded px-3 py-2 text-[11px] border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                                        />
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    try {
                                                                        await navigator.clipboard.writeText(exportPapyrusLibraryJson());
                                                                        setCkStatus('Export JSON copied to clipboard.');
                                                                    } catch {
                                                                        setCkStatus('Copy failed (clipboard permission).');
                                                                    }
                                                                }}
                                                                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                                                            >
                                                                Copy Export JSON
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    const api = getElectronApi();
                                                                    if (!api?.saveFile) {
                                                                        setCkStatus('saveFile API not available (Desktop Bridge required).');
                                                                        return;
                                                                    }
                                                                    try {
                                                                        const savedTo = await api.saveFile(exportPapyrusLibraryJson(), 'mossy-papyrus-template-library.json');
                                                                        setCkStatus(savedTo ? `Exported to file: ${savedTo}` : 'Exported to file.');
                                                                    } catch (e: any) {
                                                                        setCkStatus(`Export failed: ${String(e?.message || e)}`);
                                                                    }
                                                                }}
                                                                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                                                            >
                                                                Export to File
                                                            </button>
                                                        </div>

                                                        <div className="mt-4">
                                                            <div className="text-[10px] text-slate-400 mb-1">Import JSON (merge)</div>
                                                            <textarea
                                                                value={papyrusLibraryImportText}
                                                                onChange={(e) => setPapyrusLibraryImportText(e.target.value)}
                                                                placeholder='Paste JSON (array or { "templates": [...] }) here...'
                                                                rows={6}
                                                                className="w-full rounded px-3 py-2 text-[11px] border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                                            />
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void importPapyrusLibraryJson()}
                                                                    className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                                                                >
                                                                    Import / Merge
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={async () => {
                                                                        const api = getElectronApi();
                                                                        if (!api?.pickJsonFile || !api?.readFile) {
                                                                            setCkStatus('Import from file requires pickJsonFile + readFile (Desktop Bridge required).');
                                                                            return;
                                                                        }
                                                                        try {
                                                                            const filePath = await api.pickJsonFile();
                                                                            if (!filePath) {
                                                                                setCkStatus('Import canceled.');
                                                                                return;
                                                                            }
                                                                            const content = await api.readFile(filePath);
                                                                            setPapyrusLibraryImportText(String(content || ''));
                                                                            await importPapyrusLibraryJson(String(content || ''));
                                                                        } catch (e: any) {
                                                                            setCkStatus(`Import failed: ${String(e?.message || e)}`);
                                                                        }
                                                                    }}
                                                                    className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                                                                >
                                                                    Import from File
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPapyrusLibraryImportText('')}
                                                                    className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                                                                >
                                                                    Clear
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'blender' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div ref={blenderCardRef} className="rounded-xl border border-blue-500/30 bg-blue-900/10 p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Box className="text-blue-400" />
                                            Mossy Link for Blender
                                        </h3>
                                        <p className="text-sm text-blue-200 mt-1 leading-relaxed">
                                            Enable the direct neural connection between Blender and Mossy.
                                        </p>
                                    </div>
                                    <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${blenderLinked ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                        <div className={`w-2 h-2 rounded-full ${blenderLinked ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                        <span className="text-xs font-bold uppercase tracking-wider">{blenderLinked ? 'Connected' : 'Disconnected'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="bg-black/40 p-4 rounded-lg border border-blue-500/50">
                                        <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                                            <Lock className="w-4 h-4 text-amber-400" /> Mossy Link Token
                                        </h4>
                                        <div className="space-y-3">
                                            <p className="text-xs text-slate-300">
                                                Security token auto-generated on first connection.<br />
                                                <em>Copy it to Blender → Add-ons → Mossy Link Token</em>
                                            </p>

                                            {/* Token Display Box */}
                                            <div className="bg-slate-900/60 border border-slate-600 rounded p-3 font-mono text-sm">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-amber-300 break-all">{blenderLinkToken || 'Loading...'}</span>
                                                    <button
                                                        onClick={copyTokenToClipboard}
                                                        className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded whitespace-nowrap flex items-center gap-1"
                                                        title="Copy token to clipboard"
                                                        aria-label="Copy Blender Link token to clipboard"
                                                    >
                                                        📋 Copy
                                                    </button>
                                                </div>
                                                {tokenCopyFeedback && (
                                                    <div className="text-xs text-emerald-400 mt-2">{tokenCopyFeedback}</div>
                                                )}
                                            </div>

                                            {/* Token Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={regenerateToken}
                                                    className="px-3 py-2 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 hover:border-slate-500 font-semibold"
                                                    title="Generate a new token"
                                                    aria-label="Regenerate Blender Link security token"
                                                >
                                                    🔄 Regenerate Token
                                                </button>
                                            </div>

                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                ℹ️ <strong>Blender addon</strong> auto-generates a token on first load.<br />
                                                <strong>Mossy</strong> also generates one on first connection.<br />
                                                They must match for the connection to work.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-lg border border-slate-700">
                                        <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Key Capabilities
                                        </h4>
                                        <ul className="text-xs text-slate-300 space-y-2">
                                            <li>• One-click FO4 Standards Alignment</li>
                                            <li>• Automated Mesh Generation</li>
                                            <li>• Animation Batch Processing</li>
                                            <li>• Real-time Scene Analysis</li>
                                        </ul>
                                    </div>
                                    {!blenderLinked ? (
                                        <div className="bg-black/40 p-4 rounded-lg border border-slate-700">
                                            <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                                                <Settings className="w-4 h-4 text-blue-400" /> Installation Required
                                            </h4>
                                            <ol className="text-xs text-slate-300 space-y-2 list-decimal pl-4">
                                                <li>Install Blender for Windows (if needed)</li>
                                                <li>Download <strong>mossy-blender-addons.zip</strong> from GitHub</li>
                                                <li>In Blender: <em>Edit &gt; Preferences &gt; Add-ons</em></li>
                                                <li>Click <strong>Install...</strong> and select the <strong>.zip</strong> file</li>
                                                <li>Enable &quot;System: Mossy Link&quot; checkbox</li>
                                                <li>In the 3D View sidebar: open the <strong>Mossy</strong> tab and toggle <strong>Link</strong> ON</li>
                                            </ol>
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => void handleDownloadAddon()}
                                                    disabled={!!import.meta.env.DEV}
                                                    className="px-3 py-2 text-xs font-bold rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                                    title={import.meta.env.DEV ? 'Build the app first (npm run build)' : 'Download the Mossy Link Blender add-on package'}
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Download Mossy Link
                                                </button>
                                                <button
                                                    onClick={() => void openUrl('https://www.blender.org/download/')}
                                                    className="px-3 py-2 text-xs font-bold rounded-lg border border-blue-500/30 text-blue-300 hover:bg-blue-500/10 flex items-center gap-2"
                                                    title="Open Blender download page"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    Download Blender
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-900/20 p-4 rounded-lg border border-emerald-500/30">
                                            <h4 className="font-bold text-emerald-300 mb-2 flex items-center gap-2 text-sm">
                                                <CheckCircle2 className="w-4 h-4" /> Using Installed Add-on
                                            </h4>
                                            <p className="text-xs text-emerald-200 mb-3">
                                                ✓ Blender add-on is active on port 9999
                                            </p>
                                            {blenderAddonAutoDetected && (
                                                <p className="text-xs text-emerald-100 italic">
                                                    Auto-detected on startup. Ready to create, query AI, and execute tools in Blender.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3">
                                    {!blenderLinked ? (
                                        <button
                                            onClick={testBlenderLink}
                                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                        >
                                            <Zap className="w-6 h-6" />
                                            Check for Blender Add-on
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                localStorage.setItem('mossy_blender_active', 'false');
                                                setBlenderLinked(false);
                                                setBlenderAddonAutoDetected(false);
                                                window.dispatchEvent(new CustomEvent('mossy-blender-linked', { detail: false }));
                                            }}
                                            className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all"
                                        >
                                            <Lock className="w-6 h-6" />
                                            Disconnect Link
                                        </button>
                                    )}
                                    <button
                                        onClick={loadBlenderTutorial}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
                                    >
                                        <HelpCircle className="w-5 h-5" />
                                        View Blender Tutorial
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-emerald-400" /> Blender Awareness
                                </h4>

                                <div className="text-xs text-slate-400 mb-3">
                                    Mossy can pull a context snapshot (mode, selection, active object) and surface common pitfalls like unapplied scale before you export.
                                </div>

                                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                                    <button
                                        onClick={() => void fetchBlenderContext()}
                                        disabled={!bridgeConnected}
                                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs flex items-center gap-2"
                                        title={!bridgeConnected ? 'Start the Python Bridge server first (Setup tab)' : 'Fetch context from Blender add-on'}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Scan Scene
                                    </button>
                                    {blenderContextError && <div className="text-xs text-red-400">{blenderContextError}</div>}
                                </div>

                                {blenderContext?.context && (
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="bg-black/40 p-3 rounded border border-slate-800">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Mode</div>
                                            <div className="text-xs text-slate-200 mt-1">{String(blenderContext.context.mode || '—')}</div>
                                        </div>
                                        <div className="bg-black/40 p-3 rounded border border-slate-800">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Active Object</div>
                                            <div className="text-xs text-slate-200 mt-1">{String(blenderContext.context.activeObject || '—')}</div>
                                        </div>
                                        <div className="bg-black/40 p-3 rounded border border-slate-800">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Selected</div>
                                            <div className="text-xs text-slate-200 mt-1">{Array.isArray(blenderContext.context.selected) ? blenderContext.context.selected.join(', ') : '—'}</div>
                                        </div>
                                        <div className="bg-black/40 p-3 rounded border border-slate-800">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Units</div>
                                            <div className="text-xs text-slate-200 mt-1">{String(blenderContext.context.unitSystem || '—')} @ {String(blenderContext.context.unitScale ?? '—')}</div>
                                        </div>
                                        <div className="bg-black/40 p-3 rounded border border-slate-800">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">FPS</div>
                                            <div className="text-xs text-slate-200 mt-1">{String(blenderContext.context.fps ?? '—')}</div>
                                        </div>
                                        <div className="bg-black/40 p-3 rounded border border-slate-800">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Active Action</div>
                                            <div className="text-xs text-slate-200 mt-1">{String(blenderContext.context.activeAction || '—')}</div>
                                        </div>
                                        <div className="bg-black/40 p-3 rounded border border-slate-800">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Pose Markers</div>
                                            <div className="text-xs text-slate-200 mt-1">{String(blenderContext.context.actionPoseMarkers ?? '—')}</div>
                                        </div>
                                    </div>
                                )}

                                {Array.isArray(blenderContext?.warnings) && blenderContext.warnings.length > 0 && (
                                    <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                                        <div className="text-xs font-bold text-yellow-300 mb-2 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> Export Warnings
                                        </div>
                                        <ul className="text-xs text-yellow-200 space-y-1">
                                            {blenderContext.warnings.slice(0, 8).map((w: string, i: number) => (
                                                <li key={i}>• {w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="mt-6">
                                    <div className="text-xs font-bold text-slate-200 mb-2">Export presets</div>
                                    <div className="text-[11px] text-slate-400 mb-2">
                                        OBJ is ideal for Outfit Studio. FBX (baked) is for moving animation data to other tools.
                                    </div>
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <select
                                            value={blenderExportProfile}
                                            onChange={(e) => setBlenderExportProfile(e.target.value as any)}
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200"
                                            title="Choose an export profile"
                                        >
                                            <option value="obj_outfit">Outfit Studio (OBJ)</option>
                                            <option value="fbx_anim">Animation transfer (FBX, baked)</option>
                                        </select>
                                        <input
                                            value={blenderExportPath}
                                            onChange={(e) => setBlenderExportPath(e.target.value)}
                                            placeholder={blenderExportProfile === 'obj_outfit' ? 'C:\\Exports\\my_mesh.obj' : 'C:\\Exports\\my_anim.fbx'}
                                            className="flex-1 rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                        />
                                        <button
                                            onClick={() => void exportBlender()}
                                            disabled={!bridgeConnected}
                                            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs"
                                            title={!bridgeConnected ? 'Start the Python Bridge server first (Setup tab)' : 'Exports selection using the chosen preset'}
                                        >
                                            Export
                                        </button>
                                    </div>
                                    {blenderExportStatus && <div className="mt-2 text-xs text-slate-300">{blenderExportStatus}</div>}
                                </div>

                                <div className="mt-6 bg-black/30 border border-slate-800 rounded p-3">
                                    <div className="text-xs font-bold text-slate-200 mb-2">DeepSeek-OCR-2 → Fallout 4 Mesh Workflow</div>
                                    <div className="text-[11px] text-slate-400 mb-3">
                                        This runs through the Blender add-on command channel and keeps downstream output aligned to FO4 scene/export constraints.
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <input
                                            value={deepSeekInputPath}
                                            onChange={(e) => setDeepSeekInputPath(e.target.value)}
                                            placeholder="Input image/PDF path (e.g. C:\\Docs\\concept.png)"
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                        />
                                        <input
                                            value={deepSeekOutputDir}
                                            onChange={(e) => setDeepSeekOutputDir(e.target.value)}
                                            placeholder="Output dir (e.g. C:\\Exports\\DeepSeekOCR)"
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                        />
                                        <input
                                            value={deepSeekRepoPath}
                                            onChange={(e) => setDeepSeekRepoPath(e.target.value)}
                                            placeholder="DeepSeek repo path (optional; override Blender prefs)"
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                        />
                                        <input
                                            value={deepSeekPythonPath}
                                            onChange={(e) => setDeepSeekPythonPath(e.target.value)}
                                            placeholder="Python exe path (optional; override Blender prefs)"
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                        />
                                    </div>

                                    <div className="mt-2">
                                        <textarea
                                            value={deepSeekPrompt}
                                            onChange={(e) => setDeepSeekPrompt(e.target.value)}
                                            rows={3}
                                            placeholder="OCR prompt (without <image> prefix)"
                                            className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200"
                                        />
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            onClick={() => void applyFo4SceneProfile()}
                                            disabled={deepSeekBusy || !blenderLinked}
                                            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded text-xs"
                                        >
                                            Apply FO4 Scene Profile
                                        </button>
                                        <button
                                            onClick={() => void runDeepSeekFo4Profile(false)}
                                            disabled={deepSeekBusy || !blenderLinked}
                                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded text-xs"
                                        >
                                            Prepare OCR2 FO4 Profile
                                        </button>
                                        <button
                                            onClick={() => void runDeepSeekFo4Profile(true)}
                                            disabled={deepSeekBusy || !blenderLinked}
                                            className="px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded text-xs"
                                        >
                                            Run OCR2 Now
                                        </button>
                                    </div>

                                    <div className="mt-2 text-[10px] text-slate-500">
                                        Configure persistent DeepSeek repo/python defaults in Blender Add-on Preferences → Mossy Link.
                                    </div>
                                    {deepSeekStatus && <div className="mt-2 text-xs text-slate-300">{deepSeekStatus}</div>}
                                </div>

                                <div className="mt-6 bg-black/30 border border-slate-800 rounded p-3">
                                    <div className="text-xs font-bold text-slate-200 mb-2">TripoSG → Fallout 4 Mesh Workflow</div>
                                    <div className="text-[11px] text-slate-400 mb-3">
                                        Generate a GLB from an image (or scribble mode), then hand off to FO4 checks/export inside Blender.
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <input
                                            value={tripoInputPath}
                                            onChange={(e) => setTripoInputPath(e.target.value)}
                                            placeholder="Input image path (e.g. C:\\Refs\\asset.png)"
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                        />
                                        <input
                                            value={tripoOutputDir}
                                            onChange={(e) => setTripoOutputDir(e.target.value)}
                                            placeholder="Output dir (e.g. C:\\Exports\\TripoSG)"
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                        />
                                        <input
                                            value={tripoRepoPath}
                                            onChange={(e) => setTripoRepoPath(e.target.value)}
                                            placeholder="TripoSG repo path (optional; override Blender prefs)"
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                        />
                                        <input
                                            value={tripoPythonPath}
                                            onChange={(e) => setTripoPythonPath(e.target.value)}
                                            placeholder="Python exe path (optional; override Blender prefs)"
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                        />
                                    </div>

                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <select
                                            value={tripoMode}
                                            onChange={(e) => setTripoMode(e.target.value as 'image' | 'scribble')}
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200"
                                        >
                                            <option value="image">Image mode</option>
                                            <option value="scribble">Scribble+prompt mode</option>
                                        </select>
                                        <input
                                            value={tripoFaces}
                                            onChange={(e) => setTripoFaces(e.target.value)}
                                            placeholder="Face budget (e.g. 5000)"
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200"
                                        />
                                        <input
                                            value={tripoPrompt}
                                            onChange={(e) => setTripoPrompt(e.target.value)}
                                            placeholder="Prompt (used for scribble mode)"
                                            className="rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200"
                                        />
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            onClick={() => void runTripoFo4Profile(false)}
                                            disabled={tripoBusy || !blenderLinked}
                                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded text-xs"
                                        >
                                            Prepare TripoSG FO4 Profile
                                        </button>
                                        <button
                                            onClick={() => void runTripoFo4Profile(true)}
                                            disabled={tripoBusy || !blenderLinked}
                                            className="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded text-xs"
                                        >
                                            Run TripoSG Now
                                        </button>
                                    </div>
                                    <div className="mt-2 text-[10px] text-slate-500">
                                        Configure persistent TripoSG repo/python/output defaults in Blender Add-on Preferences → Mossy Link.
                                    </div>
                                    {tripoStatus && <div className="mt-2 text-xs text-slate-300">{tripoStatus}</div>}
                                </div>

                                <div className="mt-6 bg-black/30 border border-slate-800 rounded p-3">
                                    <div className="text-xs font-bold text-slate-200 mb-2">FO4 animation export checklist (HKX pipeline)</div>
                                    <div className="text-[11px] text-slate-400">
                                        This is a practical checklist that matches common FO4 animation workflows (Blender → FBX → Havok tools → HKX packaging). It's not a replacement for the rig author's guide.
                                    </div>
                                    <ul className="mt-2 text-xs text-slate-300 space-y-1">
                                        <li>• Confirm Blender version + required add-ons are installed for your rig.</li>
                                        <li>• Ensure the Armature is active and an Action is selected (Scan Scene will show it).</li>
                                        <li>• Verify timing: many FO4 pipelines assume 30 FPS (Mossy warns if different).</li>
                                        <li>• If your pipeline uses annotation/events: add pose markers to the Action.</li>
                                        <li>• Export using "Animation transfer (FBX, baked)" to an output folder.</li>
                                        <li>• Convert/export to the expected FBX flavor if needed (e.g., via Autodesk FBX Converter).</li>
                                        <li>• Run Havok Content Tools to produce HKX, then pack with your preferred HKX packer UI.</li>
                                        <li>• Validate in-game / with your preview tooling before shipping.</li>
                                    </ul>

                                    <div className="mt-3 text-[11px] text-slate-400">
                                        Get the tools (with credits):
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <button onClick={() => void openUrl('https://www.blender.org/')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">Blender</div>
                                            <div className="text-[10px] text-slate-400">blender.org (Blender Foundation)</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://www.nexusmods.com/fallout4/mods/59849')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">FBX Importer (FO4)</div>
                                            <div className="text-[10px] text-slate-400">Nexus Mods (creator credited on mod page)</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://www.nexusmods.com/fallout4/mods/16694')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">F4AK (HKX packer UI)</div>
                                            <div className="text-[10px] text-slate-400">Nexus Mods (creator credited on mod page)</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://aps.autodesk.com/developer/overview/fbx-converter-archives')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">Autodesk FBX Converter (archives)</div>
                                            <div className="text-[10px] text-slate-400">Autodesk (official archive)</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://notepad-plus-plus.org/downloads/')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">Notepad++</div>
                                            <div className="text-[10px] text-slate-400">notepad-plus-plus.org (Notepad++ team)</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://code.visualstudio.com/')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">Visual Studio Code</div>
                                            <div className="text-[10px] text-slate-400">Microsoft (official download)</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://www.nexusmods.com/fallout4/mods/78')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">BA2 extractor: Bethesda Archive Extractor</div>
                                            <div className="text-[10px] text-slate-400">Nexus Mods — by jonwd7</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://www.nexusmods.com/fallout4/mods/17061')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">BA2 extractor: BSA Browser</div>
                                            <div className="text-[10px] text-slate-400">Nexus Mods — by AlexxEG</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://www.nexusmods.com/fallout4/mods/63243')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">BA2 extractor: BSArchPro</div>
                                            <div className="text-[10px] text-slate-400">Nexus Mods (creator credited on mod page)</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://github.com/BadDogSkyrim/PyNifly/releases')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">PyNifly</div>
                                            <div className="text-[10px] text-slate-400">GitHub releases (BadDogSkyrim)</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://store.steampowered.com/app/1946160/Fallout_4_Creation_Kit/')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">Fallout 4: Creation Kit (Archive2)</div>
                                            <div className="text-[10px] text-slate-400">Steam (Bethesda) — installs Archive2 in the FO4 Tools folder</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://github.com/niftools/nifskope/releases')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">NifSkope</div>
                                            <div className="text-[10px] text-slate-400">GitHub releases (NifTools)</div>
                                        </button>

                                        <button onClick={() => void openUrl('https://www.havok.com/')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                            <div className="text-xs text-slate-200 font-bold">Havok Content Tools (2014)</div>
                                            <div className="text-[10px] text-slate-400">Havok / Autodesk (official site; legacy installers may be archived)</div>
                                        </button>

                                        <div className="rounded border border-slate-800 bg-black/40 px-3 py-2">
                                            <div className="text-xs text-slate-200 font-bold">Havok link (custom)</div>
                                            <div className="mt-1 flex gap-2">
                                                <input
                                                    value={havokToolsUrl}
                                                    onChange={(e) => setHavokToolsUrl(e.target.value)}
                                                    placeholder="Paste your GitHub/archive URL here"
                                                    className="flex-1 rounded px-2 py-1 text-[11px] border border-slate-700 bg-black/40 text-slate-200"
                                                />
                                                <button
                                                    disabled={!havokToolsUrl.trim()}
                                                    onClick={() => void openUrl(havokToolsUrl.trim())}
                                                    className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] text-white font-bold"
                                                    title={havokToolsUrl.trim() ? 'Open your saved Havok download link' : 'Paste a link first'}
                                                >
                                                    Open
                                                </button>
                                            </div>
                                            <div className="mt-1 text-[10px] text-slate-500">
                                                Use this if your guide points to a specific archive/GitHub location.
                                            </div>
                                        </div>
                                    </div>

                                    {customToolLinks.length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-[11px] text-slate-400">Your custom links:</div>
                                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {customToolLinks.map((t, i) => (
                                                    <div key={`${t.url}-${i}`} className="rounded border border-slate-800 bg-black/40 px-3 py-2 flex items-start justify-between gap-3">
                                                        <button
                                                            onClick={() => void openUrl(t.url)}
                                                            className="text-left flex-1 hover:opacity-90"
                                                            title={t.url}
                                                        >
                                                            <div className="text-xs text-slate-200 font-bold">{t.name || 'Custom tool'}</div>
                                                            <div className="text-[10px] text-slate-400">{t.credit || 'Custom link'}</div>
                                                        </button>
                                                        <button
                                                            onClick={() => setCustomToolLinks(prev => prev.filter((_, idx) => idx !== i))}
                                                            className="text-[10px] text-red-300 hover:text-red-200"
                                                            title="Remove"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-3 rounded border border-slate-800 bg-black/40 px-3 py-2">
                                        <div className="text-xs text-slate-200 font-bold">Create a custom tool link</div>
                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <input
                                                value={newToolName}
                                                onChange={(e) => setNewToolName(e.target.value)}
                                                placeholder="Tool name"
                                                className="rounded px-2 py-1 text-[11px] border border-slate-700 bg-black/40 text-slate-200"
                                            />
                                            <input
                                                value={newToolUrl}
                                                onChange={(e) => setNewToolUrl(e.target.value)}
                                                placeholder="https://..."
                                                className="rounded px-2 py-1 text-[11px] border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                            />
                                            <input
                                                value={newToolCredit}
                                                onChange={(e) => setNewToolCredit(e.target.value)}
                                                placeholder="Credit (author/org)"
                                                className="rounded px-2 py-1 text-[11px] border border-slate-700 bg-black/40 text-slate-200"
                                            />
                                        </div>
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const name = newToolName.trim();
                                                    const url = newToolUrl.trim();
                                                    const credit = newToolCredit.trim();
                                                    if (!name || !normalizeHttpUrl(url)) {
                                                        addLog('System', 'Custom link requires a name + a valid http(s) URL.', 'warn');
                                                        return;
                                                    }
                                                    setCustomToolLinks(prev => [...prev, { name, url, credit: credit || undefined }]);
                                                    setNewToolName('');
                                                    setNewToolUrl('');
                                                    setNewToolCredit('');
                                                    addLog('System', `Added custom tool link: ${name}`, 'success');
                                                }}
                                                className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[11px] text-white font-bold"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setNewToolName('');
                                                    setNewToolUrl('');
                                                    setNewToolCredit('');
                                                }}
                                                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 font-bold"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-slate-500">
                                        Tip: prefer the official/Nexus/GitHub pages above so authors get proper credit and users get the latest notes.
                                    </div>
                                </div>

                                {blenderContextRaw && !blenderContext && (
                                    <details className="mt-4">
                                        <summary className="text-xs text-slate-500 cursor-pointer">Raw response</summary>
                                        <pre className="mt-2 text-[10px] text-slate-400 whitespace-pre-wrap break-words bg-black/40 border border-slate-800 rounded p-2">{blenderContextRaw}</pre>
                                    </details>
                                )}
                            </div>

                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-yellow-400" /> Pro Tip: Automated Workflows
                                </h4>
                                <p className="text-xs text-slate-400 italic">
                                    &quot;Once enabled, you can say things like &apos;Mossy, align my Blender scene to Fallout 4&apos;
                                    or &apos;Create a test cube in Blender&apos; and I&apos;ll execute the code through the link.&quot;
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'hardware' && (
                        <div className="max-w-4xl mx-auto">
                            <div ref={hardwareCardRef} className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Cpu className="w-6 h-6 text-amber-400" />
                                            System Hardware Detection
                                        </h3>
                                        <p className="text-sm text-slate-400 mt-1">Read real hardware specs from your PC</p>
                                    </div>
                                    <button
                                        onClick={fetchHardwareInfo}
                                        disabled={!bridgeConnected}
                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Scan Hardware
                                    </button>
                                </div>

                                {!bridgeConnected && (
                                    <div className="text-center py-12 text-slate-500">
                                        <Cpu className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p>Bridge must be online to scan hardware</p>
                                        <p className="text-xs mt-2">Go to Setup tab and start the server</p>
                                    </div>
                                )}

                                {hardwareInfo && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                            <div className="text-xs text-slate-500 uppercase font-bold mb-2">Operating System</div>
                                            <div className="text-lg font-bold text-white">{hardwareInfo.os}</div>
                                        </div>
                                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                            <div className="text-xs text-slate-500 uppercase font-bold mb-2">CPU</div>
                                            <div className="text-lg font-bold text-white truncate" title={hardwareInfo.cpu}>{hardwareInfo.cpu}</div>
                                        </div>
                                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                            <div className="text-xs text-slate-500 uppercase font-bold mb-2">RAM</div>
                                            <div className="text-lg font-bold text-white">{hardwareInfo.ram} GB</div>
                                        </div>
                                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                            <div className="text-xs text-slate-500 uppercase font-bold mb-2">GPU</div>
                                            <div className="text-lg font-bold text-white truncate" title={hardwareInfo.gpu}>{hardwareInfo.gpu}</div>
                                        </div>
                                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                            <div className="text-xs text-slate-500 uppercase font-bold mb-2">Python Version</div>
                                            <div className="text-lg font-bold text-white">{hardwareInfo.python}</div>
                                        </div>
                                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                            <div className="text-xs text-slate-500 uppercase font-bold mb-2">Status</div>
                                            <div className="text-lg font-bold text-emerald-400">{hardwareInfo.status}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'vision' && (
                        <div className="max-w-5xl mx-auto">
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Eye className="w-6 h-6 text-blue-400" />
                                            Screen Capture
                                        </h3>
                                        <p className="text-sm text-slate-400 mt-1">Take screenshots for Mossy to analyze</p>
                                    </div>
                                    <button
                                        onClick={captureScreen}
                                        disabled={!bridgeConnected}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Capture Now
                                    </button>
                                </div>

                                {!bridgeConnected && (
                                    <div className="text-center py-12 text-slate-500">
                                        <Eye className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p>Bridge must be online to capture screenshots</p>
                                    </div>
                                )}

                                {screenshot && (
                                    <div className="bg-black rounded-lg border border-slate-700 overflow-hidden">
                                        <img src={screenshot} alt="Screenshot" className="w-full" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'clipboard' && (
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                                    <Clipboard className="w-6 h-6 text-purple-400" />
                                    System Clipboard Control
                                </h3>

                                {!bridgeConnected && (
                                    <div className="text-center py-12 text-slate-500">
                                        <Clipboard className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p>Bridge must be online to control clipboard</p>
                                    </div>
                                )}

                                {bridgeConnected && (
                                    <div className="space-y-4">
                                        <textarea
                                            value={clipboardText}
                                            onChange={(e) => setClipboardText(e.target.value)}
                                            placeholder="Enter text to copy to system clipboard..."
                                            className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                        />
                                        <button
                                            onClick={() => setClipboard(clipboardText)}
                                            disabled={!clipboardText}
                                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Clipboard className="w-5 h-5" />
                                            Copy to System Clipboard
                                        </button>
                                        <p className="text-xs text-slate-500 text-center">
                                            This sends the text to your Windows clipboard. You can paste it anywhere with Ctrl+V.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'files' && (
                        <div className="max-w-5xl mx-auto">
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                                    <FolderOpen className="w-6 h-6 text-green-400" />
                                    File System Browser
                                </h3>

                                {linkedDirectories.length > 0 && (
                                    <div className="mb-6 pb-4 border-b border-slate-700">
                                        <p className="text-xs text-slate-400 mb-3">Quick Access (Linked Directories):</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {linkedDirectories.map((dir, idx) => (
                                                <button
                                                    key={`${dir.path}-${idx}`}
                                                    onClick={() => {
                                                        setFilePath(dir.path);
                                                        // Optionally: listFiles(dir.path);
                                                    }}
                                                    className="text-left px-3 py-2 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-2"
                                                    title={dir.path}
                                                >
                                                    <FolderOpen className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold truncate">{dir.name}</div>
                                                        <div className="text-[10px] text-slate-500 truncate">{dir.path}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!bridgeConnected && (
                                    <div className="text-center py-12 text-slate-500">
                                        <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p>Bridge must be online to browse files</p>
                                    </div>
                                )}

                                {bridgeConnected && (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={filePath}
                                                onChange={(e) => setFilePath(e.target.value)}
                                                placeholder="Enter directory path..."
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            />
                                            <button
                                                onClick={() => listFiles(filePath)}
                                                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
                                            >
                                                <Search className="w-4 h-4" />
                                                Browse
                                            </button>
                                        </div>

                                        {fileList.length > 0 && (
                                            <div className="bg-slate-800 border border-slate-700 rounded-lg divide-y divide-slate-700 max-h-96 overflow-y-auto">
                                                {fileList.map((file, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors">
                                                        {file.is_dir ? (
                                                            <FolderOpen className="w-5 h-5 text-yellow-400" />
                                                        ) : (
                                                            <HardDrive className="w-5 h-5 text-blue-400" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-bold text-white truncate">{file.name}</div>
                                                            {!file.is_dir && (
                                                                <div className="text-xs text-slate-500">
                                                                    {(file.size / 1024).toFixed(2)} KB
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Blender Tutorial Modal */}
                    {showBlenderTutorial && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                                {/* Modal Header */}
                                <div className="flex justify-between items-center p-6 border-b border-slate-700">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <HelpCircle className="w-6 h-6 text-blue-400" />
                                        Mossy Link for Blender Tutorial
                                    </h2>
                                    <button
                                        onClick={() => setShowBlenderTutorial(false)}
                                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                        title="Close tutorial"
                                    >
                                        <X className="w-6 h-6 text-slate-400 hover:text-white" />
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    {blenderTutorialLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="text-center">
                                                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                                                <p className="text-slate-400">Loading tutorial...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="prose prose-invert prose-sm max-w-none dark text-slate-200">
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ ...props }) => <h1 className="text-3xl font-bold text-white mt-6 mb-4" {...props} />,
                                                    h2: ({ ...props }) => <h2 className="text-2xl font-bold text-blue-300 mt-5 mb-3" {...props} />,
                                                    h3: ({ ...props }) => <h3 className="text-lg font-bold text-blue-200 mt-4 mb-2" {...props} />,
                                                    h4: ({ ...props }) => <h4 className="text-base font-bold text-slate-300 mt-3 mb-2" {...props} />,
                                                    p: ({ ...props }) => <p className="text-slate-300 mb-3 leading-relaxed" {...props} />,
                                                    ol: ({ ...props }) => <ol className="list-decimal list-inside mb-3 text-slate-300" {...props} />,
                                                    ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 text-slate-300" {...props} />,
                                                    code: ({ ...props }) => <code className="bg-slate-800 text-emerald-300 px-2 py-1 rounded text-xs font-mono" {...props} />,
                                                    pre: ({ ...props }) => <pre className="bg-slate-800 p-3 rounded mb-3 overflow-x-auto text-xs" {...props} />,
                                                    blockquote: ({ ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-400 mb-3" {...props} />,
                                                    a: ({ ...props }) => <a className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                                    strong: ({ ...props }) => <strong className="text-blue-300 font-bold" {...props} />,
                                                    em: ({ ...props }) => <em className="text-slate-200 italic" {...props} />,
                                                }}
                                            >
                                                {blenderTutorialContent}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="border-t border-slate-700 p-6 flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowBlenderTutorial(false)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Bridges Tab ─────────────────────────────────────── */}
                    {activeTab === 'bridges' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Header */}
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Plug className="w-6 h-6 text-emerald-400" />
                                            Mossy Bridges
                                        </h3>
                                        <p className="text-sm text-slate-400 mt-1">
                                            Bridges connect external tools to Mossy so she can monitor your activity and provide context-aware help.
                                            Each registered bridge appears here automatically.
                                        </p>
                                    </div>
                                </div>

                                {/* Bridge list */}
                                {registeredBridges.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <Plug className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">No bridges registered yet.</p>
                                        <p className="text-sm mt-1">Add one in <code className="text-emerald-400">src/renderer/src/bridges/index.ts</code></p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {registeredBridges.map(bridge => {
                                            const statusColor =
                                                bridge.status === 'connected'    ? 'bg-emerald-500' :
                                                bridge.status === 'connecting'   ? 'bg-yellow-500 animate-pulse' :
                                                bridge.status === 'error'        ? 'bg-red-500' :
                                                                                   'bg-slate-500';
                                            const statusText =
                                                bridge.status === 'connected'    ? 'Connected' :
                                                bridge.status === 'connecting'   ? 'Connecting…' :
                                                bridge.status === 'error'        ? 'Error' :
                                                                                   'Disconnected';

                                            return (
                                                <div
                                                    key={bridge.id}
                                                    className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg p-4"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor}`} />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-white text-sm">{bridge.name}</span>
                                                                {bridge.version && (
                                                                    <span className="text-xs font-mono text-slate-500">v{bridge.version}</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-400 truncate">{bridge.description}</p>
                                                            {bridge.statusDetail && (
                                                                <p className="text-xs text-slate-500 mt-0.5 truncate">{bridge.statusDetail}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                                        <span className={`text-xs font-bold uppercase tracking-wide ${
                                                            bridge.status === 'connected'  ? 'text-emerald-400' :
                                                            bridge.status === 'error'      ? 'text-red-400' :
                                                            bridge.status === 'connecting' ? 'text-yellow-400' :
                                                                                             'text-slate-500'
                                                        }`}>
                                                            {statusText}
                                                        </span>
                                                        {bridge.status === 'disconnected' || bridge.status === 'error' ? (
                                                            <button
                                                                onClick={() => { BridgeRegistry.get(bridge.id)?.connect(); }}
                                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                            >
                                                                <Zap className="w-3 h-3" />
                                                                Connect
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => { BridgeRegistry.get(bridge.id)?.disconnect(); }}
                                                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold rounded-lg transition-colors"
                                                            >
                                                                Disconnect
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Developer guide */}
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                                <h4 className="font-bold text-white flex items-center gap-2 mb-3">
                                    <Code className="w-5 h-5 text-blue-400" />
                                    Adding a New Bridge
                                </h4>
                                <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
                                    <li>
                                        Create <code className="text-emerald-300 bg-slate-800 px-1 rounded">src/renderer/src/bridges/YourBridge.ts</code>
                                        {' '}and extend <code className="text-emerald-300 bg-slate-800 px-1 rounded">MossyBridge</code>
                                        {' '}(copy <code className="text-emerald-300 bg-slate-800 px-1 rounded">Mo2Bridge.ts</code> as a starter).
                                    </li>
                                    <li>
                                        Open <code className="text-emerald-300 bg-slate-800 px-1 rounded">bridges/index.ts</code>
                                        {' '}and add two lines:
                                        <pre className="mt-1 bg-slate-800 p-3 rounded text-xs font-mono text-emerald-300 overflow-x-auto">{`import { YourBridge } from './YourBridge';
BridgeRegistry.register(new YourBridge());`}</pre>
                                    </li>
                                    <li>Your bridge appears here and in Mossy's context immediately on next app start.</li>
                                </ol>
                                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg text-xs text-blue-300">
                                    <strong>Activity reporting:</strong> Call <code className="text-blue-200">this.reportActivity('event-type', 'detail')</code> anywhere in your bridge to feed activity into Mossy's brain.
                                    She will reference it when answering questions.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
};

export default DesktopBridge;
