/**
 * ESP/ESM File Parser for Fallout 4
 * 
 * Parses binary plugin files to extract FormIDs, records, and detect conflicts.
 * Supports reading TES4 header, record groups, and individual records.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ESPRecord {
  type: string;
  formId: string;
  flags: number;
  size: number;
  data: Buffer;
  editorId?: string;
}

export interface ESPPlugin {
  filename: string;
  path: string;
  isMaster: boolean;
  records: ESPRecord[];
  formIdCount: number;
}

export interface ConflictInfo {
  recordType: string;
  formId: string;
  winners: string[];
  losers: string[];
  severity: 'low' | 'medium' | 'high';
  description?: string;
}

/**
 * Parse ESP/ESM file header to get basic info
 */
export function parseESPHeader(filePath: string): { isMaster: boolean; version: number } | null {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 24) return null;

    // Check for TES4 signature
    const signature = buffer.toString('ascii', 0, 4);
    if (signature !== 'TES4') return null;

    // Read flags (offset 8)
    const flags = buffer.readUInt32LE(8);
    const isMaster = (flags & 0x00000001) !== 0;

    // Read version (offset 20)
    const version = buffer.readFloatLE(20);

    return { isMaster, version };
  } catch (error) {
    console.error(`Failed to parse ESP header: ${filePath}`, error);
    return null;
  }
}

/**
 * Extract all FormIDs from an ESP file
 */
export function extractFormIDs(filePath: string): string[] {
  const formIds: string[] = [];
  
  try {
    const buffer = fs.readFileSync(filePath);
    let offset = 0;

    while (offset < buffer.length - 20) {
      // Read record type (4 bytes)
      const type = buffer.toString('ascii', offset, offset + 4);
      
      // Skip non-record data
      if (!/^[A-Z]{4}$/.test(type)) {
        offset++;
        continue;
      }

      // Read size (4 bytes at offset +4)
      const size = buffer.readUInt32LE(offset + 4);
      
      // Read flags (4 bytes at offset +8)
      const flags = buffer.readUInt32LE(offset + 8);
      
      // Read FormID (4 bytes at offset +12)
      const formId = buffer.readUInt32LE(offset + 12);
      const formIdHex = formId.toString(16).padStart(8, '0').toUpperCase();
      
      if (formId !== 0) {
        formIds.push(formIdHex);
      }

      // Move to next record
      offset += 24 + size; // Header (24) + data size
    }
  } catch (error) {
    console.error(`Failed to extract FormIDs: ${filePath}`, error);
  }

  return Array.from(new Set(formIds)); // Remove duplicates
}

/**
 * Parse a full ESP file and return structured data
 */
export function parseESP(filePath: string): ESPPlugin | null {
  try {
    const header = parseESPHeader(filePath);
    if (!header) return null;

    const filename = path.basename(filePath);
    const formIds = extractFormIDs(filePath);

    return {
      filename,
      path: filePath,
      isMaster: header.isMaster,
      records: [],
      formIdCount: formIds.length,
    };
  } catch (error) {
    console.error(`Failed to parse ESP: ${filePath}`, error);
    return null;
  }
}

/**
 * Detect conflicts between plugins in load order
 */
