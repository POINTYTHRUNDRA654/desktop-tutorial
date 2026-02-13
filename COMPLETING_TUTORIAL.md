# Completing the Mossy Comprehensive Tutorial

This guide explains how to complete the tutorial by adding screenshots and finalizing the documentation.

## Quick Start

### Option 1: Automated Screenshot Capture (Recommended)

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **In a new terminal, run the screenshot capture script:**
   ```bash
   npm run capture-screenshots
   ```

3. **Review the captured screenshots:**
   - Check `docs/screenshots/` directory
   - Verify all images are clear and properly captured

4. **Update the tutorial with image references:**
   - Edit `MOSSY_COMPREHENSIVE_TUTORIAL.md`
   - Add image markdown where appropriate (see examples below)

5. **Commit and push:**
   ```bash
   git add docs/screenshots/*.png
   git add MOSSY_COMPREHENSIVE_TUTORIAL.md
   git commit -m "Add tutorial screenshots and image references"
   git push origin copilot/update-tutorial-images
   ```

### Option 2: Manual Screenshot Capture

If the automated script doesn't work for your setup:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to each module** and capture screenshots manually:
   - Use Windows Snipping Tool (`Win + Shift + S`)
   - Or use any screenshot tool
   - Save to `docs/screenshots/` with descriptive names

3. **Follow the naming convention** in `docs/screenshots/README.md`

4. **Update the tutorial** (see "Adding Images to Tutorial" below)

## Adding Images to Tutorial

### Where to Add Screenshots

Add screenshots in these sections of `MOSSY_COMPREHENSIVE_TUTORIAL.md`:

#### 1. Main Interface Overview (around line 97-180)

```markdown
### Sidebar Navigation

The sidebar is your primary navigation tool in Mossy.

![Sidebar Navigation](docs/screenshots/sidebar-navigation.png)
*The sidebar showing all module categories*

**Location:** Left side of the screen
**Toggle:** Click the menu icon (☰) on mobile/small screens
```

#### 2. Core Modules Section (around line 181-280)

```markdown
### 1. The Nexus (Dashboard)

**Path:** `/` (Home)
**Purpose:** Central hub showing all available modules and quick actions

![The Nexus Dashboard](docs/screenshots/nexus-dashboard-overview.png)
*The Nexus displays all modules organized by category with quick access cards*

**Features:**
- Overview of all tools and modules
- Quick access cards for frequent tasks
```

#### 3. Each Module Description

Add a screenshot at the beginning of each major module section:

```markdown
### 2. Chat Interface

**Path:** `/chat`
**Purpose:** Text-based conversation with Mossy AI

![Chat Interface](docs/screenshots/chat-interface.png)
*Chat interface showing conversation history and input area*

**Features:**
- Natural language interaction
```

### Image Reference Format

Use this markdown format:

```markdown
![Alt Text Description](docs/screenshots/filename.png)
*Optional caption in italics*
```

**Example:**
```markdown
![Image Suite Normal Map Generation](docs/screenshots/image-suite-normal-map.png)
*The Image Suite showing normal map generation from a diffuse texture*
```

## Screenshot Checklist

Track your progress using the checklist in `docs/screenshots/README.md`:

### Priority Screenshots (Must Have)

- [ ] `nexus-dashboard-overview.png` - Main dashboard
- [ ] `chat-interface.png` - Chat with AI
- [ ] `auditor-main.png` - Asset analysis tool
- [ ] `image-suite-main.png` - Image processing
- [ ] `workshop-editor.png` - Code editor
- [ ] `settings-general.png` - Settings page
- [ ] `learning-hub-main.png` - Documentation hub

### Secondary Screenshots (Nice to Have)

- [ ] `sidebar-navigation.png` - Full sidebar
- [ ] `pip-boy-theme.png` - Themed interface
- [ ] `avatar-states.png` - AI states
- [ ] `workflow-orchestrator.png` - Workflow builder
- [ ] Module-specific detailed views

## Tutorial Sections Needing Images

