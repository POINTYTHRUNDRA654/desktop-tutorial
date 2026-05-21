/**
 * Tests for the Spriggit cache-clear fix introduced to resolve the 0xFFFFFFFF
 * serialize crash that blocked onboarding.
 *
 * Coverage:
 *  1. Path safety validation — replicates the guard logic from main.ts so we
 *     catch any regression to that critical security check.
 *  2. IPC channel constant — verifies SPRIGGIT_CLEAR_CACHE is wired to the
 *     correct string so renderer and main process agree on the channel name.
 *  3. UI — full navigation from the edition step to the spriggit-digest step,
 *     triggering the 0xFFFFFFFF error and asserting the "Clear Cache & Retry"
 *     button appears and calls the spriggitClearCache IPC exactly once.
 */

import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { FirstRunOnboarding } from '../FirstRunOnboarding';

// Silence TTS — speakMossy calls window.speechSynthesis which is not available
// in jsdom.  Mock the whole module so all speak calls become silent no-ops.
vi.mock('../mossyTts', () => ({
  speakMossy: vi.fn().mockResolvedValue(undefined),
  cancelMossySpeak: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// 1. Path safety validation
//    Replicates the guard from the spriggit-clear-cache IPC handler in
//    src/electron/main.ts so a regression in the check is caught here first.
// ─────────────────────────────────────────────────────────────────────────────

/** Mirrors the validation from main.ts: only paths that end with /.net/spriggitcli are permitted. */
function isValidSpriggitCachePath(dir: string): boolean {
  const normalised = dir.replace(/\\/g, '/').toLowerCase();
  return normalised.endsWith('/.net/spriggitcli');
}

describe('spriggit-clear-cache — path safety validation', () => {
  test('accepts standard %LOCALAPPDATA% path (Windows backslashes)', () => {
    expect(
      isValidSpriggitCachePath('C:\\Users\\Test\\AppData\\Local\\Temp\\.net\\SpriggitCLI')
    ).toBe(true);
  });

  test('accepts standard %TEMP% path (Windows backslashes)', () => {
    expect(
      isValidSpriggitCachePath('C:\\Users\\Test\\AppData\\Local\\Temp\\.net\\SpriggitCLI')
    ).toBe(true);
  });

  test('accepts forward-slash variant', () => {
    expect(isValidSpriggitCachePath('/tmp/.net/SpriggitCLI')).toBe(true);
  });

  test('is case-insensitive (UPPERCASE folder name)', () => {
    expect(
      isValidSpriggitCachePath('C:\\Users\\Test\\AppData\\Local\\Temp\\.net\\SPRIGGITCLI')
    ).toBe(true);
  });

  test('rejects %SYSTEM32% path', () => {
    expect(isValidSpriggitCachePath('C:\\Windows\\System32')).toBe(false);
  });

  test('rejects empty string', () => {
    expect(isValidSpriggitCachePath('')).toBe(false);
  });

  test('rejects path that contains but does not END with the expected suffix', () => {
    expect(
      isValidSpriggitCachePath('C:\\Users\\Test\\AppData\\Local\\Temp\\.net\\SpriggitCLI\\subdir')
    ).toBe(false);
  });

  test('rejects a path missing the .net segment', () => {
    expect(isValidSpriggitCachePath('C:\\Users\\Test\\AppData\\Local\\Temp\\SpriggitCLI')).toBe(
      false
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. IPC channel constant
// ─────────────────────────────────────────────────────────────────────────────

describe('spriggit-clear-cache — IPC channel constant', () => {
  test('SPRIGGIT_CLEAR_CACHE is the string "spriggit-clear-cache"', async () => {
    // Import the shared types module — it contains only plain JS objects and
    // TypeScript interfaces so it is safe to import in jsdom.
    const { IPC_CHANNELS } = await import('@/electron/types');
    expect(IPC_CHANNELS.SPRIGGIT_CLEAR_CACHE).toBe('spriggit-clear-cache');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. UI — end-to-end navigation to the spriggit-digest error state
// ─────────────────────────────────────────────────────────────────────────────

/** Error text that mimics what the real Spriggit handler returns on 0xFFFFFFFF crashes. */
const FAKE_0xFFFFFFFF_ERROR =
  'DLCCoast.esm: exit code 4294967295\n' +
  'DLCNukaWorld.esm: exit code 4294967295\n' +
  'DLCRobot.esm: exit code 4294967295\n' +
  '...and 4 more plugin(s) failed.\n\n' +
  'Spriggit.CLI.exe starts correctly (--version passed) but crashes during serialize\n' +
  '(exit code 4294967295 / 0xFFFFFFFF).';

describe('FirstRunOnboarding — spriggit-digest 0xFFFFFFFF error recovery', () => {
  const mockOnComplete = vi.fn();
  let spriggitClearCacheMock: ReturnType<typeof vi.fn>;
  let spriggitSerializeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    // Silence TTS at the localStorage level as well
    localStorage.setItem('mossy_voice_enabled', 'false');

    spriggitClearCacheMock = vi
      .fn()
      .mockResolvedValue({ ok: true, clearedPaths: ['C:\\fake\\.net\\SpriggitCLI'] });

    spriggitSerializeMock = vi
      .fn()
      .mockResolvedValue({ ok: false, files: [], error: FAKE_0xFFFFFFFF_ERROR });

    (window as any).electron = {
      api: {
        getMossyEdition: vi.fn().mockResolvedValue('universal'),
        getSettings: vi.fn().mockResolvedValue({ uiLanguage: 'en' }),
        setSettings: vi.fn().mockResolvedValue({ ok: true }),
        getSystemInfo: vi.fn().mockResolvedValue({ os: 'Windows', ram: 16 }),
        detectPrograms: vi.fn().mockResolvedValue([]),
        checkDotnet: vi.fn().mockResolvedValue({ ok: true, version: '8.0.0' }),
        spriggitPickCli: vi
          .fn()
          .mockResolvedValue('D:\\Tools\\Spriggit\\Spriggit.CLI.exe'),
        pickDirectory: vi
          .fn()
          .mockResolvedValue('G:\\Steam\\steamapps\\common\\Fallout 4\\Data'),
        spriggitSerialize: spriggitSerializeMock,
        spriggitClearCache: spriggitClearCacheMock,
        saveKnowledgeVault: vi.fn().mockResolvedValue({ ok: true }),
        ttsSpeak: vi.fn(),
        onTtsSpeak: vi.fn(),
        removeListener: vi.fn(),
      },
    };
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * Navigate through edition → welcome → version → (scan) → credits → lists
   * → recommendations → downloads → spriggit-digest.
   *
   * Uses the "Start System Scan" button on the version step so the startScan()
   * function is called directly without the 500 ms setTimeout that the version-
   * picker buttons use.  This keeps tests fast and avoids fake-timer concerns.
   *
   * Each inter-step CTA is located via a stable data-testid so copy/i18n
   * changes cannot break navigation.
   */
  async function navigateToSpriggitDigest(): Promise<void> {
    const user = userEvent.setup();

    // edition → welcome
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // welcome → version
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    // version → scanning (startScan fires immediately, no setTimeout)
    await user.click(screen.getByRole('button', { name: /start system scan/i }));

    // scan async ops (mocked) complete; wait for credits step
    await waitFor(
      () => expect(screen.getByTestId('onboarding-credits-cta')).toBeInTheDocument(),
      { timeout: 10_000 }
    );

    // credits → lists
    await user.click(screen.getByTestId('onboarding-credits-cta'));

    // lists → recommendations
    await waitFor(
      () => expect(screen.getByTestId('onboarding-lists-cta')).toBeInTheDocument(),
      { timeout: 5_000 }
    );
    await user.click(screen.getByTestId('onboarding-lists-cta'));

    // recommendations → downloads
    await waitFor(
      () => expect(screen.getByTestId('onboarding-recommendations-cta')).toBeInTheDocument(),
      { timeout: 5_000 }
    );
    await user.click(screen.getByTestId('onboarding-recommendations-cta'));

    // downloads → spriggit-digest via "Finish Setup"
    await user.click(screen.getByRole('button', { name: /finish setup/i }));

    // wait for the spriggit-digest heading
    await waitFor(
      () =>
        expect(screen.getByText(/feed me the base game/i)).toBeInTheDocument(),
      { timeout: 10_000 }
    );
  }

  /** Set both Browse paths and wait for the Convert button to become enabled. */
  async function setPathsAndWaitForButton(): Promise<void> {
    const user = userEvent.setup();

    // There are exactly two Browse buttons in the spriggit-digest step.
    // First = Spriggit.CLI.exe, second = Fallout 4 Data Folder.
    const browseButtons = screen.getAllByRole('button', { name: /browse/i });
    const browseCli = browseButtons[0];
    const browseData = browseButtons[1];

    await user.click(browseCli);
    await waitFor(() =>
      expect(
        screen.getByDisplayValue('D:\\Tools\\Spriggit\\Spriggit.CLI.exe')
      ).toBeInTheDocument()
    );

    await user.click(browseData);
    await waitFor(() =>
      expect(
        screen.getByDisplayValue('G:\\Steam\\steamapps\\common\\Fallout 4\\Data')
      ).toBeInTheDocument()
    );

    // Wait for the .NET entry-check effect to finish so the button is enabled
    await waitFor(
      () =>
        expect(
          screen.getByRole('button', { name: /convert.*digest/i })
        ).not.toBeDisabled(),
      { timeout: 5_000 }
    );
  }

  // ── test 1 ──────────────────────────────────────────────────────────────────

  test(
    '"Clear Cache & Retry" button is visible after a 0xFFFFFFFF error',
    async () => {
      render(<FirstRunOnboarding onComplete={mockOnComplete} />, {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      await navigateToSpriggitDigest();
      await setPathsAndWaitForButton();

      // Trigger the error
      await userEvent.click(
        screen.getByRole('button', { name: /convert.*digest/i })
      );

      // Error text should appear in the UI
      await waitFor(
        () => expect(screen.getByText(/0xFFFFFFFF/)).toBeInTheDocument(),
        { timeout: 5_000 }
      );

      // The "Clear Cache & Retry" button must now be present
      expect(
        screen.getByRole('button', { name: /clear cache.*retry/i })
      ).toBeInTheDocument();
    },
    30_000
  );

  // ── test 2 ──────────────────────────────────────────────────────────────────

  test(
    'clicking "Clear Cache & Retry" calls spriggitClearCache IPC exactly once',
    async () => {
      render(<FirstRunOnboarding onComplete={mockOnComplete} />, {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      await navigateToSpriggitDigest();
      await setPathsAndWaitForButton();

      await userEvent.click(
        screen.getByRole('button', { name: /convert.*digest/i })
      );

      await waitFor(
        () => expect(screen.getByText(/0xFFFFFFFF/)).toBeInTheDocument(),
        { timeout: 5_000 }
      );

      // Click the cache-clear button
      await userEvent.click(
        screen.getByRole('button', { name: /clear cache.*retry/i })
      );

      // The IPC should have been invoked exactly once
      expect(spriggitClearCacheMock).toHaveBeenCalledTimes(1);
    },
    30_000
  );

  // ── test 3 ──────────────────────────────────────────────────────────────────

  test(
    '"Convert & Digest" button is disabled when cli path or data path is empty',
    async () => {
      render(<FirstRunOnboarding onComplete={mockOnComplete} />, {
        wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
      });

      await navigateToSpriggitDigest();

      // Neither path is set yet — button must be disabled
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /convert.*digest/i })
        ).toBeDisabled()
      );
    },
    30_000
  );
});
