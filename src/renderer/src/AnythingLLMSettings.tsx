import React, { useEffect, useState, useCallback } from 'react';
import {
  Database, Wifi, WifiOff, Plus, Trash2, RefreshCw,
  CheckCircle2, AlertCircle, Loader2, Key, Settings, Play, RotateCcw,
} from 'lucide-react';

type Workspace = {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
};

type ConnStatus = 'idle' | 'checking' | 'connected' | 'error';
type ServerStatus = { processRunning: boolean; portListening: boolean; pid: number | null } | null;

const AnythingLLMSettings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const api = (window as any).electron?.api || (window as any).electronAPI;

  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [serverStatus, setServerStatus] = useState<ServerStatus>(null);
  const [url, setUrl] = useState('http://127.0.0.1:3001');
  const [apiKey, setApiKey] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupMsg, setSetupMsg] = useState('');
  const [newWsName, setNewWsName] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const hasApi = !!api?.anythingllm;

  const refreshServerStatus = useCallback(async () => {
    if (!hasApi) return;
    const s = await api.anythingllm.serverStatus();
    setServerStatus(s);
    return s;
  }, [hasApi]);

  useEffect(() => {
    if (!hasApi) return;
    api.anythingllm.getSettings().then((s: any) => {
      if (s.url) setUrl(s.url);
      if (s.hasApiKey) setApiKey('••••••••••••');
    });
    void refreshServerStatus();
    const interval = setInterval(() => void refreshServerStatus(), 5000);
    return () => clearInterval(interval);
  }, [hasApi, refreshServerStatus]);

  const checkConnection = useCallback(async () => {
    if (!hasApi) return;
    setConnStatus('checking');
    const res = await api.anythingllm.ping(url);
    setConnStatus(res.ok ? 'connected' : 'error');
    if (res.ok) void loadWorkspaces();
  }, [hasApi, url]);

  const loadWorkspaces = useCallback(async () => {
    if (!hasApi) return;
    setLoadingWorkspaces(true);
    const res = await api.anythingllm.workspaces();
    setLoadingWorkspaces(false);
    if (res.ok) setWorkspaces(res.workspaces || []);
  }, [hasApi]);

  const handleAutoSetup = async () => {
    if (!hasApi) return;
    setSetupBusy(true);
    setSetupMsg('');
    const res = await api.anythingllm.setup();
    setSetupBusy(false);
    if (res.ok) {
      setSetupMsg(res.message || 'Connected');
      setConnStatus('connected');
      void loadWorkspaces();
    } else {
      setSetupMsg(res.error || 'Setup failed — is the server running?');
      setConnStatus('error');
    }
  };

  const handleRestart = async () => {
    if (!hasApi) return;
    setRestarting(true);
    await api.anythingllm.serverRestart();
    // Poll until port is live
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const s = await refreshServerStatus();
      if (s?.portListening) break;
    }
    setRestarting(false);
  };

  const handleSave = async () => {
    if (!hasApi) return;
    setSavingSettings(true);
    const params: any = { url };
    if (apiKey && !apiKey.startsWith('•')) params.apiKey = apiKey;
    await api.anythingllm.saveSettings(params);
    setSavingSettings(false);
  };

  const handleCreateWorkspace = async () => {
    if (!hasApi || !newWsName.trim()) return;
    setCreatingWs(true);
    const res = await api.anythingllm.createWorkspace(newWsName.trim());
    setCreatingWs(false);
    if (res.ok) { setNewWsName(''); void loadWorkspaces(); }
  };

  const handleDeleteWorkspace = async (slug: string) => {
    if (!hasApi) return;
    setDeletingSlug(slug);
    await api.anythingllm.deleteWorkspace(slug);
    setDeletingSlug(null);
    void loadWorkspaces();
  };

  const serverOk = serverStatus?.portListening;
  const serverLabel = restarting ? 'RESTARTING...'
    : serverStatus === null ? 'CHECKING...'
    : serverOk ? `RUNNING (PID ${serverStatus.pid ?? '?'})`
    : serverStatus?.processRunning ? 'STARTING...'
    : 'STOPPED';
  const serverColor = restarting ? 'text-yellow-400'
    : serverStatus === null ? 'text-slate-400'
    : serverOk ? 'text-emerald-400'
    : serverStatus?.processRunning ? 'text-yellow-400'
    : 'text-red-400';

  const connColor = connStatus === 'connected' ? 'text-emerald-400'
    : connStatus === 'error' ? 'text-red-400' : 'text-slate-400';

  return (
    <div className="space-y-6 text-sm">
      {/* Info banner */}
      <div className="p-3 rounded-md border border-cyan-700/30 bg-cyan-900/10 text-cyan-200 text-xs space-y-1">
        <div className="font-semibold flex items-center gap-2">
          <Database className="w-4 h-4" />
          AnythingLLM — Embedded RAG Knowledge Engine
        </div>
        <p className="text-cyan-300/80">
          Mossy auto-starts this server in the background when it launches.
          No bat file needed — it runs invisibly alongside Mossy.
        </p>
      </div>

      {/* Server process status */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Background Server</div>
        <div className="flex items-center justify-between p-3 rounded-md border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2">
            {restarting || serverStatus === null ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : serverOk ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : serverStatus?.processRunning ? (
              <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={'text-xs font-mono ' + serverColor}>{serverLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshServerStatus()}
              className="text-slate-400 hover:text-white p-1"
              title="Refresh status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void handleRestart()}
              disabled={restarting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-xs disabled:opacity-50"
            >
              {restarting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Restart
            </button>
          </div>
        </div>

        {!serverOk && !serverStatus?.processRunning && serverStatus !== null && !restarting && (
          <div className="text-xs text-slate-500 space-y-1">
            <p>Server did not auto-start. Possible reasons:</p>
            <ul className="list-disc list-inside ml-2 space-y-0.5 text-slate-600">
              <li><code className="font-mono bg-slate-800 px-1 rounded text-cyan-400">d:\Projects\anything-llm\server\</code> not found</li>
              <li>Node.js not in PATH or at standard install location</li>
              <li>node_modules not installed yet</li>
            </ul>
            <p>Click <strong className="text-white">Restart</strong> above to retry, or install Node 18+ if needed.</p>
          </div>
        )}
      </div>

      {/* API connection */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">API Connection</div>

        <div className="flex items-center gap-2">
          {connStatus === 'checking' ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          ) : connStatus === 'connected' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : connStatus === 'error' ? (
            <WifiOff className="w-4 h-4 text-red-400" />
          ) : (
            <Wifi className="w-4 h-4 text-slate-500" />
          )}
          <span className={'text-xs font-mono ' + connColor}>
            {connStatus === 'connected' ? 'API AUTHENTICATED'
              : connStatus === 'error' ? 'AUTH FAILED'
              : connStatus === 'checking' ? 'TESTING...'
              : 'NOT TESTED'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Server URL</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">API Key</label>
            <input
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              type="password"
              placeholder="Created automatically on first connect"
              className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void handleAutoSetup()}
            disabled={setupBusy || !serverOk}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-semibold text-xs transition-colors disabled:opacity-50"
          >
            {setupBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Auto-Connect
          </button>
          <button
            type="button"
            onClick={() => void checkConnection()}
            disabled={connStatus === 'checking'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-xs transition-colors disabled:opacity-50"
          >
            <Wifi className="w-4 h-4" />
            Test
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={savingSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-xs transition-colors disabled:opacity-50"
          >
            {savingSettings ? <Loader2 className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />}
            Save
          </button>
        </div>

        {setupMsg && (
          <div className={'text-xs font-mono p-2 rounded border ' + (connStatus === 'connected'
            ? 'border-emerald-700/40 bg-emerald-900/20 text-emerald-300'
            : 'border-red-700/40 bg-red-900/20 text-red-300')}>
            {setupMsg}
          </div>
        )}
      </div>

      {/* Workspace manager */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Workspaces</div>
          <button
            type="button"
            onClick={() => void loadWorkspaces()}
            disabled={loadingWorkspaces}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className={'w-3 h-3 ' + (loadingWorkspaces ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={newWsName}
            onChange={e => setNewWsName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleCreateWorkspace(); }}
            placeholder="New workspace name..."
            className="flex-1 px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={() => void handleCreateWorkspace()}
            disabled={creatingWs || !newWsName.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs disabled:opacity-50"
          >
            {creatingWs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create
          </button>
        </div>

        {workspaces.length === 0 ? (
          <div className="text-xs text-slate-500 italic py-2">
            {connStatus === 'connected' ? 'No workspaces — create one above or click Auto-Connect to bootstrap.' : 'Click Auto-Connect first to set up workspaces.'}
          </div>
        ) : (
          <div className="space-y-2">
            {workspaces.map(ws => (
              <div key={ws.slug} className="flex items-center justify-between p-3 rounded-md border border-slate-700/50 bg-slate-800/30">
                <div>
                  <div className="text-xs font-semibold text-white">{ws.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{ws.slug}</div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteWorkspace(ws.slug)}
                  disabled={deletingSlug === ws.slug}
                  className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  {deletingSlug === ws.slug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* First-time setup steps */}
      <div className="p-3 rounded-md border border-slate-700/40 bg-slate-900/30 text-xs text-slate-400 space-y-1.5">
        <div className="font-semibold text-slate-300">First-Time Setup (once only)</div>
        <ol className="list-decimal list-inside space-y-1">
          <li>Wait for <strong className="text-white">Background Server</strong> above to show RUNNING</li>
          <li>Click <strong className="text-white">Auto-Connect</strong> — creates API key and default workspace</li>
          <li>Go to <strong className="text-white">Memory Vault</strong> and click <strong className="text-white">Sync to AnythingLLM</strong></li>
          <li>Use <strong className="text-white">Knowledge Hub → RAG Search</strong> to query your memories semantically</li>
        </ol>
      </div>
    </div>
  );
};

export default AnythingLLMSettings;