# Visual Workflow Diagram

## How the Tutorial System Works

```
┌─────────────────────────────────────────────────────────────────┐
│  YOU (Content Creator)                                          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  1. Launch Mossy: npm run dev                                   │
│  2. Navigate to each page                                       │
│  3. Capture screenshot (Win + Shift + S)                        │
│  4. Save with correct filename                                  │
│                                                                 │
│     [Capture 12 Screenshots]                                    │
│              ↓                                                  │
│     public/tutorial-images/                                     │
│       ├── 01-welcome.png         ← Dashboard                    │
│       ├── 02-sidebar.png         ← Navigation                   │
│       ├── 03-nexus-dashboard.png ← Main hub                     │
│       ├── 04-chat-interface.png  ← Chat                         │
│       ├── 05-live-voice.png      ← Voice                        │
│       ├── 06-auditor.png         ← Analysis                     │
│       ├── 07-image-suite.png     ← Textures                     │
│       ├── 08-workshop.png        ← Editor                       │
│       ├── 09-vault.png           ← Assets                       │
│       ├── 10-bridge.png          ← Tools                        │
│       ├── 11-settings.png        ← Config                       │
│       └── 12-help.png            ← Docs                         │
│                                                                 │
│  5. (Optional) Edit captions.json                               │
│  6. Done! ✓                                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    [Tutorial System]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  AUTOMATIC PROCESSING                                           │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ImageTutorial.tsx:                                             │
│  1. Looks for images in public/tutorial-images/                │
│  2. Checks for 01-welcome.png (or .jpg)                         │
│  3. Checks for 02-sidebar.png (or .jpg)                         │
│  4. ... continues through all 12 ...                            │
│  5. Loads captions.json for descriptions                        │
│  6. Creates slideshow array                                     │
│  7. Ready to display!                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    [User Experience]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  END USER (Newbie Modder)                                       │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  1. Opens Mossy for first time                                  │
│  2. Sees tutorial options:                                      │
│     ┌────────────────────────────────────┐                      │
│     │ [Visual Tutorial (Screenshots)]    │ ← Your images!       │
│     │ [Watch Video Tutorial]             │                      │
│     │ [Interactive Walkthrough]          │                      │
│     └────────────────────────────────────┘                      │
│                                                                 │
│  3. Clicks "Visual Tutorial (Screenshots)"                      │
│  4. Sees beautiful slideshow:                                   │
│     ┌────────────────────────────────────┐                      │
│     │  ┌────────────────────────────┐    │                      │
│     │  │                            │    │                      │
│     │  │   [Your Screenshot Here]   │    │                      │
│     │  │   Full screen, clear view  │    │                      │
│     │  │                            │    │                      │
│     │  └────────────────────────────┘    │                      │
│     │                                    │                      │
│     │  Step 1: Welcome to Mossy          │                      │
│     │  This is the first screen you see  │                      │
│     │  when launching Mossy...           │                      │
│     │                                    │                      │
│     │  ○ ● ○ ○ ○ ○ ○ ○ ○ ○ ○ ○            │                      │
│     │  Step 1 of 12                      │                      │
│     │                                    │                      │
│     │  [Previous]  [Next →]              │                      │
│     └────────────────────────────────────┘                      │
│                                                                 │
│  5. Uses ← → arrow keys to navigate                             │
│  6. Learns the app step-by-step                                 │
│  7. Feels confident using Mossy!                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
desktop-tutorial/
├── TUTORIAL_SYSTEM_READY.md          ← Start here! Quick summary
├── SCREENSHOT_GUIDE_FOR_TUTORIAL.md  ← Detailed instructions
├── SCREENSHOT_CHECKLIST.md           ← Printable checklist
│
├── public/
│   └── tutorial-images/              ← Put screenshots here!
│       ├── README.md                 ← Instructions
│       ├── captions.json             ← Edit descriptions
│       ├── 01-welcome.png            ← You add these
│       ├── 02-sidebar.png            ← You add these
│       ├── 03-nexus-dashboard.png    ← You add these
│       └── ... (12 total)            ← You add these
│
└── src/renderer/src/
    ├── ImageTutorial.tsx             ← Slideshow component (ready!)
    └── TutorialOverlay.tsx           ← Updated with button (ready!)
```

## Naming Convention

```
Format:  [number]-[descriptive-name].[ext]
         └─┬──┘  └────────┬─────────┘ └┬┘
           │              │            └─ Extension (.png or .jpg)
           │              └────────────── Descriptive kebab-case name
           └───────────────────────────── Two-digit number (01-12)

Examples:
  ✓ 01-welcome.png
  ✓ 02-sidebar.png
  ✓ 03-nexus-dashboard.png
  ✓ 12-help.jpg
  
  ✗ 1-welcome.png         (wrong: need 01 not 1)
  ✗ 01_welcome.png        (wrong: use dash not underscore)
  ✗ 01-Welcome.png        (wrong: use lowercase)
  ✗ welcome-01.png        (wrong: number comes first)
```

## Caption Format

```json
{
  "01-welcome.png": {
    "title": "Short Title Here",
    "description": "Longer description explaining what users see..."
  }
}
```

## Testing Workflow

```
1. Add screenshots → public/tutorial-images/01-welcome.png, etc.
2. Start dev server → npm run dev
3. Open tutorial → Click "Visual Tutorial (Screenshots)"
4. Navigate slides → Use arrow keys ← →
5. Verify display → Check all images load correctly
6. Done! ✓
```

## If Something Goes Wrong

```
Problem: Images don't load
└─ Check filename spelling (exact match required)
└─ Check file location (must be in public/tutorial-images/)
└─ Check file extension (.png or .jpg)
└─ Try hard refresh (Ctrl+Shift+R)

Problem: Captions don't show
└─ Check captions.json syntax (valid JSON)
└─ Check filename keys match image filenames
└─ Auto-generated titles work as fallback

Problem: Wrong order
└─ Check number prefixes (01, 02, 03... not 1, 2, 3)
└─ Files load in filename sort order
```

## What You Get

```
Before (no screenshots):
  Tutorial shows helpful message:
  "No images found. Here's how to add them..."

After (with screenshots):
  Beautiful slideshow with:
  ✓ Full-screen images
  ✓ Clear captions
  ✓ Progress indicators
  ✓ Keyboard navigation
  ✓ Professional appearance
  ✓ Newbie-friendly experience
```

---

**Ready?** Start with SCREENSHOT_CHECKLIST.md and begin capturing! 📸
