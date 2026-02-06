import React, { useState, useEffect, useRef } from 'react';
import { Monitor, CheckCircle2, Wifi, Shield, Cpu, Terminal, Power, Layers, Box, Code, Image as ImageIcon, MessageSquare, Activity, RefreshCw, Lock, AlertOctagon, Link, Zap, Eye, Globe, Database, Wrench, FolderOpen, HardDrive, ArrowRightLeft, ArrowRight, Keyboard, ArrowDownToLine, Server, Clipboard, FileType, HelpCircle, AlertTriangle, Settings, Search, ExternalLink, Download } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useWheelScrollProxy } from './components/useWheelScrollProxy';
import { openExternal } from './utils/openExternal';

interface Driver {
    id: string;
    name: string;
    icon: React.ElementType;
    status: 'active' | 'inactive' | 'mounting' | 'error';
    version: string;
    latency: number;
    permissions: string[];
}

interface LogEntry {
    id: string;
    timestamp: string;
    source: string;
    event: string;
    status: 'ok' | 'warn' | 'err' | 'success';
}

// Initial drivers
const initialDrivers: Driver[] = [
    { id: 'os_shell', name: 'Windows Shell', icon: Terminal, status: 'active', version: '10.0.19045', latency: 12, permissions: ['fs.read', 'fs.write', 'exec'] },
    { id: 'fs_watcher', name: 'File System Watcher', icon: Eye, status: 'active', version: '2.1.0', latency: 5, permissions: ['fs.watch', 'read.recursive'] },
    { id: 'xedit', name: 'xEdit Data Link', icon: Database, status: 'active', version: '4.0.4', latency: 45, permissions: ['plugin.read', 'record.edit'] },
    { id: 'ck', name: 'Creation Kit Telemetry', icon: Wrench, status: 'active', version: '1.10', latency: 80, permissions: ['cell.view'] },
    { id: 'vscode', name: 'VS Code Host', icon: Code, status: 'inactive', version: '1.85.1', latency: 0, permissions: ['editor.action', 'workspace'] },
];

