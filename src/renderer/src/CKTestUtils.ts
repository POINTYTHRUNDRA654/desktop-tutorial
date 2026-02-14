/**
 * CK Crash Prevention - Quick Test Utility
 * Run this in the browser console when on /ck-crash-prevention route
 */

// Test utility functions for CK Crash Prevention
const CKTestUtils = {
  /**
   * Simulate plugin metadata for testing
   */
  createMockPluginData(type: 'safe' | 'risky' | 'dangerous' = 'safe') {
    const base = {
      pluginPath: 'C:/Games/Fallout4/Data/TestMod.esp',
      pluginName: 'TestMod.esp',
      masters: ['Fallout4.esm'],
      lastModified: new Date(),
      hasScripts: true,
      hasNavmesh: false,
      hasPrecombines: false
    };

    switch (type) {
      case 'safe':
        return {
          ...base,
          recordCount: 500,
          fileSize: 5 * 1024 * 1024, // 5MB
        };
      case 'risky':
        return {
          ...base,
          pluginName: 'RiskyMod.esp',
          recordCount: 6000,
          fileSize: 55 * 1024 * 1024, // 55MB
          hasPrecombines: true,
        };
      case 'dangerous':
        return {
          ...base,
          pluginName: 'DangerousMod.esp',
          masters: ['Fallout4.esm', 'NonExistent.esm'], // Missing master
          recordCount: 8000,
          fileSize: 75 * 1024 * 1024, // 75MB
          hasNavmesh: true,
          hasPrecombines: true,
        };
    }
  },

  /**
   * Test validation with mock data
   */
  async testValidation(type: 'safe' | 'risky' | 'dangerous' = 'safe') {
    console.log(`🧪 Testing validation with ${type} plugin...`);
    
    const mockData = this.createMockPluginData(type);
    
    try {
      const result = await (window.electron.api as any).ckValidate(mockData);
      console.log('✅ Validation Result:', result);
      console.log(`   Risk Score: ${result.estimatedCrashRisk}%`);
      console.log(`   Severity: ${result.severity}`);
      console.log(`   Issues: ${result.issues.length}`);
      console.log(`   Valid: ${result.isValid}`);
      return result;
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  },

  /**
   * Test process metrics with mock PID
   */
  async testProcessMetrics(pid: number = 1234) {
    console.log(`🧪 Testing process metrics for PID ${pid}...`);
    
    try {
      const result = await window.electron.api.getProcessMetrics(pid);
      
      if (result.success) {
        console.log('✅ Process Metrics:', result.metrics);
        console.log(`   Memory: ${result.metrics.memoryUsageMB} MB`);
        console.log(`   CPU: ${result.metrics.cpuPercent}%`);
        console.log(`   Handles: ${result.metrics.handleCount}`);
        console.log(`   Status: ${result.metrics.responsiveness}`);
      } else {
        console.warn('⚠️ Process not found or error:', result.error);
      }
      return result;
    } catch (error) {
      console.error('❌ Metrics collection failed:', error);
      throw error;
    }
  },

  /**
   * Test crash analysis with mock log
   */
  async testCrashAnalysis(crashType: 'memory' | 'navmesh' | 'precombine' = 'memory') {
    console.log(`🧪 Testing crash analysis for ${crashType} crash...`);
    
    const mockLogs = {
      memory: `
        Fallout 4 Creation Kit has stopped working
        Exception: std::bad_alloc
        Memory allocation failed: requested 128MB, available 84MB
        Error Code: 0xC0000017
        Call stack:
          CK.exe+0x12AB34
          CK.exe+0x45CD67
      `,
      navmesh: `
        Unhandled exception: access violation at 0x00000000
        Reading from address 0x00000000
        Context: NavMesh finalization
        Error Code: 0xC0000005
        Exception in module: CK.exe at 0x67AB12
      `,
      precombine: `
        Fatal error: Access violation
        Exception address: 0x12345678
        Attempting to read precombine data
        Context: Precombine::GenerateCombinedMesh
        Error Code: 0xC0000005
      `
    };

    try {
      const result = await (window.electron.api as any).ckAnalyzeCrash(mockLogs[crashType]);
      console.log('✅ Crash Diagnosis:', result);
      console.log(`   Type: ${result.crashType}`);
      console.log(`   Root Cause: ${result.rootCause}`);
      console.log(`   Preventable: ${result.preventable}`);
      console.log(`   Recommendations: ${result.recommendations.length}`);
      return result;
    } catch (error) {
      console.error('❌ Crash analysis failed:', error);
      throw error;
    }
  },

  /**
   * Test prevention plan generation
   */
  async testPreventionPlan(pluginType: 'safe' | 'risky' | 'dangerous' = 'risky') {
    console.log(`🧪 Testing prevention plan for ${pluginType} plugin...`);
    
    const mockData = this.createMockPluginData(pluginType);
    const modContext = {
      plugin: mockData,
      loadOrder: ['Fallout4.esm', mockData.pluginName],
      installedMods: [],
      ckVersion: '1.10.163',
      systemMemoryGB: 16,
      previousCrashes: []
    };

    try {
      const result = await (window.electron.api as any).ckGeneratePreventionPlan(modContext);
      console.log('✅ Prevention Plan:', result);
      console.log(`   Steps: ${result.steps.length}`);
      console.log(`   Risk Reduction: ${result.estimatedRiskReduction}%`);
      console.log(`   Time: ${result.estimatedTime}`);
      console.log(`   Priority: ${result.priority}`);
      return result;
    } catch (error) {
      console.error('❌ Plan generation failed:', error);
      throw error;
    }
  },

  /**
   * Run all tests in sequence
   */
  async runAllTests() {
    console.log('🚀 Running CK Crash Prevention Test Suite...\n');
    
    const results = {
      validation: { passed: 0, failed: 0 },
      metrics: { passed: 0, failed: 0 },
      crash: { passed: 0, failed: 0 },
      plan: { passed: 0, failed: 0 }
    };

    // Test 1: Validation (3 types)
    console.log('\n📋 Test Suite 1: Plugin Validation');
    for (const type of ['safe', 'risky', 'dangerous'] as const) {
      try {
        await this.testValidation(type);
        results.validation.passed++;
      } catch (error) {
        results.validation.failed++;
      }
    }

    // Test 2: Process Metrics (will fail if no process)
    console.log('\n📋 Test Suite 2: Process Metrics');
    try {
      await this.testProcessMetrics(process.pid || 1234);
      results.metrics.passed++;
    } catch (error) {
      results.metrics.failed++;
    }

    // Test 3: Crash Analysis (3 types)
    console.log('\n📋 Test Suite 3: Crash Analysis');
    for (const type of ['memory', 'navmesh', 'precombine'] as const) {
      try {
        await this.testCrashAnalysis(type);
        results.crash.passed++;
      } catch (error) {
        results.crash.failed++;
      }
    }

    // Test 4: Prevention Plan (3 types)
    console.log('\n📋 Test Suite 4: Prevention Plan');
    for (const type of ['safe', 'risky', 'dangerous'] as const) {
      try {
        await this.testPreventionPlan(type);
        results.plan.passed++;
      } catch (error) {
        results.plan.failed++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 Test Suite Summary:');
    console.log('='.repeat(60));
    console.log(`Validation:  ${results.validation.passed} passed, ${results.validation.failed} failed`);
    console.log(`Metrics:     ${results.metrics.passed} passed, ${results.metrics.failed} failed`);
    console.log(`Crash:       ${results.crash.passed} passed, ${results.crash.failed} failed`);
    console.log(`Plan:        ${results.plan.passed} passed, ${results.plan.failed} failed`);
    
    const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
    const totalTests = totalPassed + totalFailed;
    const passRate = ((totalPassed / totalTests) * 100).toFixed(1);
    
    console.log('='.repeat(60));
    console.log(`Total:       ${totalPassed}/${totalTests} (${passRate}%)`);
    console.log('='.repeat(60));

    if (totalFailed === 0) {
      console.log('✅ All tests passed!');
    } else {
      console.warn(`⚠️ ${totalFailed} test(s) failed - review errors above`);
    }

    return results;
  },

  /**
   * Quick smoke test - validates basic functionality
   */
  async smokeTest() {
    console.log('🔥 Running Smoke Test...\n');
    
    try {
      // Test 1: Can we validate?
      console.log('1. Testing validation...');
      await this.testValidation('safe');
      
      // Test 2: Can we analyze crashes?
      console.log('\n2. Testing crash analysis...');
      await this.testCrashAnalysis('memory');
      
      // Test 3: Can we generate plans?
      console.log('\n3. Testing prevention plan...');
      await this.testPreventionPlan('safe');
      
      console.log('\n✅ Smoke test passed! Core functionality is working.');
      return true;
    } catch (error) {
      console.error('\n❌ Smoke test failed! Core functionality is broken.');
      console.error('Error:', error);
      return false;
    }
  },

  /**
   * Verify IPC handlers are registered
   */
  async verifyIPC() {
    console.log('🔍 Verifying IPC handlers...\n');
    
    const handlers = [
      { name: 'getPluginMetadata', exists: typeof (window.electron.api as any).getPluginMetadata === 'function' },
      { name: 'getProcessMetrics', exists: typeof (window.electron.api as any).getProcessMetrics === 'function' },
      { name: 'readCrashLog', exists: typeof (window.electron.api as any).readCrashLog === 'function' },
      { name: 'ckValidate', exists: typeof (window.electron.api as any).ckValidate === 'function' },
      { name: 'ckGeneratePreventionPlan', exists: typeof (window.electron.api as any).ckGeneratePreventionPlan === 'function' },
      { name: 'ckAnalyzeCrash', exists: typeof (window.electron.api as any).ckAnalyzeCrash === 'function' },
    ];

    let allPresent = true;
    handlers.forEach(handler => {
      if (handler.exists) {
        console.log(`✅ ${handler.name}`);
      } else {
        console.error(`❌ ${handler.name} - NOT FOUND`);
        allPresent = false;
      }
    });

    console.log('\n' + (allPresent ? '✅ All IPC handlers registered' : '❌ Some handlers missing'));
    return allPresent;
  }
};

// Export to window for easy console access
(window as any).CKTestUtils = CKTestUtils;

// Auto-run verification on load
console.log('🛡️ CK Crash Prevention Test Utils Loaded');
console.log('📝 Available commands:');
console.log('  CKTestUtils.smokeTest()           - Quick functionality check');
console.log('  CKTestUtils.runAllTests()         - Full test suite');
console.log('  CKTestUtils.verifyIPC()           - Check IPC handlers');
console.log('  CKTestUtils.testValidation(type)  - Test validation (safe|risky|dangerous)');
console.log('  CKTestUtils.testCrashAnalysis(t)  - Test crash analysis (memory|navmesh|precombine)');
console.log('');

// Auto-verify IPC on load
CKTestUtils.verifyIPC();

export { CKTestUtils };