### Section 1: Getting Started (Lines 49-94)
- **Recommended:** `onboarding-welcome.png`, `onboarding-complete.png`
- Shows new users what to expect during setup

### Section 2: Main Interface (Lines 95-180)
- **Required:** `sidebar-navigation.png`, `header-bar.png`
- **Optional:** `command-palette.png`, `avatar-states.png`

### Section 3: Core Modules (Lines 181-400+)
- **Required:** One screenshot per major module
- Shows what each module looks like and does

### Section 4: Development Tools (Lines 400-600+)
- **Required:** `workshop-editor.png`, `workflow-orchestrator.png`
- **Optional:** Tool-specific workflow screenshots

### Section 5: Advanced Features (Lines 600-900+)
- **Optional:** Advanced module screenshots
- Workflow examples and complex operations

## Automated Script Details

The `scripts/capture-screenshots.mjs` script:

1. **Launches Playwright** with a headless Chromium browser
2. **Navigates** to each key route in the app
3. **Waits** for page to load and render
4. **Captures** a 1920x1080 screenshot
5. **Saves** to `docs/screenshots/` with descriptive names

### Customizing the Script

Edit `scripts/capture-screenshots.mjs` to:

- Add more routes to capture
- Change viewport size
- Adjust wait times
- Add specific interactions before capture

```javascript
// Example: Add a new screenshot
screenshots.push({
  name: 'my-custom-screenshot',
  path: '/my-route',
  description: 'My custom module',
});
```

## Troubleshooting

### App Won't Start

```bash
# Kill any existing processes on required ports
npm run dev:killports

# Clean install
rm -rf node_modules
npm install

# Try again
npm run dev
```

### Screenshots Are Blank or Loading

The script includes a 2-second wait. If needed, increase it:

```javascript
// In capture-screenshots.mjs
await page.waitForTimeout(5000); // Increase to 5 seconds
```

### Screenshots Missing UI Elements

Ensure the app is fully loaded:

```javascript
// Wait for specific elements
await page.waitForSelector('.main-content', { timeout: 10000 });
```

### Script Fails to Connect

Make sure the dev server is running:

```bash
# Terminal 1
npm run dev

# Terminal 2 (wait for "ready" message, then run)
npm run capture-screenshots
```

## Git Workflow

### Check Status

```bash
git status
```

### Add New Screenshots

```bash
git add docs/screenshots/*.png
```

### Add Updated Tutorial

```bash
git add MOSSY_COMPREHENSIVE_TUTORIAL.md
```

### Commit Changes

```bash
git commit -m "Add comprehensive tutorial screenshots

- Added 20+ screenshots covering all major modules
- Updated tutorial markdown with image references
- Includes dashboard, tools, development, and settings screenshots"
```

### Push to Branch

```bash
git push origin copilot/update-tutorial-images
```

## Quality Guidelines

### Screenshot Quality

- ✅ **Clear and readable** text
- ✅ **1920x1080** or higher resolution
- ✅ **Clean UI** without debug overlays
- ✅ **Realistic data** (not lorem ipsum)
- ❌ **No personal information** or API keys
- ❌ **No browser dev tools** visible
- ❌ **No mouse cursor** in frame

### Documentation Quality

- ✅ Every screenshot has **alt text**
- ✅ Complex screenshots have **captions**
- ✅ Images are **relevant** to the section
- ✅ **Consistent naming** convention
- ❌ Don't add images just to have images
- ❌ Don't use low-quality or blurry images

## Next Steps

After completing screenshots:

1. **Review the full tutorial** with images
2. **Test image links** in a markdown viewer
3. **Create a PR** for review
4. **Share preview** with the team
5. **Deploy updated docs** once approved

## Need Help?

- **Script Issues:** Check the console output for specific errors
- **Git Issues:** See `TROUBLESHOOTING_GIT_PUSH.md`
- **Tutorial Questions:** Review existing module documentation
- **Screenshot Ideas:** See `docs/screenshots/README.md` for full checklist

---

**Ready to complete the tutorial?** Follow Option 1 for the fastest results!
