import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ExternalToolNotice from './components/ExternalToolNotice';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { Settings as SettingsIcon } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import {
  Cpu, HardDrive, Activity, Terminal, Search, CheckCircle2, Zap, Box, BrainCircuit, Link,
  Play, Monitor, AlertTriangle, Upload, RefreshCw, Database, ShieldCheck, Package, Settings,
  GamepadIcon, Wrench, FolderOpen, User,
} from 'lucide-react';
import { LocalAIEngine } from './LocalAIEngine';
import { useWheelScrollProxy } from './components/useWheelScrollProxy';
import { mergeRescannedTools, type ApprovedTool } from './toolPermissions';

interface LogEntry {
  id: string;
  time: string;
  msg: string;
  type?: 'info' | 'warning' | 'error' | 'archive' | 'success';
}

interface Integration {
  id: string;
  name: string;
  category: 'AI' | 'Modding' | 'System' | 'Creative' | 'Dev';
  path: string;
  status: 'linked' | 'detected' | 'scanning';
}

interface SystemProfile {
    os: string;
    gpu: string;
    ram: number;
    blenderVersion: string;
    vram: number;
    isLegacy: boolean;
}

interface FO4Ecosystem {
  gameInstalled: boolean;
  gamePath: string;
  gameVersion: string;
  f4seDetected: boolean;
  f4sePath: string;
  modManager: string;
  modManagerPath: string;
  scriptExtender: boolean;
  modCount: number;
  fo4EditDetected: boolean;
  creationKitDetected: boolean;
  bodySlideDetected: boolean;
  lootDetected: boolean;
  nifSkopeDetected: boolean;
}

type SystemMonitorProps = {
    embedded?: boolean;
};

// Reliability sweep (2026-09-01): this session found THREE independent
// "detect programs -> filter to modding-relevant -> approve" implementations
// across the app (ChatInterface.tsx's performSystemScan, this file's
// startScan, and this file's startInstaller), each with its own hand-rolled
// keyword list, each of which drifted a different overly-generic word into
// the list at some point ('game'/'mod'/'script'/'material' in one,
// 'edit'/'unwrap'/'fbx' in another) and let unrelated software into the
// Approved Tools panel as a result. The three lists differ in scope by
// design (this file's are narrower categorization lists; ChatInterface's is
// broader, e.g. it also matches creative/rendering tools like GIMP or
// ENB), so purging a "no longer matches" entry using any ONE list's narrow
// vocabulary would wrongly drop something a wider list legitimately added.
// This union is ONLY for the purge check -- "is this entry still relevant
// to ANY currently-tightened list" -- not for what a given scan freshly
// detects, which still uses that function's own (correctly narrower) list.
const PURGE_RELEVANCE_KEYWORDS = [
    // Shared / editing suites
    'xedit', 'fo4edit', 'fo4xedit', 'sseedit', 'tes5edit', 'fnvedit', 'tes4edit', 'zedit',
    'creation kit', 'creationkit', 'creation',
    'mod organizer', 'modorganizer', 'organizer', 'vortex', 'loot', 'wrye bash', 'wryebash',
    'nifskope', 'nifutils', 'bodyslide', 'outfit studio', 'outfitstudio', 'archive2', 'bae',
    'f4se', 'script extender', 'blender', 'gimp', 'photoshop', 'pjm', 'bethini',
    'reshade', 'enb', 'cathedral', 'modsel', 'texconv', 'unpacker', 'bgsm', 'facegen', 'lipgen',
    'papyrus', 'caprica',
    // Bethesda games this tool ecosystem targets
    'fallout', 'morrowind', 'oblivion', 'skyrim', 'starfield',
    // NVIDIA / AI-assisted creative tooling this app also tracks
    'upscayl', 'shadermap', 'nvidia', 'photodemon', 'omniverse', 'spin3d',
];

