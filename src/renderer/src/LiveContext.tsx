// ...existing code...
export function useLive() {
  const ctx = React.useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used within a LiveProvider');
  return ctx;
}
import React, { createContext, useState, ReactNode, useRef, useEffect } from 'react';
import { VoiceService, VoiceServiceConfig } from './voice-service';
import { contextAwareAIService } from './ContextAwareAIService';
import { ModProjectStorage } from './services/ModProjectStorage';
import { LocalAIEngine } from './LocalAIEngine';
import { getFullSystemInstruction, toGroqTools } from './MossyBrain';
import { executeMossyTool } from './MossyTools';
import { logMossyError } from './MossyErrorReporter';
import { initScreenAwareness } from './ScreenAwareness';
import { generateSystemContextFromStorage } from './utils/generateSystemContext';
import { sanitizeForSpeech } from './utils/sanitizeForSpeech';

// Real, already-existing error-reporting infrastructure (MossyErrorReporter.ts)
// -- structured, privacy-redacted, persisted to localStorage.mossy_error_logs,
// with a real export mechanism (exportErrorLogs) -- that voice never wrote
// into at all until now. A single tool failure told the user what happened in
// the moment, but nothing accumulated into a report they could hand back for
// diagnosis, and there was no "why" beyond the raw error string. This mirrors
// the honesty logic already in voiceModeDirective's rule (6) for the most
// common real cause (a voice-guessed path not matching the real file/folder
// name) but generalizes it into a real best-guess reason for the log entry
// itself, not just what gets spoken in the moment.
function guessVoiceFailureReason(toolName: string, errMsg: string): string {
  if (/path not found|could not list files|could not read/i.test(errMsg)) {
    return 'Most likely the exact folder/file spelling or spacing guessed from spoken audio doesn\'t match the real name on disk -- voice input can\'t convey exact capitalization or spacing. Ask the user to spell it out or give the exact path.';
  }
  if (/desktop bridge is offline/i.test(errMsg)) {
    return 'The Desktop Bridge service wasn\'t running or hadn\'t finished its startup health check when this tool ran.';
  }
  if (/groq cloud chat unavailable|backend request failed/i.test(errMsg)) {
    return 'The cloud backend (Groq via the Render proxy) was unreachable or rate-limited for this turn -- check ai-diagnostics.log for usedLocalFallback on nearby turns.';
  }
  if (toolName === 'launch_program' || toolName === 'launch_tool') {
    return 'Likely a missing or misconfigured tool path -- check Settings > External Tools for this tool\'s saved path.';
  }
  return 'No specific pattern matched -- see the raw error message above for the actual cause.';
}

// ── Voice tool-calling ──────────────────────────────────────────────────
// Real, native tool-calling (Groq's OpenAI-compatible `tools` API, via
// src/backend/routes/chat.ts -> groq-sdk -> Groq's real chat.completions.create),
// not a fenced ```tool marker convention parsed out of prose text.
//
// History: commit ed3cfeee (2026-01-23) deleted LiveContext's original Gemini
// Live session, which had real native function-calling straight into
// executeMossyTool, and replaced it with a text-only Groq pipeline with no
// dispatch mechanism at all. A same-session fenced-marker convention
// restored SOME of that (see git history / live-synapse-tool-calling-restored
// memory for the full restoration), but real live testing that same session
// showed a real, repeated reliability ceiling: the model would sometimes
// simply not emit the marker for a query that clearly needed a tool, with no
// way to structurally guarantee otherwise -- a text convention can't enforce
// its own format the way a real API parameter can. This replaces that
// convention with the real mechanism: `tools` sent as actual API parameters,
// `tool_calls` read back as real structured data. See
// groq_native_tool_calling_migration memory for the full before/after.
//
// Scope: the 29 tools cross-checked as BOTH declared in MossyBrain.ts's
// toolDeclarations AND actually handled in MossyTools.ts's executeMossyTool
// -- i.e. exactly what the reference text implementation can genuinely do
// today (27 original + read_file, added same session it was found dead on
// arrival, + scan_fallout4_live, added 2026-09-01 after live-confirming the
// system prompt unconditionally tells the model it has this tool on every
// turn while neither interface ever actually attached it -- Groq rejects the
// resulting call outright since the model is truthfully following its own
// instructions for a tool that was never really offered; this list existing
// tool WAS already handled in MossyTools.ts, just never declared here).
// Two other groups exist and are deliberately NOT included here:
//   - Declared but still never handled (silently no-op in text chat too):
//     hive_create_project, analyze_error_log, mossy_update_working_memory,
//     search_fallout4_wiki, install_script.
//   - Handled but never declared (real working code, unreachable by any AI
//     decision in either interface because the model is never told it
//     exists): send_blender_shortcut, check_previs_status,
//     xedit_detect_conflicts, xedit_clean_masters, ck_get_formid,
//     ck_create_record, ck_edit_record, ck_duplicate_record,
//     ck_list_selected, ck_set_render_mode.
const VOICE_TOOL_SCOPE = [
  'list_files', 'read_file', 'execute_blender_script', 'write_blender_script',
  'get_blender_scene_info', 'control_interface', 'ck_execute_command',
  'launch_program', 'launch_tool', 'update_tool_path', 'scan_hardware',
  'get_scan_results', 'analyze_detected_programs', 'scan_installed_tools',
  'get_error_report', 'export_error_logs', 'generate_papyrus_script',
  'generate_xedit_script', 'browse_web', 'create_mod_project', 'add_mod_step',
  'update_mod_step', 'get_mod_status', 'list_mod_projects', 'set_current_mod',
  'cortex_neural_pulse', 'scan_plugin', 'apply_esp_fix', 'scan_fallout4_live',
];

// The real GroqTool[] payload sent as `tools` on every voice turn -- computed
// once at module load, not per-turn, since toolDeclarations is static.
const VOICE_TOOLS = toGroqTools(VOICE_TOOL_SCOPE);

// Tools whose real output is substantial structured data that may need
// interpreting against the user's actual question, rather than being spoken
// verbatim -- an explicit, narrow opt-in list, not a general "always add a
// second pass" rule. See the "Opt-in second reasoning pass" comment at the
// dispatch site (below) for the full reasoning and the latency tradeoff.
const NEEDS_INTERPRETATION_TOOLS = new Set([
  'list_files',
  'scan_plugin',
  'get_scan_results',
  'get_error_report',
  'scan_fallout4_live',
]);

export interface LiveContextType {
  isActive: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  status: string;
  volume: number;
  mode: 'idle' | 'listening' | 'processing' | 'speaking';
  transcription: string;
  micLevel: number;
  audioInputs: Array<{ deviceId: string; label: string }>;
  selectedInputId: string;
  setSelectedInputId: (id: string) => void;
  connect: () => Promise<void>;
  disconnect: (manual?: boolean) => void;
  /** Stop Mossy speaking mid-response without ending the voice session. */
  stopSpeaking: () => void;
  customAvatar: string | null;
  updateAvatar: (file: File) => Promise<void>;
  setAvatarFromUrl: (url: string) => Promise<void>;
  clearAvatar: () => void;
  avatarLocked: boolean;
  cortexMemory: any[];
  setCortexMemory: (val: any[]) => void;
  projectData: any | null;
  setProjectData: (val: any) => void;
  isLiveActive: boolean;
  isLiveMuted: boolean;
  toggleLiveMute: () => void;
  disconnectLive: (manual?: boolean) => void;
  /** Send text input to Mossy (alternative to voice) */
  sendTextMessage: (text: string) => Promise<void>;
  /** Last response spoken by Mossy — shown as text for users without speakers */
  lastResponse: string;
  /** Screen Awareness (Phase 2 "Seeing") -- speak a correction Mossy noticed
   *  on her own. Returns false (and skips speaking) if the session isn't
   *  connected and idle -- see the implementation's own comment. */
  speakSystemMessage: (text: string) => Promise<boolean>;
  // test-only helper
  __test_handleTranscription?: (text: string, sessionId?: number, isTextInput?: boolean) => Promise<void>;
  __test_setLastSpeakEnd?: (ts: number) => void;
}

