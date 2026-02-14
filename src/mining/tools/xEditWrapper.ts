/**
 * xEdit (FO4Edit) Wrapper
 * Specialized interface for xEdit automation tasks
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface CleanMasterOptions {
  quickClean?: boolean;
  createBackup?: boolean;
  autoExit?: boolean;
}

export interface ScriptOptions {
  autoExit?: boolean;
  captureLog?: boolean;
  parameters?: Record<string, any>;
}

export interface CSVExportOptions {
  outputPath?: string;
  includeDeleted?: boolean;
  includeIgnored?: boolean;
}

export class XEditWrapper {
  private executablePath: string;
  private gameDataPath: string;
  private scriptsPath: string;

  constructor(executablePath: string, gameDataPath?: string) {
    this.executablePath = executablePath;
    this.gameDataPath = gameDataPath || this.detectGameDataPath();
    this.scriptsPath = path.join(path.dirname(executablePath), 'Edit Scripts');
  }

  /**
   * Clean master files (remove ITM and UDR records)
   */
  async cleanMaster(espPath: string, options: CleanMasterOptions = {}): Promise<void> {
    const {
      quickClean = true,
      createBackup = true,
      autoExit = true
    } = options;

    if (!fs.existsSync(espPath)) {
      throw new Error(`ESP file not found: ${espPath}`);
    }

    if (!fs.existsSync(this.executablePath)) {
      throw new Error(`xEdit executable not found: ${this.executablePath}`);
    }

    // Create backup if requested
    if (createBackup) {
      const backupPath = espPath + '.backup';
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(espPath, backupPath);
      }
    }

    const pluginName = path.basename(espPath);
    const args = [
      quickClean ? '-quickautoclean' : '-autoclean',
      `-plugin:"${pluginName}"`
    ];

    if (autoExit) {
      args.push('-autoexit');
    }

    try {
      await execFileAsync(this.executablePath, args, {
        cwd: path.dirname(espPath),
        maxBuffer: 10 * 1024 * 1024,
        timeout: 600000 // 10 minutes
      });
    } catch (error: any) {
      throw new Error(`xEdit cleaning failed: ${error.message}`);
    }
  }

  /**
   * Apply custom xEdit script to target plugins
   */
  async applyScript(
    scriptName: string,
    targets: string[],
    options: ScriptOptions = {}
  ): Promise<void> {
    const {
      autoExit = true,
      captureLog = true,
      parameters = {}
    } = options;

    if (!fs.existsSync(this.executablePath)) {
      throw new Error(`xEdit executable not found: ${this.executablePath}`);
    }

    // Resolve script path
    let scriptPath = scriptName;
    if (!path.isAbsolute(scriptName)) {
      scriptPath = path.join(this.scriptsPath, scriptName);
      if (!scriptPath.endsWith('.pas')) {
        scriptPath += '.pas';
      }
    }

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script not found: ${scriptPath}`);
    }

    // Build arguments
    const args = [
      `-script:"${scriptPath}"`,
      '-autoload'
    ];

    if (autoExit) {
      args.push('-autoexit');
    }

    // Add target plugins
    for (const target of targets) {
      const pluginName = path.basename(target);
      args.push(`-plugin:"${pluginName}"`);
    }

    // Add script parameters as environment variables
    const env = { ...process.env };
    for (const [key, value] of Object.entries(parameters)) {
      env[`XEDIT_${key.toUpperCase()}`] = String(value);
    }

    try {
      const { stdout, stderr } = await execFileAsync(this.executablePath, args, {
        env,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 1800000 // 30 minutes
      });

      if (captureLog) {
        const logPath = path.join(path.dirname(this.executablePath), 'logs', 'script_output.txt');
        const logDir = path.dirname(logPath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.writeFileSync(logPath, stdout + '\n' + stderr);
      }
    } catch (error: any) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  /**
   * Export plugin records to CSV format
   */
  async exportToCSV(
    plugin: string,
    recordTypes: string[],
    options: CSVExportOptions = {}
  ): Promise<string> {
    const {
      outputPath,
      includeDeleted = false,
      includeIgnored = false
    } = options;

    if (!fs.existsSync(this.executablePath)) {
      throw new Error(`xEdit executable not found: ${this.executablePath}`);
    }

    const pluginPath = path.isAbsolute(plugin) ? plugin : path.join(this.gameDataPath, plugin);
    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Plugin not found: ${pluginPath}`);
    }

    // Generate export script
    const scriptContent = this.generateCSVExportScript(recordTypes, includeDeleted, includeIgnored);
    const tempScriptPath = path.join(this.scriptsPath, 'temp_csv_export.pas');
    fs.writeFileSync(tempScriptPath, scriptContent);

    try {
      const pluginName = path.basename(pluginPath);
      const args = [
        `-script:"${tempScriptPath}"`,
        `-plugin:"${pluginName}"`,
        '-autoexit',
        '-autoload'
      ];

      await execFileAsync(this.executablePath, args, {
        maxBuffer: 20 * 1024 * 1024,
        timeout: 600000
      });

      // Determine output CSV path
      const csvPath = outputPath || pluginPath.replace(/\.(esp|esm|esl)$/i, '.csv');
      
      if (!fs.existsSync(csvPath)) {
        throw new Error('CSV export failed - output file not created');
      }

      return csvPath;
    } finally {
      // Cleanup temp script
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
    }
  }

  /**
   * Find conflicts between plugins
   */
  async findConflicts(plugins: string[]): Promise<ConflictReport> {
    if (!fs.existsSync(this.executablePath)) {
      throw new Error(`xEdit executable not found: ${this.executablePath}`);
    }

    // Generate conflict detection script
    const scriptContent = this.generateConflictScript();
    const tempScriptPath = path.join(this.scriptsPath, 'temp_conflict_check.pas');
    fs.writeFileSync(tempScriptPath, scriptContent);

    try {
      const args = [
        `-script:"${tempScriptPath}"`,
        '-autoexit',
        '-autoload'
      ];

      for (const plugin of plugins) {
        const pluginName = path.basename(plugin);
        args.push(`-plugin:"${pluginName}"`);
      }

      const { stdout, stderr } = await execFileAsync(this.executablePath, args, {
        maxBuffer: 20 * 1024 * 1024,
        timeout: 900000 // 15 minutes
      });

      // Parse conflict report from output
      return this.parseConflictOutput(stdout + stderr, plugins);
    } finally {
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
    }
  }

  /**
   * Detect game data path
   */
  private detectGameDataPath(): string {
    const commonPaths = [
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Data',
      'C:\\Games\\Fallout 4\\Data',
      'D:\\Games\\Fallout 4\\Data',
      'E:\\Games\\Fallout 4\\Data'
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Default to relative path
    return path.join(path.dirname(this.executablePath), 'Data');
  }

  /**
   * Generate PascalScript for CSV export
   */
  private generateCSVExportScript(
    recordTypes: string[],
    includeDeleted: boolean,
    includeIgnored: boolean
  ): string {
    const recordTypeList = recordTypes.map(t => `'${t}'`).join(', ');
    
    return `unit CSVExport;

var
  OutputFile: TextFile;

function Initialize: integer;
begin
  AssignFile(OutputFile, ScriptPath + 'export.csv');
  Rewrite(OutputFile);
  WriteLn(OutputFile, 'FormID,EditorID,Type,Name,Value');
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  recordTypes: array[0..${recordTypes.length - 1}] of string;
  i: integer;
  signature: string;
  formID, editorID, name: string;
begin
  recordTypes[0] := ${recordTypeList};
  
  signature := Signature(e);
  for i := 0 to High(recordTypes) do begin
    if signature = recordTypes[i] then begin
      ${includeDeleted ? '' : 'if not GetIsDeleted(e) then begin'}
        formID := IntToHex(GetLoadOrderFormID(e), 8);
        editorID := GetElementEditValues(e, 'EDID');
        name := GetElementEditValues(e, 'FULL');
        WriteLn(OutputFile, formID + ',' + editorID + ',' + signature + ',' + name);
      ${includeDeleted ? '' : 'end;'}
    end;
  end;
  Result := 0;
end;

function Finalize: integer;
begin
  CloseFile(OutputFile);
  Result := 0;
end;

end.`;
  }

  /**
   * Generate PascalScript for conflict detection
   */
  private generateConflictScript(): string {
    return `unit ConflictDetection;

var
  ConflictFile: TextFile;

function Initialize: integer;
begin
  AssignFile(ConflictFile, ScriptPath + 'conflicts.txt');
  Rewrite(ConflictFile);
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  conflictAll, conflictThis: TConflictAll;
begin
  if GetIsDeleted(e) then Exit;
  
  conflictAll := ConflictAllForNode(e);
  conflictThis := ConflictThisForNode(e);
  
  if (conflictAll >= caConflict) or (conflictThis >= caConflict) then begin
    WriteLn(ConflictFile, 
      'CONFLICT: ' + 
      IntToHex(GetLoadOrderFormID(e), 8) + ' - ' +
      GetElementEditValues(e, 'EDID') + ' in ' +
      GetFileName(GetFile(e))
    );
  end;
  
  Result := 0;
end;

function Finalize: integer;
begin
  CloseFile(ConflictFile);
  Result := 0;
end;

end.`;
  }

  /**
   * Parse conflict detection output
   */
  private parseConflictOutput(output: string, plugins: string[]): ConflictReport {
    const conflicts: ConflictRecord[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('CONFLICT:')) {
        const match = line.match(/CONFLICT:\s+([0-9A-F]+)\s+-\s+(\w+)\s+in\s+(.+)/i);
        if (match) {
          conflicts.push({
            formID: match[1],
            editorID: match[2],
            plugin: match[3].trim(),
            severity: 'warning'
          });
        }
      }
    }

    return {
      plugins,
      totalConflicts: conflicts.length,
      conflicts,
      timestamp: Date.now()
    };
  }
}

interface ConflictRecord {
  formID: string;
  editorID: string;
  plugin: string;
  severity: 'warning' | 'critical';
}

interface ConflictReport {
  plugins: string[];
  totalConflicts: number;
  conflicts: ConflictRecord[];
  timestamp: number;
}