const DesktopBridge: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>(() => {
      try {
          const saved = localStorage.getItem('mossy_bridge_drivers');
          if (saved) {
              const parsed = JSON.parse(saved);
              return initialDrivers.map(d => {
                  const s = parsed.find((p: any) => p.id === d.id);
                  return s ? { ...d, status: s.status } : d;
              });
          }
      } catch (e) {
          console.error('Failed to load saved drivers:', e);
      }
      return initialDrivers;
  });

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
  
  // Real bridge testing state
  const [testingBridge, setTestingBridge] = useState(false);
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [clipboardText, setClipboardText] = useState('');
  const [filePath, setFilePath] = useState('C:\\');
  const [fileList, setFileList] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'setup' | 'ck' | 'hardware' | 'vision' | 'clipboard' | 'files' | 'blender'>('setup');
  const [blenderLinked, setBlenderLinked] = useState(localStorage.getItem('mossy_blender_active') === 'true');

  const [bridgeBaseUrl, setBridgeBaseUrl] = useState<string>(() => {
      try {
          return localStorage.getItem('mossy_bridge_base_url') || 'http://127.0.0.1:21337';
      } catch {
          return 'http://127.0.0.1:21337';
      }
  });

    const [blenderContext, setBlenderContext] = useState<any | null>(null);
    const [blenderContextRaw, setBlenderContextRaw] = useState<string>('');
    const [blenderContextError, setBlenderContextError] = useState<string>('');
    const [blenderExportPath, setBlenderExportPath] = useState<string>('');
    const [blenderExportStatus, setBlenderExportStatus] = useState<string>('');
    const [blenderExportProfile, setBlenderExportProfile] = useState<'obj_outfit' | 'fbx_anim'>('obj_outfit');

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

    const openTabAndScroll = (tab: typeof activeTab, targetRef: React.RefObject<HTMLDivElement>) => {
        setActiveTab(tab);
        setTimeout(() => {
            targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    };
  
  useEffect(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
      try {
          localStorage.setItem('mossy_bridge_base_url', bridgeBaseUrl);
      } catch {
          // ignore
      }
  }, [bridgeBaseUrl]);

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

  // Sync logs and check connection from LocalStorage (Updated by SystemBus)
  useEffect(() => {
      const syncState = () => {
          try {
              const savedLogs = localStorage.getItem('mossy_bridge_logs');
              if (savedLogs) setLogs(JSON.parse(savedLogs));
              
              const active = localStorage.getItem('mossy_bridge_active') === 'true';
              setBridgeConnected(active);

              const ver = localStorage.getItem('mossy_bridge_version');
              setBridgeVersion(ver);

              const bLinked = localStorage.getItem('mossy_blender_active') === 'true';
              setBlenderLinked(bLinked);
          } catch (e) {
              console.error('Failed to sync bridge state:', e);
          }
      };
      
      syncState(); // Initial check
      window.addEventListener('storage', syncState);
      window.addEventListener('mossy-bridge-connected', syncState);
      
      // Fallback poll for UI responsiveness
      const interval = setInterval(syncState, 1000);
      
      return () => {
          window.removeEventListener('storage', syncState);
          window.removeEventListener('mossy-bridge-connected', syncState);
          clearInterval(interval);
      };
  }, []);

  useEffect(() => {
      void loadCkSettings();
      try {
          const api = getElectronApi();
          if (api?.onSettingsUpdated) {
              api.onSettingsUpdated((s: any) => {
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
  useEffect(() => {
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
  }, [blenderLinked]);

  // --- PYTHON SERVER GENERATOR ---
  const handleDownloadServer = () => {
      const serverCode = `
import time
import json
import base64
import os
import threading
import sys
import platform
import subprocess
import socket
import json
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS

# Attempt imports with friendly error
try:
    import mss
    import pyautogui
    import pyperclip
    import psutil
except ImportError as e:
    print(f"\\n[ERROR] Missing dependency: {e.name}")
    print("Please run: pip install flask flask-cors mss pyautogui pyperclip psutil")
    input("Press Enter to exit...")
    sys.exit(1)

# --- CONFIGURATION ---
PORT = 21337
app = Flask(__name__)
# Allow CORS for ALL origins to prevent local network issues
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def add_cors_headers(response):
    # Enable Private Network Access for modern browsers (Chrome/Edge)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

print(f"\\n[MOSSY BRIDGE] Initializing Neural Link on port {PORT}...")
print("[MOSSY BRIDGE] Capabilities: Screen (Eyes), Clipboard (Hands), Hardware (Senses)")
print("[MOSSY BRIDGE] Hardware Endpoint: Ready (v3.0)")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "online", "version": "3.0.0"})

@app.route('/hardware', methods=['GET'])
def get_hardware():
    """Returns real system specifications"""
    try:
        # Memory
        mem = psutil.virtual_memory()
        total_ram_gb = round(mem.total / (1024**3))
        
        # GPU (Windows specific approach)
        gpu_name = "Generic / Integrated"
        try:
            if platform.system() == "Windows":
                cmd = "wmic path win32_VideoController get name"
                proc = subprocess.check_output(cmd, shell=True).decode()
                lines = [line.strip() for line in proc.split('\\n') if line.strip() and "Name" not in line]
                if lines:
                    gpu_name = lines[0]
        except:
            pass

        return jsonify({
            "status": "success",
            "os": f"{platform.system()} {platform.release()}",
            "cpu": platform.processor(),
            "ram": total_ram_gb,
            "gpu": gpu_name,
            "python": platform.python_version()
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/capture', methods=['GET'])
def capture_screen():
    """Takes a screenshot of the primary monitor and returns base64"""
    try:
        with mss.mss() as sct:
            # Capture primary monitor
            monitor = sct.monitors[1]
            sct_img = sct.grab(monitor)
            
            # Convert to PNG bytes
            png_bytes = mss.tools.to_png(sct_img.rgb, sct_img.size)
            
            # Encode to base64
            b64_string = base64.b64encode(png_bytes).decode('utf-8')
            
            return jsonify({
                "status": "success",
                "image": f"data:image/png;base64,{b64_string}",
                "resolution": f"{monitor['width']}x{monitor['height']}"
            })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/clipboard', methods=['POST'])
def set_clipboard():
    """Sets the system clipboard text"""
    try:
        data = request.json
        text = data.get('text', '')
        pyperclip.copy(text)
        return jsonify({"status": "success", "message": "Clipboard updated"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/files', methods=['POST'])
def list_files():
    """Lists files in a directory"""
    try:
        data = request.json
        path = data.get('path', '.')
        if not os.path.exists(path):
            return jsonify({"status": "error", "message": "Path not found"}), 404
            
        files = []
        for entry in os.scandir(path):
            files.append({
                "name": entry.name,
                "is_dir": entry.is_dir(),
                "size": entry.stat().st_size if not entry.is_dir() else 0
            })
        return jsonify({"status": "success", "files": files})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/execute', methods=['POST'])
def execute_blender_command():
    """Execute a command in Blender via the Mossy Link add-on"""
    try:
        data = request.json
        cmd_type = data.get('type', 'blender')
        
        if cmd_type == 'blender':
            # Forward to Blender addon on port 9999
            blender_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            blender_socket.settimeout(3)
            
            try:
                blender_socket.connect(('127.0.0.1', 9999))
                script = data.get('script', '')
                
                print(f"[BRIDGE] Received Blender command, forwarding to addon:")
                print(f"[BRIDGE] Script: {script[:100]}..." if len(script) > 100 else f"[BRIDGE] Script: {script}")
                
                # Send as JSON command (script)
                command = json.dumps({ 'type': 'script', 'code': script })
                
                blender_socket.send(command.encode('utf-8'))
                response = blender_socket.recv(4096).decode('utf-8')
                blender_socket.close()
                
                print(f"[BRIDGE] Addon response: {response[:100]}..." if len(response) > 100 else f"[BRIDGE] Addon response: {response}")
                
                return jsonify({
                    "status": "success",
                    "message": "Blender command executed",
                    "response": response
                })
            except ConnectionRefusedError:
                error_msg = "Blender addon not responding on port 9999. Is the addon active?"
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({
                    "status": "error",
                    "message": error_msg
                }), 503
            except socket.timeout:
                error_msg = "Blender addon timed out (>3s). Check if it's still running."
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({
                    "status": "error",
                    "message": error_msg
                }), 504
        elif cmd_type == 'text':
            # Forward text block creation/update to addon
            blender_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            blender_socket.settimeout(3)

            try:
                blender_socket.connect(('127.0.0.1', 9999))
                code = data.get('script') or data.get('code') or ''
                name = data.get('name') or 'MOSSY_SCRIPT'
                run = bool(data.get('run', False))

                print(f"[BRIDGE] Writing text block '{name}', run={run}")
                # Send as JSON command (text)
                command = json.dumps({ 'type': 'text', 'code': code, 'name': name, 'run': run })
                blender_socket.send(command.encode('utf-8'))
                response = blender_socket.recv(4096).decode('utf-8')
                blender_socket.close()

                print(f"[BRIDGE] Addon response: {response[:100]}..." if len(response) > 100 else f"[BRIDGE] Addon response: {response}")
                return jsonify({ "status": "success", "message": "Blender text updated", "response": response })
            except ConnectionRefusedError:
                error_msg = "Blender addon not responding on port 9999. Is the addon active?"
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({ "status": "error", "message": error_msg }), 503
            except socket.timeout:
                error_msg = "Blender addon timed out (>3s). Check if it's still running."
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({ "status": "error", "message": error_msg }), 504
        elif cmd_type == 'context':
            # Ask addon for current context snapshot + warnings
            blender_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            blender_socket.settimeout(3)
            try:
                blender_socket.connect(('127.0.0.1', 9999))
                command = json.dumps({ 'type': 'get_context' })
                blender_socket.send(command.encode('utf-8'))
                response = blender_socket.recv(1024 * 1024).decode('utf-8')
                blender_socket.close()
                return jsonify({ "status": "success", "message": "Blender context", "response": response })
            except ConnectionRefusedError:
                error_msg = "Blender addon not responding on port 9999. Is the addon active?"
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({ "status": "error", "message": error_msg }), 503
            except socket.timeout:
                error_msg = "Blender addon timed out (>3s). Check if it's still running."
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({ "status": "error", "message": error_msg }), 504
        elif cmd_type == 'export_fbx':
            # Trigger an FBX export through addon using safe defaults
            blender_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            blender_socket.settimeout(6)
            try:
                blender_socket.connect(('127.0.0.1', 9999))
                filepath = data.get('filepath') or data.get('path') or ''
                use_selection = bool(data.get('use_selection', True))
                bake_anim = bool(data.get('bake_anim', False))
                command = json.dumps({ 'type': 'export_fbx', 'filepath': filepath, 'use_selection': use_selection, 'bake_anim': bake_anim })
                blender_socket.send(command.encode('utf-8'))
                response = blender_socket.recv(1024 * 1024).decode('utf-8')
                blender_socket.close()
                return jsonify({ "status": "success", "message": "Blender export_fbx", "response": response })
            except ConnectionRefusedError:
                error_msg = "Blender addon not responding on port 9999. Is the addon active?"
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({ "status": "error", "message": error_msg }), 503
            except socket.timeout:
                error_msg = "Blender addon timed out (>6s). Large exports can take time."
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({ "status": "error", "message": error_msg }), 504
        elif cmd_type == 'export_obj':
            # Trigger an OBJ export through addon (Outfit Studio friendly)
            blender_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            blender_socket.settimeout(6)
            try:
                blender_socket.connect(('127.0.0.1', 9999))
                filepath = data.get('filepath') or data.get('path') or ''
                use_selection = bool(data.get('use_selection', True))
                command = json.dumps({ 'type': 'export_obj', 'filepath': filepath, 'use_selection': use_selection })
                blender_socket.send(command.encode('utf-8'))
                response = blender_socket.recv(1024 * 1024).decode('utf-8')
                blender_socket.close()
                return jsonify({ "status": "success", "message": "Blender export_obj", "response": response })
            except ConnectionRefusedError:
                error_msg = "Blender addon not responding on port 9999. Is the addon active?"
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({ "status": "error", "message": error_msg }), 503
            except socket.timeout:
                error_msg = "Blender addon timed out (>6s). Large exports can take time."
                print(f"[BRIDGE] ERROR: {error_msg}")
                return jsonify({ "status": "error", "message": error_msg }), 504
        else:
            error_msg = f"Unknown command type: {cmd_type}"
            print(f"[BRIDGE] ERROR: {error_msg}")
            return jsonify({ "status": "error", "message": error_msg }), 400
            
    except Exception as e:
        error_msg = f"Bridge execute error: {str(e)}"
        print(f"[BRIDGE] ERROR: {error_msg}")
        return jsonify({"status": "error", "message": error_msg}), 500

if __name__ == '__main__':
    try:
        # Run on 0.0.0.0 to ensure loopback works from any local address
        app.run(host='0.0.0.0', port=PORT)
    except Exception as e:
        print(f"Failed to start server: {e}")
        input("Press Enter to close...")
      `;
      
      const blob = new Blob([serverCode], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mossy_server.py'; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addLog('System', 'Generated NEW mossy_server.py (v3.0)', 'success');
  };

  const handleDownloadBatch = () => {
      const batCode = `@echo off
title Mossy Bridge Server
echo ===================================================
echo    MOSSY NEURAL LINK - INITIALIZATION SEQUENCE
echo ===================================================
echo.

set PYTHON_CMD=

echo [System] Searching for Python...

:: 1. Check Standard PATH
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [System] Found 'python' in PATH.
    set PYTHON_CMD=python
    goto :FOUND
)

:: 2. Check Python Launcher
where py >nul 2>nul
if %errorlevel% equ 0 (
    echo [System] Found 'py' launcher.
    set PYTHON_CMD=py
    goto :FOUND
)

:: 3. Check Common Installation Directories (Deep Search)
if exist "%LOCALAPPDATA%\\Programs\\Python\\Python312\\python.exe" set PYTHON_CMD="%LOCALAPPDATA%\\Programs\\Python\\Python312\\python.exe"
if exist "%LOCALAPPDATA%\\Programs\\Python\\Python311\\python.exe" set PYTHON_CMD="%LOCALAPPDATA%\\Programs\\Python\\Python311\\python.exe"
if exist "%LOCALAPPDATA%\\Programs\\Python\\Python310\\python.exe" set PYTHON_CMD="%LOCALAPPDATA%\\Programs\\Python\\Python310\\python.exe"
if exist "C:\\Python312\\python.exe" set PYTHON_CMD="C:\\Python312\\python.exe"
if exist "C:\\Python311\\python.exe" set PYTHON_CMD="C:\\Python311\\python.exe"

if defined PYTHON_CMD (
    echo [System] Found Python at: %PYTHON_CMD%
    goto :FOUND
)

:ERROR
echo.
echo [ERROR] Python was NOT found on this system.
echo.
echo =======================================================
echo                 CRITICAL ERROR
echo =======================================================
echo 1. You likely do NOT have Python installed.
echo 2. Go to https://www.python.org/downloads/
echo 3. Download and Install Python 3.10 or newer.
echo 4. IMPORTANT: Check "Add Python to PATH" in the installer.
echo =======================================================
echo.
pause
exit /b

:FOUND
echo.
echo [1/2] Installing dependencies (flask, mss, pyautogui, psutil)...
%PYTHON_CMD% -m pip install flask flask-cors mss pyautogui pyperclip psutil
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Dependency install failed.
    echo If this is a network error, check your internet.
    echo Attempting to launch anyway...
)

echo.
echo [2/2] Launching Bridge Core...
%PYTHON_CMD% mossy_server.py
pause
`;
      const blob = new Blob([batCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'start_mossy.bat';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addLog('System', 'Generated improved start_mossy.bat', 'success');
  };

  const handleDownloadAddon = () => {
    const addonCode = `
import bpy
import socket
import json
import threading
import time
import traceback

bl_info = {
    "name": "Mossy Link",
    "author": "Mossy Desktop",
    "version": (6, 0, 0),
    "blender": (3, 6, 0),
    "location": "View3D > Sidebar > Mossy",
    "description": "Socket-based bridge for Mossy (scripts, text blocks, context, export presets)",
    "category": "System",
    "support": "COMMUNITY"
}

MOSSY_SERVER = None
MOSSY_PORT = 9999
MOSSY_HOST = '127.0.0.1'

def _safe_json(obj):
    try:
        return json.dumps(obj, ensure_ascii=False)
    except Exception:
        return json.dumps({"ok": False, "error": "json-encode-failed"})

def _get_context_snapshot():
    ctx = bpy.context
    obj = ctx.active_object
    selected = [o.name for o in ctx.selected_objects] if ctx.selected_objects else []
    enabled_addons = []
    try:
        enabled_addons = sorted(list(getattr(bpy.context.preferences, "addons", {}).keys()))
    except Exception:
        enabled_addons = []
    active_action = ""
    action_pose_markers = 0
    nla_track_count = 0
    nla_strip_count = 0
    try:
        if obj and obj.type == "ARMATURE" and obj.animation_data and obj.animation_data.action:
            active_action = obj.animation_data.action.name
            try:
                action_pose_markers = len(obj.animation_data.action.pose_markers)
            except Exception:
                action_pose_markers = 0
    except Exception:
        active_action = ""
    try:
        if obj and obj.type == "ARMATURE" and obj.animation_data and obj.animation_data.nla_tracks:
            nla_track_count = len(obj.animation_data.nla_tracks)
            try:
                nla_strip_count = sum(len(t.strips) for t in obj.animation_data.nla_tracks)
            except Exception:
                nla_strip_count = 0
    except Exception:
        nla_track_count = 0
        nla_strip_count = 0

    fps = 0
    try:
        fps = int(getattr(ctx.scene.render, "fps", 0)) if getattr(ctx, "scene", None) else 0
    except Exception:
        fps = 0
    return {
        "blender": bpy.app.version_string,
        "filepath": bpy.data.filepath or "",
        "mode": getattr(ctx, "mode", ""),
        "scene": getattr(ctx.scene, "name", ""),
        "activeObject": obj.name if obj else "",
        "activeType": obj.type if obj else "",
        "activeAction": active_action,
        "actionPoseMarkers": action_pose_markers,
        "nlaTracks": nla_track_count,
        "nlaStrips": nla_strip_count,
        "fps": fps,
        "selected": selected,
        "unitSystem": getattr(ctx.scene.unit_settings, "system", "") if getattr(ctx, "scene", None) else "",
        "unitScale": getattr(ctx.scene.unit_settings, "scale_length", 1.0) if getattr(ctx, "scene", None) else 1.0,
        "enabledAddons": enabled_addons,
    }

def _scene_warnings():
    warnings = []
    try:
        ctx = bpy.context
        sel = ctx.selected_objects or []
        for o in sel:
            if o.type in {"MESH", "ARMATURE"}:
                sx, sy, sz = o.scale
                if abs(sx - 1.0) > 1e-6 or abs(sy - 1.0) > 1e-6 or abs(sz - 1.0) > 1e-6:
                    warnings.append(f"Unapplied scale on '{o.name}' ({sx:.3f}, {sy:.3f}, {sz:.3f}). Consider Ctrl+A → Apply Scale.")
                if sx < 0 or sy < 0 or sz < 0:
                    warnings.append(f"Negative scale on '{o.name}'. This can break exports.")

        # Animation heuristics
        active = ctx.active_object
        if active and active.type == "ARMATURE":
            ad = getattr(active, "animation_data", None)
            if not ad or not getattr(ad, "action", None):
                warnings.append("Active object is an Armature but has no active Action. For animation export, ensure an Action is active or use NLA.")
            else:
                try:
                    if len(ad.action.pose_markers) == 0:
                        warnings.append("Active Action has no pose markers. Some FO4 pipelines use pose markers for annotations/events.")
                except Exception:
                    pass

        # FO4-ish timing heuristic (commonly 30fps)
        try:
            fps = int(getattr(ctx.scene.render, "fps", 0)) if getattr(ctx, "scene", None) else 0
            if fps and fps != 30:
                warnings.append(f"Scene FPS is {fps}. Many FO4 animation pipelines assume 30fps; confirm your guide's expected FPS.")
        except Exception:
            pass
    except Exception:
        pass

    # NIF pipeline hint
    try:
        enabled = getattr(bpy.context.preferences, "addons", {})
        has_niftools = any("nif" in k.lower() and "tool" in k.lower() for k in enabled.keys())
        if not has_niftools:
            warnings.append("NIF export requires a NifTools-style Blender add-on; Mossy Link focuses on safe script/text export and OBJ/FBX helpers.")
    except Exception:
        pass
    return warnings

def _op_kwargs(op, kwargs):
    """Filter kwargs to only properties supported by an operator (robust across Blender versions)."""
    try:
        props = op.get_rna_type().properties
        allowed = set(p.identifier for p in props)
        return {k: v for k, v in kwargs.items() if k in allowed}
    except Exception:
        return kwargs

def _run_on_main_thread(fn, timeout=3.0):
    done = threading.Event()
    out = {"ok": False, "error": "timeout"}

    def _timer():
        try:
            out.update(fn())
        except Exception as e:
            out["ok"] = False
            out["error"] = str(e)
            out["trace"] = traceback.format_exc(limit=3)
        finally:
            done.set()
        return None

    bpy.app.timers.register(_timer)
    done.wait(timeout)
    return out

class MossySocketServer:
    def __init__(self, host=MOSSY_HOST, port=MOSSY_PORT):
        self.host = host
        self.port = port
        self.socket = None
        self.running = False
        self.thread = None

    def start(self):
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket.bind((self.host, self.port))
            self.socket.listen(8)
            self.running = True
            self.thread = threading.Thread(target=self._accept_loop, daemon=True)
            self.thread.start()
            print(f"[Mossy Link] Listening on {self.host}:{self.port}")
        except Exception as e:
            print(f"[Mossy Link] Failed to start server: {e}")

    def stop(self):
        self.running = False
        try:
            if self.socket:
                self.socket.close()
        except Exception:
            pass
        self.socket = None
        print("[Mossy Link] Stopped")

    def _accept_loop(self):
        while self.running:
            try:
                self.socket.settimeout(1.0)
                client, addr = self.socket.accept()
                self._handle_client(client, addr)
            except socket.timeout:
                continue
            except Exception as e:
                if self.running:
                    print(f"[Mossy Link] Server error: {e}")

    def _handle_client(self, client, addr):
        try:
            client.settimeout(3.0)
            raw = client.recv(1024 * 1024)
            if not raw:
                client.close()
                return

            text = raw.decode('utf-8', errors='replace').strip()

            # Back-compat: raw PING / EXECUTE:
            if text == 'PING':
                client.send(b'PONG')
                client.close()
                return
            if text.startswith('EXECUTE:'):
                code = text.replace('EXECUTE:', '', 1)
                res = _run_on_main_thread(lambda: self._execute_script(code))
                client.send(_safe_json(res).encode('utf-8'))
                client.close()
                return

            # Preferred: JSON protocol
            try:
                msg = json.loads(text)
            except Exception:
                client.send(_safe_json({"ok": False, "error": "invalid-json"}).encode('utf-8'))
                client.close()
                return

            mtype = str(msg.get('type') or '').strip().lower()
            if mtype in ('ping', 'health'):
                payload = {"ok": True, "result": "pong", "context": _get_context_snapshot()}
                client.send(_safe_json(payload).encode('utf-8'))
                client.close()
                return

            if mtype in ('get_context', 'context'):
                payload = {"ok": True, "context": _get_context_snapshot(), "warnings": _scene_warnings()}
                client.send(_safe_json(payload).encode('utf-8'))
                client.close()
                return

            if mtype == 'script':
                code = msg.get('code') or msg.get('script') or ''
                res = _run_on_main_thread(lambda: self._execute_script(code))
                client.send(_safe_json(res).encode('utf-8'))
                client.close()
                return

            if mtype == 'text':
                name = msg.get('name') or 'MOSSY_SCRIPT'
                code = msg.get('code') or msg.get('script') or ''
                run = bool(msg.get('run', False))
                res = _run_on_main_thread(lambda: self._write_text(name, code, run))
                client.send(_safe_json(res).encode('utf-8'))
                client.close()
                return

            if mtype == 'export_fbx':
                filepath = msg.get('filepath') or msg.get('path') or ''
                use_selection = bool(msg.get('use_selection', True))
                bake_anim = bool(msg.get('bake_anim', False))
                res = _run_on_main_thread(lambda: self._export_fbx(filepath, use_selection, bake_anim))
                client.send(_safe_json(res).encode('utf-8'))
                client.close()
                return

            if mtype == 'export_obj':
                filepath = msg.get('filepath') or msg.get('path') or ''
                use_selection = bool(msg.get('use_selection', True))
                res = _run_on_main_thread(lambda: self._export_obj(filepath, use_selection))
                client.send(_safe_json(res).encode('utf-8'))
                client.close()
                return

            client.send(_safe_json({"ok": False, "error": f"unknown-type:{mtype}"}).encode('utf-8'))
            client.close()
        except Exception as e:
            try:
                client.send(_safe_json({"ok": False, "error": str(e)}).encode('utf-8'))
            except Exception:
                pass
            try:
                client.close()
            except Exception:
                pass

    def _execute_script(self, code: str):
        try:
            exec(str(code), {'bpy': bpy, 'D': bpy.data, 'C': bpy.context})
            return {"ok": True, "result": "executed"}
        except Exception as e:
            return {"ok": False, "error": str(e), "trace": traceback.format_exc(limit=3)}

    def _write_text(self, name: str, code: str, run: bool):
        try:
            name = str(name or 'MOSSY_SCRIPT')
            text = bpy.data.texts.get(name) or bpy.data.texts.new(name)
            text.clear()
            text.write(str(code or ''))
            if run:
                exec(text.as_string(), {'bpy': bpy, 'D': bpy.data, 'C': bpy.context})
            return {"ok": True, "result": f"text:{name}", "ran": bool(run)}
        except Exception as e:
            return {"ok": False, "error": str(e), "trace": traceback.format_exc(limit=3)}

    def _export_fbx(self, filepath: str, use_selection: bool, bake_anim: bool):
        filepath = str(filepath or '').strip()
        if not filepath:
            return {"ok": False, "error": "missing-filepath"}
        try:
            # Conservative defaults; avoids common skeleton issues.
            kwargs = {
                "filepath": filepath,
                "use_selection": use_selection,
                "apply_unit_scale": True,
                "apply_scale_options": 'FBX_SCALE_ALL',
                "add_leaf_bones": False,
                "bake_anim": bool(bake_anim),
            }
            bpy.ops.export_scene.fbx(**_op_kwargs(bpy.ops.export_scene.fbx, kwargs))
            return {"ok": True, "result": "exported", "filepath": filepath, "warnings": _scene_warnings()}
        except Exception as e:
            return {"ok": False, "error": str(e), "trace": traceback.format_exc(limit=3)}

    def _export_obj(self, filepath: str, use_selection: bool):
        filepath = str(filepath or '').strip()
        if not filepath:
            return {"ok": False, "error": "missing-filepath"}
        try:
            # Outfit Studio-friendly defaults.
            if hasattr(bpy.ops.wm, "obj_export"):
                kwargs = {
                    "filepath": filepath,
                    "export_selected_objects": bool(use_selection),
                    "export_uv": True,
                    "export_normals": True,
                    "export_materials": False,
                    "export_triangulated_mesh": False,
                    "export_object_groups": True,
                    "path_mode": 'AUTO',
                }
                bpy.ops.wm.obj_export(**_op_kwargs(bpy.ops.wm.obj_export, kwargs))
            else:
                kwargs = {
                    "filepath": filepath,
                    "use_selection": bool(use_selection),
                    "use_mesh_modifiers": True,
                    "use_normals": True,
                    "use_uvs": True,
                    "use_materials": False,
                    "keep_vertex_order": True,
                    "axis_forward": '-Z',
                    "axis_up": 'Y',
                }
                bpy.ops.export_scene.obj(**_op_kwargs(bpy.ops.export_scene.obj, kwargs))
            return {"ok": True, "result": "exported", "filepath": filepath, "warnings": _scene_warnings()}
        except Exception as e:
            return {"ok": False, "error": str(e), "trace": traceback.format_exc(limit=3)}

class MOSSY_PT_Panel(bpy.types.Panel):
    bl_label = "Mossy Neural Link"
    bl_idname = "MOSSY_PT_Panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Mossy'

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        row = layout.row(align=True)
        row.prop(scene, "mossy_link_active", text="Link", toggle=True)
        row.operator("mossy.test_connection", text="Test", icon='NETWORK_DRIVE')

        box = layout.box()
        if scene.mossy_link_active:
            box.label(text="✓ Listening", icon='WORLD')
            box.label(text=f"Host: {MOSSY_HOST}", icon='URL')
            box.label(text=f"Port: {MOSSY_PORT}", icon='NETWORK_DRIVE')
        else:
            box.label(text="✗ Offline", icon='ERROR')

        col = layout.column(align=True)
        col.label(text="Tip: Keep Blender open, then click Connect in Mossy.")

class MOSSY_OT_TestConnection(bpy.types.Operator):
    bl_idname = "mossy.test_connection"
    bl_label = "Test Mossy Connection"

    def execute(self, context):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            sock.connect((MOSSY_HOST, MOSSY_PORT))
            sock.send(json.dumps({"type": "ping"}).encode('utf-8'))
            response = sock.recv(4096).decode('utf-8', errors='replace')
            sock.close()
            self.report({'INFO'}, f"Mossy Link: {response[:120]}")
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Mossy Link: {str(e)}")
            return {'CANCELLED'}

def update_mossy_link_active(self, context):
    global MOSSY_SERVER
    if self.mossy_link_active:
        if MOSSY_SERVER is None:
            MOSSY_SERVER = MossySocketServer()
            MOSSY_SERVER.start()
    else:
        if MOSSY_SERVER is not None:
            MOSSY_SERVER.stop()
            MOSSY_SERVER = None

def register():
    bpy.utils.register_class(MOSSY_PT_Panel)
    bpy.utils.register_class(MOSSY_OT_TestConnection)

    if hasattr(bpy.types.Scene, 'mossy_link_active'):
        try:
            del bpy.types.Scene.mossy_link_active
        except Exception:
            pass

    bpy.types.Scene.mossy_link_active = bpy.props.BoolProperty(
        name="Mossy Link Active",
        description="Enable Mossy Link socket server",
        default=False,
        update=update_mossy_link_active
    )
    print("[Mossy Link] Add-on v6.0 registered")

def unregister():
    global MOSSY_SERVER
    if MOSSY_SERVER is not None:
        MOSSY_SERVER.stop()
        MOSSY_SERVER = None

    if hasattr(bpy.types.Scene, 'mossy_link_active'):
        try:
            del bpy.types.Scene.mossy_link_active
        except Exception:
            pass

    bpy.utils.unregister_class(MOSSY_OT_TestConnection)
    bpy.utils.unregister_class(MOSSY_PT_Panel)
    print("[Mossy Link] Add-on unregistered")

if __name__ == "__main__":
    register()
    `;
    const blob = new Blob([addonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mossy_link.py'; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
        addLog('System', 'Generated Blender Add-on (mossy_link.py) v6.0', 'success');
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

  const toggleDriver = (id: string) => {
      setDrivers(prev => prev.map(d => {
          if (d.id !== id) return d;
          return { ...d, status: d.status === 'active' ? 'inactive' : 'active' };
      }));
  };

  // === REAL BRIDGE API TESTING FUNCTIONS ===
  
  const testBridgeConnection = async () => {
      setTestingBridge(true);
      addLog('Bridge', 'Testing connectivity to port 21337...', 'ok');

      const base = normalizeHttpUrl(bridgeBaseUrl) || 'http://127.0.0.1:21337';
      const targets = [`${base}/health`, 'http://127.0.0.1:21337/health', 'http://localhost:21337/health'];
      let success = false;

      for (const url of targets) {
          try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 1500); // Fast fail

              const response = await fetch(url, { 
                  signal: controller.signal,
                  mode: 'cors' 
              });
              
              clearTimeout(timeoutId);

              if (response.ok) {
                  const data = await response.json();
                  addLog('Bridge', `Connected via ${url.includes('127.0.0.1') ? 'IP' : 'Localhost'}! (v${data.version})`, 'success');
                  setBridgeConnected(true);
                  setBridgeVersion(data.version);
                  localStorage.setItem('mossy_bridge_active', 'true');
                  localStorage.setItem('mossy_bridge_version', data.version);
                  success = true;
                  break;
              }
          } catch (e) {
              console.warn(`[DesktopBridge] Fetch to ${url} failed`, e);
          }
      }

      if (!success) {
          addLog('Bridge', 'Connection failed: All endpoints unreachable.', 'err');
          addLog('Bridge', 'TROUBLESHOOTING: 1. Is Python server running? 2. Check Firewall. 3. Try running as Admin.', 'warn');
          setBridgeConnected(false);
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
      } else {
          localStorage.setItem('mossy_blender_active', 'false');
          setBlenderLinked(false);
          window.dispatchEvent(new CustomEvent('mossy-blender-linked', { detail: false }));
          addLog('System', 'Blender add-on not responding on port 9999.', 'warn');
          
          // Instruction for user
          addLog('System', 'Make sure: 1) Blender is open, 2) Add-on is installed, 3) Toggle is ON in Mossy panel', 'ok');
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
        setBlenderExportStatus('');
        try {
            const base = normalizeHttpUrl(bridgeBaseUrl) || 'http://127.0.0.1:21337';
            const response = await fetch(`${base}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'context' }),
            });
            const data = await response.json();
            const raw = String(data?.response || '');
            setBlenderContextRaw(raw);
            try {
                setBlenderContext(raw ? JSON.parse(raw) : null);
            } catch {
                setBlenderContext(null);
            }
            if (!response.ok || data?.status !== 'success') {
                setBlenderContextError(String(data?.message || 'Failed to fetch Blender context'));
            } else {
                addLog('Blender', 'Context snapshot retrieved', 'success');
            }
        } catch (e: any) {
            setBlenderContextError(String(e?.message || e));
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

            const base = normalizeHttpUrl(bridgeBaseUrl) || 'http://127.0.0.1:21337';
            const response = await fetch(`${base}/execute`, {
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

  const fetchHardwareInfo = async () => {
      try {
          const base = normalizeHttpUrl(bridgeBaseUrl) || 'http://127.0.0.1:21337';
          const response = await fetch(`${base}/hardware`);
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
          const base = normalizeHttpUrl(bridgeBaseUrl) || 'http://127.0.0.1:21337';
          const response = await fetch(`${base}/capture`);
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
          const base = normalizeHttpUrl(bridgeBaseUrl) || 'http://127.0.0.1:21337';
          const response = await fetch(`${base}/clipboard`, {
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
          const base = normalizeHttpUrl(bridgeBaseUrl) || 'http://127.0.0.1:21337';
          const response = await fetch(`${base}/files`, {
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
              <p className="text-sm text-slate-400 mt-1">Local system integration - {normalizeHttpUrl(bridgeBaseUrl) || 'http://127.0.0.1:21337'}</p>
          </div>
          <div className="flex items-center gap-4">
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

      {/* Scrollable content (everything below header) */}
      <div ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto pb-32">
            <div className="px-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToolsInstallVerifyPanel
                    accentClassName="text-emerald-300"
                    description="Desktop Bridge connects the UI to local capabilities (hardware info, screenshots, clipboard, file listing). The UI can render without it, but actions will fail if the local bridge server isn’t reachable."
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
                    shortcuts={[
                        { label: 'Diagnostics', to: '/diagnostics' },
                        { label: 'System Monitor', to: '/monitor' },
                        { label: 'Workshop', to: '/workshop' },
                        { label: 'Tool Settings', to: '/settings/tools' },
                    ]}
                />

                <div className="bg-black/40 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm font-bold text-emerald-300 mb-2">📦 Existing Setup / Install (Legacy)</div>
                    <div className="text-xs text-slate-300 mb-3">
                        Short-form version of the original setup so it’s visible immediately. Full details still live in the tabs below.
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => openTabAndScroll('setup', setupCardRef)}
                            className="px-3 py-2 rounded bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold text-white"
                        >
                            Jump: Python Server Setup
                        </button>
                        <button
                            type="button"
                            onClick={() => openTabAndScroll('hardware', hardwareCardRef)}
                            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                        >
                            Jump: Hardware Scan
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowHelp(true);
                                openTabAndScroll('setup', setupCardRef);
                            }}
                            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                        >
                            Jump: Troubleshooting
                        </button>
                        <button
                            type="button"
                            onClick={() => openTabAndScroll('blender', blenderCardRef)}
                            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                        >
                            Jump: Blender Install
                        </button>
                        <button
                            type="button"
                            onClick={() => openTabAndScroll('ck', ckCardRef)}
                            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                        >
                            Jump: Creation Kit Link
                        </button>
                    </div>

                    <div className="mt-3 border-t border-slate-700 pt-3">
                        <div className="text-xs font-bold text-slate-200 mb-1">Quick Start (existing)</div>
                        <ol className="text-xs text-slate-300 list-decimal list-inside space-y-1">
                            <li>Download the server (.py) and launcher (.bat).</li>
                            <li>Put them in a folder like <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">C:\\Mossy</span>.</li>
                            <li>Run <strong>start_mossy.bat</strong> and wait for port <strong>21337</strong>.</li>
                            <li>Click <strong>Test Connection</strong> until ONLINE.</li>
                        </ol>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={handleDownloadServer}
                                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                            >
                                Download Server (.py)
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadBatch}
                                className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                            >
                                Download Launcher (.bat)
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 border-t border-slate-700 pt-3">
                        <div className="text-xs font-bold text-slate-200 mb-1">Blender Link (existing)</div>
                        <ul className="text-xs text-slate-300 list-disc list-inside space-y-1">
                            <li>Install the Mossy Blender add-on and enable it in Blender.</li>
                            <li>Ensure the add-on is listening (typically port <strong>9999</strong>).</li>
                            <li>Return here and confirm Blender Link shows CONNECTED.</li>
                        </ul>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => openTabAndScroll('blender', blenderCardRef)}
                                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                            >
                                Open Blender Link Tab
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 border-t border-slate-700 pt-3">
                        <div className="text-xs font-bold text-slate-200 mb-1">Hardware Scan (existing)</div>
                        <ul className="text-xs text-slate-300 list-disc list-inside space-y-1">
                            <li>Bridge must be ONLINE.</li>
                            <li>Click <strong>Scan Hardware</strong> to pull CPU/RAM/GPU details.</li>
                        </ul>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => openTabAndScroll('hardware', hardwareCardRef)}
                                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                            >
                                Open Hardware Tab
                            </button>
                        </div>
                    </div>
                </div>
            </div>

      {isOutdated && (
          <div className="mx-6 mt-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-4 animate-bounce">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                  <h3 className="font-bold text-white">UPDATE REQUIRED</h3>
                  <p className="text-sm text-red-200">
                      You are connected to version {bridgeVersion || '?'}. Hardware scanning requires v5.0+.
                      <br/>
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
              { id: 'files', icon: FolderOpen, label: 'Files' }
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                      activeTab === tab.id
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
                      className={`rounded-xl border p-6 ${
                      bridgeConnected ? 'bg-emerald-900/10 border-emerald-500/50' : 'bg-slate-900 border-slate-700'
                  }`}
                  >
                      <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                          <Server className={bridgeConnected ? 'text-emerald-400' : 'text-slate-400'} />
                          Python Server Setup
                      </h3>
                      
                      {bridgeConnected ? (
                          <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded">
                              <div className="flex items-center gap-2 mb-2 font-bold text-emerald-400">
                                  <CheckCircle2 className="w-5 h-5"/> Bridge Active
                              </div>
                              <p className="text-sm text-emerald-300">Python server is responding at {normalizeHttpUrl(bridgeBaseUrl) || 'http://127.0.0.1:21337'}. All systems operational.</p>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              <div className="p-4 bg-black/40 rounded-lg border border-slate-700">
                                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                                      <Keyboard className="w-4 h-4"/> Quick Start
                                  </h4>
                                  <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-300">
                                      <li>Download both files using the buttons below</li>
                                      <li>Save them to a new folder (e.g., <code className="bg-slate-800 px-2 py-0.5 rounded">C:\Mossy</code>)</li>
                                      <li>Double-click <strong>start_mossy.bat</strong></li>
                                      <li>Wait for console to show &quot;Running on http://127.0.0.1:21337&quot; (or your configured Bridge URL)</li>
                                      <li>Click &quot;Test Connection&quot; above</li>
                                  </ol>
                              </div>

                              <div className="p-4 bg-black/40 rounded-lg border border-slate-700">
                                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                                      <Server className="w-4 h-4" /> Advanced connections
                                  </h4>
                                  <div className="text-xs text-slate-400 mb-2">
                                      Set where Mossy should talk to the Python Bridge. Default is local: <span className="font-mono">http://127.0.0.1:21337</span>.
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                      <input
                                          value={bridgeBaseUrl}
                                          onChange={(e) => setBridgeBaseUrl(e.target.value)}
                                          placeholder="http://127.0.0.1:21337"
                                          className="flex-1 rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                      />
                                      <button
                                          onClick={testBridgeConnection}
                                          disabled={testingBridge}
                                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs"
                                          title="Tests /health on the configured Bridge URL"
                                      >
                                          Test URL
                                      </button>
                                  </div>
                                  <div className="mt-2 text-[10px] text-slate-500">
                                      Tip: you can run the Bridge on a different port or machine, but keep it on a trusted network.
                                  </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-3">
                                  <button 
                                      onClick={handleDownloadServer}
                                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-colors"
                                  >
                                      <ArrowDownToLine className="w-5 h-5" /> 1. Download Server (.py)
                                  </button>
                                  <button 
                                      onClick={handleDownloadBatch}
                                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
                                  >
                                      <FileType className="w-5 h-5" /> 2. Download Launcher (.bat)
                                  </button>
                              </div>

                              {showHelp && (
                                  <div className="p-4 bg-red-900/20 border border-red-500/30 rounded">
                                      <h5 className="font-bold text-red-400 flex items-center gap-2 mb-2">
                                          <AlertTriangle className="w-4 h-4"/> Common Issues
                                      </h5>
                                      <div className="space-y-3 text-sm text-slate-300">
                                          <div>
                                              <strong>&quot;Python is not recognized&quot;</strong>
                                              <p className="text-xs text-slate-400 mt-1">
                                                  Python isn&apos;t installed or not in PATH. Download from <a href="https://python.org" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">python.org</a> and check &quot;Add Python to PATH&quot; during install.
                                              </p>
                                          </div>
                                          <div>
                                              <strong>&quot;Permission denied&quot; or &quot;Already in use&quot;</strong>
                                              <p className="text-xs text-slate-400 mt-1">
                                                  The Bridge port is blocked or already in use. Check Windows Firewall or close any other app using your configured port.
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
                                  <span className={`font-bold shrink-0 w-20 ${
                                      log.status === 'err' ? 'text-red-400' :
                                      log.status === 'success' ? 'text-emerald-400' :
                                      'text-blue-400'
                                  }`}>{log.source}</span>
                                  <span className={`break-all ${
                                      log.status === 'warn' ? 'text-yellow-400' :
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
                                  Configure Papyrus paths, generate a .psc, and compile to .pex. This uses the desktop app’s local tool bridge (no Python server required).
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
                                      <input
                                          value={ckSettings.creationKitPath}
                                          onChange={(e) => setCkSettings((s) => ({ ...s, creationKitPath: e.target.value }))}
                                          placeholder="C:\\...\\CreationKit.exe"
                                          className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                      />
                                  </div>

                                  <div>
                                      <div className="text-[10px] text-slate-400 mb-1">Fallout 4 Root Folder (optional)</div>
                                      <input
                                          value={ckSettings.fallout4Path}
                                          onChange={(e) => setCkSettings((s) => ({ ...s, fallout4Path: e.target.value }))}
                                          placeholder="C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4"
                                          className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                      />
                                  </div>

                                  <div>
                                      <div className="text-[10px] text-slate-400 mb-1">PapyrusCompiler.exe</div>
                                      <input
                                          value={ckSettings.papyrusCompilerPath}
                                          onChange={(e) => setCkSettings((s) => ({ ...s, papyrusCompilerPath: e.target.value }))}
                                          placeholder="C:\\...\\Papyrus Compiler\\PapyrusCompiler.exe"
                                          className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                      />
                                  </div>

                                  <div>
                                      <div className="text-[10px] text-slate-400 mb-1">TESV_Papyrus_Flags.flg (optional)</div>
                                      <input
                                          value={ckSettings.papyrusFlagsPath}
                                          onChange={(e) => setCkSettings((s) => ({ ...s, papyrusFlagsPath: e.target.value }))}
                                          placeholder="C:\\...\\Papyrus Compiler\\TESV_Papyrus_Flags.flg"
                                          className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                      />
                                  </div>

                                  <div>
                                      <div className="text-[10px] text-slate-400 mb-1">Import Paths (-i) (semicolon-separated)</div>
                                      <input
                                          value={ckSettings.papyrusImportPaths}
                                          onChange={(e) => setCkSettings((s) => ({ ...s, papyrusImportPaths: e.target.value }))}
                                          placeholder="C:\\Fallout4\\Data\\Scripts\\Source;C:\\Fallout4\\Data\\Scripts\\Source\\User"
                                          className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                      />
                                  </div>

                                  <div>
                                      <div className="text-[10px] text-slate-400 mb-1">Papyrus Source Folder (where .psc live)</div>
                                      <input
                                          value={ckSettings.papyrusSourcePath}
                                          onChange={(e) => setCkSettings((s) => ({ ...s, papyrusSourcePath: e.target.value }))}
                                          placeholder="C:\\Fallout4\\Data\\Scripts\\Source\\User"
                                          className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                      />
                                  </div>

                                  <div>
                                      <div className="text-[10px] text-slate-400 mb-1">Papyrus Output Folder (-o) (where .pex go)</div>
                                      <input
                                          value={ckSettings.papyrusOutputPath}
                                          onChange={(e) => setCkSettings((s) => ({ ...s, papyrusOutputPath: e.target.value }))}
                                          placeholder="C:\\Fallout4\\Data\\Scripts"
                                          className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200 font-mono"
                                      />
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
                                          className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200"
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
                                                  className="w-full rounded px-3 py-2 text-xs border border-slate-700 bg-black/40 text-slate-200"
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
                        <div className="bg-black/40 p-4 rounded-lg border border-slate-700">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400"/> Key Capabilities
                            </h4>
                            <ul className="text-xs text-slate-300 space-y-2">
                                <li>• One-click FO4 Standards Alignment</li>
                                <li>• Automated Mesh Generation</li>
                                <li>• Animation Batch Processing</li>
                                <li>• Real-time Scene Analysis</li>
                            </ul>
                        </div>
                        <div className="bg-black/40 p-4 rounded-lg border border-slate-700">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                                <Settings className="w-4 h-4 text-blue-400"/> Installation
                            </h4>
                            <ol className="text-xs text-slate-300 space-y-2 list-decimal pl-4">
                                                                <li>Install Blender for Windows (if needed)</li>
                                <li>Download <strong>mossy_link.py</strong> below</li>
                                <li>In Blender: <em>Edit &gt; Preferences &gt; Add-ons</em></li>
                                <li>Click <strong>Install...</strong> and select the file</li>
                                <li>Enable &quot;System: Mossy Link&quot; checkbox</li>
                                                                <li>In the 3D View sidebar: open the <strong>Mossy</strong> tab and toggle <strong>Link</strong> ON</li>
                            </ol>
                                                        <div className="mt-3 flex gap-2">
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
                    </div>

                    <div className="flex flex-col gap-3">
                        {!blenderLinked ? (
                            <button 
                                onClick={testBlenderLink}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                            >
                                <Zap className="w-6 h-6" />
                                FINAL STEP: Connect Now
                            </button>
                        ) : (
                            <button 
                                onClick={() => {
                                    localStorage.setItem('mossy_blender_active', 'false');
                                    setBlenderLinked(false);
                                    window.dispatchEvent(new CustomEvent('mossy-blender-linked', { detail: false }));
                                }}
                                className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all"
                            >
                                <Lock className="w-6 h-6" />
                                Disconnect Link
                            </button>
                        )}
                        
                        <button 
                            onClick={handleDownloadAddon}
                            className="w-full py-3 border border-blue-500/30 hover:bg-blue-500/10 text-blue-400 text-sm font-bold rounded-xl flex items-center justify-center gap-3 transition-all group"
                        >
                            <ArrowDownToLine className="w-5 h-5 group-hover:animate-bounce" />
                                                        Download Mossy Link Add-on (v6.0)
                        </button>
                    </div>
                </div>

                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                            <Eye className="w-4 h-4 text-emerald-400"/> Blender Awareness
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
                                        <div className="text-xs font-bold text-slate-200 mb-2">FO4 animation export checklist (HKX pipeline)</div>
                                        <div className="text-[11px] text-slate-400">
                                            This is a practical checklist that matches common FO4 animation workflows (Blender → FBX → Havok tools → HKX packaging). It’s not a replacement for the rig author’s guide.
                                        </div>
                                        <ul className="mt-2 text-xs text-slate-300 space-y-1">
                                            <li>• Confirm Blender version + required add-ons are installed for your rig.</li>
                                            <li>• Ensure the Armature is active and an Action is selected (Scan Scene will show it).</li>
                                            <li>• Verify timing: many FO4 pipelines assume 30 FPS (Mossy warns if different).</li>
                                            <li>• If your pipeline uses annotation/events: add pose markers to the Action.</li>
                                            <li>• Export using “Animation transfer (FBX, baked)” to an output folder.</li>
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
                                                <div className="text-[10px] text-slate-400">Nexus Mods (creator credited on mod page)</div>
                                            </button>

                                            <button onClick={() => void openUrl('https://www.nexusmods.com/fallout4/mods/17061')} className="text-left rounded border border-slate-800 bg-black/40 px-3 py-2 hover:bg-black/50">
                                                <div className="text-xs text-slate-200 font-bold">BA2 extractor: BSA Browser</div>
                                                <div className="text-[10px] text-slate-400">Nexus Mods (creator credited on mod page)</div>
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
                      <Zap className="w-4 h-4 text-yellow-400"/> Pro Tip: Automated Workflows
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
      </div>
            </div>
    </div>
  );
};

export default DesktopBridge;