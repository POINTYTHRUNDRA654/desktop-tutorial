# Tool Extensions User Guide

This guide shows how to use the MO2, xEdit, Creation Kit, ComfyUI, and Upscayl extensions in Mossy.

---

## Quick Start

All five extensions are located in the sidebar under "Tool Extensions":
- 📦 MO2 Extension
- 🗄️ xEdit Extension  
- 🔧 CK Extension
- 🌐 ComfyUI Extension
- 🔍 Upscayl Extension

Each extension **automatically activates** when Neural Link detects the tool running.

---

## 1. MO2 Extension

### What It Does
Integrates with Mod Organizer 2 to show your mod list, load order, and detect conflicts.

### How to Use

**Step 1: Start MO2**
```
Launch Mod Organizer 2 normally
```

**Step 2: Open Extension**
```
Mossy → Sidebar → MO2 Extension
```

**Step 3: View Your Mods**
- See all installed mods
- Green dot = enabled
- Gray dot = disabled
- ⚠️ icon = has conflicts

### Features

**Mod List:**
- Search by name
- Filter by enabled/disabled/all
- See priority order
- View categories and versions

**Load Order:**
- Complete plugin list
- ESM/ESP indicators
- Load index numbers

**Quick Actions:**
- Launch Game - Start Fallout 4 through MO2
- Configure - Open settings
- View Logs - Check recent activity
- Export List - Save mod list to file

**Statistics:**
- Active mods count
- Total plugins
- Detected conflicts

### Example Workflow

```
1. Start MO2
2. Open MO2 Extension in Mossy
3. Check statistics (23/45 mods active)
4. Search for "weapons" to find weapon mods
5. Filter to "Enabled Only"
6. Check load order
7. Click "Launch Game"
```

---

## 2. xEdit Extension

### What It Does
Provides quick access to common xEdit scripts for cleaning, analysis, and batch operations.

### How to Use

**Step 1: Start xEdit**
```
Launch FO4Edit, SSEEdit, or any xEdit variant
```

**Step 2: Open Extension**
```
Mossy → Sidebar → xEdit Extension
```

**Step 3: Run Scripts**
- Browse available scripts
- Click a script card to run it
- Watch real-time output

### Available Scripts

**Cleaning (Green):**
- Clean Masters - Remove dirty edits and ITMs
- Remove ITMs - Remove Identical To Master records
- Undelete References - Fix deleted references

**Batch Operations (Blue):**
- Batch Rename Records - Rename multiple records at once

**Analysis (Purple):**
- Export Cell Data - Export cell info to CSV
- Conflict Analysis - Find record conflicts

**Conversion (Cyan):**
- ESM to ESP - Convert master to plugin
- ESP to ESM - Convert plugin to master

### Features

**Script Execution:**
- One-click running
- Real-time terminal output
- Success/error status
- Estimated time display

**Quick Operations:**
- Quick Clean - Fast master cleaning
- Find Conflicts - Instant conflict check
- Custom Script - Load your own
- Script Editor - Edit existing scripts

**Search & Filter:**
- Search by script name
- Filter by category
- Category badges

### Example Workflow

```
1. Start FO4Edit
2. Load your mod plugin
3. Open xEdit Extension in Mossy
4. Click "Clean Masters" script
5. Watch output terminal
6. See "Success" message
7. Close FO4Edit and save
```

---

## 3. Creation Kit Extension

### What It Does
Adds auto-save, script compilation queue, and productivity tools to Creation Kit.

### How to Use

**Step 1: Start CK**
```
Launch CreationKit.exe
```

**Step 2: Open Extension**
```
Mossy → Sidebar → CK Extension
```

**Step 3: Enable Auto-Save**
- Toggle auto-save ON
- Choose interval (3, 5, 10, or 15 minutes)

### Features

**Auto-Save System:**
- Configurable intervals
- Last save timestamp
- Background operation
- Activity logging

