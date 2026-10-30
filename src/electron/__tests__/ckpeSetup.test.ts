// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readCkpeSetup, parseCkpeConfig, summarizeCkpeSetup } from '../ckpeSetup';

let dir: string;
const put = (rel: string, body: string | Buffer = '') => {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
};
/** A tiny file holding a real VS_FIXEDFILEINFO block for the given version. */
const fakeExe = (a: number, b: number, c: number, d: number) => {
  const buf = Buffer.alloc(64);
  buf.writeUInt32LE(0xfeef04bd, 16);
  buf.writeUInt32LE(0x00010000, 20);
  buf.writeUInt32LE(((a << 16) | b) >>> 0, 24);
  buf.writeUInt32LE(((c << 16) | d) >>> 0, 28);
  return buf;
};
const LOG = "Hi, I'm CKPE! Now: Thursday 29 Oct 2026\nCK: 1.11 build 246 rev:0\nCKPE Runtime: 0.6 build 267 rev:0\n";

beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ckpe-')); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe('readCkpeSetup', () => {
  it('reports CKPE as not installed when nothing is there', () => {
    put('CreationKit.exe', fakeExe(1, 11, 246, 0));
    const s = readCkpeSetup(dir);
    expect(s.detected).toBe(false);
    expect(s.found).toBe(false);
    expect(s.ckVersion).toBe('1.11.246.0');
    expect(s.issues[s.issues.length - 1].level).toBe('error');
  });

  it('detects a current CKPE 0.6 install (which the old .dll check missed)', () => {
    put('CreationKit.exe', fakeExe(1, 11, 246, 0));
    put('ckpe_loader.exe'); put('CKPE.dll'); put('CKPE.Fallout4.dll');
    put('CKPEBins/version-1-11-246-0.bin', 'x');
    put('CreationKitPlatformExtended.toml', '[CreationKit]\nbAllowSaveESM = true # comment\n[Log]\nsOutputFile = "ckpe.log"\n');
    put('ckpe.log', LOG);
    const s = readCkpeSetup(dir);
    expect(s.detected).toBe(true);
    expect(s.generation).toBe('current');
    expect(s.ckpeVersion).toBe('0.6 build 267');
    expect(s.ckSupported).toBe(true);
    expect(s.addressLibrary?.found).toBe(true);
    expect(s.logOutputEnabled).toBe(true);
    expect(s.settings.find((x) => x.key === 'CreationKit:bAllowSaveESM')?.value).toBe('true');
    expect(s.issues.some((i) => i.level === 'error')).toBe(false);
  });

  it('flags a missing address library for the CK version', () => {
    put('CreationKit.exe', fakeExe(1, 10, 982, 3));
    put('ckpe_loader.exe');
    put('CKPEBins/version-1-11-246-0.bin', 'x');
    const s = readCkpeSetup(dir);
    expect(s.addressLibrary).toEqual({ path: path.join(dir, 'CKPEBins', 'version-1-10-982-3.bin'), found: false });
    expect(s.issues.some((i) => i.level === 'error' && i.message.includes('version-1-10-982-3.bin'))).toBe(true);
  });

  it('reads the CK version from the log when CreationKit.exe has no version block', () => {
    put('CreationKit.exe', 'not a pe');
    put('ckpe_loader.exe');
    put('ckpe.log', LOG + 'IDDatabase::Load file "C:\\\\x\\\\CKPEBins\\\\version-1-11-246-0.bin" no found\n');
    const s = readCkpeSetup(dir);
    expect(s.ckVersion).toBe('1.11.246.0');
    expect(s.issues.some((i) => i.message.includes('IDDatabase::Load'))).toBe(true);
  });

  it('marks an old CreationKitPlatformExtended.dll install as legacy', () => {
    put('CreationKit.exe', fakeExe(1, 10, 162, 0));
    put('CreationKitPlatformExtended.dll'); put('CreationKitPlatformExtended.ini', '[CreationKit]\nbBSPointerHandleExtremly=true\n');
    const s = readCkpeSetup(dir);
    expect(s.generation).toBe('legacy');
    expect(s.pointerHandle).toBe(true);
    expect(s.addressLibrary).toBeNull();
  });

  it('warns when the previs-harmful precombine patch is forced on', () => {
    put('ckpe_loader.exe');
    put('CreationKitPlatformExtended.toml', '[PreCombined]\nbInstallOnlyModeCLI = false\n');
    const s = readCkpeSetup(dir);
    expect(s.issues.some((i) => i.level === 'warning' && i.message.includes('bInstallOnlyModeCLI'))).toBe(true);
    expect(summarizeCkpeSetup(s)).toContain('bInstallOnlyModeCLI=false');
  });
});

describe('parseCkpeConfig', () => {
  it('keeps sections apart and strips comments and quotes', () => {
    const m = parseCkpeConfig('# top\n[A]\nbX = true ; c\n[B]\nbX=false\nsY = "a b"\n');
    expect(m.get('A:bX')).toBe('true');
    expect(m.get('B:bX')).toBe('false');
    expect(m.get('B:sY')).toBe('a b');
  });
});
