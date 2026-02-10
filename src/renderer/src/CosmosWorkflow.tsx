import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Database, Zap } from 'lucide-react';
import { openExternal } from './utils/openExternal';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

const ROOTS_KEY = 'mossy_knowledge_roots_v1';
const COSMOS_REPOS = [
  {
    id: 'transfer',
    label: 'Cosmos Transfer2.5',
    root: 'external/nvidia-cosmos/cosmos-transfer2.5',
    doc: 'resources/public/knowledge/COSMOS_TRANSFER2_5_INTEGRATION.md',
    searchHint: 'Cosmos-Transfer2.5-2B',
    summary: 'Multi-controlnet world foundation model for video generation.',
  },
  {
    id: 'predict',
    label: 'Cosmos Predict2.5',
    root: 'external/nvidia-cosmos/cosmos-predict2.5',
    doc: 'resources/public/knowledge/COSMOS_PREDICT2_5_INTEGRATION.md',
    searchHint: 'cosmos_predict2',
    summary: 'Prediction-focused stack with inference and post-training workflows.',
  },
  {
    id: 'cookbook',
    label: 'Cosmos Cookbook',
    root: 'external/nvidia-cosmos/cosmos-cookbook',
    doc: 'resources/public/knowledge/COSMOS_COOKBOOK_INTEGRATION.md',
    searchHint: 'recipes',
    summary: 'Guides, recipes, and reference material for Cosmos workflows.',
  },
  {
    id: 'rl',
    label: 'Cosmos RL',
    root: 'external/nvidia-cosmos/cosmos-rl',
    doc: 'resources/public/knowledge/COSMOS_RL_INTEGRATION.md',
    searchHint: 'rollout',
    summary: 'Reinforcement learning tooling with configs, rollouts, and training patterns.',
  },
  {
    id: 'dependencies',
    label: 'Cosmos Dependencies',
    root: 'external/nvidia-cosmos/cosmos-dependencies',
    doc: 'resources/public/knowledge/COSMOS_DEPENDENCIES_INTEGRATION.md',
    searchHint: 'dependencies',
    summary: 'Versioned dependency manifests for Cosmos environments.',
  },
  {
    id: 'curate',
    label: 'Cosmos Curate',
    root: 'external/nvidia-cosmos/cosmos-curate',
    doc: 'resources/public/knowledge/COSMOS_CURATE_INTEGRATION.md',
    searchHint: 'curator',
    summary: 'Data curation and evaluation tooling for Cosmos pipelines.',
  },
  {
    id: 'xenna',
    label: 'Cosmos Xenna',
    root: 'external/nvidia-cosmos/cosmos-xenna',
    doc: 'resources/public/knowledge/COSMOS_XENNA_INTEGRATION.md',
    searchHint: 'xenna',
    summary: 'Core libraries, CLI tooling, and examples for Cosmos workflows.',
  },
];

