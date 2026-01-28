import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Folder, RefreshCw, Trash2, Eye } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import type { DedupeGroup, DedupeProgress, DedupeScanResult } from '../../electron/types';

const humanBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** idx;
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const defaultExtensions = ['.dds', '.nif', '.png', '.tga', '.jpg', '.jpeg'];

type TrashResult = {
  path: string;
  ok: boolean;
  error?: string;
};

const DuplicateFinder: React.FC = () => {
  const api = (window as any).electron?.api || (window as any).electronAPI;

  const [roots, setRoots] = useState<string[]>([]);
  const [extensions, setExtensions] = useState<string[]>(defaultExtensions);
  const [minSizeBytes, setMinSizeBytes] = useState<number>(1);

  const [scanId, setScanId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<DedupeProgress | null>(null);
  const [result, setResult] = useState<DedupeScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const scanIdRef = useRef<string | null>(null);
  scanIdRef.current = scanId;

  useEffect(() => {
    if (!api?.onDedupeProgress) return;

    api.onDedupeProgress((p: DedupeProgress) => {
      if (!p) return;

      // If we haven't received the scanId yet (dedupeScan hasn't returned), adopt it.
      if (!scanIdRef.current && p.scanId) {
        setScanId(p.scanId);
      }

      // If we have an active scanId, ignore unrelated events.
      if (scanIdRef.current && p.scanId && p.scanId !== scanIdRef.current) return;

      setProgress(p);

      if (p.stage === 'done' || p.stage === 'canceled' || p.stage === 'error') {
        setIsScanning(false);
      }

      if (p.stage === 'error' && p.message) {
        setError(p.message);
      }
    });
  }, [api]);

  const canUseDesktopFeatures = !!api?.pickDedupeFolders && !!api?.dedupeScan;

  const totalGroups = result?.groups?.length ?? 0;
  const totalDuplicateFiles = useMemo(() => {
    const groups = result?.groups ?? [];
    return groups.reduce((sum, g) => sum + Math.max(0, g.files.length - 1), 0);
  }, [result]);

  const estimatedSavings = useMemo(() => {
    const groups = result?.groups ?? [];
    return groups.reduce((sum, g) => sum + g.size * Math.max(0, g.files.length - 1), 0);
  }, [result]);

  const pickFolders = async () => {
    if (!api?.pickDedupeFolders) return;
    setError(null);
    try {
      const picked: string[] = await api.pickDedupeFolders();
      if (picked?.length) setRoots(picked);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const startScan = async () => {
    if (!api?.dedupeScan) return;
    setError(null);
    setResult(null);
    setProgress(null);
    setExpanded({});
    setSelected({});
    setScanId(null);

    if (!roots.length) {
      setError('Pick at least one folder.');
      return;
    }

    setIsScanning(true);
    try {
      const scanResult: DedupeScanResult = await api.dedupeScan({
        roots,
        extensions,
        minSizeBytes,
      });
      setScanId(scanResult.scanId);
      setResult(scanResult);
      setIsScanning(false);
    } catch (e: any) {
      setIsScanning(false);
      setError(String(e?.message || e));
    }
  };

  const cancelScan = async () => {
    if (!api?.dedupeCancel || !scanId) return;
    try {
      await api.dedupeCancel(scanId);
    } catch {
      // ignore
    }
  };

  const toggleExtension = (ext: string) => {
    setExtensions((prev) => {
      const next = new Set(prev);
      if (next.has(ext)) next.delete(ext);
      else next.add(ext);
      return Array.from(next);
    });
  };

  const toggleGroup = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectKeepFirst = () => {
    const groups = result?.groups ?? [];
    const next: Record<string, boolean> = {};
    for (const group of groups) {
      const sorted = [...group.files].sort((a, b) => a.localeCompare(b));
      for (let i = 1; i < sorted.length; i++) {
        next[sorted[i]] = true;
      }
    }
    setSelected(next);
  };

  const clearSelection = () => setSelected({});

  const selectedPaths = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([k]) => k), [selected]);

  const reveal = async (filePath: string) => {
    try {
      await api?.revealInFolder?.(filePath);
    } catch {
      // ignore
    }
  };

  const trashSelected = async () => {
    if (!api?.dedupeTrash) return;
    if (!scanId) {
      setError('Missing scan id. Run a scan first.');
      return;
    }
    if (!selectedPaths.length) return;

    const ok = window.confirm(
      `Move ${selectedPaths.length} file(s) to the Recycle Bin?\n\nTip: This is reversible from Recycle Bin.`,
    );
    if (!ok) return;

    setError(null);
    try {
      const resp: { ok: boolean; results: TrashResult[] } = await api.dedupeTrash({ scanId, paths: selectedPaths });

      const removed = new Set(resp.results.filter((r) => r.ok).map((r) => r.path));
      setSelected((prev) => {
        const next = { ...prev };
        for (const p of removed) delete next[p];
        return next;
      });

      setResult((prev) => {
        if (!prev) return prev;
        const nextGroups: DedupeGroup[] = prev.groups
          .map((g) => ({ ...g, files: g.files.filter((p) => !removed.has(p)) }))
          .filter((g) => g.files.length >= 2);
        return { ...prev, groups: nextGroups };
      });

      if (!resp.ok) {
        const firstError = resp.results.find((r) => !r.ok)?.error;
        if (firstError) setError(firstError);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black italic text-white tracking-tight">Duplicate Finder</h1>
        <p className="text-slate-300 text-sm mt-1">
          Scan folders for byte-identical duplicates (textures/meshes), preview groups, then move selected duplicates to the Recycle Bin.
        </p>
      </div>

      <ToolsInstallVerifyPanel
        title="🧰 Tools / Install / Verify (No Guesswork)"
        description="This feature runs locally via the Desktop app. No external tools required."
        tools={[]}
        verify={[
          'Pick one or more folders that contain your textures/meshes.',
          'Run Scan and confirm duplicates appear as groups.',
          'Use Recycle Bin moves first (never permanent delete).',
        ]}
        troubleshooting={[
          'If you are in Web Mode, this page needs the Desktop Bridge (Electron) to access folders.',
          'Large libraries can take time: SHA-256 hashing is thorough but disk-heavy.',
        ]}
      />

      {!canUseDesktopFeatures ? (
        <div className="bg-red-900/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-300 mt-0.5" />
          <div className="text-sm text-red-200">
            Desktop-only feature: folder scanning requires Electron. You’re currently in Web Mode.
          </div>
        </div>
      ) : null}

      <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm font-bold text-slate-100">Scan Scope</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void pickFolders()}
              disabled={!canUseDesktopFeatures || isScanning}
              className="px-3 py-2 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Folder className="w-4 h-4" />
              Pick folder(s)
            </button>
            <button
              type="button"
              onClick={() => void startScan()}
              disabled={!canUseDesktopFeatures || isScanning || !roots.length}
              className="px-3 py-2 text-xs rounded bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-100 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              Scan
            </button>
            <button
              type="button"
              onClick={() => void cancelScan()}
              disabled={!canUseDesktopFeatures || !isScanning || !scanId}
              className="px-3 py-2 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-1">
          <div>
            <span className="text-slate-400">Folders:</span>{' '}
            {roots.length ? roots.join(' • ') : 'None selected'}
          </div>
          <div>
            <span className="text-slate-400">Min size:</span>{' '}
            <input
              className="ml-2 w-28 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-100"
              type="number"
              min={0}
              step={1}
              value={minSizeBytes}
              onChange={(e) => setMinSizeBytes(Number(e.target.value || 0))}
              disabled={isScanning}
              title="Minimum file size in bytes"
            />
            <span className="ml-2 text-slate-500">bytes</span>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-200 mb-2">Extensions</div>
          <div className="flex flex-wrap gap-2">
            {defaultExtensions.map((ext) => {
              const active = extensions.includes(ext);
              return (
                <button
                  key={ext}
                  type="button"
                  onClick={() => toggleExtension(ext)}
                  disabled={isScanning}
                  className={`px-2 py-1 text-xs rounded border transition-colors disabled:opacity-50 ${
                    active
                      ? 'bg-sky-900/30 border-sky-500/30 text-sky-100'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white'
                  }`}
                >
                  {ext}
                </button>
              );
            })}
          </div>
        </div>

        {progress ? (
          <div className="text-xs text-slate-300">
            <span className="text-slate-400">Progress:</span> {progress.stage}
            {Number.isFinite(progress.current) && Number.isFinite(progress.total) ? ` (${progress.current}/${progress.total})` : ''}
            {progress.message ? ` — ${progress.message}` : ''}
          </div>
        ) : null}

        {error ? (
          <div className="text-xs text-red-300 bg-red-900/10 border border-red-500/20 rounded p-2">{error}</div>
        ) : null}
      </div>

      {result ? (
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm font-bold text-slate-100">Results</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectKeepFirst}
                disabled={!totalGroups}
                className="px-3 py-2 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 disabled:opacity-50"
              >
                Select duplicates (keep first)
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-2 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={() => void trashSelected()}
                disabled={!selectedPaths.length}
                className="px-3 py-2 text-xs rounded bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-100 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Move to Recycle Bin ({selectedPaths.length})
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-300">
            <div>
              <span className="text-slate-400">Scanned:</span> {result.totalFilesScanned} file(s) • {humanBytes(result.totalBytesScanned)}
            </div>
            <div>
              <span className="text-slate-400">Duplicate groups:</span> {totalGroups} • <span className="text-slate-400">Duplicate files:</span> {totalDuplicateFiles}
            </div>
            <div>
              <span className="text-slate-400">Estimated savings:</span> {humanBytes(estimatedSavings)}
            </div>
          </div>

          {!totalGroups ? (
            <div className="text-sm text-slate-300">No duplicates found in the current scope.</div>
          ) : (
            <div className="space-y-3">
              {result.groups.slice(0, 100).map((g) => {
                const key = `${g.size}:${g.hash}`;
                const isOpen = !!expanded[key];
                const savings = g.size * (g.files.length - 1);

                return (
                  <div key={key} className="border border-slate-700 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 bg-slate-900/70 hover:bg-slate-900/90 flex items-center justify-between"
                      onClick={() => toggleGroup(key)}
                    >
                      <div className="text-xs text-slate-200">
                        <span className="font-bold">{g.files.length} files</span> • {humanBytes(g.size)} each • saves {humanBytes(savings)}
                      </div>
                      <div className="text-[10px] text-slate-500">{isOpen ? 'Hide' : 'Show'}</div>
                    </button>

                    {isOpen ? (
                      <div className="p-3 bg-slate-950/40">
                        <ul className="space-y-2">
                          {g.files.map((p) => (
                            <li key={p} className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={!!selected[p]}
                                onChange={(e) => setSelected((prev) => ({ ...prev, [p]: e.target.checked }))}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs text-slate-200 break-all">{p}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => void reveal(p)}
                                className="shrink-0 px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 inline-flex items-center gap-1"
                                title="Reveal in Explorer"
                              >
                                <Eye className="w-3 h-3" />
                                Reveal
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {result.groups.length > 100 ? (
                <div className="text-xs text-slate-400">
                  Showing first 100 groups. Narrow your scope (folders/extensions/min size) for huge libraries.
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default DuplicateFinder;
