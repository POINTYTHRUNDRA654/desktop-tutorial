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
 *
 * VMAD (script attachment) is parsed for the base "attached script +
 * properties" section — layout verified against the documented Skyrim/FO4
 * VMAD structure (FO4 did not change this base format from Skyrim SE):
 *   version(i16) objectFormat(i16) scriptCount(u16)
 *   per script: name(wstring) status(u8) propertyCount(u16)
 *     per property: name(wstring) type(u8) status(u8) value(per type)
 * Quest/dialogue script-fragment data (TIF__ fragments on QUST/INFO/PACK/SCEN)
 * has a distinct tail structure this does NOT attempt to parse — not needed
 * for WEAP/MISC records, which carry no fragment tail.
 */

import * as fs from 'fs';
import * as zlib from 'zlib';

export interface ParsedSubrecord {
  type: string;
  data: Buffer;
}

export interface VmadObjectValue {
  formId: number;
  alias: number;
}

export interface VmadProperty {
  name: string;
  type: 'none' | 'object' | 'string' | 'int' | 'float' | 'bool' | 'struct' |
        'objectArray' | 'stringArray' | 'intArray' | 'floatArray' | 'boolArray' | 'structArray' | 'unknown';
  value: unknown;
}

export interface VmadScript {
  scriptName: string;
  properties: VmadProperty[];
}

