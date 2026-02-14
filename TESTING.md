# Testing Guide

This document describes how to run tests for the Mossy Desktop application.

## Prerequisites

Before running tests, ensure you have:
1. Installed all dependencies: `npm install`
2. Installed Playwright browsers: `npx playwright install`

## Test Commands

### Run All Tests

To run both unit tests and end-to-end tests:

```bash
npm test
```

This command will:
1. Run all unit tests using Vitest
2. Run all end-to-end tests using Playwright

**Note**: E2E tests require the development server to be running or the app to be built.

### Run Unit Tests Only

To run only unit tests:

```bash
npm run test:unit
```

This runs all Vitest tests in the `src/**/*.test.ts` and `src/**/*.test.tsx` files.

### Run E2E Tests Only

To run only end-to-end tests:

```bash
npm run test:e2e
```

Available E2E test variations:
- `npm run test:e2e:ui` - Run tests with Playwright UI mode
- `npm run test:e2e:debug` - Run tests in debug mode
- `npm run test:e2e:headed` - Run tests in headed mode (show browser)

## Advanced Test Runner

For more control over E2E tests, use the custom test runner:

```bash
node e2e/test-runner.js <command> [options]
```

### Commands

- `dev` - Run tests against development server
- `packaged` - Run tests against packaged app
- `all` - Run all tests (dev + packaged)
- `build` - Build the app and run packaged tests
- `help` - Show help message

### Options

- `--headed` - Run tests in headed mode (show browser)
- `--debug` - Run tests in debug mode
- `--grep <pattern>` - Run only tests matching pattern

### Examples

Run all tests with detailed output:
```bash
node e2e/test-runner.js all --headed
```

Run development tests:
```bash
node e2e/test-runner.js dev
```

Run packaged tests (requires build):
```bash
node e2e/test-runner.js packaged --headed
```

Build and test:
```bash
node e2e/test-runner.js build
```

## Continuous Testing

For watch mode during development:

```bash
npm run test:watch
```

This will run Vitest in watch mode, automatically re-running tests when files change.

## Test Structure

- **Unit Tests**: Located in `src/**/__tests__/` directories
- **E2E Tests**: Located in `e2e/` directory
- **Test Configuration**: 
  - Vitest: `vitest.config.ts`
  - Playwright: `playwright.config.ts`

## Troubleshooting

### Playwright browsers not installed

If you see errors about missing browsers:

```bash
npx playwright install
```

### E2E tests failing

1. Ensure the dev server is running or the app is built
2. Check that the `dist-electron` directory exists
3. For packaged tests, ensure you've run `npm run package:win`

### Port conflicts

If the development server port is already in use:

```bash
npm run dev:killports
```

This will kill processes on ports 5174, 5173, and 21337.
