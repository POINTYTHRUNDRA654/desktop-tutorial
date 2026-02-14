import type {
  TestType,
  TestSuite,
  TestCase,
  TestResult,
  TestResults,
  LoadOrderTestResult,
  CompatibilityTestResult,
  CompilationTestResult,
  IntegrityTestResult,
  Baseline,
  RegressionReport,
  BenchmarkResult,
  LoadTimeResult,
  MemoryLeakResult,
  TestScript,
  ScriptResult,
  QuestFlowResult,
  TestReport,
  ExportFormat,
} from '../shared/types';

function now() { return Date.now(); }
function makeId(prefix = 'id') { return `${prefix}_${Math.floor(Math.random()*90000)+10000}`; }

export class TestingSuiteEngine {
  private suites: Record<string, TestSuite> = {};
  private baselines: Record<string, Baseline> = {};

  // Test management
  async createTestSuite(name: string, type: TestType): Promise<TestSuite> {
    const id = makeId('suite');
    const suite: TestSuite = { id, name, type, tests: [], created: now(), lastRun: undefined };

    // add a few example tests so UI can show something
    suite.tests.push({ id: makeId('t'), name: `${name} :: basic smoke`, description: 'Auto-generated smoke test', type: 'unit', parameters: {}, expected: { type: 'pass' }, timeout: 5000 });
    suite.tests.push({ id: makeId('t'), name: `${name} :: compile scripts`, description: 'Compile scripts', type: 'unit', parameters: { scripts: [] }, expected: { type: 'pass' }, timeout: 10000 });

    this.suites[id] = suite;
    return suite;
  }

  async runTests(suiteId: string): Promise<TestResults> {
    const suite = this.suites[suiteId];
    if (!suite) throw new Error('Suite not found');

    const results: TestResult[] = [];
    let passed = 0, failed = 0, skipped = 0, totalDuration = 0;

    for (const t of suite.tests) {
      const r = await this.runSingleTest(t.id);
      results.push(r);
      totalDuration += r.duration;
      if (r.status === 'pass') passed++;
      else if (r.status === 'fail') failed++;
      else if (r.status === 'skip') skipped++;
    }

    suite.lastRun = Date.now();

    const testResults: TestResults = {
      suiteId,
      timestamp: Date.now(),
      duration: totalDuration,
      totalTests: suite.tests.length,
      passed,
      failed,
      skipped,
      results,
      summary: `${passed} passed, ${failed} failed, ${skipped} skipped, ${totalDuration}ms`,
    };

    return testResults;
  }

  async runSingleTest(testId: string): Promise<TestResult> {
    // Attempt to resolve a friendly testName if available
    let testName = testId;
    for (const s of Object.values(this.suites)) {
      const found = s.tests.find(t => t.id === testId);
      if (found) { testName = found.name; break; }
    }

    // Simulate test execution
    const duration = Math.floor(50 + Math.random() * 400);
    const passed = Math.random() > 0.12; // 88% pass rate for stubs
    const res: TestResult = {
      testId,
      testName,
      status: passed ? 'pass' : 'fail',
      duration,
      message: passed ? 'OK' : 'Assertion failed (stub)',
      error: passed ? undefined : new Error('Assertion failed (stub)'),
      actual: undefined,
      expected: undefined,
      stackTrace: passed ? undefined : (new Error().stack || undefined),
    };
    // short delay to simulate async
    await new Promise((r) => setTimeout(r, 5));
    return res;
  }

  // Automated testing
  async testLoadOrder(plugins: string[]): Promise<LoadOrderTestResult> {
    return { testId: makeId('load'), testName: 'LoadOrder check', status: 'pass', duration: 12, message: 'No conflicts', conflicts: [], missingMasters: [], circularDependencies: [], recommendations: [] } as any;
  }

  async testSaveGameCompatibility(savePath: string, modList: string[]): Promise<CompatibilityTestResult> {
    return { testId: makeId('compat'), testName: 'Save compatibility', status: 'pass', duration: 20, message: 'Compatible', compatibleMods: modList, incompatibleMods: [], warnings: [], saveable: true } as any;
  }

  async testScriptCompilation(scripts: string[]): Promise<CompilationTestResult> {
    // Very small parser-stub: treat any string containing "error" as compile error
    const errors: CompilationError[] = [];
    const warnings: CompilationWarning[] = [];
    const compiled: string[] = [];
    scripts.forEach((s, i) => {
      if (/error/i.test(s)) errors.push({ script: `script_${i}.psc`, line: 1, message: 'Syntax error (stub)' });
      else compiled.push(`script_${i}.psc`);
      if (/warn/i.test(s)) warnings.push({ script: `script_${i}.psc`, line: 1, message: 'Warning (stub)', severity: 'low' });
    });
    return { testId: makeId('compile'), testName: 'Script compilation', status: errors.length === 0 ? 'pass' : 'fail', duration: 5, message: errors.length === 0 ? 'Compiled' : 'Compilation errors', compiledScripts: compiled, errors, warnings } as any;
  }

