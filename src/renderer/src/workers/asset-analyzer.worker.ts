// Asset Analysis Web Worker
// Handles ESP, NIF, and DDS file analysis in the background

interface AssetAnalysisMessage {
  // Legacy format (type='analyze', data nested)
  type: 'analyze' | 'analyze-asset';
  id: string;
  // Legacy nested format
  data?: {
    buffer: ArrayBuffer;
    filename: string;
    type: 'esp' | 'nif' | 'dds';
  };
  // Flat format used by WorkerManager
  assetType?: 'esp' | 'nif' | 'dds';
  fileData?: ArrayBuffer;
  fileName?: string;
}

interface WorkerMessage {
  type: 'result' | 'error' | 'progress';
  id: string;
  data?: any;
  error?: string;
  progress?: number;
}

interface ESPIssue {
  category: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details: string;
  fix: string;
}

interface ESPAnalysis {
  filename: string;
  type: 'esp';
  header: {
    signature: string;
    version: number;
    recordCount: number;
    nextObjectId: number;
  };
  records: Array<{
    type: string;
    size: number;
    flags: number;
  }>;
  fileSize: number;
  fileSizeMB: number;
  masters: string[];
  recordCounts: Record<string, number>;
  issues: ESPIssue[];
  warnings: string[]; // backward-compat flat strings derived from issues
  flags: { isESM: boolean; isESL: boolean; isLocalized: boolean };
}

interface NIFAnalysis {
  filename: string;
  header: {
    version: number;
    endian: 'big' | 'little';
    userVersion: number;
    numBlocks: number;
  };
  blocks: Array<{
    type: string;
    size: number;
  }>;
  vertices: number;
  triangles: number;
  fileSize: number;
  warnings: string[];
}

interface DDSAnalysis {
  filename: string;
  header: {
    width: number;
    height: number;
    format: string;
    mipmapCount: number;
    compressed: boolean;
  };
  fileSize: number;
  warnings: string[];
}

// Utility functions
function readUint32LE(buffer: ArrayBuffer, offset: number): number {
  const view = new DataView(buffer);
  return view.getUint32(offset, true);
}

function readUint32BE(buffer: ArrayBuffer, offset: number): number {
  const view = new DataView(buffer);
  return view.getUint32(offset, false);
}

function readString(buffer: ArrayBuffer, offset: number, length: number): string {
  const view = new Uint8Array(buffer, offset, length);
  let str = '';
  for (let i = 0; i < length; i++) {
    if (view[i] === 0) break;
    str += String.fromCharCode(view[i]);
  }
  return str;
}

