import fs from 'fs';
import crypto from 'crypto';
import type {
  ScanResult,
  ArchiveScanResult,
  ScriptScanResult,
  CodeAnalysis,
  Pattern,
  SandboxResult,
  UpdateResult,
  ThreatInfo,
} from '../shared/types';

function now() { return Date.now(); }
function makeId(prefix = 't') { return `${prefix}_${Math.floor(Math.random() * 90000) + 10000}`; }

/**
 * SecurityValidatorEngine
 * - Lightweight in-memory / stub implementations for early UI/IPC wiring and tests.
 * - Replace stubs with production scanners (virus engines, sandbox infra) before release.
 */
export class SecurityValidatorEngine {
  private threatDb: Map<string, ThreatInfo> = new Map();
  private dbVersion = 'v0';

  constructor() {
    // seed a fake threat DB for tests/demo (matches new ThreatInfo shape)
    const fake: ThreatInfo = { hash: 'deadbeef', name: 'ExampleMalware', type: 'trojan', severity: 'high', firstSeen: now() - 86400000, description: 'Demo threat' } as any;
    this.threatDb.set(fake.hash, fake);
    this.dbVersion = 'seed-1';
  }

  // -------------------------
  // Malware scanning (stubs)
  // -------------------------
  async scanFile(filePath: string): Promise<any> {
    // Return the new ScanResult shape (stubbed)
    const start = Date.now();
    const ext = (filePath.split('.').pop() || '').toLowerCase();
    const threats: any[] = [];
    const warnings: any[] = [];
    if (['exe','dll','scr','bat','ps1'].includes(ext)) {
      threats.push({ type: 'malware', severity: 'medium', description: 'Suspicious binary extension', location: filePath, confidence: 0.6 });
      warnings.push({ type: 'permission', description: 'Executable file detected', recommendation: 'Verify source before running' });
    }
    const safe = threats.length === 0;
    const duration = Date.now() - start;
    return { safe, threats, warnings, score: safe ? 95 : 35, scanDuration: duration };
  }

  async scanArchive(archivePath: string): Promise<any> {
    const start = Date.now();
    const scannedFiles = 3;
    const infectedFiles: string[] = archivePath.includes('infected') ? ['bad.exe'] : [];
    const suspiciousFiles: string[] = archivePath.includes('suspicious') ? ['maybe.psc'] : [];
    const base = await this.scanFile(archivePath);
    return { ...base, scannedFiles, infectedFiles, suspiciousFiles, scanDuration: Date.now() - start };
  }

