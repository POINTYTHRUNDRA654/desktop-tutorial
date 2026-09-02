# Fallout 4 Advanced AI - Build Guide for Nexus Release

This guide walks you through building a complete Nexus-ready release package from source.

## Prerequisites

### Software Required
- **Python 3.12+** (installed ✅)
- **Creation Kit** (for compiling Papyrus scripts and creating plugin)
- **PyInstaller** (will be installed automatically if needed)
- **Internet connection** (for downloading voice models)

### Time Estimate
- **First time:** 2-4 hours (includes Creation Kit setup)
- **Subsequent builds:** 15-30 minutes

---

## Step-by-Step Build Process

### Step 1: Set Up Staging Directory Structure

Run the staging setup script:

```bash
python tools/setup_staging_directory.py
```

This creates the `release_staging/core/` directory structure with helpful README files in each folder.

**What it does:**
- Creates `release_staging/core/Data/` structure
- Creates `release_staging/core/Data/Scripts/` for compiled scripts
- Creates `release_staging/core/Data/F4AI/` for runtime files
- Copies template files (config.json, batch scripts, user docs)
- Shows checklist of missing files

---

### Step 2: Create Plugin File (F4AI_Core.esp)

You need to create the Fallout 4 plugin file using Creation Kit.

#### Option A: Quick Empty Plugin (For Testing)
1. Open Creation Kit
2. **File > New**
3. Save as `F4AI_Core.esp`
4. Copy to `release_staging/core/Data/F4AI_Core.esp`

#### Option B: Full Plugin with Forms
1. Open Creation Kit
2. **File > New**
3. Add required forms:
   - Quests for AI integration hooks
   - Global variables for configuration
   - Message boxes for user feedback
4. Save as `F4AI_Core.esp`
5. Copy to `release_staging/core/Data/F4AI_Core.esp`

**Location:** `release_staging/core/Data/F4AI_Core.esp`

---

### Step 3: Compile Papyrus Scripts

You need to compile 5 Papyrus source scripts to `.pex` format.

#### Using Creation Kit Papyrus Compiler:

1. **Open Creation Kit**
2. **Load F4AI_Core.esp** (the plugin you created in Step 2)
3. **Go to Gameplay > Papyrus Script Manager**
4. **For each script in `papyrus/` folder:**
   - Click **"Compile"** or **"Compile All"**
   - Or manually compile each:
	 - `F4AI_QueueManager.psc` → `F4AI_QueueManager.pex`
	 - `F4AI_FeedbackMonitor.psc` → `F4AI_FeedbackMonitor.pex`
	 - `F4AI_PushToTalkTrigger.psc` → `F4AI_PushToTalkTrigger.pex`
	 - `F4AI_VisionWidgetManager.psc` → `F4AI_VisionWidgetManager.pex`
	 - `F4AI_InterNpcManager.psc` → `F4AI_InterNpcManager.pex`

5. **Copy compiled `.pex` files** from Creation Kit output folder to:
   ```
   release_staging/core/Data/Scripts/
   ```

#### Alternative: Command-Line Compiler (Papyrus Compiler)

If you have the standalone Papyrus compiler:

```bash
# Navigate to Fallout 4 directory
cd "C:\Program Files (x86)\Steam\steamapps\common\Fallout 4"

# Compile each script
PapyrusCompiler.exe "D:\Fallout 4 Advanced AI\papyrus\F4AI_QueueManager.psc" -output="D:\Fallout 4 Advanced AI\release_staging\core\Data\Scripts"
```

Repeat for all 5 scripts.

**Target location:** `release_staging/core/Data/Scripts/*.pex`

---

### Step 4: Build Python Executable

Run the automated build script:

```bash
python tools/build_engine_executable.py
```

**What it does:**
- Checks if PyInstaller is installed (installs if needed)
- Compiles `src/main.py` into `Fallout4_AI_Engine.exe`
- Creates single-file executable with no console window
- Automatically copies to `release_staging/core/Data/F4AI/`

**Expected output:**
```
[build-engine] ✅ Build successful: build_output/Fallout4_AI_Engine.exe
[build-engine] ✅ Copied to staging: release_staging/core/Data/F4AI/Fallout4_AI_Engine.exe
[build-engine] ✅ Build complete and staged for release!
```