**Script Compilation:**
- View recent Papyrus scripts
- One-click compile
- Batch compile all uncompiled
- Queue management
- Error reporting

**Activity Log:**
- Real-time event tracking
- Timestamps
- Success/error messages
- Last 10 entries shown

**Active Cell Tracking:**
- Shows current worldspace
- Cell name display

### Quick Actions

- **Save Now** - Force immediate save
- **View Logs** - Open log files
- **Script Editor** - Edit Papyrus scripts
- **Settings** - Configure extension

### Example Workflow

```
1. Start Creation Kit
2. Load your mod
3. Open CK Extension in Mossy
4. Enable auto-save (5 min interval)
5. Edit cells/scripts in CK
6. Extension auto-saves every 5 minutes
7. Compile scripts from extension
8. View compilation status
9. Check activity log
```

---

## Detection Status

All extensions show connection status in the top-right:

**🟢 Connected** (Green)
```
Tool is running and detected
Extension is active
```

**🔴 Not Connected** (Gray)
```
Tool is not running
Extension is waiting
Start the tool to activate
```

### What Neural Link Detects

**MO2:**
- ModOrganizer.exe
- mo2.exe
- Mod Organizer 2.exe

**xEdit:**
- FO4Edit.exe
- SSEEdit.exe
- TES5Edit.exe
- FNVEdit.exe
- FO3Edit.exe

**Creation Kit:**
- CreationKit.exe
- CK.exe

Detection updates every 5 seconds automatically.

---

## Tips & Best Practices

### MO2 Extension

✅ **Do:**
- Keep MO2 running while using extension
- Check conflicts before launching
- Export mod list for backup
- Use search to find specific mods

❌ **Don't:**
- Close MO2 while extension is open
- Modify load order externally
- Enable too many conflicting mods

### xEdit Extension

✅ **Do:**
- Backup plugins before cleaning
- Read script descriptions
- Watch output for errors
- Run conflict analysis before release

❌ **Don't:**
- Clean master files without backup
- Run scripts on vanilla files
- Interrupt running scripts
- Clean mods you don't own

### CK Extension

✅ **Do:**
- Enable auto-save immediately
- Choose 5-10 min intervals
- Compile scripts regularly
- Check activity log for errors

❌ **Don't:**
- Disable auto-save
- Ignore compilation errors
- Leave CK open indefinitely
- Skip error messages

---

## Troubleshooting

### Extension Not Activating

**Problem:** "Tool Not Detected" message

**Solutions:**
1. Make sure tool is actually running
2. Check Task Manager for process
3. Wait 5 seconds for auto-detection
4. Restart tool if needed

### MO2 Not Showing Mods

**Problem:** Mod list is empty

**Solutions:**
1. Verify MO2 is running
2. Check active profile
3. Reload MO2
4. Click "Refresh" button

### xEdit Scripts Not Running

**Problem:** Script execution fails

**Solutions:**
1. Ensure xEdit has plugin loaded
2. Check output for errors
3. Try different script
4. Restart xEdit

### CK Auto-Save Not Working

**Problem:** No auto-saves happening

**Solutions:**
1. Toggle auto-save OFF then ON
2. Check interval setting
3. Verify CK is running
4. Look for save confirmation in log

---

## Advanced Features

### MO2: Export Mod List

```
1. Open MO2 Extension
2. Click "Export List"
3. Choose save location
4. Share with other modders
```

### xEdit: Custom Scripts

```
1. Open xEdit Extension
2. Click "Custom Script"
3. Browse to your .pas file
4. Run script
```

### CK: Batch Compilation

```
1. Open CK Extension
2. See list of uncompiled scripts
3. Click "Compile All Uncompiled"
4. Wait for queue to finish
```

---

## Keyboard Shortcuts

Coming soon! Will add hotkeys for:
- Quick save (CK)
- Run last script (xEdit)
- Refresh data (MO2)