// =============================================================================
// Comprehensive ESP/ESM/ESL Scanner
// Detects: deleted navmesh, precombine breaks, landscape edits, deleted
// references, Papyrus scripts, absolute mesh paths, master issues, ESL
// eligibility. Every issue includes a specific human-readable fix.
// =============================================================================
function analyzeESP(buffer: ArrayBuffer, filename: string): ESPAnalysis {
  const dv  = new DataView(buffer);
  const u8  = new Uint8Array(buffer);

  const rU32 = (o: number) => dv.getUint32(o, true);
  const rU16 = (o: number) => dv.getUint16(o, true);
  const rF32 = (o: number) => dv.getFloat32(o, true);
  const rStr = (o: number, len: number): string => {
    let s = '';
    for (let i = 0; i < len && o + i < u8.length; i++) {
      if (u8[o + i] === 0) break;
      s += String.fromCharCode(u8[o + i]);
    }
    return s;
  };

  const issues: ESPIssue[] = [];
  const recordCounts: Record<string, number> = {};
  const masters: string[] = [];

  // ── Validate TES4 header ──────────────────────────────────────────────────
  if (u8.length < 24 || rStr(0, 4) !== 'TES4') {
    issues.push({
      category: 'File',
      severity: 'error',
      message: 'Invalid Plugin File — Not a Fallout 4 ESP/ESM/ESL',
      details: 'The file does not start with a valid TES4 record. It may be corrupt, truncated, or not a Bethesda plugin.',
      fix: 'Verify the file downloaded correctly (re-download if in doubt). Try opening it in xEdit — if xEdit refuses it, the file is corrupt and must be restored from backup.'
    });
    return buildESPResult(issues, recordCounts, masters, buffer.byteLength, 0, 0, 0, 0, 0, false, false, false);
  }

  const tes4DataSize = rU32(4);
  const tes4Flags    = rU32(8);
  const isESM        = !!(tes4Flags & 0x01);
  const isESL        = !!(tes4Flags & 0x200);
  const isLocalized  = !!(tes4Flags & 0x80);

  // Parse TES4 subrecords (HEDR, CNAM, SNAM, MAST)
  let hdrVersion      = 0;
  let hdrNextObjectId = 0;
  let hdrNumRecords   = 0;
  {
    let o = 24;
    const end = Math.min(24 + tes4DataSize, u8.length);
    while (o + 6 <= end) {
      const st = rStr(o, 4);
      const ss = rU16(o + 4);
      if (st === 'HEDR' && ss >= 12) {
        hdrVersion      = rF32(o + 6);
        hdrNumRecords   = rU32(o + 10);
        hdrNextObjectId = rU32(o + 14);
      } else if (st === 'MAST' && ss > 0) {
        masters.push(rStr(o + 6, ss));
      }
      o += 6 + ss;
    }
  }

  // ── Walk the full GRUP/Record tree ────────────────────────────────────────
  // Stack tracks end-of-group and context flags so we know when a NAVM or
  // CELL is inside a worldspace (exterior) vs an interior cell block.
  const stack: Array<{ end: number; inWrld: boolean; inExtCell: boolean }> = [];
  let pos = 24 + tes4DataSize;

  let deletedNavmesh   = 0;
  let exteriorNavmesh  = 0;
  let deletedRefs      = 0;
  let landEdits        = 0;
  let scolCount        = 0;
  let exteriorCells    = 0;
  let vmadCount        = 0;
  let maxLocalFormId   = 0;
  const scriptNames: string[] = [];
  const absoluteMeshIssues: ESPIssue[] = [];

  while (pos + 4 <= u8.length) {
    // Expire stack frames whose groups have ended
    while (stack.length > 0 && pos >= stack[stack.length - 1].end) stack.pop();

    const ctx       = stack[stack.length - 1];
    const inWrld    = ctx?.inWrld    ?? false;
    const inExtCell = ctx?.inExtCell ?? false;
    const recType   = rStr(pos, 4);

    if (recType === 'GRUP') {
      if (pos + 24 > u8.length) break;
      const gSize  = rU32(pos + 4);
      const gLabel = rStr(pos + 8, 4);
      const gType  = rU32(pos + 12);
      if (gSize < 24 || pos + gSize > u8.length) { pos += 24; continue; }

      // Group type 0 = top-level; type 1 = world-children; 4/5 = exterior cell blocks
      const nowWrld    = inWrld    || (gType === 0 && gLabel === 'WRLD') || gType === 1;
      const nowExtCell = inExtCell || gType === 4 || gType === 5;
      stack.push({ end: pos + gSize, inWrld: nowWrld, inExtCell: nowExtCell });
      pos += 24;
      continue;
    }

    // Regular record
    if (pos + 24 > u8.length) break;
    const rSize    = rU32(pos + 4);
    const rFlags   = rU32(pos + 8);
    const rFormId  = rU32(pos + 12);
    if (rSize > u8.length - pos - 24) { pos += 24; break; }

    const deleted    = !!(rFlags & 0x20);
    const compressed = !!(rFlags & 0x200);
    const localId    = rFormId & 0x00FFFFFF;
    if (localId > maxLocalFormId) maxLocalFormId = localId;

    recordCounts[recType] = (recordCounts[recType] || 0) + 1;

    switch (recType) {
      case 'NAVM':
        if (deleted) deletedNavmesh++;
        if (inWrld)  exteriorNavmesh++;
        break;
      case 'LAND': landEdits++; break;
      case 'SCOL': scolCount++;  break;
      case 'REFR':
      case 'ACHR': if (deleted) deletedRefs++; break;
      case 'CELL':
        if (!compressed && rSize > 0) {
          let co = pos + 24;
          const ce = co + rSize;
          while (co + 6 <= ce && co + 6 <= u8.length) {
            const ct = rStr(co, 4);
            const cs = rU16(co + 4);
            if (ct === 'DATA' && cs >= 1) {
              if (!(u8[co + 6] & 0x01)) exteriorCells++; // bit 0 = interior flag
              break;
            }
            co += 6 + cs;
          }
        }
        break;
    }

    // Parse subrecords for mesh paths and VMAD scripts
    const wantsMesh = ['STAT','MISC','WEAP','ARMO','AMMO','NPC_','ALCH','SCRL','BOOK','CONT',
                       'DOOR','LIGH','FURN','ACTI','FLOR','GRAS','TREE','MSTT','COBJ'].includes(recType);
    const wantsVMAD = ['NPC_','QUST','PERK','WEAP','ARMO','MISC','STAT','ACTI','FLOR',
                       'CONT','DOOR','LIGH','FURN','BOOK','MGEF','ENCH','SPEL'].includes(recType);

    if (!compressed && rSize > 0 && rSize < 4 * 1024 * 1024 && (wantsMesh || wantsVMAD)) {
      let so = pos + 24;
      const se = so + rSize;
      while (so + 6 <= se && so + 6 <= u8.length) {
        const st = rStr(so, 4);
        const ss = rU16(so + 4);
        const sd = so + 6;

        if (st === 'VMAD' && wantsVMAD && ss > 6 && sd + 7 <= u8.length) {
          vmadCount++;
          // VMAD layout: version(u16) + objectFormat(u16) + scriptCount(u16) + nameLen(u16) + name
          if (sd + 8 <= u8.length) {
            const nameLen = rU16(sd + 6);
            if (nameLen > 0 && nameLen < 128 && sd + 8 + nameLen <= u8.length) {
              const sName = rStr(sd + 8, nameLen);
              if (sName && scriptNames.length < 30) scriptNames.push(sName);
            }
          }
        }

        if ((st === 'MODL' || st === 'MOD2' || st === 'MOD3' || st === 'MOD4') && wantsMesh && ss > 0) {
          const meshPath = rStr(sd, ss);
          if (meshPath && /^[A-Za-z]:[\\/]/u.test(meshPath) && absoluteMeshIssues.length < 10) {
            absoluteMeshIssues.push({
              category: 'Mesh Paths',
              severity: 'error',
              message: `Hardcoded Absolute Mesh Path in ${recType} [${rFormId.toString(16).padStart(8,'0').toUpperCase()}]`,
              details: `The record has a hardcoded drive-letter path: "${meshPath}". This mesh will not be found on any machine other than the original author's computer, causing invisible/missing objects for every user.`,
              fix: 'In xEdit, open this record and change the mesh path to a relative path starting from "meshes\\\\" (e.g., "meshes\\\\yourmod\\\\myobject.nif"). Never use absolute paths in a published mod.'
            });
          }
        }
        so += 6 + ss;
      }
    }

    pos += 24 + rSize;
  }

  // ── Generate structured issues ────────────────────────────────────────────

  if (deletedNavmesh > 0) {
    issues.push({
      category: 'Navmesh',
      severity: 'error',
      message: `${deletedNavmesh} Deleted Navmesh Record(s) — Will Cause CTD`,
      details: `${deletedNavmesh} NAVM record(s) carry the deleted flag (0x20). Every time an NPC tries to use one of these deleted triangles for pathfinding, the game crashes to desktop. This is one of the most common and most dangerous issues in Fallout 4 mods — it can crash any cell the plugin touches.`,
      fix: 'Open the plugin in xEdit (FO4Edit). Find NAVM records marked [D] (deleted). Right-click → Change FormID and replace the deleted FormID with the FormID of the replacement navmesh this mod added. Or run the built-in "Undelete and Disable References" xEdit script. Test the area in-game after fixing.'
    });
  }

  if (exteriorNavmesh > 0 && !isESM) {
    issues.push({
      category: 'Navmesh',
      severity: 'warning',
      message: 'Worldspace Navmesh Edits — Creation Kit Crash Risk',
      details: `${exteriorNavmesh} NAVM record(s) are in exterior/worldspace cells. Opening a plugin with complex worldspace navmesh in CK will crash CK, especially in large worldspaces like the Commonwealth. Improperly finalized navmesh also causes in-game CTDs.`,
      fix: 'In CK: load ONLY this plugin (not your full load order). Before saving any cell: World → Navmesh → Run Consistency Check. After editing navmesh in a cell: Cell → Finalize Cell Navmesh. Save frequently. Never edit worldspace navmesh with conflicting mods loaded simultaneously.'
    });
  }

  if (landEdits > 0) {
    issues.push({
      category: 'Precombines',
      severity: 'error',
      message: `${landEdits} Landscape Edit(s) — Broken Precombines & FPS Drops`,
      details: `${landEdits} LAND (landscape/terrain) record(s) are modified. Any landscape edit breaks precombined geometry (precombines) and previsibility data for those cells. The result: severe FPS drops, flickering or invisible static objects, and broken terrain in those areas for every player unless a previs patch exists.`,
      fix: 'Generate new Precombines + Previs for the affected cells: In CK → World → Precombine → Generate Precombined Meshes, then World → Previs → Generate Visibility. For mods you don\'t own, check Nexus for a Previs Repair Pack (PRP) patch. Without this fix, players should install the "Previs Repair Pack" master patch.'
    });
  }

  if (scolCount > 3 && !isESM) {
    issues.push({
      category: 'Precombines',
      severity: 'warning',
      message: `${scolCount} Static Collection (Precombine) Records — Verify Previs`,
      details: `${scolCount} SCOL records found. These are precombine mesh containers. If any override vanilla SCOLs without updated previs data, players will experience FPS drops and flickering objects in the affected areas.`,
      fix: 'In xEdit, check if any SCOLs conflict with Fallout4.esm. Overrides need regenerated previs. New SCOLs in this mod\'s own FormID range are generally safe. Use the PJM xEdit script to check previs coverage for these cells.'
    });
  }

  if (exteriorCells > 20 && !isESM && landEdits === 0 && scolCount <= 3) {
    issues.push({
      category: 'Precombines',
      severity: 'warning',
      message: `Edits ${exteriorCells} Exterior Cells — Check Precombine Status`,
      details: `This plugin modifies ${exteriorCells} exterior worldspace cells. Large-scale exterior edits commonly break precombined geometry unless new previs data was generated. Check if a previs patch exists.`,
      fix: 'Search Nexus Mods for a Previs/Precombine patch for this mod. If none exists and performance is poor in affected areas, generate previs in CK or use the PJM xEdit script for those cells.'
    });
  }

  if (deletedRefs > 0) {
    issues.push({
      category: 'Deleted References',
      severity: deletedRefs > 5 ? 'error' : 'warning',
      message: `${deletedRefs} Deleted Reference(s) — UDR Required`,
      details: `${deletedRefs} REFR/ACHR records carry the deleted flag. Deleted references are unsafe in Bethesda games: if any other mod (or vanilla scripts) reference those FormIDs, the game will crash when it tries to resolve the missing object. This is what "Undelete and Disable References" (UDR) fixes.`,
      fix: 'In xEdit: right-click the plugin → Apply Script → search "Undelete" → run "Undelete and Disable References". This replaces each deleted ref with a disabled version placed at (0,0,-30000), which is crash-free. The Unofficial Fallout 4 Patch applies this same fix to vanilla deleted refs.'
    });
  }

  if (vmadCount > 0) {
    const uniqueScripts = [...new Set(scriptNames)].slice(0, 8);
    const f4seHint = uniqueScripts.some(s =>
      /f4se|workshopscript|actorvalue|gunmod/i.test(s)
    );
    issues.push({
      category: 'Papyrus Scripts',
      severity: 'info',
      message: `${vmadCount} Object(s) With Papyrus Scripts Attached`,
      details: `${vmadCount} game object(s) have Papyrus scripts attached${uniqueScripts.length > 0 ? ` — scripts found: ${uniqueScripts.join(', ')}` : ''}. Scripts need their compiled .pex bytecode files present in Data\\Scripts\\. Missing .pex files silently break quest stages, conditions, and AI packages.`,
      fix: 'Ensure all .pex files for the listed scripts are in Data\\Scripts\\ inside the mod archive. Check the Papyrus log: Documents\\My Games\\Fallout4\\Logs\\Script\\Papyrus.0.log for "Cannot open store for class" errors after loading. ' + (f4seHint ? 'One or more scripts suggest F4SE dependency — confirm F4SE version matches the game version.' : '')
    });
  }

  // Add any absolute path issues collected during subrecord scan
  issues.push(...absoluteMeshIssues);

  const newRecordCount = hdrNextObjectId & 0x00FFFFFF;
  if (!isESL && !isESM && newRecordCount < 2048 && maxLocalFormId < 0x1000) {
    issues.push({
      category: 'Optimization',
      severity: 'info',
      message: 'ESL-Eligible — Light Plugin Flag Available (Save a Load Order Slot)',
      details: `This plugin has ${newRecordCount} new FormID(s) and all FormIDs are below 0xFFF. It qualifies as an ESL (light plugin), which does not consume a load order slot. This is important for users approaching the 254-ESP limit.`,
      fix: 'In xEdit: right-click the plugin → "Compact FormIDs for ESL" (only needed if any IDs are above 0xFFF). Then open the plugin header, click Record Flags, check the ESL checkbox. Save and test thoroughly — some FLST/alias-heavy mods can break when ESL-flagged.'
    });
  }

  const fileSizeMB = buffer.byteLength / (1024 * 1024);
  if (fileSizeMB > 50) {
    issues.push({
      category: 'File Size',
      severity: fileSizeMB > 100 ? 'error' : 'warning',
      message: `Large Plugin File: ${fileSizeMB.toFixed(1)} MB${fileSizeMB > 100 ? ' — Critical' : ''}`,
      details: `At ${fileSizeMB.toFixed(1)} MB this plugin is unusually large${fileSizeMB > 100 ? ' (over the 100 MB danger threshold)' : ''}. Large ESPs cause slow initial load times, memory pressure, and may indicate unnecessary data duplication (especially navmesh, landscape, or large arrays of records).`,
      fix: 'Open in xEdit and review the largest record groups (WRLD, NAVM, LAND are common offenders). Consider splitting independent content into separate ESPs. Ensure navmesh and landscape data hasn\'t been unintentionally duplicated by CK re-saves.'
    });
  }

  // Backward-compat flat warnings from structured issues
  const warnings = issues.map(i => `[${i.category}] ${i.message}: ${i.details}`);

  return buildESPResult(issues, recordCounts, masters, buffer.byteLength,
    fileSizeMB, hdrVersion, hdrNumRecords, hdrNextObjectId, tes4Flags,
    isESM, isESL, isLocalized);

  function buildESPResult(
    issuesToUse: ESPIssue[], counts: Record<string, number>, masts: string[],
    byteLen: number, sizeMB: number, ver: number, numRec: number,
    nextObjId: number, flags: number, esm: boolean, esl: boolean, loc: boolean
  ): ESPAnalysis {
    return {
      filename,
      type: 'esp',
      header: { signature: 'TES4', version: ver, recordCount: numRec, nextObjectId: nextObjId },
      records: [],
      fileSize: byteLen,
      fileSizeMB: Math.round((sizeMB) * 100) / 100,
      masters: masts,
      recordCounts: counts,
      issues: issuesToUse,
      warnings: issuesToUse.map(i => `[${i.category}] ${i.message}: ${i.details}`),
      flags: { isESM: esm, isESL: esl, isLocalized: loc }
    };
  }
}

