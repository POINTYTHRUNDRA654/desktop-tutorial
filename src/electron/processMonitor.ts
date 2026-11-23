
import { exec } from 'child_process';
import { promisify } from 'util';
import { probeProcessList } from './systemProbe';

const execAsync = promisify(exec);

// Guards against overlapping `tasklist` invocations. Multiple callers (CK Crash Prevention's
// live monitor, External Tools Hub, chat context, etc.) can request this concurrently; without
// dedupe + a hard timeout, a single slow/AV-intercepted `tasklist` call causes every subsequent
// poll tick to spawn its own orphaned cmd.exe/tasklist.exe/conhost.exe that never gets cleaned up.
let inFlight: Promise<RunningProcess[]> | null = null;
const TASKLIST_TIMEOUT_MS = 8000;

export interface RunningProcess {
  name: string;
  pid: number;
  memory: string;
  windowTitle?: string;
}

/**
 * Modding tools we want to monitor specifically
 */
const MODDING_TOOLS = [
  'Blender',
  'CreationKit',
  'Creation Kit',
  'xEdit',
  'FO4Edit',
  'OutfitStudio',
  'BodySlide',
  'NifSkope',
  'Substance Painter',
  'Material Editor',
  'Archive2',
  'CapricaPapyrusCompiler',
  'Fallout4',
  // Mod managers
  'ModOrganizer',
  'Mod Organizer',
  'Vortex',
  'WryeBash',
  'Wrye Bash',
  'LOOT',
  // AI tools
  'ComfyUI',
  'Upscayl',
  'upscayl',
  // Script extender / INI tools
  'f4se_loader',
  'F4SE',
  'BethINI',
  // Archive / packaging
  'BA2Builder',
];

/**
 * Get a list of running processes that match our modding tools list
 */
export async function getRunningModdingTools(): Promise<RunningProcess[]> {
  // Shared 3 s cache (2026-11-20): MO2's bridge polls every 5 s, CK Crash Prevention every 3 s and chat on
  // demand; they all get the same answer instead of each starting a process list.
  if (lastResult && Date.now() - lastResult.at < RESULT_CACHE_MS) return lastResult.tools;
  if (inFlight) return inFlight;
  inFlight = listViaProbeOrTasklist()
    .then(tools => { lastResult = { at: Date.now(), tools }; return tools; })
    .finally(() => { inFlight = null; });
  return inFlight;
}

const RESULT_CACHE_MS = 3000;
let lastResult: { at: number; tools: RunningProcess[] } | null = null;

const isModdingTool = (name: string, windowTitle: string) => MODDING_TOOLS.some(tool =>
  name.toLowerCase().includes(tool.toLowerCase()) ||
  windowTitle.toLowerCase().includes(tool.toLowerCase())
);

/** The long-lived probe helper first (~100 ms, no new process); `tasklist /V` only if the helper isn't available.
 *  Measured 2026-11-20: tasklist /V took 34 s on a busy PC and was killed by its own 8 s timeout every time. */
async function listViaProbeOrTasklist(): Promise<RunningProcess[]> {
  const all = await probeProcessList();
  if (all) {
    return all.filter(p => isModdingTool(p.name, p.windowTitle))
      .map(p => ({ name: p.name, pid: p.pid, memory: p.memory, windowTitle: p.windowTitle }));
  }
  return runTasklist();
}

async function runTasklist(): Promise<RunningProcess[]> {
  try {
    // Windows tasklist command
    // /V provides window titles
    // /FO CSV provides comma-separated values for easier parsing
    // /NH removes column headers
    // timeout: kills the child process if it hangs (e.g. AV intercepting the new process
    // launch) instead of leaving an orphaned cmd.exe/tasklist.exe/conhost.exe behind forever.
    const { stdout } = await execAsync('tasklist /V /FO CSV /NH', { timeout: TASKLIST_TIMEOUT_MS });

    const lines = stdout.split('\r\n').filter(line => line.trim().length > 0);
    const runningTools: RunningProcess[] = [];

    for (const line of lines) {
      // CSV format: "Image Name","PID","Session Name","Session#","Mem Usage","Status","User Name","CPU Time","Window Title"
      const parts = line.split('","').map(part => part.replace(/^"|"$/g, ''));

      if (parts.length >= 9) {
        const name = parts[0];
        const pid = parseInt(parts[1], 10);
        const mem = parts[4];
        const windowTitle = parts[8];

        const isModdingTool = MODDING_TOOLS.some(tool =>
          name.toLowerCase().includes(tool.toLowerCase()) ||
          windowTitle.toLowerCase().includes(tool.toLowerCase())
        );

        if (isModdingTool) {
          runningTools.push({
            name,
            pid,
            memory: mem,
            windowTitle,
          });
        }
      }
    }

    return runningTools;
  } catch (error) {
    console.error('Error fetching running processes:', error);
    return [];
  }
}
