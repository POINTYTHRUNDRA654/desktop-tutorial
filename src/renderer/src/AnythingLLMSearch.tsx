import React, { useState, useCallback, useEffect } from 'react';
import { Search, Database, Bot, RefreshCw, Copy, Check, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

type Source = {
  title: string;
  text?: string;
  score?: number;
};

type Workspace = {
  id: number;
  name: string;
  slug: string;
};

type AnythingLLMSearchProps = {
  embedded?: boolean;
};

const AnythingLLMSearch: React.FC<AnythingLLMSearchProps> = ({ embedded = false }) => {
  const api = (window as any).electron?.api || (window as any).electronAPI;
  const hasApi = !!api?.anythingllm;

  const [connected, setConnected] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [loadingWs, setLoadingWs] = useState(false);

  const checkAndLoad = useCallback(async () => {
    if (!hasApi) return;
    setLoadingWs(true);
    const ping = await api.anythingllm.ping();
    if (!ping.ok) { setLoadingWs(false); return; }
    setConnected(true);
    const wsRes = await api.anythingllm.workspaces();
    setLoadingWs(false);
    if (wsRes.ok && wsRes.workspaces?.length) {
      setWorkspaces(wsRes.workspaces);
      setSelectedSlug(prev => prev || wsRes.workspaces[0]?.slug || '');
    }
  }, [hasApi]);

  useEffect(() => { void checkAndLoad(); }, [checkAndLoad]);

  const handleSearch = async () => {
    if (!hasApi || !query.trim() || !selectedSlug) return;
    setBusy(true);
    setError('');
    setResponse('');
    setSources([]);
    setShowSources(false);
    const res = await api.anythingllm.chat(selectedSlug, query.trim(), 'query');
    setBusy(false);
    if (res.ok) {
      setResponse(res.response || '');
      setSources(res.sources || []);
    } else {
      setError(res.error || 'Query failed');
    }
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(response).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!hasApi) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 p-4">
        <AlertCircle className="w-4 h-4 text-red-400" />
        AnythingLLM API not available — run inside Mossy desktop app.
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Database className="w-4 h-4 text-slate-500" />
          AnythingLLM server is not running.
        </div>
        <p className="text-xs text-slate-500">
          Start <code className="font-mono bg-slate-800 px-1 rounded text-cyan-300">d:\Projects\anything-llm\start-mossy.bat</code>,
          then configure it in <strong className="text-white">Settings → AnythingLLM</strong>.
        </p>
        <button
          type="button"
          onClick={() => void checkAndLoad()}
          disabled={loadingWs}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-xs"
        >
          <RefreshCw className={'w-3.5 h-3.5 ' + (loadingWs ? 'animate-spin' : '')} />
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workspace selector */}
      {workspaces.length > 0 && (
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <select
            value={selectedSlug}
            onChange={e => setSelectedSlug(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            {workspaces.map(ws => (
              <option key={ws.slug} value={ws.slug}>{ws.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void checkAndLoad()}
            disabled={loadingWs}
            className="text-slate-400 hover:text-white p-1"
            title="Refresh workspaces"
          >
            <RefreshCw className={'w-3.5 h-3.5 ' + (loadingWs ? 'animate-spin' : '')} />
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) void handleSearch(); }}
            placeholder="Ask a question about your ingested knowledge..."
            className="w-full pl-9 pr-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={busy || !query.trim() || !selectedSlug}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          Ask RAG
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md border border-red-700/40 bg-red-900/20 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="space-y-2">
          <div className="relative p-4 rounded-md border border-cyan-700/30 bg-cyan-900/10">
            <button
              type="button"
              onClick={copyResponse}
              className="absolute top-2 right-2 p-1 rounded text-slate-400 hover:text-white"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre className="text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed pr-6">
              {response}
            </pre>
          </div>

          {sources.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowSources(v => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              >
                {showSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {sources.length} source{sources.length !== 1 ? 's' : ''}
              </button>

              {showSources && (
                <div className="mt-2 space-y-2">
                  {sources.map((src, i) => (
                    <div key={i} className="p-2 rounded border border-slate-700/50 bg-slate-800/40 text-xs">
                      <div className="font-semibold text-slate-300 mb-1">{src.title || 'Source ' + (i + 1)}</div>
                      {src.text && (
                        <p className="text-slate-400 line-clamp-3">{src.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!busy && !response && !error && (
        <div className="text-center py-8 text-slate-500 text-xs space-y-2">
          <Database className="w-8 h-8 mx-auto text-slate-600" />
          <p>Ask anything — your ingested documents will be used to answer.</p>
          <p className="text-slate-600">Sync memories in <strong className="text-slate-500">Memory Vault</strong> to populate this search.</p>
        </div>
      )}
    </div>
  );
};

export default AnythingLLMSearch;