import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Copy,
  ArrowDownToLine,
  Upload,
  AlertTriangle,
  Clock,
  X,
} from 'lucide-react';

type StepType = 'runTool' | 'openProgram' | 'openExternal' | 'revealInFolder';

type RunnerStep = {
  id: string;
  type: StepType;
  label: string;
  cmd?: string;
  args?: string;
  cwd?: string;
  target?: string;
};

type RunnerWorkflow = {
  id: string;
  name: string;
  description?: string;
  steps: RunnerStep[];
  createdAt: string;
  updatedAt: string;
};

type LogLevel = 'info' | 'warn' | 'error';

type RunnerLog = {
  at: string;
  level: LogLevel;
  message: string;
};

type RunnerRun = {
  id: string;
  workflowId: string;
  workflowName: string;
  startedAt: string;
  endedAt: string;
  success: boolean;
  logs: RunnerLog[];
};

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getElectronApi = (): any => (window as any).electron?.api || (window as any).electronAPI;

const downloadTextFallback = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const defaultWorkflow = (): RunnerWorkflow => {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: 'New Workflow',
    description: '',
    steps: [
      {
        id: newId(),
        type: 'runTool',
        label: 'Example: Print working directory',
        cmd: 'cmd',
        args: '/c cd',
        cwd: '',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeWorkflows = (value: unknown): RunnerWorkflow[] => {
  if (!Array.isArray(value)) return [];
  const out: RunnerWorkflow[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const w = item as any;
    if (typeof w.id !== 'string' || typeof w.name !== 'string' || !Array.isArray(w.steps)) continue;

    out.push({
      id: w.id,
      name: w.name,
      description: typeof w.description === 'string' ? w.description : '',
      steps: w.steps
        .filter((s: any) => s && typeof s === 'object')
        .map((s: any) => ({
          id: typeof s.id === 'string' ? s.id : newId(),
          type: (['runTool', 'openProgram', 'openExternal', 'revealInFolder'] as const).includes(s.type)
            ? (s.type as StepType)
            : 'runTool',
          label: typeof s.label === 'string' ? s.label : 'Step',
          cmd: typeof s.cmd === 'string' ? s.cmd : '',
          args: typeof s.args === 'string' ? s.args : '',
          cwd: typeof s.cwd === 'string' ? s.cwd : '',
          target: typeof s.target === 'string' ? s.target : '',
        })),
      createdAt: typeof w.createdAt === 'string' ? w.createdAt : new Date().toISOString(),
      updatedAt: typeof w.updatedAt === 'string' ? w.updatedAt : new Date().toISOString(),
    });
  }
  return out;
};

const normalizeRuns = (value: unknown): RunnerRun[] => {
  if (!Array.isArray(value)) return [];
  const out: RunnerRun[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const r = item as any;
    if (
      typeof r.id !== 'string' ||
      typeof r.workflowId !== 'string' ||
      typeof r.workflowName !== 'string' ||
      typeof r.startedAt !== 'string' ||
      typeof r.endedAt !== 'string' ||
      typeof r.success !== 'boolean' ||
      !Array.isArray(r.logs)
    ) {
      continue;
    }
    out.push({
      id: r.id,
      workflowId: r.workflowId,
      workflowName: r.workflowName,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      success: r.success,
      logs: r.logs
        .filter((l: any) => l && typeof l === 'object')
        .map((l: any) => ({
          at: typeof l.at === 'string' ? l.at : '',
          level: (['info', 'warn', 'error'] as const).includes(l.level) ? (l.level as LogLevel) : 'info',
          message: typeof l.message === 'string' ? l.message : '',
        })),
    });
  }
  // newest first
  return out.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
};

const parseWorkflowsJson = (text: string): RunnerWorkflow[] => {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return normalizeWorkflows(parsed);
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).workflows)) {
    return normalizeWorkflows((parsed as any).workflows);
  }
  return [];
};

