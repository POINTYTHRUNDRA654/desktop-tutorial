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
  console.log('[Program Detection] Starting comprehensive program scan...');

  try {
    // Try to get programs from Windows Registry first (most reliable)
    const registryPrograms = await getRegistryPrograms();
    console.log(`[Program Detection] Found ${registryPrograms.length} programs from Windows Registry`);
    registryPrograms.forEach(prog => {
      programs.set(prog.path.toLowerCase(), prog);
    });
  } catch (error) {
    console.warn('Registry scan failed, falling back to file system scan:', error);
  }

  try {
    // Scan Program Files directories as fallback or supplement
    const fileSystemPrograms = await scanProgramFiles();
    console.log(`[Program Detection] Found ${fileSystemPrograms.length} programs from file system scan`);
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

  // SPECIAL: Detect Visual C++ Redistributable via DLL presence + registry
  // (It has no standalone .exe so normal scanning misses it entirely)
  try {
    const vcRedistEntry = await checkVCRedistInstalled();
    if (vcRedistEntry) {
      const key = vcRedistEntry.path.toLowerCase();
      if (!programs.has(key)) {
        programs.set(key, vcRedistEntry);
      }
    }
  } catch (error) {
    console.warn('VC++ Redistributable check failed:', error);
  }

  const finalList = Array.from(programs.values())
    .filter(p => {
        const pathLower = p.path.toLowerCase();
        // Eliminate typical installer/helper noise that isn't the primary tool.
        // Note: vcruntime140.dll and msvcp140.dll paths do NOT contain these strings,
        // so the VC++ synthetic entry added above is never filtered out here.
        return !pathLower.includes('unins') && 
               !pathLower.includes('helper') && 
               !pathLower.includes('crashpad') &&
               // Only filter standalone redist installer EXEs (e.g. vc_redist.x64.exe),
               // not system DLLs. Check the filename, not the full path.
               !path.basename(pathLower).startsWith('vc_redist') &&
               !path.basename(pathLower).startsWith('vcredist');
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  
  console.log(`[Program Detection] Total programs detected: ${finalList.length} (after filtering)`);
  return finalList;
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

/** Timeout for the wmic drive-listing command (ms). Fast CLI tool; 6 s is generous. */
const WMIC_TIMEOUT_MS = 6000;
/** Timeout for the PowerShell drive-listing fallback (ms). PS startup adds overhead. */
const POWERSHELL_TIMEOUT_MS = 8000;
/** Matches a bare Windows drive letter returned by `wmic logicaldisk get name` (e.g. "C:"). */
const WMIC_DRIVE_RE = /^[A-Za-z]:$/;
/** Matches a Windows drive root with trailing backslash (e.g. "C:\"). */
const DRIVE_ROOT_RE = /^[A-Za-z]:\\$/;

/**
 * Enumerate all currently-mounted Windows drive roots (e.g. ['C:\\', 'D:\\', 'E:\\']).
 *
 * Strategy (most reliable → least):
 *  1. `wmic logicaldisk get name` — fast, authoritative
 *  2. PowerShell `(Get-PSDrive -PSProvider FileSystem).Root` — fallback
 *  3. Blind A-Z probe via fs.stat — last resort
 */
async function getWindowsDriveRoots(): Promise<string[]> {
  // Strategy 1: wmic
  try {
    const { stdout } = await execAsync('wmic logicaldisk get name', { timeout: WMIC_TIMEOUT_MS });
    const letters = stdout
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => WMIC_DRIVE_RE.test(l))
      .map(l => `${l.toUpperCase()}\\`);
    if (letters.length > 0) return letters;
  } catch { /* fall through */ }

  // Strategy 2: PowerShell
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "(Get-PSDrive -PSProvider FileSystem).Root"',
      { timeout: POWERSHELL_TIMEOUT_MS }
    );
    const roots = stdout
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => DRIVE_ROOT_RE.test(l))
      .map(l => l.toUpperCase());
    if (roots.length > 0) return roots;
  } catch { /* fall through */ }

  // Strategy 3: blind A-Z probe
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const found: string[] = [];
  await Promise.all(
    letters.map(async (l) => {
      const root = `${l}:\\`;
      const exists = await fs.stat(root).then(() => true).catch(() => false);
      if (exists) found.push(root);
    })
  );
  return found.sort();
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

  // Enumerate actual mounted drives rather than probing all 26 letters blindly
  const driveRoots = await getWindowsDriveRoots();

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
  
  // Expand each detected drive root with common folder candidates
  for (const driveRoot of driveRoots) {
    programFilesPaths.push(driveRoot);
    for (const folder of commonFolders) {
      programFilesPaths.push(path.join(driveRoot, folder));
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
 * Detect whether Visual C++ Redistributable is installed.
 *
 * VC++ Redistributable has no standalone launcher .exe — it installs runtime
 * DLLs into C:\Windows\System32 (x64) and C:\Windows\SysWOW64 (x86).
 * Normal registry scanning skips it because it cannot find an executable path.
 *
 * Strategy (first match wins):
 *   1. Check for vcruntime140.dll / msvcp140.dll in System32 (most reliable)
 *   2. Query the Uninstall registry for a "Microsoft Visual C++" DisplayName
 *      (covers older 2013/2015/2017/2019/2022 installs in both 32- and 64-bit hives)
 */
async function checkVCRedistInstalled(): Promise<InstalledProgram | null> {
  // ── Strategy 1: DLL existence check ─────────────────────────────────────
  // vcruntime140.dll is present for both x64 (System32) and x86 (SysWOW64) installs.
  const dllCandidates = [
    'C:\\Windows\\System32\\vcruntime140.dll',
    'C:\\Windows\\System32\\msvcp140.dll',
    'C:\\Windows\\SysWOW64\\vcruntime140.dll',
    'C:\\Windows\\SysWOW64\\msvcp140.dll',
  ];

  for (const dllPath of dllCandidates) {
    try {
      await fs.access(dllPath);
      console.log(`[Program Detection] Visual C++ Redistributable confirmed via DLL: ${dllPath}`);
      return {
        name: 'vcruntime140',
        displayName: 'Microsoft Visual C++ Redistributable',
        path: dllPath,
        publisher: 'Microsoft Corporation',
      };
    } catch {
      // DLL not found at this path, try next
    }
  }

  // ── Strategy 2: Registry DisplayName scan ───────────────────────────────
  const regHives = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];

  for (const hive of regHives) {
    try {
      const { stdout } = await execAsync(`reg query "${hive}" /f "Microsoft Visual C++" /s /t REG_SZ /v DisplayName`, { timeout: 8000 });
      if (stdout && stdout.toLowerCase().includes('microsoft visual c++')) {
        // Extract a version hint from the output if available
        const versionMatch = stdout.match(/Microsoft Visual C\+\+ (\d{4}[^"]*?)(?:\s+\(|"|$)/i);
        const versionHint = versionMatch ? versionMatch[1].trim() : '';
        console.log(`[Program Detection] Visual C++ Redistributable confirmed via registry (${hive})`);
        return {
          name: 'vcruntime140',
          displayName: versionHint
            ? `Microsoft Visual C++ ${versionHint} Redistributable`
            : 'Microsoft Visual C++ Redistributable',
          // Use a path that exists on any Windows system so the entry survives validation
          path: 'C:\\Windows\\System32\\vcruntime140.dll',
          publisher: 'Microsoft Corporation',
        };
      }
    } catch {
      // reg query returned non-zero (no match) or timed out — try next hive
    }
  }

  console.log('[Program Detection] Visual C++ Redistributable not found');
  return null;
}

/**
 * Find special high-priority programs that users commonly request
 * Checks known installation paths for programs like NVIDIA Canvas, Blender, etc.
 * NOW SCANS ALL DETECTED DRIVES, not just C:\ and D:\
 */
async function findSpecialPrograms(): Promise<InstalledProgram[]> {
  const programs: InstalledProgram[] = [];
  
  // Get all mounted drives dynamically
  const driveRoots = await getWindowsDriveRoots();
  console.log(`[Program Detection] Scanning ${driveRoots.length} mounted drives: ${driveRoots.join(', ')}`);
  
  // Define path templates (without drive letter) for special programs
  // These will be combined with all detected drives
  const specialPathTemplates = [
    // NVIDIA Canvas (Vita Canvas)
    {
      templates: [
        'Program Files\\NVIDIA Corporation\\NVIDIA Canvas\\Canvas.exe',
        'Program Files (x86)\\NVIDIA Corporation\\NVIDIA Canvas\\Canvas.exe',
        'Program Files\\NVIDIA\\Canvas\\Canvas.exe',
        'Program Files\\NVIDIA Corporation\\NVIDIA Canvas\\NVIDIACanvas.exe',
        'Program Files (x86)\\NVIDIA Corporation\\NVIDIA Canvas\\NVIDIACanvas.exe',
        'Program Files\\NVIDIA\\Canvas\\NVIDIACanvas.exe',
      ],
      displayName: 'NVIDIA Canvas (Vita)',
      name: 'NVIDIACanvas'
    },
    // NVIDIA Omniverse
    {
      templates: [
        'Program Files\\omniverse-launcher\\omniverse-launcher.exe',
        'Program Files\\NVIDIA Corporation\\Omniverse\\Launcher\\omniverse-launcher.exe',
      ],
      specialPaths: [
        'C:\\Users\\Public\\NVIDIA\\Omniverse\\Launcher\\omniverse-launcher.exe',
      ],
      displayName: 'NVIDIA Omniverse',
      name: 'Omniverse'
    },
    // Blender (common locations — 4.5/4.4 first for PyNifly 25+ compatibility)
    {
      templates: [
        'Program Files\\Blender Foundation\\Blender 4.5\\blender.exe',
        'Program Files\\Blender Foundation\\Blender 4.4\\blender.exe',
        'Program Files\\Blender Foundation\\Blender 4.3\\blender.exe',
        'Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
        'Program Files\\Blender Foundation\\Blender 4.1\\blender.exe',
        'Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
        'Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
        'Program Files\\Blender Foundation\\Blender\\blender.exe',
      ],
      displayName: 'Blender',
      name: 'blender'
    },
    // Fallout 4 Creation Kit
    {
      templates: [
        'Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\CreationKit.exe',
        'Program Files\\Steam\\steamapps\\common\\Fallout 4\\CreationKit.exe',
        'SteamLibrary\\steamapps\\common\\Fallout 4\\CreationKit.exe',
        'Games\\Steam\\steamapps\\common\\Fallout 4\\CreationKit.exe',
      ],
      displayName: 'Fallout 4 Creation Kit',
      name: 'CreationKit'
    },
    // xEdit/FO4Edit
    {
      templates: [
        'Program Files\\FO4Edit\\FO4Edit.exe',
        'Program Files (x86)\\FO4Edit\\FO4Edit.exe',
        'Modding\\xEdit\\FO4Edit.exe',
        'Tools\\FO4Edit\\FO4Edit.exe',
        'ModdingTools\\FO4Edit\\FO4Edit.exe',
      ],
      displayName: 'FO4Edit (xEdit)',
      name: 'FO4Edit'
    },
    // LOOT
    {
      templates: [
        'Program Files\\LOOT\\LOOT.exe',
        'Program Files (x86)\\LOOT\\LOOT.exe',
        'Modding\\LOOT\\LOOT.exe',
        'Tools\\LOOT\\LOOT.exe',
      ],
      displayName: 'LOOT (Load Order Optimization Tool)',
      name: 'LOOT'
    },
    // NifSkope
    {
      templates: [
        'Program Files\\NifSkope\\NifSkope.exe',
        'Program Files (x86)\\NifSkope\\NifSkope.exe',
        'Modding\\NifSkope\\NifSkope.exe',
        'Tools\\NifSkope\\NifSkope.exe',
      ],
      displayName: 'NifSkope',
      name: 'NifSkope'
    },
    // F4SE (Fallout 4 Script Extender)
    {
      templates: [
        'Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\f4se_loader.exe',
        'Program Files\\Steam\\steamapps\\common\\Fallout 4\\f4se_loader.exe',
        'SteamLibrary\\steamapps\\common\\Fallout 4\\f4se_loader.exe',
        'Games\\Steam\\steamapps\\common\\Fallout 4\\f4se_loader.exe',
      ],
      displayName: 'F4SE (Fallout 4 Script Extender)',
      name: 'f4se_loader'
    },
    // Papyrus Compiler
    {
      templates: [
        'Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Papyrus Compiler\\PapyrusCompiler.exe',
        'Program Files\\Steam\\steamapps\\common\\Fallout 4\\Papyrus Compiler\\PapyrusCompiler.exe',
        'SteamLibrary\\steamapps\\common\\Fallout 4\\Papyrus Compiler\\PapyrusCompiler.exe',
      ],
      displayName: 'Papyrus Compiler',
      name: 'PapyrusCompiler'
    },
    // Visual Studio Code (for Papyrus scripting)
    {
      templates: [
        'Program Files\\Microsoft VS Code\\Code.exe',
        'Program Files\\Microsoft VS Code\\bin\\code.cmd',
      ],
      specialPaths: [
        path.join(os.homedir(), 'AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe'),
      ],
      displayName: 'Visual Studio Code',
      name: 'Code'
    },
    // 7-Zip (for BSA/BA2 archives)
    {
      templates: [
        'Program Files\\7-Zip\\7zFM.exe',
        'Program Files (x86)\\7-Zip\\7zFM.exe',
      ],
      displayName: '7-Zip',
      name: '7zFM'
    },
    // Everything (file search tool)
    {
      templates: [
        'Program Files\\Everything\\Everything.exe',
        'Program Files (x86)\\Everything\\Everything.exe',
      ],
      displayName: 'Everything (File Search)',
      name: 'Everything'
    },
    // Notepad++ (script editing)
    {
      templates: [
        'Program Files\\Notepad++\\notepad++.exe',
        'Program Files (x86)\\Notepad++\\notepad++.exe',
      ],
      displayName: 'Notepad++',
      name: 'notepad++'
    },
    // Git (version control)
    {
      templates: [
        'Program Files\\Git\\cmd\\git.exe',
        'Program Files\\Git\\bin\\git.exe',
      ],
      displayName: 'Git',
      name: 'git'
    },
    // GIMP 3.x (PRIORITIZE newer versions)
    {
      templates: [
        'Program Files\\GIMP 3\\bin\\gimp-3.0.exe',
        'Program Files\\GIMP 3\\bin\\gimp.exe',
        'Program Files (x86)\\GIMP 3\\bin\\gimp-3.0.exe',
        'Program Files\\GIMP\\bin\\gimp-3.0.exe',
      ],
      displayName: 'GIMP 3',
      name: 'gimp'
    },
    // GIMP 2.x (fallback only if GIMP 3 not found)
    {
      templates: [
        'Program Files\\GIMP 2\\bin\\gimp-2.10.exe',
        'Program Files\\GIMP 2\\bin\\gimp-2.99.exe',
        'Program Files (x86)\\GIMP 2\\bin\\gimp-2.10.exe',
      ],
      displayName: 'GIMP 2',
      name: 'gimp'
    },
  ];

  // Check each special program by combining templates with all detected drives
  for (const special of specialPathTemplates) {
    let found = false;
    
    // First, generate paths for all drives
    const pathsToCheck: string[] = [];
    
    // Add drive-based paths
    if (special.templates) {
      for (const driveRoot of driveRoots) {
        for (const template of special.templates) {
          pathsToCheck.push(path.join(driveRoot, template));
        }
      }
    }
    
    // Add any special hardcoded paths (e.g., user-specific paths)
    if (special.specialPaths) {
      pathsToCheck.push(...special.specialPaths);
    }
    
    // Now check all generated paths
    for (const testPath of pathsToCheck) {
      try {
        await fs.access(testPath);
        // File exists! Add it
        programs.push({
          name: special.name,
          displayName: special.displayName,
          path: testPath,
        });
        found = true;
        break; // Found it, no need to check other paths for this program
      } catch {
        // File doesn't exist, try next path
      }
    }
    
    if (found) {
      continue; // Move to next program
    }
  }

  console.log(`[Program Detection] Found ${programs.length} special programs across all drives`);
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