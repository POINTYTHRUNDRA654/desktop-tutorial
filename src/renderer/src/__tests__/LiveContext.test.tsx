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

describe('LiveContext transcription suppression', () => {
  it('ignores transcription within grace period after speak end', async () => {
    let context: any;
    render(
      <LiveProvider>
        <Consumer onCreate={(c) => { context = c; }} />
      </LiveProvider>
    );

    // verify test helpers are present
    expect(context.__test_handleTranscription).toBeDefined();
    expect(context.__test_setLastSpeakEnd).toBeDefined();

    // simulate that we just finished speaking 100ms ago
    context.__test_setLastSpeakEnd(Date.now() - 100);

    // call transcription and ensure it is ignored (transcription state unchanged)
    await act(async () => {
      await context.__test_handleTranscription('hello');
    });
    expect(context.transcription).toBe('');

    // simulate time passing beyond grace period
    context.__test_setLastSpeakEnd(Date.now() - 1000);

    await act(async () => {
      await context.__test_handleTranscription('world');
    });
    expect(context.transcription).toBe('world');
  });
});