const CosmosWorkflow: React.FC = () => {
  const [rootStatus, setRootStatus] = useState<Record<string, boolean | null>>({});
  const [roots, setRoots] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const hasRoot = useMemo(() => new Set(roots), [roots]);

  const refreshRoots = () => {
    try {
      const raw = localStorage.getItem(ROOTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setRoots(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRoots([]);
    }
  };

  const refreshRootStatus = async () => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (!api?.fsStat) {
      const empty: Record<string, boolean | null> = {};
      COSMOS_REPOS.forEach(repo => {
        empty[repo.id] = null;
      });
      setRootStatus(empty);
      return;
    }

    try {
      const next: Record<string, boolean | null> = {};
      for (const repo of COSMOS_REPOS) {
        try {
          const status = await api.fsStat(repo.root);
          next[repo.id] = Boolean(status?.exists && status?.isDirectory);
        } catch {
          next[repo.id] = null;
        }
      }
      setRootStatus(next);
    } catch {
      const empty: Record<string, boolean | null> = {};
      COSMOS_REPOS.forEach(repo => {
        empty[repo.id] = null;
      });
      setRootStatus(empty);
    }
  };

  useEffect(() => {
    refreshRoots();
    refreshRootStatus().catch(() => {});
  }, []);

  const addKnowledgeRoot = async (repo: typeof COSMOS_REPOS[number]) => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    setBusyId(repo.id);

    try {
      let target = repo.root;
      if (api?.fsStat) {
        const status = await api.fsStat(repo.root);
        if (!status?.exists || !status?.isDirectory) {
          if (api?.pickDirectory) {
            const picked = await api.pickDirectory(`Select ${repo.label} folder`);
            if (!picked) return;
            target = String(picked);
          } else {
            alert(`${repo.label} folder not found. Add a root manually in Knowledge Search.`);
            return;
          }
        }
      }

      const raw = localStorage.getItem(ROOTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const existing = Array.isArray(parsed) ? parsed : [];
      if (existing.includes(target)) {
        alert(`${repo.label} is already in Knowledge Search roots.`);
        return;
      }

      localStorage.setItem(ROOTS_KEY, JSON.stringify([...existing, target]));
      refreshRoots();
      alert(`Added ${repo.label} to Knowledge Search roots.`);
    } catch (e) {
      console.warn('[CosmosWorkflow] Failed to add knowledge root', e);
      alert('Failed to add Knowledge Search root.');
    } finally {
      setBusyId(null);
    }
  };

  const openIntegrationDoc = async (docPath: string) => {
    await openExternal(docPath);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-emerald-300" />
            <h2 className="text-xl font-bold text-white">Cosmos Workflow Hub</h2>
          </div>
          <Link
            to="/reference"
            className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
            title="Open help"
          >
            Help
          </Link>
        </div>
        <p className="text-sm text-slate-300">
          Local integration page for Cosmos Transfer2.5 and Predict2.5. Use this to wire documentation into Knowledge Search
          and keep the workflow traceable inside Mossy.
        </p>
      </div>

      <ToolsInstallVerifyPanel
        accentClassName="text-emerald-300"
        description="Cosmos Transfer2.5 and Predict2.5 are integrated as local repos and indexed knowledge sources. Use the controls below to connect them to Mossy."
        verify={[
          'Add each repo to Knowledge Search roots and confirm the status turns green.',
          'Build the Knowledge Search index and run a query for each Cosmos repo.',
          'Open the integration docs and confirm they match your local repo paths.'
        ]}
        firstTestLoop={[
          'Add roots → open Knowledge Search → Build Index.',
          'Search for: "Cosmos-Transfer2.5-2B" and "cosmos_predict2".',
          'Save any workflow notes in Memory Vault if needed.'
        ]}
        troubleshooting={[
          'If the repo path is missing, re-clone into external/nvidia-cosmos/cosmos-transfer2.5 or cosmos-predict2.5.',
          'If Knowledge Search is unavailable, ensure you are running the Electron app.'
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {COSMOS_REPOS.map((repo) => {
          const exists = rootStatus[repo.id];
          const isRootAdded = hasRoot.has(repo.root);
          const isBusy = busyId === repo.id;

          return (
            <div key={repo.id} className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-emerald-300" />
                  <div className="text-sm font-semibold text-white">{repo.label}</div>
                </div>
                <div className="text-xs text-slate-400">{repo.summary}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950/40 border border-slate-800 rounded p-2">
                  <div className="text-[10px] text-slate-400 mb-1">Repo Status</div>
                  <div className="flex items-center gap-2 text-sm">
                    {exists ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="text-slate-200">
                      {exists ? 'Repo detected' : 'Repo not detected'}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">{repo.root}</div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800 rounded p-2">
                  <div className="text-[10px] text-slate-400 mb-1">Knowledge Roots</div>
                  <div className="flex items-center gap-2 text-sm">
                    {isRootAdded ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="text-slate-200">
                      {isRootAdded ? 'Root added' : 'Root not added'}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">Stored in {ROOTS_KEY}</div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800 rounded p-2">
                  <div className="text-[10px] text-slate-400 mb-1">Integration Doc</div>
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="w-4 h-4 text-cyan-300" />
                    <span className="text-slate-200">Local knowledge entry</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">{repo.doc}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => addKnowledgeRoot(repo)}
                  disabled={isBusy}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-xs font-semibold text-white disabled:opacity-60"
                >
                  {isBusy ? 'Adding…' : 'Add to Knowledge Search'}
                </button>
                <button
                  onClick={() => openIntegrationDoc(repo.doc)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs font-semibold text-slate-200"
                >
                  Open Integration Doc
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CosmosWorkflow;
