import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Package, Hammer, Radio, Github, Wrench, Database, Mic, Volume2, Activity, AlertCircle, CheckCircle2, Library } from 'lucide-react';
import AvatarCore from './AvatarCore';
import { useLive } from './LiveContext';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { mossyAvatarUrl } from './assets/avatar';

const DEFAULT_MOSSY_AVATAR_URL = mossyAvatarUrl;

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
  const [activeProject, setActiveProject] = useState<any>(null);
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
    if (savedProject) setActiveProject(JSON.parse(savedProject));
    
    const bridge = localStorage.getItem('mossy_bridge_active') === 'true';
    setBridgeStatus(bridge);

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
      runHealth().catch(() => {});
    };

    runHealth().catch(() => {});
    window.addEventListener('mossy-knowledge-updated', onVaultUpdate);

    const synth: any = (window as any).speechSynthesis;
    const onVoicesChanged = () => runHealth().catch(() => {});
    try {
      synth?.addEventListener?.('voiceschanged', onVoicesChanged);
    } catch {
      // ignore
    }

    return () => {
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
      <div className="relative z-20 flex-1 flex flex-col p-12">
        <div className="flex justify-between items-start mb-12">
            <div>
                <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase italic">
              Mossy<span className="text-emerald-400">.Space</span>
                </h1>
            <p className="text-emerald-400 text-xs tracking-[0.3em] font-bold mt-2">NEURAL ENVIRONMENT • 1.0.4-STABLE</p>
            </div>
          <div className={`px-4 py-2 border rounded-full text-[10px] font-bold tracking-widest transition-all ${bridgeStatus ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
                {bridgeStatus ? 'UPLINK SYNCED' : 'UPLINK REQUIRED'}
            </div>
        </div>

        {/* Quick Health Strip */}
        <div className="flex items-center justify-between gap-4 mb-10">
          <div className="flex flex-wrap items-center gap-2">
            <HealthBadge icon={Zap} label="Electron" status={health.electron} detail="window.electron.api availability" />
            <HealthBadge icon={Wrench} label="Storage" status={health.storage} detail="localStorage read/write" />
            <HealthBadge icon={Database} label={`Vault (${health.vaultCount})`} status={health.vault} detail="Knowledge Vault items" />
            <HealthBadge icon={Wrench} label="Wizard" status={health.wizard} detail="Install Wizard progress state" />
            <HealthBadge icon={Mic} label={`Mic (${health.micState})`} status={health.mic} detail="Microphone permission" />
            <HealthBadge icon={Volume2} label={`TTS (${health.ttsCount})`} status={health.tts} detail="speechSynthesis voices" />
          </div>
          <Link
            to="/diagnostics"
            className="text-[10px] font-black uppercase tracking-widest text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
            title="Open Diagnostics"
          >
            Diagnostics
          </Link>
        </div>

        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description="The Nexus is your home dashboard: it shows health signals (Electron, storage, bridge, mic/tts) and routes you to the right tools."
          tools={[]}
          verify={[
            'Confirm health badges render and reflect your environment.',
            'Open Diagnostics and return back without navigation errors.',
          ]}
          firstTestLoop={[
            'Run Install Wizard once to detect tools and set up paths.',
            'Open Chat and confirm you can send a message and receive a response.',
            'Open Desktop Bridge and confirm ONLINE if you use local features.',
          ]}
          troubleshooting={[
            'If Electron shows WARN/BAD, you may be running web mode or preload failed.',
            'If Mic/TTS show WARN, check permissions in your OS and retry.',
          ]}
          shortcuts={[
            { label: 'Install Wizard', to: '/install-wizard' },
            { label: 'Chat', to: '/chat' },
            { label: 'Desktop Bridge', to: '/bridge' },
            { label: 'Tool Settings', to: '/settings/tools' },
          ]}
        />

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

        {/* Quick Jump Core Modules */}
    <div className="mb-4">
      <Link
        to="/install-wizard"
        className="group flex items-center justify-between bg-black/50 backdrop-blur-md border border-white/10 hover:border-emerald-500/60 p-5 transition-all rounded-xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-emerald-500 transition-all duration-300" />
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Wrench className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white uppercase tracking-widest mb-1">Install Wizard</div>
            <div className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">
              Step-by-step installs • xEdit • SS2 • PRP • patching
            </div>
          </div>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
          Open
        </div>
      </Link>
    </div>

    <div className="mb-4">
      <Link
        to="/community"
        className="group flex items-center justify-between bg-black/50 backdrop-blur-md border border-white/10 hover:border-emerald-500/60 p-5 transition-all rounded-xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-emerald-500 transition-all duration-300" />
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Github className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white uppercase tracking-widest mb-1">Community Learning</div>
            <div className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">
              Teach Mossy your modding goals • optional GitHub submission
            </div>
          </div>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
          Open
        </div>
      </Link>
    </div>

    <div className="mb-4">
      <Link
        to="/platforms"
        className="group flex items-center justify-between bg-black/50 backdrop-blur-md border border-white/10 hover:border-emerald-500/60 p-5 transition-all rounded-xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-emerald-500 transition-all duration-300" />
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Library className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white uppercase tracking-widest mb-1">Platforms Hub</div>
            <div className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">
              Crash triage • Packaging • CK quests & dialogue
            </div>
          </div>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
          Open
        </div>
      </Link>
    </div>

        <div className="grid grid-cols-4 gap-4 mt-auto">
            {[
                { label: 'Neural Link', path: '/neural-link', icon: Zap, detail: 'Process Monitor' },
                { label: 'The Workshop', path: '/workshop', icon: Hammer, detail: 'Script Compiler' },
                { label: 'The Vault', path: '/vault', icon: Package, detail: 'Asset Explorer' },
                { label: 'Live Synapse', path: '/live', icon: Radio, detail: 'Voice Uplink' }
            ].map((module, idx) => (
                <Link 
                    key={idx} 
                    to={module.path}
                  className="group bg-black/40 backdrop-blur-md border border-white/5 hover:border-emerald-500/50 p-6 transition-all rounded-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-emerald-500 transition-all duration-300" />
                  <module.icon className="w-5 h-5 text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-black text-white uppercase tracking-widest mb-1">{module.label}</div>
                  <div className="text-[9px] text-emerald-400/50 font-bold uppercase tracking-widest">{module.detail}</div>
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
};

export default TheNexus;