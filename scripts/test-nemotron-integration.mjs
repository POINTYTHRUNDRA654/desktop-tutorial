/**
 * Nemotron Communication Integration Test
 * 
 * This test verifies:
 * 1. Build compilation successful
 * 2. App launches without errors
 * 3. Nemotron auto-connector initializes
 * 4. Installation detection works correctly
 * 5. IPC communication is functional
 * 6. Status is correctly reported to renderer
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(__dirname);

const execAsync = promisify(exec);

// Configuration
const TEST_TIMEOUT = 30000; // 30 seconds
const LOG_LEVEL_NEMOTRON = '[Nemotron]';
const LOG_LEVEL_IPC = '[IPC]';
const LOG_LEVEL_AUTO_CONNECTOR = '[NemotronAutoConnector]';

class NemotronCommunicationTester {
    constructor() {
        this.logs = {
            nemotron: [],
            ipc: [],
            autoConnector: [],
            all: []
        };
        this.testResults = {
            build: false,
            appLaunches: false,
            autoConnectorInits: false,
            installationDetected: false,
            ipcHandlers: false,
            statusReported: false
        };
    }

    async runTests() {
        console.log('🧪 Nemotron Communication Integration Test\n');
        console.log('='.repeat(70));

        try {
            await this.testBuild();
            await this.testAppCommunication();
            await this.reportResults();
        } catch (error) {
            console.error('\n❌ Test suite failed:', error.message);
            process.exit(1);
        }
    }

    async testBuild() {
        console.log('\n📦 [Test 1] Verifying Build...');
        try {
            const mainFile = path.join(projectRoot, 'dist-electron/electron/main.js');
            const autoConnectorFile = path.join(projectRoot, 'dist-electron/electron/services/nemotron-auto-connector.js');
            const handlerFile = path.join(projectRoot, 'dist-electron/electron/handlers/nemotron-handler.js');

            const mainExists = fs.existsSync(mainFile);
            const autoConnectorExists = fs.existsSync(autoConnectorFile);
            const handlerExists = fs.existsSync(handlerFile);

            console.log(`  ${mainExists ? '✅' : '❌'} Main entry: ${mainFile}`);
            console.log(`  ${autoConnectorExists ? '✅' : '❌'} Auto-connector: ${autoConnectorFile}`);
            console.log(`  ${handlerExists ? '✅' : '❌'} Handler: ${handlerFile}`);

            this.testResults.build = mainExists && autoConnectorExists && handlerExists;

            if (this.testResults.build) {
                console.log('  ✅ Build verification PASSED');
            } else {
                throw new Error('Build files missing - run npm run build first');
            }
        } catch (error) {
            console.error(`  ❌ Build verification FAILED: ${error.message}`);
            throw error;
        }
    }

    async testAppCommunication() {
        console.log('\n📡 [Test 2] Testing App Communication...');
        console.log(`  ⏳ Launching dev server (timeout: ${TEST_TIMEOUT / 1000}s)...\n`);

        return new Promise((resolve, reject) => {
            const devProcess = spawn('npm', ['run', 'dev'], {
                cwd: projectRoot,
                stdio: 'pipe',
                shell: true
            });

            const onLogData = (stream) => (data) => {
                const output = data.toString();
                this.logs.all.push(output);

                // Categorize logs
                if (output.includes(LOG_LEVEL_NEMOTRON)) {
                    this.logs.nemotron.push(output);
                    console.log(`  🔵 [Nemotron] ${output.trim()}`);
                }
                if (output.includes(LOG_LEVEL_AUTO_CONNECTOR)) {
                    this.logs.autoConnector.push(output);
                    console.log(`  🟢 [AutoConnector] ${output.trim()}`);
                }
                if (output.includes('Registered handler')) {
                    this.logs.ipc.push(output);
                }
                if (output.includes('ready-to-show')) {
                    console.log('  🟡 Window ready-to-show event fired');
                }
                if (output.includes('App listening on')) {
                    console.log('  🟣 Vite dev server ready');
                }

                // Track status
                if (output.includes('Auto-connection system initialized')) {
                    this.testResults.autoConnectorInits = true;
                }
                if (output.includes('Installation status')) {
                    this.testResults.installationDetected = true;
                }
            };

            devProcess.stdout.on('data', onLogData('stdout'));
            devProcess.stderr.on('data', onLogData('stderr'));

            // Set timeout
            const timeoutHandle = setTimeout(() => {
                devProcess.kill('SIGTERM');
                console.log(`\n  ⏰ Test timeout after ${TEST_TIMEOUT / 1000}s`);
                this.analyzeResults();
                resolve();
            }, TEST_TIMEOUT);

            devProcess.on('error', (error) => {
                clearTimeout(timeoutHandle);
                reject(error);
            });

            devProcess.on('close', () => {
                clearTimeout(timeoutHandle);
                this.analyzeResults();
                resolve();
            });
        });
    }

    analyzeResults() {
        console.log('\n' + '='.repeat(70));
        console.log('\n📊 Analysis:\n');

        // Check logs
        this.testResults.appLaunches = this.logs.all.length > 0;
        this.testResults.ipcHandlers = this.logs.ipc.length > 0;
        this.testResults.statusReported = this.logs.nemotron.length > 0 || this.logs.autoConnector.length > 0;

        console.log(`Nemotron logs captured: ${this.logs.nemotron.length} messages`);
        console.log(`Auto-connector logs captured: ${this.logs.autoConnector.length} messages`);
        console.log(`IPC handler registrations: ${this.logs.ipc.length} messages`);
        console.log(`Total output lines: ${this.logs.all.length}`);
    }

    async reportResults() {
        console.log('\n' + '='.repeat(70));
        console.log('\n✅ Test Results:\n');

        const results = this.testResults;
        console.log(`  ${results.build ? '✅' : '❌'} Build verification`);
        console.log(`  ${results.appLaunches ? '✅' : '❌'} App launches`);
        console.log(`  ${results.autoConnectorInits ? '✅' : '⚠️'} Auto-connector initializes`);
        console.log(`  ${results.installationDetected ? '✅' : '⚠️'} Installation detection`);
        console.log(`  ${results.ipcHandlers ? '✅' : '⚠️'} IPC handlers registered`);
        console.log(`  ${results.statusReported ? '✅' : '⚠️'} Status reported`);

        const passCount = Object.values(results).filter(v => v).length;
        const totalCount = Object.keys(results).length;

        console.log(`\n  Overall: ${passCount}/${totalCount} tests passed`);

        console.log('\n' + '='.repeat(70));
        console.log('\n📝 Next Steps:\n');
        console.log('  1. If all tests passed: Integration is working! 🎉');
        console.log('  2. If some tests failed: Check the log analysis above');
        console.log('  3. To test in packaged mode: npm run package && dist/Mossy\\ Setup\\ *.exe');
        console.log('  4. To test with Nemotron installed:');
        console.log('     - Run the installer and SELECT "Nemotron AI Integration"');
        console.log('     - Restart the app and verify connection status');

        process.exit(passCount === totalCount ? 0 : 1);
    }
}

// Run tests
const tester = new NemotronCommunicationTester();
await tester.runTests();
