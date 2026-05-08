# Tome of xEdit for Fallout 4
## A Comprehensive Guide to FO4Edit

**Original Tome of xEdit by Miax (Kristopher Kortright) and JustinOther**  
**Adapted for Fallout 4 modding**

---

## Table of Contents

### 1. Introduction and Resources
- [1.1 Introduction](#11-introduction)
- [1.2 About This Document](#12-about-this-document)
- [1.3 Resources for Users and Mod Authors](#13-resources-for-users-and-mod-authors)
- [1.4 Credits](#14-credits)

### 2. Getting Started with FO4Edit
- [2.1 Introducing xEdit](#21-introducing-xedit)
- [2.2 Acquisition and Installation](#22-acquisition-and-installation)
- [2.3 Starting xEdit](#23-starting-xedit)
- [2.4 xEdit Startup Errors](#24-xedit-startup-errors)
- [2.5 Choosing a Theme](#25-choosing-a-theme)
- [2.6 Tour of User Interface](#26-tour-of-user-interface)
- [2.7 Saving and Confirmation](#27-saving-and-confirmation)
- [2.8 Quick Tips and Shortcuts](#28-quick-tips-and-shortcuts)

### 3. xEdit Basic Use
- [3.1 Viewing Records](#31-viewing-records)
- [3.2 Navigating the Interface](#32-navigating-the-interface)
- [3.3 Understanding Record Structure](#33-understanding-record-structure)

### 4. ModGroups
- [4.1 Understanding ModGroups](#41-understanding-modgroups)
- [4.2 Choosing a ModGroup](#42-choosing-a-modgroup)
- [4.3 Built-in Editor](#43-built-in-editor)
- [4.4 ModGroup Flags](#44-modgroup-flags)

### 5. Conflict Detection and Resolution
- [5.1 Overview](#51-overview)
- [5.2 Differences Between Conflicts and Overrides](#52-differences-between-conflicts-and-overrides)
- [5.3 Applying the Conflict Filter](#53-applying-the-conflict-filter)
- [5.4 Very Quick Show Conflicts](#54-very-quick-show-conflicts)
- [5.5 Color Schemes and Display Order](#55-color-schemes-and-display-order)
- [5.6 The Conflict Resolution Process](#56-the-conflict-resolution-process)
- [5.7 Understanding Patch Plugins](#57-understanding-patch-plugins)
- [5.8 Creating a Patch Plugin](#58-creating-a-patch-plugin)

### 6. The Method - Incremental Modding
- [6.1 Preface](#61-preface)
- [6.2 Prerequisites](#62-prerequisites)
- [6.3 Good Conflicts vs Bad Conflicts](#63-good-conflicts-vs-bad-conflicts)
- [6.4 Implementing The Method](#64-implementing-the-method)

### 7. Cleaning and Error Checking
- [7.1 Preface](#71-preface)
- [7.2 Overview](#72-overview)
- [7.3 Quick Auto Clean (QAC)](#73-quick-auto-clean-qac)
- [7.4 Checking for Errors](#74-checking-for-errors)
- [7.5 Understanding Dirty Edits](#75-understanding-dirty-edits)

### 8. Managing Mod Files
- [8.1 Overview](#81-overview)
- [8.2 Adding Master Files](#82-adding-master-files)
- [8.3 Working with ESL Files](#83-working-with-esl-files)
- [8.4 Converting Plugins](#84-converting-plugins)
- [8.5 Merging Plugins](#85-merging-plugins)
- [8.6 Comparing Mod Versions](#86-comparing-mod-versions)

### 9. Advanced Utilities
- [9.1 Overview](#91-overview)
- [9.2 Building Reference Information](#92-building-reference-information)
- [9.3 Assets Manager](#93-assets-manager)
- [9.4 Scripting Support](#94-scripting-support)

### 10. FAQ
- [10.1 Beginner Questions](#101-beginner-questions)
- [10.2 Intermediate Questions](#102-intermediate-questions)
- [10.3 Advanced Questions](#103-advanced-questions)

### 11. Appendices
- [11.1 ESL Format Details](#111-esl-format-details)
- [11.2 Command Line Parameters](#112-command-line-parameters)
- [11.3 Keyboard Shortcuts](#113-keyboard-shortcuts)

---

## 1. Introduction and Resources

### 1.1 Introduction

This document serves as a comprehensive manual for FO4Edit, the xEdit tool specifically designed for Fallout 4. FO4Edit is an advanced graphical module viewer/editor and conflict detector that has become essential for both mod users and mod authors.

**For Mod Users:**
FO4Edit helps you:
- Detect and resolve conflicts between mods
- Clean dirty mods that can cause crashes
- Understand what your mods are changing
- Create compatibility patches
- Optimize your load order

**For Mod Authors:**
FO4Edit provides:
- Deep inspection of mod files
- Cleaning tools to remove unintended edits
- Conflict resolution capabilities
- Reference tracking
- Error detection
- FormID management

Whether you use mods to enhance your gaming experience or create mods for others to enjoy, FO4Edit is an invaluable tool that will improve stability and compatibility.

### 1.2 About This Document

This guide assumes basic understanding of:
- What mods are and how to install them
- Basic Fallout 4 terminology (plugins, masters, load order)
- File management on your operating system

This is **not** a guide on:
- How to create mods from scratch (use the Creation Kit for that)
- Extensive mod development (CK is better suited for that)
- General Fallout 4 gameplay

**Important Notes:**
- xEdit is continuously updated. Check the Nexus for the latest version.
- This guide focuses on Fallout 4 specific features and workflows.
- Some features may differ from other xEdit versions (TES5Edit, SSEEdit, etc.)

### 1.3 Resources for Users and Mod Authors

#### Fallout 4 Nexus Resources
- [Fallout 4 Mod Troubleshooting](https://forums.nexusmods.com/index.php?/forum/3111-fallout-4-mod-troubleshooting/)
- [Fallout 4 Creation Kit and Modders](https://forums.nexusmods.com/index.php?/forum/3441-fallout-4-creation-kit-and-modders/)

#### Official Resources
- [Bethesda's Fallout 4 Creation Kit](https://www.creationkit.com/fallout4:start)
- [Bethesda Forums - Creation Kit](https://bethesda.net/community/category/232/fallout-4-creation-kit)

#### Community Resources
- [xEdit Discord](https://discord.gg/5t8RnNQ) - For support and documentation discussion
- [FO4Edit Nexus Page](https://www.nexusmods.com/fallout4/mods/2737)
- [Nukapedia - Fallout Wiki](https://fallout.fandom.com/wiki/Fallout_4)

#### LOOT - Load Order Optimization Tool
- [LOOT on GitHub](https://github.com/loot/loot)
- LOOT works alongside FO4Edit to optimize load order

### 1.4 Credits

**Original Tome of xEdit Authors:**
- Miax (Kristopher Kortright)
- JustinOther

**xEdit Development Team:**
- ElminsterAU (original creator)
- Zilav
- Hlp
- Sharlikran (current maintainer)

**Special Thanks:**
- The modding community for feedback and testing
- Contributors to the xEdit Discord
- All mod authors who maintain clean mods

---

## 2. Getting Started with FO4Edit

### 2.1 Introducing xEdit

FO4Edit (short for Fallout 4 Edit) is the xEdit variant specifically designed for Fallout 4. It's a powerful tool that allows you to:

**View and Analyze:**
- Every record in Fallout 4 and your installed mods
- Conflicts between mods at a detailed level
- References and dependencies
- FormIDs and record structures

**Modify and Create:**
- Patch plugins to resolve conflicts
- Merged patches combining multiple mods
- Clean mods of dirty edits
- Convert between ESP/ESM/ESL formats

**Diagnose and Fix:**
- Detect errors in mods
- Find and fix deleted references
- Identify missing masters
- Check for circular references

### 2.2 Acquisition and Installation

#### Downloading FO4Edit

1. **Visit the Nexus Mods page:**
   - [FO4Edit on Nexus](https://www.nexusmods.com/fallout4/mods/2737)

2. **Download the latest version:**
   - Click on the "Files" tab
   - Download the main file (current version as of writing)
   - You'll receive a `.7z` archive file

3. **Extract the archive:**
   - Use [7-Zip](https://www.7-zip.org/) or similar to extract
   - Extract to your Fallout 4 directory (where `Fallout4.exe` is located)
   - **Do NOT extract to the Data folder**

**Typical Installation Path:**
```
C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\
```

Or if installed outside Program Files (recommended):
```
C:\Games\Steam\steamapps\common\Fallout 4\
```

#### Files Included

After extraction, you should have:
- `FO4Edit.exe` - Main executable
- `FO4EditQuickAutoClean.exe` - Quick cleaning executable
- Various `.dll` files
- Documentation files

#### Windows Security Considerations

**For Windows 10/11:**
- UAC (User Account Control) can cause issues with Program Files
- **Recommended:** Install Fallout 4 outside Program Files
- Alternative: Run FO4Edit as Administrator (right-click → Run as Administrator)

**Setting up permissions (if needed):**
1. Right-click Fallout 4 folder
2. Properties → Security
3. Edit → Add → Enter "Users"
4. Grant "Full Control"
5. Apply → OK

### 2.3 Starting xEdit

**First Launch:**

1. Navigate to your Fallout 4 installation folder
2. Double-click `FO4Edit.exe`
3. The Module Selection dialog appears

**Module Selection Dialog:**

The first screen shows all your installed plugins:
- `Fallout4.esm` (main game)
- `DLCRobot.esm` (Automatron)
- `DLCworkshop01.esm` (Wasteland Workshop)
- `DLCCoast.esm` (Far Harbor)
- `DLCworkshop02.esm` (Contraptions Workshop)
- `DLCworkshop03.esm` (Vault-Tec Workshop)
- `DLCNukaWorld.esm` (Nuka-World)
- Your installed mod files

**Load Order:**
- Load order is determined by `plugins.txt` in your Fallout 4 folder
- FO4Edit reads but does not modify load order
- Use your mod manager (MO2, Vortex, etc.) to change load order

**What to Select:**
- **For conflict detection:** Select all mods
- **For cleaning a specific mod:** Select only that mod
- **For working on your mod:** Select your mod and its dependencies

**Selection Shortcuts:**
- Right-click → "Select All" - selects everything
- Right-click → "Select None" - deselects everything
- Double-click a plugin - loads only that plugin and its masters

### 2.4 xEdit Startup Errors

#### Common Error Messages

**Error: Could not find Configuration Files**

This occurs when:
- FO4Edit can't find Fallout 4's registry entries
- You've moved the game installation
- You verified game cache through Steam

**Solution:**
1. Run Fallout 4 launcher once
2. Let it detect settings
3. Close launcher
4. Try FO4Edit again

**Error: Active Plugin List contains nonexistent file**

This means:
- A plugin is listed in `plugins.txt` but doesn't exist
- You deleted a mod without cleaning `plugins.txt`

**Solution:**
- Open `plugins.txt` (in `%LOCALAPPDATA%\Fallout4\`)
- Remove the line referencing the missing plugin
- Save and try again

**Error: Cannot access file**

This indicates:
- File permissions issues
- Another program has the file open
- Windows UAC blocking access

**Solution:**
- Close Creation Kit if open
- Run FO4Edit as Administrator
- Check file isn't set to Read-Only

### 2.5 Choosing a Theme

FO4Edit supports visual themes for better readability.

**Accessing Theme Menu:**

**Method 1 - Title Bar:**
1. Right-click the title bar
2. Hover over "Theme"
3. Select from ~40 available themes

**Method 2 - Options:**
1. Right-click in the navigation tree
2. Select "Options"
3. Choose "UI Theme"

**Popular Themes:**
- **Tablet Dark** - Dark theme, easy on eyes
- **Windows 10** - Modern Windows look
- **Glossy** - Polished appearance
- **Carbon** - Dark professional look

**Requirements for Themes:**
- Desktop Window Manager enabled
- Themes service enabled
- Desktop Composition enabled
- Aero theme selected (Windows 7/8)

**Note:** Your screen may be blank if you previously selected a theme but disabled its requirements.

### 2.6 Tour of User Interface

#### 2.6.1 Main Window Layout

The FO4Edit interface consists of several key areas:

```
┌──────────────────────────────────────────────────────────────┐
│  FO4Edit - [Plugin Name]                              - □ X   │
├──────────────────────────────────────────────────────────────┤
│  [FormID: _______]  [EditorID: _______]  [▶ ◀ Buttons]       │
├────────────────────┬─────────────────────────────────────────┤
│                    │                                          │
│  Navigation Tree   │         View Tab (Details)               │
│                    │                                          │
│  ├─ Fallout4.esm   │  Record Header                          │
│  ├─ DLCRobot.esm   │  ├─ FormID                              │
│  ├─ MyMod.esp      │  ├─ Flags                               │
│      ├─ WEAP       │  └─ Version                             │
│      ├─ ARMO       │                                          │
│      └─ NPC_       │  [Other Tabs: Referenced By, Messages,  │
│                    │   Information]                           │
├────────────────────┴─────────────────────────────────────────┤
│  Messages Tab / Information Tab / Referenced By Tab          │
└──────────────────────────────────────────────────────────────┘
```

**Key Components:**

**A. Search Boxes (Top):**
- **FormID Search** - Jump to specific FormID (e.g., 00012345)
- **EditorID Search** - Find by editor name
- **Navigation Buttons** - Back/Forward through selections

**B. Navigation Tree (Left):**
- Shows all loaded plugins hierarchically
- Organized by record type (WEAP, ARMO, NPC_, etc.)
- Color-coded for conflicts (explained later)
- Right-click for main context menu

**C. View Tab (Right):**
- Displays selected record details
- Shows all plugin versions side-by-side
- Color-coded for conflicts
- Editable fields (double-click or F2)

**D. Bottom Tabs:**
- **Messages** - Log of operations and errors
- **Referenced By** - Shows what references this record
- **Information** - Help and color legend

#### 2.6.2 Navigation Tree

The Navigation Tree is your primary method of browsing mod content.

**Structure:**
```
├─ [00] Fallout4.esm
│   ├─ File Header
│   ├─ GMST - Game Settings
│   ├─ KYWD - Keywords
│   ├─ LCRT - Location Reference Type
│   ├─ AACT - Actions
│   ├─ TXST - Texture Set
│   ├─ GLOB - Global
│   ├─ DMGT - Damage Type
│   ├─ CLAS - Class
│   └─ [... many more record types ...]
├─ [01] DLCRobot.esm
├─ [02] DLCworkshop01.esm
└─ [XX] YourMod.esp
```

**Understanding the Display:**

- **Numbers in brackets** - Load order index
- **Bold text** - Plugin contains modified records
- **Colors** (after filtering):
  - Black on white - No conflicts
  - Green on white - Override without conflict
  - Yellow on white - Conflict, but benign
  - Red on white - Conflict requiring attention

**Navigation Tips:**

- **Click + icon** - Expand record type
- **Double-click record** - View in View Tab
- **Alt + Arrow Keys** - Navigate in tree while viewing
- **Ctrl + 1-5** - Set bookmark
- **Alt + 1-5** - Jump to bookmark
- **Right-click** - Context menu

#### 2.6.3 View Tab

The View Tab shows detailed record information in a columnar format.

**Column Layout:**

Each plugin that contains the selected record gets its own column:

```
Record: Laser Pistol [WEAP:000D1D14]

Field Name     | Fallout4.esm | MyWeaponMod.esp
───────────────|──────────────|─────────────────
FormID         | 000D1D14     | 000D1D14
EditorID       | LaserPistol  | LaserPistol
Full Name      | Laser Pistol | Laser Musket
Damage         | 24           | 35
Value          | 125          | 200
Weight         | 3.5          | 4.0
```

**Understanding Colors:**

- **Black text, white background** - Identical to master
- **Green text, yellow background** - Override without conflict
- **Red text, yellow background** - Conflict loser
- **Bold text** - Modified (when editing)

**Editing in View Tab:**

1. **Double-click** a field to edit
2. **F2** with field selected
3. **Right-click** for context menu:
   - Edit - Modify value
   - Copy - Copy value
   - Paste - Paste value
   - Add - Add new element
   - Remove - Delete element

**Drag and Drop:**

You can drag values between columns to copy settings from one plugin to another.

#### 2.6.4 Referenced By Tab

Shows all records that reference the currently selected record.

**Example - Laser Pistol References:**

```
Referenced By: LaserPistol [WEAP:000D1D14]

├─ Leveled Item: LeveledList_Weapons_Energy [LVLI:001A2B3C]
├─ NPC: MinutemenSoldier [NPC_:002B3C4D]
├─ Container: AmmoBox_Energy [CONT:003C4D5E]
├─ Location: Military_Armory [LCTN:004D5E6F]
└─ Quest: MM01_DefendSettlement [QUST:005E6F70]
```

**Uses:**

- Find where an item is placed
- See what NPCs carry an item
- Identify dependencies
- Check if safe to delete

**Double-click** any reference to jump to that record.

#### 2.6.5 Messages Tab

Displays a log of all FO4Edit operations.

**Typical Messages:**

```
[00:00] FO4Edit 4.0.4
[00:01] Loading: Fallout4.esm
[00:02] Background Loader: finished
[00:03] All Done!
```

**Error Messages:**

```
[00:05] Error: Record [WEAP:000ABC12] references non-existent [MISC:DEADBEEF]
[00:06] Warning: [NPC_:00012345] has no name
```

**When to Check Messages Tab:**

- After loading plugins (check for errors)
- After saving (confirm success)
- After running any function
- When troubleshooting issues

#### 2.6.6 Information Tab

Contains built-in help including:

- Color legend
- Basic usage instructions
- Conflict resolution overview
- Keyboard shortcuts

This is a quick reference without closing FO4Edit.

#### 2.6.7 Context Menus

**Main Context Menu (Right-click in Navigation Tree):**

```
├─ Apply Filter
├─ Remove Filter
├─ Compare To...
├─ Add
├─ Copy as override into...
├─ Deep copy as override into...
├─ Copy as new record into...
├─ Remove
├─ Mark Modified
├─ Add Masters...
├─ Sort Masters
├─ Clean Masters
├─ Check for Errors
├─ Check for Circular Leveled Lists
├─ Create SEQ File (Skyrim only)
├─ Build Reference Info
├─ Build Reachable Info
├─ Remove "Identical to Master" records (deprecated)
├─ Undelete and Disable References (deprecated)
├─ ModGroups
├─ Options
└─ Other
```

**View Tab Context Menu (Right-click in View Tab):**

```
├─ Edit
├─ Add
├─ Remove
├─ Copy
├─ Copy to...
├─ Paste
├─ Copy as override into...
├─ Deep copy as override into...
├─ Compare Selected
├─ Hide no conflict rows
├─ ModGroups
└─ Options
```

### 2.7 Saving and Confirmation

**When to Save:**

- After making changes to records
- After cleaning mods
- Before closing FO4Edit
- Periodically during long editing sessions

**How to Save:**

**Method 1 - Keyboard:**
- Press `Ctrl + S`

**Method 2 - Close FO4Edit:**
- Click X to close
- Save dialog appears if changes detected

**Save Changed Files Dialog:**

```
┌─────────────────────────────────────┐
│  Save Changed Files                 │
├─────────────────────────────────────┤
│  ☐ Fallout4.esm                     │
│  ☑ MyMod.esp                         │
│  ☑ MyPatch.esp                       │
│                                      │
│        [OK]  [Cancel]                │
└─────────────────────────────────────┘
```

- Check plugins you want to save
- Uncheck plugins you don't want to modify
- Click OK to save

**Backup Files:**

FO4Edit creates backups automatically:
- `MyMod.esp.save.2024_01_24_14_30_45` - New version being saved
- `MyMod.esp.backup.2024_01_24_14_25_12` - Previous version

**Safe to delete backups** after confirming mod works correctly.

**Verification:**

Check Messages Tab after saving:
```
[00:10] Saving: MyMod.esp
[00:11] Writing: C:\...\Fallout 4\Data\MyMod.esp.save.2024_01_24_14_30_45
[00:12] Renaming: MyMod.esp -> MyMod.esp.backup.2024_01_24_14_30_45
[00:12] Renaming: MyMod.esp.save.2024_01_24_14_30_45 -> MyMod.esp
[00:12] Done saving.
```

### 2.8 Quick Tips and Shortcuts

#### Command Line Parameters

```
FO4Edit.exe -edit                    # Enable edit mode
FO4Edit.exe -quickautoclean          # Quick Auto Clean mode
FO4Edit.exe -quickshowconflicts      # Quick conflict check
FO4Edit.exe -veryquickshowconflicts  # Auto-load all plugins
FO4Edit.exe -IKnowWhatImDoing        # Disable warning dialogs
FO4Edit.exe -AllowMasterFilesEdit    # Allow master file editing
```

#### Keyboard Shortcuts

**Navigation:**
- `Ctrl + F3` - Assets Browser
- `Alt + F3` - Worldspace Browser
- `F2` - Edit FormID
- `Ctrl + 1-5` - Set bookmark
- `Alt + 1-5` - Jump to bookmark
- `Ctrl + Click` - Jump to referenced record
- `Alt + Arrow Keys` - Navigate tree while in View Tab

**Editing:**
- `F2` - Edit selected field
- `Ctrl + C` - Copy
- `Ctrl + V` - Paste
- `Delete` - Remove selected
- `Insert` - Add new entry
- `Ctrl + Up/Down` - Move items in lists

**View Management:**
- `Ctrl + S` - Save
- `+` - Expand node
- `-` - Collapse node
- `*` - Expand all (can be slow!)
- `/` - Collapse all

**Mouse Shortcuts:**
- **Double-click** field - Edit value
- **Double-click** record - View details
- **Shift + Double-click** - Edit long text in popup
- **Ctrl + Click** FormID - Jump to record
- **Alt + Click** - Fully expand tree (slow!)

---

## 3. xEdit Basic Use

### 3.1 Viewing Records

FO4Edit excels at letting you examine every aspect of Fallout 4's data.

**Opening a Plugin:**

1. Launch FO4Edit
2. Select your plugin from the list
3. Click OK
4. Wait for loading to complete

**Browsing Record Types:**

Common Fallout 4 record types:

| Code | Type | Description |
|------|------|-------------|
| WEAP | Weapons | All weapons in game |
| ARMO | Armor | Armor pieces and clothing |
| AMMO | Ammunition | Ammo types |
| NPC_ | Non-Player Character | NPCs and creatures |
| LVLI | Leveled Item | Item spawn lists |
| LVLN | Leveled NPC | NPC spawn lists |
| CONT | Container | Containers and inventories |
| CELL | Cell | Interior and exterior cells |
| WRLD | Worldspace | Outdoor areas |
| QUST | Quest | Quest definitions |
| PERK | Perk | Player and NPC perks |
| MISC | Misc Item | Misc items and junk |
| KEYM | Key | Keys and passwords |
| ALCH | Ingestible | Food, drink, chems |

**Example - Viewing a Weapon:**

1. Expand `Fallout4.esm`
2. Expand `WEAP - Weapon`
3. Find `LaserPistol "Laser Pistol" [WEAP:000D1D14]`
4. Click to view in View Tab

The View Tab shows:
- Base stats (damage, value, weight)
- Attack data
- Keywords
- Model paths
- Sounds
- Art objects
- Modifications available

### 3.2 Navigating the Interface

**Efficient Navigation Techniques:**

**1. Using FormID Search:**
```
Type FormID in search box: 000D1D14
Press Enter
FO4Edit jumps to that record
```

**2. Using EditorID Search:**
```
Type EditorID: LaserPistol
Press Enter
Shows all matches
```

**3. Following References:**
```
Find a FormID field (e.g., Ammo: 0008C87E)
Hold Ctrl
Click the FormID
Jumps to ammunition record
```

**4. Using Bookmarks:**
```
Navigate to important record
Press Ctrl + 1 (sets bookmark 1)
Navigate elsewhere
Press Alt + 1 (returns to bookmark)
```

**5. Back/Forward Navigation:**
```
Use Back/Forward buttons (top right)
Or use mouse back/forward buttons
Like a web browser
```

### 3.3 Understanding Record Structure

**Record Hierarchy:**

Every record in Fallout 4 follows a structure:

```
Record [Type:FormID]
├─ Record Header
│   ├─ FormID
│   ├─ Flags
│   ├─ Version
│   └─ Form Version
├─ EditorID
├─ Type-Specific Fields
│   ├─ Basic Data
│   ├─ Keywords
│   ├─ Data
│   └─ Models
└─ Referenced Records (FormIDs)
```

**Example - Weapon Record Structure:**

```
LaserPistol [WEAP:000D1D14]
├─ Record Header
│   ├─ FormID: 000D1D14
│   ├─ Flags: 0x00000008 (Compressed)
│   └─ Version: 131
├─ EDID - EditorID: LaserPistol
├─ FULL - Name: Laser Pistol
├─ MODL - Model
│   └─ Model Filename: Weapons\LaserGun\LaserGun.nif
├─ DNAM - Data
│   ├─ Value: 125
│   ├─ Weight: 3.5
│   └─ Damage: 24
├─ CRDT - Critical Data
│   ├─ Critical Damage: 24
│   └─ Critical Multiplier: 1.0
└─ KWDA - Keywords
    ├─ WeaponTypeEnergy
    ├─ WeaponTypePistol
    └─ AnimsHandGunPistol
```

**Understanding FormIDs:**

FormID format: `XXAABBCC`
- `XX` = Load order index (mod position)
- `AABBCC` = Unique ID within that mod

Examples:
- `000D1D14` - From Fallout4.esm (00)
- `010012AB` - From first DLC (01)
- `FF0000A1` - From your patch plugin (FF in load order)

**Record Flags:**

Common flags you'll see:
- **ESM** - Master file flag
- **ESL** - Light plugin flag
- **Compressed** - Record is compressed
- **Deleted** - Record marked for deletion
- **Initially Disabled** - Starts disabled in-game
- **Persistent** - Always loaded reference

---

## 4. ModGroups

### 4.1 Understanding ModGroups

ModGroups are a powerful feature that helps manage intentional conflicts between related mods.

**What are ModGroups?**

ModGroups tell FO4Edit: "These mods are designed to work together, and their conflicts are intentional. Don't show them as conflicts."

**Why Use ModGroups?**

Without ModGroups:
```
You install "Weapon Overhaul Pack"
It includes 5 plugins:
- WeaponOverhaul_Core.esm
- WeaponOverhaul_Ballistic.esp
- WeaponOverhaul_Energy.esp
- WeaponOverhaul_Melee.esp
- WeaponOverhaul_Heavy.esp

When you check conflicts:
EVERY mod shows red conflicts with each other!
```

With ModGroups:
```
Create a ModGroup for Weapon Overhaul Pack
All 5 mods are in the group
Only the LAST plugin's changes show
Intentional conflicts hidden
```

**How ModGroups Work:**

When a record appears in multiple mods within a ModGroup:
- Only the **last** mod in load order is shown
- Earlier versions are hidden
- Conflicts between group members disappear
- Conflicts with OTHER mods still show normally

### 4.2 Choosing a ModGroup

ModGroups are stored in `.modgroups` files.

**ModGroup File Location:**

Same folder as FO4Edit.exe:
```
C:\Games\Steam\steamapps\common\Fallout 4\
├─ FO4Edit.exe
├─ MyModPack.FO4Edit.modgroups
└─ AnotherPack.FO4Edit.modgroups
```

**ModGroup Activation:**

When loading FO4Edit:
1. After selecting plugins
2. ModGroup selection dialog appears
3. Choose which ModGroups to activate
4. Click OK

**ModGroup Requirements:**

For a ModGroup to be available:
- At least 2 plugins from the group must be loaded
- Plugins must be in the correct load order
- All required plugins must exist

### 4.3 Built-in Editor

FO4Edit includes a ModGroup editor.

#### 4.3.1 Creating a ModGroup

**Step 1 - Open Editor:**
1. Right-click in View Tab
2. Hover over "ModGroups"
3. Select "Edit ModGroups"

**Step 2 - Create New:**
1. Right-click in ModGroup Editor
2. Select "Insert Entry"
3. Enter ModGroup name

**Step 3 - Add Plugins:**
1. Select your ModGroup
2. Right-click
3. Select "Insert Module"
4. Enter plugin filename

**Step 4 - Set Flags:**
- **Target** - Conflicts can be hidden in this mod
- **Source** - Hides conflicts from targets above it
- **Optional** - Not required for ModGroup to activate
- **Forbidden** - ModGroup disabled if this loads

**Step 5 - Save:**
1. Click OK
2. ModGroup file is created
3. Attach to appropriate mod (for MO2 users)

#### Example ModGroup

```
[WeaponOverhaulPack]
WeaponOverhaul_Core.esm [Source]
WeaponOverhaul_Ballistic.esp [Target]
WeaponOverhaul_Energy.esp [Target]
WeaponOverhaul_Melee.esp [Target]
WeaponOverhaul_Heavy.esp [Source]
```

This means:
- Core.esm hides conflicts in Ballistic, Energy, Melee
- Heavy.esp hides conflicts in all four others
- Intentional design, no conflict warnings needed

### 4.4 ModGroup Flags

**Detailed Flag Meanings:**

**🎯 Target Flag:**
- "This mod's records can be hidden"
- Used for mods lower in the ModGroup
- Conflicts from Source mods will hide these

**📤 Source Flag:**
- "This mod hides conflicts in Targets above it"
- Used for the final/master plugin in a pack
- Ensures its changes take priority

**⚙️ Optional Flag:**
- "This mod doesn't have to be loaded"
- ModGroup works with or without it
- Useful for optional components

**🚫 Forbidden Flag:**
- "Don't use ModGroup if this loads"
- Prevents conflicts with incompatible mods
- Rare usage

**📦 Ignore Load Order Flags:**

**Always:**
- Load order doesn't matter at all
- Any order is fine

**In Block:**
- Consecutive mods can be in any order
- But block must be between other mods
- Example:
  ```
  ModA.esm [before block]
  ModB.esp [in block - any order]
  ModC.esp [in block - any order]
  ModD.esp [in block - any order]
  ModE.esm [after block]
  ```

---

## 5. Conflict Detection and Resolution

### 5.1 Overview

Conflict detection is FO4Edit's primary purpose for most users.

**What is a Conflict?**

A conflict occurs when multiple mods modify the same record in different ways.

**Types of Conflicts:**

1. **Benign Conflicts** - Both mods make compatible changes
2. **Override Conflicts** - Last mod wins, first mod's changes lost
3. **Breaking Conflicts** - Mods fight, causing bugs or crashes

**Example - Benign Conflict:**
```
Mod A: Adds "Automatic" keyword to Laser Pistol
Mod B: Increases Laser Pistol damage to 35

Result: Compatible if both changes merge
```

**Example - Override Conflict:**
```
Mod A: Sets Laser Pistol damage to 40
Mod B: Sets Laser Pistol damage to 30

Result: Mod B wins (loads later), Mod A ignored
```

**Example - Breaking Conflict:**
```
Mod A: Adds new weapon mod to Laser Pistol
Mod B: Overwrites weapon mods, removes Mod A's addition

Result: Mod A's weapon mod missing in-game
```

### 5.2 Differences Between Conflicts and Overrides

**Override vs Conflict:**

**Override (Yellow/Green):**
- One mod intentionally changes a vanilla record
- No other mods involved
- Working as intended
- Example: Weapon rebalance changing damage values

**Conflict (Red/Orange):**
- Multiple mods change the same record
- Last loaded mod "wins"
- Earlier mods' changes may be lost
- May need resolution

**Visual Guide:**

```
No Override (Black on White):
[Fallout4.esm] Laser Pistol: Damage = 24

Override (Green on Yellow):
[Fallout4.esm] Laser Pistol: Damage = 24
[WeaponMod.esp] Laser Pistol: Damage = 35

Conflict (Red on Yellow):
[Fallout4.esm] Laser Pistol: Damage = 24
[ModA.esp]      Laser Pistol: Damage = 40  ← Conflict Loser
[ModB.esp]      Laser Pistol: Damage = 30  ← Conflict Winner
```

### 5.3 Applying the Conflict Filter

The conflict filter shows only conflicting records.

**Steps to Apply:**

1. Load FO4Edit with all your mods
2. Wait for loading to complete
3. Right-click in Navigation Tree
4. Select "Apply Filter"
5. Check these options:
   - ☑ by Conflict Status for this particular Record
   - ☑ by conflict status inherited by parent
   - ☑ Conflicts with winner
6. Click "Filter"

**Processing Time:**

- Small load order: Few seconds
- 100+ mods: 1-5 minutes
- 200+ mods: 5-15 minutes

**Results:**

After filtering:
- Navigation Tree shows only conflicting mods
- Red background = Has conflicts
- Yellow background = Override
- Green background = Compatible override

### 5.4 Very Quick Show Conflicts

The fastest way to check conflicts.

**Setup for Mod Organizer 2:**

1. Open MO2
2. Click gear icon (executables)
3. Add new executable:
   - **Title:** FO4Edit - Quick Conflicts
   - **Binary:** `FO4Edit.exe`
   - **Arguments:** `-veryquickshowconflicts`
4. Click Apply

**Setup for Vortex:**

1. Open Vortex
2. Go to Dashboard
3. Click "Add Tool"
4. Fill in:
   - **Name:** FO4Edit - Quick Conflicts
   - **Executable:** Browse to `FO4Edit.exe`
   - **Parameters:** `-veryquickshowconflicts`
5. Save

**Using Quick Conflicts:**

1. Run "FO4Edit - Quick Conflicts" from your mod manager
2. FO4Edit auto-loads ALL plugins
3. Auto-applies conflict filter
4. Shows results immediately

**Benefits:**
- No plugin selection needed
- Automatic filtering
- Fastest conflict check
- Perfect for quick verification

### 5.5 Color Schemes and Display Order

Understanding FO4Edit's colors is crucial.

**Color Legend:**

| Background | Text | Meaning |
|------------|------|---------|
| White | Black | Identical to master |
| White | Gray | Identical to master (when overridden) |
| Yellow | Green | Override, no conflict |
| Yellow | Orange | Potentially problematic |
| Yellow | Red | Conflict loser |
| White | Red | Error or problem |

**Display Order:**

Plugins display **left to right** in **load order**:

```
[Fallout4.esm] → [DLC] → [Early Mod] → [Later Mod] → [Last Mod]
     ↑                                                      ↑
  Original                                            Conflict Winner
```

**Rightmost column always wins in-game.**

**Example Display:**

```
Laser Pistol [WEAP:000D1D14]

Field      | Fallout4.esm | WeaponBalance.esp | MyPatch.esp
-----------|--------------|-------------------|-------------
Damage     | 24           | 35                | 40
Value      | 125          | 125               | 150
Weight     | 3.5          | 3.5               | 3.0
```

In-game values will be: Damage=40, Value=150, Weight=3.0 (from MyPatch.esp)

### 5.6 The Conflict Resolution Process

**Decision Tree:**

```
Found a conflict
      ↓
Is it important?
   ↓         ↓
  NO        YES
   ↓         ↓
Ignore   Can load order fix it?
            ↓         ↓
           YES       NO
            ↓         ↓
         Reorder   Create
                   Patch
```

**Option 1: Do Nothing**

Some conflicts don't matter:
- Cosmetic differences you don't care about
- Minor stat tweaks
- EditorID conflicts (don't affect gameplay)

**Option 2: Change Load Order**

If one mod should fully override another:
1. Close FO4Edit
2. Open your mod manager
3. Move preferred mod lower in load order
4. Reload FO4Edit and check

**Option 3: Create a Patch**

When you need changes from both mods:
1. Identify what each mod changes
2. Create new patch plugin
3. Copy desired changes from both
4. Load patch last

**Option 4: Remove a Mod**

Last resort for truly incompatible mods.

### 5.7 Understanding Patch Plugins

**What is a Patch Plugin?**

A small plugin that:
- Contains only conflict resolution records
- Loads after conflicting mods
- Combines changes from multiple sources
- Acts as a "peacekeeper" between mods

**Patch Plugin Structure:**

```
ConflictResolution.esp
├─ Masters:
│   ├─ Fallout4.esm
│   ├─ ModA.esp
│   └─ ModB.esp
└─ Records:
    └─ LaserPistol [WEAP:000D1D14]
        ├─ Damage: 40 (from ModA)
        └─ Keyword: "Automatic" (from ModB)
```

**Types of Patches:**

1. **Manual Patch** - You create by hand
2. **Merged Patch** - Auto-generated (deprecated for FO4)
3. **Compatibility Patch** - Made by mod authors
4. **Bash Patch** - Created by Wrye Bash

### 5.8 Creating a Patch Plugin

**Manual Method (Recommended):**

**Step 1 - Identify Conflict:**

1. Apply conflict filter
2. Find red conflict
3. Examine what each mod changes
4. Determine desired outcome

**Step 2 - Create Patch:**

1. Right-click the winning record
2. Select "Copy as override into..."
3. Choose `<new file>.esp`
4. Name it descriptively:
   - `ModA_ModB_Patch.esp`
   - `MyConflictFixes.esp`

**Step 3 - Add Changes:**

1. Find the new record in your patch
2. Drag/drop values from other mods
3. Or manually edit fields
4. Combine all desired changes

**Step 4 - Add Masters:**

1. Right-click your patch in tree
2. "Add Masters..."
3. Select all conflicting mods
4. Click OK

**Step 5 - Save:**

1. Press Ctrl+S
2. Check your patch is selected
3. Click OK

**Example Workflow:**

```
Problem:
Mod A: Laser Pistol damage = 40
Mod B: Laser Pistol has "Automatic" keyword

Goal:
Keep both changes

Solution:
1. Copy Laser Pistol to new patch
2. Set damage = 40
3. Add "Automatic" keyword
4. Load patch after both mods
```

---

## 6. The Method - Incremental Modding

### 6.1 Preface

"The Method" is an approach to building a stable, conflict-free mod list by adding mods **one at a time** and resolving conflicts **as you go**.

**Why Use The Method?**

Traditional approach:
```
1. Install 200 mods
2. Run FO4Edit
3. See wall of red
4. Give up or spend days fixing
```

The Method:
```
1. Install 1 mod
2. Check conflicts (very few)
3. Resolve quickly
4. Create ModGroup
5. Repeat
→ Always have clean load order
```

**Benefits:**

- **Never overwhelmed** - Only a few conflicts at a time
- **Know what breaks** - Each mod tested individually
- **Easy to fix** - Small, focused patches
- **Stable foundation** - Build confidence incrementally

### 6.2 Prerequisites

**Required Tools:**

1. **FO4Edit** - Latest version
2. **Mod Organizer 2** or **Vortex** - Mod manager
3. **LOOT** - Load order optimization (optional but recommended)

**Required Setup:**

1. **Clean Fallout 4 Installation**
   - Fresh install preferred
   - Or disable all mods as starting point

2. **Unofficial Fallout 4 Patch (UFO4P)**
   - Install BEFORE starting
   - Create ModGroup for it (shown below)

**Creating UFO4P ModGroup:**

```
1. Load FO4Edit with only:
   - Fallout4.esm
   - DLCs
   - UFO4P.esp

2. Run Very Quick Show Conflicts

3. All DLCs and UFO4P will conflict (expected)

4. Create ModGroup:
   - Name: "UFO4P"
   - Modules:
     * Fallout4.esm [Source]
     * DLCRobot.esm [Target]
     * DLCworkshop01.esm [Target]
     * DLCCoast.esm [Target]
     * DLCworkshop02.esm [Target]
     * DLCworkshop03.esm [Target]
     * DLCNukaWorld.esm [Target]
     * Unofficial Fallout 4 Patch.esp [Source]

5. Save ModGroup

6. Reload FO4Edit

7. Should show 0 conflicts now
```

### 6.3 Good Conflicts vs Bad Conflicts

**Good Conflicts (Ignore):**

**Example 1 - Intentional Override:**
```
Vanilla: Combat Rifle damage = 33
Mod: Combat Rifle damage = 45

This is intentional - mod is rebalancing weapons
No action needed
```

**Example 2 - Texture Replacement:**
```
Vanilla: Uses texture A
Mod: Uses texture B

Intentional retexture
No action needed
```

**Bad Conflicts (Fix Required):**

**Example 1 - Lost Changes:**
```
Mod A: Adds "Scope" weapon mod to Combat Rifle
Mod B: Overwrites weapon mods, loses Scope

Result: Mod A's scope missing in-game
Fix: Create patch preserving both changes
```

**Example 2 - Localization Issues:**
```
Mod A: Changes cell name to "Downtown Boston"
Mod B (foreign language): Overwrites with "Centro de Boston"

Result: Mixed language in-game
Fix: Remove Mod B's cell name if playing in English
```

**Example 3 - Water Seams:**
```
Mod A: Sets water type to "DefaultWater"
Mod B: Sets water type to "CoastalWater"

Result: Visual seams where water types meet
Fix: Create patch using consistent water type
```

### 6.4 Implementing The Method

**The Workflow:**

```
┌─────────────────────────────────────┐
│ 1. Install ONE new mod              │
│ 2. Run Very Quick Show Conflicts    │
│ 3. Resolve conflicts (patch/ignore) │
│ 4. Create ModGroup for this mod     │
│ 5. Verify 0 conflicts               │
│ 6. Test in-game (optional)          │
│ 7. Repeat for next mod              │
└─────────────────────────────────────┘
```

**Detailed Steps:**

**Step 1 - Install New Mod:**

1. Choose your next mod to install
2. Install through mod manager
3. Activate in mod manager
4. **Clean the mod** (use Quick Auto Clean)
5. Check for errors (Check for Errors function)

**Step 2 - Run Quick Show Conflicts:**

1. Launch "FO4Edit - Quick Conflicts" (set up earlier)
2. Wait for auto-load and filter
3. Review conflicts shown

**Step 3 - Resolve Conflicts:**

For each conflict:

**A. Determine if it matters:**
- Is it gameplay-affecting?
- Do you care about the difference?
- Is it a known compatible conflict?

**B. Resolution options:**

**Option 1 - Do Nothing:**
```
Conflict: EditorID differences
Impact: None (EditorIDs don't affect gameplay)
Action: Ignore
```

**Option 2 - Load Order:**
```
Conflict: Mod A and Mod B both change stats
Preference: Mod B's stats are better
Action: Load Mod B after Mod A (already correct)
```

**Option 3 - Create Patch:**
```
Conflict: Mod A adds keyword, Mod B changes stats
Need: Both changes
Action: Create patch combining both
```

**Step 4 - Create ModGroup:**

After resolving conflicts for this mod:

1. Open ModGroup Editor
2. Create new ModGroup for this mod:

```
[MyNewMod]
Fallout4.esm [Source]
DLCs... [Source]
UFO4P.esp [Source]
MyNewMod.esp [Source]
```

3. Save ModGroup
4. Attach to mod (MO2: drag to mod's folder)

**Step 5 - Verify:**

1. Reload FO4Edit
2. Run Quick Show Conflicts again
3. Should show 0 conflicts
4. If conflicts remain, investigate

**Step 6 - Test (Optional but Recommended):**

1. Launch Fallout 4
2. Test mod functionality
3. Check for visual issues
4. Verify no crashes

**Step 7 - Repeat:**

Move to next mod!

**Example - Adding Weapon Mod:**

```
Current Load Order:
├─ Fallout4.esm
├─ DLCs
├─ UFO4P.esp
└─ Previous mods...

New Mod: "Tacticool Weapons.esp"

Step 1: Install and activate

Step 2: Run Quick Conflicts
Result: Shows conflicts with UFO4P

Step 3: Review conflicts
- Tacticool changes Combat Rifle damage: 45
- UFO4P changes Combat Rifle damage: 38
- Decision: Keep Tacticool's damage (why I installed it)
- Action: Load Tacticool after UFO4P ✓ (already correct)

Step 4: Create ModGroup
[TacticoolWeapons]
UFO4P.esp [Target]
Tacticool Weapons.esp [Source]

Step 5: Reload and verify
Conflicts: 0 ✓

Step 6: Test in-game
Combat Rifle shows new stats ✓
New weapon mods appear ✓

Done! Ready for next mod.
```

**Tips for Success:**

1. **Add mods in logical order:**
   - Framework mods first (F4SE, MCM, etc.)
   - Large overhauls next (Sim Settlements, etc.)
   - Smaller mods last

2. **Group related mods:**
   - Install a mod and its patches together
   - Create single ModGroup for the set

3. **Keep notes:**
   - Document which conflicts you ignored
   - Note why you made certain decisions
   - Helps if you need to revisit later

4. **Be patient:**
   - Each mod might take 5-10 minutes
   - But you'll have stable load order
   - Worth it to avoid crashes

---

## 7. Cleaning and Error Checking

### 7.1 Preface

**Why Clean Mods?**

The Creation Kit sometimes creates unintended edits:
- **Identical To Master (ITM)** - Record copied but unchanged
- **Deleted References** - Objects removed incorrectly
- **Deleted Navmeshes** - Navigation data removed incorrectly

These "dirty edits" cause:
- Conflicts with other mods
- Crashes
- Missing content
- Compatibility issues

**Who Should Clean?**

**Mod Authors:**
- **MUST** clean mods before release
- Reduces user complaints
- Shows professionalism
- Makes support easier

**Mod Users:**
- Can clean mods if author hasn't
- Check if cleaning recommended (LOOT)
- Some mods should NOT be cleaned (check description)

### 7.2 Overview

**Types of Dirty Edits:**

**1. Identical To Master (ITM):**
```
Fallout4.esm: LaserPistol damage = 24
ModAuthor.esp: LaserPistol damage = 24

The mod doesn't actually change damage, but 
Creation Kit saved it anyway. This is an ITM.
```

**2. Deleted Reference:**
```
Mod deletes a reference in a cell
If another mod tries to modify that reference
Game crashes
```

**3. Deleted Navmesh:**
```
Mod deletes navmesh
NPCs can't navigate that area
Game may crash
```

**4. Wild Edit:**
```
Mod author accidentally modifies records
they didn't intend to change
Requires manual review to fix
```

### 7.3 Quick Auto Clean (QAC)

The recommended cleaning method.

**Setup - Rename Method:**

1. Navigate to FO4Edit folder
2. Copy `FO4Edit.exe`
3. Rename copy to `FO4EditQAC.exe`
4. Run `FO4EditQAC.exe` when you want to clean

**Setup - Shortcut Method:**

1. Right-click `FO4Edit.exe`
2. Send To → Desktop (create shortcut)
3. Right-click shortcut → Properties
4. In "Target" box, add: `-quickautoclean`
5. Result: `"C:\...\FO4Edit.exe" -quickautoclean`
6. Click OK

**Setup - Mod Manager Method:**

**For MO2:**
```
Executables → Add
Title: FO4Edit - Auto Clean
Binary: FO4Edit.exe
Arguments: -quickautoclean
```

**For Vortex:**
```
Dashboard → Add Tool
Name: FO4Edit - Auto Clean
Executable: FO4Edit.exe
Parameters: -quickautoclean
```

**Using Quick Auto Clean:**

1. Run FO4Edit in QAC mode
2. Double-click plugin to clean
3. Wait for automatic process:
   - Removes ITMs
   - Undeletes and disables references
   - Repeats 3 times (catches nested issues)
   - Auto-saves between passes
4. Process completes automatically
5. Close FO4Edit
6. Done!

**Output Example:**

```
[00:01] Removing Identical To Master records
[00:01] Processed Records: 450
[00:01] Identical To Master: 15
[00:01] Undeleting and Disabling References
[00:01] Processed References: 234
[00:01] Deleted References: 3
[00:02] Saving: MyMod.esp
[00:02] Done!
```

**After Cleaning:**

FO4Edit creates:
- `MyMod.esp.backup.2024_01_24_15_30_00` (before cleaning)
- `MyMod.esp` (cleaned version)

Keep backup until you verify mod works!

### 7.4 Checking for Errors

Beyond dirty edits, mods can have structural errors.

**Running Error Check:**

1. Load FO4Edit with your mod
2. Right-click mod in tree
3. Select "Check for Errors"
4. Wait for processing
5. Review Messages Tab

**Common Errors:**

**1. NULL Reference:**
```
[PACK] Location → Found NULL reference, expected: REFR
```
- Mod references something that doesn't exist
- Will likely cause issues
- **Report to mod author**

**2. Unresolved Reference:**
```
Form #0 → [12ABCDEF] <Error: Could not be resolved>
```
- Mod references FormID that doesn't exist
- Very serious error
- **Report to mod author**

**3. Form Type Mismatch:**
```
Expected WEAP, found ARMO
```
- Mod uses wrong record type
- Likely to cause problems
- **Report to mod author**

**4. Missing Data:**
```
Required field 'FULL - Name' is missing
```
- Record missing required information
- May cause issues
- **Report to mod author**

**Minor Warnings:**

Some "errors" are harmless:
```
Subrecord 'XPRD' referenced but not defined
```
- Often expected by xEdit
- May not be actual problem
- Ask on xEdit Discord if unsure

**What to Do About Errors:**

1. **Don't try to fix others' mods yourself**
2. Check mod description (known issue?)
3. Check comments/posts (others reporting?)
4. Report to mod author politely
5. Consider not using if serious errors

### 7.5 Understanding Dirty Edits

**Why Do Dirty Edits Happen?**

**1. Creation Kit Bug:**
```
Mod author opens Cell in CK
Views but doesn't change anything
CK marks Cell as modified anyway
Saves even though nothing changed
→ ITM created
```

**2. Accidental Selection:**
```
Mod author clicks wrong record
Doesn't notice
Makes change to wrong thing
→ Wild Edit created
```

**3. Undo/Redo Issues:**
```
Mod author makes change
Undoes it
CK doesn't properly clear the change
Change still saves
→ ITM created
```

**Impact of Dirty Edits:**

**Scenario 1 - ITM Blocks Other Mod:**
```
UFO4P: Fixes bug in combat rifle
DirtyMod: ITM on combat rifle (no actual change)
DirtyMod loads after UFO4P

Result: Bug fix lost because ITM overrides it
```

**Scenario 2 - Deleted Reference Crash:**
```
ModA: Places barrel [REFR:12345678]
ModB: Deletes barrel [REFR:12345678]
ModC: Modifies barrel [REFR:12345678]

ModC tries to modify non-existent barrel
→ Crash
```

**Scenario 3 - Deleted Navmesh:**
```
Mod deletes navmesh in cell

NPCs can't navigate
Companions get stuck
Enemies T-pose
Game may crash
```

**Prevention (For Mod Authors):**

1. **Always clean before release**
2. Use QAC on your mod
3. Check for errors
4. Review "what did I change?"
5. Remove unintended changes
6. Test thoroughly

---

## 8. Managing Mod Files

### 8.1 Overview

FO4Edit provides tools for advanced mod file management:
- Adding/removing masters
- Converting between ESP/ESM/ESL
- Merging mods
- Splitting mods
- Renumbering FormIDs
- Comparing versions

**When to Use These Tools:**

- Creating compatibility patches
- Optimizing load order
- Mod development
- Advanced troubleshooting

**Caution:**

Most of these operations are for **mod authors**. Regular users should be careful modifying mods they didn't create.

### 8.2 Adding Master Files

**What are Masters?**

Masters are dependencies - files that a plugin requires to function.

**Example:**
```
WeaponPatch.esp requires:
├─ Fallout4.esm (always required)
├─ DLCCoast.esm (uses Far Harbor content)
└─ WeaponMod.esp (patches this mod)
```

**When to Add Masters:**

- Creating patch for another mod
- Using records from another plugin
- Splitting plugin into ESP/ESM pair
- Fixing missing master issues

**How to Add Masters:**

1. Load your plugin in FO4Edit
2. Right-click your plugin in tree
3. Select "Add Masters..."
4. Check the plugins to add as masters
5. Click OK
6. FO4Edit automatically:
   - Adds to master list
   - Renumbers FormIDs correctly
7. Save your plugin

**Example - Adding DLC Master:**

```
Before:
MyMod.esp
└─ Masters:
    └─ Fallout4.esm

You want to use Far Harbor content

After adding:
MyMod.esp
└─ Masters:
    ├─ Fallout4.esm
    └─ DLCCoast.esm

Now you can reference Far Harbor records
```

### 8.3 Working with ESL Files

**What is ESL?**

ESL (Elder Scrolls Light) is a plugin format that:
- Doesn't count toward 255 plugin limit
- Limited to 4,096 new records
- Perfect for small mods
- Supported in FO4 via Creation Club

**ESL Requirements:**

A plugin can be ESL if:
- Has fewer than 4,096 new records
- FormIDs are in valid range (see below)
- Doesn't add new cells/worldspaces (if ESL+ESM flagged)

**Checking ESL Compatibility:**

1. Load plugin in FO4Edit
2. Right-click plugin
3. If "Add ESL Flag" option appears → Compatible
4. If warning appears → Not compatible

**Adding ESL Flag:**

**Method 1 - Simple (if compatible):**
1. Load plugin in FO4Edit
2. Click File Header
3. Right-click "Record Flags"
4. Edit
5. Check "ESL"
6. OK
7. Save

**Method 2 - With Compacting:**

If plugin has too many records or wrong FormID range:
1. Load plugin alone in FO4Edit
2. Right-click plugin
3. "Compact FormIDs for ESL"
4. Warning appears - read carefully!
5. If safe, click Yes
6. FO4Edit renumbers FormIDs
7. Automatically adds ESL flag
8. Save

**⚠️ DANGER - Compacting FormIDs:**

**Do NOT compact if:**
- Mod has patches (they'll break)
- Mod has voice files (they'll break)
- Mod has FaceGen data (it'll break)
- Other mods depend on it
- You're not the original author

**Only compact if:**
- You created the mod
- It has no patches/dependencies
- You regenerate FaceGen after
- You rename voice files after
- You understand the risks

### 8.4 Converting Plugins

**ESP → ESM Conversion:**

**Why Convert:**
- Make mod a master for patches
- Force loading before other plugins
- Prevent accidental changes

**How to Convert:**
1. Load plugin in FO4Edit
2. Expand plugin in tree
3. Click "File Header"
4. Right-click "Record Flags"
5. Edit
6. Check "ESM"
7. OK
8. Save
9. Rename file extension .esp → .esm (optional)

**ESM → ESP Conversion:**

**Why Convert:**
- Make ESM load with other ESPs
- Unprotect for editing
- Fix incorrectly flagged mod

**How to Convert:**
1. Load ESM in FO4Edit
2. Click File Header
3. Right-click "Record Flags"
4. Edit
5. Uncheck "ESM"
6. OK
7. Save
8. Rename .esm → .esp (optional)

### 8.5 Merging Plugins

**What is Merging?**

Combining multiple plugins into one:
```
Before:
├─ WeaponModA.esp
├─ WeaponModB.esp
└─ WeaponModC.esp
   (3 plugin slots used)

After merging:
└─ WeaponModMerged.esp
   (1 plugin slot used)
```

**When to Merge:**

- Approaching 255 plugin limit
- Combining related mods
- Simplifying load order
- Creating all-in-one version

**How to Merge:**

1. Load all plugins to merge
2. Expand first plugin
3. Select all record types (hold Shift)
4. Right-click → "Deep copy as override into..."
5. Choose `<new file>.esp`
6. Name merged plugin
7. Repeat for other plugins
8. Add all originals as masters
9. Save merged plugin
10. Disable original plugins

**Example:**

```
Merging 3 weapon mods:

1. Load:
   - Fallout4.esm
   - WeaponA.esp
   - WeaponB.esp
   - WeaponC.esp

2. Select all of WeaponA's records
3. Deep copy to new "WeaponsMerged.esp"
4. Select all of WeaponB's records
5. Deep copy to "WeaponsMerged.esp"
6. Select all of WeaponC's records
7. Deep copy to "WeaponsMerged.esp"

8. WeaponsMerged.esp now contains all three
9. Add WeaponA, B, C as masters
10. Save

11. In mod manager:
    - Enable WeaponsMerged.esp
    - Disable WeaponA, B, C
```

**⚠️ Merging Caveats:**

**Don't merge:**
- Mods with scripts (will break)
- Mods with voice files (paths break)
- Mods with FaceGen (breaks)
- Complex quest mods
- Mods you don't own

**Safe to merge:**
- Simple weapon/armor mods
- Texture replacers
- Stat tweaks
- Small additions

### 8.6 Comparing Mod Versions

**Why Compare Versions?**

- See what changed in update
- Port changes to your version
- Understand mod differences
- Debug issues

**How to Compare:**

1. Load FO4Edit
2. Select ONLY the old version
3. Click OK
4. Right-click plugin in tree
5. "Compare To..."
6. Select new version file
7. Both versions load side-by-side
8. Apply filter to see differences

**Reading Comparison:**

```
OldVersion.esp | NewVersion.esp
----------------|----------------
Damage: 30      | Damage: 35      ← Changed
Value: 100      | Value: 100      ← Same
                | Keyword: New    ← Added
Weight: 2.0     |                 ← Removed
```

**Copying Between Versions:**

- Drag/drop from one version to other
- Copy changed records to your mod
- Port fixes from new to old
- Merge improvements

---

## 9. Advanced Utilities

### 9.1 Overview

FO4Edit includes specialized tools for advanced users:
- Building reference information
- Assets management
- Script application
- Reachability analysis

### 9.2 Building Reference Information

**What is Reference Info?**

Shows every place a record is used:

```
LaserPistol [WEAP:000D1D14] is used by:
├─ NPC: MinutemenSoldier
├─ LeveledItem: LL_Weapon_Energy
├─ Container: AmmoBox_Military
└─ FormList: WeaponList_Energy
```

**When to Use:**

- Finding all uses of an item
- Checking safe to delete
- Understanding dependencies
- Troubleshooting missing content

**How to Build:**

1. Load FO4Edit
2. Let it load normally
3. Right-click plugin
4. "Build Reference Info"
5. Wait (can take minutes)
6. Use "Referenced By" tab

**Example Usage:**

```
Question: "Is this armor used by any NPCs?"

1. Find armor record
2. Click on it
3. Open "Referenced By" tab
4. Shows all NPCs who have it
5. Also shows containers, leveled lists, etc.
```

### 9.3 Assets Manager

**What is Assets Manager?**

Tool to manage mod assets (textures, meshes, sounds):
- List all assets used
- Copy assets to folder
- Generate file lists
- Find unused assets

**How to Use:**

1. Load mod in FO4Edit
2. Right-click mod
3. "Apply Script"
4. Choose "Assets Manager"
5. Choose action:
   - List assets
   - Copy used assets
   - Generate file list

**Use Cases:**

**1. Packaging Mod:**
```
Need to distribute only files your mod uses
Use Assets Manager to copy them
Creates clean package
```

**2. Finding Missing Assets:**
```
Mod references texture that doesn't exist
Assets Manager lists it
You can find and add it
```

**3. Cleanup:**
```
Mod has unused assets
Assets Manager shows what's actually used
Delete the rest to save space
```

### 9.4 Scripting Support

FO4Edit supports custom Pascal scripts for automation.

**Script Location:**
```
FO4Edit\Edit Scripts\
```

**Running a Script:**

1. Load FO4Edit
2. Right-click plugin or record
3. "Apply Script"
4. Choose script from list
5. Script executes

**Common Scripts:**

- **Export to CSV** - Export records to spreadsheet
- **Import from CSV** - Import changes from spreadsheet
- **Batch rename** - Rename multiple records
- **Find and replace** - Text replacement
- **Asset Manager** - Manage mod assets
- **Various utilities** - Community contributed

**Creating Scripts:**

See FO4Edit scripting documentation:
- [Scripting Functions on CK Wiki](https://www.creationkit.com/fallout4:Papyrus_Introduction)
- Examples in Edit Scripts folder
- xEdit Discord for help

---

## 10. FAQ

### 10.1 Beginner Questions

**Q: What mods should I load in FO4Edit?**

A: Depends on your goal:
- **Conflict checking:** Load all mods
- **Cleaning a mod:** Load only that mod
- **Creating a patch:** Load the conflicting mods

**Q: Everything is red! Am I doomed?**

A: No! Red indicates conflicts, not necessarily problems. Many conflicts are intentional. Use The Method to handle them incrementally.

**Q: Should I clean all my mods?**

A: Only clean:
- Mods you created
- Mods where LOOT says to clean
- After checking mod description (some shouldn't be cleaned)

**Q: What's the difference between Quick Clean and Quick Auto Clean?**

A: Quick Auto Clean is better:
- Runs automatically
- Cleans 3 times
- Auto-saves
- No prompts needed

**Q: Can FO4Edit fix the "white face" bug?**

A: No, that's a FaceGen issue. Fix by:
- Regenerating FaceGen in CK
- Packing FaceGen in BSA
- Using correct load order

**Q: My game crashes after cleaning. Why?**

A: Rarely happens. Possible causes:
- Cleaned a mod that shouldn't be cleaned
- Navmesh issues (need CK to fix)
- Script issues (scripts can't be cleaned)

**Q: Where should my patch plugin load?**

A: After all mods it patches. Use LOOT or manually place it near the end.

### 10.2 Intermediate Questions

**Q: How do I remove a master from a plugin?**

A: Use "Clean Masters":
1. Load plugin
2. Right-click plugin
3. "Clean Masters"
4. Removes unused masters automatically

**Q: Can I have an ESP master another ESP?**

A: Yes! FO4Edit supports this. Creation Kit doesn't, so you can't edit such files in CK.

**Q: How do I convert ESP to ESM?**

A:
1. Load ESP
2. Click File Header
3. Edit Record Flags
4. Check ESM
5. Save
6. Optionally rename .esp → .esm

**Q: What's the difference between "Copy as override" and "Deep copy"?**

A:
- **Copy as override:** Copies one record
- **Deep copy:** Copies record and all children (e.g., DIAL + all INFO records)

**Q: Can I merge mods with scripts?**

A: Not recommended. Scripts are harder to merge and may break. Use merging for simple mods only.

**Q: How do I find which mod adds an item?**

A:
1. Get item's FormID (console: `help "item name"`)
2. Enter FormID in FO4Edit search
3. See which mod owns it

### 10.3 Advanced Questions

**Q: What happens if I compact FormIDs?**

A: FormIDs get renumbered sequentially. This:
- Breaks patches (they reference old FormIDs)
- Breaks voice files (named by FormID)
- Breaks FaceGen (named by FormID)
- Breaks any script using GetFormFromFile()

Only do if you're the author and regenerate all dependent files.

**Q: Can I remove the edit confirmation delay?**

A: Add command line parameter: `-IKnowWhatImDoing`

This disables safety warnings. Use carefully.

**Q: How do I edit master files?**

A: Add command line parameter: `-AllowMasterFilesEdit`

**⚠️ DANGER:** Only edit your own masters. Never edit Bethesda files.

**Q: Can I edit the File Header?**

A: With `-AllowMasterFilesEdit` parameter. But usually you shouldn't need to. Use "Add Masters", "Clean Masters", etc. instead.

**Q: What's the difference between ESL and ESL-flagged ESP?**

A:
- **.esl file:** Has ESM flag forced, loads early
- **.esp with ESL flag:** Loads in normal position, doesn't count toward limit

Both save plugin slots, but ESP is more flexible.

**Q: How do I create a ModGroup programmatically?**

A: Edit `.modgroups` file directly:

```
[MyModPack]
ModA.esm:12345678
ModB.esp:23456789
ModC.esp:34567890
```

CRC values (numbers after colon) validate file versions.

---

## 11. Appendices

### 11.1 ESL Format Details

**ESL FormID Structure:**

Normal plugin FormID:
```
XX AABBCC
└─ Load order (2 hex digits = 0-254)
   └─────── Record ID (6 hex digits = 16.7M records)
```

ESL plugin FormID:
```
FE XXX YYY
└─ Always FE (ESL space)
   └── ESL index (3 hex digits = 4,096 plugins)
       └── Record ID (3 hex digits = 4,096 records)
```

**Example:**

```
Normal ESP at position 0x1A:
1A 001234 = FormID for record 0x001234 in plugin 0x1A

ESL-flagged ESP at ESL index 0x005:
FE 005 234 = FormID for record 0x234 in ESL plugin 0x005
```

**ESL Requirements Summary:**

| Requirement | Limit | Notes |
|-------------|-------|-------|
| New records | < 4,096 | Records that belong to this plugin |
| FormID range | 0x000 - 0xFFF | Must fit in 3 hex digits |
| File size | Any | No size limit |
| Override records | Unlimited | Can override unlimited vanilla records |

**When ESL is Perfect:**

- Small mods (< 4,096 new items/NPCs/etc.)
- Patches (mostly overrides, few new records)
- Texture replacers (no new records)
- Minor tweaks

**When ESL Won't Work:**

- Large quest mods (too many records)
- Mods adding many items (> 4,096)
- Mods with FormIDs outside 0x000-0xFFF range

### 11.2 Command Line Parameters

**Complete Parameter List:**

```
# Mode Selection
-edit                          Enable edit mode
-view                          View mode only (no changes)

# Cleaning
-quickclean                    Quick clean with save prompt
-quickautoclean / -qac         Quick clean auto-save
-veryquickshowconflicts / -vqsc Auto-load and show conflicts

# ESL Operations
-setesm                        Set ESM flag
-clearesm                      Remove ESM flag
-PseudoESL                     Show which plugins could be ESL

# Safety Overrides
-IKnowWhatImDoing             Disable edit warnings
-AllowMasterFilesEdit          Allow editing master list
-NoAutoMarkModified            Prevent auto-marking modified
-ForceMarkModified             Always mark modified

# Paths
-C:<path>                      Cache directory
-S:<path>                      Scripts directory  
-D:<path>                      Data directory
-O:<path>                      Output directory
-I:<path>                      INI files path
-P:<path><file>               Custom plugins.txt

# Mod Manager
-moprofile:<name>              Load MO2 profile

# Other
-DontCache                     Disable caching
-DontCacheLoad                 Don't load cache
-DontCacheSave                 Don't save cache
-AllowDirectSaves:<files>      Direct save for specified files
```

**Usage Examples:**

```powershell
# Quick Auto Clean
FO4Edit.exe -quickautoclean

# Very Quick Show Conflicts
FO4Edit.exe -veryquickshowconflicts

# Load specific MO2 profile
FO4Edit.exe -moprofile:"Survival Playthrough"

# Edit mode with warnings disabled
FO4Edit.exe -edit -IKnowWhatImDoing

# Set ESL flag
FO4Edit.exe -PseudoESL
```

### 11.3 Keyboard Shortcuts

**Complete Shortcut Reference:**

**File Operations:**
- `Ctrl + S` - Save
- `Ctrl + Q` - Quit

**Navigation:**
- `Ctrl + F3` - Assets Browser
- `Alt + F3` - Worldspace Browser
- `Up/Down` - Navigate list
- `Left/Right` - Collapse/Expand
- `+` - Expand node
- `-` - Collapse node
- `*` - Expand all (recursive, slow!)
- `/` - Collapse all (recursive)
- `Alt + Left/Right` - Navigate while in View Tab

**Selection:**
- `Ctrl + Click` - Add to selection
- `Shift + Click` - Range select
- `Ctrl + A` - Select all

**Editing:**
- `F2` - Edit field/FormID
- `Double Click` - Edit field
- `Shift + Double Click` - Edit in popup window
- `Ctrl + C` - Copy
- `Ctrl + V` - Paste
- `Ctrl + X` - Cut
- `Delete` - Remove
- `Insert` - Add

**List Manipulation:**
- `Ctrl + Up/Down` - Move entry in list

**Bookmarks:**
- `Ctrl + 1-5` - Set bookmark
- `Alt + 1-5` - Jump to bookmark

**Search:**
- `Ctrl + F` - Find
- `F3` - Find next
- `Ctrl + Click` on FormID - Jump to record

**View Tab:**
- `Ctrl + W` - Weather editor (from weather record)

**Module Selection:**
- `Space` - Toggle selected plugin
- `Up/Down` - Navigate plugin list

**Console (during load):**
- `Ctrl + Alt + Shift` on startup - Delete settings

---

## 12. Conclusion

### Best Practices Summary

**For Mod Users:**

1. **Always use The Method**
   - Add mods one at a time
   - Resolve conflicts immediately
   - Create ModGroups
   - Maintain clean load order

2. **Clean mods when appropriate**
   - Check LOOT recommendations
   - Read mod descriptions first
   - Use Quick Auto Clean
   - Keep backups

3. **Check for errors**
   - Run "Check for Errors"
   - Report issues to authors
   - Don't use heavily broken mods

4. **Create patches when needed**
   - Combine changes from multiple mods
   - Load patches last
   - Document what they fix

5. **Test your changes**
   - Launch game after changes
   - Verify functionality
   - Check for crashes
   - Revert if problems

**For Mod Authors:**

1. **Clean before release**
   - Always run Quick Auto Clean
   - Check for errors
   - Fix any issues found
   - Document in description

2. **Minimize conflicts**
   - Only modify what you need
   - Avoid wild edits
   - Keep changes focused
   - Provide compatibility patches

3. **Document changes**
   - List what you modify
   - Explain intentional conflicts
   - Note incompatibilities
   - Update for patches

4. **Use proper formats**
   - ESL for small mods
   - ESM for frameworks
   - ESP for standard mods
   - Follow naming conventions

5. **Support users**
   - Respond to bug reports
   - Update for compatibility
   - Provide clear instructions
   - Consider compatibility patches

### Final Thoughts

FO4Edit is an essential tool for the Fallout 4 modding community. Whether you're a casual user trying to resolve a few conflicts, or a mod author creating the next great overhaul, understanding FO4Edit will improve your experience.

**Key Takeaways:**

- **Conflicts are normal** - Don't panic at red colors
- **Most conflicts are harmless** - Learn which to ignore
- **The Method works** - Incremental is better than all-at-once
- **Clean mods are happy mods** - Both users and authors benefit
- **Ask for help** - The community is supportive

**Resources for Continued Learning:**

- **xEdit Discord** - Active community, quick help
- **Nexus Mod Forums** - Mod-specific discussions
- **Creation Kit Wiki** - Understanding record types
- **LOOT** - Automated conflict detection
- **Mod Organizer 2** - Best mod manager for FO4Edit workflow

**Contributing:**

This guide is community-maintained. If you find errors, have suggestions, or want to contribute:
- Join xEdit Discord
- Post in documentation channel
- Help improve for future users

---

### Credits and Acknowledgments

**This Fallout 4 adaptation by:** Community Contributors

**Based on original Tome of xEdit by:**
- Miax (Kristopher Kortright)
- JustinOther
- EpFwip (HTML conversion)
- Sharlikran (maintenance and updates)

**xEdit Development Team:**
- ElminsterAU (original creator and current developer)
- Zilav
- Hlp
- Sharlikran

**Special Thanks:**
- The entire xEdit Discord community
- Mod authors who maintain clean mods
- Users who report issues and improvements
- Everyone who contributes to modding knowledge

**Tools Mentioned:**
- FO4Edit / xEdit
- Mod Organizer 2
- Vortex
- LOOT
- Wrye Bash
- Fallout 4 Creation Kit

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Compatible with:** FO4Edit 4.0.4+  
**Game Version:** Fallout 4 (all versions)

---

*This guide is provided as-is for educational purposes. Always backup your files before making changes. The authors are not responsible for any issues arising from use of this guide or FO4Edit.*
