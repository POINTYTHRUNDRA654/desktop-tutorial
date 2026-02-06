# Mossy Desktop App - End-to-End Testing

This directory contains comprehensive end-to-end tests for the Mossy desktop application using Playwright.

## Overview

The testing suite covers:
- ✅ App launch and basic functionality
- ✅ Navigation and routing
- ✅ AI Chat interface and responses
- ✅ Voice/TTS functionality (the main reported issue)
- ✅ IPC communication between main and renderer processes
- ✅ Settings and configuration
- ✅ Packaged app specific functionality
- ✅ Error handling and boundaries

## Quick Start

### Prerequisites
```bash
npm install
npx playwright install
```

### Run All Tests
```bash
# Test development version
node e2e/test-runner.js dev

# Test packaged app (requires build first)
node e2e/test-runner.js packaged

# Test both dev and packaged
node e2e/test-runner.js all

# Build and test packaged app
node e2e/test-runner.js build
```

### Run Specific Tests
```bash
# Run only voice-related tests
node e2e/test-runner.js dev --grep "voice"

# Run in headed mode (see the browser)
node e2e/test-runner.js dev --headed

# Debug mode
node e2e/test-runner.js dev --debug
```

## Test Files

- **`app.spec.ts`** - Main application functionality tests
- **`ipc.spec.ts`** - IPC communication tests
- **`packaged.spec.ts`** - Packaged app specific tests
- **`test-runner.js`** - Test runner script with helpful commands

## Configuration

The tests are configured in `playwright.config.ts` with two projects:
- **`electron-dev`** - Tests the development version (`npm run dev`)
- **`electron-packaged`** - Tests the packaged installer

## Key Test Scenarios

### Voice/TTS Testing
The main issue reported was voice not working in the installer. Tests verify:
- TTS IPC communication works
- Cloud TTS (not browser APIs) is used
- Voice controls are functional
- Audio playback doesn't crash the app

### Packaged App Testing
Ensures the installer works correctly:
- App launches from packaged executable
- API keys are properly decrypted
- File system access works
- All routes are accessible
- No dev-mode dependencies

### IPC Communication
Tests the secure communication between Electron processes:
- ContextBridge APIs are accessible
- Settings storage works
- TTS commands are processed
- Error handling is proper

## Debugging Failed Tests

### Common Issues

1. **Port 5174 already in use**
   ```bash
   # Kill processes on port 5174
   npm run kill:port:5174
   ```

2. **Packaged app not found**
   ```bash
   # Build and package first
   npm run build
   npm run package:win
   ```

3. **API keys not loaded**
   - Ensure `.env.local` exists with encrypted keys
   - Check that keys are properly decrypted in main process

4. **TTS not working**
   - Verify OpenAI API key is configured
   - Check main process TTS handler logs
   - Ensure cloud TTS is used, not browser APIs

### Running Tests with Debug Output
```bash
# Run with debug logging
DEBUG=pw:api node e2e/test-runner.js dev --debug
```

## Continuous Integration

Add to your CI pipeline:
```yaml
- name: Run E2E Tests
  run: node e2e/test-runner.js all
```

## Troubleshooting

### Test Timeouts
If tests timeout, increase the timeout in `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 10000,
  navigationTimeout: 30000,
}
```

### Flaky Tests
For tests that occasionally fail, add retry logic:
```typescript
test('flaky test', async ({ page }) => {
  // Test code with retry
}).retries(3);
```

### Browser Context
Tests run in Electron context. If you need to test specific Electron APIs:
```typescript
await page.evaluate(() => {
  const electron = (window as any).electron;
  // Test Electron APIs
});
```

## Contributing

When adding new tests:
1. Follow the existing naming convention (`*.spec.ts`)
2. Add descriptive test names
3. Include proper error handling
4. Test both dev and packaged environments
5. Update this README if needed

## Test Coverage

Current test coverage includes:
- [x] App launch
- [x] Navigation
- [x] AI Chat
- [x] Voice/TTS
- [x] IPC Communication
- [x] Settings
- [x] Packaged App
- [x] Error Boundaries
- [x] Performance/Memory

Run the tests regularly to ensure all functionality works in both development and production environments.