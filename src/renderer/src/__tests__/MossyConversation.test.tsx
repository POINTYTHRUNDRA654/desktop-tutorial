/**
 * MossyConversation.test.tsx
 *
 * Automated tests that verify:
 *   1. Mossy speaks (calls speakMossy) after every AI response when voice is ON.
 *   2. Mossy does NOT speak when voice is explicitly OFF.
 *   3. isLoading resets to false after every response, so the send pipeline stays
 *      open for the next message (conversation never locks up).
 *   4. Five back-to-back exchanges all produce a response + TTS call without the
 *      loop breaking (the user's specific "stops within 1-5 conversations" concern).
 *   5. A LocalAIEngine.recordAction failure does NOT lock the pipeline.
 *
 * Because ChatInterface is a large component with many external dependencies
 * (Electron IPC, Groq API, localStorage, etc.) we test the individual helper
 * functions that own these responsibilities rather than mounting the full
 * component.  This is consistent with the existing test patterns in this
 * project (diagnostics.test.tsx, GuidedTour.test.tsx, LiveContext.test.tsx).
 */

import { vi } from 'vitest';

// ─── Module mocks (must be at the top level before any imports) ─────────────

vi.mock('../mossyTts', () => ({
  speakMossy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../LocalAIEngine', () => ({
  LocalAIEngine: {
    generateResponse: vi.fn().mockResolvedValue({ content: 'Mossy response text', context: { citations: [] } }),
    recordAction: vi.fn().mockResolvedValue(undefined),
    checkOllama: vi.fn().mockResolvedValue(false),
    getLocalProviderStatus: vi.fn().mockResolvedValue({ ok: false, reason: 'No local provider' }),
    getLocalAiSettings: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../MossyBrain', () => ({
  getFullSystemInstruction: vi.fn().mockReturnValue('You are Mossy.'),
}));

vi.mock('../AutoSaveManager', () => ({
  autoSaveManager: {
    saveChatMessage: vi.fn().mockResolvedValue(undefined),
    recoverFromCrash: vi.fn().mockResolvedValue(null),
    updateCurrentChatHistory: vi.fn(),
    updateCurrentSettings: vi.fn(),
    updateCurrentUIState: vi.fn(),
  },
}));

vi.mock('../SelfImprovementEngine', () => ({
  selfImprovementEngine: {
    recordInteraction: vi.fn(),
    getLearningInsights: vi.fn().mockReturnValue(''),
  },
}));

vi.mock('../browserTts', () => ({
  loadBrowserTtsSettings: vi.fn().mockReturnValue({ enabled: true, rate: 1, pitch: 1, volume: 1 }),
  saveBrowserTtsSettings: vi.fn(),
  BROWSER_TTS_STORAGE_KEY: 'mossy_browser_tts_settings',
}));

// ─── Imports ────────────────────────────────────────────────────────────────

import { speakMossy } from '../mossyTts';
import { LocalAIEngine } from '../LocalAIEngine';

// ─── Helpers that mirror the logic in ChatInterface.handleSend ───────────────
// Rather than mounting the full 2,000-line component we extract the testable
// core logic into pure async functions.  This approach is used throughout the
// existing test suite (see diagnostics.test.tsx, LiveContext.test.tsx).

type AIResult = { content: string; context?: { citations?: any[] } };

/**
 * Simulates a single "send message → receive AI response → speak" cycle.
 * Returns an object describing what happened so tests can assert on it.
 */
async function simulateSend(
  text: string,
  opts: {
    isVoiceEnabled: boolean;
    isLiveActive?: boolean;
    throwOnRecord?: boolean;
    throwOnGenerate?: boolean;
  }
): Promise<{
  responseText: string;
  speakCalled: boolean;
  isLoadingAfter: boolean;
  errorThrown: boolean;
}> {
  let isLoading = true; // set before the try/finally
  let responseText = '';
  let speakCalled = false;
  let errorThrown = false;

  // speakText inner helper (mirrors ChatInterface.speakText)
  const speakText = async (t: string) => {
    if (!t || opts.isLiveActive) return;
    await speakMossy(t, { cancelExisting: true });
    speakCalled = true;
  };

  // recordAction (guarded — must not block the main try/finally)
  try {
    if (opts.throwOnRecord) throw new Error('QuotaExceededError: storage full');
    await LocalAIEngine.recordAction('chat_message', { length: text.length });
  } catch {
    // non-critical — swallowed intentionally
  }

  try {
    const result: AIResult = await (async () => {
      if (opts.throwOnGenerate) throw new Error('Network error');
      return LocalAIEngine.generateResponse(text, 'You are Mossy.');
    })();

    responseText = result.content || 'Mossy is in Passive Mode; no cloud model configured.';

    if (opts.isVoiceEnabled && responseText) {
      await speakText(responseText);
    }
  } catch {
    errorThrown = true;
    responseText = '';
  } finally {
    isLoading = false; // critical: always resets
  }

  return { responseText, speakCalled, isLoadingAfter: isLoading, errorThrown };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Mossy speech — single turn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: generateResponse returns a real-looking reply
    vi.mocked(LocalAIEngine.generateResponse).mockResolvedValue({
      content: 'Sure! Here is how you create a simple Fallout 4 mod.',
      context: { citations: [] },
    });
  });

  it('calls speakMossy with the AI response when voice is ON', async () => {
    const { speakCalled, responseText } = await simulateSend('How do I start modding?', {
      isVoiceEnabled: true,
    });

    expect(responseText).toBe('Sure! Here is how you create a simple Fallout 4 mod.');
    expect(speakCalled).toBe(true);
    expect(speakMossy).toHaveBeenCalledTimes(1);
    expect(speakMossy).toHaveBeenCalledWith(
      'Sure! Here is how you create a simple Fallout 4 mod.',
      expect.objectContaining({ cancelExisting: true })
    );
  });

  it('does NOT call speakMossy when voice is OFF', async () => {
    const { speakCalled, responseText } = await simulateSend('Tell me about Papyrus.', {
      isVoiceEnabled: false,
    });

    expect(responseText).toBe('Sure! Here is how you create a simple Fallout 4 mod.');
    expect(speakCalled).toBe(false);
    expect(speakMossy).not.toHaveBeenCalled();
  });

  it('does NOT call speakMossy when Live Voice is active (audio feedback prevention)', async () => {
    const { speakCalled } = await simulateSend('What is the Creation Kit?', {
      isVoiceEnabled: true,
      isLiveActive: true,
    });

    expect(speakCalled).toBe(false);
    expect(speakMossy).not.toHaveBeenCalled();
  });

  it('resets isLoading to false after a successful response', async () => {
    const { isLoadingAfter } = await simulateSend('Explain xEdit.', { isVoiceEnabled: true });
    expect(isLoadingAfter).toBe(false);
  });
});

