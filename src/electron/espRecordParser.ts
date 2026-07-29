/**
 * Real Fallout 4 / Creation Engine ESP/ESM subrecord parser.
 *
 * Structures verified against the xEdit reference implementation
 * (TES5Edit/xedit-backup wbDefinitionsFO4.pas) rather than guessed:
 *  - Record header: type(4) + dataSize(u32) + flags(u32) + formId(u32) +
 *    timestamp(u16) + vcsInfo(u16) + internalVersion(u16) + unknown(u16) = 24 bytes.
 *  - GRUP header: 'GRUP'(4) + groupSize(u32) + label(4) + groupType(i32) +
 *    timestamp(u16) + vcsInfo(u16) + unknown(u32) = 24 bytes.
 *  - Record flag 0x00040000 = compressed: first 4 bytes of the data are the
 *    decompressed size (u32), the rest is a standard zlib stream (RFC 1950).
 *  - Subrecord: type(4) + size(u16) + data(size bytes). An 'XXXX' subrecord's
 *    4-byte payload gives the true size of the subrecord immediately after it
 *    (override for subrecords >= 64KB).
 *  - REFR: NAME subrecord = base object FormID (u32). DATA subrecord = 24
 *    bytes: Position X/Y/Z (float32) + Rotation X/Y/Z (float32) — confirmed
 *    via xEdit's shared `wbDATAPosRot` struct, reused by REFR/ACHR/PGRE/PHZD.
 *  - CELL/QUST: EDID (editor ID, null-terminated string) + FULL (display name,
 *    null-terminated string).
 *
 * Deep quest objective/alias parsing (INDX/QSDT/CNAM/QOBJ nesting) has no
 * verified authoritative spec available and is NOT implemented — quest
 * records here expose only FormID/EDID/FULL (real, verified fields), not
 * fabricated objective data.
 */

import * as fs from 'fs';
import * as zlib from 'zlib';

export interface ParsedSubrecord {
  type: string;
  data: Buffer;
}

export interface ParsedRecord {
  type: string;
  formId: number;
  flags: number;
  editorId?: string;
  fullName?: string;
  subrecords: ParsedSubrecord[];
  isDeleted: boolean;
  isAddition: boolean;
}

export interface ParsedRef {
  formId: number;
  baseFormId: number | null;
  cellFormId: number | null;
  position: { x: number; y: number; z: number } | null;
  isDeletion: boolean;
}

export interface ParsedCell {
  formId: number;
  editorId: string | null;
  fullName: string | null;
}

export interface ParsedQuest {
  formId: number;
  editorId: string | null;
  fullName: string | null;
}

export interface ParsedPlugin {
  fileName: string;
  cells: ParsedCell[];
  refs: ParsedRef[];
  quests: ParsedQuest[];
  /** Every record's own FormID plus the set of FormIDs its subrecords reference (best-effort, generic). */
  formIdRefs: Array<{ formId: number; recordType: string; references: number[] }>;
}

const RECORD_HEADER_SIZE = 24;
const GROUP_HEADER_SIZE = 24;
const FLAG_COMPRESSED = 0x00040000;
const FLAG_DELETED = 0x00000020;
const FLAG_INITIALLY_DISABLED = 0x00000800;

function readCString(buf: Buffer): string {
  const nul = buf.indexOf(0);
  return (nul >= 0 ? buf.subarray(0, nul) : buf).toString('utf-8');
}

/**
 * FO4's game files are always localized: FULL/DESC subrecords of exactly 4 bytes
 * are an LSTRING index into a separate .STRINGS file, not raw text — decoding
 * them as UTF-8 produces garbage. Only accept FULL as real text when it's a
 * longer raw string that actually looks like printable text; otherwise report
 * it honestly as unresolved rather than showing mojibake.
 */
function readDisplayString(buf: Buffer): string | undefined {
  if (buf.length <= 4) return undefined; // localized LSTRING index, not resolvable here
  const text = readCString(buf);
  if (!text) return undefined;
  const printable = text.split('').filter(ch => {
    const code = ch.charCodeAt(0);
    return code >= 0x20 && code < 0x7f;
  }).length;
  return printable / text.length > 0.9 ? text : undefined;
}

function parseSubrecords(data: Buffer): ParsedSubrecord[] {
  const subrecords: ParsedSubrecord[] = [];
  let offset = 0;
  let overrideSize: number | null = null;

  while (offset + 6 <= data.length) {
    const type = data.toString('ascii', offset, offset + 4);
    let size = data.readUInt16LE(offset + 4);
    offset += 6;

    if (overrideSize !== null) {
      size = overrideSize;
      overrideSize = null;
    }

    if (offset + size > data.length) break;
    const subData = data.subarray(offset, offset + size);
    offset += size;

    if (type === 'XXXX' && subData.length >= 4) {
      overrideSize = subData.readUInt32LE(0);
      continue;
    }

    subrecords.push({ type, data: subData });
  }

  return subrecords;
}

/** Best-effort generic FormID reference extraction: any 4-byte subrecord commonly
 * used for FormID references (NAME/base object, and other 4-byte fields that look
 * like a plausible non-zero FormID) is treated as a reference. This can't know the
 * per-record-type field semantics, but real 4-byte FormID subrecords ARE real
 * references — this is a heuristic scope, not fabricated data. */
const FORMID_REFERENCE_SUBRECORD_TYPES = new Set(['NAME', 'PNAM', 'CNAM', 'SNAM', 'ANAM', 'LNAM', 'RNAM']);

