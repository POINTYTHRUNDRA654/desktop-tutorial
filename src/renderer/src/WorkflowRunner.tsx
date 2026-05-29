import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  Search,
  Layers,
  Timer,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Terminal,
  FolderOpen,
  ExternalLink,
  Pause,
  Zap,
  BookOpen,
  FilePlus2,
  FileX,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type StepType = 'runTool' | 'openProgram' | 'openExternal' | 'revealInFolder' | 'waitForProcess' | 'copyFile' | 'deleteFile' | 'waitSeconds';

type RunnerStep = {
  id: string;
  type: StepType;
  label: string;
  cmd?: string;
  args?: string;
  cwd?: string;
  target?: string;
  processName?: string;
  timeoutMs?: number;
  continueOnError?: boolean;
  sourcePath?: string;
  destPath?: string;
  waitSecondsVal?: number;
};

type RunnerWorkflow = {
  id: string;
  name: string;
  description?: string;
  steps: RunnerStep[];
  tags?: string[];
  continueOnError?: boolean;
  createdAt: string;
  updatedAt: string;
};

type LogLevel = 'info' | 'warn' | 'error' | 'success';

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
  durationMs: number;
  success: boolean;
  logs: RunnerLog[];
};

// ─── FO4 Preset Workflow Templates ──────────────────────────────────────────

const FO4_PRESETS: Omit<RunnerWorkflow, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Creation Kit — Launch & Monitor',
    description: 'Opens CK, waits for it to start, then opens the Mossy Log Monitor.',
    tags: ['creation-kit', 'launch'],
    steps: [
      {
        id: '_p1a',
        type: 'openProgram',
        label: 'Launch Creation Kit',
        target: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Tools\\Creation Kit\\CreationKit.exe',
      },
      {
        id: '_p1b',
        type: 'waitForProcess',
        label: 'Wait for CreationKit.exe to start',
        processName: 'CreationKit.exe',
        timeoutMs: 60000,
      },
    ],
  },
  {
    name: 'Papyrus Compile Chain',
    description: 'Compiles all modified .psc scripts using the Papyrus compiler, then reveals the output folder.',
    tags: ['papyrus', 'compile'],
    steps: [
      {
        id: '_p2a',
        type: 'runTool',
        label: 'Compile Papyrus scripts',
        cmd: 'PapyrusCompiler.exe',
        args: 'Scripts\\Source -output="Scripts" -import="Scripts\\Source;Data\\Scripts\\Source" -flags=TESV_Papyrus_Flags.flg -all',
        cwd: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Papyrus Compiler',
      },
      {
        id: '_p2b',
        type: 'revealInFolder',
        label: 'Open compiled scripts folder',
        target: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Data\\Scripts',
      },
    ],
  },
  {
    name: 'BA2 Archive Pack (Textures)',
    description: 'Uses Archive2 to repack loose texture files into a BA2 archive.',
    tags: ['ba2', 'archive', 'textures'],
    steps: [
      {
        id: '_p3a',
        type: 'runTool',
        label: 'Pack textures into BA2',
        cmd: 'Archive2.exe',
        args: '"C:\\MyMod\\Data\\Textures" -create="C:\\MyMod\\MyMod - Textures.ba2" -root="C:\\MyMod\\Data"',
        cwd: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Tools\\Archive2',
      },
      {
        id: '_p3b',
        type: 'revealInFolder',
        label: 'Reveal output BA2',
        target: 'C:\\MyMod',
      },
    ],
  },
  {
    name: 'Load Order Backup',
    description: 'Copies plugins.txt and loadorder.txt to a timestamped backup folder using xcopy.',
    tags: ['load-order', 'backup'],
    steps: [
      {
        id: '_p4a',
        type: 'runTool',
        label: 'Create backup folder',
        cmd: 'cmd',
        args: '/c mkdir "%LOCALAPPDATA%\\Fallout4\\Backups\\LO_%DATE:~-4,4%%DATE:~-7,2%%DATE:~0,2%"',
        cwd: '',
      },
      {
        id: '_p4b',
        type: 'runTool',
        label: 'Backup plugins.txt',
        cmd: 'xcopy',
        args: '"%LOCALAPPDATA%\\Fallout4\\plugins.txt" "%LOCALAPPDATA%\\Fallout4\\Backups\\LO_%DATE:~-4,4%%DATE:~-7,2%%DATE:~0,2%\\" /Y /Q',
        cwd: '',
      },
    ],
  },
  {
    name: 'xEdit Conflict Resolution Export',
    description: 'Launches FO4Edit in conflict filter mode so you can inspect and resolve mod conflicts.',
    tags: ['xedit', 'conflicts'],
    steps: [
      {
        id: '_p5a',
        type: 'openProgram',
        label: 'Open FO4Edit (conflict filter)',
        target: 'C:\\Modding Tools\\xEdit\\FO4Edit.exe',
      },
    ],
  },
  {
    name: 'Full Mod Build Pipeline',
    description: 'Compiles Papyrus, packs BA2, then reveals the mod folder — one click for your full release build.',
    tags: ['build', 'release', 'papyrus', 'ba2'],
    continueOnError: false,
    steps: [
      {
        id: '_p6a',
        type: 'runTool',
        label: 'Compile Papyrus scripts',
        cmd: 'PapyrusCompiler.exe',
        args: 'Scripts\\Source -output="Scripts" -import="Scripts\\Source;Data\\Scripts\\Source" -flags=TESV_Papyrus_Flags.flg -all',
        cwd: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Papyrus Compiler',
      },
      {
        id: '_p6b',
        type: 'runTool',
        label: 'Pack main BA2 (general)',
        cmd: 'Archive2.exe',
        args: '"C:\\MyMod\\Data" -create="C:\\MyMod\\MyMod - Main.ba2" -root="C:\\MyMod\\Data" -format=General',
        cwd: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Tools\\Archive2',
      },
      {
        id: '_p6c',
        type: 'revealInFolder',
        label: 'Reveal release folder',
        target: 'C:\\MyMod',
      },
    ],
  },
];

