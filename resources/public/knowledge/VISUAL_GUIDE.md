# Mossy Onboarding Visual Guide

## Onboarding Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  USER LAUNCHES MOSSY FOR FIRST TIME                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ↓
        ┌─────────────────────────────────────┐
        │ Check localStorage flag:             │
        │ 'mossy_onboarding_completed'        │
        └─────────┬──────────────────┬────────┘
                  │                  │
         NOT FOUND│              FOUND
                  │                  │
        ┌─────────↓────────┐  ┌──────↓──────────────┐
        │ SHOW ONBOARDING  │  │ LOAD APP NORMALLY   │
        │ MODAL (OVERLAY)  │  │ Skip onboarding     │
        └────────┬─────────┘  └─────────────────────┘
                 │
                 ↓
    ┌────────────────────────────────────────┐
    │ STEP 1: WELCOME TO MOSSY               │
    ├────────────────────────────────────────┤
    │ ┌──────────────────────────────────────┐│
    │ │ 👋 Hello, Vault Dweller!             ││
    │ │                                      ││
    │ │ I'm Mossy, your AI assistant        ││
    │ │                                      ││
    │ │ Setup Steps:                         ││
    │ │ ✓ Welcome & Introduction             ││
    │ │ ✓ Connect Your Tools                 ││
    │ │ ✓ Privacy Settings                   ││
    │ │ ✓ You're All Set!                    ││
    │ │                                      ││
    │ │ [Previous] [Progress] [Next →]       ││
    │ └──────────────────────────────────────┘│
    └────────────────────────────────────────┘
                 │
    (user clicks Next)
                 │
                 ↓
    ┌────────────────────────────────────────┐
    │ STEP 2: CONNECT YOUR TOOLS              │
    ├────────────────────────────────────────┤
    │ ┌──────────────────────────────────────┐│
    │ │ Select which tools you have:         ││
    │ │                                      ││
    │ │ ☐ Creation Kit                       ││
    │ │ ☑ xEdit                              ││
    │ │ ☑ Blender                            ││
    │ │ ☐ NifSkope                           ││
    │ │ ☐ Papyrus Compiler                   ││
    │ │ ☐ Wrye Bash                          ││
    │ │                                      ││
    │ │ [Previous] [Progress] [Next →]       ││
    │ └──────────────────────────────────────┘│
    │                                          │
    │ (Selections saved to localStorage)      │
    └────────────────────────────────────────┘
                 │
    (user clicks Next)
                 │
                 ↓
    ┌────────────────────────────────────────┐
    │ STEP 3: YOUR PRIVACY SETTINGS           │
    ├────────────────────────────────────────┤
    │ ┌──────────────────────────────────────┐│
    │ │ 🔒 Privacy First                     ││
    │ │ All data stays local by default      ││
    │ │                                      ││
    │ │ Data Storage:                        ││
    │ │ [●] Keep All Data Local              ││
    │ │     All data stays on your computer  ││
    │ │                                      ││
    │ │ Knowledge Sharing (Optional):        ││
    │ │ [○] Contribute to Knowledge Base     ││
    │ │ [○] Share Script Patterns            ││
    │ │ [○] Share Mesh Optimizations         ││
    │ │                                      ││
    │ │ Quality:                             ││
    │ │ [○] Share Bug Reports                ││
    │ │                                      ││
    │ │ [Previous] [Progress] [Next →]       ││
    │ └──────────────────────────────────────┘│
    │                                          │
    │ (All settings saved immediately)        │
    └────────────────────────────────────────┘
                 │
    (user clicks Next)
                 │
                 ↓
    ┌────────────────────────────────────────┐
    │ STEP 4: YOU'RE ALL SET!                 │
    ├────────────────────────────────────────┤
    │ ┌──────────────────────────────────────┐│
    │ │ ✓ Setup Complete!                    ││
    │ │                                      ││
    │ │ ✓ 2 tools connected                  ││
    │ │ ✓ Privacy settings configured        ││
    │ │ ✓ Your data is secure                ││
    │ │                                      ││
    │ │ Next Steps:                          ││
    │ │ 1. Create your first mod project     ││
    │ │ 2. Start a conversation with Mossy  ││
    │ │ 3. Get help with modding!            ││
    │ │                                      ││
    │ │ [Previous] [Start Using Mossy →]     ││
    │ └──────────────────────────────────────┘│
    │                                          │
    │ (Flag set: mossy_onboarding_completed)  │
    └────────────────────────────────────────┘
                 │
    (user clicks "Start Using Mossy")
                 │
                 ↓
    ┌─────────────────────────────────────────┐
    │ APP LOADS NORMALLY                       │
    │                                          │
    │ ┌──────────────────────────────────────┐│
    │ │ Sidebar:                              ││
    │ │ • The Nexus                           ││
    │ │ • Talk to Mossy                       ││
    │ │ • ...other modules...                 ││
    │ │ • Privacy Settings     ← NEW!         ││
    │ │                                       ││
    │ │ Main Content:                         ││
    │ │ [Mossy Dashboard - Hero Section]      ││
    │ │                                       ││
    │ │ User can now use Mossy!               ││
    │ └──────────────────────────────────────┘│
    └─────────────────────────────────────────┘