**Manual alternative (if script fails):**
```bash
pip install pyinstaller
pyinstaller --onefile --noconsole --name Fallout4_AI_Engine src/main.py
# Then manually copy dist/Fallout4_AI_Engine.exe to release_staging/core/Data/F4AI/
```

**Target location:** `release_staging/core/Data/F4AI/Fallout4_AI_Engine.exe`

---

### Step 5: Download Voice Models

Download Piper voice models from GitHub:

**Direct link:** https://github.com/rhasspy/piper/releases/

1. **Find the latest release**
2. **Download these files:**
   - `en_US-lessac-medium.onnx`
   - `en_US-lessac-medium.onnx.json`

3. **Copy both files to:**
   ```
   release_staging/core/Data/F4AI/
   ```

**Alternative voices (optional):**
- `en_US-amy-medium` (female voice)
- `en_US-ryan-medium` (male voice)
- Any other Piper voice model

**File sizes:**
- `.onnx` file: ~50-60 MB
- `.onnx.json` file: ~1 KB (config)

---

### Step 6: Verify All Files Present

Run the staging setup script again to check status:

```bash
python tools/setup_staging_directory.py
```

Look for the checklist at the end. All required files should show as present.

**Manual verification:**
```bash
# Windows PowerShell
Get-ChildItem -Path "release_staging\core" -Recurse | Where-Object { -not $_.PSIsContainer } | Select-Object FullName
```

**Required files checklist:**
```
✅ release_staging/core/Data/F4AI_Core.esp
✅ release_staging/core/Data/Scripts/F4AI_QueueManager.pex
✅ release_staging/core/Data/Scripts/F4AI_FeedbackMonitor.pex
✅ release_staging/core/Data/Scripts/F4AI_PushToTalkTrigger.pex
✅ release_staging/core/Data/Scripts/F4AI_VisionWidgetManager.pex
✅ release_staging/core/Data/Scripts/F4AI_InterNpcManager.pex
✅ release_staging/core/Data/F4AI/Fallout4_AI_Engine.exe
✅ release_staging/core/Data/F4AI/en_US-lessac-medium.onnx
✅ release_staging/core/Data/F4AI/en_US-lessac-medium.onnx.json
✅ release_staging/core/Data/F4AI/config.json
✅ release_staging/core/Data/F4AI/Launch_F4AI_Bridge.bat
✅ release_staging/core/Data/F4AI/FIRST_RUN.txt
✅ release_staging/core/Data/F4AI/NEXUS_TROUBLESHOOTING.txt
```

---

### Step 7: Build Nexus Release Package

Once all files are in place, build the final Nexus archive:

```bash
python tools/build_nexus_release.py --channel alpha
```

**What it does:**
- Validates all required files are present
- Creates FOMOD installer structure
- Updates version in FOMOD info.xml
- Generates `release_manifest.json`
- Creates ZIP archive ready for Nexus upload

**Expected output:**
```
[release-builder] Build complete:
  - dist/nexus/F4AI_Advanced_System_v0.1.0-Alpha.3_Core_FOMOD.zip
```

**Output location:** `dist/nexus/F4AI_Advanced_System_v0.1.0-Alpha.3_Core_FOMOD.zip`

---

## Step 8: Test the Release Package

### Test 1: Extract and Verify
```bash
# Extract the ZIP
Expand-Archive -Path "dist/nexus/F4AI_Advanced_System_v0.1.0-Alpha.3_Core_FOMOD.zip" -DestinationPath "test_extract"

# Verify structure
Get-ChildItem -Path "test_extract" -Recurse
```

**Expected structure:**
```
test_extract/
├── fomod/
│   ├── info.xml
│   └── ModuleConfig.xml
└── 00 Core/
	└── Data/
		├── F4AI_Core.esp
		├── Scripts/
		│   └── *.pex (5 files)
		└── F4AI/
			├── Fallout4_AI_Engine.exe
			├── config.json
			├── Launch_F4AI_Bridge.bat
			├── *.onnx (2 files)
			├── FIRST_RUN.txt
			└── NEXUS_TROUBLESHOOTING.txt
```

### Test 2: Mod Manager Installation

#### Mod Organizer 2:
1. Create new clean profile
2. Click "Install a new mod from an archive"
3. Select the built ZIP file
4. FOMOD installer should appear
5. Select "Recommended - Core Runtime"
6. Verify files appear in MO2 data structure
7. Enable the mod
8. Check `F4AI_Core.esp` is in plugins list

