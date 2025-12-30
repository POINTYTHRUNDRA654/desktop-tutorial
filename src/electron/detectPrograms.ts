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

  return Array.from(programs.values()).sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  );
}

/**
 * Get installed programs from Windows Registry
 * Queries both HKLM and HKCU Uninstall registry keys
 */
async function getRegistryPrograms(): Promise<InstalledProgram[]> {
  const programs: InstalledProgram[] = [];
  
  // Registry paths to check
  const registryPaths = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];

  for (const registryPath of registryPaths) {
    try {
      const items = await queryRegistryKeys(registryPath);
      programs.push(...items);
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
  ];

  for (const basePath of programFilesPaths) {
    try {
      const exists = await fs.access(basePath).then(() => true).catch(() => false);
      if (!exists) continue;

      const dirs = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;

        const dirPath = path.join(basePath, dir.name);
        try {
          const executables = await findExecutablesInDirectory(dirPath, 2); // Max depth 2
          
          for (const exePath of executables) {
            programs.push({
              name: path.basename(exePath, '.exe'),
              displayName: dir.name,
              path: exePath,
            });
          }
        } catch (error) {
          // Skip directories we can't read
          continue;
        }
      }
    } catch (error) {
      console.warn(`Failed to scan ${basePath}:`, error);
    }
  }

  return programs;
}

/**
 * Find executable files in a directory (recursively up to maxDepth)
 */
async function findExecutablesInDirectory(
  dirPath: string, 
  maxDepth: number = 1,
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
