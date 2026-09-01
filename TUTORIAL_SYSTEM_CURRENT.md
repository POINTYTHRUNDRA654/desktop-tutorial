# Current Tutorial System - OFFICIAL DOCUMENTATION

**Last Updated:** April 12, 2026  
**Status:** ✅ PRODUCTION READY

---

## ⚠️ IMPORTANT: ONLY ONE TUTORIAL SYSTEM EXISTS

There is **ONLY ONE** tutorial system in Mossy:

- ✅ **InteractiveTutorial.tsx** - The ONLY tutorial component (55+ pages)
- ✅ **public/visual-guide-images/** - The ONLY image directory (56 images)
- ✅ **tutorialContext.ts** - The ONLY tutorial content definition (66 pages)

### ❌ OBSOLETE SYSTEMS (REMOVED)

The following have been **PERMANENTLY REMOVED** and must NOT be recreated:

- ❌ `ImageTutorial.tsx` - Old 12-screenshot slideshow (DELETED April 12, 2026)
- ❌ `public/tutorial-images/` - Old 12-screenshot directory (DELETED April 12, 2026)
- ❌ All `TUTORIAL_*.md` documentation for old system (DELETED April 12, 2026)
- ❌ `SCREENSHOT_*.md` guides for old system (DELETED April 12, 2026)

---

## Current System Architecture

### 1. Tutorial Component
**File:** `src/renderer/src/InteractiveTutorial.tsx`
- Main tutorial interface
- Displays 55+ tutorial pages
- Uses visual-guide-images for screenshots
- Integrates with tutorialContext for content

### 2. Tutorial Content
**File:** `src/renderer/src/tutorialContext.ts`
- Defines 66 tutorial pages
- Contains text, features, and metadata for each page
- Maps to visual guide images via generatedImageMap

### 3. Visual Guide Images
**Directory:** `public/visual-guide-images/`
- Contains 56 PNG images (page-1 through page-55, plus extras)
- High-quality screenshots of actual Mossy interface
- Naming convention: `page-N-description.png`

### 4. Image Mapping
**File:** `src/renderer/src/generatedImageMap.ts`
- Auto-generated map of page IDs to image filenames
- Used by InteractiveTutorial to load correct images
- Format: `{ "page-id": "page-N-filename.png" }`

---

## How It Works

### User Experience Flow

1. User clicks tutorial button in UI
2. Event `start-interactive-tutorial` is dispatched
3. `App.tsx` catches event and shows `InteractiveTutorial` component
4. Tutorial displays pages sequentially with:
   - Screenshot from visual-guide-images
   - Text/content from tutorialContext
   - Navigation controls (Next, Previous, Skip)
   - Progress indicator

### Technical Flow

```
TutorialOverlay.tsx (trigger)
    ↓ dispatch('start-interactive-tutorial')
App.tsx (listener)
    ↓ setState({ showInteractiveTutorial: true })
InteractiveTutorial.tsx (display)
    ↓ Load tutorialContext.ts
    ↓ Load generatedImageMap.ts
    ↓ Fetch images from public/visual-guide-images/
    ↓ Render page with content + image
```

---

## File Inventory

### Core Files (DO NOT DELETE)
```
src/renderer/src/InteractiveTutorial.tsx     ✅ Main tutorial component
src/renderer/src/tutorialContext.ts          ✅ Tutorial content
src/renderer/src/generatedImageMap.ts        ✅ Image mapping
src/renderer/src/TutorialOverlay.tsx         ✅ Tutorial launcher
public/visual-guide-images/                  ✅ 56 tutorial images
```

### Support Files
```
scripts/verify-tutorial-images.js            ✅ Verifies all images exist
scripts/verify-tutorial-text-parity.js       ✅ Verifies content matches
scripts/find-missing-tutorial-pages.js       ✅ Finds missing pages
```

### Test Files
```
src/renderer/src/__tests__/InteractiveTutorial.test.tsx
```

---

## Verification Commands

### Check Tutorial System Health
```bash
npm run verify:tutorial-parity
```

This runs both verification scripts:
1. `verify-tutorial-text-parity.js` - Ensures all pages in tutorialContext match visual guide
2. `verify-tutorial-images.js` - Ensures all referenced images exist on disk

### Expected Output
```
All VISUAL_GUIDE page titles match tutorialContext.pageName
All referenced tutorial images exist on disk
```

---

## Adding New Tutorial Pages

### 1. Add Image to visual-guide-images/
```bash
# Place new image in public/visual-guide-images/
public/visual-guide-images/page-56-new-feature.png
```

### 2. Update generatedImageMap.ts
```typescript
export const imageMap = {
  // ... existing mappings
  "new-feature": "page-56-new-feature.png"
};
```

### 3. Add Content to tutorialContext.ts
```typescript
{
  pageId: 'new-feature',
  pageName: 'New Feature',
  routePath: '/new-feature',
  purpose: 'Description of the new feature',
  features: ['Feature 1', 'Feature 2'],
  tutorialSections: [/* ... */],
  suggestedQuestions: [/* ... */]
}
```

### 4. Verify
```bash
npm run verify:tutorial-parity
```

---

## Common Issues & Solutions

### Issue: "No tutorial images found"
**Cause:** Wrong directory or missing images
**Solution:** Ensure images are in `public/visual-guide-images/` (NOT `public/tutorial-images/`)

### Issue: "ImageTutorial not found"
**Cause:** Old tutorial system reference
**Solution:** Use `InteractiveTutorial` instead (ImageTutorial was deleted)

### Issue: "Missing page-X image"
**Cause:** Image referenced in code but not on disk
**Solution:** Add the image to `public/visual-guide-images/` or remove the reference

---

## Statistics

- **Tutorial Pages:** 66 (defined in tutorialContext.ts)
- **Tutorial Images:** 56 (in public/visual-guide-images/)
- **Tutorial Component:** 1 (InteractiveTutorial.tsx)
- **Old Components Removed:** 1 (ImageTutorial.tsx)
- **Old Docs Removed:** 17 (TUTORIAL_*.md, SCREENSHOT_*.md, etc.)

---

## History

### April 12, 2026 - Major Cleanup
- Removed obsolete ImageTutorial.tsx component
- Removed obsolete public/tutorial-images/ directory
- Removed 17 old tutorial documentation files
- Removed old 12-screenshot tutorial system completely
- Verified InteractiveTutorial with 55-page visual guide works correctly

### Prior to April 2026
- InteractiveTutorial system created with 55+ pages
- Visual guide images created (56 PNG files)
- tutorialContext.ts created with comprehensive content
- Old ImageTutorial system coexisted but was unused

---

## Maintainer Notes

### When Adding Features
1. Always add tutorial page to tutorialContext.ts
2. Always add screenshot to visual-guide-images/
3. Always update generatedImageMap.ts
4. Always run verification: `npm run verify:tutorial-parity`

### When Removing Features
1. Remove page from tutorialContext.ts
2. Optionally remove image from visual-guide-images/
3. Update generatedImageMap.ts
4. Run verification

### RED FLAGS 🚩
If you see ANY of these, something is wrong:
- ❌ Reference to `ImageTutorial.tsx`
- ❌ Reference to `public/tutorial-images/`
- ❌ References to `01-welcome.png`, `02-sidebar.png`, etc.
- ❌ Reference to 12-screenshot tutorial
- ❌ `SCREENSHOT_CHECKLIST.md` or similar docs

**Action:** These indicate the old system is being recreated. Stop and remove them immediately.

---

## Contact

For questions about the tutorial system, refer to this document first.
For implementation details, see the source files listed above.

**Remember:** There is ONLY ONE tutorial system. Use InteractiveTutorial.tsx with visual-guide-images.
