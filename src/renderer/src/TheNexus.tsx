import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Wrench, Database, Mic, Volume2, Activity, AlertCircle, CheckCircle2, Archive, Brain, Binary, Code, Hammer, Layers, BookOpen, Package, Radio, ShieldCheck, Sparkles, Target, Settings, Star, Coffee, Heart } from 'lucide-react';
import { useLive } from './LiveContext';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { openExternal } from './utils/openExternal';
import packageJson from '../../../package.json';

interface Insight {
  id: string;
  type: 'info' | 'warning' | 'suggestion';
  message: string;
  action?: string;
  actionLink?: string;
}

type HealthStatus = 'ok' | 'warn' | 'bad';

const HealthBadge: React.FC<{
  icon: React.ComponentType<any>;
  label: string;
  status: HealthStatus;
  detail?: string;
}> = ({ icon: Icon, label, status, detail }) => {
  const colors =
    status === 'ok'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
      : status === 'bad'
        ? 'border-red-500/40 bg-red-500/10 text-red-200'
        : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100';

  const dot = status === 'ok' ? <CheckCircle2 className="w-3 h-3" /> : status === 'bad' ? <AlertCircle className="w-3 h-3" /> : <Activity className="w-3 h-3" />;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-black tracking-widest uppercase ${colors}`}
      title={detail || label}
    >
      <Icon className="w-4 h-4 opacity-90" />
      <span className="min-w-0 truncate">{label}</span>
      <span className="ml-1 opacity-90">{dot}</span>
    </div>
  );
};

const TheNexus: React.FC = () => {
  const [greeting, setGreeting] = useState("Initializing Link...");
  const [activeProject, setActiveProject] = useState<{ name?: string; description?: string } | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState(false);
  const [health, setHealth] = useState(() => ({
    electron: 'warn' as HealthStatus,
    storage: 'warn' as HealthStatus,
    vault: 'warn' as HealthStatus,
    wizard: 'warn' as HealthStatus,
    mic: 'warn' as HealthStatus,
    tts: 'warn' as HealthStatus,
    vaultCount: 0,
    ttsCount: 0,
    micState: 'unknown' as string,
  }));

  // Get live interaction state from context
  const { isActive, mode, volume } = useLive();

  useEffect(() => {
    // 1. Time-based Greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("CORE INITIALIZED. GOOD MORNING.");
    else if (hour < 18) setGreeting("CORE INITIALIZED. GOOD AFTERNOON.");
    else setGreeting("CORE INITIALIZED. GOOD EVENING.");

    // 2. Load Local State
    const savedProject = localStorage.getItem('mossy_project');
    if (savedProject) {
      try { setActiveProject(JSON.parse(savedProject)); } catch { /* ignore */ }
    }

    const checkBridge = () => {
      const isConnected = localStorage.getItem('mossy_bridge_active') === 'true';
      setBridgeStatus(isConnected);
    };
    checkBridge();
    window.addEventListener('storage', checkBridge);
    window.addEventListener('mossy-bridge-connected', checkBridge);
    const bridgePoll = setInterval(checkBridge, 2000);

    const runHealth = async () => {
      // Electron API
      const api = (window as any).electron?.api || (window as any).electronAPI;
      const hasElectron = !!api;

      // localStorage
      let storageOk = false;
      try {
        const k = '__mossy_health__';
        localStorage.setItem(k, '1');
        storageOk = localStorage.getItem(k) === '1';
        localStorage.removeItem(k);
      } catch {
        storageOk = false;
      }

      // Knowledge Vault
      let vaultCount = 0;
      let vaultReadable = false;
      try {
        const raw = localStorage.getItem('mossy_knowledge_vault');
        if (raw) {
          const parsed = JSON.parse(raw);
          vaultCount = Array.isArray(parsed) ? parsed.length : 0;
          vaultReadable = true;
        }
      } catch {
        vaultReadable = false;
      }

      // Install Wizard state
      const hasWizardState = (() => {
        try {
          return !!localStorage.getItem('mossy_install_wizard_state_v1');
        } catch {
          return false;
        }
      })();

      // Microphone permission (best-effort)
      let micState = 'unknown';
      try {
        const perms: any = (navigator as any).permissions;
        if (perms?.query) {
          const st = await perms.query({ name: 'microphone' });
          micState = String(st?.state || 'unknown');
        } else {
          micState = 'unsupported';
        }
      } catch {
        micState = 'unknown';
      }

      const micStatus: HealthStatus = micState === 'granted' ? 'ok' : micState === 'denied' ? 'bad' : 'warn';

      // TTS voices (can load async)
      let ttsCount = 0;
      try {
        const synth: any = (window as any).speechSynthesis;
        const voices = synth?.getVoices ? synth.getVoices() : [];
        ttsCount = Array.isArray(voices) ? voices.length : 0;
      } catch {
        ttsCount = 0;
      }

      setHealth({
        electron: hasElectron ? 'ok' : 'warn',
        storage: storageOk ? 'ok' : 'bad',
        vault: vaultReadable ? (vaultCount > 0 ? 'ok' : 'warn') : 'bad',
        wizard: hasWizardState ? 'ok' : 'warn',
        mic: micStatus,
        tts: ttsCount > 0 ? 'ok' : 'warn',
        vaultCount,
        ttsCount,
        micState,
      });
    };

    const onVaultUpdate = () => {
      runHealth().catch(() => { });
    };

    runHealth().catch(() => { });
    window.addEventListener('mossy-knowledge-updated', onVaultUpdate);

    const synth: any = (window as any).speechSynthesis;
    const onVoicesChanged = () => runHealth().catch(() => { });
    try {
      synth?.addEventListener?.('voiceschanged', onVoicesChanged);
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('storage', checkBridge);
      window.removeEventListener('mossy-bridge-connected', checkBridge);
      clearInterval(bridgePoll);
      window.removeEventListener('mossy-knowledge-updated', onVaultUpdate);
      try {
        synth?.removeEventListener?.('voiceschanged', onVoicesChanged);
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <div
      className="h-full w-full flex flex-col relative overflow-y-auto overflow-x-hidden bg-black font-mono transition-all duration-700"
    >
      {/* HUD Overlays */}
      <div className="absolute inset-0 bg-emerald-500/5 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_150%)] pointer-events-none scale-150" />

      {/* Digital Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-20" />

      {/* Main UI Container */}
      <div className="relative z-20 flex-1 flex flex-col px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase italic">
              Mossy<span className="text-emerald-400">.Space</span>
            </h1>
            <p className="text-emerald-400 text-xs tracking-[0.3em] font-bold mt-2">NEURAL ENVIRONMENT • v{packageJson.version}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/knowledge-hub"
              className="px-3 py-2 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-300 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
            >
              Help
            </Link>
            <div className={`px-4 py-2 border rounded-full text-[10px] font-bold tracking-widest transition-all ${bridgeStatus ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
              {bridgeStatus ? 'UPLINK SYNCED' : 'UPLINK REQUIRED'}
            </div>
          </div>
        </div>

        {/* Active Project Banner */}
        {activeProject && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Active Project</span>
              <p className="text-sm font-bold text-white truncate">{activeProject.name ?? 'Unnamed Project'}</p>
              {activeProject.description && (
                <p className="text-xs text-slate-400 truncate">{activeProject.description}</p>
              )}
            </div>
            <Link to="/journey-hub" className="shrink-0 px-3 py-1 text-[10px] font-bold text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/10 transition-colors uppercase tracking-wider">
              Open
            </Link>
          </div>
        )}

        {/* Quick Health Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-10">
          <div className="flex flex-wrap items-center gap-2">
            <HealthBadge icon={Zap} label="Electron" status={health.electron} detail="window.electron.api availability" />
            <HealthBadge icon={Wrench} label="Storage" status={health.storage} detail="localStorage read/write" />
            <HealthBadge icon={Database} label={`Vault (${health.vaultCount})`} status={health.vault} detail="Knowledge Vault items" />
            <HealthBadge icon={Wrench} label="Wizard" status={health.wizard} detail="Install Wizard progress state" />
            <HealthBadge icon={Mic} label={`Mic (${health.micState})`} status={health.mic} detail="Microphone permission" />
            <HealthBadge icon={Volume2} label={`TTS (${health.ttsCount})`} status={health.tts} detail="speechSynthesis voices" />
          </div>
        </div>

        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description="The Nexus is your home dashboard: it shows health signals (Electron, storage, bridge, mic/tts) and keeps you oriented. All 23 platforms are accessible from the sidebar on the left."
          tools={[]}
          verify={[
            'Confirm health badges render and reflect your environment.',
            'Open System Hub and return back without navigation errors.',
          ]}
          firstTestLoop={[
            'Run Setup Wizards once to detect tools and set up paths.',
            'Open AI Chat and confirm you can send a message and receive a response.',
            'Open Runtime Hub → Desktop Bridge and confirm ONLINE if you use local features.',
          ]}
          troubleshooting={[
            'If Electron shows WARN/BAD, you may be running web mode or preload failed.',
            'If Mic/TTS show WARN, check permissions in your OS and retry.',
            'If Vault shows 0, open FO4 Knowledge Hub and run the indexer.',
          ]}
          shortcuts={[
            { label: 'AI Chat', to: '/chat' },
            { label: 'Setup Wizards', to: '/wizards' },
            { label: 'System Hub', to: '/system-hub' },
            { label: 'FO4 Knowledge Hub', to: '/knowledge-hub' },
            { label: 'FO4 Mod Journey Hub', to: '/journey-hub' },
          ]}
        />

        {/* Hub Navigation Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-black text-emerald-300 uppercase tracking-widest mb-4">Quick Hub Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Link to="/chat" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <Brain size={20} className="text-emerald-400" />
              <span className="font-bold">AI Chat</span>
              <span className="text-slate-500 text-[9px]">Ask Mossy anything</span>
            </Link>
            <Link to="/journey-hub" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <Sparkles size={20} className="text-emerald-400" />
              <span className="font-bold">FO4 Mod Journey Hub</span>
              <span className="text-slate-500 text-[9px]">Projects · Roadmaps</span>
            </Link>
            <Link to="/ck-tools" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <Code size={20} className="text-emerald-400" />
              <span className="font-bold">Creation Kit Hub</span>
              <span className="text-slate-500 text-[9px]">CK · Scripts · Crash Fix</span>
            </Link>
            <Link to="/plugin-tools" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <Database size={20} className="text-emerald-400" />
              <span className="font-bold">FO4 Plugin &amp; Load Order Hub</span>
              <span className="text-slate-500 text-[9px]">xEdit · Load Order · PRP</span>
            </Link>
            <Link to="/textures" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <Layers size={20} className="text-emerald-400" />
              <span className="font-bold">Textures & Materials</span>
              <span className="text-slate-500 text-[9px]">DDS · PBR · BC formats</span>
            </Link>
            <Link to="/asset-analysis" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <Binary size={20} className="text-emerald-400" />
              <span className="font-bold">FO4 Asset Analysis Hub</span>
              <span className="text-slate-500 text-[9px]">Scan · Dedupe · Mining</span>
            </Link>
            <Link to="/mod-builder" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <Hammer size={20} className="text-emerald-400" />
              <span className="font-bold">FO4 Mod Builder Hub</span>
              <span className="text-slate-500 text-[9px]">Blueprint · Workshop · Docs</span>
            </Link>
            <Link to="/packaging-release" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <Archive size={20} className="text-emerald-400" />
              <span className="font-bold">Packaging & Release</span>
              <span className="text-slate-500 text-[9px]">BA2 · FOMOD · Checklist</span>
            </Link>
            <Link to="/guides-hub" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <BookOpen size={20} className="text-emerald-400" />
              <span className="font-bold">Guides Hub</span>
              <span className="text-slate-500 text-[9px]">Animation · Quests · LOD</span>
            </Link>
            <Link to="/knowledge-hub" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <Brain size={20} className="text-emerald-400" />
              <span className="font-bold">FO4 Knowledge Hub</span>
              <span className="text-slate-500 text-[9px]">Docs · Search · Reference</span>
            </Link>
            <Link to="/system-hub" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <ShieldCheck size={20} className="text-emerald-400" />
              <span className="font-bold">System Hub</span>
              <span className="text-slate-500 text-[9px]">Diagnostics · Security</span>
            </Link>
            <Link to="/runtime-hub" className="p-3 border border-emerald-500/30 rounded hover:bg-emerald-500/10 hover:border-emerald-500 transition-all flex flex-col items-center gap-2 text-center text-xs">
              <Radio size={20} className="text-emerald-400" />
              <span className="font-bold">Runtime Hub</span>
              <span className="text-slate-500 text-[9px]">Live · Bridge · Holodeck</span>
            </Link>
          </div>
        </div>

        {/* FO4 New User Tips */}
        <div className="mb-10">
          <h2 className="text-lg font-black text-emerald-300 uppercase tracking-widest mb-4">Fallout 4 Modding — Where to Start</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                icon: Settings,
                step: '1',
                title: 'Run Setup Wizards',
                body: 'Detect F4SE, xEdit, MO2/Vortex, Creation Kit, and other tools. Mossy customizes her advice to what is actually installed.',
                to: '/wizards',
              },
              {
                icon: Target,
                step: '2',
                title: 'Pick a Modding Goal',
                body: 'Open FO4 Mod Journey Hub → Roadmaps and generate a step-by-step plan. Whether you are adding weapons, quests, or worldspaces — start with a clear goal.',
                to: '/journey-hub',
              },
              {
                icon: Package,
                step: '3',
                title: 'Know the Load Order Rules',
                body: 'Fallout 4 has a 255 plugin cap (ESM+ESP+ESL). ESL-flagged plugins share a 2,048 FormID pool. Use FO4 Plugin & Load Order Hub to manage and validate.',
                to: '/plugin-tools',
              },
              {
                icon: Star,
                step: '4',
                title: 'Learn the Asset Pipeline',
                body: 'Textures use BC formats (BC1/BC3/BC7). Meshes are NIF files with Havok collision. BA2 archives hold compressed assets. Textures Hub and Guides Hub cover all of this.',
                to: '/textures',
              },
              {
                icon: ShieldCheck,
                step: '5',
                title: 'Keep Your Game Stable',
                body: 'First identify your game version: OG (1.10.163), NG (1.10.980–984), or AE/1.11.x (1.11.191+). Then install the matching stack: F4SE + Address Library + X-Cell. Avoid deprecated AWKCR/DEF_UI — use ECO/NEO and FallUI instead. Use Creation Kit Hub for crash prevention monitoring.',
                to: '/ck-tools',
              },
              {
                icon: BookOpen,
                step: '6',
                title: 'Build & Package Your Mod',
                body: 'Use FO4 Mod Builder Hub to draft architecture, work in Workshop, build scripts in Devtools, and document in Scribe. Then go to Packaging & Release to create a BA2 and build your FOMOD installer.',
                to: '/mod-builder',
              },
            ].map(({ icon: Icon, step, title, body, to }) => (
              <Link
                key={step}
                to={to}
                className="p-4 border border-slate-700/60 rounded-lg hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">STEP {step}</span>
                  <Icon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-sm font-bold text-white mb-1">{title}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{body}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            {/* Subtle glow behind the greeting (keeps the vibe without a giant face) */}
            <div className={`absolute inset-[-30px] rounded-full blur-[90px] transition-all duration-1000 ${isActive ? 'bg-emerald-500/18' : 'bg-emerald-500/6'}`} />

            <div className="text-center">
              <div className="text-3xl font-black text-white bg-black/40 backdrop-blur-md px-6 py-2 rounded border border-white/10 uppercase tracking-widest mb-2">
                {greeting}
              </div>
              <p className="text-emerald-400/70 text-xs font-bold tracking-widest uppercase italic">
                The neural link is active and monitoring your workspace
              </p>
            </div>
          </div>
        </div>

        {/* Support Banner */}
        <div className="mt-6 px-2">
          <div className="border border-emerald-700/30 rounded-xl bg-black/40 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-slate-300">
                <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs font-semibold">Mossy.Space is free &amp; open — if it's helped your modding, consider supporting development</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => void openExternal('https://www.patreon.com/c/Pointytundra654')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-orange-500/40 bg-orange-900/20 hover:bg-orange-900/40 hover:border-orange-500/60 transition-all text-xs font-bold text-orange-200"
                >
                  <Star className="w-3.5 h-3.5 text-orange-400" />
                  Patreon
                </button>
                <button
                  onClick={() => void openExternal('https://buymeacoffee.com/tundra654')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-yellow-500/40 bg-yellow-900/20 hover:bg-yellow-900/40 hover:border-yellow-500/60 transition-all text-xs font-bold text-yellow-200"
                >
                  <Coffee className="w-3.5 h-3.5 text-yellow-400" />
                  Buy Me a Coffee
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TheNexus;
