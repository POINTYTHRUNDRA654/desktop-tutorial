/**
 * LiveContext.test.tsx
 *
 * Tests for LiveContext — in particular the four bugs fixed in the
 * "voice session cannot reconnect" PR:
 *
 *  1. Transcription grace-period after speak end (original test, preserved)
 *  2. Mute gate: handleTranscription is suppressed when isMuted=true.
 *     The bug was that handleTranscription is a stale closure captured at
 *     connect() time, so the React isMuted state was invisible to it.
 *     The fix uses isMutedRef (a mutable ref kept in sync via useEffect).
 *  3. Unmuting re-enables transcription.
 *  4. Session-ID filter: transcriptions from an old session are ignored.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeAll } from 'vitest';

// shim DOM APIs that the provider uses
beforeAll(() => {
  // mediaDevices mock
  Object.defineProperty(global, 'navigator', {
    value: {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({}),
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
    },
    configurable: true,
  });
  // indexedDB shim to satisfy idb library
  (global as any).indexedDB = {
    openDB: vi.fn().mockResolvedValue({}),
  };
});

import LiveContext, { LiveProvider, useLive } from '../LiveContext';

// helper component to grab context value in tests
function Consumer(props: { onCreate: (ctx: any) => void }) {
  const ctx = useLive();
  React.useEffect(() => {
    props.onCreate(ctx);
  }, [ctx]);
  return null;
}

/** Mount a LiveProvider and return a live reference to the context. */
function mountProvider() {
  let context: any;
  render(
    <LiveProvider>
      <Consumer onCreate={(c) => { context = c; }} />
    </LiveProvider>
  );
  return { getCtx: () => context };
}

// ─── Suite 1: speak-end grace period (original test) ─────────────────────────

describe('LiveContext transcription suppression', () => {
  it('ignores transcription within grace period after speak end', async () => {
    const { getCtx } = mountProvider();
    const context = getCtx();

    // verify test helpers are present
    expect(context.__test_handleTranscription).toBeDefined();
    expect(context.__test_setLastSpeakEnd).toBeDefined();

    // simulate that we just finished speaking 100ms ago
    context.__test_setLastSpeakEnd(Date.now() - 100);

    // call transcription and ensure it is ignored (transcription state unchanged)
    await act(async () => {
      await context.__test_handleTranscription('hello');
    });
    expect(getCtx().transcription).toBe('');

    // simulate time passing beyond grace period
    context.__test_setLastSpeakEnd(Date.now() - 1000);

    await act(async () => {
      await context.__test_handleTranscription('world');
    });
    expect(getCtx().transcription).toBe('world');
  });
});

// ─── Suite 2: mute gate (the stale-closure isMutedRef fix) ───────────────────

describe('LiveContext mute gate', () => {
  it('toggleMute() suppresses handleTranscription via isMutedRef', async () => {
    const { getCtx } = mountProvider();

    // Mute the session
    await act(async () => {
      getCtx().toggleMute();
    });
    expect(getCtx().isMuted).toBe(true);

    // Transcription should be silently dropped
    await act(async () => {
      await getCtx().__test_handleTranscription('should be ignored');
    });
    expect(getCtx().transcription).toBe('');
  });

  it('unmuting re-enables handleTranscription', async () => {
    const { getCtx } = mountProvider();

    // Mute then immediately unmute
    await act(async () => {
      getCtx().toggleMute(); // now muted
    });
    await act(async () => {
      getCtx().toggleMute(); // now unmuted
    });
    expect(getCtx().isMuted).toBe(false);

    // Transcription should now be processed (sendMessageToMain will fail — that
    // is expected; we just verify transcription state is set before the async AI call)
    await act(async () => {
      await getCtx().__test_handleTranscription('accepted');
    });
    // The transcription is set synchronously before the AI round-trip
    expect(getCtx().transcription).toBe('accepted');
  });

  it('muting does not affect the speak-end grace period', async () => {
    const { getCtx } = mountProvider();

    // Mute
    await act(async () => { getCtx().toggleMute(); });

    // Even with mute, grace-period filter should also apply (both are independent guards)
    getCtx().__test_setLastSpeakEnd(Date.now() - 100); // within grace period

    await act(async () => {
      await getCtx().__test_handleTranscription('muted-and-within-grace');
    });
    expect(getCtx().transcription).toBe('');
  });

  it('transcription is ignored while muted even after grace period expires', async () => {
    const { getCtx } = mountProvider();

    // Move past grace period
    getCtx().__test_setLastSpeakEnd(Date.now() - 1000);

    // Mute
    await act(async () => { getCtx().toggleMute(); });

    await act(async () => {
      await getCtx().__test_handleTranscription('muted-past-grace');
    });
    expect(getCtx().transcription).toBe('');
  });
});