  async testAssetIntegrity(assets: string[]): Promise<IntegrityTestResult> {
    // Stubbed check — assume all present
    return { testId: makeId('asset'), testName: 'Asset integrity', status: 'pass', duration: 8, message: 'All assets valid', validAssets: assets, corruptedAssets: [], missingAssets: [] } as any;
  }

  // Regression testing
  async createBaseline(modVersion: string): Promise<Baseline> {
    const results: TestResults = { suiteId: 'baseline-suite', timestamp: Date.now(), duration: 0, totalTests: 0, passed: 0, failed: 0, skipped: 0, results: [], summary: '0 passed' };
    const benchmarks: BenchmarkMetrics = {
      fpsAverage: 60,
      fpsMin: 55,
      fpsMax: 90,
      loadTime: 1000,
      memoryUsage: 1024,
      scriptLoad: 120,
      assetLoad: 300,
    };
    const baseline: Baseline = { version: modVersion, timestamp: now(), results, benchmarks };
    const key = `baseline_${Math.floor(Math.random()*100000)}`;
    this.baselines[key] = baseline;
    return baseline;
  }

  async compareToBaseline(current: TestResults, baseline: Baseline): Promise<RegressionReport> {
    // Stubbed comparison: check test count and simple perf delta
    const degradedTests: TestResult[] = [];
    const newFailures: TestResult[] = [];

    // detect simple performance regressions
    const perfRegs: MetricRegression[] = [];
    if (baseline?.benchmarks) {
      // compare fpsAverage if present in a very naive way
      const baseFPS = baseline.benchmarks.fpsAverage || 0;
      // simulate current fps inferred from test durations (stub)
      const currFPS = baseFPS - 0; // no change in stub
      const percentChange = baseFPS > 0 ? ((currFPS - baseFPS) / baseFPS) * 100 : 0;
      perfRegs.push({ metric: 'fpsAverage', baselineValue: baseFPS, currentValue: currFPS, percentChange, acceptable: Math.abs(percentChange) < 5 });
    }

    const regressionDetected = degradedTests.length > 0 || perfRegs.some(p => !p.acceptable);
    const summary = regressionDetected ? 'Regressions detected' : 'No regressions detected';

    return { regressionDetected, degradedTests, performanceRegressions: perfRegs, newFailures, summary };
  }

  // Performance testing
  async benchmarkModPerformance(mod: string): Promise<BenchmarkResult> {
    const metrics: BenchmarkMetrics = {
      fpsAverage: 55.3,
      fpsMin: 34,
      fpsMax: 92,
      loadTime: 1200,
      memoryUsage: 2048,
      scriptLoad: 210,
      assetLoad: 430,
    };
    return { modName: mod, timestamp: Date.now(), metrics };
  }

  async loadTimeTest(plugins: string[]): Promise<LoadTimeResult> {
    // stubbed breakdown based on input
    const pluginLoadTimes: { plugin: string; loadTime: number; percentage: number }[] = plugins.map((p, i) => {
      const t = 100 + i * 50;
      return { plugin: p, loadTime: t, percentage: 0 };
    });
    const total = pluginLoadTimes.reduce((s, p) => s + p.loadTime, 300);
    // compute percentages
    pluginLoadTimes.forEach(p => p.percentage = Math.round((p.loadTime / total) * 100));

    const assetLoadTimes: AssetLoadTime[] = [
      { assetType: 'textures', loadTime: 320, count: 120, averagePerAsset: 2.66 },
      { assetType: 'meshes', loadTime: 180, count: 45, averagePerAsset: 4 },
    ];

    const slowestPlugins = pluginLoadTimes.slice().sort((a,b) => b.loadTime - a.loadTime).slice(0, 3);

    return { totalTime: total, pluginLoadTimes: pluginLoadTimes as PluginLoadTime[], assetLoadTimes, slowestPlugins: slowestPlugins as PluginLoadTime[] };
  }

  async memoryLeakTest(duration: number): Promise<MemoryLeakResult> {
    const initialMemory = 1200; // MB
    const peakMemory = initialMemory + Math.floor(Math.random() * 400);
    const finalMemory = initialMemory + Math.floor(Math.random() * 80);
    const leakDetected = finalMemory > initialMemory + 50;
    const leakRate = leakDetected ? ((finalMemory - initialMemory) / Math.max(1, duration / 60)) : 0; // MB per minute
    const suspectedSources = leakDetected ? ['script:exampleQuest', 'plugin:heavy-npc-package'] : [];
    return { leakDetected, initialMemory, finalMemory, peakMemory, leakRate, suspectedSources };
  }

