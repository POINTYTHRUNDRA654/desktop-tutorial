/**
 * ESP/ESM File Parser for Fallout 4 Mod Mining
 * Parses Bethesda plugin files to extract records, relationships, and metadata
 */

import { ESPFile, ESPRecord, ESPField } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

// Record header flag bit indicating the record's field data is zlib-compressed
// (first 4 bytes of the data span are the decompressed size, the rest is the payload).
const COMPRESSED_FLAG = 0x00040000;

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

    // Parse all top-level entries. Real plugins are a flat file only at the very top —
    // everything after the TES4 header is organized into GRUP containers (one per record
    // type / cell / worldspace block, etc.), each of which nests further records or GRUPs.
    // Flatten every GRUP's contents into `records` so downstream code keeps seeing the same
    // flat list of real game records it always has.
    while (this.offset < this.buffer.length) {
      for (const record of this.parseTopLevel()) {
        records.push(record);
        formIdMap.set(record.formId, record);
      }
    }

    return {
      fileName,
      header,
      records,
      masters,
      formIdMap
    };
  }

  /**
   * Reads one top-level entry at the current offset — either a GRUP (recursively flattened
   * into its contained records) or a single ordinary record.
   */
  private parseTopLevel(): ESPRecord[] {
    const startOffset = this.offset;
    const type = this.readString(4);

    if (type !== 'GRUP') {
      this.offset = startOffset;
      return [this.parseRecord()];
    }

    // GRUP header (24 bytes, same width as a record header): "GRUP" + groupSize(uint32,
    // INCLUSIVE of this header) + label(4 raw bytes) + groupType(int32) + timestamp(uint16)
    // + vcInfo(uint16) + unknown(uint32). We only need groupSize to find the boundary —
    // the label/type differ in meaning per groupType and aren't needed for flattening.
    const groupSize = this.readUInt32();
    this.offset += 4;  // label
    this.offset += 4;  // groupType
    this.offset += 2;  // timestamp
    this.offset += 2;  // vcInfo
    this.offset += 4;  // unknown

    const groupEnd = Math.min(startOffset + groupSize, this.buffer.length);
    const children: ESPRecord[] = [];
    while (this.offset < groupEnd) {
      children.push(...this.parseTopLevel());
    }
    // Realign exactly on the declared group boundary even if a malformed child under/over-read,
    // so a single corrupt group can't cascade into misreading everything after it.
    this.offset = groupEnd;
    return children;
  }

  private parseRecord(): ESPRecord {
    // Read record header (24 bytes for Skyrim/Fallout 4)
    const type = this.readString(4);
    const dataSize = this.readUInt32();
    const flags = this.readUInt32();
    const formId = this.readUInt32();
    const timestamp = this.readUInt16(); // Skip timestamp
    const vcInfo = this.readUInt16(); // Skip version control info
    const version = this.readUInt16(); // Skip version
    const unknown = this.readUInt16(); // Skip unknown

    const endOffset = this.offset + dataSize;
    const fields: ESPField[] = [];

    if (dataSize > 0 && (flags & COMPRESSED_FLAG) !== 0) {
      // Compressed record: first 4 bytes of the data span are the decompressed size,
      // the rest is a zlib deflate stream. Parse fields from the decompressed buffer via
      // a throwaway sub-parser so the outer cursor never has to know about decompression.
      try {
        const compressed = this.buffer.subarray(this.offset + 4, endOffset);
        const decompressed = zlib.inflateSync(compressed);
        const sub = new ESPParser(decompressed);
        while (sub.offset < decompressed.length) {
          fields.push(sub.parseField());
        }
      } catch {
        // Unsupported/corrupt compressed payload — skip this record's fields rather than
        // throwing and aborting parsing of the entire (otherwise valid) file.
      }
    } else {
      while (this.offset < endOffset && this.offset < this.buffer.length) {
        fields.push(this.parseField());
      }
    }
    // Always land exactly on the record's declared end, regardless of whether the field
    // loop above landed short/long — keeps every subsequent record correctly aligned.
    this.offset = endOffset;

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
      subrecords: []
    };
  }

  private parseField(): ESPField {
    const type = this.readString(4);
    const size = this.readUInt16();

    // "Large field" convention: an XXXX marker field (always size 4) holds the real uint32
    // size of the NEXT field, whose own inline uint16 size is then meaningless/ignored.
    if (type === 'XXXX' && size === 4) {
      const realSize = this.readUInt32();
      const nextType = this.readString(4);
      this.readUInt16(); // discard the next field's own (too-small) inline size
      const data = this.readBuffer(realSize);
      return { type: nextType, size: realSize, data };
    }

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

}