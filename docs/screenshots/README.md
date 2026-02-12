# Screenshots Directory

This directory contains screenshots for the Mossy Comprehensive Tutorial.

## 📝 Status: Placeholder Screenshots Created

**Current State:** 9 placeholder screenshots have been created to allow the tutorial to be published with image references. These are temporary placeholders that should be replaced with actual application screenshots.

**Placeholders Created:**
- ✅ Main interface screenshots (dashboard, sidebar, chat)
- ✅ Core tool screenshots (Image Suite, Auditor, Workshop)
- ✅ Settings and Learning Hub screenshots

**To Replace Placeholders:**
Run the automated screenshot capture script when the app is available:
```bash
npm run capture-screenshots
```

Or manually capture screenshots following the guidelines below.

---

## How to Add Screenshots

### Capturing Screenshots

1. **Launch Mossy** in development mode:
   ```bash
   npm run dev
   ```

2. **Navigate to each page/module** that needs a screenshot

3. **Capture the screenshot**:
   - Windows: Press `Win + Shift + S` (Snipping Tool)
   - Or use the built-in screenshot tool
   - Or press `PrtScn` and paste into an image editor

4. **Save the screenshot** to this directory with a descriptive name

### Naming Convention

Use the following naming pattern:

```
[module-name]-[description].png
```

Examples:
- `nexus-dashboard-overview.png`
- `chat-interface-conversation.png`
- `live-voice-listening.png`
- `image-suite-normal-map.png`
- `auditor-esp-analysis.png`
- `workshop-code-editor.png`
- `vault-file-browser.png`
- `scribe-text-editor.png`
- `holodeck-game-launch.png`
- `bridge-tool-detection.png`
- `settings-general.png`
- `learning-hub-guides.png`

## Required Screenshots

### Core Modules
- [x] `nexus-dashboard-overview.png` - The Nexus main dashboard (PLACEHOLDER)
- [x] `chat-interface.png` - Chat with message history (PLACEHOLDER)
- [x] `live-voice-listening.png` - Voice chat in listening mode (PLACEHOLDER)
- [ ] `live-voice-speaking.png` - Voice chat with Mossy speaking
- [x] `image-suite-main.png` - Image Suite main interface (PLACEHOLDER)
- [ ] `image-suite-normal-map.png` - Normal map generation
- [x] `auditor-main.png` - Asset analysis main interface (PLACEHOLDER)
- [ ] `auditor-esp-analysis.png` - ESP file analysis results
- [ ] `auditor-nif-validation.png` - NIF file validation
- [x] `workshop-editor.png` - Workshop code editor (PLACEHOLDER)
- [ ] `workshop-snippets.png` - Code snippets panel
- [ ] `vault-browser.png` - The Vault file browser
- [ ] `scribe-editor.png` - The Scribe text editor
- [ ] `holodeck-launch.png` - Holodeck game launch interface
- [ ] `bridge-tools.png` - Desktop Bridge tool detection
- [x] `settings-general.png` - General settings page (PLACEHOLDER)
- [ ] `settings-ai.png` - AI & Voice settings
- [ ] `settings-tools.png` - Tools & Paths settings
- [ ] `settings-privacy.png` - Privacy settings
- [x] `learning-hub-main.png` - Learning Hub overview (PLACEHOLDER)

### Development Tools
- [ ] `workflow-orchestrator.png` - Workflow builder
- [ ] `workflow-recorder.png` - Workflow recording interface
- [ ] `ba2-manager.png` - BA2 archive manager
- [ ] `mining-dashboard.png` - Mining Dashboard analysis
- [ ] `plugin-manager.png` - Plugin Manager interface

### Guides
- [ ] `guide-blender-animation.png` - Blender Animation Guide
- [ ] `guide-quest-authoring.png` - Quest Mod Authoring Guide
- [ ] `guide-paperscript.png` - PaperScript Guide
- [ ] `guide-bodyslide.png` - BodySlide Guide
- [ ] `guide-sim-settlements.png` - Sim Settlements Guide

### UI Elements
- [x] `sidebar-navigation.png` - Sidebar with all sections (PLACEHOLDER)
- [ ] `header-bar.png` - Top header with all components
- [ ] `pip-boy-theme.png` - Pip-Boy themed interface
- [ ] `command-palette.png` - Command palette (Ctrl+K)
- [ ] `avatar-states.png` - Avatar core in different states
- [ ] `project-selector.png` - Project selector dropdown

### Onboarding
- [ ] `onboarding-welcome.png` - Welcome screen
- [ ] `onboarding-system-scan.png` - System scan results
- [ ] `onboarding-tool-approval.png` - Tool approval screen
- [ ] `onboarding-privacy.png` - Privacy settings
- [ ] `onboarding-complete.png` - Setup complete screen

## Screenshot Guidelines

### Image Format
- **Format:** PNG (preferred) or JPG
- **Size:** Capture at 1920x1080 or higher
- **Compression:** Use lossless compression for PNG

### Content Guidelines
- Show the full window with the module/page in focus
- Ensure UI is clean and uncluttered
- Use realistic sample data (avoid test/placeholder content)
- Hide any personal information or API keys
- Use light or normal themes (not debug/dev mode unless showing dev features)

### Quality
- Screenshots should be clear and readable
- Text should be legible
- Colors should be accurate
- No visual artifacts or blur

## Integration with Tutorial

After adding screenshots, update the tutorial document:

1. Open `MOSSY_COMPREHENSIVE_TUTORIAL.md`
2. Add image references where appropriate:
   ```markdown
   ![The Nexus Dashboard](docs/screenshots/nexus-dashboard-overview.png)
   ```
3. Ensure the image path is correct relative to the tutorial file
4. Add alt text for accessibility

## Example Screenshot Section

```markdown
### The Nexus (Dashboard)

**Path:** `/` (Home)  
**Purpose:** Central hub showing all available modules

![The Nexus Dashboard](docs/screenshots/nexus-dashboard-overview.png)
*The Nexus shows all available modules organized by category*

**Features:**
- Overview of all tools and modules
- Quick access cards for frequent tasks
- System status indicators
```

## Automated Screenshot Generation

For developers: Consider using Playwright or Puppeteer to automate screenshot capture:

```javascript
// Example using Playwright
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5174/#/');
  await page.screenshot({ path: 'docs/screenshots/nexus-dashboard-overview.png' });
  await browser.close();
})();
```

## Notes

- Screenshots should be updated when UI changes significantly
- Keep original high-resolution screenshots as backups
- Annotated screenshots (with arrows, labels) should be in a separate `annotated/` subfolder
- Dark theme screenshots should be in `dark-theme/` subfolder if providing both themes

## Contributing

When contributing screenshots:
1. Follow the naming convention
2. Ensure screenshots are clear and professional
3. Update the checklist above as you add images
4. Submit a PR with the new screenshots

---

**Need Help?** Contact the documentation team or open an issue on GitHub.
