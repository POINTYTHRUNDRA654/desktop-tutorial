# VS Code Auto-Test Setup

## Purpose

This repository is configured to **automatically run tests** when you open it in Visual Studio Code. This ensures:

✅ Your development environment is properly configured  
✅ All dependencies are installed correctly  
✅ The codebase is working as expected  
✅ You get instant feedback without manual commands

## What Happens When You Open the Project

1. **VS Code detects the auto-run task** defined in `.vscode/tasks.json`
2. **You'll see a prompt**: "This folder contains a task that runs automatically when opening this folder"
3. **Click "Allow"** to enable automatic test execution
4. **Tests start running** immediately in a new terminal panel
5. **Results appear** showing pass/fail status for all 236+ unit tests

## The Tests Being Run

When you open the project, VS Code automatically executes:

```bash
npm run test
```

This runs the Vitest unit test suite, which validates:
- ✅ TypeScript compilation
- ✅ React component rendering  
- ✅ Electron IPC handlers
- ✅ Core application logic
- ✅ Integration points

## Why Automatic Tests Matter

### For New Contributors
- **No guesswork**: You immediately know if your environment is set up correctly
- **No manual steps**: Don't need to read docs to find test commands
- **Instant validation**: See test results within seconds of opening the project

### For Active Developers  
- **Continuous feedback**: Tests run automatically after pulling changes
- **Early detection**: Catch breaking changes before you start coding
- **Confidence**: Know the codebase is stable when you begin work

### For Code Quality
- **Prevents broken main**: Contributors can't ignore failing tests
- **Environment parity**: Everyone sees the same test results immediately
- **CI/CD locally**: Get CI-like feedback without pushing to GitHub

## Configuration Files

### `.vscode/tasks.json`
Defines the automatic task that runs on folder open:

```json
{
  "label": "Run Tests (Auto)",
  "command": "npm run test",
  "runOptions": {
    "runOn": "folderOpen"  // ← This makes it automatic
  }
}
```

### `.vscode/settings.json`  
Enables automatic task execution:

```json
{
  "task.allowAutomaticTasks": "on"  // ← This allows auto-run
}
```

## Manual Test Commands

You can still run tests manually if needed:

```bash
# Run tests once
npm run test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run all tests (unit + e2e)
npm run test:all

# Run e2e tests with Playwright UI
npm run test:e2e:ui
```

## Troubleshooting

### Tests Don't Run Automatically

1. **Check if you clicked "Allow"** when VS Code prompted you
2. **Verify settings**: Open Settings (Ctrl+,) and search for `task.allowAutomaticTasks`
3. **Reload window**: Press Ctrl+Shift+P → "Developer: Reload Window"

### Test Failures on First Run

If tests fail when you first open the project:

1. **Install dependencies**: Run `npm install` first
2. **Check Node.js version**: Requires Node.js 18+
3. **Clear caches**: Delete `node_modules` and `package-lock.json`, then `npm install`

### Want to Disable Auto-Run

If you prefer manual test execution:

1. Open `.vscode/tasks.json`
2. Remove the `"runOptions": { "runOn": "folderOpen" }` section
3. Reload VS Code

Or just click "Don't Allow" when prompted.

## What This Means for Development

### ✅ You Should
- Allow automatic tasks when prompted
- Pay attention to test results when opening the project
- Fix any failing tests before starting new work
- Use `npm run test:watch` during active development

### ❌ You Shouldn't  
- Ignore failing tests
- Disable auto-run to avoid seeing test failures
- Commit code if auto-tests are failing
- Skip the "Allow" prompt without understanding what it does

## Related Documentation

- See `package.json` → `"scripts"` for all available test commands
- See `vitest.config.ts` for test configuration
- See `playwright.config.ts` for e2e test configuration
- See `README.md` for full project setup instructions

---

**Remember**: Automatic tests are your friend. They catch problems early, validate your environment, and give you confidence that the codebase is stable. Always allow the auto-run task! 🚀
