# Mod Organizer 2 (MO2) — Complete Setup & Usage Guide for Fallout 4 (2026)

Mod Organizer 2 is the **gold standard mod manager** for Fallout 4 on PC. It uses a **virtual file system (VFS)** that keeps your game installation 100% clean — mods are stored separately and overlaid at launch. This means you can add, remove, and reorder mods without ever touching `Data\` directly.

**Official site:** https://www.modorganizer.org/  
**Nexus:** https://www.nexusmods.com/skyrimspecialedition/mods/6194 (same release; supports FO4)  
**Current version (2026):** MO2 2.5.x

---

## Why MO2 Over Vortex?

| Feature | MO2 | Vortex |
|---|---|---|
| Virtual File System | ✅ Clean game install, zero file writes | ❌ Deploys files into Data\ |
| Multiple Profiles | ✅ Separate mod lists per profile | ✅ |
| Load Order Control | ✅ Drag-and-drop, full manual control | ✅ (less granular) |
| Conflict Detection | ✅ Per-file, per-mod visual comparison | ✅ (basic) |
| Script Extender Support | ✅ Direct SKSE/F4SE launcher setup | ✅ |
| Tool Launch Management | ✅ Run xEdit, CK, DynDOLOD from MO2 | ✅ |
| Learning Curve | Moderate | Easy |

MO2 is strongly preferred by serious modders and required by all major Wabbajack lists. Vortex is simpler for casual use.

---

## 1. Installation

### Prerequisites

- A **clean Fallout 4 installation** (run vanilla once before modding).
- Game located outside `C:\Program Files\` — UAC restrictions in Program Files cause issues. Move to `C:\Games\Fallout4\` or similar.
- Visual C++ Redistributable (usually already installed).

### Steps

1. Download MO2 from Nexus or the official site.
2. Run the installer — choose a **portable installation** (recommended) or system-wide.
   - **Portable**: MO2 and all its data live in a single folder (e.g. `C:\MO2\`). Easy to backup and move.
   - **System-wide**: Installs to AppData. Fine but harder to migrate.
3. First launch: MO2 asks to **create an instance** for a game.
4. Select **Fallout 4** from the game list.
5. Set the **game folder** path to your `Fallout4.exe` directory.
6. Set the **mods folder** — where MO2 will store extracted mod files (e.g. `C:\MO2\mods\`). Keep this outside the game folder.
7. Set the **profile folder**, **downloads folder**, and **overwrite folder** (defaults are fine).
8. Click **Finish** — MO2 opens with your empty mod list.

---

## 2. Interface Overview

### Left Panel — Mod List

Displays all installed mods in priority order (top = lower priority, bottom = higher priority). A mod lower in the list **wins all file conflicts** with mods above it.

- **Checkmark** column: enable/disable individual mods.
- **Priority** column: drag rows to reorder.
- **Flags** column: shows conflict indicators (red/orange = overwriting or overwritten by another mod).
- **Category** column: organize mods by type (textures, scripts, gameplay, etc.).
- Double-click any mod to open its **Information** dialog — see contained files, conflicts, notes, INI tweaks.

### Right Panel — Plugin List (Load Order)

Displays all active `.esp`, `.esm`, `.esl` plugins sorted by load order. Drag to reorder. The load order here directly controls the FormID priority (last plugin wins conflicts).

> **Important:** MO2's **left panel** (mod priority) controls which files are visible to the game. The **right panel** (load order) controls which plugin records override others. Both must be correct.

### Toolbar

- **Profile selector**: Switch between profiles (each profile has independent mod list + load order).
- **Run button**: Launches the selected executable (F4SE loader, LOOT, etc.).
- **Executable dropdown**: Select which tool to run.
- **Warning indicator**: Alerts for broken load order, missing masters, etc.

---

## 3. Installing Mods

### Nexus Mod Manager Download (One-Click)

1. On Nexus, click **Mod Manager Download** → MO2 intercepts and adds to downloads.
2. In MO2 **Downloads** tab: double-click the downloaded archive to install.
3. The installer (if a FOMOD) runs inside MO2 — choose your options.
4. Mod appears in left panel, disabled by default — enable by checking the checkbox.

### Manual Installation

1. Download the archive manually (.zip, .7z, .rar).
2. In MO2: **Install a new mod from an archive** button (the disk icon) → browse to file.
3. Or drag and drop onto the MO2 window.
4. FOMOD wizard or simple file list appears — proceed.

### Installing F4SE

F4SE is not a regular mod — it requires special setup:

1. Download F4SE from **f4se.silverlock.org** (NOT Nexus mirrors).
2. From the F4SE ZIP, copy the version-specific EXE, `f4se_loader.exe`, and `f4se_steam_loader.dll` to your **game root** (same folder as `Fallout4.exe`). Do this **manually outside MO2** — these DLLs go in game root, not Data\.
   - OG (1.10.163): copy `f4se_1_10_163.exe`
   - NG (1.10.980 / 1.10.984): copy `f4se_1_10_980.exe` (or the matching version for your exact build — the filename always reflects the game version number)
   - 1.11.x: copy `f4se_1_11_xxx.exe` where xxx matches your runtime (e.g. `f4se_1_11_191.exe` for 1.11.191)
3. The F4SE Script folder (`Data\F4SE\`) goes through MO2 as a normal mod.
4. In MO2: **Executables** (the gear icon) → Add new executable → Point to `f4se_loader.exe` in your game root.
5. Set this as your default launch executable — always launch via MO2's Run button using F4SE, never directly via Steam.

---

## 4. Profiles

Profiles let you maintain multiple independent mod setups:

- **Profile A**: Pure vanilla (for testing).
- **Profile B**: Your stable main setup.
- **Profile C**: Experimental — testing new mods before adding to main.
- **Profile D**: Specific Wabbajack list that targets a different game version.

### Creating a Profile

1. Profile dropdown → **Manage Profiles** → **Copy** from an existing profile.
2. Each profile stores its own:
   - `modlist.txt` (enabled/disabled mods)
   - `plugins.txt` (load order)
   - `Fallout4Custom.ini` (if profile-specific INI is enabled)
3. Switch profiles instantly — MO2 mounts the new profile's virtual file system on the fly.

### Profile-Specific INIs

In **Manage Profiles** → check **"Use profile-specific Game INI Files"**. This separates Fallout4Custom.ini per profile, so different setups can have different INI tweaks.

---

## 5. Conflict Detection

When two mods contain the same file, MO2 shows visual conflict indicators:

- **Orange lightning bolt** in left panel: this mod's files are overwritten by a lower-priority mod.
- **Red lightning bolt**: this mod overwrites files from a higher-priority mod.
- **Winning** a conflict = being lower in the list (higher priority number).

### Viewing Conflicts

Double-click a mod → **Files** tab → **Conflicts** sub-tab. Shows:
- Which mod this one overwrites.
- Which mod overwrites this one.
- Per-file granularity (e.g., `textures\clutter\bottle\bottle.dds` is overwritten by `Vivid Fallout`).

### Resolving Conflicts

Most texture/mesh conflicts are harmless — only one version loads, whichever is lower in the list. Decide which mod's version you want and order accordingly.

For **plugin conflicts** (record-level), use xEdit to create a patch that merges the changes properly (see `XEDIT_COMPREHENSIVE_GUIDE.md`).

---

## 6. Running Tools from MO2

All modding tools must be launched **from inside MO2** to see your mod list through the virtual file system. Launching xEdit or the Creation Kit outside MO2 will see your unmodded `Data\` folder only.

### Adding Tools

1. **Executables** (gear icon) → **+** → **Add from file**.
2. Browse to the tool's `.exe`.
3. Set optional arguments (e.g., for xEdit: `-fo4 -autogameini -IKnowWhatImDoing`).
4. Assign a keyboard shortcut if desired.

### Essential Tools to Add

| Tool | Executable | Arguments |
|---|---|---|
| **F4SE Loader** | `f4se_loader.exe` (game root) | (none) |
| **Creation Kit** | `CreationKit.exe` (game root) | (none) |
| **xEdit / FO4Edit** | `xEdit.exe` | `-fo4` |
| **LOOT** | `LOOT.exe` | (none) |
| **xLODGen** | `xLODGen.exe` | `-fo4 -o:"C:\LODOutput\"` |
| **DynDOLOD** | `DynDOLOD.exe` | (none) |
| **BodySlide** | `BodySlide and Outfit Studio.exe` | (none) |
| **Wrye Bash** | `Wrye Bash.exe` | (none) |

