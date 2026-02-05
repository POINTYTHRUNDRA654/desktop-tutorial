/**
 * ESP/ESM File Parser for Fallout 4 Mod Mining
 * Parses Bethesda plugin files to extract records, relationships, and metadata
 */

import { ESPFile, ESPRecord, ESPField } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';

export class ESPParser {
  private buffer: Buffer;
  private offset: number = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  /**
   * Parse the entire ESP file
   */
  static async parseFile(filePath: string): Promise<ESPFile> {
    const buffer = await fs.promises.readFile(filePath);
    const parser = new ESPParser(buffer);
    const fileName = path.basename(filePath);
    return parser.parse(fileName);
  }

  private parse(fileName: string): ESPFile {
    const header = this.parseRecord();
    if (header.type !== 'TES4') {
      throw new Error('Invalid ESP file: missing TES4 header');
    }

    const records: ESPRecord[] = [];
    const masters: string[] = [];
    const formIdMap = new Map<number, ESPRecord>();

    // Extract masters from header
    for (const field of header.fields) {
      if (field.type === 'MAST') {
        masters.push(field.data.toString('utf-8').replace(/\0/g, ''));
      }
    }

    // Parse all records
    while (this.offset < this.buffer.length) {
      const record = this.parseRecord();
      records.push(record);
      formIdMap.set(record.formId, record);
    }

    return {
      fileName,
      header,
      records,
      masters,
      formIdMap
    };
  }

  private parseRecord(): ESPRecord {
    const startOffset = this.offset;

    // Read record header (24 bytes for Skyrim/Fallout 4)
    const type = this.readString(4);
    const dataSize = this.readUInt32();
    const flags = this.readUInt32();
    const formId = this.readUInt32();
    const timestamp = this.readUInt16(); // Skip timestamp
    const vcInfo = this.readUInt16(); // Skip version control info
    const version = this.readUInt16(); // Skip version
    const unknown = this.readUInt16(); // Skip unknown

    const fields: ESPField[] = [];
    const subrecords: ESPRecord[] = [];

    const endOffset = this.offset + dataSize;

    while (this.offset < endOffset) {
      const field = this.parseField();
      fields.push(field);

      // Check if this is a subrecord (starts with a record type)
      if (this.isRecordType(field.type) && this.offset + 24 <= endOffset) {
        // This might be a subrecord, try to parse it
        const subrecordStart = this.offset - field.data.length - 8; // Go back to field start
        try {
          const subrecord = this.parseRecord();
          subrecords.push(subrecord);
        } catch {
          // Not a valid subrecord, continue
          this.offset = subrecordStart + field.data.length + 8;
        }
      }
    }

    // Extract editor ID if present
    let editorId: string | undefined;
    for (const field of fields) {
      if (field.type === 'EDID') {
        editorId = field.data.toString('utf-8').replace(/\0/g, '');
        break;
      }
    }

    return {
      type,
      formId,
      editorId,
      flags,
      fields,
      subrecords
    };
  }

  private parseField(): ESPField {
    const type = this.readString(4);
    const size = this.readUInt16();
    const data = this.readBuffer(size);

    return {
      type,
      size,
      data
    };
  }

  private readString(length: number): string {
    const str = this.buffer.toString('ascii', this.offset, this.offset + length);
    this.offset += length;
    return str;
  }

  private readUInt16(): number {
    const value = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  private readUInt32(): number {
    const value = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  private readBuffer(length: number): Buffer {
    const buf = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return buf;
  }

  private isRecordType(type: string): boolean {
    // Common record types in Fallout 4
    const recordTypes = [
      'TES4', 'WEAP', 'ARMO', 'AMMO', 'MISC', 'STAT', 'MSTT', 'ACTI',
      'CONT', 'DOOR', 'LIGH', 'FLOR', 'FURN', 'NPC_', 'CREA', 'LVLI',
      'LVLN', 'KEYM', 'ALCH', 'IDLM', 'NOTE', 'PROJ', 'HAZD', 'BNDS',
      'TERM', 'LVLC', 'ENCH', 'SPEL', 'SCRL', 'QUST', 'IDLE', 'PACK',
      'CSTY', 'LSCR', 'ANIO', 'WATR', 'EFSH', 'EXPL', 'DEBR', 'IMGS',
      'IMAD', 'FLST', 'PERK', 'BPTD', 'ADDN', 'AVIF', 'CAMS', 'CPTH',
      'VTYP', 'MATT', 'IPCT', 'IPDS', 'ARMA', 'ECZN', 'LCTN', 'MESG',
      'RGDL', 'DOBJ', 'LGTM', 'MUSC', 'FSTP', 'FSTS', 'SMBN', 'SMEN',
      'SMQN', 'SMIL', 'DLBR', 'MUST', 'DLVW', 'WOOP', 'SHOU', 'EQUP',
      'RELA', 'SCEN', 'ASTP', 'OTFT', 'ARTO', 'MATO', 'MOVT', 'SNDR',
      'SNCT', 'SOPM', 'COLL', 'CLFM', 'REVB', 'PKIN', 'RFCT', 'LENS',
      'LSPR', 'GODR', 'SPGD', 'SCOL', 'NAVM', 'NAVI'
    ];
    return recordTypes.includes(type);
  }
}