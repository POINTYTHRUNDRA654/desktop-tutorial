# VS Code Auto-Run Tests Setup

## Overview
This project is configured to automatically run tests when you open it in Visual Studio Code.

## How It Works

When you clone this repository and open it in VS Code:

1. **Automatic Test Execution**: Tests will automatically start running as soon as the folder is opened
2. **Test Results**: A terminal panel will open showing the test output
3. **No Manual Commands Needed**: You don't need to run `npm test` manually

## Configuration Files

### `.vscode/tasks.json`
Defines the automated tasks:
- **Run Tests (Auto)**: Executes `npm run test` automatically on folder open
- **Run Tests (Watch Mode)**: Available manually to run tests in watch mode
- **Run All Tests**: Runs both unit and e2e tests

### `.vscode/settings.json`
Enables automatic task execution:
- `task.allowAutomaticTasks`: "on" - Allows tasks to run automatically
- `task.autoDetect`: "on" - Auto-detects npm scripts

## First Time Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/POINTYTHRUNDRA654/desktop-tutorial.git
   cd desktop-tutorial
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Open in VS Code:
   ```bash
   code .
   ```

4. When VS Code opens, you'll see a prompt asking to allow automatic tasks:
   - Click **"Allow"** to enable auto-run tests
   - Tests will start running immediately

## Manual Test Commands

You can still run tests manually if needed:

```bash
# Run unit tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run all tests (unit + e2e)
npm run test:all

# Run e2e tests with UI
npm run test:e2e:ui

# Run e2e tests in debug mode
npm run test:e2e:debug
```

## Available Tasks in VS Code

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and type "Tasks: Run Task" to see:
- Run Tests (Auto)
- Run Tests (Watch Mode)
- Run All Tests

## Troubleshooting

### Tests Don't Run Automatically
1. Make sure you clicked "Allow" on the automatic tasks prompt
2. Check VS Code settings: `task.allowAutomaticTasks` should be "on"
3. Reload the window: `Ctrl+Shift+P` → "Developer: Reload Window"

### Can't See Test Output
- Press `Ctrl+`` (backtick) to toggle the integrated terminal
- Look for the "Task - Run Tests (Auto)" terminal tab

### Want to Disable Auto-Run
Edit `.vscode/tasks.json` and remove the `runOptions` section from the "Run Tests (Auto)" task.

## Test Framework

This project uses:
- **Vitest** for unit tests (`npm run test:unit`)
- **Playwright** for e2e tests (`npm run test:e2e`)

## Learn More

- See `package.json` for all available test scripts
- See `.vscode/tasks.json` for task configuration
- See test files in the project for examples
