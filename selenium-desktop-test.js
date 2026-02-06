import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeleniumTestDesktop() {
  console.log('🚀 Starting basic desktop app test...');

  // Path to the packaged app
  const appPath = path.join(__dirname, 'release/win-unpacked/Mossy.exe');
  console.log('📁 App path:', appPath);

  let electronProcess;
  let driver;

  try {
    console.log('🔧 Starting Electron app...');

    // Start the Electron app without debugging for now
    electronProcess = spawn(appPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    console.log('✅ Electron app started with PID:', electronProcess.pid);

    // Capture stdout and stderr
    electronProcess.stdout.on('data', (data) => {
      console.log('📤 Electron stdout:', data.toString().trim());
    });

    electronProcess.stderr.on('data', (data) => {
      console.log('📥 Electron stderr:', data.toString().trim());
    });

    // Wait for the app to start
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check if the process is still running
    if (electronProcess.killed) {
      console.log('❌ Electron app exited prematurely');
      return;
    }

    console.log('✅ Electron app appears to be running');

    // For now, just test that the app starts without crashing
    // We'll need a different approach to test the UI

  } catch (error) {
    console.error('❌ Desktop test failed:', error);
  } finally {
    if (driver) {
      await driver.quit();
      console.log('🛑 WebDriver closed');
    }

    if (electronProcess) {
      try {
        process.kill(electronProcess.pid);
        console.log('🛑 Electron app terminated');
      } catch (e) {
        console.log('⚠️  Could not terminate Electron app');
      }
    }
  }
}

// Run the desktop test
runSeleniumTestDesktop().catch(console.error);