// NIF file analysis
function analyzeNIF(buffer: ArrayBuffer, filename: string): NIFAnalysis {
  const analysis: NIFAnalysis = {
    filename,
    header: {
      version: 0,
      endian: 'little',
      userVersion: 0,
      numBlocks: 0
    },
    blocks: [],
    vertices: 0,
    triangles: 0,
    fileSize: buffer.byteLength,
    warnings: []
  };

  try {
    // Read NIF header
    const magic = readString(buffer, 0, 40);
    if (!magic.includes('NetImmerse File Format')) {
      analysis.warnings.push('Invalid NIF signature');
      return analysis;
    }

    analysis.header.version = readUint32LE(buffer, 40);
    analysis.header.endian = readUint32LE(buffer, 44) === 0 ? 'little' : 'big';
    analysis.header.userVersion = readUint32LE(buffer, 48);
    analysis.header.numBlocks = readUint32LE(buffer, 52);

    // Read block types
    let offset = 56;
    for (let i = 0; i < Math.min(analysis.header.numBlocks, 100); i++) {
      if (offset + 4 > buffer.byteLength) break;

      const blockTypeLength = readUint32LE(buffer, offset);
      offset += 4;

      if (offset + blockTypeLength > buffer.byteLength) break;

      const blockType = readString(buffer, offset, blockTypeLength);
      offset += blockTypeLength;

      // Estimate block size (simplified)
      const blockSize = readUint32LE(buffer, offset) || 64;

      analysis.blocks.push({
        type: blockType,
        size: blockSize
      });

      // Count vertices and triangles for mesh blocks
      if (blockType.includes('NiTriShape') || blockType.includes('BSTriShape')) {
        // Simplified vertex/triangle counting
        analysis.vertices += Math.floor(blockSize / 12); // Rough estimate
        analysis.triangles += Math.floor(blockSize / 36); // Rough estimate
      }
    }

    // Performance warnings
    if (analysis.vertices > 10000) {
      analysis.warnings.push('High vertex count may impact performance');
    }
    if (analysis.triangles > 20000) {
      analysis.warnings.push('High triangle count may impact performance');
    }

  } catch (error) {
    analysis.warnings.push(`Analysis error: ${error}`);
  }

  return analysis;
}

