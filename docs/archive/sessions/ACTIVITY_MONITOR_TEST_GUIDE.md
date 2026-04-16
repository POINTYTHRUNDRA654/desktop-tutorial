# Activity Monitoring System - Test Guide

## ✅ Implementation Complete

All components have been successfully integrated into Mossy. The app is now ready to test the process learning and suggestion system.

## What's Installed

### 1. **ActivityMonitor.ts** (src/shared/)
- Tracks user actions: AI queries, tool usage, file operations
- Stores activity with timing and success/failure
- Detects workflow patterns automatically
- Generates learning insights

### 2. **ProcessLearner.ts** (src/shared/)
- Analyzes patterns from ActivityMonitor
- Generates 5 types of suggestions:
  - **Efficiency**: Speed up slow workflows
  - **Order**: Better step sequencing
  - **Automation**: Automate repetitive tasks
  - **Safety**: Prevent failures
  - **Quality**: Improve outcomes

### 3. **useActivityMonitor Hook** (src/renderer/src/hooks/)
- React hook for easy integration
- Manages suggestion state
- Auto-updates every 5 minutes
- Integrated into ChatInterface

### 4. **SuggestionPanel Component** (src/renderer/src/components/)
- Beautiful suggestion display
- Color-coded by priority (high/medium/low)
- Shows confidence scores
- Displays potential benefits
- Action buttons for acceptance/dismissal

### 5. **Configuration** (.env.local)
```
VITE_ENABLE_ACTIVITY_MONITOR=true
VITE_LEARNING_LOG_RETENTION_DAYS=30
VITE_AUTO_SUGGESTION_THRESHOLD=0.75
```

## How to Test

### Start the App
```bash
npm run dev
```

The SuggestionPanel appears at the bottom of the ChatInterface above the input box.

### Trigger Activity Logging
1. **Ask Mossy questions** - Each chat will log an AI_QUERY activity
2. **Use file attachments** - File operations are tracked
3. **Repeat similar tasks** - Patterns emerge after 3+ similar actions

### Watch Suggestions Appear
After you've:
- ✓ Asked 3+ similar questions → Efficiency suggestions
- ✓ Performed the same workflow 3+ times → Automation candidates
- ✓ Made mistakes → Safety improvements suggested
- ✓ Used tools repeatedly → Optimization tips

### Test Key Features

**See Confidence Scores**
- Green bar (>80%): High confidence
- Yellow bar (60-80%): Medium confidence  
- Red bar (<60%): Lower confidence

**Check Priority Levels**
- 🔴 RED = High priority (frequent + slow)
- 🟠 ORANGE = Medium priority
- 🟢 GREEN = Low priority

**Monitor Patterns**
Log in browser console:
```javascript
activityMonitor.getActivities(24)  // Last 24 hours
processLearner.getAllSuggestions() // All current suggestions
```

## Avatar TTS - Protected ✅

**No changes to voice system:**
- Zira voice still configured
- Browser SpeechSynthesis isolated
- TTS works independently
- Avatar speaks normally

## Files Created/Modified

**Created:**
- `src/shared/ActivityMonitor.ts` - Core monitoring
- `src/shared/ProcessLearner.ts` - Suggestion engine
- `src/shared/index.ts` - Module exports
- `src/renderer/src/hooks/useActivityMonitor.ts` - React hook
- `src/renderer/src/components/SuggestionPanel.tsx` - UI component
- `src/renderer/src/styles/SuggestionPanel.css` - Styling

**Modified:**
- `.env.local` - Added monitoring configuration
- `src/renderer/src/ChatInterface.tsx` - Integrated hook & logging

**Build Status:** ✅ Successful (2690 modules transformed)

## Next Steps

1. **Run the dev server**: `npm run dev`
2. **Chat with Mossy** several times to generate activities
3. **Check the suggestion panel** for recommended improvements
4. **Test clicking "Got it"** or "Dismiss" buttons
5. **Verify no TTS issues** - she should still talk normally

## Troubleshooting

If suggestions don't appear:
1. Check `.env.local` has `VITE_ENABLE_ACTIVITY_MONITOR=true`
2. Refresh browser console
3. Perform 3+ similar actions
4. Wait 5 minutes for analysis cycle
5. Check browser console for any errors

If TTS breaks:
- It shouldn't! The systems are completely isolated
- Voice settings unchanged
- Browser SpeechSynthesis runs independently

---

**Ready to test!** Start the dev server and begin chatting with Mossy. 🚀