export interface VmadData {
  scripts: VmadScript[];
  /** True if the subrecord ended before parsing could finish cleanly — the
   *  scripts/properties gathered up to that point are still real, just partial. */
  truncated: boolean;
  trailingBytes: number;
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
  /** Populated only when a VMAD subrecord is present. */
  vmadScripts?: VmadScript[];
  /** Populated only for FLST records: the ordered FormIDs the list contains. */
  formListEntries?: number[];
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
  /** Full ParsedRecord objects for record types requested via parsePluginDeep's captureTypes option, keyed by type. Empty unless requested. */
  captured: Record<string, ParsedRecord[]>;
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

// Confirmed empirically against real FO4 mod data: arrays are their scalar type + 10
// (1->11, 2->12, 3->13, 4->14, 5->15), and this holds for Struct too (7->17, StructArray) —
// a real LevelPlan record's "StageItemSpawns" property was observed with raw type byte 17.
const VMAD_PROPERTY_TYPES: Record<number, VmadProperty['type']> = {
  0: 'none', 1: 'object', 2: 'string', 3: 'int', 4: 'float', 5: 'bool', 7: 'struct',
  11: 'objectArray', 12: 'stringArray', 13: 'intArray', 14: 'floatArray', 15: 'boolArray', 17: 'structArray'
};

function parseVmad(data: Buffer): VmadData {
  let offset = 0;
  const scripts: VmadScript[] = [];
  let partialScriptName: string | null = null;
  let partialProperties: VmadProperty[] = [];

  const readU8 = () => { const v = data.readUInt8(offset); offset += 1; return v; };
  const readI16 = () => { const v = data.readInt16LE(offset); offset += 2; return v; };
  const readU16 = () => { const v = data.readUInt16LE(offset); offset += 2; return v; };
  const readU32 = () => { const v = data.readUInt32LE(offset); offset += 4; return v; };
  const readI32 = () => { const v = data.readInt32LE(offset); offset += 4; return v; };
  const readF32 = () => { const v = data.readFloatLE(offset); offset += 4; return v; };
  const need = (n: number) => { if (offset + n > data.length) throw new Error('vmad-truncated'); };
  const readWString = () => {
    need(2);
    const len = readU16();
    need(len);
    const text = data.toString('utf-8', offset, offset + len);
    offset += len;
    // Confirmed against real mod data: some tools' compiled output includes a stray
    // trailing NUL inside the length-prefixed string itself (property/script names seen
    // as e.g. "iLevelCount\0"), which would otherwise silently break exact-name matching
    // downstream (same real-world-messiness handling already applied to EDID/FULL below).
    return text.replace(/\0+$/, '');
  };
  // Object value layout, confirmed empirically against real, unmodified Sim Settlements 2
  // mod files (not the commonly-cited documentation, which describes FormID-first for
  // objectFormat 2 — that does NOT match real FO4 files): decoding a CPLayout record's
  // ParentCityPlan property this way and resolving the FormID against that same file's own
  // CityPlan record (found independently via its record header) produced an exact match.
  // Real layout for objectFormat 2: Unused(u16) + Alias(u16) + FormID(u32) — FormID is the
  // LAST 4 bytes, not the first.
  const readObjectValue = (objectFormat: number): VmadObjectValue => {
    need(8);
    if (objectFormat === 1) {
      // Not seen in any real FO4 sample during testing (FO4 plugins use objectFormat 2) —
      // kept as an unverified defensive fallback, same field order as format 2 above.
      readU16();
      const alias = readU16();
      const formId = readU32();
      return { formId, alias };
    }
    readU16(); // unused
    const alias = readU16();
    const formId = readU32();
    return { formId, alias };
  };

  // Struct value, confirmed empirically (FO4 adds Papyrus Struct support beyond Skyrim's
  // VMAD spec): fieldCount(u32) followed by that many fields, each serialized exactly like
  // a top-level property (name/type/status/value) — recursive, since a field's own value can
  // itself be any type including another struct or array.
  const readStructValue = (objectFormat: number): VmadProperty[] => {
    need(4);
    const fieldCount = readU32();
    const fields: VmadProperty[] = [];
    for (let f = 0; f < fieldCount; f++) {
      const fieldName = readWString();
      need(2);
      const rawType = readU8();
      readU8(); // field edit-status flags
      const fieldType = VMAD_PROPERTY_TYPES[rawType] ?? 'unknown';
      if (fieldType === 'unknown') throw new Error('vmad-unknown-struct-field-type');
      fields.push({ name: fieldName, type: fieldType, value: readValueForType(fieldType, objectFormat) });
    }
    return fields;
  };

  function readValueForType(type: VmadProperty['type'], objectFormat: number): unknown {
    if (type === 'object') return readObjectValue(objectFormat);
    if (type === 'string') return readWString();
    if (type === 'int') { need(4); return readI32(); }
    if (type === 'float') { need(4); return readF32(); }
    if (type === 'bool') { need(1); return readU8() !== 0; }
    if (type === 'struct') return readStructValue(objectFormat);
    if (type.endsWith('Array')) {
      need(4);
      const count = readU32();
      const elementType = type.replace('Array', '') as VmadProperty['type'];
      const arr: unknown[] = [];
      for (let i = 0; i < count; i++) arr.push(readValueForType(elementType, objectFormat));
      return arr;
    }
    return null; // 'none' has no value data
  }

  try {
    need(6);
    readI16(); // version — base script/property format is stable across the versions actually seen in FO4 plugins
    const objectFormat = readI16();
    const scriptCount = readU16();

    for (let s = 0; s < scriptCount; s++) {
      const scriptName = readWString();
      partialScriptName = scriptName;
      partialProperties = [];

      need(3);
      readU8(); // script status flags
      const propertyCount = readU16();

      for (let p = 0; p < propertyCount; p++) {
        const propName = readWString();
        need(2);
        const rawType = readU8();
        readU8(); // property edit-status flags
        const type = VMAD_PROPERTY_TYPES[rawType] ?? 'unknown';

        if (type === 'unknown') {
          // An unrecognized type byte means we don't know the value's size —
          // continuing would silently misalign every byte after it. Bail with
          // what's been parsed so far rather than guess.
          throw new Error('vmad-unknown-property-type');
        }

        const value = readValueForType(type, objectFormat);

        partialProperties.push({ name: propName, type, value });
      }

      scripts.push({ scriptName, properties: partialProperties });
      partialScriptName = null;
    }

    return { scripts, truncated: false, trailingBytes: Math.max(0, data.length - offset) };
  } catch {
    if (partialScriptName !== null) {
      scripts.push({ scriptName: partialScriptName, properties: partialProperties });
    }
    return { scripts, truncated: true, trailingBytes: Math.max(0, data.length - offset) };
  }
}

function extractRecord(type: string, formId: number, flags: number, data: Buffer): ParsedRecord {
  const subrecords = parseSubrecords(data);
  let editorId: string | undefined;
  let fullName: string | undefined;
  let vmadScripts: VmadScript[] | undefined;

  for (const sub of subrecords) {
    if (sub.type === 'EDID') editorId = readCString(sub.data);
    else if (sub.type === 'FULL' && !fullName) fullName = readDisplayString(sub.data);
    else if (sub.type === 'VMAD' && !vmadScripts) vmadScripts = parseVmad(sub.data).scripts;
  }

  let formListEntries: number[] | undefined;
  if (type === 'FLST') {
    formListEntries = subrecords
      .filter(sub => sub.type === 'LNAM' && sub.data.length >= 4)
      .map(sub => sub.data.readUInt32LE(0));
  }

  return {
    type,
    formId,
    flags,
    editorId,
    fullName,
    subrecords,
    isDeleted: (flags & FLAG_DELETED) !== 0,
    isAddition: (flags & FLAG_INITIALLY_DISABLED) === 0,
    vmadScripts,
    formListEntries
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
export function parsePluginDeep(filePath: string, maxBytes = 200 * 1024 * 1024, captureTypes: string[] = []): ParsedPlugin {
  const fileName = filePath.split(/[\\/]/).pop() || filePath;
  const stat = fs.statSync(filePath);
  if (stat.size > maxBytes) {
    // Master files (Fallout4.esm etc.) are hundreds of MB — not meant to be
    // deep-parsed for mod-conflict analysis. Return empty rather than block the UI.
    return { fileName, cells: [], refs: [], quests: [], formIdRefs: [], captured: {} };
  }

  const buffer = fs.readFileSync(filePath);
  const cells: ParsedCell[] = [];
  const refs: ParsedRef[] = [];
  const quests: ParsedQuest[] = [];
  const formIdRefs: Array<{ formId: number; recordType: string; references: number[] }> = [];
  const captureTypeSet = new Set(captureTypes);
  const captured: Record<string, ParsedRecord[]> = {};

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

      if (captureTypeSet.has(tag)) {
        if (!captured[tag]) captured[tag] = [];
        captured[tag].push(record);
      }

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

  return { fileName, cells, refs, quests, formIdRefs, captured };
}