const SystemMonitor: React.FC<SystemMonitorProps> = ({ embedded = false }) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'hardware'>('telemetry');

  const [integrations, setIntegrations] = useState<Integration[]>([]);

  // Full mossy_apps list (not the top-10-linked-only slice `integrations` uses),
  // with checked status, so the user can review and change their approve/deny
  // choice after the fact — previously the only moment this could be expressed
  // was the one-time onboarding wizard.
  const [approvedTools, setApprovedTools] = useState<(ApprovedTool & { id: string })[]>([]);

  const loadApprovedTools = () => {
      try {
          const raw = localStorage.getItem('mossy_apps');
          const apps: any[] = raw ? JSON.parse(raw) : [];
          setApprovedTools(
              apps
                  .map((a, idx) => ({
                      id: String(a.id ?? `${a.path || a.name || idx}`),
                      name: String(a.name || a.displayName || '').trim(),
                      path: a.path,
                      category: a.category,
                      checked: typeof a.checked === 'boolean' ? a.checked : true,
                  }))
                  .filter((a) => a.name.length > 0)
          );
      } catch {
          setApprovedTools([]);
      }
  };

  const toggleToolApproval = (id: string) => {
      try {
          const raw = localStorage.getItem('mossy_apps');
          const apps: any[] = raw ? JSON.parse(raw) : [];
          const updated = apps.map((a, idx) => {
              const key = String(a.id ?? `${a.path || a.name || idx}`);
              if (key !== id) return a;
              const currentlyChecked = typeof a.checked === 'boolean' ? a.checked : true;
              return { ...a, checked: !currentlyChecked };
          });
          localStorage.setItem('mossy_apps', JSON.stringify(updated));
          loadApprovedTools();
      } catch (e) {
          console.error('[SystemMonitor] Failed to update tool approval:', e);
      }
  };

  const [profile, setProfile] = useState<SystemProfile | null>(() => {
      try {
          const saved = localStorage.getItem('mossy_system_profile');
          return saved ? JSON.parse(saved) : null;
      } catch { return null; }
  });

  const [scanSummary, setScanSummary] = useState<any | null>(() => {
      try {
          const saved = localStorage.getItem('mossy_scan_summary');
          return saved ? JSON.parse(saved) : null;
      } catch { return null; }
  });

  const [detectedPrograms, setDetectedPrograms] = useState<any[]>(() => {
      try {
          const saved = localStorage.getItem('mossy_all_detected_apps');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  const [fo4Ecosystem, setFo4Ecosystem] = useState<FO4Ecosystem | null>(() => {
      try {
          const saved = localStorage.getItem('mossy_fo4_ecosystem');
          return saved ? JSON.parse(saved) : null;
      } catch { return null; }
  });

  const [data, setData] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);

  const [showInstaller, setShowInstaller] = useState(false);
  const [installStep, setInstallStep] = useState(0);
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [foundTools, setFoundTools] = useState<Array<{name: string, category: string}>>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  // Reliability sweep (2026-09-01): detectPrograms() can legitimately run for a
  // minute or more (deep 7-level scan across every drive) with zero interim
  // feedback -- previously scanProgress jumped 10->20->30 in an instant, then sat
  // at 30% in total silence until the promise resolved, which read as frozen/fake
  // (a user flagged this exact symptom). This ref lets a ticking interval nudge
  // the bar upward while we wait, same pattern already used in FirstRunOnboarding.
  const scanDetectionTimerRef = useRef<number | null>(null);
  // Second, independent "still alive" signal alongside the percentage ticker --
  // see the comment above where this is started in startScan().
  const scanHeartbeatTimerRef = useRef<number | null>(null);

  // Stop the tickers if the user navigates away mid-scan.
  useEffect(() => {
      return () => {
          if (scanDetectionTimerRef.current !== null) {
              window.clearInterval(scanDetectionTimerRef.current);
          }
          if (scanHeartbeatTimerRef.current !== null) {
              window.clearInterval(scanHeartbeatTimerRef.current);
          }
      };
  }, []);
  const installLogRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string, type: 'info' | 'warning' | 'error' | 'archive' | 'success' = 'info') => {
      const newLog: LogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          time: new Date().toLocaleTimeString(),
          msg,
          type
      };
      setLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  const handleLaunchApp = async (path: string, name: string) => {
    if (!path || path === 'LINKED_VIA_BRIDGE') return;
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (api?.openProgram) {
        try {
            const result = await api.openProgram(path);
            if (result.success) {
                addLog(`Launched ${name} from ${path}`, 'success');
            } else {
                addLog(`Failed to launch ${name}: ${result.error || 'The system bridge reported a failure.'}`, 'error');
            }
        } catch (e) {
            addLog(`Failed to launch ${name}: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
        }
    } else if (api?.openExternal) {
        try {
            await api.openExternal(path);
            addLog(`Launched ${name} from ${path}`, 'success');
        } catch (e) {
            addLog(`Failed to launch ${name}: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
        }
    }
  };

  useEffect(() => {
      if (profile) localStorage.setItem('mossy_system_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
      const syncIntegrations = () => {
          try {
              const driversSaved = localStorage.getItem('mossy_bridge_drivers');
              const appsSaved = localStorage.getItem('mossy_apps');
              let newIntegrations: Integration[] = [];

              if (driversSaved) {
                  const drivers = JSON.parse(driversSaved);
                  newIntegrations = drivers
                      .filter((d: any) => d.status === 'active')
                      .map((d: any) => ({
                          id: d.id,
                          name: d.name || d.id,
                          category: d.id === 'blender' ? 'Creative' : d.id === 'vscode' ? 'Dev' : 'System',
                          path: 'LINKED_VIA_BRIDGE',
                          status: 'linked'
                      }));
              }

              if (appsSaved) {
                  const apps = JSON.parse(appsSaved);
                  const appIntegrations = apps.slice(0, 10).map((a: any, idx: number) => ({
                      id: `app-${idx}`,
                      name: a.name,
                      category: 'Detected',
                      path: a.path,
                      status: 'linked'
                  }));
                  newIntegrations = [...newIntegrations, ...appIntegrations];
              }

              setIntegrations(newIntegrations);
              loadApprovedTools();
          } catch (err) {
              console.error('Failed to sync integrations:', err);
          }
      };

      syncIntegrations();
      window.addEventListener('storage', syncIntegrations);
      const i = setInterval(syncIntegrations, 2000);
      return () => {
          window.removeEventListener('storage', syncIntegrations);
          clearInterval(i);
      };
  }, []);

  useEffect(() => {
    const t = new Date().toLocaleTimeString();
    if (logs.length === 0 && !isScanning) {
        setLogs([
        { id: 'init-1', time: t, msg: "[SYSTEM] Mossy Backend Services Active...", type: 'info' },
        { id: 'init-2', time: t, msg: "[WAITING] Passive monitoring initialized...", type: 'warning' },
        ]);
    }
  }, []);

  useEffect(() => {
    const fetchTelemetry = async () => {
        if (window.electronAPI?.getPerformance) {
            const perf = await window.electronAPI.getPerformance();
            const gpu = perf.gpu?.available ? perf.gpu : null;
            setData(prev => {
                const newData = [...prev, {
                    name: new Date().toLocaleTimeString(),
                    cpu: perf.cpu ?? 0,
                    // "Neural Engine %" = real GPU compute utilization (nvidia-smi) —
                    // this is what actually runs local LLM/image-gen inference.
                    neural: gpu?.utilizationPercent ?? 0,
                    memory: (perf.totalMemGB != null && perf.freeMemGB != null)
                      ? perf.totalMemGB - perf.freeMemGB
                      : 0,
                    vram: gpu?.vramUsedGB ?? 0,
                    gpuAvailable: !!gpu,
                }].slice(-20);
                return newData;
            });
        } else {
            setData(prev => {
                const newData = [...prev, {
                    name: new Date().toLocaleTimeString(),
                    cpu: 0,
                    neural: 0,
                    memory: 0,
                    vram: 0,
                    gpuAvailable: false,
                }].slice(-20);
                return newData;
            });
        }
    };

    const interval = setInterval(fetchTelemetry, 2000);
    fetchTelemetry();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      if (installLogRef.current) {
          (installLogRef.current as any).scrollTop = (installLogRef.current as any).scrollHeight;
      }
  }, [installLog]);

  const detectFO4Ecosystem = (allApps: any[], sysInfo: any): FO4Ecosystem => {
    const getName = (a: any) => (a.displayName || a.name || '').toLowerCase();
    const getPath = (a: any) => (a.path || '').toLowerCase();

    const fo4App = allApps.find((a: any) => {
        const name = getName(a);
        const path = getPath(a);
        return name.includes('fallout 4') || name.includes('fallout4') ||
               path.includes('fallout 4') || path.includes('fallout4');
    });

    const f4seApp = allApps.find((a: any) => {
        const name = getName(a);
        return name.includes('f4se') || name.includes('script extender');
    });

    const mo2App = allApps.find((a: any) => {
        const name = getName(a);
        return name.includes('mod organizer') || name.includes('modorganizer');
    });
    const vortexApp = allApps.find((a: any) => getName(a).includes('vortex'));
    const modManagerApp = mo2App || vortexApp;

    const fo4EditApp = allApps.find((a: any) => {
        const name = getName(a);
        return name.includes('fo4edit') || name.includes('xedit') || name.includes('fo4xedit');
    });

    const ckApp = allApps.find((a: any) => {
        const name = getName(a);
        return name.includes('creation kit') || name.includes('creationkit');
    });

    const bodySlidApp = allApps.find((a: any) => getName(a).includes('bodyslide'));
    const lootApp = allApps.find((a: any) => getName(a).includes('loot'));
    const nifskopeApp = allApps.find((a: any) => getName(a).includes('nifskope'));

    const ecosystem: FO4Ecosystem = {
        gameInstalled: !!fo4App,
        gamePath: fo4App?.path || '',
        gameVersion: fo4App?.version || 'Unknown',
        f4seDetected: !!f4seApp,
        f4sePath: f4seApp?.path || '',
        modManager: mo2App ? 'Mod Organizer 2' : vortexApp ? 'Vortex' : 'None detected',
        modManagerPath: modManagerApp?.path || '',
        scriptExtender: !!f4seApp,
        modCount: 0,
        fo4EditDetected: !!fo4EditApp,
        creationKitDetected: !!ckApp,
        bodySlideDetected: !!bodySlidApp,
        lootDetected: !!lootApp,
        nifSkopeDetected: !!nifskopeApp,
    };

    return ecosystem;
  };

  const startScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    setScanError(null);

    setActiveTab('hardware');

    addLog("[CORE] Initiating COMPREHENSIVE System Scan...", 'info');
    addLog("[CORE] This may take 30-60 seconds for deep drive scanning...", 'info');

    let sysInfo: any = null;
    if (typeof window.electron?.api?.getSystemInfo === 'function') {
        try {
            addLog("[STEP 1/3] Scanning system hardware...", 'info');
            setScanProgress(10);
            sysInfo = await window.electron.api.getSystemInfo();

            if (sysInfo.ram === 0 || sysInfo.cpu === 'Detection Failed') {
                throw new Error(`Electron detection returned error: ${(sysInfo as any).error || 'Unknown'}`);
            }

            setScanProgress(20);
            addLog(`[HARDWARE] OS: ${sysInfo.os}`, 'success');
            addLog(`[HARDWARE] CPU: ${sysInfo.cpu} (${sysInfo.cores} cores)`, 'info');
            addLog(`[HARDWARE] GPU: ${sysInfo.gpu}`, 'info');
            addLog(`[HARDWARE] RAM: ${sysInfo.ram} GB`, 'info');
            if ((sysInfo as any).vram > 0) {
                addLog(`[HARDWARE] VRAM: ${(sysInfo as any).vram} GB`, 'info');
            }
        } catch (e) {
            addLog(`[ELECTRON] Hardware detection failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'warning');
        }
    }

    try {
        addLog("[STEP 2/3] Deep scanning ALL installed programs...", 'info');
        addLog("[SCAN] Checking ALL drives (C-Z), depth 7 levels...", 'info');
        setScanProgress(30);

        const detectPrograms = window.electron?.api?.detectPrograms || (window as any).electronAPI?.detectPrograms;

        if (!detectPrograms) {
            throw new Error('detectPrograms API not available');
        }

        // Keep visible progress moving during the (potentially 30-90+ second) deep
        // scan instead of sitting silently at 30% the whole time. Reliability sweep
        // (2026-09-01), round 2: the first version of this ticker (68% ceiling
        // reached after ~15s) fixed the "sits at 30% in total silence" complaint,
        // but a scan that legitimately runs well past 15s -- this one covers every
        // drive letter 7 folders deep -- still plateaus at 68% for the remainder,
        // which reads exactly like "stuck" again once the number stops climbing
        // (confirmed: a user saw this and assumed it hung, even though the scan
        // went on to complete normally). A percentage alone will always eventually
        // look frozen once it hits any ceiling if the real work outlasts the
        // ticker's ramp time, so the actual fix is a second, independent signal
        // that keeps confirming "still alive" for as long as the scan runs: a
        // heartbeat log line with elapsed seconds, on top of (not instead of) the
        // percentage ticker.
        const DETECTION_PROGRESS_CAP = 68;
        const DETECTION_MS_PER_PROGRESS_POINT = 400;
        const DETECTION_TICK_MS = 200;
        const DETECTION_HEARTBEAT_MS = 6000;
        const detectStartedAt = Date.now();
        if (scanDetectionTimerRef.current !== null) {
            window.clearInterval(scanDetectionTimerRef.current);
        }
        scanDetectionTimerRef.current = window.setInterval(() => {
            setScanProgress(prev => {
                if (prev >= DETECTION_PROGRESS_CAP) return prev;
                const elapsedMs = Date.now() - detectStartedAt;
                const elapsedProgress = 30 + Math.floor(elapsedMs / DETECTION_MS_PER_PROGRESS_POINT);
                return Math.max(prev, Math.min(DETECTION_PROGRESS_CAP, elapsedProgress));
            });
        }, DETECTION_TICK_MS);
        if (scanHeartbeatTimerRef.current !== null) {
            window.clearInterval(scanHeartbeatTimerRef.current);
        }
        scanHeartbeatTimerRef.current = window.setInterval(() => {
            const elapsedSec = Math.round((Date.now() - detectStartedAt) / 1000);
            addLog(`[SCAN] Still scanning... ${elapsedSec}s elapsed (this can take a minute or more on a large drive)`, 'info');
        }, DETECTION_HEARTBEAT_MS);

        let allApps: any[];
        try {
            // Reliability sweep (2026-09-01), round 3: force:true bypasses the
            // main process's 1-hour program-scan cache (src/electron/main.ts's
            // DETECT_PROGRAMS handler). Without this, clicking "Full System Scan"
            // within an hour of any earlier scan -- including one from before
            // today's fixes were even installed -- returned the SAME cached
            // result in ~50ms instead of actually re-scanning. Confirmed live via
            // DevTools: window.electronAPI.detectPrograms() resolved in 47ms, not
            // the 30-90+ seconds a real 13,000+ program filesystem walk takes.
            // This is exactly why the button reads as "started and stopped" --
            // the promise resolves before the progress ticker above ever gets a
            // chance to move, and it also means the fix to the four detect+
            // filter+approve mechanisms found earlier today could never take
            // effect on already-cached (pre-fix) results, no matter how many
            // times "Full System Scan" was clicked. A user explicitly clicking
            // a button labeled "scan" expects a real scan to run.
            allApps = await detectPrograms(true);
        } finally {
            if (scanDetectionTimerRef.current !== null) {
                window.clearInterval(scanDetectionTimerRef.current);
                scanDetectionTimerRef.current = null;
            }
            if (scanHeartbeatTimerRef.current !== null) {
                window.clearInterval(scanHeartbeatTimerRef.current);
                scanHeartbeatTimerRef.current = null;
            }
        }

        setScanProgress(70);

        const nvidiaKeywords = ['nvidia', 'geforce', 'cuda', 'rtx', 'physx', 'nsight',
                                'nvcontainer', 'nvcpl', 'nvprofileinspector', 'texture tools',
                                'canvas', 'broadcast', 'shadowplay', 'ansel'];
        const nvidiaTools = allApps.filter((a: any) => {
            const name = (a.displayName || a.name || '').toLowerCase();
            const path = (a.path || '').toLowerCase();
            return nvidiaKeywords.some(kw => name.includes(kw) || path.includes('nvidia'));
        });

        const aiKeywords = ['ollama', 'lm studio', 'lmstudio', 'luma', 'lumaai', 'comfy', 'stable diffusion',
                           'automatic1111', 'kobold', 'jan', 'gpt4all'];
        const aiTools = allApps.filter((a: any) => {
            const name = (a.displayName || a.name || '').toLowerCase();
            return aiKeywords.some(kw => name.includes(kw));
        });

        const fo4Keywords = ['fallout 4', 'fallout4', 'fo4'];
        const fallout4Apps = allApps.filter((a: any) =>
            fo4Keywords.some(kw => (a.displayName || a.name || '').toLowerCase().includes(kw))
        );

        const moddingKeywords = ['xedit', 'fo4edit', 'creation kit', 'creationkit', 'mod organizer',
                                  'modorganizer', 'vortex', 'loot', 'bodyslide', 'nifskope', 'bae',
                                  'f4se', 'script extender', 'bodyslide', 'outfit studio', 'wrye bash',
                                  'archive2', 'nifutils'];
        const moddingTools = allApps.filter((a: any) => {
            const name = (a.displayName || a.name || '').toLowerCase();
            return moddingKeywords.some(kw => name.includes(kw));
        });

        // Reliability sweep (2026-09-01): Full System Scan (this function) and Link
        // Bridge (startInstaller, below) both detect programs and both used to have
        // their own independent, drifted moddingKeywords lists -- the actual source
        // of the Approved Tools panel staying cluttered even after startInstaller's
        // list was fixed, because a user running THIS scan (the one literally
        // labeled "Full System Scan") never touched mossy_apps at all before now.
        // Sync mossy_apps here too, using this function's own already-tight keyword
        // list, so either scan button keeps the Approved Tools panel current. Same
        // purge-what-this-mechanism-previously-added pattern as startInstaller,
        // scoped to its own "fullscan-" id prefix so the two scans' cleanups can't
        // fight each other.
        try {
            const rescannedModdingTools = moddingTools.map((t: any) => ({
                id: `fullscan-${Math.random().toString(36).substr(2, 5)}`,
                name: t.displayName || t.name,
                displayName: t.displayName || t.name,
                path: t.path,
                version: t.version,
                checked: true,
                category: 'Tool'
            }));
            const rawExistingModdingApps: any[] = JSON.parse(localStorage.getItem('mossy_apps') || '[]');
            const existingModdingApps = rawExistingModdingApps.filter((ea: any) => {
                const idStr = typeof ea?.id === 'string' ? ea.id : '';
                const isExplicitChoice = idStr.startsWith('manual-') || idStr.startsWith('onboard-');
                if (isExplicitChoice || ea?.checked === false) return true;
                // Check ea.name first, not displayName -- detectPrograms.ts prefixes
                // displayName with an ancestor folder name for generically-named exes
                // (e.g. 'Blender Foundation - cli'), which can make an unrelated exe match
                // a keyword like 'blender' purely through that prefix. name stays bare.
                const nameLower = (ea.name || ea.displayName || '').toLowerCase();
                return PURGE_RELEVANCE_KEYWORDS.some(kw => nameLower.includes(kw));
            });
            localStorage.setItem('mossy_apps', JSON.stringify(mergeRescannedTools(rescannedModdingTools, existingModdingApps)));
        } catch (e) {
            console.error('[SystemMonitor] Failed to sync mossy_apps from Full System Scan:', e);
        }

        addLog(`[PROGRAMS] Total Detected: ${allApps.length}`, 'success');
        addLog(`[NVIDIA] Found ${nvidiaTools.length} NVIDIA tools`, nvidiaTools.length > 0 ? 'success' : 'warning');
        addLog(`[AI/ML] Found ${aiTools.length} AI tools`, aiTools.length > 0 ? 'success' : 'info');
        addLog(`[FALLOUT 4] Found ${fallout4Apps.length} FO4 installations`, fallout4Apps.length > 0 ? 'success' : 'warning');
        addLog(`[MODDING TOOLS] Found ${moddingTools.length} modding tools`, moddingTools.length > 0 ? 'success' : 'info');

        if (nvidiaTools.length > 0) {
            addLog(`[NVIDIA ECOSYSTEM] Detected:`, 'info');
            nvidiaTools.slice(0, 10).forEach((tool: any) => {
                addLog(`  + ${tool.displayName || tool.name}`, 'info');
            });
            if (nvidiaTools.length > 10) {
                addLog(`  + ...and ${nvidiaTools.length - 10} more NVIDIA programs`, 'info');
            }
        }

        if (moddingTools.length > 0) {
            addLog(`[MODDING TOOLS] Detected:`, 'success');
            moddingTools.slice(0, 10).forEach((tool: any) => {
                addLog(`  + ${tool.displayName || tool.name}`, 'success');
            });
        }

        localStorage.setItem('mossy_all_detected_apps', JSON.stringify(allApps));
        localStorage.setItem('mossy_last_scan', new Date().toISOString());

        const eco = detectFO4Ecosystem(allApps, sysInfo);
        setFo4Ecosystem(eco);
        localStorage.setItem('mossy_fo4_ecosystem', JSON.stringify(eco));

        if (eco.gameInstalled) {
            addLog(`[FO4] Game detected: ${eco.gamePath || 'path unknown'}`, 'success');
        } else {
            addLog(`[FO4] Game not found in program registry`, 'warning');
        }
        addLog(`[FO4] Mod manager: ${eco.modManager}`, eco.modManager !== 'None detected' ? 'success' : 'warning');
        addLog(`[FO4] F4SE: ${eco.f4seDetected ? 'Detected' : 'Not found'}`, eco.f4seDetected ? 'success' : 'warning');
        addLog(`[FO4] xEdit: ${eco.fo4EditDetected ? 'Detected' : 'Not found'}`, eco.fo4EditDetected ? 'success' : 'info');

        const programSummary = {
            totalPrograms: allApps.length,
            nvidiaTools: nvidiaTools.length,
            aiTools: aiTools.length,
            moddingTools: moddingTools.length,
            fallout4Installations: fallout4Apps.length,
            systemInfo: sysInfo,
            nvidiaPrograms: nvidiaTools.map((a: any) => ({ name: a.displayName || a.name, path: a.path })),
            aiPrograms: aiTools.map((a: any) => ({ name: a.displayName || a.name, path: a.path })),
            moddingPrograms: moddingTools.map((a: any) => ({ name: a.displayName || a.name, path: a.path })),
            allPrograms: allApps.map((a: any) => ({
                name: a.displayName || a.name,
                path: a.path,
                version: a.version,
                publisher: a.publisher
            }))
        };

        const previousSummary = localStorage.getItem('mossy_scan_summary');
        if (previousSummary) {
            localStorage.setItem('mossy_scan_summary_prev', previousSummary);
        }
        localStorage.setItem('mossy_scan_summary', JSON.stringify(programSummary));

        setDetectedPrograms(allApps);
        setScanSummary(programSummary);

        setScanProgress(90);

    } catch (e) {
        addLog(`[PROGRAMS] Scan failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }

    addLog("[STEP 3/3] Finalizing system profile...", 'info');

    if (sysInfo) {
        const newProfile: SystemProfile = {
            os: sysInfo.os,
            gpu: sysInfo.gpu,
            ram: sysInfo.ram,
            blenderVersion: (sysInfo as any).blenderVersion || '',
            vram: (sysInfo as any).vram || 0,
            isLegacy: sysInfo.ram < 16 || ((sysInfo as any).vram > 0 && (sysInfo as any).vram < 6)
        };

        (newProfile as any).motherboard = (sysInfo as any).motherboard;
        (newProfile as any).storageDrives = (sysInfo as any).storageDrives;
        (newProfile as any).cpu = sysInfo.cpu;
        (newProfile as any).cores = sysInfo.cores;
        (newProfile as any).displayResolution = (sysInfo as any).displayResolution;
        (newProfile as any).storageFreeGB = (sysInfo as any).storageFreeGB;

        setProfile(newProfile);
        localStorage.setItem('mossy_system_profile', JSON.stringify(newProfile));
    }

    setScanProgress(100);
    setIsScanning(false);
    addLog("[MOSSY] Comprehensive system analysis complete!", 'success');
    addLog("[MOSSY] Your complete software ecosystem is now mapped.", 'success');
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              setProfile({
                  os: json.os || 'Windows',
                  gpu: json.gpu || 'Generic GPU',
                  ram: json.ram || 16,
                  blenderVersion: json.blenderVersion || 'None',
                  vram: json.vram || 4,
                  isLegacy: json.blenderVersion === '2.79b'
              });
              addLog("Manual System Profile Imported.", 'success');
          } catch (e) {
              addLog("Failed to parse system profile.", 'error');
          }
      };
      reader.readAsText(file);
  };

  const startInstaller = async () => {
      setShowInstaller(true);
      setInstallStep(1);
      setInstallLog(['> Initializing Native Bridge...', '> Syncing Hardware Telemetry...', '> Reading Installed Tools Database...']);
      setFoundTools([]);

      try {
          // force:true here too (2026-09-01, round 3) -- Link Bridge is an
          // explicit user-initiated scan just like Full System Scan, and should
          // not silently serve results cached from before this session's fixes.
          const apps = window.electronAPI?.detectPrograms ? await window.electronAPI.detectPrograms(true) : [];
          // Reliability sweep (2026-09-01): 'edit', 'unwrap', and 'fbx' were removed
          // below -- they're generic enough to match unrelated installed software (a
          // bare 'edit' matches almost any "___ Editor" program; 'unwrap' and 'fbx'
          // matched Unity Editor's bundled UnwrapCL utility and Autodesk's generic FBX
          // converter on a live system, not Fallout 4 modding tools). This is the same
          // class of bug already fixed in ChatInterface.tsx's moddingKeywords and in
          // detectPrograms.ts's directory scan -- confirmed live via the Approved Tools
          // panel, which still showed this scan's false positives after those two fixes.
          const moddingKeywords = [
            'blender', 'creation', 'xedit', 'fo4edit', 'fo4xedit', 'vortex', 'organizer', 'loot', 'nifskope',
            'bodyslide', 'f4se', 'upscayl', 'shadermap', 'nvidia', 'photodemon',
            'nifutils', 'omniverse', 'spin3d'
          ];
          const moddingTools = apps.filter((a: any) => moddingKeywords.some(kw => (a.displayName || a.name || '').toLowerCase().includes(kw)));

          const ollamaActive = await LocalAIEngine.checkOllama();

          setInstallLog(prev => [...prev, `> Found ${apps.length} total applications.`, `> Filtering for ${moddingTools.length} modding tools...`]);

          const realSystem = window.electronAPI?.getSystemInfo ? await window.electronAPI.getSystemInfo() : null;

          const scanSequence: any[] = [
              { name: 'Native Bridge', found: true, cat: 'System' },
              { name: 'Ollama AI', found: ollamaActive, cat: 'AI' }
          ];

          if (realSystem?.gpu) scanSequence.push({ name: realSystem.gpu, found: true, cat: 'System' });
          moddingTools.slice(0, 10).forEach((t: any) => {
              scanSequence.push({ name: t.displayName || t.name, found: true, cat: 'Modding' });
          });

          let i = 0;
          const scanInterval = setInterval(() => {
              if (i >= scanSequence.length) {
                  clearInterval(scanInterval);
                  setInstallStep(2);
                  setFoundTools(scanSequence);

                  // Merge, don't overwrite: a prior "Detect Hardware" run used to replace
                  // mossy_apps wholesale, which silently re-approved (checked: true) any
                  // tool the user had explicitly denied during onboarding or in Approved
                  // Tools below. mergeExistingCheckedState carries an existing checked:false
                  // forward onto the freshly-rescanned entry; genuinely new tools default to
                  // approved (checked: true), same as a first scan. Previously-known tools
                  // this narrower modding-keyword scan doesn't happen to re-find are kept
                  // as-is rather than dropped.
                  const rescannedTools = moddingTools.map((t: any) => ({
                      id: `scan-${Math.random().toString(36).substr(2, 5)}`,
                      name: t.displayName,
                      displayName: t.displayName,
                      path: t.path,
                      version: t.version,
                      checked: true,
                      category: 'Tool'
                  }));
                  // Reliability sweep (2026-09-01): drop stale false-positives that no
                  // longer match the now-tightened moddingKeywords above -- e.g. Unity's
                  // bundled UnwrapCL or Autodesk's generic FBX converter, both approved
                  // under the old 'edit'/'unwrap'/'fbx' catch-alls. Originally this only
                  // purged entries this exact scan had added (id starting "scan-"), but
                  // Billy's actual junk turned out to be un-refreshed by that scope (he
                  // runs "Full System Scan" day to day, not "Link Bridge") -- so this now
                  // reconciles ANY auto-detected entry, regardless of which scan added it.
                  // Explicit user choices are still never touched: a manual Settings path
                  // (id "manual-...") or onboarding pick (id "onboard-...") is preserved
                  // even if its name doesn't match a keyword, and an explicit checked:false
                  // denial is preserved either way (nothing here ever re-approves).
                  const rawExistingApps: any[] = JSON.parse(localStorage.getItem('mossy_apps') || '[]');
                  const existingApps = rawExistingApps.filter((ea: any) => {
                      const idStr = typeof ea?.id === 'string' ? ea.id : '';
                      const isExplicitChoice = idStr.startsWith('manual-') || idStr.startsWith('onboard-');
                      if (isExplicitChoice || ea?.checked === false) return true;
                      // Check ea.name first, not displayName -- detectPrograms.ts prefixes
                // displayName with an ancestor folder name for generically-named exes
                // (e.g. 'Blender Foundation - cli'), which can make an unrelated exe match
                // a keyword like 'blender' purely through that prefix. name stays bare.
                const nameLower = (ea.name || ea.displayName || '').toLowerCase();
                      return PURGE_RELEVANCE_KEYWORDS.some(kw => nameLower.includes(kw));
                  });
                  localStorage.setItem('mossy_apps', JSON.stringify(mergeRescannedTools(rescannedTools, existingApps)));

                  if (realSystem) {
                      localStorage.setItem('mossy_system_profile', JSON.stringify({
                          os: realSystem.os,
                          cpu: realSystem.cpu,
                          gpu: realSystem.gpu,
                          ram: realSystem.ram,
                          vram: (realSystem as any).vram || 'Unknown',
                          motherboard: (realSystem as any).motherboard || 'Unknown',
                          storageDrives: (realSystem as any).storageDrives || [],
                          blenderVersion: (realSystem as any).blenderVersion || 'Unknown'
                      }));
                  }

                  setTimeout(() => {
                      setInstallLog(prev => [...prev, '> Verification Complete.', '> Initializing Neural Interface...', '> Task Complete, Architect. Your system profile is ready.']);
                      setInstallStep(3);
                      localStorage.setItem('mossy_bridge_active', 'true');
                      window.dispatchEvent(new CustomEvent('mossy-bridge-connected'));
                  }, 1000);
                  return;
              }

              const item = scanSequence[i];
              setInstallLog(prev => [...prev, `Checking: ${item.name}... DETECTED`]);
              i++;
          }, 80);

      } catch (e) {
          setInstallLog(prev => [...prev, '> ERROR: Native scan failed.', `> Details: ${e instanceof Error ? e.message : 'Unknown'}`]);
          setInstallStep(0);
      }
  };

  const handleFinishInstaller = () => {
      setShowInstaller(false);
      setActiveTab('telemetry');
      addLog(`Desktop Bridge linked successfully.`, 'success');
  };

    const mainScrollRef = useRef<HTMLDivElement | null>(null);
    const wheelProxy = useWheelScrollProxy(mainScrollRef);

    const containerClassName = embedded
      ? 'w-full bg-forge-dark text-slate-200 flex flex-col overflow-hidden relative min-h-[720px] rounded-lg border border-slate-800'
      : 'h-full w-full bg-forge-dark text-slate-200 flex flex-col overflow-hidden relative min-h-0';

    return (
        <div className={containerClassName} onWheel={wheelProxy}>

            {!embedded && (
                <div className="p-4 max-h-64 overflow-y-auto pr-2">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-lg font-bold text-white">System Monitor</h2>
                            <p className="text-xs text-slate-400">Diagnostics, telemetry, and bridge status</p>
                        </div>
                        <RouterLink
                            to="/reference"
                            className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
                            title="Open help"
                        >
                            Help
                        </RouterLink>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <ToolsInstallVerifyPanel
                            className="mb-0"
                            accentClassName="text-emerald-300"
                            description="System Monitor is a status + diagnostics hub. Some capabilities require the Electron API and/or Desktop Bridge to be present."
                            tools={[]}
                            verify={[
                                'Open Telemetry tab and confirm charts/widgets render.',
                                'Run a scan and confirm the log updates with detected items.',
                            ]}
                            firstTestLoop={[
                                'Run Install Wizard once to populate detected apps/tool paths.',
                                "Open Desktop Bridge and confirm it's ONLINE (if you use local features).",
                                'Return here and run one scan to confirm end-to-end reporting.',
                            ]}
                            troubleshooting={[
                                'If nothing detects, check that Electron API is available (not web mode).',
                                'If bridge-based checks fail, confirm the bridge process is running and reachable.',
                            ]}
                        />
                    </div>
                </div>
            )}

      {/* INSTALLER MODAL */}
      {showInstaller && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
              <div className="w-full max-w-4xl bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/20 rounded-lg">
                              <Package className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-white">Desktop Bridge Connection</h2>
                              <p className="text-xs text-slate-400">System Link & Local Verification</p>
                          </div>
                      </div>
                      {installStep === 3 && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-900/30 text-emerald-400 rounded-full border border-emerald-500/30 text-xs font-bold animate-pulse">
                              <CheckCircle2 className="w-4 h-4" /> INSTALLED
                          </div>
                      )}
                  </div>

                  <div className="flex-1 min-h-0 p-8 flex flex-col gap-6 overflow-hidden">
                      {installStep === 1 && (
                          <div className="flex flex-col items-center justify-center h-full gap-4">
                              <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
                              <h3 className="text-lg font-bold text-white animate-pulse">Scanning Local Sectors...</h3>
                              <p className="text-sm text-slate-500 text-center max-w-md">
                                  Cataloging installed applications, development SDKs, and neural services.
                              </p>
                          </div>
                      )}

                      {installStep >= 2 && (
                          <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                              <div className="text-sm text-slate-400 mb-4 font-bold uppercase tracking-wider flex justify-between items-end">
                                  <span>Detected Environment ({foundTools.length} Items)</span>
                                  <span className="text-emerald-500 text-xs">SCAN COMPLETE</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-fade-in">
                                  {foundTools.map((tool, i) => (
                                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 animate-slide-up hover:border-emerald-500/30 transition-colors" style={{animationDelay: `${i*30}ms`}}>
                                          <div className={`p-1.5 rounded ${
                                              tool.category === 'System' ? 'bg-blue-900/30 text-blue-400' :
                                              tool.category === 'Creative' ? 'bg-purple-900/30 text-purple-400' :
                                              tool.category === 'Modding' ? 'bg-orange-900/30 text-orange-400' :
                                              tool.category === 'AI' ? 'bg-red-900/30 text-red-400' :
                                              'bg-emerald-900/30 text-emerald-400'
                                          }`}>
                                              {tool.category === 'AI' ? <BrainCircuit className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                          </div>
                                          <div className="min-w-0">
                                              <div className="font-bold text-white text-xs truncate max-w-[150px]">{tool.name}</div>
                                              <div className="text-[10px] text-slate-500 uppercase">{tool.category}</div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      <div className="h-32 bg-black rounded-lg border border-slate-800 p-4 font-mono text-[10px] text-slate-300 overflow-y-auto" ref={installLogRef as any}>
                          {installLog.map((log, i) => (
                              <div key={i} className={`mb-1 ${log.includes('DETECTED') ? 'text-emerald-400' : log.includes('Not Found') ? 'text-slate-600' : ''}`}>
                                  {log}
                              </div>
                          ))}
                          {installStep === 2 && <div className="text-emerald-500 animate-pulse">_</div>}
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                      {installStep < 3 ? (
                          <button disabled className="px-6 py-2 bg-slate-800 text-slate-500 font-bold rounded-lg cursor-not-allowed">
                              Processing...
                          </button>
                      ) : (
                          <button
                              onClick={handleFinishInstaller}
                              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
                          >
                              <Play className="w-4 h-4 fill-current" /> Launch Mossy
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700 bg-forge-panel px-6 pt-4 gap-1">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-6 py-3 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'telemetry'
                ? 'bg-slate-800 text-white border-t border-x border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
              <Activity className="w-4 h-4" /> Telemetry
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-6 py-3 rounded-t-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'hardware'
                ? 'bg-slate-800 text-amber-400 border-t border-x border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
              <Monitor className="w-4 h-4" /> Hardware Profile
          </button>
      </div>

      <div ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-6 pb-24 bg-slate-900/50">

      {/* TELEMETRY TAB */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3 mb-2 text-forge-accent">
                    <Activity className="w-6 h-6" />
                    System Monitor
                    </h2>
                    <p className="text-slate-400 text-sm">Real-time telemetry and module status.</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => startInstaller()}
                        className="px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 bg-blue-500/10 border border-blue-500/40 text-blue-400 hover:bg-blue-500/20 transition-all"
                    >
                        <Link className="w-4 h-4" /> Link Bridge
                    </button>
                    <button
                        onClick={startScan}
                        disabled={isScanning}
                        className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg border ${
                            isScanning
                            ? 'bg-slate-800 border-slate-600 text-slate-400 cursor-wait'
                            : 'bg-emerald-500/10 border-emerald-500 text-emerald-400 hover:bg-emerald-500/20 hover:shadow-emerald-500/20'
                        }`}
                    >
                        {isScanning ? <Zap className="w-5 h-5 animate-pulse" /> : <Search className="w-5 h-5" />}
                        {isScanning ? `Scanning... ${scanProgress}%` : 'Full System Scan'}
                    </button>
                </div>
            </div>

            {/* FO4 Ecosystem Quick View */}
            {fo4Ecosystem && (
                <div className="mb-6 animate-fade-in">
                    <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-widest">
                        <Wrench className="w-4 h-4 text-orange-400" /> Fallout 4 Ecosystem
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        {[
                            { label: 'FO4 Game', ok: fo4Ecosystem.gameInstalled, icon: GamepadIcon },
                            { label: 'F4SE', ok: fo4Ecosystem.f4seDetected, icon: Zap },
                            { label: fo4Ecosystem.modManager !== 'None detected' ? fo4Ecosystem.modManager.replace('Mod Organizer ', 'MO') : 'Mod Manager', ok: fo4Ecosystem.modManager !== 'None detected', icon: Package },
                            { label: 'xEdit/FO4Edit', ok: fo4Ecosystem.fo4EditDetected, icon: Database },
                            { label: 'Creation Kit', ok: fo4Ecosystem.creationKitDetected, icon: Settings },
                            { label: 'BodySlide', ok: fo4Ecosystem.bodySlideDetected, icon: User },
                        ].map(({ label, ok, icon: Icon }) => (
                            <div key={label} className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center ${ok ? 'bg-emerald-900/10 border-emerald-700/30' : 'bg-slate-900/40 border-slate-800'}`}>
                                <Icon className={`w-4 h-4 ${ok ? 'text-emerald-400' : 'text-slate-600'}`} />
                                <div className={`text-[10px] font-bold ${ok ? 'text-emerald-300' : 'text-slate-500'}`}>{label}</div>
                                <div className={`text-[9px] ${ok ? 'text-emerald-500' : 'text-slate-600'}`}>{ok ? 'DETECTED' : 'NOT FOUND'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Integration List */}
            {integrations.length > 0 && (
                <div className="mb-8 animate-fade-in">
                    <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-widest">
                        <Link className="w-4 h-4" /> Active Integrations
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {integrations.map(app => (
                            <div
                                key={app.id}
                                onClick={() => handleLaunchApp(app.path, app.name)}
                                className="bg-slate-800 border border-slate-700 p-3 rounded-lg flex flex-col justify-between shadow-sm hover:border-forge-accent transition-colors h-full cursor-pointer group"
                            >
                                <div className="flex items-start gap-3 mb-2">
                                    <div className={`p-1.5 rounded text-slate-300 transition-colors ${app.category === 'AI' ? 'bg-red-900/30 group-hover:bg-red-800/40' : 'bg-slate-900 group-hover:bg-slate-700'}`}>
                                        {app.category === 'AI' ? <BrainCircuit className="w-4 h-4 text-red-400" /> : <Box className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-white truncate" title={app.name}>{app.name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase truncate">{app.category}</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-900/20 rounded border border-emerald-500/30 w-fit">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[9px] font-bold text-emerald-400 uppercase">Linked</span>
                                    </div>
                                    <Play className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Approved Tools & Permissions — review/revoke what the initial scan approved */}
            {approvedTools.length > 0 && (
                <div className="mb-8 animate-fade-in">
                    <h3 className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-2 uppercase tracking-widest">
                        <ShieldCheck className="w-4 h-4" /> Approved Tools & Permissions
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-3">
                        Programs found by the system scan. What "approved" actually gets you differs by tool: <strong className="text-slate-300">Blender</strong> works inside it — live scene reads, real script execution; <strong className="text-slate-300">xEdit</strong> launches it for a specific purpose (conflict detection, cleaning masters); everything else Mossy just knows exists and can open — she doesn't read or edit those tools' files. Toggle any tool on or off any time; this is the same choice you made during setup, not a one-time decision.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {approvedTools.map((tool) => (
                            <button
                                type="button"
                                key={tool.id}
                                onClick={() => toggleToolApproval(tool.id)}
                                className={`text-left p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                                    tool.checked
                                        ? 'bg-emerald-900/10 border-emerald-700/40 hover:border-emerald-500'
                                        : 'bg-slate-900/40 border-slate-700 opacity-60 hover:opacity-90'
                                }`}
                                title={tool.path || tool.name}
                            >
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-white truncate">{tool.name}</div>
                                    <div className="text-[10px] text-slate-500 truncate">{tool.checked ? 'Approved' : 'Denied'}</div>
                                </div>
                                <div className={`flex-shrink-0 w-9 h-5 rounded-full relative transition-colors ${tool.checked ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${tool.checked ? 'left-4' : 'left-0.5'}`} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* External Modding Tools */}
            <div className="mb-8 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2 uppercase tracking-widest">
                        <SettingsIcon className="w-4 h-4" /> External Modding Tools
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <ExternalToolNotice toolKey="xeditPath" toolName="xEdit / FO4Edit" nexusUrl="https://www.nexusmods.com/fallout4/mods/2737" description="Clean plugins (ITM/UDR), resolve conflicts, and generate patches." />
                    <ExternalToolNotice toolKey="nifSkopePath" toolName="NifSkope" nexusUrl="https://www.nexusmods.com/newvegas/mods/75969" description="Inspect and fix NIFs: materials, collision, texture paths, and more." />
                    <ExternalToolNotice toolKey="fomodCreatorPath" toolName="FOMOD Creation Tool" nexusUrl="https://www.nexusmods.com/fallout4/mods/6821" description="Build installers for distribution. Use alongside the in-app Assembler." />
                    <ExternalToolNotice toolKey="creationKitPath" toolName="Creation Kit" description="Author quests, worldspaces, records, scripts, and data edits." />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* CPU/Neural Area Chart */}
                <div className="bg-forge-panel p-4 rounded-xl border border-slate-700 shadow-lg h-64">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" /> Computation Load
                </h3>
                <ResponsiveContainer width="100%" height="80%">
                    <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorNeural" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" hide />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} itemStyle={{ color: '#e2e8f0' }} />
                    <Area type="monotone" dataKey="cpu" stackId="1" stroke="#38bdf8" fill="url(#colorCpu)" name="CPU %" />
                    <Area type="monotone" dataKey="neural" stackId="1" stroke="#a855f7" fill="url(#colorNeural)" name="GPU Utilization % (Neural Inference)" />
                    </AreaChart>
                </ResponsiveContainer>
                </div>

                {/* Memory/VRAM Bar Chart */}
                <div className="bg-forge-panel p-4 rounded-xl border border-slate-700 shadow-lg h-64">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-400" /> Memory Allocation (GB)
                </h3>
                <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={data.slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" hide />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Bar dataKey="memory" fill="#f59e0b" radius={[4, 4, 0, 0]} name="RAM (GB)" />
                    <Bar dataKey="vram" fill="#ef4444" radius={[4, 4, 0, 0]} name="VRAM (GB)" />
                    </BarChart>
                </ResponsiveContainer>
                </div>
            </div>

            {/* Terminal Log */}
            <div className="bg-black p-4 rounded-xl border border-slate-700 shadow-lg font-mono text-sm h-72 flex flex-col">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                    <div className="flex items-center gap-4">
                    <h3 className="text-xs font-bold text-slate-500 flex items-center gap-2">
                        <Terminal className="w-3 h-3" /> MOSSY INTEGRATION LOG
                    </h3>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-2 custom-scrollbar" ref={logsContainerRef}>
                {logs.map((log) => (
                    <div key={log.id} className={`text-xs flex gap-3 hover:bg-white/5 p-0.5 rounded ${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        log.type === 'success' ? 'text-emerald-400' :
                        'text-terminal-green'
                    }`}>
                    <span className="opacity-40 whitespace-nowrap min-w-[80px] font-mono">[{log.time}]</span>
                    <span className="break-all font-mono">{log.msg}</span>
                    </div>
                ))}
                <div ref={logsEndRef} />
                </div>
            </div>
        </div>
      )}

      {/* HARDWARE PROFILE TAB */}
      {activeTab === 'hardware' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
              {scanError && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex items-start gap-3 mb-6">
                      <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                      <div>
                          <h4 className="text-red-400 font-bold text-sm">Bridge Error Detected</h4>
                          <p className="text-xs text-red-200 mt-1">{scanError}</p>
                      </div>
                  </div>
              )}

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-3">
                              <Monitor className="w-6 h-6 text-amber-400" />
                              Hardware Architecture
                          </h3>
                          <p className="text-sm text-slate-400 mt-1">Configure user environment for tailored assistance.</p>
                      </div>
                      <div className="flex gap-2">
                          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleManualUpload} />
                          <button
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                          >
                              <Upload className="w-4 h-4" /> Upload Spec JSON
                          </button>
                          <button
                              onClick={startScan}
                              disabled={isScanning}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                          >
                              {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                              {isScanning ? 'Scanning...' : 'Detect Hardware'}
                          </button>
                      </div>
                  </div>

                  {isScanning && (
                    <div className="mb-8 px-1">
                        <div className="flex justify-between text-xs text-slate-500 mb-2 font-mono uppercase tracking-wider">
                        <span className="animate-pulse">Hardware Analysis In Progress</span>
                        <span className="text-amber-400">{scanProgress}%</span>
                        </div>
                        <div className="relative w-full h-3 bg-slate-900 rounded-full">
                        <div
                            className="absolute top-0 left-0 h-full bg-amber-500 shadow-[0_0_15px_#f59e0b] transition-all duration-100 ease-linear rounded-full opacity-80"
                            style={{ width: `${scanProgress}%` }}
                        />
                        </div>
                    </div>
                  )}

                  {profile ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-3 opacity-10"><Cpu className="w-16 h-16 text-amber-400" /></div>
                              <div className="text-xs text-slate-500 uppercase font-bold mb-2">GPU / Graphics</div>
                              <div className="text-lg font-bold text-white truncate" title={profile.gpu}>{profile.gpu}</div>
                              <div className={`text-sm ${profile.vram > 0 ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {profile.vram > 0 ? `${profile.vram} GB VRAM` : 'VRAM Unknown'}
                              </div>
                          </div>

                          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-3 opacity-10"><HardDrive className="w-16 h-16 text-blue-400" /></div>
                              <div className="text-xs text-slate-500 uppercase font-bold mb-2">System Memory</div>
                              <div className="text-lg font-bold text-white">{profile.ram} GB RAM</div>
                              <div className="text-sm text-slate-400">{profile.os}</div>
                          </div>

                          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-3 opacity-10"><Cpu className="w-16 h-16 text-green-400" /></div>
                              <div className="text-xs text-slate-500 uppercase font-bold mb-2">Processor</div>
                              <div className="text-sm font-bold text-white truncate" title={(profile as any).cpu}>
                                  {(profile as any).cpu || 'Unknown CPU'}
                              </div>
                              <div className="text-sm text-slate-400">
                                  {(profile as any).cores ? `${(profile as any).cores} Cores` : ''}
                              </div>
                          </div>

                          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-3 opacity-10"><Monitor className="w-16 h-16 text-purple-400" /></div>
                              <div className="text-xs text-slate-500 uppercase font-bold mb-2">Display & Storage</div>
                              <div className="text-sm text-slate-400">
                                  {(profile as any).displayResolution || 'Unknown Resolution'}
                              </div>
                              <div className="text-sm text-slate-500 mt-1">
                                  {(profile as any).storageFreeGB > 0
                                      ? `${(profile as any).storageFreeGB} GB free`
                                      : 'Storage Unknown'}
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50 text-slate-500">
                          <Monitor className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          <p className="mb-2">No hardware profile detected.</p>
                          <p className="text-xs">Run a scan or upload a profile to enable adaptive assistance.</p>
                      </div>
                  )}
              </div>

              {/* FO4 Ecosystem Detail */}
              {fo4Ecosystem && (
                  <div className="bg-slate-800 border border-orange-800/40 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Wrench className="w-5 h-5 text-orange-400" /> Fallout 4 Modding Ecosystem
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                          {[
                              { label: 'FO4 Game', value: fo4Ecosystem.gameInstalled ? (fo4Ecosystem.gameVersion !== 'Unknown' ? `v${fo4Ecosystem.gameVersion}` : 'Installed') : 'Not Found', ok: fo4Ecosystem.gameInstalled },
                              { label: 'F4SE', value: fo4Ecosystem.f4seDetected ? 'Detected' : 'Not Found', ok: fo4Ecosystem.f4seDetected },
                              { label: 'Mod Manager', value: fo4Ecosystem.modManager, ok: fo4Ecosystem.modManager !== 'None detected' },
                              { label: 'xEdit / FO4Edit', value: fo4Ecosystem.fo4EditDetected ? 'Detected' : 'Not Found', ok: fo4Ecosystem.fo4EditDetected },
                              { label: 'Creation Kit', value: fo4Ecosystem.creationKitDetected ? 'Detected' : 'Not Found', ok: fo4Ecosystem.creationKitDetected },
                              { label: 'BodySlide', value: fo4Ecosystem.bodySlideDetected ? 'Detected' : 'Not Found', ok: fo4Ecosystem.bodySlideDetected },
                              { label: 'LOOT', value: fo4Ecosystem.lootDetected ? 'Detected' : 'Not Found', ok: fo4Ecosystem.lootDetected },
                              { label: 'NifSkope', value: fo4Ecosystem.nifSkopeDetected ? 'Detected' : 'Not Found', ok: fo4Ecosystem.nifSkopeDetected },
                          ].map(({ label, value, ok }) => (
                              <div key={label} className={`p-3 rounded-lg border ${ok ? 'bg-emerald-900/10 border-emerald-700/30' : 'bg-slate-900/60 border-slate-700'}`}>
                                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">{label}</div>
                                  <div className={`text-sm font-bold ${ok ? 'text-emerald-300' : 'text-slate-500'}`}>{value}</div>
                              </div>
                          ))}
                      </div>
                      {fo4Ecosystem.gamePath && (
                          <div className="mt-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700">
                              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                                  <FolderOpen className="w-3 h-3" /> Game Install Path
                              </div>
                              <div className="text-xs font-mono text-slate-300 break-all">{fo4Ecosystem.gamePath}</div>
                          </div>
                      )}
                  </div>
              )}

              {/* Detected Programs */}
              {profile && scanSummary && (() => {
                  const nvidiaPrograms = detectedPrograms.filter((p: any) =>
                      (p.displayName || p.name || '').toLowerCase().includes('nvidia') ||
                      (p.displayName || p.name || '').toLowerCase().includes('geforce') ||
                      (p.displayName || p.name || '').toLowerCase().includes('cuda') ||
                      (p.displayName || p.name || '').toLowerCase().includes('rtx')
                  );

                  const aiPrograms = detectedPrograms.filter((p: any) => {
                      const name = (p.displayName || p.name || '').toLowerCase();
                      return name.includes('luma') || name.includes('ollama') ||
                             name.includes('lmstudio') || name.includes('comfy') ||
                             name.includes('stable diffusion') || name.includes('automatic1111') ||
                             name.includes('kobold') || name.includes('jan') || name.includes('gpt4all');
                  });

                  const moddingPrograms = detectedPrograms.filter((p: any) => {
                      const name = (p.displayName || p.name || '').toLowerCase();
                      return ['xedit', 'fo4edit', 'creation kit', 'mod organizer', 'vortex', 'loot',
                              'bodyslide', 'nifskope', 'bae', 'f4se', 'outfit studio', 'archive2'].some(kw => name.includes(kw));
                  });

                  return (
                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                              <Package className="w-5 h-5 text-blue-400" /> Detected Software Ecosystem
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">Total Programs</div>
                                  <div className="text-2xl font-bold text-white">{scanSummary.totalPrograms}</div>
                              </div>
                              <div className="bg-slate-900 p-4 rounded-lg border border-orange-800">
                                  <div className="text-xs text-orange-400 uppercase font-bold mb-1">Modding Tools</div>
                                  <div className="text-2xl font-bold text-orange-300">{moddingPrograms.length}</div>
                              </div>
                              <div className="bg-slate-900 p-4 rounded-lg border border-emerald-800">
                                  <div className="text-xs text-emerald-400 uppercase font-bold mb-1">NVIDIA Tools</div>
                                  <div className="text-2xl font-bold text-emerald-300">{nvidiaPrograms.length}</div>
                              </div>
                              <div className="bg-slate-900 p-4 rounded-lg border border-purple-800">
                                  <div className="text-xs text-purple-400 uppercase font-bold mb-1">AI/ML Tools</div>
                                  <div className="text-2xl font-bold text-purple-300">{aiPrograms.length}</div>
                              </div>
                          </div>

                          {moddingPrograms.length > 0 && (
                              <div className="mb-4">
                                  <h4 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-2">
                                      <Wrench className="w-4 h-4" /> Modding Tools Detected
                                  </h4>
                                  <div className="bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                                      <div className="space-y-1 text-xs font-mono">
                                          {moddingPrograms.map((p: any, i: number) => (
                                              <div key={i} className="text-orange-300 truncate" title={p.path}>
                                                  + {p.displayName || p.name}
                                                  {p.version && <span className="text-slate-600 ml-2">v{p.version}</span>}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          )}

                          {nvidiaPrograms.length > 0 && (
                              <div className="mb-4">
                                  <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
                                      <Cpu className="w-4 h-4" /> NVIDIA Ecosystem
                                  </h4>
                                  <div className="bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                                      <div className="space-y-1 text-xs font-mono">
                                          {nvidiaPrograms.slice(0, 20).map((p: any, i: number) => (
                                              <div key={i} className="text-slate-300 truncate" title={p.path}>
                                                  + {p.displayName || p.name}
                                              </div>
                                          ))}
                                          {nvidiaPrograms.length > 20 && (
                                              <div className="text-slate-500 italic">...and {nvidiaPrograms.length - 20} more</div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          )}

                          <div>
                              <h4 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
                                  <Database className="w-4 h-4" /> All Detected Programs ({detectedPrograms.length})
                              </h4>
                              <div className="bg-slate-900 rounded-lg p-3 max-h-64 overflow-y-auto">
                                  <div className="space-y-1 text-xs font-mono">
                                      {detectedPrograms.slice(0, 100).map((p: any, i: number) => (
                                          <div key={i} className="text-slate-400 truncate hover:text-slate-200 transition-colors" title={p.path}>
                                              + {p.displayName || p.name}
                                              {p.version && <span className="text-slate-600 ml-2">v{p.version}</span>}
                                          </div>
                                      ))}
                                      {detectedPrograms.length > 100 && (
                                          <div className="text-slate-500 italic mt-2">...and {detectedPrograms.length - 100} more programs</div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              })()}

              {/* Capability Report */}
              {profile && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Capability Report
                          </h3>
                          <div className="space-y-3 text-sm text-slate-300">
                              <div className="flex items-center justify-between p-2 bg-slate-900 rounded">
                                  <span>2K Texture Baking</span>
                                  {profile.vram >= 6 ? (
                                      <span className="text-emerald-400">Supported</span>
                                  ) : profile.vram > 0 ? (
                                      <span className="text-red-400">Low VRAM</span>
                                  ) : (
                                      <span className="text-slate-500">VRAM Unknown</span>
                                  )}
                              </div>
                              <div className="flex items-center justify-between p-2 bg-slate-900 rounded">
                                  <span>Neural Rendering (AI)</span>
                                  {profile.vram >= 8 ? (
                                      <span className="text-emerald-400">Supported</span>
                                  ) : profile.vram > 0 ? (
                                      <span className="text-yellow-400">Slow Mode</span>
                                  ) : (
                                      <span className="text-slate-500">VRAM Unknown</span>
                                  )}
                              </div>
                              <div className="flex items-center justify-between p-2 bg-slate-900 rounded">
                                  <span>Creation Kit Multitasking</span>
                                  {profile.ram >= 16 ? <span className="text-emerald-400">Optimal</span> : <span className="text-red-400">Memory Risk</span>}
                              </div>
                              <div className="flex items-center justify-between p-2 bg-slate-900 rounded">
                                  <span>Local LLM (8B model)</span>
                                  {profile.vram >= 8 ? (
                                      <span className="text-emerald-400">Capable</span>
                                  ) : profile.vram >= 4 ? (
                                      <span className="text-yellow-400">4-bit quant only</span>
                                  ) : (
                                      <span className="text-slate-500">CPU only</span>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                              <Settings className="w-5 h-5 text-purple-400" /> Mossy Tuning
                          </h3>
                          <p className="text-sm text-slate-400 mb-4">
                              Assistant behavior adjusted based on detected hardware:
                          </p>
                          <ul className="space-y-2 text-xs text-slate-300 list-disc pl-4">
                              {profile.blenderVersion ? (
                                  profile.blenderVersion === '2.79b' ? (
                                      <>
                                        <li className="text-orange-300">Legacy Blender knowledge active (NifTools 2.0.dev focus).</li>
                                        <li>Preferring 'Internal' renderer tips over 'Eevee'.</li>
                                      </>
                                  ) : (
                                      <>
                                        <li className="text-blue-300">Modern Blender {profile.blenderVersion} detected (Geometry Nodes enabled).</li>
                                        <li className="text-emerald-300">Advanced Shader Editing Enabled.</li>
                                        <li>PyNifly integration enabled.</li>
                                      </>
                                  )
                              ) : (
                                  <li className="text-slate-500">Blender not detected - Generic 3D workflow guidance available.</li>
                              )}
                              {profile.ram < 16 && <li>Asset caching disabled to save RAM.</li>}
                              {profile.vram > 0 ? (
                                  <li>Local LLM inference set to {profile.vram > 8 ? 'High' : 'Low'} Precision.</li>
                              ) : (
                                  <li className="text-slate-500">VRAM unknown - Using conservative AI settings.</li>
                              )}
                              {fo4Ecosystem?.modManager && fo4Ecosystem.modManager !== 'None detected' && (
                                  <li className="text-orange-300">{fo4Ecosystem.modManager} workflow guidance active.</li>
                              )}
                          </ul>
                      </div>
                  </div>
              )}
          </div>
      )}

      </div>
    </div>
  );
};

export default SystemMonitor;
