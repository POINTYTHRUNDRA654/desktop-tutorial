# Tutorial Replay Feature - User Guide

## Overview

The Tutorial Replay feature allows you to re-experience Mossy's installation tutorial and onboarding flow at any time, even after you've completed it. This is perfect for:

- Testing the onboarding experience
- Seeing the system scan again
- Re-reviewing tool recommendations
- Showing the tutorial to someone else
- Practicing the initial setup

## How to Access

### Step 1: Open Settings
1. Look for the **gear icon (⚙️)** in the left sidebar
2. Click on it to open the Settings Hub

### Step 2: Navigate to Tutorial & Onboarding
1. In the Settings Hub, you'll see 5 sections
2. Scroll down to **"Step 5: Tutorial & Onboarding"**
3. Click on the section to expand it

### Step 3: Replay the Tutorial
1. You'll see the "Replay Installation Tutorial" section
2. Read the information about what gets reset
3. Click the **"Replay Tutorial"** button
4. A confirmation dialog will appear

### Step 4: Confirm Reset
1. Review the confirmation message
2. Click **"Yes, Reset Tutorial"** to proceed
3. Or click **"Cancel"** if you change your mind

### Step 5: App Reloads
1. You'll see a success message: "Tutorial reset complete! Reloading app..."
2. The app will automatically reload after 1.5 seconds
3. The first-run experience will start again!

## What Gets Reset

When you replay the tutorial, these flags are cleared:

- ✓ Boot animation flag
- ✓ First-run onboarding completion
- ✓ Onboarding wizard completion
- ✓ Tutorial completion status
- ✓ Tutorial autostart flag
- ✓ Voice setup wizard completion

## What's Preserved

**Important:** These are NOT affected by the reset:

- ✓ All your settings and configurations
- ✓ API keys (OpenAI, Groq, etc.)
- ✓ Detected programs and tool paths
- ✓ System scan results
- ✓ Tool preferences and integrated tools
- ✓ Knowledge Vault and uploaded documents
- ✓ Project data and mod configurations
- ✓ Privacy settings
- ✓ Language preferences
- ✓ External tool paths

## The Tutorial Experience

After resetting, you'll go through:

1. **Boot Animation** (if not disabled)
   - The Pip-Boy style startup screen

2. **First-Run Onboarding**
   - Welcome screen
   - Language selection
   - System scan (detects installed programs)
   - Tool recommendations
   - Integration setup

3. **Privacy & Capability Onboarding**
   - Nexus Mods integration
   - Neural Link activation
   - Memory Vault setup

4. **Voice Setup Wizard** (optional)
   - Configure voice input/output
   - Test voice features

## Tips

💡 **Testing Without Commitment**
- You can cancel at any step during the tutorial
- Your original settings remain safe

💡 **System Scan**
- The system scan can take 30-60 seconds
- It detects modding tools, AI software, and NVIDIA utilities
- Previous scan results are preserved (optional)

💡 **Multiple Resets**
- You can replay the tutorial as many times as you want
- Each reset is independent and safe

## Troubleshooting

### Tutorial Doesn't Start After Reset

If the tutorial doesn't appear after resetting:

1. **Check the browser console** (Ctrl+Shift+I)
   - Look for any error messages
   - Verify localStorage was cleared

2. **Manual verification**
   - Open DevTools → Application → Local Storage
   - Confirm these keys are removed:
     - `mossy_onboarding_complete`
     - `mossy_onboarding_completed`
     - `mossy_tutorial_completed`

3. **Force refresh**
   - Try Ctrl+Shift+R (hard refresh)
   - Or close and reopen the app

### Settings Don't Load

If the Settings page shows errors:

1. Check for JavaScript errors in console
2. Try navigating to another page and back
3. Restart the app if needed

### App Doesn't Reload

If the app doesn't automatically reload:

1. Manually reload with Ctrl+R
2. Or close and reopen the app
3. The reset will still be applied

## UI Preview

```
┌─────────────────────────────────────────────────────────────┐
│ Settings Hub (All-in-One)                                   │
│ One ordered flow for privacy, language, external tools...   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ▼ Step 5: Tutorial & Onboarding                            │
│   Replay the installation tutorial and onboarding...        │
│   ┌──────────────────────────────────────────────────────┐ │
│   │ 🔄 Replay Installation Tutorial                      │ │
│   │                                                       │ │
│   │ Restart the first-run experience, including the      │ │
│   │ system scan, tool recommendations, and onboarding... │ │
│   │                                                       │ │
│   │ ℹ️ What will be reset:                               │ │
│   │ • First-run onboarding completion flag               │ │
│   │ • Tutorial completion status                         │ │
│   │ • Voice setup wizard status                          │ │
│   │ • Boot animation flag                                │ │
│   │                                                       │ │
│   │ ✓ What will be preserved:                            │ │
│   │ • All settings and API keys                          │ │
│   │ • Detected programs and tool paths                   │ │
│   │ • System scan results                                │ │
│   │ • Tool preferences and integrated tools              │ │
│   │ • Knowledge Vault and custom data                    │ │
│   │ • Project data and mod configurations                │ │
│   │                                                       │ │
│   │ [🔄 Replay Tutorial]                                 │ │
│   └──────────────────────────────────────────────────────┘ │
│                                                              │
│   💡 Tip                                                    │
│   The installation tutorial includes a system scan that     │
│   detects modding tools, AI software, and NVIDIA utilities. │
└─────────────────────────────────────────────────────────────┘
```

## Confirmation Dialog

When you click "Replay Tutorial", you'll see:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Confirm Reset                                        │
│                                                          │
│ The app will reload and show the installation tutorial  │
│ again. You'll go through the system scan, tool          │
│ recommendations, and onboarding steps.                   │
│                                                          │
│ Are you sure you want to continue?                      │
│                                                          │
│ [Yes, Reset Tutorial]  [Cancel]                         │
└─────────────────────────────────────────────────────────┘
```

## Success Message

After confirming:

```
┌─────────────────────────────────────────────────────────┐
│ ✓ Tutorial reset complete! Reloading app...            │
└─────────────────────────────────────────────────────────┘
```

## Support

If you encounter any issues with the Tutorial Replay feature:

1. Check this guide first
2. Look at the console for error messages
3. Try manually clearing localStorage if needed
4. Report any bugs with screenshots/logs

## Related Features

- **Settings Hub**: Access all Mossy settings in one place
- **Privacy Settings**: Control data collection and sharing
- **Language Settings**: Change UI language
- **External Tools**: Configure modding tool paths
- **Backup & Restore**: Export/import settings

---

**Note**: This feature was added in Mossy v5.4.23 to allow users to easily replay the installation tutorial without manually clearing data or reinstalling the app.