const mergeWorkflowsById = (existing: RunnerWorkflow[], incoming: RunnerWorkflow[]): RunnerWorkflow[] => {
  const byId = new Map<string, RunnerWorkflow>();
  for (const wf of existing) byId.set(wf.id, wf);
  for (const wf of incoming) byId.set(wf.id, wf);
  return Array.from(byId.values()).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

const WorkflowRunner: React.FC = () => {
  const api = useMemo(() => getElectronApi(), []);
  const canRun = !!api;

  const [workflows, setWorkflows] = useState<RunnerWorkflow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const [isRunning, setIsRunning] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string>('');
  const [logs, setLogs] = useState<RunnerLog[]>([]);
  const runLogsRef = useRef<RunnerLog[]>([]);

  const [runHistory, setRunHistory] = useState<RunnerRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => workflows.find((w) => w.id === selectedId) || null,
    [workflows, selectedId]
  );

  const log = (message: string, level: LogLevel = 'info') => {
    const entry: RunnerLog = { at: new Date().toLocaleTimeString(), level, message };
    runLogsRef.current = [...runLogsRef.current, entry];
    setLogs((prev) => [...prev, entry]);
  };

  const loadFromSettings = async () => {
    if (!api?.getSettings) {
      setStatus('Workflow Runner requires the desktop app (Electron API not available).');
      setWorkflows([]);
      setSelectedId('');
      return;
    }

    const settings = await api.getSettings();
    const loaded = normalizeWorkflows(settings?.workflowRunnerWorkflows);
    const loadedRuns = normalizeRuns(settings?.workflowRunnerRunHistory);
    setWorkflows(loaded);
    setRunHistory(loadedRuns);
    setSelectedRunId((prev) => (loadedRuns.some((r) => r.id === prev) ? prev : loadedRuns[0]?.id || ''));
    if (!loaded.length) {
      const wf = defaultWorkflow();
      setWorkflows([wf]);
      setSelectedId(wf.id);
      await api.setSettings({ workflowRunnerWorkflows: [wf] });
      setStatus('Created a starter workflow.');
    } else {
      setSelectedId((prev) => (loaded.some((w) => w.id === prev) ? prev : loaded[0]!.id));
      setStatus('');
    }
  };

  useEffect(() => {
    loadFromSettings().catch((e) => setStatus(String(e?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!api?.onSettingsUpdated) return;
    api.onSettingsUpdated((settings: any) => {
      const loaded = normalizeWorkflows(settings?.workflowRunnerWorkflows);
      const loadedRuns = normalizeRuns(settings?.workflowRunnerRunHistory);
      setWorkflows(loaded);
      setRunHistory(loadedRuns);
      setSelectedRunId((prev) => (loadedRuns.some((r) => r.id === prev) ? prev : loadedRuns[0]?.id || ''));
    });
  }, [api]);

  const persist = async (next: RunnerWorkflow[]) => {
    setWorkflows(next);
    if (api?.setSettings) {
      await api.setSettings({ workflowRunnerWorkflows: next });
    }
  };

  const persistHistory = async (next: RunnerRun[]) => {
    setRunHistory(next);
    if (api?.setSettings) {
      await api.setSettings({ workflowRunnerRunHistory: next });
    }
  };

  const upsertSelected = async (patch: Partial<RunnerWorkflow>) => {
    if (!selected) return;
    const now = new Date().toISOString();
    const next = workflows.map((w) => (w.id === selected.id ? { ...w, ...patch, updatedAt: now } : w));
    await persist(next);
    setStatus('Saved.');
  };

  const addWorkflow = async () => {
    const wf = defaultWorkflow();
    const next = [wf, ...workflows];
    await persist(next);
    setSelectedId(wf.id);
    setStatus('Workflow created.');
  };

  const deleteWorkflow = async () => {
    if (!selected) return;
    const next = workflows.filter((w) => w.id !== selected.id);
    await persist(next);
    setSelectedId(next[0]?.id || '');
    setStatus('Workflow deleted.');
  };

  const addStep = async () => {
    if (!selected) return;
    const step: RunnerStep = { id: newId(), type: 'runTool', label: 'New step', cmd: '', args: '', cwd: '' };
    await upsertSelected({ steps: [...selected.steps, step] });
  };

  const updateStep = async (stepId: string, patch: Partial<RunnerStep>) => {
    if (!selected) return;
    await upsertSelected({ steps: selected.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) });
  };

  const deleteStep = async (stepId: string) => {
    if (!selected) return;
    await upsertSelected({ steps: selected.steps.filter((s) => s.id !== stepId) });
  };

  const moveStep = async (stepId: string, dir: -1 | 1) => {
    if (!selected) return;
    const idx = selected.steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    const targetIndex = idx + dir;
    if (targetIndex < 0 || targetIndex >= selected.steps.length) return;
    const nextSteps = [...selected.steps];
    const [removed] = nextSteps.splice(idx, 1);
    nextSteps.splice(targetIndex, 0, removed);
    await upsertSelected({ steps: nextSteps });
  };

  const runWorkflow = async () => {
    if (!selected) return;
    if (!api) {
      setStatus('Cannot run: Electron API not available.');
      return;
    }

    setIsRunning(true);
    setActiveStepId('');
    setLogs([]);
    runLogsRef.current = [];

    const runId = newId();
    const startedAtIso = new Date().toISOString();

    log(`Running workflow: ${selected.name}`);

    try {
      for (const step of selected.steps) {
        setActiveStepId(step.id);
        log(`Step: ${step.label} (${step.type})`);

        if (step.type === 'runTool') {
          const cmd = (step.cmd || '').trim();
          if (!cmd) {
            log('Missing cmd', 'error');
            throw new Error(`Step '${step.label}' is missing cmd`);
          }

          const args = (step.args || '')
            .split(/\s+/)
            .map((s) => s.trim())
            .filter(Boolean);

          const res = await api.runTool({ cmd, args, cwd: (step.cwd || '').trim() || undefined });
          if (res?.stdout) log(res.stdout.trim());
          if (res?.stderr) log(res.stderr.trim(), 'warn');
          if (typeof res?.exitCode === 'number' && res.exitCode !== 0) {
            throw new Error(`Command exited with code ${res.exitCode}`);
          }
        }

        if (step.type === 'openProgram') {
          const target = (step.target || '').trim();
          if (!target) throw new Error(`Step '${step.label}' is missing target path`);
          const res = await api.openProgram(target);
          if (res?.success) log('Launched.');
          else throw new Error(res?.error || 'Failed to launch');
        }

        if (step.type === 'openExternal') {
          const target = (step.target || '').trim();
          if (!target) throw new Error(`Step '${step.label}' is missing URL/path`);
          await api.openExternal(target);
          log('Opened.');
        }

        if (step.type === 'revealInFolder') {
          const target = (step.target || '').trim();
          if (!target) throw new Error(`Step '${step.label}' is missing target path`);
          const res = await api.revealInFolder(target);
          if (res?.success) log('Revealed.');
          else throw new Error(res?.error || 'Failed to reveal');
        }
      }

      log('Workflow completed.', 'info');
      setStatus('Run complete.');

      const endedAtIso = new Date().toISOString();
      const entry: RunnerRun = {
        id: runId,
        workflowId: selected.id,
        workflowName: selected.name,
        startedAt: startedAtIso,
        endedAt: endedAtIso,
        success: true,
        logs: runLogsRef.current,
      };

      const nextHistory = [entry, ...runHistory].slice(0, 50);
      await persistHistory(nextHistory);
      setSelectedRunId(entry.id);
    } catch (e) {
      log(`Run failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
      setStatus('Run failed.');

      const endedAtIso = new Date().toISOString();
      const entry: RunnerRun = {
        id: runId,
        workflowId: selected.id,
        workflowName: selected.name,
        startedAt: startedAtIso,
        endedAt: endedAtIso,
        success: false,
        logs: runLogsRef.current,
      };

      const nextHistory = [entry, ...runHistory].slice(0, 50);
      await persistHistory(nextHistory);
      setSelectedRunId(entry.id);
    } finally {
      setActiveStepId('');
      setIsRunning(false);
    }
  };

  const exportRunLog = async () => {
    const content = logs.map((l) => `[${l.at}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
    const filename = `mossy-workflow-run-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;

    if (api?.saveFile) {
      const savedTo = await api.saveFile(content, filename);
      setStatus(savedTo ? `Saved: ${savedTo}` : 'Canceled');
      return;
    }

    downloadTextFallback(content, filename, 'text/plain');
    setStatus('Downloaded');
  };

  const exportHistoryRun = async (run: RunnerRun) => {
    const content = run.logs.map((l) => `[${l.at}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
    const filename = `mossy-run-${run.workflowName.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40)}-${run.startedAt.replace(/[:.]/g, '-')}.txt`;
    if (api?.saveFile) {
      const savedTo = await api.saveFile(content, filename);
      setStatus(savedTo ? `Saved: ${savedTo}` : 'Canceled');
      return;
    }
    downloadTextFallback(content, filename, 'text/plain');
    setStatus('Downloaded');
  };

  const clearHistory = async () => {
    await persistHistory([]);
    setSelectedRunId('');
    setStatus('History cleared.');
  };

  const exportWorkflows = async () => {
    const json = JSON.stringify({ workflows }, null, 2);
    const filename = `mossy-workflows-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    if (api?.saveFile) {
      const savedTo = await api.saveFile(json, filename);
      setStatus(savedTo ? `Saved: ${savedTo}` : 'Canceled');
      return;
    }

    downloadTextFallback(json, filename, 'application/json');
    setStatus('Downloaded');
  };

  const importWorkflowsFromText = async (text: string) => {
    try {
      const imported = parseWorkflowsJson(text);
      if (!imported.length) {
        setStatus('Import: no workflows found in JSON.');
        return;
      }

      const merged = mergeWorkflowsById(workflows, imported);
      await persist(merged);

      const first = imported[0];
      if (first?.id) setSelectedId(first.id);

      setStatus(`Imported ${imported.length} workflow(s). Total: ${merged.length}.`);
    } catch (e) {
      setStatus(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const importWorkflows = async () => {
    // Electron path: native picker + readFile
    if (api?.pickJsonFile && api?.readFile) {
      const filePath = await api.pickJsonFile();
      if (!filePath) {
        setStatus('Import canceled.');
        return;
      }
      const text = await api.readFile(filePath);
      await importWorkflowsFromText(text);
      return;
    }

    // Web fallback: hidden file input
    importInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 pb-24 text-slate-200">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Workflow Runner</h1>
            <p className="text-slate-400 mt-1 text-sm">
              Save and run repeatable steps (launch tools, run commands, open links). Designed for quicker iteration.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportWorkflows().catch(() => {})}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-2"
              title="Export workflow definitions"
            >
              <ArrowDownToLine className="w-4 h-4" /> Export Workflows
            </button>
            <button
              onClick={() => importWorkflows().catch(() => {})}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-2"
              title="Import workflow definitions from JSON"
            >
              <Upload className="w-4 h-4" /> Import Workflows
            </button>
            <button
              onClick={() => addWorkflow().catch(() => {})}
              className="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-xs font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Workflow
            </button>
          </div>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async () => {
              await importWorkflowsFromText(String(reader.result || ''));
              // reset so choosing the same file again triggers change
              if (importInputRef.current) importInputRef.current.value = '';
            };
            reader.onerror = () => setStatus('Import failed: could not read file.');
            reader.readAsText(file);
          }}
        />

        {!canRun && (
          <div className="mb-6 p-4 rounded border border-yellow-700/50 bg-yellow-900/10 text-yellow-200 text-sm flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 mt-0.5" />
            <div>
              <div className="font-semibold">Desktop app required to run steps</div>
              <div className="text-yellow-200/80 text-xs mt-1">
                You can still view workflows here, but running commands requires Electron APIs.
              </div>
            </div>
          </div>
        )}

        {status && <div className="text-xs text-slate-400 font-mono mb-4 break-words">{status}</div>}

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-200">Workflows</div>
              <div className="text-[10px] text-slate-400">{workflows.length}</div>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {workflows.length === 0 && <div className="p-3 text-xs text-slate-500">No workflows yet.</div>}
              {workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => setSelectedId(wf.id)}
                  className={`w-full text-left p-3 rounded border mb-2 transition-colors ${
                    wf.id === selectedId
                      ? 'bg-emerald-900/20 border-emerald-600/50'
                      : 'bg-slate-900/30 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold text-white truncate">{wf.name}</div>
                  <div className="text-[10px] text-slate-400 mt-1 truncate">
                    {wf.steps.length} steps • updated {new Date(wf.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-12 md:col-span-8 space-y-4">
            {!selected ? (
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-900 text-slate-400">
                Select a workflow to edit.
              </div>
            ) : (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200">Editor</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => upsertSelected({ name: selected.name, description: selected.description }).catch(() => {})}
                        className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> Save
                      </button>
                      <button
                        onClick={() => deleteWorkflow().catch(() => {})}
                        className="px-3 py-2 rounded bg-red-700 hover:bg-red-600 border border-red-500 text-xs font-semibold flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-bold uppercase">Name</label>
                      <input
                        value={selected.name}
                        onChange={(e) => upsertSelected({ name: e.target.value }).catch(() => {})}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-bold uppercase">Description</label>
                      <input
                        value={selected.description || ''}
                        onChange={(e) => upsertSelected({ description: e.target.value }).catch(() => {})}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => runWorkflow().catch(() => {})}
                        disabled={!canRun || isRunning}
                        className="flex-1 px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 border border-emerald-500 text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" /> {isRunning ? 'Running...' : 'Run Workflow'}
                      </button>
                      <button
                        onClick={() => addStep().catch(() => {})}
                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add Step
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Run History
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => clearHistory().catch(() => {})}
                        className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-2"
                        title="Clear all saved runs"
                      >
                        <X className="w-4 h-4" /> Clear
                      </button>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-5">
                      <div className="text-[10px] text-slate-500 mb-2">Saved runs (latest 50)</div>
                      <div className="max-h-[40vh] overflow-y-auto space-y-2">
                        {runHistory.length === 0 ? (
                          <div className="text-xs text-slate-600 italic">No saved runs yet.</div>
                        ) : (
                          runHistory.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => setSelectedRunId(r.id)}
                              className={`w-full text-left p-3 rounded border transition-colors ${
                                r.id === selectedRunId
                                  ? 'bg-emerald-900/20 border-emerald-600/50'
                                  : 'bg-slate-950/30 border-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs font-semibold text-white truncate">{r.workflowName}</div>
                                <div className={`text-[10px] ${r.success ? 'text-emerald-300' : 'text-red-300'}`}>
                                  {r.success ? 'OK' : 'FAIL'}
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 truncate">
                                {new Date(r.startedAt).toLocaleString()}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-7">
                      {(() => {
                        const run = runHistory.find((r) => r.id === selectedRunId) || null;
                        if (!run) {
                          return <div className="text-xs text-slate-600 italic">Select a saved run to inspect.</div>;
                        }
                        const text = run.logs
                          .map((l) => `[${l.at}] ${l.level.toUpperCase()}: ${l.message}`)
                          .join('\n');

                        return (
                          <>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="text-xs text-slate-200 font-semibold truncate">{run.workflowName}</div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(text);
                                    setStatus('History run copied.');
                                  }}
                                  className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-2"
                                >
                                  <Copy className="w-4 h-4" /> Copy
                                </button>
                                <button
                                  onClick={() => exportHistoryRun(run).catch(() => {})}
                                  className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-2"
                                >
                                  <ArrowDownToLine className="w-4 h-4" /> Export
                                </button>
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-500 mb-2">
                              {run.success ? 'Success' : 'Failed'} • started {new Date(run.startedAt).toLocaleString()} • ended{' '}
                              {new Date(run.endedAt).toLocaleString()}
                            </div>
                            <div className="p-3 rounded border border-slate-800 bg-slate-950/30 font-mono text-[11px] max-h-[40vh] overflow-y-auto whitespace-pre-wrap">
                              {text || <span className="text-slate-600 italic">(no log lines)</span>}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200">Steps</div>
                    <div className="text-[10px] text-slate-400">{selected.steps.length}</div>
                  </div>
                  <div className="p-4 space-y-3">
                    {selected.steps.length === 0 && (
                      <div className="text-xs text-slate-500">Add a step to start.</div>
                    )}
                    {selected.steps.map((s, idx) => (
                      <div
                        key={s.id}
                        className={`p-3 rounded border ${
                          s.id === activeStepId
                            ? 'border-emerald-500/60 bg-emerald-900/10'
                            : 'border-slate-800 bg-slate-950/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] text-slate-500 font-mono">#{idx + 1}</div>
                          <input
                            value={s.label}
                            onChange={(e) => updateStep(s.id, { label: e.target.value }).catch(() => {})}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                          <select
                            value={s.type}
                            onChange={(e) => updateStep(s.id, { type: e.target.value as StepType }).catch(() => {})}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          >
                            <option value="runTool">Run Tool</option>
                            <option value="openProgram">Open Program</option>
                            <option value="openExternal">Open External</option>
                            <option value="revealInFolder">Reveal In Folder</option>
                          </select>
                          <button
                            onClick={() => moveStep(s.id, -1).catch(() => {})}
                            className="p-1 rounded border border-slate-700 hover:bg-slate-800"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveStep(s.id, 1).catch(() => {})}
                            className="p-1 rounded border border-slate-700 hover:bg-slate-800"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteStep(s.id).catch(() => {})}
                            className="p-1 rounded border border-red-700/60 hover:bg-red-900/20"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-12 gap-2 mt-3">
                          {s.type === 'runTool' && (
                            <>
                              <div className="col-span-12 md:col-span-4">
                                <label className="text-[10px] text-slate-500">cmd</label>
                                <input
                                  value={s.cmd || ''}
                                  onChange={(e) => updateStep(s.id, { cmd: e.target.value }).catch(() => {})}
                                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                  placeholder="e.g. xEdit.exe"
                                />
                              </div>
                              <div className="col-span-12 md:col-span-5">
                                <label className="text-[10px] text-slate-500">args (space-separated)</label>
                                <input
                                  value={s.args || ''}
                                  onChange={(e) => updateStep(s.id, { args: e.target.value }).catch(() => {})}
                                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                  placeholder="e.g. /c echo hello"
                                />
                              </div>
                              <div className="col-span-12 md:col-span-3">
                                <label className="text-[10px] text-slate-500">cwd (optional)</label>
                                <input
                                  value={s.cwd || ''}
                                  onChange={(e) => updateStep(s.id, { cwd: e.target.value }).catch(() => {})}
                                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                  placeholder="e.g. D:\\Modding"
                                />
                              </div>
                            </>
                          )}

                          {(s.type === 'openProgram' || s.type === 'openExternal' || s.type === 'revealInFolder') && (
                            <div className="col-span-12">
                              <label className="text-[10px] text-slate-500">target</label>
                              <input
                                value={s.target || ''}
                                onChange={(e) => updateStep(s.id, { target: e.target.value }).catch(() => {})}
                                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                placeholder={
                                  s.type === 'openExternal'
                                    ? 'URL or file path'
                                    : 'File path'
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200">Run Log</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const text = logs.map((l) => `[${l.at}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
                          navigator.clipboard.writeText(text);
                          setStatus('Log copied.');
                        }}
                        className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" /> Copy
                      </button>
                      <button
                        onClick={() => exportRunLog().catch(() => {})}
                        className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-2"
                      >
                        <ArrowDownToLine className="w-4 h-4" /> Export
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950/30 font-mono text-[11px] max-h-[40vh] overflow-y-auto">
                    {logs.length === 0 ? (
                      <div className="text-slate-600 italic">No runs yet.</div>
                    ) : (
                      logs.map((l, idx) => (
                        <div
                          key={idx}
                          className={`border-l-2 pl-2 py-1 ${
                            l.level === 'error'
                              ? 'border-red-500 text-red-300'
                              : l.level === 'warn'
                              ? 'border-yellow-500 text-yellow-200'
                              : 'border-slate-700 text-slate-200'
                          }`}
                        >
                          <span className="text-slate-500 mr-2">{l.at}</span>
                          {l.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowRunner;