  async scanScript(scriptPath: string): Promise<any> {
    const content = await fs.promises.readFile(scriptPath, 'utf8').catch(() => '');
    const start = Date.now();
    const dangerousFunctions: any[] = [];
    const networkCalls: any[] = [];
    const fileAccess: any[] = [];
    const issues: any[] = [];
    const lines = content.split(/\r?\n/);
    lines.forEach((ln, idx) => {
      if (/ShellExecute|ExecuteProgram|RunConsoleCommand/i.test(ln)) {
        dangerousFunctions.push({ name: ln.trim().split(/\s+/)[0], line: idx + 1, reason: 'Executes external process', severity: 'high' });
      }
      if (/HttpRequest|Fetch\(|Socket\./i.test(ln)) {
        networkCalls.push({ url: 'http://example.local', line: idx + 1, method: 'GET' });
      }
      if (/FileOpen|FileWrite|FileRead/i.test(ln)) {
        fileAccess.push({ path: '/path/to/file', operation: 'read', line: idx + 1 });
      }
      if (/OnUpdate\(|RegisterForUpdate\(/i.test(ln)) issues.push({ type: 'performance', severity: 'warning', line: idx + 1, message: 'Update handlers can be expensive' });
    });
    const safe = dangerousFunctions.length === 0 && networkCalls.length === 0;
    const duration = Date.now() - start;
    return { safe, threats: [], warnings: issues.map(i=>({ type: 'file-system', description: i.message, recommendation: 'Refactor to avoid OnUpdate' })), score: safe ? 92 : 40, scanDuration: duration, dangerousFunctions, networkCalls, fileAccess };
  }

  // -------------------------
  // Code analysis
  // -------------------------
  async analyzePapyrusScript(code: string): Promise<CodeAnalysis> {
    const lines = code.split(/\r?\n/);
    const issues: any[] = [];
    lines.forEach((ln, idx) => {
      if (/GlobalVar|PublicVar/.test(ln)) issues.push({ type: 'style', severity: 'warning', line: idx + 1, message: 'Avoid global variables where possible', suggestion: 'Use local variables or encapsulate state' });
      if (/OnUpdate\(|RegisterForUpdate\(/.test(ln)) issues.push({ type: 'performance', severity: 'error', line: idx + 1, message: 'Update handlers can cause runtime cost', suggestion: 'Use event-driven alternatives' });
    });
    const complexity = Math.min(100, Math.max(1, (code.match(/if\b|while\b|for\b|switch\b/g) || []).length + 1));
    const maintainability = Math.max(0, 100 - complexity);
    const safe = issues.filter(i=>i.severity==='error').length===0;
    return { safe, issues, complexity, maintainability };
  }

  async detectSuspiciousPatterns(code: string): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const checks: Array<{ id: string; re: RegExp; desc: string; sev: any }> = [
      { id: 'exec', re: /ShellExecute|ExecuteProgram|RunConsoleCommand/i, desc: 'Executes external commands', sev: 'high' },
      { id: 'io', re: /FileOpen|FileRead|FileWrite/i, desc: 'File I/O usage', sev: 'medium' },
      { id: 'update', re: /OnUpdate|RegisterForUpdate/i, desc: 'Update handler usage', sev: 'medium' },
    ];
    for (const c of checks) {
      if (c.re.test(code)) patterns.push({ id: c.id, description: c.desc, severity: c.sev, match: c.re.toString() });
    }
    return patterns;
  }

  // -------------------------
  // Integrity verification
  // -------------------------
  async verifyChecksum(filePath: string, expectedHash: string): Promise<boolean> {
    const actual = await this.generateChecksum(filePath, 'sha256').catch(() => null);
    return actual === expectedHash;
  }

  async generateChecksum(filePath: string, algorithm: 'md5' | 'sha256' = 'sha256'): Promise<string> {
    const data = await fs.promises.readFile(filePath).catch(()=>Buffer.from(''));
    const h = crypto.createHash(algorithm).update(data).digest('hex');
    return h;
  }

  // -------------------------
  // Signature verification (simple stub)
  // -------------------------
  async verifySignature(filePath: string, signature: string, publicKey: string): Promise<boolean> {
    // stub: our "signFile" returns `sig:<hexHash>`
    const hash = await this.generateChecksum(filePath, 'sha256');
    return signature === `sig:${hash}`;
  }

  async signFile(filePath: string, privateKey: string): Promise<string> {
    // stub: sign by returning sig:<sha256>
    const hash = await this.generateChecksum(filePath, 'sha256');
    return `sig:${hash}`;
  }

  // -------------------------
  // Sandboxing (stubbed)
  // -------------------------
  async runInSandbox(executable: string, args: string[], config?: any): Promise<SandboxResult> {
    // Simulated sandbox run that returns the new SandboxResult shape
    const start = Date.now();
    const output = `Simulated run of ${executable} ${args.join(' ')}`;
    const filesCreated = [`/tmp/${makeId('out')}.txt`];
    const filesModified: string[] = [];
    const networkActivity = [{ timestamp: Date.now(), url: 'http://example.local/ping', method: 'GET', dataSize: 0 }];
    const safe = true;
    return { exitCode: 0, output, errors: [], filesCreated, filesModified, networkActivity, safe } as SandboxResult;
  }

  // -------------------------
  // Threat database
  // -------------------------
  async updateThreatDatabase(): Promise<UpdateResult> {
    // stub: pretend to fetch and update
    this.dbVersion = `v${Date.now()}`;
    // add a sample threat (new ThreatInfo shape)
    const h: ThreatInfo = { hash: `hash_${Math.floor(Math.random()*99999)}`, name: 'NewThreat', type: 'adware', severity: 'low', firstSeen: now(), description: 'Auto-added' } as any;
    this.threatDb.set(h.hash, h);
    return { success: true, updatedAt: now(), version: this.dbVersion };
  }

  async checkAgainstDatabase(hash: string): Promise<ThreatInfo | null> {
    return this.threatDb.get(hash) || null;
  }
}

export const securityValidator = new SecurityValidatorEngine();
export default securityValidator;
