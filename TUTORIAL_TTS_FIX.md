# Tutorial TTS Integration Fix

## Problem Summary
The tutorial system was not working as expected because Mossy (the AI assistant) was not speaking when users accessed the tutorials. This made the tutorial experience incomplete and confusing for users.

## Root Cause Analysis
The tutorial components (`TutorialOverlay.tsx`, `VideoTutorial.tsx`, and `HomePage.tsx`) were missing integration with the Text-to-Speech (TTS) system (`speakMossy` function from `mossyTts.ts`).

### Issues Identified:
1. **TutorialOverlay.tsx** - The interactive tutorial displayed visual content but never triggered speech narration
2. **VideoTutorial.tsx** - The video tutorial opened but provided no audio introduction
3. **HomePage.tsx** - Tutorial buttons dispatched events but didn't announce what was happening

## Solution Implemented

### Changes Made:

#### 1. TutorialOverlay.tsx
- **Import Addition**: Added `import { speakMossy } from './mossyTts';`
- **Interface Update**: Added optional `narration?: string` field to `TutorialStep` interface
- **Narration Hook**: Added new `useEffect` hook that triggers speech when:
  - Tutorial is open
  - Step changes (via `currentStepIndex`)
  - Narration text is available
- **Narration Text**: Added narration text for all 5 tutorial steps:
  1. Welcome step: Introduction to Mossy
  2. Bridge step: Explanation of Desktop Bridge
  3. Sidebar step: Navigation guide
  4. Live Voice step: Voice interaction info
  5. Command Palette step: Power user shortcuts

**Key Implementation Details:**
```typescript
// Narration hook with 500ms delay for UI settling
useEffect(() => {
    if (!isOpen || !steps[currentStepIndex]) return;
    
    const currentStep = steps[currentStepIndex];
    const narrationText = currentStep.narration;
    
    if (narrationText) {
        const timer = setTimeout(() => {
            speakMossy(narrationText, { 
                cancelExisting: true,
                onError: (err) => console.error('[TutorialOverlay] TTS failed:', err)
            });
        }, 500);
        
        return () => clearTimeout(timer);
    }
}, [currentStepIndex, isOpen]);
```

#### 2. VideoTutorial.tsx
- **Import Addition**: Added `import { speakMossy } from './mossyTts';`
- **Opening Narration**: Modified the `isOpen` useEffect to speak an introduction when the video tutorial opens
- **Narration Text**: "Opening video tutorial. This tutorial will guide you through using Mossy step by step. Watch and learn at your own pace."

**Key Implementation Details:**
```typescript
useEffect(() => {
    if (!isOpen) {
        // ... existing pause logic
    } else {
        // Speak introduction when video tutorial opens
        const timer = setTimeout(() => {
            speakMossy(
                'Opening video tutorial. This tutorial will guide you through using Mossy step by step. Watch and learn at your own pace.',
                { 
                    cancelExisting: true,
                    onError: (err) => console.error('[VideoTutorial] TTS failed:', err)
                }
            );
        }, 500);
        
        return () => clearTimeout(timer);
    }
}, [isOpen]);
```

#### 3. HomePage.tsx
- **Import Addition**: Added `import { speakMossy } from './mossyTts';`
- **Button Handler Updates**: Modified both tutorial button handlers to announce actions:
  - Video tutorial: "Starting video tutorial."
  - Interactive tutorial: "Starting interactive tutorial."

**Key Implementation Details:**
```typescript
const handleWatchTutorial = () => {
    speakMossy('Starting video tutorial.', { cancelExisting: true });
    window.dispatchEvent(new CustomEvent('open-video-tutorial'));
};

const handleStartInteractiveTutorial = () => {
    speakMossy('Starting interactive tutorial.', { cancelExisting: true });
    window.dispatchEvent(new CustomEvent('start-tutorial'));
};
```

## TTS System Architecture

### How speakMossy Works:
1. **Entry Point**: `speakMossy()` function in `mossyTts.ts`
2. **Service Layer**: `VoiceService` class in `voice-service.ts`
3. **TTS Provider**: Browser TTS (default), ElevenLabs, or Cloud TTS
4. **Browser TTS**: Uses Web Speech API (`window.speechSynthesis`)

### Default Configuration:
- **Provider**: Browser TTS (forced in VoiceService constructor)
- **Enabled**: `true` by default
- **Rate**: 1.0 (normal speed)
- **Pitch**: 1.0 (normal pitch)
- **Volume**: 0.85 (85%)
- **Voice Selection**: Heuristic-based (prefers natural-sounding female voices)

### Settings Storage:
- Stored in localStorage under key: `mossy_browser_tts_settings_v1`
- Can be modified by users in Settings → Voice Settings
- Persists across sessions

## Testing Approach

### Manual Testing Steps:

1. **Test HomePage Tutorial Buttons**
   - Navigate to home page (route: `/` or `#/`)
   - Click "Watch Video Tutorial" button
   - Verify: Mossy says "Starting video tutorial."
   - Click "Interactive Walkthrough" button
   - Verify: Mossy says "Starting interactive tutorial."

2. **Test Interactive Tutorial**
   - Start interactive tutorial
   - Step 1: Verify Mossy says "Welcome, Architect. I am Mossy..."
   - Click "Next"
   - Step 2: Verify Mossy says "To function effectively, I need to establish..."
   - Continue through all 5 steps
   - Verify each step has unique narration

3. **Test Video Tutorial**
   - Open video tutorial
   - Verify: Mossy says "Opening video tutorial. This tutorial will guide you..."
   - Close and reopen
   - Verify: Narration plays again

4. **Test TTS Settings**
   - Go to Settings → Voice Settings
   - Disable Browser TTS
   - Return to homepage
   - Click tutorial button
   - Verify: No speech (disabled)
   - Re-enable TTS
   - Click tutorial button
   - Verify: Speech works again

### Browser Compatibility:
- **Chrome/Edge**: Full support (Chromium-based)
- **Firefox**: Full support
- **Safari**: Full support (macOS/iOS)
- **Electron**: Full support (uses Chromium)

### Troubleshooting:

**If TTS doesn't work:**
1. Check browser console for errors
2. Verify `window.speechSynthesis` is available
3. Check localStorage for `mossy_browser_tts_settings_v1`
4. Ensure `enabled: true` in settings
5. Try different browser/Electron version

**Common Issues:**
- **No voices available**: Wait for `voiceschanged` event (already handled)
- **TTS disabled**: Check settings or browser permissions
- **Silent speech**: Check volume settings (default: 0.85)

## Files Modified:
1. `src/renderer/src/TutorialOverlay.tsx`
2. `src/renderer/src/VideoTutorial.tsx`
3. `src/renderer/src/HomePage.tsx`

## Files NOT Modified (But Related):
- `src/renderer/src/mossyTts.ts` - TTS wrapper (no changes needed)
- `src/renderer/src/voice-service.ts` - Core TTS service (no changes needed)
- `src/renderer/src/browserTts.ts` - Browser TTS implementation (no changes needed)

## Benefits of This Fix:
1. ✅ Users now hear Mossy explain each tutorial step
2. ✅ More engaging and accessible tutorial experience
3. ✅ Consistent with the app's AI assistant persona
4. ✅ Works in both dev and production builds
5. ✅ No breaking changes to existing functionality
6. ✅ Respects user TTS preferences (can be disabled)

## Future Enhancements (Out of Scope):
- Add pause/resume controls for narration
- Allow users to skip narration with keyboard shortcuts
- Provide alternative narration scripts for different user levels
- Add subtitles/captions synchronized with narration
- Support for multiple languages in narration