  // In-game testing
  async executeTestScript(script: TestScript): Promise<ScriptResult> {
    const start = now();
    const outputs: string[] = [];

    for (let i = 0; i < script.steps.length; i++) {
      const step = script.steps[i];
      // Simulate step execution
      switch (step.action) {
        case 'wait':
          await new Promise(r => setTimeout(r, step.parameters?.ms ?? 5));
          outputs.push(`waited:${step.parameters?.ms ?? 5}`);
          break;
        case 'execute-console':
          // If the step declares an explicit output, use it (useful for assertions in tests)
          if (step.parameters?.output) outputs.push(String(step.parameters.output));
          else outputs.push(`console:${step.parameters?.command ?? 'cmd'}`);
          break;
        case 'screenshot':
          outputs.push('screenshot-captured');
          break;
        case 'spawn':
        case 'teleport':
        case 'interact':
          outputs.push(`${step.action}:${JSON.stringify(step.parameters ?? {})}`);
          break;
        default:
          outputs.push(`unknown:${step.action}`);
      }
    }

    // Simple assertion evaluator (stubbed, supports 'lastOutput' and step[index])
    const evalActual = (expr: string) => {
      if (!expr) return undefined;
      if (expr === 'lastOutput') return outputs[outputs.length - 1];
      const m = expr.match(/^step\[(\d+)\]$/);
      if (m) return outputs[Number(m[1])] ?? undefined;
      try { return JSON.parse(expr); } catch { return expr; }
    };

    let allPass = true;
    for (const a of script.assertions || []) {
      const actual = evalActual(a.actual);
      const expected = a.expected;
      let pass = false;
      switch (a.type) {
        case 'equals': pass = actual === expected; break;
        case 'not-equals': pass = actual !== expected; break;
        case 'greater-than': pass = Number(actual) > Number(expected); break;
        case 'less-than': pass = Number(actual) < Number(expected); break;
        case 'contains': pass = String(actual).includes(String(expected)); break;
        case 'exists': pass = actual !== undefined && actual !== null; break;
      }
      if (!pass) {
        allPass = false;
        break;
      }
    }

    const runtime = Date.now() - start;
    return { success: allPass, output: outputs.join('\n'), runtimeMs: runtime };
  }

  async validateQuestFlow(quest: any, choices: any[]): Promise<QuestFlowResult> {
    const qName = quest?.name || 'unknown';
    const stages: QuestStage[] = (quest?.stages || []).map((s: any, idx: number) => ({ index: s.index ?? idx, objectives: s.objectives ?? [], conditions: s.conditions ?? [], flags: s.flags ?? { startGameEnabled: false, completeQuest: false, failQuest: false, shutDownStage: false } }));
    const completed = stages.some(s => s.flags?.completeQuest === true);
    const broken: number[] = []; // stub — no broken stages in demo
    const warnings: string[] = [];
    return { questName: qName, pathTaken: stages, completed, brokenStages: broken, warnings, success: true };
  }

  // Reporting
  async generateTestReport(results: TestResults): Promise<TestReport> {
    const title = `Test Report — ${results.suiteId}`;
    const summary = {
      totalTests: results.totalTests,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      duration: results.duration,
      passRate: results.totalTests > 0 ? results.passed / results.totalTests : 0,
    };

    const report: TestReport = {
      title,
      timestamp: Date.now(),
      summary,
      results,
      regressions: undefined,
      recommendations: [],
    };

    return report;
  }

  async exportTestResults(results: TestResults, format: ExportFormat): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(results, null, 2);
      case 'html':
        return `<html><body><pre>${JSON.stringify(results, null, 2)}</pre></body></html>`;
      case 'markdown':
        return `# Test Results\n\n**Suite:** ${results.suiteId}\n\n- Passed: ${results.passed}\n- Failed: ${results.failed}\n- Skipped: ${results.skipped}\n- Duration: ${results.duration}ms\n\n## Details\n\n${results.results.map(r => `- ${r.testName || r.testId}: ${r.status} (${r.duration} ms)`).join('\n')}`;
      case 'junit':
        return `<testsuite name="${results.suiteId}" tests="${results.totalTests}">` + results.results.map(r => {
          if (r.status === 'pass') return `<testcase name="${r.testName || r.testId}" time="${(r.duration/1000).toFixed(3)}"/>`;
          return `<testcase name="${r.testName || r.testId}" time="${(r.duration/1000).toFixed(3)}"><failure>${(r as any).message || 'failed'}</failure></testcase>`;
        }).join('') + `</testsuite>`;
      case 'pdf':
        return `<html><body><h1>Test Results: ${results.suiteId}</h1><pre>${JSON.stringify(results, null, 2)}</pre></body></html>`;
      default:
        throw new Error('Unsupported export format');
    }
  }
}

export const testingSuite = new TestingSuiteEngine();
export default testingSuite;