```

## Privacy Settings Page Diagram

```
┌────────────────────────────────────────────────────────────────┐
│ PRIVACY & DATA SETTINGS                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 🛡️ MOSSY'S PRIVACY PROMISE                                    │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ ✓ Your data is yours                                      │  │
│ │ ✓ We never sell or monetize                              │  │
│ │ ✓ Permission required before sharing                     │  │
│ │ ✓ Local storage is primary                               │  │
│ │ ✓ Transparent & anonymized sharing                       │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ 💾 DATA STORAGE                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 🔒 Keep All Data Local                                        │
│    [●════════════════════════════════════════════════○]        │
│    Store all data exclusively on your computer                │
│    ℹ️ Recommended for maximum privacy                          │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ 📚 KNOWLEDGE BASE CONTRIBUTIONS                                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 📖 Contribute to Shared Knowledge Base                        │
│    [○════════════════════════════════════════════════●]        │
│    Share patterns that help all Mossy users                   │
│    ℹ️ No personal data included                                │
│                                                                 │
│    📄 Share Script Patterns                   [Learn more ▼]  │
│    [○════════════════════════════════════════════════●]        │
│    Papyrus patterns and techniques                            │
│    ℹ️ Requires Knowledge Base to be enabled                    │
│                                                                 │
│    🎨 Share Mesh Optimizations                [Learn more ▼]  │
│    [○════════════════════════════════════════════════●]        │
│    3D optimization techniques                                 │
│    ℹ️ Requires Knowledge Base to be enabled                    │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ ✨ QUALITY & SUPPORT                                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 🐛 Share Bug Reports                          [Learn more ▼]  │
│    [○════════════════════════════════════════════════●]        │
│    Help improve Mossy for everyone                            │
│    ℹ️ Reviewed for privacy before analysis                     │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ ⚙️ DATA MANAGEMENT                                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Local Storage Used: 2.45 MB                                   │
│ (Project data, conversations, settings)                       │
│                                                                 │
│ Encryption: ✓ Enabled                                        │
│ Your local data is encrypted at rest                          │
│                                                                 │
│ [Export My Data]  [Delete All Local Data]                    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Sidebar Navigation Update

```
┌─────────────────────────────────┐
│       MOSSY.AI 🟢               │
│     (Avatar core)               │
├─────────────────────────────────┤
│                                  │
│ The Nexus                        │
│ Talk to Mossy                    │
│ The Organizer                    │
│ The Assembler                    │
│ ...other modules...              │
│                                  │
│ System Map                       │
│ Live Voice                       │
│ Desktop Bridge                   │
│ Privacy Settings        ← NEW!   │  ⚙️ Users click here
│                                  │      to access full
├─────────────────────────────────┤      privacy control
│ v2.4.2        [🔴 Theme Toggle]  │
└─────────────────────────────────┘
```

## Data Storage Visualization

