# Tutorial Replay Feature - Visual Demonstration

## Feature Overview

This document provides a visual walkthrough of the Tutorial Replay feature added in Mossy v5.4.23.

## Location

The feature is located in: **Settings → Step 5: Tutorial & Onboarding**

---

## 1. Settings Hub Page

When you open Settings, you'll see the Settings Hub with 5 sections:

```
╔═══════════════════════════════════════════════════════════════════╗
║  MOSSY CORE - SETTINGS                                            ║
║  ⚙️  Settings Hub (All-in-One)                                    ║
║  One ordered flow for privacy, language, external tools, and      ║
║  backup workflows.                                                ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Flow (Read in Order)                                             ║
║  1. Lock down privacy and security basics                         ║
║  2. Choose your preferred UI language                             ║
║  3. Verify external tool paths and launches                       ║
║  4. Export a clean backup snapshot                                ║
║  5. Replay the installation tutorial if needed           ← NEW!   ║
║                                                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  🔒 Step 1: Privacy & Security                           [▼]     ║
║     Control data collection, sharing, and security rules          ║
║                                                                    ║
║  🗺️  Step 2: Language                                    [▼]     ║
║     Choose the UI language and request new translations           ║
║                                                                    ║
║  🔧 Step 3: External Tools                               [▼]     ║
║     Point Mossy at your modding toolchain and verify paths        ║
║                                                                    ║
║  📥 Step 4: Backup & Restore                             [▼]     ║
║     Export or import settings snapshots for quick recovery        ║
║                                                                    ║
║  🔄 Step 5: Tutorial & Onboarding                        [▼]     ║
║     Replay the installation tutorial and onboarding experience    ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 2. Tutorial & Onboarding Section (Collapsed)

When you click on "Step 5: Tutorial & Onboarding", the section expands:

```
╔═══════════════════════════════════════════════════════════════════╗
║  🔄 Step 5: Tutorial & Onboarding                        [▲]     ║
║     Replay the installation tutorial and onboarding experience    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  🔄  Replay Installation Tutorial                          │ ║
║  │                                                             │ ║
║  │  Restart the first-run experience, including the system    │ ║
║  │  scan, tool recommendations, and onboarding flow. This     │ ║
║  │  will clear your onboarding progress but keep all your     │ ║
║  │  settings, API keys, and user data intact.                 │ ║
║  │                                                             │ ║
║  │  ┌─────────────────────────────────────────────────────┐  │ ║
║  │  │ What will be reset:                                 │  │ ║
║  │  │ • First-run onboarding completion flag              │  │ ║
║  │  │ • Tutorial completion status                        │  │ ║
║  │  │ • Voice setup wizard status                         │  │ ║
║  │  │ • Boot animation flag                               │  │ ║
║  │  └─────────────────────────────────────────────────────┘  │ ║
║  │                                                             │ ║
║  │  ┌─────────────────────────────────────────────────────┐  │ ║
║  │  │ ✓ What will be preserved:                           │  │ ║
║  │  │ • All settings and API keys                         │  │ ║
║  │  │ • Detected programs and tool paths                  │  │ ║
║  │  │ • System scan results                               │  │ ║
║  │  │ • Tool preferences and integrated tools             │  │ ║
║  │  │ • Knowledge Vault and custom data                   │  │ ║
║  │  │ • Project data and mod configurations               │  │ ║
║  │  └─────────────────────────────────────────────────────┘  │ ║
║  │                                                             │ ║
║  │     ┌──────────────────────────┐                          │ ║
║  │     │  🔄  Replay Tutorial     │                          │ ║
║  │     └──────────────────────────┘                          │ ║
║  │                                                             │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                    ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ 💡 Tip                                                      │ ║
║  │ The installation tutorial includes a system scan that       │ ║
║  │ detects modding tools, AI software, and NVIDIA utilities.   │ ║
║  │ It's a great way to see what Mossy can integrate with!      │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 3. After Clicking "Replay Tutorial"

A confirmation dialog appears:

```
╔═══════════════════════════════════════════════════════════════════╗
║  🔄 Step 5: Tutorial & Onboarding                        [▲]     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  🔄  Replay Installation Tutorial                          │ ║
║  │                                                             │ ║
║  │  [... content above ...]                                   │ ║
║  │                                                             │ ║
║  │  ┌──────────────────────────────────────────────────────┐ │ ║
║  │  │                                                       │ │ ║
║  │  │  ⚠️  Confirm Reset                                   │ │ ║
║  │  │                                                       │ │ ║
║  │  │  The app will reload and show the installation       │ │ ║
║  │  │  tutorial again. You'll go through the system scan,  │ │ ║
║  │  │  tool recommendations, and onboarding steps.         │ │ ║
║  │  │                                                       │ │ ║
║  │  │  Are you sure you want to continue?                  │ │ ║
║  │  │                                                       │ │ ║
║  │  │  ┌─────────────────────┐  ┌──────────┐             │ │ ║
║  │  │  │ Yes, Reset Tutorial │  │  Cancel  │             │ │ ║
║  │  │  └─────────────────────┘  └──────────┘             │ │ ║
║  │  │                                                       │ │ ║
║  │  └──────────────────────────────────────────────────────┘ │ ║
║  │                                                             │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 4. After Confirming

Success message appears and app reloads:

```
╔═══════════════════════════════════════════════════════════════════╗
║  🔄 Step 5: Tutorial & Onboarding                        [▲]     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │                                                             │ ║
║  │  🔄  Replay Installation Tutorial                          │ ║
║  │                                                             │ ║
║  │  [... content above ...]                                   │ ║
║  │                                                             │ ║
║  │  ┌──────────────────────────────────────────────────────┐ │ ║
║  │  │                                                       │ │ ║
║  │  │  ✓  Tutorial reset complete! Reloading app...       │ │ ║
║  │  │                                                       │ │ ║
║  │  └──────────────────────────────────────────────────────┘ │ ║
║  │                                                             │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝

(App reloads after 1.5 seconds...)
```

---

## 5. After Reload - First Run Tutorial Appears

The app reloads and shows the Welcome screen:

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                    ║
║                       ✨                                          ║
║                                                                    ║
║              Welcome to Mossy v4.0                                ║
║                                                                    ║
║       Your AI-powered Fallout 4 modding assistant                 ║
║         with next-gen voice conversation                          ║
║                                                                    ║
║  ✨ New in v4.0: Pick your UI language on first launch           ║
║  (or later in Settings), plus a smoother Install Wizard           ║
║  experience.                                                       ║
║                                                                    ║
║  Let me scan your system to discover tools I can                  ║
║  integrate with. This will help me provide personalized           ║
║  recommendations and boost my capabilities.                       ║
║                                                                    ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │  🗺️  Language                                            │   ║
║  │  Choose your interface language. You can change this     │   ║
║  │  later in Settings.                                       │   ║
║  │                                                            │   ║
║  │  [ Auto (system)     ▼ ]                                  │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║                                                                    ║
║           ┌────────────────────────────────┐                     ║
║           │  Start System Scan  →          │                     ║
║           └────────────────────────────────┘                     ║
║                                                                    ║
║              [Watch full onboarding tutorial]                     ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Color Scheme

The actual UI uses these colors:

- **Background**: Dark green-black gradient (`#0b0f0b`, `#0a0e0a`)
- **Primary accent**: Emerald green (`#10b981`)
- **Text**: White/Light slate (`#ffffff`, `#cbd5e1`)
- **Borders**: Dark slate (`#1e293b`)
- **Info boxes**: 
  - Blue for "what will be reset" (`#1e3a8a` background)
  - Green for "what will be preserved" (`#064e3b` background)
  - Amber for confirmation dialog (`#78350f` background)
- **Buttons**: 
  - Primary: Emerald green (`#059669`)
  - Confirm: Amber (`#d97706`)
  - Cancel: Slate gray (`#475569`)

---

## Interactive Elements

### Buttons

**Replay Tutorial Button** (before confirmation)
```
┌───────────────────────┐
│  🔄  Replay Tutorial  │  ← Emerald green, hover effect
└───────────────────────┘
```

**Confirmation Buttons**
```
┌──────────────────────┐  ┌───────────┐
│ Yes, Reset Tutorial  │  │  Cancel   │
└──────────────────────┘  └───────────┘
     ↑ Amber                  ↑ Gray
```

### Expandable Sections

Each section can be collapsed/expanded:
```
[▼]  ← Click to expand
[▲]  ← Click to collapse
```

---

## Accessibility Features

- **Keyboard navigation**: Tab through all interactive elements
- **Clear labels**: All buttons have descriptive text
- **Color contrast**: Meets WCAG guidelines
- **Screen reader friendly**: Semantic HTML structure
- **Focus indicators**: Visible outline on focused elements

---

## Mobile Responsiveness

The layout adapts for smaller screens:

- Stack elements vertically on mobile
- Larger touch targets for buttons
- Scrollable content areas
- Preserved readability at all sizes

---

## Animation & Transitions

1. **Section expand/collapse**: Smooth height transition
2. **Button hover**: Color lightening effect
3. **Success message**: Fade in animation
4. **Reload countdown**: 1.5 second delay with message

---

## Error States

If something goes wrong:

```
┌──────────────────────────────────────────────────┐
│ ⚠️ Reset failed. Please try again or clear      │
│ localStorage manually via DevTools.              │
└──────────────────────────────────────────────────┘
```

(Note: Error handling is built into the component but rarely needed)

---

## Comparison: Before vs After

### Before (v5.4.20 and earlier)

❌ No way to replay tutorial without:
- Manually clearing localStorage
- Editing code
- Reinstalling the app
- Using browser DevTools

### After (v5.4.23+)

✅ Simple, user-friendly button in Settings
✅ Clear information about what happens
✅ Confirmation to prevent accidents
✅ Automatic reload
✅ Works every time

---

## Summary

The Tutorial Replay feature provides:

- ✓ Easy access through Settings
- ✓ Clear visual feedback
- ✓ Safe operation (preserves data)
- ✓ Professional UI design
- ✓ Complete user control

Users can now replay the installation tutorial anytime with just a few clicks!