---

## FAQ

**Q: Do I need all three tools running?**
A: No, each extension works independently.

**Q: Can I use extensions without Neural Link?**
A: Yes, but auto-detection won't work. Features still available.

**Q: Are my files safe?**
A: Extensions don't modify files directly. Always backup first.

**Q: Can I add custom scripts to xEdit?**
A: Future feature! Currently has 8 built-in scripts.

**Q: Does auto-save replace CK's auto-save?**
A: No, it's additional protection. Keep CK's built-in save too.

**Q: What if my tool crashes?**
A: Extensions are read-only. They won't cause crashes.

---

## Need Help?

- Click "Help" button in any extension
- Visit /reference in Mossy
- Check Neural Link for tool status
- Review activity logs

---

## Summary

All three extensions:
- ✅ Auto-detect when tools run
- ✅ Provide useful features
- ✅ Safe and non-invasive
- ✅ Easy to use
- ✅ Professional UI

**Start using:** Just run your tool and open the extension!

---

## 4. ComfyUI Extension

### What It Does
Provides quick access to ComfyUI's node-based AI image generation with pre-built workflows.

### How to Use

**Step 1: Start ComfyUI**
```
Launch ComfyUI (default: http://127.0.0.1:8188)
```

**Step 2: Open Extension**
```
Mossy → Sidebar → ComfyUI Extension
```

**Step 3: Generate Images**
- Select a model
- Enter your prompt
- Click "Generate Image"

### Features

**Quick Generate:**
- Model selector (SDXL, SD1.5, custom models)
- Prompt input
- Negative prompt
- One-click generation

**Workflow Library:**
- Text to Image (Basic)
- Text to Image (Advanced)
- Image to Image
- 4x Upscale
- ControlNet Pose

**Generation Queue:**
- Real-time progress tracking
- Multiple generations at once
- Status indicators
- Download generated images

**Quick Actions:**
- Open Output - View saved images
- Refresh Models - Reload model list
- Batch Export - Export all generated images
- Settings - Configure ComfyUI connection

### Example Workflow

```
1. Start ComfyUI
2. Open ComfyUI Extension in Mossy
3. Select "sd_xl_base_1.0.safetensors"
4. Enter prompt: "detailed fallout 4 armor texture, weathered metal"
5. Enter negative: "blurry, low quality"
6. Click "Generate Image"
7. Watch progress bar (25% → 50% → 75% → 100%)
8. View generated image
9. Click download icon
```

### Use Cases

**For Modders:**
- Generate concept art for mods
- Create texture variations
- Test different styles quickly
- Generate reference images
- Create promotional art

**Workflow Categories:**
- **txt2img**: Create new images from text
- **img2img**: Transform existing images
- **upscale**: Enhance resolution
- **controlnet**: Guided generation

---

## 5. Upscayl Extension

### What It Does
AI-powered image upscaling specifically for textures and game assets.

### How to Use

**Step 1: Start Upscayl**
```
Launch Upscayl.exe
```

**Step 2: Open Extension**
```
Mossy → Sidebar → Upscayl Extension
```

**Step 3: Configure and Upscale**
- Select AI model
- Choose scale factor (2x, 3x, 4x)
- Pick output format
- Start upscaling

### Features

**Model Selection:**
- RealESRGAN x4plus - Best for general images
- RealESRGAN Anime - Optimized for anime/manga
- Remacri - High quality for photos
- Ultramix Balanced - Works for all content

**Scale Options:**
- 2x - Double resolution
- 3x - Triple resolution  
- 4x - Quadruple resolution

**Output Formats:**
- PNG - Lossless quality
- JPG - Smaller file size
- WebP - Modern compression

**Batch Processing:**
- Enable batch mode
- Process multiple images
- Same settings for all
- Track individual progress

**Processing Queue:**
- Real-time status
- Progress bars
- Completion notifications
- Error handling

