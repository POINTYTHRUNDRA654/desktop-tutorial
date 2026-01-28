import React, { useEffect, useMemo, useState } from 'react';

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

export default function KnowledgeSearch(): JSX.Element {
  const api = (window as any).electron?.api || (window as any).electronAPI;

  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null);
  const [roots, setRoots] = useState<string[]>(() => loadRoots());

  const [buildBusy, setBuildBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [error, setError] = useState<string>('');

  const [ollamaModel, setOllamaModel] = useState('');
  const [answerBusy, setAnswerBusy] = useState(false);
  const [answer, setAnswer] = useState('');

  const desktopReady = !!api?.mlIndexStatus;

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
    setError('');
    setAnswer('');
    try {
      const resp = await api.mlIndexBuild(effectiveRoots.length ? { roots: effectiveRoots } : undefined);
      if (!resp?.ok) {
        setError(String(resp?.error || 'Failed to build index'));
      }
      await refreshStatus();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBuildBusy(false);
    }
  };

  const onSearch = async () => {
    if (!desktopReady) return;
    const q = query.trim();
    if (!q) return;

    setSearchBusy(true);
    setError('');
    setAnswer('');
    try {
      const resp = await api.mlIndexQuery({ query: q, topK: 8 });
      if (!resp?.ok) {
        setError(String(resp?.error || 'Search failed'));
        setResults([]);
      } else {
        setResults(resp.results || []);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSearchBusy(false);
    }
  };

  const onOpenResult = async (filePath: string) => {
    if (!api?.openExternal) return;
    await api.openExternal(filePath);
  };

  const onRevealResult = async (filePath: string) => {
    if (!api?.revealInFolder) return;
    await api.revealInFolder(filePath);
  };

  const onDraftAnswer = async () => {
    if (!desktopReady) return;
    if (!llmStatus?.ok) {
      setError('Ollama not detected. Start Ollama and try again.');
      return;
    }
    const model = ollamaModel.trim();
    if (!model) {
      setError('Pick an Ollama model first.');
      return;
    }
    const q = query.trim();
    if (!q) {
      setError('Enter a question first.');
      return;
    }

    setAnswerBusy(true);
    setError('');
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
        setError(String(resp?.error || 'Ollama generation failed'));
        return;
      }
      setAnswer(String(resp.text || ''));
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setAnswerBusy(false);
    }
  };

  if (!desktopReady) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-white mb-2">Knowledge Search</h2>
        <p className="text-slate-300 text-sm">
          This feature requires the desktop app (Electron) so Mossy can index your local files.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Knowledge Search</h2>
          <p className="text-slate-300 text-sm">Offline semantic search across your Markdown guides.</p>
        </div>
        <button
          onClick={onBuildIndex}
          disabled={buildBusy}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold"
        >
          {buildBusy ? 'Indexing…' : 'Build / Refresh Index'}
        </button>
      </div>

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

        {error ? <div className="text-xs text-red-300">{error}</div> : null}

        <div className="space-y-3">
          {results.map((r, idx) => (
            <div key={`${r.sourcePath}-${idx}`} className="bg-slate-950/40 border border-slate-800 rounded p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">Score: {r.score.toFixed(3)}</div>
                  <div className="text-sm font-semibold text-slate-100">{r.title}</div>
                  <div className="text-xs text-slate-400 truncate">{r.sourcePath}</div>
                </div>
                <div className="flex gap-2">
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

          {results.length === 0 ? <div className="text-xs text-slate-400">No results yet.</div> : null}
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-200 font-semibold">Optional: Draft answer with local Ollama</div>
          <button
            onClick={async () => setLlmStatus(await api.mlLlmStatus())}
            className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Check Ollama
          </button>
        </div>

        {llmStatus?.ok ? (
          <div className="text-xs text-emerald-300">Ollama detected ({llmStatus.models.length} model(s)).</div>
        ) : (
          <div className="text-xs text-slate-400">Ollama not detected: {llmStatus?.error || 'Unknown'} (start Ollama to enable)</div>
        )}

        <div className="flex items-center gap-2">
          <select
            value={ollamaModel}
            onChange={(e) => setOllamaModel(e.target.value)}
            disabled={!llmStatus?.ok}
            className="bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 outline-none"
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
            className="px-4 py-2 rounded bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-sm font-semibold"
          >
            {answerBusy ? 'Drafting…' : 'Draft Answer'}
          </button>
        </div>

        {answer ? (
          <pre className="text-xs text-slate-200 whitespace-pre-wrap bg-slate-950/40 border border-slate-800 rounded p-3">{answer}</pre>
        ) : null}
      </div>
    </div>
  );
}