### Overwrite Folder

When tools write files (LOD output, compiled Papyrus scripts, BodySlide output), they land in MO2's **Overwrite** folder. The Overwrite folder behaves like a highest-priority mod.

**Best practice:** After any tool run, right-click **Overwrite** → **Create Mod** → name it (e.g., "DynDOLOD Output" or "BodySlide Output"). This organizes tool output into named mods you can enable/disable independently.

---

## 7. Sorting Load Order with LOOT

LOOT (Load Order Optimisation Tool) automatically sorts your plugin load order based on a community-maintained database of mod compatibility rules.

1. Add LOOT to MO2 executables.
2. Run LOOT from MO2 — it reads your current load order and applies rules.
3. Review LOOT's warnings (red = error, yellow = warning).
4. Click **Apply** to save the new order to MO2's plugin list.
5. **Do not blindly apply LOOT for complex setups** — always review before applying. LOOT's rules may not know about all your mods.

### When NOT to Use LOOT Automatically

- After installing a large framework like Sim Settlements 2 or PRP — these have specific load order requirements that LOOT may not handle perfectly. Read the mod page instructions.
- When you have manually fine-tuned positions for compatibility patches.

---

## 8. INI Management

### Per-Profile INI

With profile-specific INI enabled, edit `Fallout4Custom.ini` via:
- MO2 toolbar → **Tools** → **INI Editor** — opens the three INI files for the current profile.
- Do NOT use the in-game launcher's settings — it may overwrite the profile INI.