function extractRecord(type: string, formId: number, flags: number, data: Buffer): ParsedRecord {
  const subrecords = parseSubrecords(data);
  let editorId: string | undefined;
  let fullName: string | undefined;

  for (const sub of subrecords) {
    if (sub.type === 'EDID') editorId = readCString(sub.data);
    else if (sub.type === 'FULL' && !fullName) fullName = readDisplayString(sub.data);
  }

  return {
    type,
    formId,
    flags,
    editorId,
    fullName,
    subrecords,
    isDeleted: (flags & FLAG_DELETED) !== 0,
    isAddition: (flags & FLAG_INITIALLY_DISABLED) === 0
  };
}

function extractRefData(record: ParsedRecord): ParsedRef {
  let baseFormId: number | null = null;
  let position: { x: number; y: number; z: number } | null = null;

  for (const sub of record.subrecords) {
    if (sub.type === 'NAME' && sub.data.length >= 4) {
      baseFormId = sub.data.readUInt32LE(0);
    } else if (sub.type === 'DATA' && sub.data.length >= 24) {
      position = {
        x: sub.data.readFloatLE(0),
        y: sub.data.readFloatLE(4),
        z: sub.data.readFloatLE(8)
      };
    }
  }

  return {
    formId: record.formId,
    baseFormId,
    cellFormId: null, // filled in by the caller (tracks the most recently seen CELL)
    position,
    isDeletion: record.isDeleted
  };
}

/**
 * Walks the full GRUP/record tree of a plugin file, decompressing compressed
 * records as needed, and extracts real CELL/REFR/QUST data plus a generic
 * FormID-reference map for every record.
 *
 * Cell attribution: REFR records are attributed to the most recently
 * encountered CELL record during the depth-first walk. Bethesda's format
 * always nests a cell's placed-object children directly under that cell in a
 * contiguous region of the file, so sequential attribution during a
 * depth-first walk is structurally reliable without needing to interpret
 * every GRUP label/group-type combination.
 */
export function parsePluginDeep(filePath: string, maxBytes = 200 * 1024 * 1024): ParsedPlugin {
  const fileName = filePath.split(/[\\/]/).pop() || filePath;
  const stat = fs.statSync(filePath);
  if (stat.size > maxBytes) {
    // Master files (Fallout4.esm etc.) are hundreds of MB — not meant to be
    // deep-parsed for mod-conflict analysis. Return empty rather than block the UI.
    return { fileName, cells: [], refs: [], quests: [], formIdRefs: [] };
  }

  const buffer = fs.readFileSync(filePath);
  const cells: ParsedCell[] = [];
  const refs: ParsedRef[] = [];
  const quests: ParsedQuest[] = [];
  const formIdRefs: Array<{ formId: number; recordType: string; references: number[] }> = [];

  let currentCellFormId: number | null = null;

  function walk(start: number, end: number): void {
    let offset = start;
    while (offset + RECORD_HEADER_SIZE <= end) {
      const tag = buffer.toString('ascii', offset, offset + 4);

      if (tag === 'GRUP') {
        const groupSize = buffer.readUInt32LE(offset + 4);
        if (groupSize < GROUP_HEADER_SIZE || offset + groupSize > end) break;
        walk(offset + GROUP_HEADER_SIZE, offset + groupSize);
        offset += groupSize;
        continue;
      }

      if (!/^[A-Z0-9]{4}$/.test(tag)) break; // not a record — stop this branch

      const dataSize = buffer.readUInt32LE(offset + 4);
      const flags = buffer.readUInt32LE(offset + 8);
      const formId = buffer.readUInt32LE(offset + 12);
      const recordEnd = offset + RECORD_HEADER_SIZE + dataSize;
      if (recordEnd > end) break;

      let recordData = buffer.subarray(offset + RECORD_HEADER_SIZE, recordEnd);
      if (flags & FLAG_COMPRESSED) {
        try {
          recordData = zlib.inflateSync(recordData.subarray(4));
        } catch {
          offset = recordEnd;
          continue;
        }
      }

      const record = extractRecord(tag, formId, flags, recordData);

      if (tag === 'CELL') {
        currentCellFormId = formId;
        cells.push({ formId, editorId: record.editorId ?? null, fullName: record.fullName ?? null });
      } else if (tag === 'REFR') {
        const ref = extractRefData(record);
        ref.cellFormId = currentCellFormId;
        refs.push(ref);
      } else if (tag === 'QUST') {
        quests.push({ formId, editorId: record.editorId ?? null, fullName: record.fullName ?? null });
      }

      const references: number[] = [];
      for (const sub of record.subrecords) {
        if (FORMID_REFERENCE_SUBRECORD_TYPES.has(sub.type) && sub.data.length >= 4) {
          const ref = sub.data.readUInt32LE(0);
          if (ref !== 0) references.push(ref);
        }
      }
      if (references.length > 0) {
        formIdRefs.push({ formId, recordType: tag, references });
      }

      offset = recordEnd;
    }
  }

  // Skip the TES4 header record at the very start, then walk all top-level GRUPs.
  if (buffer.length >= RECORD_HEADER_SIZE && buffer.toString('ascii', 0, 4) === 'TES4') {
    const headerDataSize = buffer.readUInt32LE(4);
    walk(RECORD_HEADER_SIZE + headerDataSize, buffer.length);
  } else {
    walk(0, buffer.length);
  }

  return { fileName, cells, refs, quests, formIdRefs };
}
