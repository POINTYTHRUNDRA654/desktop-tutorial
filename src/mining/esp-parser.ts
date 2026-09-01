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
    //
    // Fixed 2026-08-26 (mining pipeline "ESP processing failed" on real, valid game files):
    // a full game master like Fallout4.esm is 300MB+ and many millions of records deep. This
    // loop previously had no recovery -- one unexpected/edge-case record anywhere in that
    // entire file (a corner case this hand-rolled parser doesn't model, a truly malformed
    // record from some third-party plugin, etc.) threw all the way out of parse() and
    // aborted the whole file, discarding every record already read with zero indication of
    // where or why. A partial record set from a huge file is far more useful than a hard
    // failure for a reporting/analysis feature, so a parse error now stops consumption and
    // returns everything gathered so far instead of throwing -- callers can inspect
    // `truncated`/`parseError` to know the result is partial.
    let truncated = false;
    let parseError: string | undefined;
    while (this.offset < this.buffer.length) {
      try {
        for (const record of this.parseTopLevel()) {
          records.push(record);
          formIdMap.set(record.formId, record);
        }
      } catch (error) {
        truncated = true;
        parseError = error instanceof Error ? error.message : String(error);
        break;
      }
    }

    return {
      fileName,
      header,
      records,
      masters,
      formIdMap,
      truncated,
      parseError
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

    // Fixed 2026-08-26 (root cause of the "Maximum call stack size exceeded" parse failure
    // on Fallout4.esm, confirmed live: 582,675 records recovered before the stop point --
    // exactly the record count you'd expect from this file's largest top-level GRUP, e.g.
    // its CELL group flattened across the whole game world): `children.push(...arr)` looks
    // like ordinary array concatenation, but V8 implements a spread call by pushing each
    // element as a real function argument -- and function calls have a hard argument-count
    // ceiling (tens of thousands, well under what a full game master's biggest GRUP produces
    // once flattened). Past that ceiling, `push(...bigArray)` throws exactly this "Maximum
    // call stack size exceeded" RangeError, even though there's no deep *recursion* going on
    // at all -- it just looks like a stack overflow because of how spread-call arguments are
    // implemented. A plain loop pushes one element at a time with no such limit.
    const groupEnd = Math.min(startOffset + groupSize, this.buffer.length);
    const children: ESPRecord[] = [];
    while (this.offset < groupEnd) {
      for (const record of this.parseTopLevel()) {
        children.push(record);
      }
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