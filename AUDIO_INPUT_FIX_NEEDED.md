# Audio Input Processing Issue - TODO

## Status
✅ Connection to live voice pipeline works
✅ Session connects and opens successfully  
✅ Audio playback from Mossy works
❌ Audio input from microphone crashes the app

## Root Cause
The `ScriptProcessorNode` is deprecated and causes crashes when:
1. Setting up the audio processor in `onopen` callback
2. Processing audio frames in `onaudioprocess`
3. Sending audio blobs to transcription provider

## Current Workaround
Audio input processing is disabled. Connection works but users cannot send audio to Mossy.

## Solution Options

### Option 1: Use MediaRecorder API (Recommended)
Replace ScriptProcessorNode with MediaRecorder:
```typescript
const mediaRecorder = new MediaRecorder(stream);
const audioChunks: BlobEvent[] = [];
mediaRecorder.ondataavailable = (e) => {
  audioChunks.push(e.data);
  session.sendRealtimeInput({ media: new Blob([...audioChunks]) });
};
mediaRecorder.start(100); // 100ms chunks
```

### Option 2: Use Web Audio API Properly
- Replace ScriptProcessorNode with AnalyserNode + XMLHttpRequest
- Implement proper audio encoding to PCM16
- Handle async/await properly in callbacks

### Option 3: Use getUserMedia with track processing
- Use MediaStreamTrack getStats/getCapabilities
- Implement custom audio buffering without ScriptProcessorNode

## Implementation Notes
- The crash happens specifically when onaudioprocess fires
- Simple try-catch blocks don't prevent the crash
- Disabling the processor entirely = stable app
- Need to test each approach in isolation before integration

## Files to Modify
- `src/renderer/src/LiveContext.tsx` - Lines ~240-290 (onopen callback)

## Testing Checklist
- [ ] No crash on connect
- [ ] No crash on voice input
- [ ] Audio actually reaches the transcription provider
- [ ] Mossy responds to voice
- [ ] Audio playback works
- [ ] Disconnect cleanly

Last updated: 2026-01-14