### Essential INI Settings for Modded FO4

Add to `Fallout4Custom.ini`:

```ini
[Archive]
bInvalidateOlderFiles=1
sResourceDataDirsFinal=STRINGS\

[Display]
bEnableMessageMenu=1

[General]
bGamepadEnable=0        ; disable if you use keyboard/mouse only
```

For full INI documentation see `FO4_INI_SETTINGS_REFERENCE_GUIDE.md`.

---

## 9. Backup & Restore

### Backing Up a Working Setup

1. In MO2: **Plugins** tab → **Backup** (floppy disk icon) → saves a timestamped snapshot of your load order.
2. Right-click the **mod list** → **Export modlist** → saves which mods are enabled.
3. Zip your entire MO2 instance folder (or at minimum the `profiles\` subfolder).

### Restoring

1. Load Order: **Plugins** tab → **Restore** → select snapshot.
2. Mod list: **Import modlist** (right-click mod list).

---

## 10. Common Issues

### "The game starts without mods"
- You launched `Fallout4.exe` or Steam directly, not through MO2. Always launch via the **Run** button in MO2 with F4SE selected.
- Check that MO2 shows the correct instance/profile.

### "Creation Kit cannot find Data\"
- CK must be launched **from inside MO2** — not from Steam.
- If CK still shows an empty Data folder, check the game path in MO2 settings.

### "xEdit shows wrong load order"
- Launch xEdit from inside MO2, not directly. The `-fo4` argument tells it which game to target.

### "Mods install but game doesn't see them"
- Check that the mod is enabled (checkmark) in the left panel.
- Check the Archives section: if a mod includes a BA2, it may need adding to `sResourceArchive2List` in INI — though MO2 handles this automatically for most mods.

### "Too many plugins" (hit 255 limit)
- Use xEdit to ESL-flag small plugins. See `LOAD_ORDER_ESL_GUIDE.md`.
- Consider merging compatible small mods with zMerge or Merge Plugins Standalone.

---

## 11. NG / 1.11.x Specific Notes

- The game must be launched via MO2 → F4SE loader (not via Steam).
- After any Bethesda game update, F4SE breaks. Update F4SE from silverlock.org **before** launching the game again. MO2 itself does not need updating for game patches.
- If 1.11.x broke your load order: update F4SE, update Address Library (Nexus #47327), then update all DLL mods one by one.
- The Creations Menu (in-game mod browser, 1.11.x+): **do not install mods through the in-game Creations menu if you manage your load order with MO2**. The Creations system writes to `Data\` directly and bypasses MO2's VFS, causing conflicts and tracking issues.

---

## Quick Reference

| Task | How |
|---|---|
| Install a mod | Double-click archive in Downloads tab OR drag onto MO2 |
| Enable/disable mod | Checkbox in left panel |
| Reorder mods (file priority) | Drag rows in left panel |
| Reorder plugins (load order) | Drag rows in right panel OR run LOOT |
| Launch game | Run button → F4SE Loader |
| Launch Creation Kit | Run button → CreationKit.exe (must be added to executables) |
| See file conflicts | Double-click mod → Files → Conflicts |
| Backup load order | Plugins tab → Backup (floppy icon) |
| Switch mod set | Profile dropdown → select profile |

*Last updated: May 2026. MO2 version: 2.5.x. Supports FO4 OG, NG, and 1.11.x.*
