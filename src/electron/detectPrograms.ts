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
    path.join(os.homedir(), 'scoop', 'apps'),
    'C:\\ProgramData',
  ];

  // Search other common drives for program folders
  // AGGRESSIVE SCAN - check all drives and common installation folders
  const potentialDrives = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Z'];
  const commonFolders = [
    'Program Files', 'Program Files (x86)', 'Programs', 'Apps', 'Software',
    'Games', 'Modding', 'ModdingTools', 'Tools', 'Utilities', 'GameTools',
    'SteamLibrary', 'SteamLibrary\\steamapps\\common',
    'GOG Games', 'Epic Games', 'XboxGames',
    'Blender Foundation', 'Adobe', 'Autodesk', 'NVIDIA Corporation',
    'Development', 'SDK', 'IDE'
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
    // Verify the file exists and is executable
    await fs.access(programPath, fs.constants.X_OK);
    
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
    throw new Error(`Failed to open program: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