// ─── Suite 3: session-ID filter (existing protection, verified) ──────────────

describe('LiveContext session-ID filter', () => {
  it('ignores transcriptions from a stale session ID', async () => {
    const { getCtx } = mountProvider();

    // Call handleTranscription with a session ID that does not match
    // currentSessionRef.current (which starts at 0)
    await act(async () => {
      await getCtx().__test_handleTranscription('stale', 99);
    });
    expect(getCtx().transcription).toBe('');
  });

  it('accepts transcription when session ID is undefined (legacy path)', async () => {
    const { getCtx } = mountProvider();
    getCtx().__test_setLastSpeakEnd(Date.now() - 1000); // past grace period

    // undefined sessionId bypasses session filter — used by older callers
    await act(async () => {
      await getCtx().__test_handleTranscription('no-session-id', undefined);
    });
    // transcription should be set (AI call may fail, that's OK)
    expect(getCtx().transcription).toBe('no-session-id');
  });
});

// ─── Suite 4: text-input bypasses voice-session guards ───────────────────────

describe('LiveContext text input guards', () => {
  it('text input (isTextInput=true) is NOT suppressed when mic is muted', async () => {
    const { getCtx } = mountProvider();

    // Mute the session
    await act(async () => {
      getCtx().toggleMute();
    });
    expect(getCtx().isMuted).toBe(true);

    // Voice transcription is blocked...
    await act(async () => {
      await getCtx().__test_handleTranscription('voice-blocked', 0, false);
    });
    expect(getCtx().transcription).toBe('');

    // ...but text input passes through the mute gate
    await act(async () => {
      await getCtx().__test_handleTranscription('text-allowed', 0, true);
    });
    expect(getCtx().transcription).toBe('text-allowed');
  });

  it('text input is NOT suppressed by the speak-end grace period', async () => {
    const { getCtx } = mountProvider();

    // Simulate that Mossy just stopped speaking 100ms ago (within grace period)
    getCtx().__test_setLastSpeakEnd(Date.now() - 100);

    // Voice transcription is blocked by the grace period...
    await act(async () => {
      await getCtx().__test_handleTranscription('voice-grace', 0, false);
    });
    expect(getCtx().transcription).toBe('');

    // ...but text input is always accepted
    await act(async () => {
      await getCtx().__test_handleTranscription('text-grace', 0, true);
    });
    expect(getCtx().transcription).toBe('text-grace');
  });

  it('sendTextMessage is callable without a connected voice session', async () => {
    const { getCtx } = mountProvider();

    // Voice session is NOT active — sendTextMessage must not throw.
    // In the test environment LocalAIEngine.generateResponse will fail because
    // no Electron IPC/Groq key is available, but handleTranscription catches all
    // such errors internally so sendTextMessage always resolves.
    expect(getCtx().isActive).toBe(false);

    let caughtError: unknown = null;
    await act(async () => {
      try {
        await getCtx().sendTextMessage('hello without voice');
      } catch (e) {
        caughtError = e;
      }
    });

    // sendTextMessage must never throw — errors from the AI layer are caught
    // inside handleTranscription and surfaced via setStatus, not re-thrown.
    expect(caughtError).toBeNull();
  });
});
