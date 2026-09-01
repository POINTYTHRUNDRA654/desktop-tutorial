/**
 * IPC Communication Diagnostics
 * 
 * Tests frontend-backend communication to verify the Electron bridge is working.
 * Call this from the browser console: window.ipcDiagnostics.runAll()
 */

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

class IPCDiagnostics {
  private results: DiagnosticResult[] = [];

  /**
   * Run all diagnostic tests
   */
  async runAll(): Promise<void> {
    console.log('🔍 Starting IPC Communication Diagnostics...\n');
    
    this.results = [];

    // Test 1: Check API availability
    this.testAPIAvailability();

    // Test 2: Check window.electronAPI
    this.testElectronAPI();

    // Test 3: Invoke a simple IPC call
    await this.testSimpleInvoke();

    // Test 4: Invoke AI method
    await this.testAIMethod();

    // Test 5: Test error handling
    await this.testErrorHandling();

    // Print summary
    this.printSummary();
  }

  /**
   * Test 1: Check if window.electron.api exists
   */
  private testAPIAvailability(): void {
    const startTime = performance.now();
    
    try {
      if (!window.electron) {
        this.results.push({
          name: 'API Availability: window.electron',
          status: 'fail',
          message: 'window.electron is undefined',
          duration: performance.now() - startTime,
        });
        return;
      }

      if (!window.electron.api) {
        this.results.push({
          name: 'API Availability: window.electron.api',
          status: 'fail',
          message: 'window.electron.api is undefined',
          duration: performance.now() - startTime,
        });
        return;
      }

      if (!window.electron.invoke) {
        this.results.push({
          name: 'API Availability: window.electron.invoke',
          status: 'fail',
          message: 'window.electron.invoke is undefined',
          duration: performance.now() - startTime,
        });
        return;
      }

      const apiMethods = Object.keys(window.electron.api || {});
      this.results.push({
        name: '✅ API Availability',
        status: 'pass',
        message: `window.electron.api is available with ${apiMethods.length} methods`,
        details: apiMethods.slice(0, 10).join(', ') + (apiMethods.length > 10 ? '...' : ''),
        duration: performance.now() - startTime,
      });
    } catch (error) {
      this.results.push({
        name: 'API Availability',
        status: 'fail',
        message: `Error checking API: ${error instanceof Error ? error.message : String(error)}`,
        duration: performance.now() - startTime,
      });
    }
  }

  /**
   * Test 2: Check if window.electronAPI exists (compatibility)
   */
  private testElectronAPI(): void {
    const startTime = performance.now();

    try {
      if (!window.electronAPI) {
        this.results.push({
          name: '⚠️  Compatibility: window.electronAPI',
          status: 'warning',
          message: 'window.electronAPI is undefined (using window.electron.api instead)',
          duration: performance.now() - startTime,
        });
        return;
      }

      const apiMethods = Object.keys(window.electronAPI || {});
      this.results.push({
        name: '✅ Compatibility: window.electronAPI',
        status: 'pass',
        message: `window.electronAPI is available with ${apiMethods.length} methods`,
        duration: performance.now() - startTime,
      });
    } catch (error) {
      this.results.push({
        name: 'Compatibility: window.electronAPI',
        status: 'fail',
        message: `Error checking electronAPI: ${error instanceof Error ? error.message : String(error)}`,
        duration: performance.now() - startTime,
      });
    }
  }

