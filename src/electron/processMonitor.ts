
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
];

/**
 * Get a list of running processes that match our modding tools list
 */
export async function getRunningModdingTools(): Promise<RunningProcess[]> {
  try {
    // Windows tasklist command
    // /V provides window titles
    // /FO CSV provides comma-separated values for easier parsing
    // /NH removes column headers
    const { stdout } = await execAsync('tasklist /V /FO CSV /NH');
    
    const lines = stdout.split('\r\n').filter(line => line.trim().length > 0);
    const runningTools: RunningProcess[] = [];

    for (const line of lines) {
      // CSV format usually: "Image Name","PID","Session Name","Session#","Mem Usage","Status","User Name","CPU Time","Window Title"
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
            windowTitle
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
