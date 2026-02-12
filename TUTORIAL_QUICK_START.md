# Quick Start: Integrating the Tutorial System

## For You (The User)

### What You Have Now:

✅ **Complete Tutorial** - MOSSY_TUTORIAL_ENHANCED.md explains everything  
✅ **AI Integration System** - Mossy can now provide context-aware help  
✅ **All Code Ready** - Just needs to be added to the pages  

### What Users Will Experience:

1. **On Every Page**: Floating help button in corner
2. **Click It**: Shows page-specific help and suggested questions
3. **Ask Mossy**: One click sends them to chat with context
4. **Get Help**: Mossy answers with page-specific guidance

## For Your Developer (Quick Integration)

### Step 1: Add TutorialHelper to a Page (2 minutes)

Open any page component (e.g., `src/renderer/src/ImageSuite.tsx`):

```tsx
// Add this import at the top:
import TutorialHelper from './components/TutorialHelper';

// Add this at the bottom of your return statement:
export default function ImageSuite() {
  return (
    <div>
      {/* ... existing page content ... */}
      
      <TutorialHelper />  {/* Add this line */}
    </div>
  );
}
```

That's it! The help widget will now appear on that page.

### Step 2: Test It (1 minute)

1. Start the app: `npm run dev`
2. Navigate to the page you added it to
3. Look for the floating help icon (bottom right)
4. Click it to expand
5. Click "Ask Mossy About This Page"
6. Verify it navigates to chat

### Step 3: Add ChatInterface Integration (5 minutes)

Open `src/renderer/src/ChatInterface.tsx`:

Find where state is initialized (around line 335):
```tsx
const [inputText, setInputText] = useState('');
```

Add this useEffect right after the other useEffects:
```tsx
// Tutorial Integration
useEffect(() => {
  const prefilledPrompt = sessionStorage.getItem('mossy_prefilled_prompt');
  if (prefilledPrompt) {
    setInputText(prefilledPrompt);
    sessionStorage.removeItem('mossy_prefilled_prompt');
    
    // Auto-focus the textarea
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.focus();
    }
  }
}, []);
```

Done! Now when users click "Ask Mossy" from the help widget, the chat will pre-fill their question.

### Step 4: Add to All Pages (15 minutes)

Add `<TutorialHelper />` to these components:

**High Priority:**
- [ ] src/renderer/src/TheNexus.tsx
- [ ] src/renderer/src/ChatInterface.tsx
- [ ] src/renderer/src/VoiceChat.tsx (Live Voice)
- [ ] src/renderer/src/TheAuditor.tsx
- [ ] src/renderer/src/ImageSuite.tsx

**Medium Priority:**
- [ ] src/renderer/src/Workshop.tsx
- [ ] src/renderer/src/TheVault.tsx
- [ ] src/renderer/src/SettingsHub.tsx
- [ ] src/renderer/src/LearningHub.tsx

**Low Priority:**
- [ ] All other pages

### Step 5: Customize (Optional)

If you want compact mode (icon only):
```tsx
<TutorialHelper compact={true} />
```

If you want inline instead of fixed position:
```tsx
<TutorialHelper position="inline" />
```

If you want to force a specific page context:
```tsx
<TutorialHelper forcePage="/specific-route" />
```

## For Testing

### Test Checklist:

1. **Help Widget Appears**
   - [ ] Navigate to a page with TutorialHelper
   - [ ] See floating icon in bottom right
   - [ ] Click to expand

2. **Context is Correct**
   - [ ] Expanded widget shows correct page name
   - [ ] Features list is relevant
   - [ ] Suggested questions make sense

3. **Ask Mossy Works**
   - [ ] Click "Ask Mossy About This Page"
   - [ ] Navigates to /chat
   - [ ] Input is pre-filled with context
   - [ ] Can edit and send

4. **Suggested Questions Work**
   - [ ] Click a suggested question
   - [ ] Navigates to chat
   - [ ] Question is pre-filled

## Troubleshooting

### Help Widget Not Showing

