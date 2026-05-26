import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Copy, Check } from 'lucide-react';

type IndexStatus =
  | { ok: true; indexPath: string; indexedChunks: number; indexedSources: number; model: string; createdAt: string }
  | { ok: false; indexPath: string; reason: string };

type QueryResult = { score: number; sourcePath: string; title: string; content: string };

type LlmStatus =
  | { ok: true; provider: 'ollama'; baseUrl: string; models: string[] }
  | { ok: false; provider: 'ollama'; baseUrl: string; error: string };

const ROOTS_KEY = 'mossy_knowledge_roots_v1';

function loadRoots(): string[] {
  try {
    const raw = localStorage.getItem(ROOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string' && x.trim().length > 0);
    return [];
  } catch {
    return [];
  }
}

function saveRoots(roots: string[]) {
  localStorage.setItem(ROOTS_KEY, JSON.stringify(roots));
}

type KnowledgeSearchProps = {
  embedded?: boolean;
};

export default function KnowledgeSearch({ embedded = false }: KnowledgeSearchProps): JSX.Element {
  const api = (window as any).electron?.api || (window as any).electronAPI;

  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null);
  const [roots, setRoots] = useState<string[]>(() => loadRoots());

  const [buildBusy, setBuildBusy] = useState(false);
  const [buildError, setBuildError] = useState<string>('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string>('');
  const [keywordMode, setKeywordMode] = useState(false);

  const [ollamaModel, setOllamaModel] = useState('');
  const [answerBusy, setAnswerBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  const [ollamaCheckBusy, setOllamaCheckBusy] = useState(false);
  const [copiedResultIdx, setCopiedResultIdx] = useState<number | null>(null);

  const desktopReady = !!api?.mlIndexStatus;

  const copyResult = useCallback((content: string, idx: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedResultIdx(idx);
      setTimeout(() => setCopiedResultIdx(null), 1500);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedResultIdx(idx);
      setTimeout(() => setCopiedResultIdx(null), 1500);
    });
  }, []);

  const effectiveRoots = useMemo(() => roots.filter(Boolean), [roots]);

  useEffect(() => {
    if (!desktopReady) return;

    (async () => {
      try {
        const s = await api.mlIndexStatus();
        setIndexStatus(s);
      } catch (e: any) {
        setIndexStatus({ ok: false, indexPath: '', reason: String(e?.message || e) });
      }

      try {
        const ls = await api.mlLlmStatus();
        setLlmStatus(ls);
        if (ls?.ok && ls.models?.length && !ollamaModel) {
          setOllamaModel(ls.models[0]);
        }
      } catch (e: any) {
        setLlmStatus({ ok: false, provider: 'ollama', baseUrl: 'http://127.0.0.1:11434', error: String(e?.message || e) });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktopReady]);

  const refreshStatus = async () => {
    if (!desktopReady) return;
    const s = await api.mlIndexStatus();
    setIndexStatus(s);
  };

  const onAddRoot = async () => {
    if (!api?.pickDirectory) return;
    const selected = await api.pickDirectory('Select folder to index');
    if (!selected) return;
    const next = Array.from(new Set([...effectiveRoots, selected]));
    setRoots(next);
    saveRoots(next);
  };

  const onRemoveRoot = (root: string) => {
    const next = effectiveRoots.filter((r) => r !== root);
    setRoots(next);
    saveRoots(next);
  };

  const onBuildIndex = async () => {
    if (!desktopReady) return;
    setBuildBusy(true);
    setBuildError('');
    setAnswer('');
    try {
      const resp = await api.mlIndexBuild(effectiveRoots.length ? { roots: effectiveRoots } : undefined);
      if (!resp?.ok) {
        const raw = String(resp?.error || 'Failed to build index');
        const friendly = raw.toLowerCase().includes('fetch') || raw.toLowerCase().includes('network')
          ? 'Could not download the AI embedding model (no internet access). The semantic index requires a one-time model download. Keyword search still works without the index.'
          : raw;
        setBuildError(friendly);
      } else {
        toast.success('Index built successfully!');
      }
      await refreshStatus();
    } catch (e: any) {
      const raw = String(e?.message || e);
      const friendly = raw.toLowerCase().includes('fetch') || raw.toLowerCase().includes('network')
        ? 'Could not download the AI embedding model (no internet access). Keyword search still works without the index.'
        : raw;
      setBuildError(friendly);
    } finally {
      setBuildBusy(false);
    }
  };

  const onSearch = async () => {
    if (!desktopReady) return;
    const q = query.trim();
    if (!q) {
      toast('Type a question or keyword first.', { icon: '🔍' });
      return;
    }

    setSearchBusy(true);
    setSearchError('');
    setKeywordMode(false);
    setAnswer('');
    try {
      const resp = await api.mlIndexQuery({ query: q, topK: 8 });
      if (!resp?.ok) {
        setSearchError(String(resp?.error || 'Search failed'));
        setResults([]);
      } else {
        setResults(resp.results || []);
        setKeywordMode(!!(resp as any).keywordMode);
      }
    } catch (e: any) {
      setSearchError(String(e?.message || e));
    } finally {
      setSearchBusy(false);
    }
  };

  const onOpenResult = async (filePath: string) => {
    try {
      if (!api?.openExternal) {
        toast.error('Desktop API not available');
        return;
      }
      const result = await api.openExternal(filePath);
      if (!result?.success) {
        toast.error(result?.error || 'Failed to open file');
      }
    } catch (e: any) {
      toast.error(`Failed to open file: ${e?.message || 'Unknown error'}`);
    }
  };

  const onRevealResult = async (filePath: string) => {
    try {
      if (!api?.revealInFolder) {
        toast.error('Desktop API not available');
        return;
      }
      const result = await api.revealInFolder(filePath);
      if (!result?.success) {
        toast.error(result?.error || 'Failed to reveal file');
      }
    } catch (e: any) {
      toast.error(`Failed to reveal file: ${e?.message || 'Unknown error'}`);
    }
  };

  const onDraftAnswer = async () => {
    if (!desktopReady) return;
    if (!llmStatus?.ok) {
      toast.error('Ollama is not running. Start Ollama and click "Check Ollama" first.');
      return;
    }
    const model = ollamaModel.trim();
    if (!model) {
      toast.error('Pick an Ollama model first.');
      return;
    }
    const q = query.trim();
    if (!q) {
      toast('Type a question first.', { icon: '🔍' });
      return;
    }

    setAnswerBusy(true);
    try {
      const excerpts = (results || []).slice(0, 4).map((r, i) => {
        const clipped = r.content.length > 1200 ? `${r.content.slice(0, 1200)}\n...` : r.content;
        return `[#${i + 1}] ${r.sourcePath}\n${clipped}`;
      });

      const prompt = [
        'You are Mossy, an offline Fallout 4 modding assistant.',
        'Answer the user question using ONLY the provided excerpts.',
        'If the excerpts do not contain the answer, say what is missing and suggest what to search for.',
        '',
        `Question: ${q}`,
        '',
        'Excerpts:',
        excerpts.length ? excerpts.join('\n\n') : '(none retrieved)',
        '',
        'Answer:',
      ].join('\n');

      const resp = await api.mlLlmGenerate({ provider: 'ollama', model, prompt });
      if (!resp?.ok) {
        toast.error(String(resp?.error || 'Ollama generation failed'));
        return;
      }
      setAnswer(String(resp.text || ''));
    } catch (e: any) {
      toast.error(String(e?.message || e));
    } finally {
      setAnswerBusy(false);
    }
  };

  const containerClassName = embedded ? 'p-4 space-y-6' : 'p-6 space-y-6';

  if (!desktopReady) {
    return (
      <div className={containerClassName}>
        <h2 className="text-xl font-bold text-white mb-2">Knowledge Search</h2>
        <p className="text-slate-300 text-sm">
          This feature requires the desktop app (Electron) so Mossy can index your local files.
        </p>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Knowledge Search</h2>
          <p className="text-slate-300 text-sm">Offline search across your Markdown guides. Keyword search works immediately; build the index for AI-powered results.</p>
        </div>
        <div className="flex items-center gap-2">
          {!embedded && (
            <Link
              to="/reference"
              className="px-3 py-2 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-200 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
            >
              Help
            </Link>
          )}
          <button
            onClick={onBuildIndex}
            disabled={buildBusy}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold"
            title="Build semantic index for AI-powered search (requires internet for first-time model download)"
          >
            {buildBusy ? 'Indexing…' : 'Build / Refresh Index'}
          </button>
        </div>
      </div>

      {buildError && (
        <div className="text-xs text-amber-300 bg-amber-900/20 border border-amber-700/40 rounded px-3 py-2">
          ⚠️ {buildError}
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-200 font-semibold">Index status</div>
          <button
            onClick={refreshStatus}
            className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Refresh
          </button>
        </div>

        <div className="text-xs text-slate-300">
          {indexStatus?.ok
            ? `Ready: ${indexStatus.indexedChunks} chunks from ${indexStatus.indexedSources} files (model: ${indexStatus.model})`
            : `Not ready: ${indexStatus?.reason || 'Unknown'}`}
        </div>

        <div className="pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-200 font-semibold">Folders to index (optional)</div>
            <button
              onClick={onAddRoot}
              className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Add folder…
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {effectiveRoots.length === 0 ? (
              <div className="text-xs text-slate-400">None selected (Mossy will index bundled docs + app folders).</div>
            ) : (
              effectiveRoots.map((r) => (
                <div key={r} className="flex items-center justify-between gap-3 bg-slate-950/40 border border-slate-800 rounded px-3 py-2">
                  <div className="text-xs text-slate-200 truncate">{r}</div>
                  <button
                    onClick={() => onRemoveRoot(r)}
                    className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="text-sm text-slate-200 font-semibold">Search</div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Ask something like: 'How do I set up Blender export settings for FO4?'"
            className="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 outline-none"
          />
          <button
            onClick={onSearch}
            disabled={searchBusy}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200 text-sm font-semibold"
          >
            {searchBusy ? 'Searching…' : 'Search'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {keywordMode && results.length > 0 && (
            <div className="text-xs text-amber-300">
              💡 Keyword search — build the index for AI-ranked results.
            </div>
          )}
          {results.length > 0 && !searchBusy && (
            <span className="ml-auto text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {searchError ? <div className="text-xs text-red-300">{searchError}</div> : null}

        <div className="space-y-3">
          {results.map((r, idx) => (
            <div key={`${r.sourcePath}-${idx}`} className="bg-slate-950/40 border border-slate-800 rounded p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">Score: {r.score.toFixed(3)}</div>
                  <div className="text-sm font-semibold text-slate-100">{r.title}</div>
                  <div className="text-xs text-slate-400 truncate">{r.sourcePath}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => copyResult(r.content, idx)}
                    className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
                    title="Copy result content"
                  >
                    {copiedResultIdx === idx
                      ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</>
                      : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                  <button
                    onClick={() => onOpenResult(r.sourcePath)}
                    className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => onRevealResult(r.sourcePath)}
                    className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    Reveal
                  </button>
                </div>
              </div>
              <pre className="mt-2 text-xs text-slate-200 whitespace-pre-wrap max-h-56 overflow-auto">{r.content}</pre>
            </div>
          ))}

          {results.length === 0 && !searchError && !searchBusy
            ? <div className="text-xs text-slate-400">No results yet. Type a question and click Search.</div>
            : null}
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-200 font-semibold">Optional: Draft answer with local Ollama</div>
          <button
            onClick={async () => {
              setOllamaCheckBusy(true);
              try {
                const ls = await api.mlLlmStatus();
                setLlmStatus(ls);
                if (ls?.ok) {
                  toast.success(`Ollama connected — ${ls.models?.length ?? 0} model(s) available`);
                  if (ls.models?.length && !ollamaModel) setOllamaModel(ls.models[0]);
                } else {
                  toast('Ollama not detected. Make sure Ollama is installed and running.', { icon: '⚠️' });
                }
              } catch (e: any) {
                toast.error(`Could not reach Ollama: ${e?.message || e}`);
              } finally {
                setOllamaCheckBusy(false);
              }
            }}
            disabled={ollamaCheckBusy}
            className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200"
          >
            {ollamaCheckBusy ? 'Checking…' : 'Check Ollama'}
          </button>
        </div>

        {llmStatus?.ok ? (
          <div className="text-xs text-emerald-300">✅ Ollama connected — {llmStatus.models.length} model(s) available.</div>
        ) : (
          <div className="text-xs text-slate-400">
            Ollama not detected — <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">install Ollama</a> and start it, then click Check Ollama.
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={ollamaModel}
            onChange={(e) => setOllamaModel(e.target.value)}
            disabled={!llmStatus?.ok}
            className="bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 outline-none disabled:opacity-50"
          >
            {(llmStatus?.ok ? llmStatus.models : []).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={onDraftAnswer}
            disabled={!llmStatus?.ok || answerBusy}
            title={!llmStatus?.ok ? 'Start Ollama and click "Check Ollama" to enable this' : undefined}
            className="px-4 py-2 rounded bg-purple-700 hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold"
          >
            {answerBusy ? 'Drafting…' : 'Draft Answer'}
          </button>
          {!llmStatus?.ok && (
            <span className="text-xs text-slate-500">Start Ollama to enable</span>
          )}
        </div>

        {answer ? (
          <pre className="text-xs text-slate-200 whitespace-pre-wrap bg-slate-950/40 border border-slate-800 rounded p-3">{answer}</pre>
        ) : null}
      </div>
    </div>
  );
}