export function detectConflicts(pluginPaths: string[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const formIdMap = new Map<string, string[]>(); // FormID -> [plugin names]

  // Parse each plugin and build FormID map
  for (const pluginPath of pluginPaths) {
    const formIds = extractFormIDs(pluginPath);
    const pluginName = path.basename(pluginPath);

    for (const formId of formIds) {
      if (!formIdMap.has(formId)) {
        formIdMap.set(formId, []);
      }
      formIdMap.get(formId)!.push(pluginName);
    }
  }

  // Identify conflicts (FormIDs present in multiple plugins)
  for (const [formId, plugins] of formIdMap.entries()) {
    if (plugins.length > 1) {
      // Last plugin wins in load order
      const winner = plugins[plugins.length - 1];
      const losers = plugins.slice(0, -1);

      // Determine severity based on what's being overridden
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (losers.some(p => p.endsWith('.esm'))) {
        severity = 'high'; // Overriding master files is high risk
      } else if (plugins.length > 2) {
        severity = 'medium'; // Multiple conflicts
      }

      conflicts.push({
        recordType: 'UNKNOWN', // Would need deeper parsing to determine
        formId,
        winners: [winner],
        losers,
        severity,
        description: `FormID ${formId} is overridden by ${winner}`,
      });
    }
  }

  return conflicts;
}

/**
 * Find FormID conflicts in a specific plugin
 */
export function findFormIDConflicts(pluginPath: string, loadOrder: string[]): number {
  const pluginFormIds = new Set(extractFormIDs(pluginPath));
  let conflictCount = 0;

  // Check against other plugins in load order
  for (const otherPath of loadOrder) {
    if (otherPath === pluginPath) continue;
    
    const otherFormIds = extractFormIDs(otherPath);
    for (const formId of otherFormIds) {
      if (pluginFormIds.has(formId)) {
        conflictCount++;
      }
    }
  }

  return conflictCount;
}

/**
 * Compare two ESP files and return differences
 */
export function compareESPs(plugin1Path: string, plugin2Path: string): { differences: Array<{ description: string }> } {
  const differences: Array<{ description: string }> = [];

  try {
    const plugin1 = parseESP(plugin1Path);
    const plugin2 = parseESP(plugin2Path);

    if (!plugin1 || !plugin2) {
      differences.push({ description: 'Failed to parse one or both plugins' });
      return { differences };
    }

    // Compare FormID counts
    if (plugin1.formIdCount !== plugin2.formIdCount) {
      differences.push({
        description: `FormID count differs: ${plugin1.filename} has ${plugin1.formIdCount}, ${plugin2.filename} has ${plugin2.formIdCount}`,
      });
    }

    // Compare master status
    if (plugin1.isMaster !== plugin2.isMaster) {
      differences.push({
        description: `Master flag differs: ${plugin1.isMaster ? plugin1.filename : plugin2.filename} is marked as master`,
      });
    }

    // Compare file sizes
    const size1 = fs.statSync(plugin1Path).size;
    const size2 = fs.statSync(plugin2Path).size;
    if (size1 !== size2) {
      const diff = Math.abs(size1 - size2);
      differences.push({
        description: `File size differs by ${(diff / 1024).toFixed(2)} KB`,
      });
    }

    // Compare specific FormIDs
    const formIds1 = new Set(extractFormIDs(plugin1Path));
    const formIds2 = new Set(extractFormIDs(plugin2Path));

    const onlyIn1 = Array.from(formIds1).filter(id => !formIds2.has(id));
    const onlyIn2 = Array.from(formIds2).filter(id => !formIds1.has(id));

    if (onlyIn1.length > 0) {
      differences.push({
        description: `${onlyIn1.length} FormIDs only in ${plugin1.filename}`,
      });
    }

    if (onlyIn2.length > 0) {
      differences.push({
        description: `${onlyIn2.length} FormIDs only in ${plugin2.filename}`,
      });
    }

    if (differences.length === 0) {
      differences.push({ description: 'No significant differences detected' });
    }
  } catch (error) {
    differences.push({ description: `Error comparing files: ${error instanceof Error ? error.message : String(error)}` });
  }

  return { differences };
}

/**
 * Backup an ESP file before modification
 */
export function backupESP(filePath: string): boolean {
  try {
    const backupPath = `${filePath}.backup_${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backed up ${filePath} to ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Failed to backup ESP: ${filePath}`, error);
    return false;
  }
}

/**
 * Remap FormIDs in an ESP file (simplified - real implementation would be more complex)
 */
export function remapFormIDs(filePath: string, oldFormIds: string[], newFormIds: string[]): boolean {
  if (oldFormIds.length !== newFormIds.length) {
    console.error('FormID arrays must be same length');
    return false;
  }

  try {
    // Backup first
    if (!backupESP(filePath)) {
      return false;
    }

    const buffer = fs.readFileSync(filePath);
    let modified = false;

    // Simple replacement (real implementation would need proper record parsing)
    for (let i = 0; i < oldFormIds.length; i++) {
      const oldId = parseInt(oldFormIds[i], 16);
      const newId = parseInt(newFormIds[i], 16);

      // Scan buffer for FormID occurrences
      for (let offset = 0; offset < buffer.length - 4; offset++) {
        const currentId = buffer.readUInt32LE(offset);
        if (currentId === oldId) {
          buffer.writeUInt32LE(newId, offset);
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, buffer);
      console.log(`Remapped ${oldFormIds.length} FormIDs in ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Failed to remap FormIDs: ${filePath}`, error);
    return false;
  }
}