// ─── Utilities ───────────────────────────────────────────────────────────────

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

/**
 * Properly splits a command-line args string respecting quoted segments.
 * e.g. 'foo "bar baz" qux' → ['foo', 'bar baz', 'qux']
 */
const splitArgs = (argsStr: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;

  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === ' ' && !inDouble && !inSingle) {
      if (current.length > 0) {
        result.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) result.push(current);
  return result;
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
    tags: [],
    continueOnError: false,
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeStep = (s: any): RunnerStep => ({
  id: typeof s.id === 'string' ? s.id : newId(),
  type: (['runTool', 'openProgram', 'openExternal', 'revealInFolder', 'waitForProcess', 'copyFile', 'deleteFile', 'waitSeconds'] as const).includes(s.type)
    ? (s.type as StepType)
    : 'runTool',
  label: typeof s.label === 'string' ? s.label : 'Step',
  cmd: typeof s.cmd === 'string' ? s.cmd : '',
  args: typeof s.args === 'string' ? s.args : '',
  cwd: typeof s.cwd === 'string' ? s.cwd : '',
  target: typeof s.target === 'string' ? s.target : '',
  processName: typeof s.processName === 'string' ? s.processName : '',
  timeoutMs: typeof s.timeoutMs === 'number' ? s.timeoutMs : undefined,
  continueOnError: typeof s.continueOnError === 'boolean' ? s.continueOnError : false,
  sourcePath: typeof s.sourcePath === 'string' ? s.sourcePath : '',
  destPath: typeof s.destPath === 'string' ? s.destPath : '',
  waitSecondsVal: typeof s.waitSecondsVal === 'number' ? s.waitSecondsVal : 5,
});

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
      steps: w.steps.filter((s: any) => s && typeof s === 'object').map(normalizeStep),
      tags: Array.isArray(w.tags) ? w.tags.filter((t: any) => typeof t === 'string') : [],
      continueOnError: typeof w.continueOnError === 'boolean' ? w.continueOnError : false,
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
    ) continue;
    out.push({
      id: r.id,
      workflowId: r.workflowId,
      workflowName: r.workflowName,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      durationMs: typeof r.durationMs === 'number' ? r.durationMs : 0,
      success: r.success,
      logs: r.logs
        .filter((l: any) => l && typeof l === 'object')
        .map((l: any) => ({
          at: typeof l.at === 'string' ? l.at : '',
          level: (['info', 'warn', 'error', 'success'] as const).includes(l.level) ? (l.level as LogLevel) : 'info',
          message: typeof l.message === 'string' ? l.message : '',
        })),
    });
  }
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

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

const STEP_TYPE_META: Record<StepType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  runTool:        { label: 'Run Tool',         icon: Terminal,    color: 'text-emerald-400' },
  openProgram:    { label: 'Open Program',     icon: Zap,         color: 'text-blue-400'    },
  openExternal:   { label: 'Open External',   icon: ExternalLink, color: 'text-purple-400'  },
  revealInFolder: { label: 'Reveal Folder',   icon: FolderOpen,  color: 'text-amber-400'   },
  waitForProcess: { label: 'Wait Process',    icon: Pause,       color: 'text-cyan-400'    },
  copyFile:    { label: 'Copy File/Dir',  icon: FilePlus2,   color: 'text-sky-400'     },
  deleteFile:  { label: 'Delete File',    icon: FileX,       color: 'text-red-400'     },
  waitSeconds: { label: 'Wait (seconds)', icon: Timer,       color: 'text-violet-400'  },
};

// ─── Step Row Component ───────────────────────────────────────────────────────

