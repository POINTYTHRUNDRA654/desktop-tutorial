# Tutorial Images Directory

This directory contains screenshot images for the visual tutorial.

## Current Status
📋 **Waiting for screenshots** - No images have been added yet.

## Quick Start

1. See `SCREENSHOT_GUIDE_FOR_TUTORIAL.md` in the root directory for detailed instructions
2. Capture screenshots of each page (12 screenshots total)
3. Place them in this directory with these exact names:
   - `01-welcome.png`
   - `02-sidebar.png`
   - `03-nexus-dashboard.png`
   - `04-chat-interface.png`
   - `05-live-voice.png`
   - `06-auditor.png`
   - `07-image-suite.png`
   - `08-workshop.png`
   - `09-vault.png`
   - `10-bridge.png`
   - `11-settings.png`
   - `12-help.png`

4. (Optional) Edit `captions.json` to customize the title and description for each slide

## Captions File

The `captions.json` file contains the title and description text for each screenshot. You can edit this file to customize what users see on each slide.

Example:
```json
{
  "01-welcome.png": {
    "title": "Welcome to Mossy",
    "description": "Your description here..."
  }
}
```

## Image Requirements

- **Format:** PNG or JPG
- **Resolution:** 1920x1080 or higher recommended
- **Aspect Ratio:** 16:9 preferred
- **Quality:** Clear, readable text; no blur or artifacts

## Testing

After adding images, test the tutorial by:
1. Starting the dev server: `npm run dev`
2. Opening the tutorial from the app
3. Verifying all images load correctly

## Need Help?

See the root-level `SCREENSHOT_GUIDE_FOR_TUTORIAL.md` for step-by-step instructions.
