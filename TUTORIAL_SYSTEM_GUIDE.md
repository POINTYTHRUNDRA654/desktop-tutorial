# Mossy Tutorial System - AI Integration Guide

## Overview

The Mossy Tutorial System provides context-aware assistance throughout the application. It allows Mossy AI to understand which page the user is on and provide relevant, targeted help.

## Components

### 1. Tutorial Context System (`tutorialContext.ts`)

**Purpose:** Defines metadata for each page/module including:
- Available features
- Button descriptions and when to use them
- Common beginner mistakes
- Step-by-step guides
- Suggested questions

**Example Context:**
```typescript
{
  pageId: 'chat',
  pageName: 'Chat Interface',
  route: '/chat',
  purpose: 'Text-based AI conversation',
  features: [...],
  controls: [
    {
      name: 'Send Button',
      type: 'button',
      description: 'Sends your message to Mossy',
      whenToUse: 'After typing your complete question'
    }
  ],
  commonMistakes: [...],
  guides: [...],
  suggestedQuestions: [...]
}
```

### 2. Tutorial Helper Component (`TutorialHelper.tsx`)

**Purpose:** Floating help widget that appears on each page with:
- "Ask Mossy About This Page" button
- Suggested questions specific to current page
- Common mistakes to avoid
- Links to relevant tutorial sections

**Usage:**
```tsx
import TutorialHelper from './components/TutorialHelper';

function MyPage() {
  return (
    <div>
      <h1>My Page Content</h1>
      <TutorialHelper />  {/* Automatic context detection */}
    </div>
  );
}
```

**Props:**
- `forcePage`: Override auto-detected page
- `compact`: Show as small icon only
- `position`: 'fixed' or 'inline'

### 3. Tutorial Integration Hook (`useTutorialContext`)

**Purpose:** React hook for accessing tutorial context in components

**Usage:**
```tsx
import { useTutorialContext } from './components/TutorialHelper';

function MyComponent() {
  const { context, suggestedQuestions, askMossy } = useTutorialContext();
  
  // context contains all page metadata
  // suggestedQuestions is array of questions for this page
  // askMossy(question) generates context-aware prompt
  
  return (
    <div>
      {suggestedQuestions.map(q => (
        <button onClick={() => askMossy(q)}>{q}</button>
      ))}
    </div>
  );
}
```

## How It Works

### Flow Diagram

```
User on Page → TutorialHelper Detects Route → Loads Context → Shows Help

User Clicks "Ask Mossy" → Generates Context-Aware Prompt → Stores in sessionStorage → Navigates to Chat

ChatInterface Loads → Checks sessionStorage → Pre-fills Input → User Can Edit/Send
```

### Context-Aware Prompts

When a user asks a question from a specific page, the system enriches the prompt with:

**Input:**
```
User on Image Suite page
User asks: "How do I create a normal map?"
```

**Generated Prompt:**
```
[CONTEXT: User is on the "Image Suite" page (/media/images)]
[PAGE PURPOSE: PBR texture generation and image processing]
[AVAILABLE FEATURES: Normal map generation, Roughness map creation, ...]

User's question: How do I create a normal map?

Please provide a helpful, beginner-friendly answer that:
1. References features available on this specific page
2. Provides step-by-step instructions when appropriate
3. Uses simple language and explains technical terms
4. Mentions specific buttons/controls if relevant
5. Includes "Beginner Tip" if helpful
```

This ensures Mossy:
- Knows what page the user is on
- References actual buttons/features available
- Provides contextually relevant answers
- Guides using the specific tools on that page

## Adding New Pages

To add tutorial support for a new page:

1. **Add context to `tutorialContext.ts`:**

```typescript
export const tutorialContexts: Record<string, TutorialPageContext> = {
  // ... existing pages
  
  'my-new-page': {
    pageId: 'my-new-page',
    pageName: 'My New Feature',
    route: '/my-new-page',
    purpose: 'Brief description of what this page does',
    features: [
      'Feature 1',
      'Feature 2',
    ],
    controls: [
      {
        name: 'Primary Action Button',
        type: 'button',
        description: 'What it does',
        whenToUse: 'When to click it',
      },
    ],
    commonMistakes: [
      'Mistake users often make',
    ],
    guides: [
      {
        title: 'How to Do Common Task',
        steps: [
          'Step 1',
          'Step 2',
        ],
      },
    ],
    tutorialSections: ['Relevant Tutorial Section Name'],
    suggestedQuestions: [
      'Common question 1?',
      'Common question 2?',
    ],
  },
};
```

2. **Add TutorialHelper to your page component:**

```tsx
import TutorialHelper from './components/TutorialHelper';

function MyNewPage() {
  return (
    <div>
      {/* Your page content */}
      <TutorialHelper />
    </div>
  );
}
```

3. **Add documentation to `MOSSY_TUTORIAL_ENHANCED.md`:**

Write detailed explanation of your page following the tutorial format:
- What You'll See
- Every Button Explained
- How to Use (step-by-step)
- Common Mistakes
- Troubleshooting