interface StepRowProps {
  step: RunnerStep;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  onUpdate: (id: string, patch: Partial<RunnerStep>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
}

const StepRow: React.FC<StepRowProps> = ({
  step, index, isActive, isCompleted, isFailed,
  onUpdate, onDuplicate, onDelete, onMoveUp, onMoveDown,
  isFirst, isLast, disabled,
}) => {
  const meta = STEP_TYPE_META[step.type];
  const Icon = meta.icon;

  const borderClass = isActive
    ? 'border-emerald-500/70 bg-emerald-900/10 shadow-lg shadow-emerald-900/20'
    : isCompleted
    ? 'border-emerald-800/40 bg-emerald-950/10'
    : isFailed
    ? 'border-red-700/50 bg-red-950/10'
    : 'border-slate-800 bg-slate-950/30';

  return (
    <div className={`p-3 rounded-lg border transition-all duration-200 ${borderClass}`}>
      {/* Row header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-[28px]">
          {isActive ? (
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : isFailed ? (
            <XCircle className="w-4 h-4 text-red-400" />
          ) : (
            <span className="text-[10px] text-slate-500 font-mono">#{index + 1}</span>
          )}
        </div>

        <input
          value={step.label}
          onChange={e => onUpdate(step.id, { label: e.target.value })}
          disabled={disabled}
          placeholder="Step label"
          className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 disabled:opacity-50"
        />

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded px-2 py-1">
          <Icon className={`w-3 h-3 ${meta.color}`} />
          <select
            value={step.type}
            onChange={e => onUpdate(step.id, { type: e.target.value as StepType })}
            disabled={disabled}
            className="bg-transparent text-xs text-slate-300 cursor-pointer outline-none disabled:opacity-50"
          >
            {(Object.entries(STEP_TYPE_META) as [StepType, typeof meta][]).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onMoveUp(step.id)}
            disabled={isFirst || disabled}
            className="p-1 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => onMoveDown(step.id)}
            disabled={isLast || disabled}
            className="p-1 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDuplicate(step.id)}
            disabled={disabled}
            className="p-1 rounded border border-slate-700 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Duplicate step"
          >
            <Copy className="w-3 h-3 text-slate-400" />
          </button>
          <button
            onClick={() => onDelete(step.id)}
            disabled={disabled}
            className="p-1 rounded border border-red-800/50 hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Delete step"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      </div>

      {/* Step fields */}
      <div className="grid grid-cols-12 gap-2">
        {step.type === 'runTool' && (
          <>
            <div className="col-span-12 md:col-span-3">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Executable</label>
              <input
                value={step.cmd || ''}
                onChange={e => onUpdate(step.id, { cmd: e.target.value })}
                disabled={disabled}
                placeholder="e.g. xEdit.exe"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 font-mono disabled:opacity-50"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Args (quotes respected)</label>
              <input
                value={step.args || ''}
                onChange={e => onUpdate(step.id, { args: e.target.value })}
                disabled={disabled}
                placeholder='e.g. -export "My Mod.esp"  (%ENVVAR% supported)'
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 font-mono disabled:opacity-50"
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Working Dir</label>
              <input
                value={step.cwd || ''}
                onChange={e => onUpdate(step.id, { cwd: e.target.value })}
                disabled={disabled}
                placeholder="optional"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 font-mono disabled:opacity-50"
              />
            </div>
          </>
        )}

        {(step.type === 'openProgram' || step.type === 'revealInFolder') && (
          <div className="col-span-12">
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">File / Folder Path</label>
            <input
              value={step.target || ''}
              onChange={e => onUpdate(step.id, { target: e.target.value })}
              disabled={disabled}
              placeholder="C:\Modding Tools\xEdit\FO4Edit.exe"
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 font-mono disabled:opacity-50"
            />
          </div>
        )}

        {step.type === 'openExternal' && (
          <div className="col-span-12">
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">URL or File Path</label>
            <input
              value={step.target || ''}
              onChange={e => onUpdate(step.id, { target: e.target.value })}
              disabled={disabled}
              placeholder="https://nexusmods.com/fallout4 or C:\path\to\file"
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 font-mono disabled:opacity-50"
            />
          </div>
        )}

        {step.type === 'waitForProcess' && (
          <>
            <div className="col-span-12 md:col-span-6">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Process Name</label>
              <input
                value={step.processName || ''}
                onChange={e => onUpdate(step.id, { processName: e.target.value })}
                disabled={disabled}
                placeholder="e.g. CreationKit.exe"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 font-mono disabled:opacity-50"
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Timeout (ms)</label>
              <input
                type="number"
                value={step.timeoutMs ?? 30000}
                onChange={e => onUpdate(step.id, { timeoutMs: Number(e.target.value) || 30000 })}
                disabled={disabled}
                min={1000}
                step={1000}
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono disabled:opacity-50"
              />
            </div>
            <div className="col-span-12 md:col-span-3 flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={!!step.continueOnError}
                  onChange={e => onUpdate(step.id, { continueOnError: e.target.checked })}
                  disabled={disabled}
                  className="accent-emerald-500"
                />
                Continue on timeout
              </label>
            </div>
          </>
        )}

        {step.type === 'copyFile' && (
          <>
            <div className="col-span-12 md:col-span-6">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Source Path</label>
              <input
                value={step.sourcePath || ''}
                onChange={e => onUpdate(step.id, { sourcePath: e.target.value })}
                disabled={disabled}
                placeholder="C:\MyMod\Data  (%ENVVAR% supported)"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 font-mono disabled:opacity-50"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Destination Path</label>
              <input
                value={step.destPath || ''}
                onChange={e => onUpdate(step.id, { destPath: e.target.value })}
                disabled={disabled}
                placeholder="D:\Backup\Data  (%ENVVAR% supported)"
                className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 font-mono disabled:opacity-50"
              />
            </div>
          </>
        )}

        {step.type === 'deleteFile' && (
          <div className="col-span-12">
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Path to Delete</label>
            <input
              value={step.target || ''}
              onChange={e => onUpdate(step.id, { target: e.target.value })}
              disabled={disabled}
              placeholder="C:\MyMod\Temp\*.tmp  (%ENVVAR% + wildcards OK)"
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 font-mono disabled:opacity-50"
            />
            <p className="mt-1 text-[10px] text-red-400/70">Caution: permanently deletes the target. Use wildcards carefully.</p>
          </div>
        )}

        {step.type === 'waitSeconds' && (
          <div className="col-span-12 md:col-span-4">
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Wait Duration (seconds)</label>
            <input
              type="number"
              value={step.waitSecondsVal ?? 5}
              onChange={e => onUpdate(step.id, { waitSecondsVal: Math.max(0.1, Number(e.target.value) || 5) })}
              disabled={disabled}
              min={0.1}
              step={0.5}
              className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono disabled:opacity-50"
            />
          </div>
        )}

        {/* Per-step timeout for runTool */}
        {step.type === 'runTool' && (
          <div className="col-span-12 flex gap-4 items-center mt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 select-none">
              <input
                type="checkbox"
                checked={typeof step.timeoutMs === 'number'}
                onChange={e => onUpdate(step.id, { timeoutMs: e.target.checked ? 30000 : undefined })}
                disabled={disabled}
                className="accent-emerald-500"
              />
              Timeout
            </label>
            {typeof step.timeoutMs === 'number' && (
              <input
                type="number"
                value={step.timeoutMs}
                onChange={e => onUpdate(step.id, { timeoutMs: Number(e.target.value) || 30000 })}
                disabled={disabled}
                min={1000}
                step={1000}
                className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono disabled:opacity-50"
              />
            )}
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 select-none">
              <input
                type="checkbox"
                checked={!!step.continueOnError}
                onChange={e => onUpdate(step.id, { continueOnError: e.target.checked })}
                disabled={disabled}
                className="accent-emerald-500"
              />
              Continue on error
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const WorkflowRunner: React.FC = () => {
  const api = useMemo(() => getElectronApi(), []);
  const canRun = !!api;

  const [workflows, setWorkflows] = useState<RunnerWorkflow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string>('');
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [failedStepIds, setFailedStepIds] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<RunnerLog[]>([]);
  const [stepStartMs, setStepStartMs] = useState<number>(0);
  const [runElapsedMs, setRunElapsedMs] = useState<number>(0);
  const runStartMsRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runLogsRef = useRef<RunnerLog[]>([]);
  const abortRequestedRef = useRef<boolean>(false);
  const logPanelRef = useRef<HTMLDivElement>(null);

  const [runHistory, setRunHistory] = useState<RunnerRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => workflows.find(w => w.id === selectedId) || null,
    [workflows, selectedId]
  );

  const filteredWorkflows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      w =>
        w.name.toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q) ||
        (w.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [workflows, search]);

  // Auto-scroll run log when new lines arrive
  useEffect(() => {
    if (logPanelRef.current) {
      logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
    }
  }, [logs]);

  const log = useCallback((message: string, level: LogLevel = 'info') => {
    const entry: RunnerLog = { at: new Date().toLocaleTimeString(), level, message };
    runLogsRef.current = [...runLogsRef.current, entry];
    setLogs(prev => [...prev, entry]);
  }, []);

  // Elapsed-time ticker during a run
  useEffect(() => {
    if (isRunning) {
      runStartMsRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setRunElapsedMs(Date.now() - runStartMsRef.current);
      }, 250);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRunElapsedMs(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  const loadFromSettings = useCallback(async () => {
    if (!api?.getSettings) {
      setStatus('Workflow Runner requires the desktop app (Electron API unavailable).');
      setWorkflows([]);
      setSelectedId('');
      return;
    }
    const settings = await api.getSettings();
    const loaded = normalizeWorkflows(settings?.workflowRunnerWorkflows);
    const loadedRuns = normalizeRuns(settings?.workflowRunnerRunHistory);
    setWorkflows(loaded);
    setRunHistory(loadedRuns);
    setSelectedRunId(prev => (loadedRuns.some(r => r.id === prev) ? prev : loadedRuns[0]?.id || ''));
    if (!loaded.length) {
      const wf = defaultWorkflow();
      setWorkflows([wf]);
      setSelectedId(wf.id);
      await api.setSettings({ workflowRunnerWorkflows: [wf] });
      setStatus('Created a starter workflow.');
    } else {
      setSelectedId(prev => (loaded.some(w => w.id === prev) ? prev : loaded[0]!.id));
      setStatus('');
    }
  }, [api]);

  useEffect(() => {
    loadFromSettings().catch(e => setStatus(String(e?.message || e)));
  }, [loadFromSettings]);

  useEffect(() => {
    if (!api?.onSettingsUpdated) return;
    const unsub = api.onSettingsUpdated((settings: any) => {
      const loaded = normalizeWorkflows(settings?.workflowRunnerWorkflows);
      const loadedRuns = normalizeRuns(settings?.workflowRunnerRunHistory);
      setWorkflows(loaded);
      setRunHistory(loadedRuns);
      setSelectedRunId(prev => (loadedRuns.some(r => r.id === prev) ? prev : loadedRuns[0]?.id || ''));
    });
    return () => unsub?.();
  }, [api]);

  const persist = useCallback(async (next: RunnerWorkflow[]) => {
    setWorkflows(next);
    if (api?.setSettings) await api.setSettings({ workflowRunnerWorkflows: next });
  }, [api]);

  const persistHistory = useCallback(async (next: RunnerRun[]) => {
    setRunHistory(next);
    if (api?.setSettings) await api.setSettings({ workflowRunnerRunHistory: next });
  }, [api]);

  const upsertSelected = useCallback(async (patch: Partial<RunnerWorkflow>) => {
    if (!selected) return;
    const now = new Date().toISOString();
    const next = workflows.map(w => (w.id === selected.id ? { ...w, ...patch, updatedAt: now } : w));
    await persist(next);
  }, [selected, workflows, persist]);

  const addWorkflow = async () => {
    const wf = defaultWorkflow();
    await persist([wf, ...workflows]);
    setSelectedId(wf.id);
    setStatus('Workflow created.');
  };

  const duplicateWorkflow = async () => {
    if (!selected) return;
    const now = new Date().toISOString();
    const dup: RunnerWorkflow = {
      ...JSON.parse(JSON.stringify(selected)),
      id: newId(),
      name: `${selected.name} (copy)`,
      steps: selected.steps.map(s => ({ ...s, id: newId() })),
      createdAt: now,
      updatedAt: now,
    };
    await persist([dup, ...workflows]);
    setSelectedId(dup.id);
    setStatus('Workflow duplicated.');
  };

  const deleteWorkflow = async () => {
    if (!selected) return;
    const next = workflows.filter(w => w.id !== selected.id);
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
    await upsertSelected({ steps: selected.steps.map(s => (s.id === stepId ? { ...s, ...patch } : s)) });
  };

  const deleteStep = async (stepId: string) => {
    if (!selected) return;
    await upsertSelected({ steps: selected.steps.filter(s => s.id !== stepId) });
  };

  const duplicateStep = async (stepId: string) => {
    if (!selected) return;
    const idx = selected.steps.findIndex(s => s.id === stepId);
    if (idx < 0) return;
    const orig = selected.steps[idx];
    const dup: RunnerStep = { ...JSON.parse(JSON.stringify(orig)), id: newId(), label: `${orig.label} (copy)` };
    const nextSteps = [...selected.steps];
    nextSteps.splice(idx + 1, 0, dup);
    await upsertSelected({ steps: nextSteps });
  };

  const moveStep = async (stepId: string, dir: -1 | 1) => {
    if (!selected) return;
    const idx = selected.steps.findIndex(s => s.id === stepId);
    if (idx < 0) return;
    const targetIndex = idx + dir;
    if (targetIndex < 0 || targetIndex >= selected.steps.length) return;
    const nextSteps = [...selected.steps];
    const [removed] = nextSteps.splice(idx, 1);
    nextSteps.splice(targetIndex, 0, removed);
    await upsertSelected({ steps: nextSteps });
  };

  const installPreset = async (preset: typeof FO4_PRESETS[number]) => {
    const now = new Date().toISOString();
    const wf: RunnerWorkflow = {
      ...preset,
      id: newId(),
      steps: preset.steps.map(s => ({ ...s, id: newId() })),
      createdAt: now,
      updatedAt: now,
    };
    await persist([wf, ...workflows]);
    setSelectedId(wf.id);
    setShowPresets(false);
    setStatus(`Preset "${wf.name}" installed. Update paths to match your setup.`);
  };

  // ── Workflow execution ───────────────────────────────────────────────────

  const runWorkflow = async () => {
    if (!selected || !api) return;

    setIsRunning(true);
    abortRequestedRef.current = false;
    setActiveStepId('');
    setCompletedStepIds(new Set());
    setFailedStepIds(new Set());
    setLogs([]);
    runLogsRef.current = [];

    const runId = newId();
    const startedAtIso = new Date().toISOString();
    const startMs = Date.now();

    log(`▶ Running workflow: ${selected.name} (${selected.steps.length} step${selected.steps.length !== 1 ? 's' : ''})`);

    const globalContinueOnError = selected.continueOnError ?? false;
    let overallSuccess = true;

    try {
      for (let i = 0; i < selected.steps.length; i++) {
        if (abortRequestedRef.current) {
          log('Run aborted by user.', 'warn');
          throw new Error('Aborted by user');
        }
        const step = selected.steps[i];
        const stepContinue = step.continueOnError ?? globalContinueOnError;

        setActiveStepId(step.id);
        setStepStartMs(Date.now());
        const meta = STEP_TYPE_META[step.type];
        log(`[${i + 1}/${selected.steps.length}] ${meta.label} — ${step.label}`);

        try {
          if (step.type === 'runTool') {
            const cmd = (step.cmd || '').trim();
            if (!cmd) throw new Error(`Step "${step.label}" is missing executable`);

            const args = splitArgs(step.args || '');
            const runFn: (p: { cmd: string; args?: string[]; cwd?: string; timeoutMs?: number }) => Promise<{ exitCode: number; stdout: string; stderr: string }> =
              api.workflowRunnerRunTool ?? api.runTool;

            const res = await runFn({
              cmd,
              args,
              cwd: (step.cwd || '').trim() || undefined,
              timeoutMs: step.timeoutMs,
            });

            if (res?.stdout?.trim()) log(res.stdout.trim());
            if (res?.stderr?.trim()) log(res.stderr.trim(), 'warn');
            if (typeof res?.exitCode === 'number' && res.exitCode !== 0) {
              throw new Error(`Exited with code ${res.exitCode}`);
            }
          }

          else if (step.type === 'openProgram') {
            const target = (step.target || '').trim();
            if (!target) throw new Error(`Step "${step.label}" is missing target path`);
            const res = await api.openProgram(target);
            if (!res?.success) throw new Error(res?.error || 'Failed to launch program');
            log('Program launched.');
          }

          else if (step.type === 'openExternal') {
            const target = (step.target || '').trim();
            if (!target) throw new Error(`Step "${step.label}" is missing URL/path`);
            const res = await api.openExternal(target);
            if (res?.success === false) throw new Error(res?.error || 'Failed to open external target');
            log('Opened external target.');
          }

          else if (step.type === 'revealInFolder') {
            const target = (step.target || '').trim();
            if (!target) throw new Error(`Step "${step.label}" is missing target path`);
            const res = await api.revealInFolder(target);
            if (!res?.success) throw new Error(res?.error || 'Failed to reveal in folder');
            log('Revealed in Explorer.');
          }

          else if (step.type === 'waitForProcess') {
            const processName = (step.processName || '').trim();
            if (!processName) throw new Error(`Step "${step.label}" is missing process name`);
            const timeout = step.timeoutMs ?? 30000;
            log(`Waiting for process: ${processName} (timeout: ${formatDuration(timeout)})`);

            // Poll every 2 seconds until the process is found or timeout
            const pollInterval = 2000;
            const deadline = Date.now() + timeout;
            let found = false;

            while (Date.now() < deadline) {
              try {
                const checkFn = api.workflowRunnerRunTool ?? api.runTool;
                const res = await checkFn({
                  cmd: 'tasklist',
                  args: ['/FI', `IMAGENAME eq ${processName}`, '/NH', '/FO', 'CSV'],
                });
                if (res?.stdout?.toLowerCase().includes(processName.toLowerCase())) {
                  found = true;
                  break;
                }
              } catch {
                // tasklist failure — continue polling
              }
              await new Promise(resolve => setTimeout(resolve, pollInterval));
            }

            if (!found) {
              throw new Error(`Timeout waiting for process "${processName}" after ${formatDuration(timeout)}`);
            }
            log(`Process "${processName}" detected.`, 'success');
          }

          else if (step.type === 'copyFile') {
            const src = (step.sourcePath || '').trim();
            const dst = (step.destPath || '').trim();
            if (!src) throw new Error(`Step "${step.label}" is missing source path`);
            if (!dst) throw new Error(`Step "${step.label}" is missing destination path`);
            log(`Copying: ${src} → ${dst}`);
            const copyFn: (p: { cmd: string; args?: string[]; cwd?: string; timeoutMs?: number }) => Promise<{ exitCode: number; stdout: string; stderr: string }> =
              api.workflowRunnerRunTool ?? api.runTool;
            const copyRes = await copyFn({
              cmd: 'powershell',
              args: ['-NoProfile', '-NonInteractive', '-Command',
                `Copy-Item -Path '${src}' -Destination '${dst}' -Recurse -Force`],
            });
            if (copyRes?.stderr?.trim()) log(copyRes.stderr.trim(), 'warn');
            if (typeof copyRes?.exitCode === 'number' && copyRes.exitCode !== 0) {
              throw new Error(`Copy failed (exit code ${copyRes.exitCode})`);
            }
            log('Copied successfully.', 'success');
          }

          else if (step.type === 'deleteFile') {
            const delTarget = (step.target || '').trim();
            if (!delTarget) throw new Error(`Step "${step.label}" is missing path to delete`);
            log(`Deleting: ${delTarget}`);
            const delFn: (p: { cmd: string; args?: string[]; cwd?: string; timeoutMs?: number }) => Promise<{ exitCode: number; stdout: string; stderr: string }> =
              api.workflowRunnerRunTool ?? api.runTool;
            const delRes = await delFn({
              cmd: 'powershell',
              args: ['-NoProfile', '-NonInteractive', '-Command',
                `Remove-Item -Path '${delTarget}' -Recurse -Force -ErrorAction SilentlyContinue`],
            });
            if (delRes?.stderr?.trim()) log(delRes.stderr.trim(), 'warn');
            if (typeof delRes?.exitCode === 'number' && delRes.exitCode !== 0) {
              throw new Error(`Delete failed (exit code ${delRes.exitCode})`);
            }
            log('Deleted successfully.', 'success');
          }

          else if (step.type === 'waitSeconds') {
            const secs = Math.max(0.1, step.waitSecondsVal ?? 5);
            log(`Waiting ${secs}s…`);
            const totalMs = secs * 1000;
            const tickMs = 500;
            let waited = 0;
            while (waited < totalMs) {
              if (abortRequestedRef.current) throw new Error('Aborted by user');
              await new Promise(r => setTimeout(r, Math.min(tickMs, totalMs - waited)));
              waited += tickMs;
            }
            log('Wait complete.', 'success');
          }

          const elapsed = Date.now() - (stepStartMs || Date.now());
          log(`✓ Step complete (${formatDuration(elapsed)})`, 'success');
          setCompletedStepIds(prev => new Set([...prev, step.id]));

        } catch (stepErr) {
          const msg = stepErr instanceof Error ? stepErr.message : String(stepErr);
          log(`✗ ${msg}`, 'error');
          setFailedStepIds(prev => new Set([...prev, step.id]));
          overallSuccess = false;

          if (!stepContinue) {
            throw new Error(`Stopped at step "${step.label}": ${msg}`);
          } else {
            log(`↷ Continuing despite error (continueOnError = true)`, 'warn');
          }
        }
      }

      log(`✔ Workflow complete — ${selected.steps.length} step${selected.steps.length !== 1 ? 's' : ''} in ${formatDuration(Date.now() - startMs)}`, overallSuccess ? 'success' : 'warn');
      setStatus(overallSuccess ? 'Run complete.' : 'Run finished with errors (continueOnError).');

    } catch (e) {
      overallSuccess = false;
      const msg = e instanceof Error ? e.message : String(e);
      log(`Run failed: ${msg}`, 'error');
      setStatus('Run failed.');
    } finally {
      const endedAtIso = new Date().toISOString();
      const durationMs = Date.now() - startMs;
      const entry: RunnerRun = {
        id: runId,
        workflowId: selected.id,
        workflowName: selected.name,
        startedAt: startedAtIso,
        endedAt: endedAtIso,
        durationMs,
        success: overallSuccess,
        logs: runLogsRef.current,
      };
      const nextHistory = [entry, ...runHistory].slice(0, 50);
      await persistHistory(nextHistory);
      setSelectedRunId(entry.id);
      setActiveStepId('');
      setIsRunning(false);
    }
  };

  // ── Export / Import ──────────────────────────────────────────────────────

  const exportRunLog = async () => {
    const content = logs.map(l => `[${l.at}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
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
    const content = run.logs.map(l => `[${l.at}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
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
      if (!imported.length) { setStatus('Import: no workflows found in JSON.'); return; }
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
    if (api?.pickJsonFile && api?.readFile) {
      const filePath = await api.pickJsonFile();
      if (!filePath) { setStatus('Import canceled.'); return; }
      const text = await api.readFile(filePath);
      await importWorkflowsFromText(text);
      return;
    }
    importInputRef.current?.click();
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 p-6 pb-24 text-slate-200">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">FO4 Automation Runner</h1>
            <p className="text-slate-400 mt-1 text-sm">
              Build, save, and run repeatable Fallout 4 modding workflows — launch tools, compile scripts, pack archives, and more.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              to="/reference"
              className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors flex items-center gap-1.5"
              title="Open help reference"
            >
              <BookOpen className="w-3 h-3" /> Help
            </Link>
            <button
              onClick={() => setShowPresets(v => !v)}
              className="px-3 py-2 rounded bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-500/40 text-xs font-semibold flex items-center gap-2 text-indigo-200"
            >
              <Layers className="w-4 h-4" /> FO4 Templates
            </button>
            <button
              onClick={() => exportWorkflows().catch(() => {})}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-2"
              title="Export workflow definitions"
            >
              <ArrowDownToLine className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => importWorkflows().catch(() => {})}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-2"
              title="Import workflow definitions from JSON"
            >
              <Upload className="w-4 h-4" /> Import
            </button>
            <button
              onClick={() => addWorkflow().catch(() => {})}
              className="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-xs font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Workflow
            </button>
          </div>
        </div>

        {/* FO4 Template Panel */}
        {showPresets && (
          <div className="mb-6 p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-indigo-200">FO4 Workflow Templates</h2>
              <button onClick={() => setShowPresets(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Pre-built starting points for common FO4 modding tasks. Paths are examples — update them to match your install before running.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {FO4_PRESETS.map((preset, i) => (
                <div key={i} className="p-3 rounded-lg border border-indigo-800/40 bg-indigo-950/30 hover:border-indigo-600/50 transition-colors">
                  <div className="font-semibold text-xs text-indigo-100 mb-1">{preset.name}</div>
                  <div className="text-[11px] text-slate-400 mb-2 leading-relaxed">{preset.description}</div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(preset.tags || []).map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-900/40 border border-indigo-700/30 text-indigo-300">{t}</span>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2">{preset.steps.length} step{preset.steps.length !== 1 ? 's' : ''}</div>
                  <button
                    onClick={() => installPreset(preset).catch(() => {})}
                    className="w-full px-2 py-1.5 rounded bg-indigo-700 hover:bg-indigo-600 text-xs font-semibold text-white transition-colors"
                  >
                    Install Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden file import input */}
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async () => {
              await importWorkflowsFromText(String(reader.result || ''));
              if (importInputRef.current) importInputRef.current.value = '';
            };
            reader.onerror = () => setStatus('Import failed: could not read file.');
            reader.readAsText(file);
          }}
        />

        {/* Electron required warning */}
        {!canRun && (
          <div className="mb-5 p-4 rounded-lg border border-yellow-700/50 bg-yellow-900/10 text-yellow-200 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Desktop app required to execute steps</div>
              <div className="text-yellow-200/70 text-xs mt-1">You can build and export workflows here, but running them requires the Mossy desktop app.</div>
            </div>
          </div>
        )}

        {/* Status line */}
        {status && (
          <div className="text-xs text-slate-400 font-mono mb-4 break-words">{status}</div>
        )}

        {/* Main layout */}
        <div className="grid grid-cols-12 gap-4">

          {/* ── Workflow list ── */}
          <div className="col-span-12 md:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-3 py-3 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search workflows…"
                  className="w-full bg-slate-900 border border-slate-700 rounded pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-slate-500"
                />
              </div>
              <div className="text-[10px] text-slate-500 shrink-0">{filteredWorkflows.length}/{workflows.length}</div>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {filteredWorkflows.length === 0 && (
                <div className="p-3 text-xs text-slate-500">{search ? 'No matches.' : 'No workflows yet.'}</div>
              )}
              {filteredWorkflows.map(wf => {
                const lastRun = runHistory.find(r => r.workflowId === wf.id);
                return (
                  <button
                    key={wf.id}
                    onClick={() => setSelectedId(wf.id)}
                    className={`w-full text-left p-3 rounded border mb-2 transition-colors ${
                      wf.id === selectedId
                        ? 'bg-emerald-900/20 border-emerald-600/50'
                        : 'bg-slate-900/30 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold text-white truncate flex-1">{wf.name}</div>
                      {lastRun && (
                        <div className={`text-[10px] shrink-0 mt-0.5 ${lastRun.success ? 'text-emerald-400' : 'text-red-400'}`}>
                          {lastRun.success ? '✓' : '✗'}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex gap-2 flex-wrap">
                      <span>{wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}</span>
                      {wf.continueOnError && <span className="text-amber-500/70">continue-on-error</span>}
                    </div>
                    {(wf.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {wf.tags!.map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 border border-slate-700 text-slate-400">{t}</span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Editor pane ── */}
          <div className="col-span-12 md:col-span-8 space-y-4">
            {!selected ? (
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-900 text-slate-500 text-sm">
                Select a workflow to edit, or create a new one.
              </div>
            ) : (
              <>
                {/* Workflow metadata */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200">Workflow Editor</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => duplicateWorkflow().catch(() => {})}
                        className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-1.5"
                        title="Duplicate workflow"
                      >
                        <Copy className="w-3 h-3" /> Duplicate
                      </button>
                      <button
                        onClick={() => upsertSelected({ name: selected.name, description: selected.description }).catch(() => {})}
                        className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Save className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={() => deleteWorkflow().catch(() => {})}
                        className="px-3 py-1.5 rounded bg-red-800/60 hover:bg-red-700/60 border border-red-700/40 text-xs font-semibold flex items-center gap-1.5 text-red-300"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12 md:col-span-6">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Name</label>
                        <input
                          value={selected.name}
                          onChange={e => upsertSelected({ name: e.target.value }).catch(() => {})}
                          className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div className="col-span-12 md:col-span-6">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tags (comma-separated)</label>
                        <input
                          value={(selected.tags || []).join(', ')}
                          onChange={e => upsertSelected({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }).catch(() => {})}
                          placeholder="e.g. papyrus, build, release"
                          className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Description</label>
                      <input
                        value={selected.description || ''}
                        onChange={e => upsertSelected({ description: e.target.value }).catch(() => {})}
                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                        placeholder="What does this workflow do?"
                      />
                    </div>

                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                        <input
                          type="checkbox"
                          checked={!!selected.continueOnError}
                          onChange={e => upsertSelected({ continueOnError: e.target.checked }).catch(() => {})}
                          className="accent-amber-500"
                        />
                        Continue on error (global)
                      </label>
                    </div>

                    {/* Run controls */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => runWorkflow().catch(() => {})}
                        disabled={!canRun || isRunning}
                        className="flex-1 px-3 py-2.5 rounded bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 border border-emerald-500 disabled:border-slate-700 text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-wider transition-colors"
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Running — {formatDuration(runElapsedMs)}
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Run Workflow
                          </>
                        )}
                      </button>
                      {isRunning && (
                        <button
                          onClick={() => { abortRequestedRef.current = true; }}
                          className="px-3 py-2.5 rounded bg-red-800/70 hover:bg-red-700 border border-red-600 text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-wider transition-colors text-red-100"
                        >
                          <X className="w-4 h-4" /> Abort
                        </button>
                      )}
                      <button
                        onClick={() => addStep().catch(() => {})}
                        disabled={isRunning}
                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" /> Add Step
                      </button>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-emerald-400" />
                      Steps
                    </div>
                    <div className="text-[10px] text-slate-400">{selected.steps.length} step{selected.steps.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="p-4 space-y-3">
                    {selected.steps.length === 0 && (
                      <div className="text-xs text-slate-500 py-2">No steps yet — add one above.</div>
                    )}
                    {selected.steps.map((s, idx) => (
                      <StepRow
                        key={s.id}
                        step={s}
                        index={idx}
                        isActive={s.id === activeStepId}
                        isCompleted={completedStepIds.has(s.id)}
                        isFailed={failedStepIds.has(s.id)}
                        onUpdate={updateStep}
                        onDuplicate={id => duplicateStep(id).catch(() => {})}
                        onDelete={deleteStep}
                        onMoveUp={id => moveStep(id, -1).catch(() => {})}
                        onMoveDown={id => moveStep(id, 1).catch(() => {})}
                        isFirst={idx === 0}
                        isLast={idx === selected.steps.length - 1}
                        disabled={isRunning}
                      />
                    ))}
                    {selected.steps.length > 0 && (
                      <button
                        onClick={() => addStep().catch(() => {})}
                        disabled={isRunning}
                        className="w-full mt-2 px-3 py-2 rounded border border-dashed border-slate-700 hover:border-slate-500 text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" /> Add Step
                      </button>
                    )}
                  </div>
                </div>

                {/* Run Log */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-slate-400" />
                      Run Log
                      {isRunning && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-[10px]">{formatDuration(runElapsedMs)}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const text = logs.map(l => `[${l.at}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
                          navigator.clipboard.writeText(text);
                          setStatus('Log copied.');
                        }}
                        className="px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      <button
                        onClick={() => exportRunLog().catch(() => {})}
                        className="px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <ArrowDownToLine className="w-3 h-3" /> Export
                      </button>
                    </div>
                  </div>
                  <div
                    ref={logPanelRef}
                    className="p-4 bg-[#0a0a0f] font-mono text-[11px] max-h-[35vh] overflow-y-auto space-y-0.5"
                  >
                    {logs.length === 0 ? (
                      <div className="text-slate-600 italic">No runs yet — hit Run Workflow to begin.</div>
                    ) : (
                      logs.map((l, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-2 leading-relaxed ${
                            l.level === 'error'   ? 'text-red-300'
                            : l.level === 'warn'  ? 'text-yellow-200'
                            : l.level === 'success' ? 'text-emerald-300'
                            : 'text-slate-300'
                          }`}
                        >
                          <span className="text-slate-600 shrink-0">{l.at}</span>
                          <span className="break-all">{l.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Run History */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Run History
                      <span className="text-slate-500 font-normal text-[10px]">(last 50)</span>
                    </div>
                    <button
                      onClick={() => clearHistory().catch(() => {})}
                      className="px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  </div>
                  <div className="p-4 grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-5">
                      <div className="max-h-[35vh] overflow-y-auto space-y-2">
                        {runHistory.length === 0 ? (
                          <div className="text-xs text-slate-600 italic">No saved runs yet.</div>
                        ) : (
                          runHistory.map(r => (
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
                                <div className={`text-[10px] shrink-0 font-bold ${r.success ? 'text-emerald-300' : 'text-red-300'}`}>
                                  {r.success ? 'OK' : 'FAIL'}
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 flex gap-2">
                                <span>{new Date(r.startedAt).toLocaleString()}</span>
                                {r.durationMs > 0 && <span className="text-slate-600">{formatDuration(r.durationMs)}</span>}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-7">
                      {(() => {
                        const run = runHistory.find(r => r.id === selectedRunId) || null;
                        if (!run) return <div className="text-xs text-slate-600 italic">Select a saved run to inspect.</div>;
                        const text = run.logs.map(l => `[${l.at}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
                        return (
                          <>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {run.success
                                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  : <XCircle className="w-4 h-4 text-red-400" />}
                                <div className="text-xs text-slate-200 font-semibold truncate">{run.workflowName}</div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { navigator.clipboard.writeText(text); setStatus('History run copied.'); }}
                                  className="px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-1.5"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => exportHistoryRun(run).catch(() => {})}
                                  className="px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold flex items-center gap-1.5"
                                >
                                  <ArrowDownToLine className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-500 mb-2 flex gap-3">
                              <span>{run.success ? 'Success' : 'Failed'}</span>
                              <span>{new Date(run.startedAt).toLocaleString()}</span>
                              {run.durationMs > 0 && <span>{formatDuration(run.durationMs)}</span>}
                            </div>
                            <div className="p-3 rounded border border-slate-800 bg-[#0a0a0f] font-mono text-[11px] max-h-[35vh] overflow-y-auto space-y-0.5">
                              {text ? text.split('\n').map((line, i) => (
                                <div
                                  key={i}
                                  className={
                                    line.includes('ERROR') ? 'text-red-300' :
                                    line.includes('WARN')  ? 'text-yellow-200' :
                                    line.includes('SUCCESS') ? 'text-emerald-300' :
                                    'text-slate-300'
                                  }
                                >{line}</div>
                              )) : <span className="text-slate-600 italic">(no log lines)</span>}
                            </div>
                          </>
                        );
                      })()}
                    </div>
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