// DDS file analysis
function analyzeDDS(buffer: ArrayBuffer, filename: string): DDSAnalysis {
  const analysis: DDSAnalysis = {
    filename,
    header: {
      width: 0,
      height: 0,
      format: 'Unknown',
      mipmapCount: 0,
      compressed: false
    },
    fileSize: buffer.byteLength,
    warnings: []
  };

  try {
    // Read DDS header
    const magic = readString(buffer, 0, 4);
    if (magic !== 'DDS ') {
      analysis.warnings.push('Invalid DDS signature');
      return analysis;
    }

    analysis.header.width = readUint32LE(buffer, 16);
    analysis.header.height = readUint32LE(buffer, 12);
    const pixelFormat = readUint32LE(buffer, 80);
    analysis.header.mipmapCount = Math.max(1, readUint32LE(buffer, 24));

    // Determine format
    const fourCC = readString(buffer, 84, 4);
    switch (fourCC) {
      case 'DXT1':
        analysis.header.format = 'DXT1';
        analysis.header.compressed = true;
        break;
      case 'DXT3':
        analysis.header.format = 'DXT3';
        analysis.header.compressed = true;
        break;
      case 'DXT5':
        analysis.header.format = 'DXT5';
        analysis.header.compressed = true;
        break;
      default:
        analysis.header.format = 'Uncompressed';
        analysis.header.compressed = false;
    }

    // Check dimensions
    if (analysis.header.width > 4096 || analysis.header.height > 4096) {
      analysis.warnings.push('Texture dimensions exceed recommended limits');
    }

    // Check power of 2
    const isPowerOf2 = (n: number) => (n & (n - 1)) === 0;
    if (!isPowerOf2(analysis.header.width) || !isPowerOf2(analysis.header.height)) {
      analysis.warnings.push('Texture dimensions should be power of 2');
    }

  } catch (error) {
    analysis.warnings.push(`Analysis error: ${error}`);
  }

  return analysis;
}

