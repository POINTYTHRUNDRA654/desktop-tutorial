
import { SecurityValidatorEngine } from '../securityValidator';

const engine = new SecurityValidatorEngine();

describe('SecurityValidatorEngine (stub)', () => {
  it('scans a benign file as clean', async () => {
    const res = await engine.scanFile('notes.txt');
    expect(res.safe).toBe(true);
    expect(res.score).toBeGreaterThan(0);
  });

  it('flags suspicious binary by extension', async () => {
    const res = await engine.scanFile('payload.exe');
    expect(res.safe).toBe(false);
    expect(res.threats.length).toBeGreaterThan(0);
  });

  it('analyzes papyrus code for patterns', async () => {
    const code = `Scriptname TestScript\nEvent OnUpdate()\n  ; do stuff\nEndEvent`;
    const analysis = await engine.analyzePapyrusScript(code);
    expect(analysis.issues.length).toBeGreaterThan(0);
    // `complexity` is a structured analysis result (cyclomatic + maintainability)
    expect(typeof analysis.complexity).toBe('object');
    expect(typeof (analysis.complexity as any).cyclomatic).toBe('number');
    expect(typeof (analysis.complexity as any).maintainability).toBe('number');
  });

  it('verifyChecksum/generateChecksum roundtrip', async () => {
    const tmp = 'temp_test_checksum.txt';
    const content = 'hello-checksum';
    require('fs').writeFileSync(tmp, content);
    const h = await engine.generateChecksum(tmp, 'sha256');
    const ok = await engine.verifyChecksum(tmp, h);
    expect(ok).toBe(true);
    require('fs').unlinkSync(tmp);
  });

  it('updates threat database and finds new entry', async () => {
    const up = await engine.updateThreatDatabase();
    expect(up.success).toBe(true);
    const some = Array.from((engine as any).threatDb.keys())[0];
    const found = await engine.checkAgainstDatabase(some as string);
    expect(found).not.toBeNull();
  });
});