```
USER'S COMPUTER (Protected)
┌──────────────────────────────────────────────────┐
│                                                   │
│  🔒 ENCRYPTED LOCAL STORAGE                      │
│  ┌────────────────────────────────────────────┐  │
│  │ Key: Value                                 │  │
│  ├────────────────────────────────────────────┤  │
│  │ mossy_onboarding_completed:  "true"        │  │
│  │ mossy_privacy_settings: {                  │  │
│  │   keepLocalOnly: true,                     │  │
│  │   shareScriptPatterns: false,              │  │
│  │   shareMeshOptimizations: false,           │  │
│  │   shareBugReports: false,                  │  │
│  │   ...                                      │  │
│  │ }                                          │  │
│  │ mossy_connections: [                       │  │
│  │   { id: "xedit", selected: true },         │  │
│  │   { id: "blender", selected: true },       │  │
│  │   ...                                      │  │
│  │ ]                                          │  │
│  │ mossy_projects: [{...}, {...}]             │  │
│  │ mossy_conversations: [{...}, {...}]        │  │
│  │ [User's personal mod files & projects]     │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ALL DATA STAYS HERE UNLESS USER CHOOSES        │
│  TO SHARE (opt-in only)                         │
│                                                   │
└──────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                            │
        ▼                            ▼
   ┌─────────────┐          ┌──────────────────┐
   │  PRIVACY    │          │  IF USER OPTS IN │
   │  SETTINGS   │          │  TO SHARING:     │
   │  BLOCK IT   │          │  ANONYMIZE &     │
   │             │          │  SEND TO CLOUD   │
   └─────────────┘          └──────────────────┘
                                     │
                                     ▼
                        ┌──────────────────────┐
                        │ CLOUD KNOWLEDGE DB   │
                        │                      │
                        │ Pattern: "Event      │
                        │ listeners improve    │
                        │ performance"         │
                        │                      │
                        │ (No project names,   │
                        │  no personal data)   │
                        │                      │
                        │ Shared with all      │
                        │ Mossy users          │
                        └──────────────────────┘
```

## Privacy Settings Toggle States

```
DISABLED (Default - Maximum Privacy)
┌─────────────────────────────────────┐
│ 📖 Share Script Patterns             │
│ [○═════════════════════════════════] │
│ ℹ️ No sharing (completely private)   │
│ Papyrus patterns stay local only     │
└─────────────────────────────────────┘

ENABLED (User Opts In)
┌─────────────────────────────────────┐
│ 📖 Share Script Patterns             │
│ [═════════════════════════════════●] │
│ ℹ️ Sharing enabled                   │
│ Patterns will be anonymized and      │
│ shared with community when uploaded  │
└─────────────────────────────────────┘

DEPENDENCY NOT MET (Grayed Out)
┌─────────────────────────────────────┐
│ 📖 Share Script Patterns             │
│ [○═════════════════════════════════] │ (disabled/grayed)
│ ℹ️ Requires Knowledge Base enabled    │
│ Enable "Contribute to Knowledge      │
│ Base" first                          │
└─────────────────────────────────────┘
```

## Onboarding Progress Bar

```
STEP 1: WELCOME
[████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 25%

STEP 2: TOOLS
[████████████████████░░░░░░░░░░░░░░░░░░░░] 50%

STEP 3: PRIVACY
[████████████████████████████████░░░░░░░░] 75%

STEP 4: COMPLETE
[████████████████████████████████████████] 100%
```

## Color Scheme

### Onboarding Modal
```
Background:      Slate-900 (#111827)
Border:          Emerald-500 (#10b981) with glow
Header BG:       Slate-800 (#1f2937)
Text Primary:    White (#ffffff)
Text Secondary:  Slate-400 (#9ca3af)
Progress Bar:    Emerald-500 (#10b981)
Buttons:         Emerald-600 hover Emerald-500
```

### Privacy Settings Page
```
Background:      Slate-950 (#030712)
Card BG:         Slate-900 (#111827)
Header BG:       Slate-800 (#1f2937)
Text Primary:    White (#ffffff)
Text Secondary:  Slate-400 (#9ca3af)
Success:         Emerald-400 (#4ade80)
Warning:         Amber-400 (#facc15)
Info:            Blue-400 (#60a5fa)
```

## Icons Used

```
Onboarding:
🔒 Lock (privacy)
📚 BookOpen (learning)
✓ CheckCircle2 (complete)
⚡ Zap (tools)
🛡️ Shield (security)

Privacy Settings:
🔒 Lock (data)
📖 Database (knowledge)
📤 Share2 (sharing)
🛡️ Shield (security)
⚙️ Settings (config)
👁️ Eye (visibility)
❌ X (close/delete)
✓ CheckCircle2 (complete)
```

---

This visual guide shows:
- Complete onboarding flow
- Privacy settings organization
- Sidebar navigation update
- Data storage architecture
- Toggle states
- Progress visualization
- Color and icon references

All visually integrated into the Mossy Pip-Boy aesthetic! 🎨✨
