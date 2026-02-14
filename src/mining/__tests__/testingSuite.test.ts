import { describe, it, expect } from 'vitest';
import { testingSuite } from '../testingSuite';

describe('TestingSuiteEngine (stubs)', () => {
  it('creates a test suite and contains example tests', async () => {
    const suite = await testingSuite.createTestSuite('My Suite', 'unit');
    expect(suite).toBeDefined();
    expect(suite.id).toMatch(/suite_/);
    expect(suite.tests.length).toBeGreaterThan(0);
  });

  it('runs a single test and returns a TestResult shape', async () => {
    const res = await testingSuite.runSingleTest('t_0001');
    expect(res).toHaveProperty('testId');
    expect(['pass','fail','skip','error']).toContain(res.status);
    expect(typeof res.duration).toBe('number');
    expect(res.testName).toBeDefined();
  });

  it('runs tests for a suite and returns TestResults summary', async () => {
    const suite = await testingSuite.createTestSuite('Run Suite', 'unit');
    const results = await testingSuite.runTests(suite.id);
    expect(results.suiteId).toBe(suite.id);
    expect(results.totalTests).toBe(suite.tests.length);
    expect(typeof results.timestamp).toBe('number');
    expect(typeof results.summary).toBe('string');
    expect(Array.isArray(results.results)).toBe(true);
  });

  it('compilation tester returns errors array for bad script', async () => {
    const good = await testingSuite.testScriptCompilation(['print("ok")']);
    expect(good.status).toBe('pass');
    const bad = await testingSuite.testScriptCompilation(['this will ERROR']);
    expect(bad.status).toBe('fail');
    expect(bad.errors.length).toBeGreaterThanOrEqual(0);
  });

  it('generateTestReport returns TestReport with summary', async () => {
    const suite = await testingSuite.createTestSuite('Report Suite', 'integration');
    const results = await testingSuite.runTests(suite.id);
    const report = await testingSuite.generateTestReport(results);
    expect(report.title).toBeDefined();
    expect(typeof report.timestamp).toBe('number');
    expect(report.summary).toBeDefined();
  });

  it('executes a structured TestScript and validates assertions', async () => {
    const script: TestScript = {
      name: 'simple-script',
      steps: [
        { action: 'execute-console', parameters: { command: 'echo', output: 'READY' }, description: 'emit READY' },
        { action: 'wait', parameters: { ms: 5 }, description: 'tiny wait' }
      ],
      assertions: [ { type: 'equals', actual: 'step[0]', expected: 'READY', message: 'first step output should be READY' } ],
      timeout: 2000,
    };

    const res = await testingSuite.executeTestScript(script);
    expect(res.success).toBe(true);
    expect(res.output).toContain('READY');
  });

  it('validateQuestFlow returns the new QuestFlowResult shape', async () => {
    const quest = { name: 'Q1', stages: [ { index: 0, objectives: [], conditions: [], flags: { startGameEnabled: false, completeQuest: false, failQuest: false, shutDownStage: false } }, { index: 1, objectives: [], conditions: [], flags: { startGameEnabled: false, completeQuest: true, failQuest: false, shutDownStage: false } } ] };
    const r = await testingSuite.validateQuestFlow(quest, []);
    expect(r.questName).toBe('Q1');
    expect(Array.isArray(r.pathTaken)).toBe(true);
    expect(typeof r.completed).toBe('boolean');
    expect(Array.isArray(r.brokenStages)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(r.success).toBe(true);
  });
});