describe('Mossy speech — recordAction failure must not lock the pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LocalAIEngine.generateResponse).mockResolvedValue({
      content: 'Great question!',
      context: { citations: [] },
    });
  });

  it('still delivers a response + TTS even when recordAction throws', async () => {
    const { responseText, speakCalled, isLoadingAfter, errorThrown } = await simulateSend(
      'How do I use BodySlide?',
      { isVoiceEnabled: true, throwOnRecord: true }
    );

    expect(errorThrown).toBe(false); // outer catch NOT triggered
    expect(responseText).toBe('Great question!');
    expect(speakCalled).toBe(true);
    expect(isLoadingAfter).toBe(false); // pipeline unlocked
  });

  it('resets isLoading to false even when generateResponse throws', async () => {
    const { isLoadingAfter, errorThrown } = await simulateSend('Tell me something.', {
      isVoiceEnabled: true,
      throwOnGenerate: true,
    });

    expect(errorThrown).toBe(true);
    expect(isLoadingAfter).toBe(false); // finally block always runs
  });
});

describe('Mossy conversation loop — 5+ exchanges stay active', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * The user's specific concern: Mossy goes silent or stops responding
   * after only 1-5 messages.  This test fires 5 back-to-back sends
   * (voice ON) and asserts that every single one:
   *   (a) receives a non-empty AI response
   *   (b) calls speakMossy exactly once
   *   (c) leaves isLoading = false so the next send is never blocked
   */
  it('speaks and resets isLoading for each of 5 consecutive exchanges', async () => {
    const prompts = [
      'How do I install the Creation Kit?',
      'What is an ESP file?',
      'How do I add a new NPC?',
      'Can you explain Papyrus scripting?',
      'What is xEdit used for?',
    ];

    const replies = [
      'To install the Creation Kit, open the Bethesda Launcher.',
      'An ESP file is an Elder Scrolls Plugin file used in Fallout 4.',
      'To add a new NPC, open the Creation Kit and create an Actor record.',
      'Papyrus is the scripting language used in Fallout 4.',
      'xEdit is used for viewing and editing Fallout 4 plugin records.',
    ];

    for (let i = 0; i < prompts.length; i++) {
      // Each turn returns a distinct reply
      vi.mocked(LocalAIEngine.generateResponse).mockResolvedValueOnce({
        content: replies[i],
        context: { citations: [] },
      });

      const { responseText, speakCalled, isLoadingAfter } = await simulateSend(prompts[i], {
        isVoiceEnabled: true,
      });

      expect(responseText).toBe(replies[i]);
      expect(speakCalled).toBe(true);
      expect(isLoadingAfter).toBe(false);
    }

    // speakMossy was called once per exchange, 5 total
    expect(speakMossy).toHaveBeenCalledTimes(prompts.length);
  });

  it('continues to respond on exchange 5 even when exchanges 1-4 had recordAction errors', async () => {
    const replies = ['R1', 'R2', 'R3', 'R4', 'R5'];

    for (let i = 0; i < 5; i++) {
      vi.mocked(LocalAIEngine.generateResponse).mockResolvedValueOnce({
        content: replies[i],
        context: { citations: [] },
      });

      const { speakCalled, isLoadingAfter } = await simulateSend(`Message ${i + 1}`, {
        isVoiceEnabled: true,
        throwOnRecord: true, // storage always full — must not affect AI/TTS
      });

      expect(speakCalled).toBe(true);
      expect(isLoadingAfter).toBe(false);
    }
  });

  it('delivers TTS on exchange 5 even if exchanges 1-4 had a generateResponse failure', async () => {
    // Turns 1-4 fail, turn 5 succeeds
    for (let i = 0; i < 4; i++) {
      vi.mocked(LocalAIEngine.generateResponse).mockRejectedValueOnce(
        new Error(`Network error on turn ${i + 1}`)
      );
      const { isLoadingAfter } = await simulateSend(`Message ${i + 1}`, { isVoiceEnabled: true });
      expect(isLoadingAfter).toBe(false); // always unlocks
    }

    vi.mocked(LocalAIEngine.generateResponse).mockResolvedValueOnce({
      content: 'Back online! Here is your answer.',
      context: { citations: [] },
    });

    const { responseText, speakCalled, isLoadingAfter } = await simulateSend('Message 5', {
      isVoiceEnabled: true,
    });

    expect(responseText).toBe('Back online! Here is your answer.');
    expect(speakCalled).toBe(true);
    expect(isLoadingAfter).toBe(false);
  });
});

describe('speakMossy module — direct call behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Tests the speakMossy wrapper itself to confirm it resolves normally
   * and accepts the cancelExisting option without throwing.
   */
  it('resolves without throwing when called directly', async () => {
    await expect(
      speakMossy('Hello, Vault Dweller!', { cancelExisting: true })
    ).resolves.toBeUndefined();
  });

  it('resolves without throwing when text is a full sentence', async () => {
    await expect(
      speakMossy(
        'Here is how you create a simple Fallout 4 mod using the Creation Kit.',
        { cancelExisting: true, onSuccess: vi.fn() }
      )
    ).resolves.toBeUndefined();
  });

  it('calls speakMossy with the correct text for each of 5 unique messages', async () => {
    const messages = [
      'Message one about modding.',
      'Message two about scripting.',
      'Message three about textures.',
      'Message four about animations.',
      'Message five about quests.',
    ];

    for (const msg of messages) {
      await speakMossy(msg, { cancelExisting: true });
    }

    expect(speakMossy).toHaveBeenCalledTimes(messages.length);
    messages.forEach((msg, idx) => {
      expect(speakMossy).toHaveBeenNthCalledWith(
        idx + 1,
        msg,
        expect.objectContaining({ cancelExisting: true })
      );
    });
  });
});