  /**
   * Test 3: Invoke a simple, non-destructive method
   */
  private async testSimpleInvoke(): Promise<void> {
    const startTime = performance.now();

    try {
      const api = window.electron?.api || window.electronAPI;
      if (!api) {
        this.results.push({
          name: 'Simple IPC Invoke',
          status: 'fail',
          message: 'No API available to invoke',
          duration: performance.now() - startTime,
        });
        return;
      }

      if (!api.getSystemInfo) {
        this.results.push({
          name: 'Simple IPC Invoke',
          status: 'fail',
          message: 'getSystemInfo method not found',
          duration: performance.now() - startTime,
        });
        return;
      }

      const result = await api.getSystemInfo();
      
      if (result && typeof result === 'object') {
        this.results.push({
          name: '✅ Simple IPC Invoke (getSystemInfo)',
          status: 'pass',
          message: 'Successfully invoked getSystemInfo',
          details: `OS: ${result.os}, CPU Cores: ${result.cores}`,
          duration: performance.now() - startTime,
        });
      } else {
        this.results.push({
          name: 'Simple IPC Invoke',
          status: 'fail',
          message: 'getSystemInfo returned unexpected data',
          details: result,
          duration: performance.now() - startTime,
        });
      }
    } catch (error) {
      this.results.push({
        name: 'Simple IPC Invoke (getSystemInfo)',
        status: 'fail',
        message: `Invoke failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: performance.now() - startTime,
      });
    }
  }

  /**
   * Test 4: Test AI method specifically
   */
  private async testAIMethod(): Promise<void> {
    const startTime = performance.now();

    try {
      const api = window.electron?.api || window.electronAPI;
      if (!api) {
        this.results.push({
          name: 'AI Method Test (aiExplain)',
          status: 'fail',
          message: 'No API available',
          duration: performance.now() - startTime,
        });
        return;
      }

      if (!api.aiExplain) {
        this.results.push({
          name: '⚠️  AI Method Test (aiExplain)',
          status: 'warning',
          message: 'aiExplain method not found - check if preload was updated',
          duration: performance.now() - startTime,
        });
        return;
      }

      // Don't actually invoke it (might trigger AI), just check it exists
      this.results.push({
        name: '✅ AI Method Availability (aiExplain)',
        status: 'pass',
        message: 'aiExplain method is available on API',
        duration: performance.now() - startTime,
      });
    } catch (error) {
      this.results.push({
        name: 'AI Method Test',
        status: 'fail',
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        duration: performance.now() - startTime,
      });
    }
  }

  /**
   * Test 5: Test error handling for invalid invoke
   */
  private async testErrorHandling(): Promise<void> {
    const startTime = performance.now();

    try {
      const api = window.electron?.api || window.electronAPI;
      if (!api?.invoke) {
        this.results.push({
          name: 'Error Handling',
          status: 'warning',
          message: 'Cannot test error handling - invoke not available',
          duration: performance.now() - startTime,
        });
        return;
      }

      try {
        // Try to invoke a method that doesn't exist
        await api.invoke('nonexistent-channel-12345', {});
        this.results.push({
          name: '⚠️  Error Handling',
          status: 'warning',
          message: 'Invalid channel did not throw error (may be normal)',
          duration: performance.now() - startTime,
        });
      } catch (innerError) {
        this.results.push({
          name: '✅ Error Handling',
          status: 'pass',
          message: 'Invalid channel correctly threw error',
          details: innerError instanceof Error ? innerError.message : String(innerError),
          duration: performance.now() - startTime,
        });
      }
    } catch (error) {
      this.results.push({
        name: 'Error Handling',
        status: 'fail',
        message: `Test error: ${error instanceof Error ? error.message : String(error)}`,
        duration: performance.now() - startTime,
      });
    }
  }

  /**
   * Print formatted diagnostic summary
   */
  private printSummary(): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 DIAGNOSTIC RESULTS');
    console.log('='.repeat(70) + '\n');

    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;

    for (const result of this.results) {
      const icon =
        result.status === 'pass' ? '✅' :
        result.status === 'fail' ? '❌' :
        '⚠️ ';

      console.log(`${icon} ${result.name}`);
      console.log(`   Message: ${result.message}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
      if (result.duration !== undefined) {
        console.log(`   Duration: ${result.duration.toFixed(2)}ms`);
      }
      console.log();
    }

    console.log('='.repeat(70));
    console.log(`Summary: ${passCount} passed, ${warningCount} warnings, ${failCount} failed`);
    console.log('='.repeat(70) + '\n');

    if (failCount === 0) {
      console.log('✅ IPC communication is working correctly!');
    } else {
      console.log('❌ Issues detected - frontend-backend communication may not work.');
      console.log('   Check the failed tests above for details.');
    }
  }
}

// Expose globally for console access
(window as any).ipcDiagnostics = new IPCDiagnostics();

export default IPCDiagnostics;
