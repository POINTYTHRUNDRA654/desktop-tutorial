/**
 * Program Detection Module
 * 
 * Detects installed desktop programs on Windows by:
 * 1. Scanning Program Files directories for executables
 * 2. Reading Windows Registry Uninstall keys (HKLM & HKCU)
 * 3. Providing fallback mechanisms if registry access fails
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { InstalledProgram } from './types';

const execAsync = promisify(exec);

/**
 * Main function to detect installed programs on Windows
 * Combines results from registry and file system scanning
 */
export async function detectPrograms(): Promise<InstalledProgram[]> {
  const programs = new Map<string, InstalledProgram>();

  try {
    // Try to get programs from Windows Registry first (most reliable)
    const registryPrograms = await getRegistryPrograms();
    registryPrograms.forEach(prog => {
      programs.set(prog.path.toLowerCase(), prog);
    });
  } catch (error) {
    console.warn('Registry scan failed, falling back to file system scan:', error);
  }

  try {
    // Scan Program Files directories as fallback or supplement
    const fileSystemPrograms = await scanProgramFiles();
    fileSystemPrograms.forEach(prog => {
      const key = prog.path.toLowerCase();
      if (!programs.has(key)) {
        programs.set(key, prog);
      }
    });
  } catch (error) {
    console.error('File system scan failed:', error);
  }

  // SPECIAL: Check for commonly-requested programs that might be missed
  try {
    const specialPrograms = await findSpecialPrograms();
    specialPrograms.forEach(prog => {
      const key = prog.path.toLowerCase();
      if (!programs.has(key)) {
        programs.set(key, prog);
      }
    });
  } catch (error) {
    console.warn('Special programs scan failed:', error);
  }

  return Array.from(programs.values())
    .filter(p => {
        const pathLower = p.path.toLowerCase();
        // Eliminate typical installer/helper noise that isn't the primary tool
        return !pathLower.includes('unins') && 
               !pathLower.includes('helper') && 
               !pathLower.includes('crashpad') &&
               !pathLower.includes('redist');
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Get installed programs from Windows Registry
 */
async function getRegistryPrograms(): Promise<InstalledProgram[]> {
  const programs: InstalledProgram[] = [];
  
  const registryPaths = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];

  for (const registryPath of registryPaths) {
    try {
      const items = await queryRegistryKeys(registryPath);
      // Validate paths before adding
      for (const item of items) {
          try {
              await fs.access(item.path);
              programs.push(item);
          } catch {
              // Path doesn't exist, skip stale entry
          }
      }
    } catch (error) {
      console.warn(`Failed to query registry path ${registryPath}:`, error);
    }
  }

  return programs;
}

/**
 * Query a specific registry path for installed programs
 */
async function queryRegistryKeys(registryPath: string): Promise<InstalledProgram[]> {
  const programs: InstalledProgram[] = [];

  try {
    // List all subkeys
    const { stdout } = await execAsync(`reg query "${registryPath}"`);
    const subKeys = stdout
      .split('\n')
      .filter((line: string) => line.trim().startsWith(registryPath))
      .map((line: string) => line.trim());

    // Query each subkey for program details
    for (const subKey of subKeys) {
      try {
        const program = await queryRegistryKey(subKey);
        if (program) {
          programs.push(program);
        }
      } catch (error) {
        // Skip entries that can't be read
        continue;
      }
    }
  } catch (error) {
    throw new Error(`Failed to list registry keys at ${registryPath}`);
  }

  return programs;
}

/**
 * Query a specific registry key for program details
 */
async function queryRegistryKey(keyPath: string): Promise<InstalledProgram | null> {
  try {
    const { stdout } = await execAsync(`reg query "${keyPath}"`);
    
    const getValue = (name: string): string | undefined => {
      const regex = new RegExp(`${name}\\s+REG_[A-Z_]+\\s+(.+)`, 'i');
      const match = stdout.match(regex);
      return match ? match[1].trim() : undefined;
    };

    const displayName = getValue('DisplayName');
    const installLocation = getValue('InstallLocation');
    const displayIcon = getValue('DisplayIcon');
    const displayVersion = getValue('DisplayVersion');
    const publisher = getValue('Publisher');

    // Must have a display name to be considered valid
    if (!displayName) {
      return null;
    }

    // Try to find executable path
    let executablePath: string | undefined;

    // First try DisplayIcon (often points to the main executable)
    if (displayIcon) {
      const iconPath = displayIcon.split(',')[0].replace(/"/g, '');
      if (iconPath.toLowerCase().endsWith('.exe')) {
        executablePath = iconPath;
      }
    }

    // If no executable from icon, try to find in InstallLocation
    if (!executablePath && installLocation) {
      const exeFiles = await findExecutablesInDirectory(installLocation);
      if (exeFiles.length > 0) {
        // Prefer executable with same name as program or first one found
        const programNameLower = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
        executablePath = exeFiles.find(exe => 
          path.basename(exe, '.exe').toLowerCase().replace(/[^a-z0-9]/g, '').includes(programNameLower)
        ) || exeFiles[0];
      }
    }

    // Skip if we couldn't find an executable
    if (!executablePath) {
      return null;
    }

    // NEW: Verify the file actually exists on disk. 
    // This prevents stale registry entries (e.g. from an old C: drive install) from polluting the list.
    try {
      await fs.access(executablePath);
    } catch {
      // If we can't access it, try to see if it's quoted or has extra args
      const cleanPath = executablePath.replace(/"/g, '').trim();
      try {
        await fs.access(cleanPath);
        executablePath = cleanPath;
      } catch {
        return null; // Truly not found
      }
    }

    return {
      name: path.basename(executablePath, '.exe'),
      displayName,
      path: executablePath,
      icon: displayIcon?.split(',')[0].replace(/"/g, ''),
      version: displayVersion,
      publisher,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Scan Program Files directories for executables
 * This is the fallback method if registry scanning fails
 */
async function scanProgramFiles(): Promise<InstalledProgram[]> {
  const programs: InstalledProgram[] = [];
  
  // Common Program Files locations
  const programFilesPaths = [
    process.env['ProgramFiles'] || 'C:\\Program Files',
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
    path.join(os.homedir(), 'AppData', 'Local'),
    path.join(os.homedir(), 'AppData', 'Roaming'),
    path.join(os.homedir(), 'AppData', 'Local', 'Programs'),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'scoop', 'apps'),
    path.join(os.homedir(), '.ollama'),
    path.join(os.homedir(), '.lmstudio'),
    'C:\\ProgramData',
    'C:\\AI',
    'C:\\ML',
  ];

  // Search other common drives for program folders
  // ULTRA COMPREHENSIVE SCAN - First impression matters!
  const potentialDrives = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  const commonFolders = [
    // Standard Windows
    'Program Files', 'Program Files (x86)', 'Programs', 'Apps', 'Software', 'Applications',
    // User paths
    'Desktop', 'Documents', 'Downloads', 'Users',
    // AI & ML Tools (CRITICAL - First impression!)
    'AI', 'ML', 'LLM', 'Ollama', 'LM Studio', 'LMStudio', 'Luma', 'LumaAI', 'ComfyUI', 
    'Stable Diffusion', 'StableDiffusion', 'Automatic1111', 'A1111', 'Text-Generation-WebUI',
    'Koboldcpp', 'KoboldAI', 'Oobabooga', 'Jan', 'AnythingLLM', 'GPT4All',
    'NVIDIA', 'NVIDIA Corporation', 'NVIDIA AI', 'CUDA', 'cuDNN',
    // Gaming & Modding
    'Games', 'Modding', 'ModdingTools', 'Tools', 'Utilities', 'GameTools',
    'SteamLibrary', 'SteamLibrary\\steamapps\\common', 'Steam', 'steamapps',
    'GOG Games', 'Epic Games', 'XboxGames', 'Origin Games', 'Uplay',
    // Creative Software
    'Blender Foundation', 'Blender', 'Adobe', 'Autodesk', 'Substance', 'Quixel',
    'DaVinci Resolve', 'OBS Studio', 'GIMP', 'Krita', 'Inkscape',
    // Development
    'Development', 'Dev', 'SDK', 'IDE', 'Python', 'Node', 'npm', 'Anaconda', 'Miniconda',
    'Visual Studio', 'JetBrains', 'VSCode', 'Code',
    // Package Managers
    'Chocolatey', 'scoop', 'winget'
  ];
  
  // Add root of drives and then the folders
  for (const drive of potentialDrives) {
    const driveRoot = `${drive}:\\`;
    // Skip drives that don't exist to save time
    try {
      const driveStats = await fs.stat(driveRoot).catch(() => null);
      if (!driveStats) continue;
      
      programFilesPaths.push(driveRoot); 
      for (const folder of commonFolders) {
         programFilesPaths.push(path.join(driveRoot, folder));
      }
    } catch {
      continue;
    }
  }

  // De-duplicate scan paths
  const uniquePaths = Array.from(new Set(programFilesPaths.map(p => p.toLowerCase())));
  
  for (const normalizedPath of uniquePaths) {
    try {
      // Find the original casing for the path
      const basePath = programFilesPaths.find(p => p.toLowerCase() === normalizedPath) || normalizedPath;
      
      const exists = await fs.access(basePath).then(() => true).catch(() => false);
      if (!exists) continue;

      const dirs = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;

        const dirPath = path.join(basePath, dir.name);
        try {
          // DEEP SCAN: Go up to depth 7 to catch deeply nested programs
          // No filtering - scan everything equally deep
          const executables = await findExecutablesInDirectory(dirPath, 7); 
          
          for (const exePath of executables) {
            const exeName = path.basename(exePath, '.exe');
            const displayName = dir.name.length > 3 && !dir.name.includes(' ') && exeName.toLowerCase().includes(dir.name.toLowerCase()) 
                           ? exeName 
                           : `${dir.name} - ${exeName}`;
            
            programs.push({
              name: exeName,
              displayName: displayName,
              path: exePath,
            });
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      // Skip inaccessible paths
    }
  }

  // BONUS: Scan Desktop for shortcuts (.lnk files) that might point to programs
  try {
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const desktopExists = await fs.access(desktopPath).then(() => true).catch(() => false);
    if (desktopExists) {
      const desktopItems = await fs.readdir(desktopPath, { withFileTypes: true });
      for (const item of desktopItems) {
        // Look for executable files directly on Desktop (portable programs)
        if (item.isFile() && item.name.toLowerCase().endsWith('.exe')) {
          const exePath = path.join(desktopPath, item.name);
          try {
            await fs.access(exePath);
            const exeName = path.basename(exePath, '.exe');
            programs.push({
              name: exeName,
              displayName: `${exeName} (Desktop)`,
              path: exePath,
            });
          } catch {
            // Skip if file is not accessible
          }
        }
      }
    }
  } catch (error) {
    // Silent fail if Desktop scan doesn't work
  }

  return programs;
}

/**
 * Find executable files in a directory (recursively up to maxDepth)
 */
async function findExecutablesInDirectory(
  dirPath: string, 
  maxDepth: number = 7,
  currentDepth: number = 0
): Promise<string[]> {
  const executables: string[] = [];

  if (currentDepth >= maxDepth) {
    return executables;
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip common non-program directories to save time/resources
      const entryLower = entry.name.toLowerCase();
      if (entry.isDirectory() && (
          entryLower === 'node_modules' || 
          entryLower === '.git' || 
          entryLower === 'cache' || 
          entryLower === 'temp' ||
          entryLower === 'windows' ||
          entryLower === 'system32'
      )) {
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
        // Skip uninstallers and setup files
        const nameLower = entry.name.toLowerCase();
        if (!nameLower.includes('unins') && 
            !nameLower.includes('setup') &&
            !nameLower.includes('install')) {
          executables.push(fullPath);
        }
      } else if (entry.isDirectory() && currentDepth + 1 < maxDepth) {
        // Recurse into subdirectories
        try {
          const subExecutables = await findExecutablesInDirectory(
            fullPath, 
            maxDepth, 
            currentDepth + 1
          );
          executables.push(...subExecutables);
        } catch (error) {
          // Skip subdirectories we can't access
          continue;
        }
      }
    }
  } catch (error) {
    // Can't read directory, return what we have
  }

  return executables;
}

/**
 * Launch a program by its executable path
 */
export async function openProgram(programPath: string): Promise<void> {
  if (!programPath) {
    throw new Error('Program path is required');
  }

  try {
    // Verify the file exists (Windows doesn't use X_OK reliably)
    await fs.access(programPath, fs.constants.F_OK);
    
    // Launch the program using spawn for security (no shell interpretation)
    // Use 'cmd.exe /c start' to launch without waiting, but with proper argument separation
    return new Promise<void>((resolve, reject) => {
      const child = spawn('cmd.exe', ['/c', 'start', '""', programPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to open program: ${error.message}`));
      });

      // Detach from parent process
      child.unref();
      
      // Resolve immediately as program is launching
      resolve();
    });
  } catch (error) {
    throw new Error(`Failed to open program at "${programPath}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find special high-priority programs that users commonly request
 * Checks known installation paths for programs like NVIDIA Canvas, Blender, etc.
 */
async function findSpecialPrograms(): Promise<InstalledProgram[]> {
  const programs: InstalledProgram[] = [];
  
  // Define common installation paths for special programs
  const specialPaths = [
    // NVIDIA Canvas (Vita Canvas)
    {
      paths: [
        'C:\\Program Files\\NVIDIA Corporation\\NVIDIA Canvas\\NVIDIACanvas.exe',
        'C:\\Program Files (x86)\\NVIDIA Corporation\\NVIDIA Canvas\\NVIDIACanvas.exe',
        'C:\\Program Files\\NVIDIA\\Canvas\\NVIDIACanvas.exe',
      ],
      displayName: 'NVIDIA Canvas (Vita)',
      name: 'NVIDIACanvas'
    },
    // NVIDIA Omniverse
    {
      paths: [
        'C:\\Program Files\\NVIDIA Corporation\\Omniverse\\Launcher\\omniverse-launcher.exe',
        'C:\\Users\\Public\\NVIDIA\\Omniverse\\Launcher\\omniverse-launcher.exe',
      ],
      displayName: 'NVIDIA Omniverse',
      name: 'Omniverse'
    },
    // Blender (common locations)
    {
      paths: [
        'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender\\blender.exe',
      ],
      displayName: 'Blender',
      name: 'blender'
    },
    // GIMP 3.x (PRIORITIZE newer versions)
    {
      paths: [
        'C:\\Program Files\\GIMP 3\\bin\\gimp-3.0.exe',
        'C:\\Program Files\\GIMP 3\\bin\\gimp.exe',
        'C:\\Program Files (x86)\\GIMP 3\\bin\\gimp-3.0.exe',
        'C:\\Program Files\\GIMP\\bin\\gimp-3.0.exe',
      ],
      displayName: 'GIMP 3',
      name: 'gimp'
    },
    // GIMP 2.x (fallback only if GIMP 3 not found)
    {
      paths: [
        'C:\\Program Files\\GIMP 2\\bin\\gimp-2.10.exe',
        'C:\\Program Files\\GIMP 2\\bin\\gimp-2.99.exe',
        'C:\\Program Files (x86)\\GIMP 2\\bin\\gimp-2.10.exe',
      ],
      displayName: 'GIMP 2',
      name: 'gimp'
    },
  ];

  // Check each special program path
  for (const special of specialPaths) {
    for (const testPath of special.paths) {
      try {
        await fs.access(testPath);
        // File exists! Add it
        programs.push({
          name: special.name,
          displayName: special.displayName,
          path: testPath,
        });
        break; // Found it, no need to check other paths for this program
      } catch {
        // File doesn't exist, try next path
      }
    }
  }

  return programs;
}

/**
 * Get comprehensive system information for AI/modding capabilities
 * This helps Mossy understand what the user's system can handle
 */
export async function getSystemInfo(): Promise<{
  cpu: string;
  ram: string;
  gpu: string[];
  os: string;
  aiCapabilities: string[];
  pythonVersions: string[];
  nodeVersion: string | null;
}> {
  const systemInfo: any = {
    cpu: os.cpus()[0]?.model || 'Unknown CPU',
    ram: `${Math.round(os.totalmem() / (1024 ** 3))} GB`,
    gpu: [],
    os: `${os.platform()} ${os.release()}`,
    aiCapabilities: [],
    pythonVersions: [],
    nodeVersion: null,
  };

  try {
    // Detect GPU using wmic
    const { stdout: gpuOutput } = await execAsync('wmic path win32_VideoController get name');
    systemInfo.gpu = gpuOutput
      .split('\n')
      .slice(1)
      .map(line => line.trim())
      .filter(line => line && line !== 'Name');
  } catch (error) {
    console.warn('Failed to detect GPU:', error);
  }

  try {
    // Check for CUDA (NVIDIA AI capability)
    const cudaPath = process.env['CUDA_PATH'];
    if (cudaPath) {
      systemInfo.aiCapabilities.push('NVIDIA CUDA');
    }
  } catch (error) {
    // Silent fail
  }

  try {
    // Detect Python installations
    const pythonCommands = ['python', 'python3', 'py'];
    for (const cmd of pythonCommands) {
      try {
        const { stdout } = await execAsync(`${cmd} --version`);
        const version = stdout.trim();
        if (version && !systemInfo.pythonVersions.includes(version)) {
          systemInfo.pythonVersions.push(version);
        }
      } catch {
        // Try next command
      }
    }
  } catch (error) {
    // Silent fail
  }

  try {
    // Detect Node.js
    const { stdout } = await execAsync('node --version');
    systemInfo.nodeVersion = stdout.trim();
  } catch (error) {
    // Silent fail
  }

  // Check for AI-specific capabilities based on GPU
  const gpuLower = systemInfo.gpu.join(' ').toLowerCase();
  if (gpuLower.includes('nvidia') && gpuLower.includes('rtx')) {
    systemInfo.aiCapabilities.push('RTX Tensor Cores (AI Acceleration)');
  }
  if (gpuLower.includes('nvidia') && (gpuLower.includes('4090') || gpuLower.includes('4080') || gpuLower.includes('3090'))) {
    systemInfo.aiCapabilities.push('High-End AI Inference');
  }
  if (gpuLower.includes('amd') && gpuLower.includes('rx')) {
    systemInfo.aiCapabilities.push('AMD GPU Compute');
  }

  return systemInfo;
}