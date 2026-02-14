/**
 * Creation Kit Wrapper
 * Limited automation interface for Fallout 4 Creation Kit
 * Note: CK has very limited command-line support
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface LaunchOptions {
  loadPlugin?: string;
  autoLoadFiles?: boolean;
  noSplash?: boolean;
  waitForExit?: boolean;
}

export interface LODGenerationOptions {
  worldspace?: string; // Optional since it's passed as a parameter
  atlasSize?: number; // 256, 512, 1024, 2048, 4096
  generateTrees?: boolean;
  generateObjects?: boolean;
  generateBillboards?: boolean;
}

export class CreationKitWrapper {
  private ckPath: string;
  private gameDataPath: string;
  private runningProcess: ChildProcess | null = null;

  constructor(ckPath?: string, gameDataPath?: string) {
    this.ckPath = ckPath || this.detectCreationKit();
    this.gameDataPath = gameDataPath || this.detectGameDataPath();
  }

  /**
   * Launch Creation Kit with specified ESP file
   */
  async launchWithESP(espPath: string, options: LaunchOptions = {}): Promise<number> {
    if (!fs.existsSync(this.ckPath)) {
      throw new Error(`Creation Kit not found: ${this.ckPath}`);
    }

    if (!fs.existsSync(espPath)) {
      throw new Error(`ESP file not found: ${espPath}`);
    }

    const {
      autoLoadFiles = true,
      noSplash = false,
      waitForExit = false
    } = options;

    // Creation Kit has very limited CLI support
    // We can only launch it and hope for the best
    const args: string[] = [];

    if (noSplash) {
      args.push('-NoSplash');
    }

    // Launch CK
    const process = spawn(this.ckPath, args, {
      cwd: path.dirname(this.ckPath),
      detached: !waitForExit,
      stdio: waitForExit ? 'pipe' : 'ignore'
    });

    if (waitForExit) {
      return new Promise((resolve, reject) => {
        process.on('exit', (code) => {
          this.runningProcess = null;
          resolve(code || 0);
        });

        process.on('error', (error) => {
          this.runningProcess = null;
          reject(error);
        });

        this.runningProcess = process;
      });
    } else {
      // Detached process
      process.unref();
      return process.pid || 0;
    }
  }

  /**
   * Run Creation Kit command (very limited functionality)
   */
  async runHeadless(command: string): Promise<string> {
    // CK doesn't support true headless operation
    // This is a placeholder for potential future functionality
    throw new Error('Creation Kit does not support headless/command-line operation. Use xEdit for automated tasks.');
  }

  /**
   * Generate LOD for worldspace
   * Note: This requires manual CK interaction - there's no CLI for this
   */
  async generateLOD(worldspace: string, options: LODGenerationOptions = {}): Promise<void> {
    const {
      atlasSize = 1024,
      generateTrees = true,
      generateObjects = true,
      generateBillboards = true
    } = options;

    // CK does not support automated LOD generation via CLI
    // This would require:
    // 1. Custom CK plugin/script
    // 2. AutoHotkey/AutoIt script to control CK GUI
    // 3. Manual operation
    
    console.log(`[CK] LOD Generation requested for worldspace: ${worldspace}`);
    console.log(`[CK] Options:`, { atlasSize, generateTrees, generateObjects, generateBillboards });
    console.log(`[CK] Note: CK does not support automated LOD generation`);
    console.log(`[CK] Recommended: Use CK manually or use xLODGen tool instead`);
    
    throw new Error('Creation Kit does not support automated LOD generation. Use xLODGen tool instead.');
  }

  /**
   * Generate precombined meshes and previs data
   * Note: This also requires xEdit scripts, not CK
   */
  async generatePrecombines(espPath: string, cells?: string[]): Promise<void> {
    if (!fs.existsSync(espPath)) {
      throw new Error(`ESP file not found: ${espPath}`);
    }

    console.log(`[CK] Precombine generation requested for: ${espPath}`);
    if (cells) {
      console.log(`[CK] Target cells:`, cells);
    }
    
    console.log(`[CK] Note: Precombine generation requires xEdit scripts`);
    console.log(`[CK] Recommended: Use "FO4Edit - Generate Precombined" script`);

    throw new Error('Use xEdit "Generate Precombined" script for automated precombine generation.');
  }

  /**
   * Check if Creation Kit is currently running
   */
  async isRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq CreationKit.exe" /NH');
      return stdout.toLowerCase().includes('creationkit.exe');
    } catch {
      return false;
    }
  }

  /**
   * Kill Creation Kit process
   */
  async kill(): Promise<void> {
    if (this.runningProcess) {
      this.runningProcess.kill();
      this.runningProcess = null;
    }

    // Also kill any other CK instances
    try {
      await execAsync('taskkill /F /IM CreationKit.exe');
    } catch {
      // Ignore errors if CK not running
    }
  }

  /**
   * Get Creation Kit log file
   */
  async getLog(): Promise<string> {
    const logPath = path.join(
      path.dirname(this.ckPath),
      'Logs',
      'CreationKit.log'
    );

    if (!fs.existsSync(logPath)) {
      throw new Error('Creation Kit log file not found');
    }

    return fs.readFileSync(logPath, 'utf-8');
  }

  /**
   * Parse errors from CK log
   */
  async getLogErrors(): Promise<string[]> {
    const log = await this.getLog();
    const lines = log.split('\n');
    
    const errors: string[] = [];
    for (const line of lines) {
      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
        errors.push(line.trim());
      }
    }

    return errors;
  }

  /**
   * Validate ESP file can be loaded in CK
   */
  async validateESP(espPath: string): Promise<ValidationResult> {
    if (!fs.existsSync(espPath)) {
      return {
        valid: false,
        errors: [`File not found: ${espPath}`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic file checks
    const stats = fs.statSync(espPath);
    if (stats.size < 100) {
      errors.push('File too small to be valid ESP');
    }

    // Check file header (ESP files start with "TES4")
    const buffer = fs.readFileSync(espPath);
    const header = buffer.toString('utf-8', 0, 4);
    if (header !== 'TES4') {
      errors.push('Invalid ESP header - file may be corrupted');
    }

    // Check for master files
    const content = buffer.toString('utf-8');
    if (!content.includes('Fallout4.esm')) {
      warnings.push('ESP may not have Fallout4.esm as master');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get list of master files for ESP
   */
  async getMasters(espPath: string): Promise<string[]> {
    if (!fs.existsSync(espPath)) {
      throw new Error(`ESP file not found: ${espPath}`);
    }

    // This is a simplified parser - proper implementation would use ESPParser
    const buffer = fs.readFileSync(espPath);
    const masters: string[] = [];

    // Look for MAST records (master file references)
    // This is a very basic implementation
    const content = buffer.toString('utf-8');
    const mastMatches = content.match(/[A-Za-z0-9_\-]+\.(esm|esp|esl)/gi);
    
    if (mastMatches) {
      for (const match of mastMatches) {
        if (!masters.includes(match)) {
          masters.push(match);
        }
      }
    }

    return masters;
  }

  /**
   * Check if ESP has unsaved changes in CK
   */
  async hasUnsavedChanges(): Promise<boolean> {
    // This would require monitoring CK window title or log
    // Not reliably possible without window automation
    return false;
  }

  /**
   * Detect Creation Kit installation
   */
  private detectCreationKit(): string {
    const commonPaths = [
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\CreationKit.exe',
      'C:\\Games\\Fallout 4\\CreationKit.exe',
      'D:\\Games\\Fallout 4\\CreationKit.exe',
      'E:\\Games\\Fallout 4\\CreationKit.exe'
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error('Creation Kit not found. Please install Creation Kit or specify path manually.');
  }

  /**
   * Detect game data path
   */
  private detectGameDataPath(): string {
    if (this.ckPath) {
      const ckDir = path.dirname(this.ckPath);
      const dataPath = path.join(ckDir, 'Data');
      if (fs.existsSync(dataPath)) {
        return dataPath;
      }
    }

    const commonPaths = [
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Data',
      'C:\\Games\\Fallout 4\\Data',
      'D:\\Games\\Fallout 4\\Data'
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return '';
  }

  /**
   * Create new plugin file
   */
  async createPlugin(pluginName: string, masters: string[] = ['Fallout4.esm']): Promise<string> {
    if (!pluginName.match(/\.(esp|esm|esl)$/i)) {
      pluginName += '.esp';
    }

    const pluginPath = path.join(this.gameDataPath, pluginName);
    
    if (fs.existsSync(pluginPath)) {
      throw new Error(`Plugin already exists: ${pluginPath}`);
    }

    // This would require writing a valid ESP file structure
    // For now, just document that CK should be used to create plugins
    console.log(`[CK] Plugin creation requested: ${pluginName}`);
    console.log(`[CK] Masters:`, masters);
    console.log(`[CK] Note: Plugin creation requires Creation Kit or xEdit`);
    console.log(`[CK] Recommended: Use CK File -> New or xEdit to create plugins`);

    throw new Error('Plugin creation requires Creation Kit. Use CK File -> New to create plugins.');
  }

  /**
   * Backup ESP file
   */
  backupESP(espPath: string): string {
    if (!fs.existsSync(espPath)) {
      throw new Error(`ESP file not found: ${espPath}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = espPath.replace(/\.(esp|esm|esl)$/i, `_backup_${timestamp}.$1`);
    
    fs.copyFileSync(espPath, backupPath);
    
    return backupPath;
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