## Integration with ChatInterface

The ChatInterface automatically checks for tutorial prompts on load:

```typescript
useEffect(() => {
  const prefilledPrompt = sessionStorage.getItem('mossy_prefilled_prompt');
  if (prefilledPrompt) {
    setInputText(prefilledPrompt);
    sessionStorage.removeItem('mossy_prefilled_prompt');
    // Auto-focus input
  }
}, []);
```

This allows seamless flow from any page → tutorial help → chat with context.

## Benefits

### For Users:
1. **Context-Aware Help** - Mossy knows what page they're on
2. **Suggested Questions** - Don't know what to ask? See suggestions
3. **Common Mistakes** - Avoid beginner errors
4. **Quick Access** - Help is always one click away
5. **No Copy-Paste** - Questions are pre-filled with context

### For Developers:
1. **Centralized Documentation** - All page info in one place
2. **Reusable Component** - Drop TutorialHelper on any page
3. **Type Safety** - TypeScript interfaces for all context
4. **Easy Updates** - Update context, updates everywhere
5. **Analytics Ready** - Track which questions are popular

## Best Practices

### Writing Context

**DO:**
- Use simple, beginner-friendly language
- Be specific about what each button does
- Include "When to use" for every control
- Provide step-by-step guides
- Mention common mistakes to avoid

**DON'T:**
- Assume user knowledge
- Use jargon without explanation
- Make guides too long (5-7 steps max)
- Skip obvious buttons (document everything!)
- Forget to update when UI changes

### Suggested Questions

Good suggested questions:
- ✅ "What does this button do?"
- ✅ "How do I [specific task]?"
- ✅ "Why isn't [feature] working?"
- ✅ "What's the difference between X and Y?"

Poor suggested questions:
- ❌ "Help" (too vague)
- ❌ "Tell me about modding" (too broad)
- ❌ "What's this page for?" (too generic)

### Common Mistakes

Focus on mistakes that:
- Beginners actually make
- Cause problems or confusion
- Are easy to avoid with awareness
- Relate to the specific page

Example:
```typescript
commonMistakes: [
  'Clicking "Start New Project" when they should open existing one',
  'Not saving before running Auto-Fix',
  'Using wrong DDS compression for normal maps',
]
```

## Testing

### Manual Testing

1. Navigate to a page with TutorialHelper
2. Verify help widget appears
3. Click "Ask Mossy About This Page"
4. Verify navigation to chat
5. Verify input is pre-filled with context
6. Click suggested questions
7. Verify they work correctly

### Automated Testing

```typescript
import { getTutorialContext } from './tutorialContext';

describe('Tutorial Context', () => {
  it('should return context for valid route', () => {
    const context = getTutorialContext('/chat');
    expect(context).toBeDefined();
    expect(context?.pageName).toBe('Chat Interface');
  });
  
  it('should handle nested routes', () => {
    const context = getTutorialContext('/tools/auditor');
    expect(context).toBeDefined();
  });
});
```

## Future Enhancements

### Planned Features:
1. **Tutorial Progress Tracking** - Mark sections as "completed"
2. **Interactive Walkthroughs** - Step-by-step guided tours
3. **Video Tutorials** - Embed video explanations
4. **Multi-language Support** - Translate tutorial content
5. **Search Integration** - Search tutorials from any page
6. **User Notes** - Add personal notes to tutorial sections
7. **Quiz Mode** - Test understanding with quizzes
8. **Achievement System** - Gamify learning process

### Integration Ideas:
1. **First-time User Flow** - Auto-show tutorial on first visit
2. **Contextual Tips** - Show tips based on user actions
3. **Error Detection** - Detect common mistakes and suggest help
4. **Smart Suggestions** - ML-based question recommendations
5. **Community Tips** - User-contributed tips and tricks

## Troubleshooting

### TutorialHelper Not Showing

**Check:**
1. Is context defined for the route in `tutorialContext.ts`?
2. Is TutorialHelper component imported and rendered?
3. Is the route matching correctly? (check console logs)

### Pre-filled Prompt Not Working

**Check:**
1. Is ChatInterface checking sessionStorage?
2. Is navigation happening correctly?
3. Are there JavaScript errors? (check console)

### Context Not Detected

**Check:**
1. Route format (should start with `/`)
2. Nested routes (partial matching logic)
3. TypeScript compilation errors

## Support

For questions or issues with the tutorial system:
1. Check this documentation
2. Ask in #mossy-development channel
3. Create GitHub issue with [Tutorial] tag
4. Contact tutorial team directly

## Contributing

To contribute to the tutorial system:
1. Fork the repository
2. Add/update context in `tutorialContext.ts`
3. Update `MOSSY_TUTORIAL_ENHANCED.md`
4. Test thoroughly
5. Submit pull request
6. Tag @tutorial-team for review

---

**Version:** 5.4.21  
**Last Updated:** February 2026  
**Maintainers:** Mossy Development Team