#### Vortex:
1. Create new clean profile
2. Click "Install From File"
3. Select the built ZIP file
4. FOMOD installer should appear
5. Select "Recommended - Core Runtime"
6. Deploy mods
7. Verify files in Fallout 4 Data folder

### Test 3: Functional Smoke Test

**Prerequisites:**
- KoboldCPP running on localhost:5001
- GGUF model loaded
- F4SE installed
- Fallout 4 installed

**Steps:**
1. **Launch bridge:**
   ```
   Data/F4AI/Launch_F4AI_Bridge.bat
   ```
   Should minimize and run in background.

2. **Launch Fallout 4:**
   - Use F4SE launcher
   - Load a save or start new game

3. **Interact with NPC:**
   - Talk to any NPC (Codsworth, Preston, etc.)
   - Check for generated subtitles
   - Listen for voice synthesis

4. **Check logs:**
   - Look for `bridge_output.json` in `Data/F4AI/`
   - Check for errors in bridge console (if visible)

**Success criteria:**
- Bridge starts without errors
- Game loads with plugin enabled
- NPC dialogue generates
- Audio files created
- No crashes

---

## Troubleshooting

### PyInstaller Build Fails
**Error:** `ModuleNotFoundError` during build

**Solution:**
```bash
# Install missing dependencies
pip install -r requirements.txt

# Try build again
python tools/build_engine_executable.py
```

### Creation Kit Script Compilation Fails
**Error:** "Cannot find script source"

**Solution:**
1. Check `papyrus/` folder contains `.psc` files
2. Verify Creation Kit script source paths in settings
3. Copy `.psc` files to `Data/Scripts/Source/User/`
4. Try compiling again

### Voice Models Not Working
**Error:** "Voice model not found" in bridge logs

**Solution:**
1. Verify `.onnx` and `.onnx.json` files are in `Data/F4AI/`
2. Check file names match exactly (case-sensitive on some systems)
3. Try downloading models again
4. Check file sizes (`.onnx` should be 50-60MB)

### Build Script Says Files Missing
**Error:** "Missing required core files"

**Solution:**
```bash
# Run staging setup to see checklist
python tools/setup_staging_directory.py

# Check which files are missing
# Follow steps above to create/copy missing files
```

### Executable Too Large
**Issue:** `Fallout4_AI_Engine.exe` is >200MB

**Solution:**
- This is normal! PyInstaller bundles Python runtime and dependencies
- Expected size: 50-150MB depending on dependencies
- To reduce size, use `--onedir` instead of `--onefile` (but creates folder structure)

---

## Quick Reference Commands

```bash
# Setup staging directory
python tools/setup_staging_directory.py

# Build Python executable
python tools/build_engine_executable.py

# Build Nexus release package
python tools/build_nexus_release.py --channel alpha

# Bump version manually (auto-bumps on git push)
python tools/bump_alpha_version.py

# Check Python dependencies
pip install -r requirements.txt
python -m pip check
```

---

## File Locations Reference

| Purpose | Source | Destination |
|---------|--------|-------------|
| Papyrus scripts | `papyrus/*.psc` | `release_staging/core/Data/Scripts/*.pex` |
| Plugin file | Creation Kit | `release_staging/core/Data/F4AI_Core.esp` |
| Python bridge | `src/main.py` | `release_staging/core/Data/F4AI/Fallout4_AI_Engine.exe` |
| Voice models | Piper GitHub | `release_staging/core/Data/F4AI/*.onnx` |
| Config templates | `packaging/nexus/core-template/` | Auto-copied by setup script |
| Final archive | Build output | `dist/nexus/*.zip` |

---

## Version Management

- **Version source:** `VERSION` file in repository root
- **Auto-increment:** GitHub Actions bumps alpha version on every push
- **Manual bump:** `python tools/bump_alpha_version.py`
- **Current version:** 0.1.0-Alpha.3

---

## Next Steps After Build

1. ✅ Upload ZIP to Nexus Mods
2. ✅ Create mod page with description
3. ✅ Add screenshots/videos
4. ✅ Set requirements (F4SE, KoboldCPP)
5. ✅ Add changelog entry
6. ✅ Tag GitHub release

---

## Support

- **Build issues:** Check `NEXUS_RELEASE_DEEP_SCAN_REPORT.md`
- **Runtime issues:** Check `NEXUS_TROUBLESHOOTING.txt` in package
- **Documentation:** See `README.md` and `docs/` folder
