import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Database,
  ExternalLink,
  FileText,
  FolderOpen,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOTS_KEY = 'mossy_knowledge_roots_v1';

// ─── Repo catalogue ───────────────────────────────────────────────────────────

interface CosmosRepo {
  id: string;
  label: string;
  root: string;
  doc: string;
  searchHint: string;
  summary: string;
  gitUrl: string;
  cloneTarget: string;
  tier: 'core' | 'tooling' | 'data';
  sizeMB: number;
}

const COSMOS_REPOS: CosmosRepo[] = [
  {
    id: 'transfer',
    label: 'Cosmos Transfer2.5',
    root: 'external/nvidia-cosmos/cosmos-transfer2.5',
    doc: 'resources/public/knowledge/COSMOS_TRANSFER2_5_INTEGRATION.md',
    searchHint: 'Cosmos-Transfer2.5-2B',
    summary: 'Multi-controlnet world foundation model for video generation.',
    gitUrl: 'https://github.com/nvidia-cosmos/cosmos-transfer2.5',
    cloneTarget: 'external/nvidia-cosmos/cosmos-transfer2.5',
    tier: 'core',
    sizeMB: 224,
  },
  {
    id: 'predict',
    label: 'Cosmos Predict2.5',
    root: 'external/nvidia-cosmos/cosmos-predict2.5',
    doc: 'resources/public/knowledge/COSMOS_PREDICT2_5_INTEGRATION.md',
    searchHint: 'cosmos_predict2',
    summary: 'Prediction-focused stack with inference and post-training workflows.',
    gitUrl: 'https://github.com/nvidia-cosmos/cosmos-predict2.5',
    cloneTarget: 'external/nvidia-cosmos/cosmos-predict2.5',
    tier: 'core',
    sizeMB: 154,
  },
  {
    id: 'reason2',
    label: 'Cosmos Reason 2',
    root: 'external/nvidia-cosmos/cosmos-reason2',
    doc: 'resources/public/knowledge/COSMOS_REASON2_INTEGRATION.md',
    searchHint: 'cosmos_reason2',
    summary: 'Physics-aware Vision Language Model — spatial/temporal reasoning and text encoder for Predict2.5.',
    gitUrl: 'https://github.com/nvidia-cosmos/cosmos-reason2',
    cloneTarget: 'external/nvidia-cosmos/cosmos-reason2',
    tier: 'core',
    sizeMB: 22,
  },
  {
    id: 'cookbook',
    label: 'Cosmos Cookbook',
    root: 'external/nvidia-cosmos/cosmos-cookbook',
    doc: 'resources/public/knowledge/COSMOS_COOKBOOK_INTEGRATION.md',
    searchHint: 'recipes',
    summary: 'Guides, recipes, and reference material for Cosmos workflows.',
    gitUrl: 'https://github.com/nvidia-cosmos/cosmos-cookbook',
    cloneTarget: 'external/nvidia-cosmos/cosmos-cookbook',
    tier: 'tooling',
    sizeMB: 1500,
  },
  {
    id: 'rl',
    label: 'Cosmos RL',
    root: 'external/nvidia-cosmos/cosmos-rl',
    doc: 'resources/public/knowledge/COSMOS_RL_INTEGRATION.md',
    searchHint: 'rollout',
    summary: 'Reinforcement learning tooling with configs, rollouts, and training patterns.',
    gitUrl: 'https://github.com/nvidia-cosmos/cosmos-rl',
    cloneTarget: 'external/nvidia-cosmos/cosmos-rl',
    tier: 'tooling',
    sizeMB: 36,
  },
  {
    id: 'dependencies',
    label: 'Cosmos Dependencies',
    root: 'external/nvidia-cosmos/cosmos-dependencies',
    doc: 'resources/public/knowledge/COSMOS_DEPENDENCIES_INTEGRATION.md',
    searchHint: 'dependencies',
    summary: 'Versioned dependency manifests for Cosmos environments.',
    gitUrl: 'https://github.com/nvidia-cosmos/cosmos-dependencies',
    cloneTarget: 'external/nvidia-cosmos/cosmos-dependencies',
    tier: 'tooling',
    sizeMB: 12,
  },
  {
    id: 'curate',
    label: 'Cosmos Curate',
    root: 'external/nvidia-cosmos/cosmos-curate',
    doc: 'resources/public/knowledge/COSMOS_CURATE_INTEGRATION.md',
    searchHint: 'curator',
    summary: 'Data curation and evaluation tooling for Cosmos pipelines.',
    gitUrl: 'https://github.com/nvidia-cosmos/cosmos-curate',
    cloneTarget: 'external/nvidia-cosmos/cosmos-curate',
    tier: 'data',
    sizeMB: 17,
  },
  {
    id: 'xenna',
    label: 'Cosmos Xenna',
    root: 'external/nvidia-cosmos/cosmos-xenna',
    doc: 'resources/public/knowledge/COSMOS_XENNA_INTEGRATION.md',
    searchHint: 'xenna',
    summary: 'Core libraries, CLI tooling, and examples for Cosmos workflows.',
    gitUrl: 'https://github.com/nvidia-cosmos/cosmos-xenna',
    cloneTarget: 'external/nvidia-cosmos/cosmos-xenna',
    tier: 'data',
    sizeMB: 3,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type RepoFsStatus = 'detected' | 'missing' | 'unknown';
type DocFsStatus  = 'found'    | 'missing' | 'unknown';
type RootStatus   = 'added'    | 'absent';
type FilterMode   = 'all'      | 'missing' | 'ready';

interface RepoState {
  repo: RepoFsStatus;
  doc:  DocFsStatus;
  root: RootStatus;
}

interface InlineResult {
  score: number;
  sourcePath: string;
  title: string;
  content: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizePath = (v: string): string =>
  String(v || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

function loadRoots(): string[] {
  try {
    const raw = localStorage.getItem(ROOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'string' && (x as string).trim()) : [];
  } catch { return []; }
}

function saveRoots(roots: string[]): void {
  localStorage.setItem(ROOTS_KEY, JSON.stringify(roots));
}

function coreReposReady(states: Record<string, RepoState>): boolean {
  return COSMOS_REPOS.filter(r => r.tier === 'core').every(r => states[r.id]?.root === 'added');
}

const TIER_BADGE: Record<CosmosRepo['tier'], string> = {
  core:    'bg-emerald-900/40 border-emerald-500/40 text-emerald-300',
  tooling: 'bg-sky-900/40    border-sky-500/40    text-sky-300',
  data:    'bg-amber-900/40  border-amber-500/40  text-amber-300',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'ok' | 'warn' | 'unknown' }) {
  if (status === 'ok')   return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-amber-400  flex-shrink-0" />;
  return <span className="inline-block w-4 h-4 rounded-full border border-slate-600 flex-shrink-0" />;
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement('textarea');
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    });
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} title={`Copy ${label ?? ''}`}
      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-emerald-300 transition-colors">
      {copied
        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        : <ClipboardCopy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const CosmosWorkflow: React.FC = () => {
  const navigate = useNavigate();
  const api = useMemo(() => (window as any).electron?.api || (window as any).electronAPI, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [repoStates,    setRepoStates]    = useState<Record<string, RepoState>>({});
  const [roots,         setRoots]         = useState<string[]>(loadRoots);
  const [busyIds,       setBusyIds]       = useState<Set<string>>(new Set());
  const [batchBusy,     setBatchBusy]     = useState(false);
  const [filter,        setFilter]        = useState<FilterMode>('all');
  const [expandedClone, setExpandedClone] = useState<string | null>(null);
  const [refreshing,    setRefreshing]    = useState(false);

  // Inline search
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchResults,  setSearchResults]  = useState<InlineResult[]>([]);
  const [searchBusy,     setSearchBusy]     = useState(false);
  const [searchError,    setSearchError]    = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);

  const hasRoot = useMemo(() => new Set(roots.map(normalizePath)), [roots]);

  // ── Root-added check ───────────────────────────────────────────────────────
  const isRootAdded = useCallback((repo: CosmosRepo): boolean => {
    const norm   = normalizePath(repo.root);
    const folder = norm.split('/').pop() ?? '';
    return Array.from(hasRoot).some(r => r === norm || (folder && r.endsWith(`/${folder}`)));
  }, [hasRoot]);

  // ── Refresh all statuses ───────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    const nextRoots = loadRoots();
    setRoots(nextRoots);
    const normRoots = nextRoots.map(normalizePath);
    const next: Record<string, RepoState> = {};

    for (const repo of COSMOS_REPOS) {
      let repoFs: RepoFsStatus = 'unknown';
      let docFs:  DocFsStatus  = 'unknown';

      if (api?.fsStat) {
        try {
          const s = await api.fsStat(repo.root);
          repoFs  = s?.exists && s?.isDirectory ? 'detected' : 'missing';
        } catch { repoFs = 'unknown'; }
        try {
          const d = await api.fsStat(repo.doc);
          docFs   = d?.exists ? 'found' : 'missing';
        } catch { docFs = 'unknown'; }
      }

      const norm   = normalizePath(repo.root);
      const folder = norm.split('/').pop() ?? '';
      const added  = normRoots.some(r => r === norm || (folder && r.endsWith(`/${folder}`)));
      next[repo.id] = { repo: repoFs, doc: docFs, root: added ? 'added' : 'absent' };
    }

    setRepoStates(next);
    setRefreshing(false);
  }, [api]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ── Health score ───────────────────────────────────────────────────────────
  const healthScore = useMemo(() => {
    const entries = Object.values(repoStates);
    if (!entries.length) return null;
    let score = 0;
    for (const s of entries) {
      if (s.repo === 'detected') score++;
      if (s.doc  === 'found')    score++;
      if (s.root === 'added')    score++;
    }
    return Math.round((score / (entries.length * 3)) * 100);
  }, [repoStates]);

  const healthColor =
    healthScore === null   ? 'text-slate-400' :
    healthScore >= 80      ? 'text-emerald-400' :
    healthScore >= 50      ? 'text-amber-400'   : 'text-red-400';

  // ── Add single root ────────────────────────────────────────────────────────
  const addKnowledgeRoot = useCallback(async (repo: CosmosRepo) => {
    if (busyIds.has(repo.id)) return;
    setBusyIds(prev => { const n = new Set(prev); n.add(repo.id); return n; });
    try {
      let target = repo.root;
      if (api?.fsStat) {
        const stat = await api.fsStat(repo.root);
        if (!stat?.exists || !stat?.isDirectory) {
          if (api?.pickDirectory) {
            const picked = await api.pickDirectory(`Select ${repo.label} folder`);
            if (!picked) return;
            target = String(picked);
          } else {
            toast.error(`${repo.label} not found on disk. Clone it first, then retry.`);
            return;
          }
        }
      }
      const existing = loadRoots();
      if (existing.some(r => normalizePath(r) === normalizePath(target))) {
        toast.error(`${repo.label} is already registered.`); return;
      }
      saveRoots([...existing, target]);
      await refreshAll();
      toast.success(`✓ ${repo.label} registered in Knowledge Search.`);
    } catch (e) {
      console.warn('[CosmosWorkflow] addKnowledgeRoot failed', e);
      toast.error('Failed to add Knowledge Search root.');
    } finally {
      setBusyIds(prev => { const n = new Set(prev); n.delete(repo.id); return n; });
    }
  }, [api, busyIds, refreshAll]);

  // ── Remove single root ─────────────────────────────────────────────────────
  const removeKnowledgeRoot = useCallback(async (repo: CosmosRepo) => {
    const current  = loadRoots();
    const normRoot = normalizePath(repo.root);
    const folder   = normRoot.split('/').pop() ?? '';
    const updated  = current.filter(r =>
      normalizePath(r) !== normRoot && !(folder && normalizePath(r).endsWith(`/${folder}`))
    );
    if (updated.length === current.length) { toast.error('Root not found in registry.'); return; }
    saveRoots(updated);
    await refreshAll();
    toast.success(`Removed ${repo.label} from Knowledge Search.`);
  }, [refreshAll]);

  // ── Register all detected ──────────────────────────────────────────────────
  const registerAllMissing = useCallback(async () => {
    setBatchBusy(true);
    let added = 0;
    for (const repo of COSMOS_REPOS) {
      if (repoStates[repo.id]?.root === 'added')    continue;
      if (repoStates[repo.id]?.repo !== 'detected') continue;
      const existing = loadRoots();
      if (existing.some(r => normalizePath(r) === normalizePath(repo.root))) continue;
      saveRoots([...loadRoots(), repo.root]);
      added++;
    }
    await refreshAll();
    setBatchBusy(false);
    if (added > 0) toast.success(`✓ Registered ${added} repo${added > 1 ? 's' : ''} in Knowledge Search.`);
    else toast.error('No new detected repos to register. Clone missing repos first.');
  }, [repoStates, refreshAll]);

  // ── Open integration doc ───────────────────────────────────────────────────
  const openIntegrationDoc = useCallback(async (repo: CosmosRepo) => {
    if (!api) { toast.error('Electron API unavailable.'); return; }
    if (api.revealInFolder) {
      try { await api.revealInFolder(repo.doc); toast.success('Revealed in Explorer.'); return; }
      catch { /* fall through */ }
    }
    if (api.openExternal) {
      try {
        const r = await api.openExternal(repo.doc);
        if (r?.success) { toast.success('Opening integration doc…'); return; }
      } catch { /* fall through */ }
    }
    toast.error(`Could not open: ${repo.doc}`);
  }, [api]);

  // ── Inline search ──────────────────────────────────────────────────────────
  const runInlineSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearchBusy(true); setSearchError(''); setSearchResults([]);
    try {
      if (!api?.mlSearch) {
        setSearchError('Knowledge Search unavailable. Build the index in the Knowledge Search page first.');
        return;
      }
      const res = await api.mlSearch({ query: searchQuery.trim(), topK: 5, roots: loadRoots() });
      if (Array.isArray(res)) {
        setSearchResults(res);
        if (!res.length) setSearchError('No results. Ensure the index is built and repos are registered.');
      } else { setSearchError('Unexpected response from search engine.'); }
    } catch (e: any) { setSearchError(e?.message ?? 'Search failed.'); }
    finally { setSearchBusy(false); }
  }, [api, searchQuery]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const visibleRepos = useMemo(() => {
    if (filter === 'missing') return COSMOS_REPOS.filter(r =>
      repoStates[r.id]?.repo !== 'detected' || repoStates[r.id]?.root !== 'added');
    if (filter === 'ready')   return COSMOS_REPOS.filter(r =>
      repoStates[r.id]?.repo === 'detected' && repoStates[r.id]?.root === 'added');
    return COSMOS_REPOS;
  }, [filter, repoStates]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Zap className="w-5 h-5 text-emerald-300" />
            <h2 className="text-xl font-bold text-white">FO4 Automation Studio</h2>
            {healthScore !== null && (
              <span className={`text-sm font-semibold ${healthColor}`}>{healthScore}% healthy</span>
            )}
            {coreReposReady(repoStates) && (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-900/30 border border-emerald-500/30 text-emerald-300">
                <ShieldCheck className="w-3 h-3" /> Core Ready
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshAll} disabled={refreshing} title="Refresh all repo statuses"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-emerald-300 transition-colors disabled:opacity-60">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link to="/reference"
              className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors">
              Help
            </Link>
          </div>
        </div>
        <p className="text-sm text-slate-300">
          FO4 automation workspace for Cosmos integrations: detect local repos, register Knowledge
          Search roots, open integration docs, and validate indexable workflow coverage inside Mossy.
        </p>
        {healthScore !== null && (
          <div className="mt-3">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${
                healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`} style={{ width: `${healthScore}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Install / Verify panel */}
      <ToolsInstallVerifyPanel
        accentClassName="text-emerald-300"
        description="Cosmos Transfer2.5, Predict2.5, and Reason 2 are the three core AI models. All 8 repos are listed below — register each as a Knowledge Search root to enable local RAG queries from Mossy."
        verify={[
          'All 8 repos show "Repo detected" (green). Clone any marked amber using the git command on the card.',
          'All roots show "Root added" (green). Use "Register All Detected" to batch-add in one click.',
          'Build the Knowledge Search index and run a query for each core repo (use the inline validator below).',
          'Open the integration doc for each repo and confirm paths match your local clone.',
        ]}
        firstTestLoop={[
          'Register All Detected → open Knowledge Search → Build Index.',
          'Use the inline validator: search "Cosmos-Transfer2.5-2B", "cosmos_predict2", "cosmos_reason2".',
          'Save workflow notes in Memory Vault if results look correct.',
        ]}
        troubleshooting={[
          'Repo not detected → clone into external/nvidia-cosmos/<repo-name> using the clone command on each card.',
          'Knowledge Search unavailable → ensure you are running the Electron app, not the web build.',
          'Already registered error → root is already in the registry. Click Refresh to confirm the green status.',
        ]}
      />

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={registerAllMissing} disabled={batchBusy}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded-lg text-xs font-bold text-white disabled:opacity-60 transition-colors">
          {batchBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
          Register All Detected
        </button>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {(['all', 'missing', 'ready'] as FilterMode[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-colors ${
                filter === f
                  ? 'bg-emerald-800 text-emerald-200 border border-emerald-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}>
              {f}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 ml-auto">
          {visibleRepos.length} / {COSMOS_REPOS.length} repos shown
        </span>
      </div>

      {/* Inline search validator */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
        <button onClick={() => setSearchExpanded(v => !v)}
          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-800/40 transition-colors text-left">
          <Search className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-semibold text-white">Inline Knowledge Search Validator</span>
          <span className="ml-auto text-slate-500 text-xs hidden sm:block">Validate your index without leaving this page</span>
          {searchExpanded
            ? <ChevronDown  className="w-4 h-4 text-slate-500" />
            : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </button>

        {searchExpanded && (
          <div className="px-5 pb-5 space-y-3 border-t border-slate-800">
            <div className="flex gap-2 pt-3 flex-wrap sm:flex-nowrap">
              <input value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runInlineSearch()}
                placeholder='e.g. "Cosmos-Transfer2.5-2B" or "cosmos_reason2"'
                className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              <button onClick={runInlineSearch} disabled={searchBusy || !searchQuery.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-xs font-bold text-white disabled:opacity-60 transition-colors shrink-0">
                {searchBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Search
              </button>
              <button onClick={() => navigate('/knowledge')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-semibold text-slate-200 shrink-0">
                <ExternalLink className="w-3.5 h-3.5" /> Full Search
              </button>
            </div>

            {searchError && (
              <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-500/30 rounded text-sm text-amber-200">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{searchError}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((r, i) => (
                  <div key={i} className="bg-slate-950/60 border border-slate-800 rounded p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-emerald-300 truncate">{r.title}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">score {r.score.toFixed(3)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-1 truncate">{r.sourcePath}</div>
                    <p className="text-xs text-slate-300 line-clamp-2">{r.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Repo grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleRepos.map(repo => {
          const state: RepoState = repoStates[repo.id] ?? { repo: 'unknown', doc: 'unknown', root: 'absent' };
          const rootAdded      = isRootAdded(repo);
          const isBusy         = busyIds.has(repo.id);
          const cloneCmd       = `git clone ${repo.gitUrl} ${repo.cloneTarget}`;
          const cloneExpanded  = expandedClone === repo.id;

          const repoIcon: 'ok'|'warn'|'unknown' =
            state.repo === 'detected' ? 'ok' : state.repo === 'missing' ? 'warn' : 'unknown';
          const repoText =
            state.repo === 'detected' ? 'Repo detected' : state.repo === 'missing' ? 'Repo not detected' : 'Status unknown';

          const docIcon: 'ok'|'warn'|'unknown' =
            state.doc === 'found' ? 'ok' : state.doc === 'missing' ? 'warn' : 'unknown';
          const docText =
            state.doc === 'found' ? 'Doc present' : state.doc === 'missing' ? 'Doc missing' : 'Doc unknown';

          const cardBorder =
            state.repo === 'detected' && rootAdded ? 'border-emerald-800/60' :
            state.repo === 'missing'               ? 'border-amber-900/40'   : 'border-slate-800';

          return (
            <div key={repo.id}
              className={`bg-slate-900/60 border rounded-lg p-4 space-y-4 transition-colors ${cardBorder}`}>

              {/* Card header */}
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Zap className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                  <span className="text-sm font-semibold text-white">{repo.label}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${TIER_BADGE[repo.tier]}`}>
                    {repo.tier}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ~{repo.sizeMB >= 1000 ? `${(repo.sizeMB / 1000).toFixed(1)} GB` : `${repo.sizeMB} MB`}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{repo.summary}</p>
              </div>

              {/* Status grid */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-950/40 border border-slate-800 rounded p-2">
                  <div className="text-[10px] text-slate-500 mb-1">Repo Status</div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={repoIcon} />
                    <span className="text-slate-200 leading-tight">{repoText}</span>
                  </div>
                  <div className="mt-1 text-[9px] text-slate-600 break-all">{repo.root}</div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800 rounded p-2">
                  <div className="text-[10px] text-slate-500 mb-1">Knowledge Root</div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={rootAdded ? 'ok' : 'warn'} />
                    <span className="text-slate-200 leading-tight">{rootAdded ? 'Root added' : 'Root not added'}</span>
                  </div>
                  <div className="mt-1 text-[9px] text-slate-600 truncate">Stored in {ROOTS_KEY}</div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800 rounded p-2">
                  <div className="text-[10px] text-slate-500 mb-1">Integration Doc</div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={docIcon} />
                    <span className="text-slate-200 leading-tight">{docText}</span>
                  </div>
                  <div className="mt-1 text-[9px] text-slate-600 break-all">{repo.doc.split('/').pop()}</div>
                </div>
              </div>

              {/* Search hint */}
              <div className="flex items-center gap-2 text-[10px] flex-wrap">
                <span className="text-slate-500">Search hint:</span>
                <code className="bg-slate-950/60 border border-slate-700 rounded px-2 py-0.5 text-emerald-300">
                  {repo.searchHint}
                </code>
                <CopyBtn text={repo.searchHint} label="search hint" />
                <button onClick={() => { setSearchQuery(repo.searchHint); setSearchExpanded(true); }}
                  className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors">
                  Test now
                </button>
              </div>

              {/* Clone command (shown only when repo not detected) */}
              {state.repo !== 'detected' && (
                <div className="bg-slate-950/40 border border-slate-700 rounded overflow-hidden">
                  <button onClick={() => setExpandedClone(cloneExpanded ? null : repo.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-amber-300 hover:bg-slate-800/40 transition-colors text-left">
                    <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-semibold">Clone command</span>
                    {cloneExpanded
                      ? <ChevronDown  className="w-3 h-3 ml-auto" />
                      : <ChevronRight className="w-3 h-3 ml-auto" />}
                  </button>
                  {cloneExpanded && (
                    <div className="px-3 pb-3">
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded px-3 py-2">
                        <code className="text-[10px] text-emerald-300 flex-1 break-all">{cloneCmd}</code>
                        <CopyBtn text={cloneCmd} label="clone command" />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        Run from your Mossy project root. Requires Git and NVIDIA NGC access.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {!rootAdded ? (
                  <button onClick={() => addKnowledgeRoot(repo)} disabled={isBusy}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-xs font-semibold text-white disabled:opacity-60 transition-colors">
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                    {isBusy ? 'Adding…' : 'Add to Knowledge Search'}
                  </button>
                ) : (
                  <button onClick={() => removeKnowledgeRoot(repo)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 rounded text-xs font-semibold text-red-300 hover:text-red-200 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Remove Root
                  </button>
                )}

                <button onClick={() => openIntegrationDoc(repo)} disabled={state.doc === 'missing'}
                  title={state.doc === 'missing' ? 'Integration doc not found on disk' : 'Reveal integration doc'}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs font-semibold text-slate-200 disabled:opacity-40 transition-colors">
                  <FileText className="w-3.5 h-3.5" /> Open Doc
                </button>

                {state.repo === 'detected' && api?.revealInFolder && (
                  <button onClick={() => api.revealInFolder(repo.root)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs font-semibold text-slate-200 transition-colors">
                    <FolderOpen className="w-3.5 h-3.5" /> Reveal
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {visibleRepos.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">
          No repos match the &quot;{filter}&quot; filter.{' '}
          <button onClick={() => setFilter('all')} className="text-emerald-400 underline">Show all</button>
        </div>
      )}
    </div>
  );
};

export default CosmosWorkflow;