const LiveContext = createContext<LiveContextType | undefined>(undefined);

export const LiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const LIVE_HISTORY_KEY = 'mossy_live_history_v1';
  const LIVE_HISTORY_MAX = 60;
  const LIVE_NOTES_SNAPSHOT = 10;
  const LIVE_NOTES_MAX_CHARS = 8000;
  const [isActive, setIsActive] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [transcriptionDisabled, setTranscriptionDisabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [volume, setVolume] = useState(1);
  const [mode, setMode] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcription, setTranscription] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const isFreshlyConnectedRef = useRef(false);
  const currentSessionRef = useRef(0);
  const [audioInputs, setAudioInputs] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedInputId, setSelectedInputId] = useState('');
  const AVATAR_STORAGE_KEY = 'mossy_custom_avatar';
  const [customAvatar, setCustomAvatar] = useState<string | null>(() => {
    try { return localStorage.getItem(AVATAR_STORAGE_KEY) || null; } catch { return null; }
  });
  const [avatarLocked, setAvatarLocked] = useState(false);
  const [cortexMemory, setCortexMemory] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any | null>(null);

  const voiceServiceRef = useRef<VoiceService | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const lastSpeakEndRef = useRef<number>(0);
  const activeRequestsRef = useRef<Set<string>>(new Set());
  // Ref-backed flag so connect()'s async catch block always sees the current
  // disconnecting state (avoids stale closure where catch sees isDisconnecting=true
  // even after setIsDisconnecting(false) was called at the top of connect()).
  const isDisconnectingRef = useRef(false);
  // Ref-backed muted flag so handleTranscription (which is captured as a callback
  // and therefore closes over a stale isMuted state) sees the live value.
  const isMutedRef = useRef(false);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  // Ref-backed mode flag for the same reason: mode state is stale inside the
  // handleTranscription callback registered at connect() time.
  const modeRef = useRef<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Flag to prevent disconnect during active AI processing
  const isProcessingResponseRef = useRef(false);

  const loadLiveHistory = () => {
    try {
      const raw = localStorage.getItem(LIVE_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
        .slice(-LIVE_HISTORY_MAX);
    } catch {
      return [];
    }
  };

  const persistLiveHistory = (history: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    try {
      localStorage.setItem(LIVE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('[LiveContext] Failed to persist live history:', e);
    }
  };

  const pushLiveHistory = (entry: { role: 'user' | 'assistant'; content: string }) => {
    const next = [...conversationHistoryRef.current, entry].slice(-LIVE_HISTORY_MAX);
    conversationHistoryRef.current = next;
    persistLiveHistory(next);

    // also persist to disk via main process so sessions survive app restarts
    try {
      const api = (window as any).electron?.api || (window as any).electronAPI;
      if (api?.saveVoiceHistory) {
        const line = `${entry.role.toUpperCase()}: ${entry.content}\n`;
        api.saveVoiceHistory(line).catch((e: any) => console.warn('[LiveContext] failed to save history to disk', e));
      }
    } catch (e) {
      console.warn('[LiveContext] unable to call saveVoiceHistory', e);
    }
  };

  /**
   * Screen Awareness (Phase 2 "Seeing") -- speaks a correction Mossy noticed
   * on her own, not in response to a user turn. Deliberately conservative:
   * only speaks when the voice session is actually connected AND genuinely
   * idle (modeRef.current === 'listening') -- if the user is mid-turn
   * (processing/speaking), this silently skips rather than interrupting or
   * queuing. Interrupting live TTS mid-response, or queuing behind an
   * in-flight turn, both add new state-machine paths to a voice pipeline
   * that had real, hard-won re-entrancy fixes earlier this same session
   * (see the speakCloud() playback-timeout and history-cap fixes) -- not
   * worth the risk for this first slice. The caller (ScreenAwareness.ts)
   * logs the skip and can simply try again on the next capture tick.
   */
  const speakSystemMessage = async (text: string): Promise<boolean> => {
    // currentSessionRef, not the isActive state var: this function gets
    // passed into a one-time effect (Screen Awareness's init), so it must
    // read live values through refs, not closed-over state that would stay
    // stale from whatever it was at mount time.
    if (currentSessionRef.current === 0 || modeRef.current !== 'listening' || !voiceServiceRef.current) {
      return false;
    }
    pushLiveHistory({ role: 'assistant', content: text });
    setLastResponse(text);
    setMode('speaking');
    try {
      await voiceServiceRef.current.speak(sanitizeForSpeech(text));
    } finally {
      lastSpeakEndRef.current = Date.now();
      if (currentSessionRef.current !== 0) setMode('listening');
    }
    return true;
  };

  // Screen Awareness (Phase 2 "Seeing") -- wired once here since LiveProvider
  // is the always-mounted top-level provider, and speakSystemMessage (the
  // only thing this needs from LiveContext) is already safe to close over
  // once: it reads currentSessionRef/modeRef/voiceServiceRef live, not
  // component state, so a mount-time closure never goes stale. Keeps working
  // across connect/disconnect cycles since it doesn't depend on isActive.
  useEffect(() => {
    const unsubscribe = initScreenAwareness(speakSystemMessage);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCurrentProjectStepSummary = () => {
    try {
      const current = ModProjectStorage.getCurrentMod();
      if (!current) return '';
      const inProgress = current.steps.find((step) => step.status === 'in-progress');
      const pending = current.steps.find((step) => step.status === 'pending');
      const nextStep = inProgress || pending;
      if (!nextStep) return '';
      const status = nextStep.status.replace('-', ' ');
      return `Current Step: ${nextStep.title} (${status}) [${current.steps.filter(s => s.status === 'completed').length}/${current.steps.length}]`;
    } catch {
      return '';
    }
  };

  const updateVoiceWorkingMemory = () => {
    const snapshot = conversationHistoryRef.current.slice(-LIVE_NOTES_SNAPSHOT);
    if (snapshot.length === 0) return;

    const blockStart = '--- VOICE SESSION NOTES ---';
    const blockEnd = '--- END VOICE SESSION NOTES ---';
    const stepSummary = getCurrentProjectStepSummary();
    const notes = snapshot
      .map((entry) => `${entry.role === 'user' ? 'User' : 'Mossy'}: ${entry.content}`)
      .join('\n');

    const stepLine = stepSummary ? `\n${stepSummary}` : '';
    const nextBlock = `${blockStart}\n${notes}${stepLine}\n${blockEnd}`;

    try {
      const existing = localStorage.getItem('mossy_working_memory') || '';
      const withoutBlock = existing.replace(new RegExp(`${blockStart}[\\s\\S]*?${blockEnd}`, 'g'), '').trim();
      const merged = [withoutBlock, nextBlock].filter(Boolean).join('\n\n').slice(-LIVE_NOTES_MAX_CHARS);
      localStorage.setItem('mossy_working_memory', merged);
    } catch (e) {
      console.warn('[LiveContext] Failed to update working memory:', e);
    }
  };

  const buildVoicePayload = (message: string) => {
    let projectData: any = null;
    try {
      const rawProject = localStorage.getItem('mossy_project');
      projectData = rawProject ? JSON.parse(rawProject) : null;
    } catch {
      projectData = null;
    }

    const workingMemory = localStorage.getItem('mossy_working_memory') || '';
    return {
      text: message,
      history: conversationHistoryRef.current.slice(-LIVE_HISTORY_MAX),
      workingMemory,
      projectData,
    };
  };

  // Initialize voice service
  useEffect(() => {
    const config: VoiceServiceConfig = {
      sttProvider: 'local', // Use local Whisper (on-device, offline); falls back to browser STT on error
      ttsProvider: 'browser',
    };

    voiceServiceRef.current = new VoiceService(config);
    voiceServiceRef.current.initialize().catch(console.error);

    // Get audio inputs
    console.log('[LiveContext] Enumerating audio devices...');

    // First try to request microphone permission if needed
    setStatus('Requesting microphone permission...');
    const micRequest = navigator.mediaDevices.getUserMedia({ audio: true });
    const micTimeout = setTimeout(() => {
      setStatus('Waiting for microphone permission (please allow)');
    }, 10000);
    micRequest
      .then(() => {
        clearTimeout(micTimeout);
        console.log('[LiveContext] Microphone permission granted');
      })
      .catch((permError) => {
        clearTimeout(micTimeout);
        console.warn('[LiveContext] Microphone permission denied or failed:', permError);
        setStatus('Microphone permission denied');
      })
      .finally(() => {
        // Always try to enumerate devices after permission attempt
        navigator.mediaDevices?.enumerateDevices().then(devices => {
          console.log('[LiveContext] All devices:', devices);
          const inputs = devices
            .filter(device => device.kind === 'audioinput')
            .map(device => ({ deviceId: device.deviceId, label: device.label || `Microphone ${device.deviceId.slice(0, 8)}` }));
          console.log('[LiveContext] Filtered audio inputs:', inputs);
          setAudioInputs(inputs);
          if (inputs.length > 0 && !selectedInputId) {
            setSelectedInputId(inputs[0].deviceId);
          }
        }).catch(error => {
          console.error('[LiveContext] Failed to enumerate audio devices:', error);
        });
      });

    return () => {
      voiceServiceRef.current?.stopListening();
    };
  }, []);

  useEffect(() => {
    const storedHistory = loadLiveHistory();
    if (storedHistory.length > 0) {
      conversationHistoryRef.current = storedHistory;
    }
  }, []);

  const sendMessageToMain = async (message: string): Promise<string> => {
    const startTime = Date.now();
    console.log('[LiveContext] sendMessageToMain() called with message:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
    console.log('[LiveContext] Active requests before this call:', activeRequestsRef.current.size);

    return new Promise((resolve, reject) => {
      const api = (window as any).electron?.api || (window as any).electronAPI;
      if (!api?.sendMessage || !api?.onMessage) {
        console.error('[LiveContext] Electron API not available');
        reject(new Error('Electron API not available'));
        return;
      }

      // Generate unique correlation ID for this request
      const correlationId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log('[LiveContext] Generated correlation ID:', correlationId);

      // Track this request
      activeRequestsRef.current.add(correlationId);
      console.log('[LiveContext] Active requests after adding:', activeRequestsRef.current.size);

      let resolved = false;
      let cleanup: (() => void) | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      // Cleanup function to ensure we always remove listeners
      const doCleanup = () => {
        if (cleanup) {
          try {
            cleanup();
            cleanup = null;
            console.log('[LiveContext] Listener cleaned up for correlation ID:', correlationId);
          } catch (e) {
            console.error('[LiveContext] Error during cleanup:', e);
          }
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        // Remove from active requests
        activeRequestsRef.current.delete(correlationId);
        console.log('[LiveContext] Active requests after cleanup:', activeRequestsRef.current.size);
      };

      // Listen for the response with matching correlation ID
      cleanup = api.onMessage((responseMessage: any) => {
        const receiveTime = Date.now();
        const elapsed = receiveTime - startTime;
        console.log('[LiveContext] Received response after', elapsed, 'ms, correlation ID:', responseMessage.correlationId, 'expected:', correlationId);

        // Defensive: handle missing correlationId in response
        if (!responseMessage.correlationId) {
          console.warn('[LiveContext] Response missing correlation ID after', elapsed, 'ms, accepting anyway');
          if (!resolved && responseMessage.role === 'assistant') {
            resolved = true;
            doCleanup();
            console.log('[LiveContext] Resolved with missing correlationId after', elapsed, 'ms');
            resolve(responseMessage.content);
          }
          return;
        }

        // Only handle responses that match our correlation ID
        if (!resolved && responseMessage.role === 'assistant' && responseMessage.correlationId === correlationId) {
          console.log('[LiveContext] Response matched correlation ID, resolving after', elapsed, 'ms');
          resolved = true;
          doCleanup();
          resolve(responseMessage.content);
        } else if (responseMessage.correlationId !== correlationId) {
          console.log('[LiveContext] Ignoring response with mismatched correlation ID (expected:', correlationId, 'got:', responseMessage.correlationId, ')');
        }
      });

      // Enhance the message with context-aware AI suggestions and Voice Mode flag
      const baseEnhancedMessage = contextAwareAIService.enhancePromptWithContext(message);
      const enhancedMessage = `[SYSTEM: LIVE SYNAPSE VOICE SESSION ACTIVE - FOLLOW PACING RULES]\n${baseEnhancedMessage}`;
      console.log('[LiveContext] Enhanced message:', enhancedMessage.substring(0, 200) + (enhancedMessage.length > 200 ? '...' : ''));

      // Send the enhanced message with persisted context and correlation ID
      console.log('[LiveContext] Sending message to main process with correlation ID:', correlationId, 'at', new Date(startTime).toISOString());
      const payload = {
        ...buildVoicePayload(enhancedMessage),
        correlationId,
      };
      api.sendMessage(payload).catch((error: any) => {
        const errorTime = Date.now();
        const elapsed = errorTime - startTime;
        console.error('[LiveContext] Error sending message to main after', elapsed, 'ms:', error);
        if (!resolved) {
          resolved = true;
          doCleanup();
          reject(error);
        }
      });

      // Timeout after 35 seconds (longer than backend timeout)
      timeoutId = setTimeout(() => {
        if (!resolved) {
          const timeoutElapsed = Date.now() - startTime;
          console.error('[LiveContext] Response timeout after', timeoutElapsed, 'ms for correlation ID:', correlationId);
          console.error('[LiveContext] Active requests at timeout:', activeRequestsRef.current.size, Array.from(activeRequestsRef.current));
          resolved = true;
          doCleanup();
          reject(new Error('Response timeout'));
        }
      }, 35000);
    });
  };

  const handleTranscription = async (text: string, sessionId?: number, isTextInput: boolean = false) => {
    console.log(`[LiveContext] Received transcription: "${text}" (session: ${sessionId}, current: ${currentSessionRef.current}, isTextInput: ${isTextInput})`);

    // Validate session ID to prevent old transcriptions from interfering
    if (sessionId !== undefined && sessionId !== currentSessionRef.current) {
      console.log(`[LiveContext] Ignoring old transcription from session ${sessionId} (current: ${currentSessionRef.current})`);
      return;
    }

    // Check if transcription is disabled (after disconnect)
    // But allow transcriptions if we just reconnected (isFreshlyConnectedRef is true).
    // Text input always bypasses this guard — it works independently of the voice session.
    if (!isTextInput && transcriptionDisabled && !isActive && !isFreshlyConnectedRef.current) {
      console.log('[LiveContext] Ignoring transcription - transcription disabled after disconnect and not actively connected');
      return;
    }

    // ignore any transcription that arrives too soon after Mossy finished speaking
    // ONLY for voice input (prevents audio feedback), NOT for text input
    const now = Date.now();
    if (!isTextInput && lastSpeakEndRef.current && now - lastSpeakEndRef.current < 600) {
      console.log('[LiveContext] Ignoring transcription - within grace period after speaking');
      return;
    }

    // If this is a fresh connection, reset the flag after processing the first transcription
    if (isFreshlyConnectedRef.current) {
      console.log('[LiveContext] Processing first transcription after fresh connect, resetting flag');
      isFreshlyConnectedRef.current = false;
    }

    // Honour the mute button — discard VOICE input while the user has silenced the mic.
    // Text input is never gated by the mute button: the mic mute only affects voice capture.
    // isMutedRef stays in sync with the isMuted state even though this callback
    // is a stale closure registered at connect() time.
    if (isMutedRef.current && !isTextInput) {
      console.log('[LiveContext] Ignoring transcription - muted');
      return;
    }

    // Check if we're disconnecting (user manually ended the session).
    // Use the ref so the stale closure always sees the current value.
    // Text input is allowed to complete even during a disconnect so the user
    // gets their response before the session fully closes.
    if (isDisconnectingRef.current && !isTextInput) {
      console.log('[LiveContext] Ignoring transcription - voice session is disconnecting');
      return;
    }

    // Prevent audio feedback - don't transcribe VOICE while TTS is active.
    // Text input is always accepted regardless of speaking state.
    // Use modeRef so the stale closure always sees the current mode value.
    if (modeRef.current === 'speaking' && !isTextInput) {
      console.log('[LiveContext] Ignoring transcription - currently speaking (audio feedback prevention)');
      return;
    }

    console.log('[LiveContext] Processing transcription:', text);
    setTranscription(text);
    setMode('processing');
    // Update the watchdog reference time so the 25-second stall-detection timer
    // starts from now.  This must be set for BOTH voice and text-input paths
    // because the useEffect watchdog only fires in 'processing' mode and checks
    // this ref — if it is 0 (initial value) the condition is always true and the
    // watchdog would prematurely restart the link for text-input messages.
    processingStartRef.current = Date.now();
    // successful transcription—clear any previous STT error tally
    setSttErrors(0);

    // Capture session ID at START of AI processing so we can validate it hasn't changed
    // This prevents discarding valid responses if disconnect() gets called during processing
    const sessionIdAtStart = currentSessionRef.current;

    // Mark that we're processing a response — prevents disconnect from interrupting
    isProcessingResponseRef.current = true;

    // Real, on-disk trace of every voice turn's raw model output, parsed tool
    // call, and real tool outcome -- written to the same diagnostics log
    // LocalAIEngine.ts already uses (see WRITE_DIAGNOSTIC_LOG's own comment
    // in main.ts). Added because there is no other way to inspect a voice
    // exchange after the fact: VoiceChat.tsx only ever shows the single most
    // recent, already-stripped `lastResponse` string, with no scrollback and
    // no raw-JSON view, and copy/paste out of that UI element doesn't
    // reliably work. File lives at %APPDATA%/.mossy-desktop/ai-diagnostics.log.
    const api = (window as any).electron?.api || (window as any).electronAPI;
    const logVoiceTurn = (extra: Record<string, unknown>) => {
      void api?.writeDiagnosticLog?.(`[voice-turn] ${JSON.stringify({ timestamp: new Date().toISOString(), userText: text, ...extra })}`);
    };

    try {
      // Add to conversation history
      pushLiveHistory({ role: 'user', content: text });

      // Send to LocalAIEngine for response (with web search injection and full system context)
      const aiStartTime = Date.now();
      console.log('[LiveContext] 🎯 Calling LocalAIEngine.generateResponse for voice');
      const systemContext = await generateSystemContextFromStorage(text);
      // lean=true: voice's own round-trip budget can't absorb the full
      // ~141,000-char prompt — see getFullSystemInstruction()'s "lean"
      // comment for the incident (consistent cloud timeouts, every voice
      // turn silently falling back to local) that motivated this.
      const baseSystemInstruction = getFullSystemInstruction(systemContext, true);

      // VOICE MODE: append a hard length cap so responses are speakable.
      // The AI tends to generate 500-1000 char answers by default; for voice
      // that translates to 60-120 seconds of TTS — way too long. Cap at ~60 words.
      // Also trim history to the last 6 messages (3 exchanges) to reduce the
      // context payload sent to Groq, which significantly cuts response latency.
      // Rule (5), "never read out raw code syntax", lived here briefly and
      // came back out: it degraded the actual written answer (a Papyrus
      // question genuinely needs its function signature) to work around a
      // speech-only problem, and couldn't fully solve it either — a model
      // doesn't reliably avoid every symbol on request. That problem now has
      // a downstream fix instead: sanitizeForSpeech() strips code/markdown/
      // symbol noise right before the TTS call, after this same text has
      // already been shown in full (code included) in chat history and the
      // on-screen "last response" display.
      const voiceModeDirective = '\n\n### VOICE RESPONSE MODE ###\n' +
        'You are responding to a spoken voice query. Your answer will be read aloud by text-to-speech. ' +
        'STRICT RULES: (1) Keep your response under 60 words. (2) No bullet points, no numbered lists, no markdown. ' +
        '(3) Speak in plain conversational sentences only. (4) If the answer genuinely needs more detail, give the short version and offer to elaborate. ' +
        '(5) You are a tutor with real tools, not a wiki page: if a tool or an in-app platform can actually do or start the next concrete step, use it or say you\'re opening it, rather than reciting a manual walkthrough. For diagnosing a specific broken plugin/mesh/texture, that usually means launch_tool or control_interface to the CK Tools Hub, Asset Analysis Hub, or Plugin & Load Order Hub -- not a numbered list of steps to do by hand. ' +
        '(6) If the user asks why a previous list_files/read_file call failed ("path not found" / "could not list files"), the real, by-far-most-likely cause is that the exact folder/file spelling or spacing you guessed from spoken audio doesn\'t match the real one on disk (voice input can\'t convey exact capitalization or spacing) -- say that plainly and ask them to spell it out or give the exact path, rather than inventing config files, service accounts, or permissions systems that do not exist in this app. Never describe app internals you are not certain are real.';
      const systemInstruction = baseSystemInstruction + voiceModeDirective;

      // Use only the 6 most recent history messages (3 exchanges) for voice —
      // reduces Groq payload size and cuts response latency significantly.
      const priorHistory = conversationHistoryRef.current.slice(-6);
      // voiceMode=true: skips the response guard (which makes a second full API
      // call and doubles voice latency to 100+ seconds). tools: VOICE_TOOLS is
      // the real native tool-calling payload -- see this file's "Voice
      // tool-calling" section (top) for why this replaced the fenced-marker
      // convention. Reaches Groq's actual `tools` API parameter via
      // LocalAIEngine -> main.ts's ai-chat-groq handler ->
      // src/backend/routes/chat.ts -> groq-sdk.
      const aiResult = await LocalAIEngine.generateResponse(text, systemInstruction, priorHistory, true, undefined, { preferCloud: true, tools: VOICE_TOOLS });
      const aiDuration = Date.now() - aiStartTime;
      console.log('[LiveContext] ✅ AI response received - duration:', aiDuration, 'ms', '- toolCalls:', aiResult.toolCalls?.length || 0);
      const rawResponse = aiResult.content || '';
      // actionRelated/toolChoiceUsed: real classification result + the
      // tool_choice it actually produced -- see EnrichmentResult.actionRelated
      // and LocalAIEngine.ts's toolChoice computation. Logged here so any
      // future case of unexpected hedging (action_related=false when it
      // should've been true) or unexpected forcing is diagnosable straight
      // from ai-diagnostics.log, no live reproduction needed.
      logVoiceTurn({
        rawResponse, toolCalls: aiResult.toolCalls, usedLocalFallback: !!aiResult.usedLocalFallback,
        actionRelated: aiResult.actionRelated, toolChoiceUsed: aiResult.toolChoiceUsed,
      });
      // Real, live-observed gap: generateResponse already reports when the real
      // cloud model was unreachable and a smaller local model answered instead
      // (usedLocalFallback) -- this file never read that flag, so a genuinely
      // degraded answer (confused, lower-quality reasoning) looked identical to
      // a normal one, with no way for the user to know why. Tracked across any
      // interpretation sub-call below and disclosed once at the end -- same
      // honest-degradation standard as BackupManager's real Bridge-offline
      // message, applied here for the first time.
      let usedFallbackAnywhere = !!aiResult.usedLocalFallback;

      // Real tool call, straight from Groq's actual API response -- no prose
      // parsing. `args` arrives pre-parsed from JSON by the backend
      // (src/backend/routes/chat.ts); the string fallback only fires if the
      // model itself emitted malformed JSON, a real if rare model failure
      // mode distinct from "forgot to call a tool at all" -- treated as a
      // dispatch error below rather than silently passed through as `{}`.
      // `response`/`displayResponse` mirror the same split as before: capped
      // for history/speech, full text for the on-screen display.
      let response = rawResponse;
      let displayResponse = rawResponse;
      const rawCall = aiResult.toolCalls?.[0];
      const toolCall: { name: string; args: Record<string, unknown> } | null =
        rawCall && typeof rawCall.args !== 'string' ? { name: rawCall.name, args: rawCall.args } : null;
      const toolCallArgsUnparseable = !!rawCall && typeof rawCall.args === 'string';
      // Some models emit real lead-in prose ("Sure, opening Blender now.")
      // alongside a tool call, not just a bare structured call -- use
      // whatever real content actually came back rather than assuming it's
      // always empty when a tool call is present. Genuinely empty stays
      // empty either way.
      const spokenText = rawResponse;

      // Genuine total failure: no text AND no tool call at all (e.g. the
      // real Groq call itself errored and generateResponse's own catch path
      // returned an empty AIResponse). Distinct from "made a tool call with
      // empty content," which is normal and handled below.
      if (!toolCall && !toolCallArgsUnparseable && !rawResponse) {
        response = 'Sorry, I encountered an error processing your request.';
        displayResponse = response;
      } else if (toolCallArgsUnparseable && rawCall) {
        console.warn('[LiveContext] Tool call arguments failed to parse as JSON:', rawCall.name, rawCall.args);
        response = `I tried to use ${rawCall.name}, but the arguments came back malformed. Could you rephrase that?`;
        displayResponse = response;
      } else if (toolCall) {
        console.log('[LiveContext] 🔧 Voice tool call parsed:', toolCall.name, toolCall.args);
        try {
          const isBlenderLinked = localStorage.getItem('mossy_blender_active') === 'true';
          const toolResult: any = await executeMossyTool(toolCall.name, toolCall.args, {
            isBlenderLinked,
            setProfile: () => {},
            setProjectData,
            setProjectContext: () => {},
            setShowProjectPanel: () => {},
          });
          // executeMossyTool's real return shape varies by handler (some
          // return {success, result}, most return a plain result string set
          // via setActiveTool in the text path) -- MossyTools.ts's own
          // handlers write the honest outcome (including real failures) into
          // `result`/`success` fields or the string itself; surface exactly
          // that, not a canned confirmation.
          // `|| ''` then a length check, not `??`: a handler can legitimately
          // return an empty-string result (e.g. read_file on an empty file),
          // and `??` only falls through on null/undefined -- it would have
          // handed speak() an empty string, which reached a real, separate
          // unguarded hang in speakCloud() (see voice-service.ts, now fixed
          // with a playback timeout, but this path shouldn't ask for silence
          // regardless).
          const rawOutcome: string =
            typeof toolResult === 'string' ? toolResult :
            (toolResult?.result || toolResult?.error || '');
          const fullOutcomeText: string = rawOutcome.length > 0
            ? rawOutcome
            : (toolResult?.success === false ? 'That did not work.' : 'Done.');
          console.log('[LiveContext] 🔧 Tool outcome:', fullOutcomeText?.slice?.(0, 200));
          logVoiceTurn({ toolName: toolCall.name, toolArgs: toolCall.args, rawToolResult: toolResult, fullOutcomeText });

          // Real failures that don't throw -- most handlers (e.g. list_files's
          // real "Bridge Error: Could not list files..." for a path that
          // genuinely doesn't exist) report failure via the result text itself,
          // not an explicit `success: false` field, so both signals are checked.
          // Matched against the actual real failure message shapes observed
          // live this session, not a generic "contains the word error" scan --
          // a broad scan would false-positive on legitimate content like
          // get_error_report's own successful "Error Report" heading.
          const looksLikeRealFailure = toolResult?.success === false ||
            /bridge error:|error connecting to bridge|could not (list|read)|is offline\.|groq cloud chat unavailable|backend request failed/i.test(fullOutcomeText);
          if (looksLikeRealFailure) {
            void logMossyError(
              toolCall.name,
              fullOutcomeText,
              { userQuery: text, toolArgs: toolCall.args, source: 'voice' },
              'Voice request',
              guessVoiceFailureReason(toolCall.name, fullOutcomeText),
            );
          }

          // Opt-in second reasoning pass, per-tool. The single-shot dispatch
          // (parse tool call, speak fullOutcomeText directly) is fine for
          // action tools -- launch_tool's result IS the answer. It breaks for
          // tools that return substantial structured data, where a raw dump
          // standing in for an answer is exactly the confusing-response shape
          // real usage hit ("list the non-standard subfolders in Data" against
          // a raw, unfiltered list_files listing). Deliberately NOT always-on:
          // this is a second real Groq call, and most real usage today
          // (launch_program, launch_tool, control_interface, create_mod_project)
          // has a binary outcome that doesn't need interpreting -- taxing every
          // voice turn with that latency for no benefit would undo today's
          // reliability work. Scoped to exactly the tools whose real output is
          // substantial structured data a user might ask a real question about,
          // same principle as the 400-char history cap and the lean prompt:
          // keep the common case fast, add cost only where it's actually needed.
          let interpretedText: string | null = null;
          if (NEEDS_INTERPRETATION_TOOLS.has(toolCall.name) && toolResult?.success !== false && fullOutcomeText.length > 0) {
            try {
              // Real, live-observed bug: an earlier version of this prompt let the
              // model answer "Plugins sits directly in Data, not in a subfolder"
              // for a listing whose raw data literally contained "[DIR] Plugins" --
              // it substituted trained general FO4 knowledge for the actual real
              // data it was handed. The explicit [DIR]/[FILE] instruction below
              // targets exactly that failure mode, since list_files's real output
              // format (MossyTools.ts) always prefixes real folders with [DIR].
              const interpretInstruction =
                'You are Mossy, an FO4 modding assistant. You are answering a spoken voice question using real data a tool just returned -- not generating new information, and not your general Fallout 4 knowledge. ' +
                `The user asked: "${text}"\n\nReal tool data:\n${fullOutcomeText}\n\n` +
                'Answer using ONLY the literal lines above, not what you know about a typical Fallout 4 install. ' +
                'If the data uses "[DIR]" / "[FILE]" markers: every "[DIR]" line is a real folder that exists on this exact machine right now, regardless of whether it matches a standard installation -- never say something is "not a folder" or "not normally there" if its own line is marked [DIR]. ' +
                'If the data does not actually answer what they asked, say so honestly instead of guessing. ' +
                'Under 60 words, plain spoken sentences only -- no markdown, no bullet points, no code.';
              const interpretResult = await LocalAIEngine.generateResponse(text, interpretInstruction, [], true, undefined, { preferCloud: true, timeoutMs: 12000 });
              usedFallbackAnywhere = usedFallbackAnywhere || !!interpretResult?.usedLocalFallback;
              if (interpretResult?.content?.trim()) {
                interpretedText = interpretResult.content.trim();
              }
            } catch (interpretErr) {
              console.warn('[LiveContext] Second-pass interpretation failed, falling back to raw outcome:', interpretErr);
            }
            logVoiceTurn({ toolName: toolCall.name, interpretedText });
          }

          // Real bug, found and fixed same session: some of the 27 tools'
          // real results can be large (generate_papyrus_script embeds the
          // full generated code, list_files can return a long directory
          // listing, get_scan_results/get_error_report/export_error_logs
          // can all be sizeable). Every other piece of context in this file
          // is deliberately size-capped (6-message history slice, the lean
          // prompt, a 60-word spoken-response limit) specifically because an
          // oversized prompt already caused real Groq timeouts here before
          // (see getFullSystemInstruction's "lean" comment) -- pushing a full
          // uncapped tool result into conversation history reintroduces
          // exactly that risk on the NEXT turn, not this one, which is why
          // it looked like "voice needs a restart" rather than "this call
          // failed." Cap what persists into history/speech; displayResponse
          // still carries the untruncated text to the on-screen display.
          const VOICE_OUTCOME_CHAR_LIMIT = 400;
          const outcomeText = fullOutcomeText.length > VOICE_OUTCOME_CHAR_LIMIT
            ? fullOutcomeText.slice(0, VOICE_OUTCOME_CHAR_LIMIT) + '… (see the on-screen response for the full result)'
            : fullOutcomeText;
          if (interpretedText) {
            response = spokenText ? `${spokenText}\n\n${interpretedText}` : interpretedText;
            displayResponse = spokenText
              ? `${spokenText}\n\n${interpretedText}\n\n(raw data:)\n${fullOutcomeText}`
              : `${interpretedText}\n\n(raw data:)\n${fullOutcomeText}`;
          } else {
            response = spokenText ? `${spokenText}\n\n${outcomeText}` : outcomeText;
            displayResponse = spokenText ? `${spokenText}\n\n${fullOutcomeText}` : fullOutcomeText;
          }
        } catch (toolErr) {
          const errMsg = toolErr instanceof Error ? toolErr.message : String(toolErr);
          console.error('[LiveContext] 🔧 Voice tool call failed:', errMsg);
          logVoiceTurn({ toolName: toolCall.name, toolArgs: toolCall.args, dispatchThrew: errMsg });
          void logMossyError(
            toolCall.name,
            toolErr instanceof Error ? toolErr : errMsg,
            { userQuery: text, toolArgs: toolCall.args, source: 'voice' },
            'Voice request',
            guessVoiceFailureReason(toolCall.name, errMsg),
          );
          response = spokenText
            ? `${spokenText}\n\nThat didn't work: ${errMsg}`
            : `I tried, but that didn't work: ${errMsg}`;
          displayResponse = response;
        }
      } else {
        // Real gap found from a live session: the voiceModeDirective's "under
        // 60 words, no markdown" rule is a soft instruction the model doesn't
        // reliably follow for complex/troubleshooting questions -- a real
        // logged turn came back as several hundred words of full markdown
        // (headers, bullet lists), which TTS would read out in full and,
        // unlike the tool-outcome path above, had NO cap before entering
        // conversation history. That's the exact same oversized-prompt risk
        // VOICE_OUTCOME_CHAR_LIMIT exists to prevent for tool results, just
        // triggered by a verbose plain answer instead of a tool call. Same
        // fix, same reasoning: cap what persists into history/speech,
        // displayResponse keeps the full text on screen.
        const VOICE_PLAIN_RESPONSE_CHAR_LIMIT = 400;
        if (rawResponse.length > VOICE_PLAIN_RESPONSE_CHAR_LIMIT) {
          response = rawResponse.slice(0, VOICE_PLAIN_RESPONSE_CHAR_LIMIT) + '… (see the on-screen response for the full answer)';
        }
      }

      // Check if session ID changed (user disconnected, or session ended for another reason).
      // Use the captured ID so we don't discard valid responses from disconnect() being called during processing.
      // Text input responses are always delivered — the voice session state is irrelevant for text.
      if (!isTextInput && (currentSessionRef.current === 0 || currentSessionRef.current !== sessionIdAtStart)) {
        console.log('[LiveContext] Ignoring AI response - voice session ended during processing (session was:', sessionIdAtStart, 'now:', currentSessionRef.current + ')');
        isProcessingResponseRef.current = false;
        return;
      }

      // Honest degradation disclosure -- see usedFallbackAnywhere's declaration
      // above for why this exists. Short and appended once, after every other
      // branch has finished, so it survives regardless of which path produced
      // the final response.
      if (usedFallbackAnywhere) {
        const fallbackNotice = ' (Note: my main cloud model was unreachable for this answer, so a smaller local one filled in -- worth double-checking anything specific.)';
        response += fallbackNotice;
        displayResponse += fallbackNotice;
      }

      // Add AI response to history
      pushLiveHistory({ role: 'assistant', content: response });
      updateVoiceWorkingMemory();
      console.log('[LiveContext] AI response received, about to speak:', response.substring(0, 100) + (response.length > 100 ? '...' : ''));
      logVoiceTurn({ finalSpoken: response, finalDisplay: displayResponse });

      // Store the response text so the UI can display it for users without speakers.
      // displayResponse, not response: the full, untruncated text for tool-call
      // turns (see the VOICE_OUTCOME_CHAR_LIMIT comment above) -- on-screen state
      // is never fed back into a future prompt, so it doesn't need the same cap.
      setLastResponse(displayResponse);

      // Speak the response — sanitized for TTS only; the history entry and
      // on-screen text above both kept the full, untouched answer. See
      // sanitizeForSpeech()'s own docstring for why this lives here instead
      // of as a system-prompt rule.
      if (voiceServiceRef.current) {
        const speakStartTime = Date.now();
        const speechText = sanitizeForSpeech(response);
        console.log('[LiveContext] 🔊 Starting TTS playback - response length:', speechText.length, 'chars');
        setMode('speaking'); // Prevent transcriptions from capturing TTS audio
        await voiceServiceRef.current.speak(speechText);
        const speakDuration = Date.now() - speakStartTime;
        console.log('[LiveContext] 🔊 TTS playback complete - duration:', speakDuration, 'ms');
        lastSpeakEndRef.current = Date.now(); // mark when speaking finished

        // If the session ended while TTS was playing (user pressed disconnect
        // mid-speech), exit cleanly — don't run any post-speak state updates.
        if (currentSessionRef.current === 0) return;
      } else {
        console.error('[LiveContext] voiceServiceRef.current is null, cannot speak');
      }

      // Still connected — reset to listening for next turn
      if (currentSessionRef.current !== 0) {
        setMode('listening');
      } else {
        setMode('idle');
      }
    } catch (error) {
      console.error('Conversation error:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Error: ${msg}`);
      setMode('listening'); // reset to listening not idle, so next turn's modeRef check doesn't block
      // notify user more visibly via console; showNotification is not available in preload
      console.warn('[LiveContext] Voice session error:', msg);
      // if the backend appears hung, restart the voice link
      // Only restart if it's a TIMEOUT error, not general AI errors
      if (/timeout/i.test(msg)) {
        console.warn('[LiveContext] restarting voice link after timeout error');
        disconnect();
        setTimeout(() => {
          connect().catch(() => { });
        }, 1000);
      } else if (currentSessionRef.current !== 0 && voiceServiceRef.current) {
        // Non-timeout error (e.g. TTS failure): mic was paused for TTS but speak()
        // threw before its finally block could schedule a restart — do it here.
        console.warn('[LiveContext] Non-timeout voice error; restarting microphone after short delay');
        setTimeout(() => {
          if (currentSessionRef.current !== 0 && voiceServiceRef.current) {
            voiceServiceRef.current.safeMicrophoneRestart();
          }
        }, 1500);
      }
      // Real bug fix: previously this error was ONLY ever visible via setStatus()
      // (a LiveContext-internal state VoiceChat.tsx never reads) and console.warn —
      // a failed text message looked exactly like nothing happened at all, with no
      // banner, no toast, nothing. Errors are surfaced via setStatus() above for
      // both voice and text-input paths; re-throwing here is not needed and would
      // violate the contract that sendTextMessage/handleTranscription never throws.
    } finally {
      // Mark processing complete so disconnect can proceed if needed
      isProcessingResponseRef.current = false;
    }
  };

  // count consecutive backend failures so we can fall back automatically
  const [sttErrors, setSttErrors] = useState(0);
  const sttErrorsRef = useRef(0);
  const sttFallbackErrorPattern = /backend|deepgram|transcribe|network|invalid[_\s-]?api[_\s-]?key|incorrect[_\s-]?api[_\s-]?key|unauthorized|401/i;
  const sttAuthErrorPattern = /401|unauthorized|invalid[_\s-]?api[_\s-]?key|incorrect[_\s-]?api[_\s-]?key|forbidden|auth(?:entication)? failed/i;

  const handleVoiceError = (error: string) => {
    setStatus(`Voice Error: ${error}`);
    setMode('idle');

    if (sttAuthErrorPattern.test(error)) {
      console.warn('[LiveContext] Authentication failure detected; stopping voice session without retry:', error);
      sttErrorsRef.current = 0;
      setSttErrors(0);
      if (voiceServiceRef.current) {
        voiceServiceRef.current.stopListening();
      }
      setIsActive(false);
      setIsDisconnecting(false);
      return;
    }

    const currentProvider = voiceServiceRef.current?.getSttProvider?.();
    const browserSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    if (currentProvider === 'backend' && browserSupported) {
      console.warn('[LiveContext] Backend STT failure detected; falling back to browser STT:', error);
      if (voiceServiceRef.current) {
        setStatus('Switching to browser STT...');
        voiceServiceRef.current.stopListening();
        voiceServiceRef.current.setSttProvider('browser');
        voiceServiceRef.current.startListening(
          (t, sid) => handleTranscription(t, sid),
          handleVoiceError,
          handleModeChange
        );
      }
      sttErrorsRef.current = 0;
      setSttErrors(0);
      return;
    }

    // detect backend/transcription/auth related errors
    if (sttFallbackErrorPattern.test(error)) {
      sttErrorsRef.current += 1;
      setSttErrors(sttErrorsRef.current);
    }

    // if we've seen repeated backend-like failures, switch to browser STT for stability
    if (sttErrorsRef.current >= 2 && browserSupported && currentProvider !== 'browser') {
      console.warn('[LiveContext] falling back to browser STT due to repeated transcription errors');
      if (voiceServiceRef.current) {
        setStatus('Switching to browser STT...');
        voiceServiceRef.current.stopListening();
        voiceServiceRef.current.setSttProvider('browser');
        voiceServiceRef.current.startListening(
          (t, sid) => handleTranscription(t, sid),
          handleVoiceError,
          handleModeChange
        );
      }
      sttErrorsRef.current = 0;
      setSttErrors(0);
    }
  };

  const processingStartRef = useRef<number>(0);

  const handleModeChange = (newMode: string) => {
    setMode(newMode as 'idle' | 'listening' | 'processing' | 'speaking');
    switch (newMode) {
      case 'listening':
        setStatus('Listening...');
        break;
      case 'processing':
        setStatus('Processing...');
        processingStartRef.current = Date.now();
        break;
      case 'speaking':
        setStatus('Speaking...');
        break;
      default:
        setStatus('Ready');
    }
  };

  // watchdog: if we remain in processing state for too long, restart the link.
  // Raised from 50s → 120s: the backend proxy is on Render.com free tier which
  // can take 30-60s to cold-start, then Groq needs time to process the (large)
  // system prompt. 50s was too aggressive and triggered mid-response, causing
  // the disconnect/reconnect loop the user sees.
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (mode === 'processing' && isActive) {
      const PROCESSING_TIMEOUT = 120000; // 120 seconds — accounts for Render cold-start + Groq latency
      const CHECK_INTERVAL = 121000;     // Check after timeout + 1s buffer
      timer = setTimeout(() => {
        if (Date.now() - processingStartRef.current > PROCESSING_TIMEOUT) {
          setStatus('Processing taking too long, restarting link...');
          console.warn('[LiveContext] Voice AI stuck; reconnecting (exceeded 120s timeout)');
          disconnect();
          setTimeout(() => connect().catch(() => { }), 1000);
        }
      }, CHECK_INTERVAL);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mode, isActive]);

  // if we enter listening mode and no transcription arrives after a while
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (mode === 'listening' && isActive) {
      timer = setTimeout(() => {
        if (!transcription) {
          setStatus('No speech detected yet – please speak or check your mic');
        }
      }, 15000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [mode, isActive, transcription]);

  // When the Electron window regains focus (user switched to Blender or another app
  // and came back), resume the microphone. Chromium suspends AudioContext when the
  // window loses focus, which silently kills the silence-detection loop and leaves
  // the mic dead until the user manually reconnects.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && voiceServiceRef.current) {
        console.log('[LiveContext] Window became visible — restarting mic after focus return');
        setTimeout(() => {
          if (isActive && voiceServiceRef.current) {
            voiceServiceRef.current.safeMicrophoneRestart();
          }
        }, 300);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isActive]);

  const checkVoicePipeline = async (): Promise<void> => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (!api?.getSettings) {
      throw new Error('Voice pipeline unavailable: Electron API not ready.');
    }

    // Local Whisper via IPC is always available as long as the Electron API is
    // present — it runs on the user's PC without any server URL needed.
    const hasLocalWhisperIpc = typeof api?.transcribeAudio === 'function';
    if (hasLocalWhisperIpc) {
      // Local Whisper is the primary path; no backend health check needed.
      console.log('[LiveContext] checkVoicePipeline: local Whisper IPC available, skipping backend check.');
      return;
    }

    // Fallback: check if a cloud backend or browser STT is available.
    const settings = await api.getSettings();
    const backendBaseUrl = String(settings?.backendBaseUrl || '').trim().replace(/\/$/, '');

    if (backendBaseUrl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        const resp = await fetch(`${backendBaseUrl}/health`, { signal: controller.signal });
        if (!resp.ok) {
          throw new Error(`Voice backend health check failed (${resp.status}).`);
        }
        return; // backend is reachable, we're good
      } catch (e: any) {
        const msg = e?.name === 'AbortError' ? 'Voice backend health check timed out.' : (e?.message || String(e));
        console.warn('[LiveContext] Backend unreachable:', msg);
        // fall through to browser STT check below
      } finally {
        clearTimeout(timeout);
      }
    }

    const hasBrowserStt = typeof window !== 'undefined' && (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);
    let hasOpenAI = false;
    if (typeof api?.getSecretStatus === 'function') {
      const status = await api.getSecretStatus();
      hasOpenAI = Boolean(status?.ok && status.openai);
    }

    if (!hasOpenAI && !hasBrowserStt) {
      throw new Error(
        'No voice provider available. ' +
        'Local speech recognition (faster-whisper) may still be installing — ' +
        'try again in a moment, or enable browser speech recognition in Settings.'
      );
    }
  };

  const connect = async () => {
    console.log('[LiveContext] connect() called');
    if (!voiceServiceRef.current) {
      throw new Error('Voice service not initialized');
    }

    if (!voiceServiceRef.current.isSupported()) {
      throw new Error('Voice features not supported in this browser');
    }

    // Resolve the Electron API once here so it's available throughout connect().
    const api = (window as any).electron?.api || (window as any).electronAPI;

    try {
      console.log('[LiveContext] Resetting flags before starting');
      isDisconnectingRef.current = false;
      setTranscriptionDisabled(false);
      setIsDisconnecting(false);
      setStatus('Checking voice pipeline...');

      await checkVoicePipeline();

      // Update session ID to a new unique value
      currentSessionRef.current++;
      const currentSessionId = currentSessionRef.current;
      console.log(`[LiveContext] Starting NEW voice session: ${currentSessionId}`);

      setIsActive(true);
      isFreshlyConnectedRef.current = true;

      // Pick the best available STT provider.
      // Priority: local Whisper IPC (on-device, fastest) → browser Web Speech API (fallback)
      // 'local' routes through whisper_service.py running on the user's PC.
      const hasBrowserStt = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      const hasLocalWhisperIpc = typeof api?.transcribeAudio === 'function';
      const preferredSttProvider = hasLocalWhisperIpc ? 'local' : hasBrowserStt ? 'browser' : 'local';
      voiceServiceRef.current.setSttProvider(preferredSttProvider);
      console.log('[LiveContext] Selected initial STT provider:', preferredSttProvider, { hasLocalWhisperIpc, hasBrowserStt });

      console.log('[LiveContext] Calling voiceService.startListening()');
      voiceServiceRef.current.startListening(
        (text) => handleTranscription(text, currentSessionId),
        handleVoiceError,
        handleModeChange
      );

      console.log('[LiveContext] startListening() completed, setting mode to listening');
      setMode('listening');
      setStatus('Listening');
      console.log('[LiveContext] connect() completed successfully');
    } catch (error: any) {
      console.log('[LiveContext] connect() failed:', error);
      setIsActive(false);
      isFreshlyConnectedRef.current = false;
      // Schedule retry only when the failure was NOT caused by a manual disconnect.
      // Use the ref (not the stale closure state) for an accurate current value.
      if (!isDisconnectingRef.current) {
        setStatus('Connection failed, retrying...');
        setTimeout(() => {
          connect().catch(() => { });
        }, 5000);
      }
      throw error;
    }
  };

  const disconnect = (manual?: boolean) => {
    console.log('[LiveContext] disconnect() called, manual:', manual);

    // Invalidate current session immediately
    const lastSessionId = currentSessionRef.current;
    currentSessionRef.current = 0;

    isDisconnectingRef.current = true;
    setIsDisconnecting(true);
    setTranscriptionDisabled(true);
    setIsActive(false);
    setMode('idle');
    setStatus('Disconnected');
    isFreshlyConnectedRef.current = false;

    if (voiceServiceRef.current) {
      console.log('[LiveContext] Stopping voice service for session:', lastSessionId);
      voiceServiceRef.current.stopListening();
    }

    // Stop legacy browser TTS if active
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    console.log('[LiveContext] disconnect completed cleanup');
  };

  /**
   * Stop Mossy speaking immediately without ending the voice session.
   * Useful as a "stop talking" button so the user can interrupt long responses.
   */
  const stopSpeaking = () => {
    console.log('[LiveContext] stopSpeaking() called');
    if (voiceServiceRef.current) {
      voiceServiceRef.current.stopSpeaking();
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (mode === 'speaking') {
      setMode('listening');
      setStatus('Listening...');
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    console.log('[LiveContext] toggleMute called, transitioning to:', newMutedState ? 'MUTED' : 'UNMUTED');

    setIsMuted(newMutedState);
    isMutedRef.current = newMutedState;

    // When unmuting, proactively restart recording to handle cases where the voice
    // session got stuck due to silence detection or other edge cases while muted.
    if (!newMutedState && isActive && voiceServiceRef.current) {
      console.log('[LiveContext] Unmuting: proactively restarting recording');
      setTimeout(() => {
        // Use the ref which is immediately updated, not the state (which may not have updated yet due to React batching)
        if (!isMutedRef.current && isActive && voiceServiceRef.current) {
          console.log('[LiveContext] Calling safeMicrophoneRestart...');
          try {
            voiceServiceRef.current.safeMicrophoneRestart();
          } catch (e) {
            console.warn('[LiveContext] Failed to restart recording on unmute:', e);
          }
        }
      }, 100);
    }
  };
  const updateAvatar = async (file: File) => {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // Resize to max 512px and encode as JPEG to keep localStorage size manageable
      const resized = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 512;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = dataUrl;
      });
      localStorage.setItem(AVATAR_STORAGE_KEY, resized);
      setCustomAvatar(resized);
    } catch (e) {
      console.warn('[LiveContext] Failed to update avatar:', e);
    }
  };
  const setAvatarFromUrl = async (url: string) => {
    try {
      // Only accept https URLs or data URLs to prevent arbitrary content injection
      const isDataUrl = url.startsWith('data:image/');
      const isHttpsUrl = /^https:\/\/.+/i.test(url);
      if (!isDataUrl && !isHttpsUrl) {
        console.warn('[LiveContext] Rejected avatar URL: must be a data: image URL or https:// URL');
        return;
      }
      localStorage.setItem(AVATAR_STORAGE_KEY, url);
      setCustomAvatar(url);
    } catch (e) {
      console.warn('[LiveContext] Failed to set avatar from URL:', e);
    }
  };
  const clearAvatar = () => {
    try { localStorage.removeItem(AVATAR_STORAGE_KEY); } catch { /* ignore */ }
    setCustomAvatar(null);
  };

  // Text input handler for users without microphone
  const sendTextMessage = async (text: string) => {
    if (!text.trim()) return;

    // Text input works independently of the voice session — we never require the
    // voice pipeline (STT backend / Whisper / OpenAI key) just to handle typed
    // messages.  The AI response is routed through LocalAIEngine (Groq) the same
    // way regardless of whether voice is active.
    //
    // If voice is NOT active we use session ID 0 so the response-delivery check
    // inside handleTranscription is bypassed for isTextInput === true.
    const currentSessionId = currentSessionRef.current;
    try {
      await handleTranscription(text, currentSessionId, true); // true = isTextInput
    } catch (err) {
      console.error('[LiveContext] Text message processing failed:', err);
      throw err;
    }
  };

  return (
    <LiveContext.Provider
      value={{
        isActive,
        isMuted,
        toggleMute,
        status,
        volume,
        mode,
        transcription,
        micLevel,
        audioInputs,
        selectedInputId,
        setSelectedInputId,
        connect,
        disconnect,
        stopSpeaking,
        customAvatar,
        updateAvatar,
        setAvatarFromUrl,
        clearAvatar,
        avatarLocked,
        cortexMemory,
        setCortexMemory,
        projectData,
        setProjectData,
        isLiveActive: isActive,
        isLiveMuted: isMuted,
        toggleLiveMute: toggleMute,
        disconnectLive: disconnect,
        sendTextMessage,
        lastResponse,
        speakSystemMessage,
        ...(process.env.NODE_ENV === 'test' ? { __test_handleTranscription: handleTranscription, __test_setLastSpeakEnd: (ts: number) => { lastSpeakEndRef.current = ts; } } : {}),
      }}
    >
      {children}
    </LiveContext.Provider>
  );
};

export default LiveContext;