// Worker message handler
self.onmessage = function(e: MessageEvent<AssetAnalysisMessage>) {
  const { type, id } = e.data;

  try {
    // Resolve payload from either message format:
    // • Legacy: { type: 'analyze', id, data: { buffer, filename, type } }
    // • WorkerManager: { type: 'analyze-asset', id, assetType, fileData, fileName }
    let buffer: ArrayBuffer;
    let filename: string;
    let assetType: 'esp' | 'nif' | 'dds';

    if (type === 'analyze' && e.data.data) {
      buffer = e.data.data.buffer;
      filename = e.data.data.filename;
      assetType = e.data.data.type;
    } else if (type === 'analyze-asset' && e.data.fileData) {
      buffer = e.data.fileData;
      filename = e.data.fileName ?? '';
      assetType = e.data.assetType!;
    } else {
      // Unknown message format — ignore silently
      return;
    }

    let result: ESPAnalysis | NIFAnalysis | DDSAnalysis;

    switch (assetType) {
      case 'esp':
        result = analyzeESP(buffer, filename);
        break;
      case 'nif':
        result = analyzeNIF(buffer, filename);
        break;
      case 'dds':
        result = analyzeDDS(buffer, filename);
        break;
      default:
        throw new Error(`Unknown asset type: ${assetType}`);
    }

    const message: WorkerMessage = { type: 'result', id, data: result };
    self.postMessage(message);
  } catch (error) {
    const message: WorkerMessage = {
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    self.postMessage(message);
  }
};