### Example Workflow

```
1. Start Upscayl
2. Open Upscayl Extension in Mossy
3. Select "RealESRGAN x4plus" model
4. Choose 4x scale
5. Select PNG format
6. Enable batch mode
7. Click "Start Upscaling"
8. Watch processing queue:
   - texture_diffuse.png (Processing: 50%)
   - texture_normal.png (Queued)
   - texture_specular.png (Queued)
9. Download upscaled textures
```

### Use Cases

**For Texture Artists:**
- Upscale low-res textures to 4K
- Enhance old mod textures
- Prepare assets for high-res texture packs
- Convert 1K textures to 4K
- Batch process entire texture sets

**Model Recommendations:**
- **Fallout 4 textures**: RealESRGAN x4plus or Remacri
- **Character faces**: RealESRGAN x4plus
- **Anime-style mods**: RealESRGAN Anime
- **Mixed content**: Ultramix Balanced

### Output Preview

Shows calculated output size:
```
Original:  1024 × 1024
Upscaled:  4096 × 4096 (at 4x)
Format:    PNG
```

### Quick Actions

- **Open Output** - View upscaled images
- **Batch Upload** - Select multiple images
- **Export All** - Download all results
- **Settings** - Configure Upscayl

---

## Detection Status (Updated)

All five extensions show connection status:

### What Neural Link Detects

**ComfyUI:**
- ComfyUI.exe
- comfyui.exe
- python.exe (with ComfyUI in path)

**Upscayl:**
- Upscayl.exe
- upscayl.exe

Detection updates every 5 seconds automatically.

---

## Tips & Best Practices (Updated)

### ComfyUI Extension

✅ **Do:**
- Start with pre-built workflows
- Use descriptive prompts
- Experiment with different models
- Save good prompts for reuse
- Use negative prompts to avoid issues

❌ **Don't:**
- Generate copyrighted content
- Use extremely long prompts
- Run too many simultaneous generations
- Ignore model compatibility

### Upscayl Extension

✅ **Do:**
- Backup originals before upscaling
- Test with single image first
- Choose model based on content type
- Use PNG for quality preservation
- Batch similar content together

❌ **Don't:**
- Upscale already high-res images
- Mix different content types in batch
- Use JPG for textures (lossy)
- Upscale more than 4x (diminishing returns)

---

## Troubleshooting (Updated)

### ComfyUI Not Detected

**Problem:** Extension shows "Not Running"

**Solutions:**
1. Verify ComfyUI is actually running
2. Check http://127.0.0.1:8188 in browser
3. Wait 5 seconds for detection
4. Restart ComfyUI if needed

### Upscayl Not Processing

**Problem:** Upscaling stuck at 0%

**Solutions:**
1. Check Upscayl is running
2. Verify file path is accessible
3. Try different model
4. Restart Upscayl

### ComfyUI Generation Fails

**Problem:** Images not generating

**Solutions:**
1. Check model is loaded in ComfyUI
2. Verify prompt isn't empty
3. Check ComfyUI console for errors
4. Try simpler workflow

---

## Comparison Table

| Extension | Primary Use | Speed | Best For |
|-----------|-------------|-------|----------|
| MO2 | Mod Management | N/A | Load order, conflicts |
| xEdit | Plugin Cleaning | Fast | ITM removal, conflicts |
| CK | Level Design | N/A | Auto-save, compilation |
| ComfyUI | Image Generation | Slow | Concept art, textures |
| Upscayl | Image Upscaling | Medium | Texture enhancement |

---

## Summary

All five extensions:
- ✅ Auto-detect when tools run
- ✅ Provide useful features
- ✅ Safe and non-invasive
- ✅ Easy to use
- ✅ Professional UI

**New AI Tools:**
- **ComfyUI**: Generate new images with AI
- **Upscayl**: Enhance existing images with AI

**Start using:** Just run your tool and open the extension!