**Check:**
1. Is TutorialHelper imported?
2. Is it rendered in the component?
3. Is there a context defined for this route in tutorialContext.ts?
4. Check browser console for errors

**Fix:**
```tsx
// Make sure this is present:
import TutorialHelper from './components/TutorialHelper';

// And this is in your return:
<TutorialHelper />
```

### Pre-filled Prompt Not Working

**Check:**
1. Is the useEffect added to ChatInterface?
2. Is sessionStorage being checked?
3. Are there any console errors?

**Fix:**
Make sure this code is in ChatInterface.tsx:
```tsx
useEffect(() => {
  const prefilledPrompt = sessionStorage.getItem('mossy_prefilled_prompt');
  if (prefilledPrompt) {
    setInputText(prefilledPrompt);
    sessionStorage.removeItem('mossy_prefilled_prompt');
  }
}, []);
```

### Context Not Found

**Check:**
1. Is the route defined in tutorialContext.ts?
2. Is the route format correct (starts with `/`)?
3. Is there a typo in the route?

**Fix:**
Add context to tutorialContext.ts:
```typescript
'your-page-id': {
  pageId: 'your-page-id',
  pageName: 'Your Page Name',
  route: '/your/route',
  // ... rest of context
}
```

## Adding New Pages (Template)

When you want to add tutorial support for a new page:

1. **Add context to tutorialContext.ts:**

```typescript
'new-feature': {
  pageId: 'new-feature',
  pageName: 'New Feature Page',
  route: '/new-feature',
  purpose: 'What this page does in one sentence',
  features: [
    'Key feature 1',
    'Key feature 2',
  ],
  controls: [
    {
      name: 'Main Button',
      type: 'button',
      description: 'What it does',
      whenToUse: 'When to click it',
    },
  ],
  commonMistakes: [
    'Common mistake to avoid',
  ],
  guides: [
    {
      title: 'How to Do Task',
      steps: ['Step 1', 'Step 2'],
    },
  ],
  tutorialSections: ['Relevant Tutorial Section'],
  suggestedQuestions: [
    'Common question?',
  ],
},
```

2. **Add TutorialHelper to page**
3. **Test it**
4. **Done!**

## Files Reference

**Core System:**
- `src/renderer/src/tutorialContext.ts` - Context definitions
- `src/renderer/src/components/TutorialHelper.tsx` - Help widget
- `src/renderer/src/tutorialIntegration.ts` - Integration helpers

**Documentation:**
- `MOSSY_TUTORIAL_ENHANCED.md` - User-facing tutorial
- `TUTORIAL_SYSTEM_GUIDE.md` - Developer documentation
- `TUTORIAL_COMPLETION_SUMMARY.md` - Delivery summary
- `TUTORIAL_QUICK_START.md` - This file

## Timeline Estimate

**Minimal Integration (just get it working):**
- Add to ChatInterface: 5 minutes
- Add to 1 page: 2 minutes
- Test: 3 minutes
**Total: ~10 minutes**

**Full Integration (all pages):**
- Add to ChatInterface: 5 minutes
- Add to 15 pages: 30 minutes
- Test all pages: 30 minutes
**Total: ~65 minutes**

**Complete System (with customization):**
- Full integration: 65 minutes
- Add custom contexts: 60 minutes
- Test thoroughly: 30 minutes
- Documentation updates: 30 minutes
**Total: ~3 hours**

## Support

If you run into issues:
1. Check this guide
2. Check TUTORIAL_SYSTEM_GUIDE.md
3. Check browser console for errors
4. Check that TypeScript compiles: `npm run build`

## Summary

**Minimum to Get Working:**
1. Add useEffect to ChatInterface (5 lines of code)
2. Add `<TutorialHelper />` to pages (1 line per page)
3. Test

**That's literally it!** The system is designed to be drop-in ready.

All the complex logic (context detection, prompt generation, routing) is already handled by the system.

---

**Ready to go!** 🚀

Choose your integration level:
- ⚡ **Quick** - Add to ChatInterface + 1 page (10 min)
- 📊 **Standard** - Add to all main pages (1 hour)
- 🎯 **Complete** - Full integration + customization (3 hours)
