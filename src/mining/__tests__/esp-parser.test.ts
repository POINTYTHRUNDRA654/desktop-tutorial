/**
 * Regression tests for ESPParser (src/mining/esp-parser.ts).
 *
 * This module had zero test coverage despite two non-trivial, previously
 * live-broken behaviors documented inline (see esp-parser.ts's own comments,
 * both dated 2026-08-26): (1) a single malformed/unexpected record anywhere
 * in a 300MB+ game master used to abort the entire parse with nothing
 * recovered -- fixed to catch, stop, and return every record read so far via
 * `truncated`/`parseError`; (2) flattening a GRUP's contents used
 * `children.push(...arr)`, which V8 implements as pushing each element as a
 * real call argument -- past V8's argument-count ceiling (tens of
 * thousands, well under a full game master's biggest GRUP) this threw
 * "Maximum call stack size exceeded", fixed by switching to a plain loop.
 *
 * Both fixes were only ever described in a comment, never covered by an
 * automated test, which is exactly the "confident comment, not actually
 * re-verified" pattern this sweep went looking for -- these tests close
 * that gap with small synthetic ESP buffers built by hand (no real game
 * file needed) so the fixes can't silently regress.
 */
import { describe, it, expect } from 'vitest';
import { ESPParser } from '../esp-parser';

// ---- Synthetic ESP/ESM buffer builders --------------------------------
// Record header: type(4 ascii) + dataSize(u32 LE) + flags(u32 LE) +
// formId(u32 LE) + timestamp(u16) + vcInfo(u16) + version(u16) + unknown(u16)
// = 24 bytes, followed by dataSize bytes of field data.
function buildField(type: string, data: Buffer): Buffer {
  const header = Buffer.alloc(6);
  header.write(type, 0, 'ascii');
  header.writeUInt16LE(data.length, 4);
  return Buffer.concat([header, data]);
}

function buildRecord(type: string, formId: number, fields: Buffer[] = [], flags = 0): Buffer {
  const fieldData = Buffer.concat(fields);
  const header = Buffer.alloc(24);
  header.write(type, 0, 'ascii');
  header.writeUInt32LE(fieldData.length, 4);
  header.writeUInt32LE(flags, 8);
  header.writeUInt32LE(formId, 12);
  return Buffer.concat([header, fieldData]);
}

// GRUP header: "GRUP" + groupSize(u32 LE, INCLUSIVE of this 24-byte header)
// + label(4 raw) + groupType(i32) + timestamp(u16) + vcInfo(u16) + unknown(u32)
function buildGrup(children: Buffer[]): Buffer {
  const childData = Buffer.concat(children);
  const header = Buffer.alloc(24);
  header.write('GRUP', 0, 'ascii');
  header.writeUInt32LE(24 + childData.length, 4);
  return Buffer.concat([header, childData]);
}

function buildTES4(masters: string[] = []): Buffer {
  const fields = masters.map(m => buildField('MAST', Buffer.from(m + '\0', 'utf-8')));
  return buildRecord('TES4', 0, fields);
}

// Access ESPParser's binary parse() via the public constructor + a tiny
// reflection helper, since parse() itself is private and parseFile() reads
// from disk -- constructing a parser directly over an in-memory buffer and
// invoking its private parse() exercises the exact same logic without I/O.
function parseBuffer(buf: Buffer, fileName = 'test.esp') {
  const parser = new (ESPParser as any)(buf);
  return parser.parse(fileName);
}

describe('ESPParser', () => {
  it('parses a plain TES4 header plus top-level records with no GRUP', () => {
    const buf = Buffer.concat([
      buildTES4(),
      buildRecord('STAT', 0x001, [buildField('EDID', Buffer.from('MyStatic\0', 'utf-8'))]),
    ]);
    const result = parseBuffer(buf);
    expect(result.truncated).toBe(false);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].type).toBe('STAT');
    expect(result.records[0].formId).toBe(0x001);
    expect(result.records[0].editorId).toBe('MyStatic');
  });

  it('flattens a GRUP containing many records without a stack-overflow, matching the documented 2026-08-26 fix', () => {
    // Chosen comfortably above V8's real call-argument ceiling (tens of
    // thousands) so the old `children.push(...arr)` implementation would
    // reproduce the exact live "Maximum call stack size exceeded" failure
    // this test guards against, while staying fast to build/parse here.
    const RECORD_COUNT = 120_000;
    const children: Buffer[] = [];
    for (let i = 0; i < RECORD_COUNT; i++) {
      children.push(buildRecord('STAT', 0x1000 + i));
    }
    const buf = Buffer.concat([buildTES4(), buildGrup(children)]);
    const result = parseBuffer(buf);
    expect(result.truncated).toBe(false);
    expect(result.records).toHaveLength(RECORD_COUNT);
    expect(result.records[0].formId).toBe(0x1000);
    expect(result.records[RECORD_COUNT - 1].formId).toBe(0x1000 + RECORD_COUNT - 1);
  });

  it('recovers a partial record set instead of throwing when a record is malformed mid-file', () => {
    const goodRecord = buildRecord('STAT', 0x2000, [buildField('EDID', Buffer.from('Good\0', 'utf-8'))]);
    // Just a 4-byte record-type tag with none of the rest of the 24-byte
    // header present -- reading the next field (dataSize, a uint32) runs off
    // the end of the buffer and throws a real RangeError, exactly the
    // "corner-case/malformed record" scenario the fix is meant to recover
    // from (Buffer.slice()-based reads silently truncate instead of
    // throwing, so this has to be an out-of-range fixed-width read).
    const badHeader = Buffer.from('BADR', 'ascii');
    const buf = Buffer.concat([buildTES4(), goodRecord, badHeader]);

    const result = parseBuffer(buf);
    expect(result.truncated).toBe(true);
    expect(result.parseError).toBeTruthy();
    expect(result.records).toHaveLength(1);
    expect(result.records[0].editorId).toBe('Good');
  });

  it('extracts MAST fields from the TES4 header as masters', () => {
    const buf = buildTES4(['Fallout4.esm', 'DLCCoast.esm']);
    const result = parseBuffer(buf);
    expect(result.masters).toEqual(['Fallout4.esm', 'DLCCoast.esm']);
  });
});
