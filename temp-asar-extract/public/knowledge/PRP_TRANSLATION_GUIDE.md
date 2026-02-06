# PRP Translation Guide

## Complete Guide to Translating the Unofficial Fallout 4 Precombines Patch

---

## Table of Contents

1. [Introduction](#introduction)
2. [Translation Overview](#translation-overview)
3. [Supported Languages](#supported-languages)
4. [Translation Scope](#translation-scope)
5. [Setting Up Translation Tools](#setting-up-translation-tools)
6. [Branch 80+ File Structure](#branch-80-file-structure)
7. [Translation Workflow](#translation-workflow)
8. [UFO4P String Synchronization](#ufo4p-string-synchronization)
9. [FOMOD Configuration Translation](#fomod-configuration-translation)
10. [Creating New Translations](#creating-new-translations)
11. [Contributing Translations](#contributing-translations)
12. [Language-Specific Notes](#language-specific-notes)
13. [Common Issues and Solutions](#common-issues-and-solutions)
14. [Future Translation Needs](#future-translation-needs)

---

## Introduction

PRP (Precombines Repair Pack) supports multiple languages to serve the global Fallout 4 modding community. Unlike many large mods, PRP has minimal unique translation needs since it's built on the foundation of vanilla Fallout 4 and the Unofficial Fallout 4 Patch.

This guide covers:
- How PRP translations are structured
- What needs translation
- Tools and processes for translating
- How to contribute new languages or updates

---

## Translation Overview

### What Makes PRP Special

**99% of PRP strings are:**
1. **Vanilla Fallout 4** - Already translated by Bethesda
2. **UFO4P (Unofficial Fallout 4 Patch)** - Already translated by community

**Only 1% are unique to PRP:**
- Future holotape audio subtitles (planned)
- Debug strings (mostly unused)
- FOMOD installer text (plugin descriptions)

### Translation vs Localization

**Important Distinction:**

**Translation:**
- Converting text from one language to another
- Word-for-word conversion
- What PRP needs

**Localization:**
- Full cultural adaptation
- Date/time/number formatting
- Language/region customization

**PRP Focus:** Translation only (text conversion)

### Why Minimal Translation?

```
PRP Composition:
├── Precombine Meshes (not translatable)
├── Visibility Data (not translatable)
├── Plugin Records (99% vanilla + UFO4P)
└── FOMOD Installer (needs translation)

Translation Needs:
├── Plugin strings (sync from UFO4P)
├── FOMOD text (translate from English)
└── Holotape subtitles (planned, currently unused)
```

---

## Supported Languages

### Current Language Status (Build 80+)

| Language | Status | Last Updated | Version | Translator(s) | Notes |
|----------|--------|--------------|---------|---|---|
| **English (American)** | ✅ Official | 2026 | Current | Starhammer | Default, always current |
| **Spanish (Spain)** | ✅ Complete | 2023 | 2.1.8 | kittyowilder | Fully maintained |
| **Italian** | ✅ Complete | 2023 | 2.1.8 | samyesu | Fully maintained |
| **Portuguese (Brazilian)** | ⚠️ Outdated | 2021 | 2.1.8 | Banned user | Needs update |
| **French** | ✅ Complete | 2023 | 2.1.8 | Oaristys & La Confrérie | Fully maintained |
| **Polish** | ✅ Complete | 2023 | 2.1.8 | Bartek3456 | Fully maintained |
| **Chinese (Simplified)** | ✅ Complete | 2023 | 2.1.8 | Vozhuo | Fully maintained |
| **Chinese (Traditional)** | ✅ Complete | 2023 | 2.1.8 | Vozhuo | Fully maintained |
| **Russian** | ✅ Complete | 2023 | 2.1.8 | Djezendopus | Maintained (historical: Slimer91, Perchik71) |
| **German** | ✅ Complete | Unknown | Unknown | SkyHorizon3 | Needs version verification |
| **Japanese** | ✅ Complete | 2023 | 2.1.8 | 2game Anonymous Group | Fully maintained |
| **Korean** | ⚠️ Pending | 2023 | 2.1.8 | Mitang12 | Ready for next update |

### Language Statistics

**Fully Maintained (5):**
- French, Spanish, Italian, Russian, Polish

**Well-Maintained (5):**
- Chinese (Simplified & Traditional), German, Japanese, Korean (pending)

**Needs Update (1):**
- Portuguese (Brazilian) - Contributor unavailable

### Adding New Languages

**Current Supporters Welcome:**
- If you translate for another Fallout 4 community language
- Pull request to GitHub repository
- Will be integrated into next build

**Process:**
1. Create translations in xTranslator XML format
2. Submit pull request to GitHub
3. Starhammer reviews
4. Added to next PRP build
5. Credited in mod page

---

## Translation Scope

### What Needs Translation in PRP

#### 1. Plugin Strings (90% of work)

**Source:** Vanilla Fallout 4 + UFO4P

**Examples:**
```
QUST Records:
- Quest names
- Quest objectives
- Dialogue conditions

MESG Records:
- Message boxes
- Notifications
- Confirmations

DIAL Records:
- NPC dialogue
- Response options
- Topic names
```

**How It Works:**
```
Vanilla Fallout 4 (English):
"The building is unstable"

UFO4P Translation (Spanish):
"El edificio es inestable"

PRP Uses:
- Same translation from UFO4P
- No additional work needed
```

#### 2. FOMOD Installer Text (5% of work)

**What It Is:** Installer interface text when installing PRP

**Examples:**
```
- "Select your game version"
- "Anniversary Edition"
- "Steam Downgrade"
- "Download and Install"
- Plugin descriptions
```

**How It Works:**
```
English (Default):
Select one:
☐ Anniversary Edition
☐ Steam Downgrade (NG)
☐ Steam Downgrade (OG)

Spanish Translation:
Selecciona uno:
☐ Anniversary Edition
☐ Steam Downgrade (NG)
☐ Steam Downgrade (OG)
```

**Where to Find:** GitHub - `dist/fomod/` folder

#### 3. Holotape Subtitles (5% of work - Future)

**Status:** Planned for future stable build

**What It Is:** Audio subtitles for holotape recording in game

**Currently:** Unused (debug strings from development)

**Future Need:** Will require translation when activated

**Examples:**
```
English:
"The precombines have been rebuilt..."

French:
"Les précombinés ont été reconstruits..."
```

### What Doesn't Need Translation

**Already Handled:**

1. **Mesh Files** - Not translatable (binary geometry data)
2. **Visibility Data** - Not translatable (occlusion calculations)
3. **Texture Files** - Not translatable (image data)
4. **Audio Files** - Pre-recorded, not translatable

**Inherited From Vanilla:**

1. **NPC Names** - Use vanilla translations
2. **Location Names** - Use vanilla translations
3. **Item Names** - Use vanilla translations

---

## Setting Up Translation Tools

### Required Software

#### xTranslator (Recommended)

**What It Is:** Bethesda modding tool for creating translations

**Download:**
- GitHub: Bethesda Modding Tools
- Or directly: Check Fallout modding communities

**Installation:**

```
Step 1: Download xTranslator
Step 2: Extract to folder (no installation needed)
Step 3: Run xTranslator.exe
Step 4: Configure source language (English)
Step 5: Ready to translate
```

**Key Features:**
- Opens Fallout 4 translation files
- Edit strings in table format
- Export/import XML format
- Supports multiple languages
- Built-in spellcheck

#### Alternative Tools

**Translation++ (FO4):**
- Similar to xTranslator
- Some prefer interface
- Works with same file format

**xEdit + Manual Editing:**
- More advanced
- Full plugin editing
- More complex

**Recommended:** xTranslator (easiest for translation work)

### Setting Up xTranslator

**Step 1: Configure Data Folder**

```
File → Preferences → Paths
Data Folder: C:\Games\Fallout4\Data
(Or wherever Fallout 4 is installed)
```

**Step 2: Select Translation Format**

```
Tools → Options → Format
Translation Format: .STRINGS (if available)
Encoding: UTF-8
```

**Step 3: Open Translation File**

```
File → Open
Navigate to translation XML file
Select language file
Click Open
```

**Step 4: Start Translating**

```
Interface shows:
[Left column] English strings
[Right column] Translated strings
Edit right column to add/update translations
```

### File Format

**xTranslator Export Format:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<strings>
  <string id="0">
    <lang name="English">
      <text>Select your game version</text>
    </lang>
    <lang name="Spanish">
      <text>Selecciona tu versión del juego</text>
    </lang>
  </string>
  
  <string id="1">
    <lang name="English">
      <text>Anniversary Edition</text>
    </lang>
    <lang name="Spanish">
      <text>Anniversary Edition</text>
    </lang>
  </string>
</strings>
```

**Format Details:**
- XML structure (human readable)
- Each string has ID
- Each language has separate section
- Text enclosed in `<text>` tags
- UTF-8 encoding for special characters

---

## Branch 80+ File Structure

### New Plugin Layout

**Branch 80+ provides only:**

```
Plugins Folder:
├── ppf.esm
├── ppf-modt.esm
├── ppf-ae.esm
└── prp.esp
```

### What This Means for Translation

#### ppf.esm (Base Precombine Foundation)

**Contents:**
- Core precombine definitions
- Vanilla precombine records
- UFO4P fixes

**Translation:** Sync from UFO4P (no additional work)

**Example Records:**
```
QUST - Quest records
MESG - Message records  
DIAL - Dialogue records
```

#### ppf-modt.esm (Modifications Update)

**New in Branch 80+**

**Contents:**
- Updates to precombine records
- Fixes and improvements
- Adjustment to base precombines

**Translation:** Check for new strings
- Usually minimal additions
- Often same as base
- Only translate if new strings added

**Example:**
```
If modt adds message:
"Precombine generation requires update"

This string needs translation
```

#### ppf-ae.esm (Anniversary Edition)

**New in Branch 80+**

**Contents:**
- Anniversary Edition CC content records
- Updated precombines for AE content
- AE-specific fixes

**Translation:** Needs special attention
- CC content strings need translation
- Often new Creation Club items/locations
- Some strings might not exist in UFO4P

**Example:**
```
New CC item: "Arcade Cabinet"
New location: "CC Settlement"

These need translation if new
```

#### prp.esp (Main PRP Plugin)

**Contents:**
- FOMOD configuration
- Plugin selection logic
- Load order information

**Translation:** FOMOD section only
- Installer text
- Option descriptions
- Language-specific messages

### Translation Changes in Branch 80+

**What Changed:**

```
Before (Older Branches):
- Monolithic plugin structure
- Fewer separate files
- Fewer translation points

After (Branch 80+):
- Modular plugin structure
- Four separate plugins
- More granular translation needs
- Better separation of concerns
```

**Translation Impact:**

```
More translation points:
├── ppf.esm (core)
├── ppf-modt.esm (new updates)
├── ppf-ae.esm (new AE content)
└── prp.esp (FOMOD)

Each may need updates
Each follows same workflow
```

---

## Translation Workflow

### Basic Translation Process

**Step 1: Identify Strings Needing Translation**

```
1. Open English version in xTranslator
2. Note all unique strings
3. Check against UFO4P translations
4. Mark new strings only
```

**Step 2: Translate New Strings**

```
1. Open existing translation (if available)
2. Add new strings to file
3. Provide translations
4. Verify spelling/grammar
5. Test formatting (line breaks, special chars)
```

**Step 3: Verify Translation**

```
1. Check consistency with UFO4P
2. Verify terminology matches
3. Test special characters (é, ñ, etc.)
4. Check line lengths (some UI has limits)
```

**Step 4: Format Export**

```
1. Export as XML from xTranslator
2. Verify encoding is UTF-8
3. Check XML syntax is valid
4. Save to correct folder
```

**Step 5: Test in Game**

```
1. Install PRP with new language
2. Launch game with language selected
3. Check FOMOD installer (if applicable)
4. Verify strings display correctly
5. Look for encoding errors (garbled text)
```

**Step 6: Contribute Back**

```
1. Create GitHub fork
2. Commit translation files
3. Submit pull request
4. Include language/version info
5. Wait for review
```

### Detailed Workflow - Complete Example

**Task:** Update French translation for Branch 80+

**Step 1: Prepare Environment**

```
Folder structure created:
PRP-Translation/
├── English/
│   ├── ppf.esm.strings
│   ├── ppf-modt.esm.strings
│   ├── ppf-ae.esm.strings
│   └── fomod/strings.xml
└── French/
    ├── ppf.esm.strings
    ├── ppf-modt.esm.strings
    ├── ppf-ae.esm.strings
    └── fomod/strings.xml
```

**Step 2: Open xTranslator**

```
1. Launch xTranslator
2. File → Open → English/ppf.esm.strings
3. Review all English strings
4. Note string IDs and content
```

**Step 3: Check UFO4P Base**

```
1. Open UFO4P French translation
2. Find matching strings in UFO4P
3. Copy translations that match
4. Mark which strings are from UFO4P
5. Identify new strings unique to PRP
```

**Step 4: Handle New Strings (ppf-modt.esm)**

```
Example: New string in ppf-modt.esm
English: "Precombine patch applied"

Workflow:
1. Check if UFO4P has similar string
2. If yes: Use UFO4P translation pattern
3. If no: Create appropriate French translation
4. Verify technical terminology
5. Add to translation file
```

**Step 5: Handle AE Content (ppf-ae.esm)**

```
Example: CC item translation
English: "Arcade Cabinet - PRP Precombine"

Issues:
1. "Arcade Cabinet" is CC content (from Bethesda)
2. Need to find official Bethesda French translation
3. Append PRP-specific text
4. Maintain consistency

Solution:
1. Check Bethesda official files for CC French names
2. Use official translation for CC part
3. Translate "- PRP Precombine" part
4. Combine: "[CC Translation] - Précombine PRP"
```

**Step 6: FOMOD Configuration**

```
File: fomod/strings.xml

English option:
<string id="101">
  <lang name="English">
    <text>Anniversary Edition</text>
  </lang>
</string>

Add French:
<string id="101">
  <lang name="English">
    <text>Anniversary Edition</text>
  </lang>
  <lang name="French">
    <text>Anniversary Edition</text>
  </lang>
</string>
```

**Step 7: Verification**

```
1. Run spellchecker in xTranslator
2. Check for untranslated strings (marked red)
3. Verify special characters display
4. Test XML syntax validity
5. Compare length with English (should be similar)
```

**Step 8: Export and Test**

```
1. xTranslator → File → Export
2. Save to appropriate language folder
3. Copy files to test Fallout 4 installation
4. Launch game with French selected
5. Verify text appears correctly
6. Check FOMOD installer displays French
7. Look for encoding issues
```

**Step 9: Prepare Contribution**

```
1. Create GitHub fork of PRP repo
2. Navigate to Translation/ folder
3. Place updated French files
4. Commit with message:
   "Update French translation for Branch 80+"
5. Include in commit message:
   - Language: French
   - Version updated: 2.1.8 → [new version]
   - Strings added: 3 new
   - Strings modified: 2 modified
```

**Step 10: Submit Pull Request**

```
1. Go to GitHub (ModernPrecombines repo)
2. Click "Pull Requests"
3. Click "New Pull Request"
4. Select your fork → main repo
5. Add title: "Update French Translation - Branch 80+"
6. Add description:
   - What was updated
   - Who translated
   - Testing performed
7. Submit
```

---

## UFO4P String Synchronization

### Understanding String Reuse

**Key Concept:** PRP reuses UFO4P translations to minimize work

**How It Works:**

```
UFO4P Translation Already Completed:
- 15,000+ Spanish strings translated
- 15,000+ French strings translated
- etc.

PRP Process:
1. Identify which strings come from vanilla + UFO4P
2. Extract translations from UFO4P files
3. Copy to PRP translation files
4. Only translate unique PRP additions

Result:
- Minimal new work
- Consistency with UFO4P
- Faster translation updates
```

### Finding UFO4P String Matches

**Step 1: Identify Source**

```
PRP String: "Unofficial Patch Applied"

Check UFO4P:
1. Does UFO4P have this string?
2. Open UFO4P translation files
3. Search for same string ID
4. Find translation
```

**Step 2: Copy Translation**

```
UFO4P French translation:
"Patch Officiel Appliqué"

PRP French translation:
Add: "Patch Officiel Appliqué"
(Same as UFO4P)

Benefits:
- Consistency across patches
- UFO4P translators' work respected
- Faster workflow
```

**Step 3: Update When UFO4P Updates**

```
When new UFO4P version released:
1. Check if PRP strings changed
2. Update matching strings from UFO4P
3. Maintain translations for PRP-unique strings
4. Test for compatibility
```

### Synchronization Checklist

When updating PRP translations:

```
☐ UFO4P version identified
☐ UFO4P translation files obtained
☐ String IDs cross-referenced
☐ Matching strings copied
☐ Unique PRP strings identified
☐ New translations created
☐ Terminology consistency checked
☐ Formatting preserved
☐ Special characters correct
☐ XML syntax valid
```

### String Comparison Example

**Comparing UFO4P and PRP Strings:**

```
UFO4P 2.1.8 Spanish:
├── QUEST "The Republic of Dave"
│   └── Objective: "Examinar el campamento"
├── MESSAGE "Settlement needs food"
│   └── Translation: "El asentamiento necesita comida"
└── DIALOGUE "Welcome to Vault-Tec"
    └── Response: "Me gustaría comprar un traje"

PRP (using same translations):
├── QUEST record (uses UFO4P Spanish)
├── MESSAGE record (uses UFO4P Spanish)
├── DIALOGUE record (uses UFO4P Spanish)
└── NEW: FOMOD strings (translate new)
```

---

## FOMOD Configuration Translation

### What Is FOMOD?

**FOMOD:** Fallout Mod Organizer

**What It Does:** Interactive installer for mods

**In PRP:** Selects which plugins/languages to install

### FOMOD Structure in PRP

**File Location:**

```
dist/fomod/
├── ModuleConfig.xml (installer logic)
├── Info.xml (mod metadata)
└── lang/ (language files)
    ├── English/
    │   └── strings.xml
    ├── Spanish/
    │   └── strings.xml
    ├── French/
    │   └── strings.xml
    └── [other languages]
```

### Strings That Need Translation

**In ModuleConfig.xml:**

```xml
<moduleName>PRP - Unofficial Fallout 4 Precombines Patch</moduleName>

<step name="0">
  <optionalFileGroups>
    <group name="Select your game version">
      <plugins order="Explicit">
        <plugin name="Anniversary Edition (AE)">
          <description>Select if you have Anniversary Edition</description>
        </plugin>
```

**Translatable Parts:**
1. `<moduleName>` - Mod name
2. `<group name>` - Option group titles
3. `<plugin name>` - Plugin names/descriptions
4. `<description>` - Option descriptions

### Language File Structure

**Example: Spanish strings.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<strings>
  <string id="1">
    <lang name="English">
      <text>Select your game version</text>
    </lang>
    <lang name="Spanish">
      <text>Selecciona tu versión del juego</text>
    </lang>
  </string>

  <string id="2">
    <lang name="English">
      <text>Anniversary Edition (Recommended)</text>
    </lang>
    <lang name="Spanish">
      <text>Anniversary Edition (Recomendado)</text>
    </lang>
  </string>

  <string id="3">
    <lang name="English">
      <text>Contains all latest fixes and improvements</text>
    </lang>
    <lang name="Spanish">
      <text>Contiene todos los últimos arreglos y mejoras</text>
    </lang>
  </string>
</strings>
```

### Common FOMOD Strings Needing Translation

```
Installation Step 1:
- "Select your game version"
- "Anniversary Edition (Recommended)"
- "Steam Downgrade (NG)"
- "Steam Downgrade (OG)"

Installation Step 2:
- "Core Meshes"
- "PRP Stable (Recommended)"
- "PRP Unstable (Experimental)"

Installation Step 3:
- "Optional Patches"
- "Sim Settlements 2 Support"
- "Nuka World Expansion"
- "Additional Patches"

Installation Step 4:
- "Select Language"
- [All language names]

Installation Step 5:
- "Review your selections"
- "Confirm installation"
- "Install" button
- "Cancel" button
```

### Adding New Language to FOMOD

**Step 1: Create Language Folder**

```
dist/fomod/lang/[LanguageCode]/
Example:
dist/fomod/lang/Spanish/
dist/fomod/lang/French/
dist/fomod/lang/German/
```

**Step 2: Create strings.xml**

```
Copy from English version:
dist/fomod/lang/English/strings.xml

Paste as:
dist/fomod/lang/[Language]/strings.xml
```

**Step 3: Translate All Strings**

```
For each <string> section:
1. Keep English text unchanged
2. Add [Language] translation
3. Verify special characters
4. Check formatting
```

**Step 4: Update ModuleConfig.xml**

```
Add language reference:
<moduleName xml:lang="Spanish">
  PRP - Parche de Precombinaciones no Oficial de Fallout 4
</moduleName>

(If mod name needs localization)
```

**Step 5: Test Installation**

```
1. Place modified fomod folder in PRP installation
2. Launch mod installer
3. Select language from dropdown
4. Verify all text displays in that language
5. Verify no encoding errors (garbled text)
6. Complete installation
```

---

## Creating New Translations

### For Languages Not Yet Supported

**Process:**

**Step 1: Verify Language Not Already Planned**

```
Check current language list (see Supported Languages section)
- If already translated: Use existing
- If pending: Wait for integration
- If not listed: Ready to create new
```

**Step 2: Prepare Translation Files**

```
Gather English source files:
- ppf.esm (strings)
- ppf-modt.esm (strings)
- ppf-ae.esm (strings)
- fomod/ModuleConfig.xml
- fomod/lang/English/strings.xml
```

**Step 3: Set Up xTranslator**

```
1. Open xTranslator
2. File → New Translation
3. Select English as source
4. Set target language: [Your Language]
5. Configure encoding: UTF-8
```

**Step 4: Translate All Strings**

```
For ppf.esm, ppf-modt.esm, ppf-ae.esm:
1. Create new file for target language
2. Copy English strings
3. Translate each string
4. Verify for accuracy
5. Maintain terminology consistency

For FOMOD:
1. Create lang/[Language]/ folder
2. Create strings.xml
3. Translate installer text
4. Verify UI displays correctly
```

**Step 5: Verify Against UFO4P**

```
1. Get UFO4P translation for your language
2. Find matching strings in UFO4P
3. Use UFO4P translations where applicable
4. Only create unique translations where needed
5. Maintain terminology consistency
```

**Step 6: Test Thoroughly**

```
1. Place translation files in test Fallout 4
2. Select language in game settings
3. Load PRP with your language selected
4. Verify FOMOD installer uses language
5. Verify in-game strings display correctly
6. Check for encoding errors
7. Check text doesn't overflow UI
```

**Step 7: Prepare for Contribution**

```
Organize files:
Translation/[LanguageCode]/
├── ppf.esm.strings
├── ppf-modt.esm.strings
├── ppf-ae.esm.strings
└── fomod/strings.xml

Create documentation:
- Language: [Full Language Name]
- Code: [Language Code]
- Translator(s): [Your Name(s)]
- Based on: UFO4P 2.1.8
- Completed: [Date]
```

### Example: Creating Korean Translation

**Step 1: Verify Not Already Done**

```
Korean Status: Pending integration (available)
Translator: Mitang12
Version: 2.1.8

Decision: Use existing, integrate for Branch 80+
```

**Step 2: Get UFO4P Korean**

```
1. Download UFO4P Korean translation
2. Version 2.1.8 (matching PRP base)
3. Open in xTranslator
4. Extract string IDs and translations
```

**Step 3: Copy Base Translations**

```
PPF strings that match UFO4P:
1. Identify matching string IDs
2. Copy Korean translations
3. Apply to ppf.esm Korean file
4. Note which strings came from UFO4P
```

**Step 4: Translate New Content**

```
ppf-modt.esm additions:
1. Identify new strings
2. Check if UFO4P has similar strings
3. Create Korean translations
4. Use consistent terminology

ppf-ae.esm (Anniversary Edition):
1. Check official Bethesda CC Korean names
2. Use official names for CC items
3. Translate PRP-specific additions
4. Maintain formatting
```

**Step 5: FOMOD Strings**

```
Create: Translation/Korean/fomod/strings.xml

Translate installer text:
- "Anniversary Edition 선택"
- "안정적인 PRP (권장됨)"
- "한국어 선택"
- etc.
```

**Step 6: Test**

```
1. Copy Korean translation files to test Fallout 4
2. Set game language to Korean (if available)
3. Run PRP installer
4. Verify Korean text appears
5. Verify no encoding issues (no garbled characters)
6. Play briefly to verify in-game strings
```

**Step 7: Submit**

```
Create pull request:
- Title: "Add Korean Translation - Branch 80+"
- Description:
  - Language: Korean
  - Translator: Mitang12
  - Based on: UFO4P 2.1.8
  - Strings translated: X
  - Tested: Yes
- Include files:
  - ppf.esm.ko.strings
  - ppf-modt.esm.ko.strings
  - ppf-ae.esm.ko.strings
  - fomod/lang/Korean/strings.xml
```

---

## Contributing Translations

### GitHub Workflow for Contributors

**Step 1: Set Up GitHub Account**

```
1. Create account at github.com (if not already)
2. Verify email address
3. Install Git for Windows (or your OS)
4. Configure Git:
   git config --global user.name "Your Name"
   git config --global user.email "your@email.com"
```

**Step 2: Fork Repository**

```
1. Go to: github.com/Diskmaster/ModernPrecombines
2. Click "Fork" button (top right)
3. Creates personal copy: github.com/YourUsername/ModernPrecombines
```

**Step 3: Clone Fork Locally**

```
1. Open Git Bash or terminal
2. Create folder for project:
   mkdir ~/FO4Modding
   cd ~/FO4Modding

3. Clone your fork:
   git clone https://github.com/YourUsername/ModernPrecombines.git
   cd ModernPrecombines
```

**Step 4: Create Branch for Your Changes**

```
1. Create new branch:
   git checkout -b update-french-translation

2. This isolates your changes from main
3. Branch name should reflect what you're doing
```

**Step 5: Make Translation Changes**

```
1. Navigate to: Translation/ folder
2. Update or create language files
3. Place in correct structure:
   Translation/French/
   ├── ppf.esm.strings
   ├── ppf-modt.esm.strings
   ├── ppf-ae.esm.strings
   └── fomod/strings.xml
```

**Step 6: Commit Changes**

```
1. Check what changed:
   git status

2. Stage files:
   git add Translation/French/

3. Commit with message:
   git commit -m "Update French translation for Branch 80+
   
   - Added new strings for ppf-modt.esm
   - Added new strings for ppf-ae.esm
   - Updated FOMOD French strings
   - Synchronized with UFO4P 2.1.8
   - Tested in game, verified encoding"

4. Message format:
   - First line: Brief summary
   - Blank line
   - Bullet points: What changed
   - Why changed (if not obvious)
```

**Step 7: Push to GitHub**

```
1. Push your branch:
   git push origin update-french-translation

2. Creates branch on your GitHub fork
3. Visible at: github.com/YourUsername/ModernPrecombines
```

**Step 8: Create Pull Request**

```
1. Go to original repo: github.com/Diskmaster/ModernPrecombines
2. You'll see notification about your pushed branch
3. Click "Compare & pull request"
4. OR: Click "Pull Requests" tab → "New Pull Request"

5. Fill in PR details:
   
   Title:
   "Update French Translation - Branch 80+"
   
   Description:
   "
   ## Translation Update
   
   **Language:** French
   **Translator(s):** Oaristys
   **Updated from:** 2.1.8
   **New Strings:** 3
   **Modified Strings:** 2
   
   ## Changes Made
   - Updated ppf-modt.esm French strings
   - Added ppf-ae.esm French translations
   - Updated FOMOD installer French text
   
   ## Testing
   - [x] All strings translated
   - [x] Tested in game
   - [x] No encoding errors
   - [x] Synchronized with UFO4P
   - [x] Reviewed for consistency
   
   ## Notes
   Strings synchronized from UFO4P 2.1.8 where applicable.
   Only new PRP-specific strings translated fresh.
   "
```

**Step 9: Respond to Review**

```
Starhammer may request changes:
1. Read feedback carefully
2. Make requested changes
3. Commit again:
   git add .
   git commit -m "Address review feedback"
   
4. Push updated changes:
   git push origin update-french-translation
   
5. PR updates automatically
6. Continue until approved
```

**Step 10: Merge**

```
Once approved:
1. Starhammer clicks "Merge" on PR
2. Your branch merges into main
3. Included in next PRP build
4. You're credited as translator
5. Clean up local branch:
   git checkout main
   git branch -d update-french-translation
```

### Pull Request Best Practices

**What Makes a Good PR:**

✅ **Clear Title**
```
Good: "Update French Translation - Branch 80+"
Bad: "fix stuff"
```

✅ **Detailed Description**
```
Good: Explains what changed, why, and testing done
Bad: Just files, no explanation
```

✅ **Focused Changes**
```
Good: Only translation changes
Bad: Mix of translation + code changes
```

✅ **Testing Complete**
```
Good: Tested in-game, verified encoding
Bad: "Just submitted, haven't tested"
```

✅ **Consistent Terminology**
```
Good: Terms consistent with UFO4P/game
Bad: Random translations that don't match
```

### Handling Feedback

**Common Feedback Types:**

**Type 1: Terminology Issue**
```
Feedback: "Use 'Parche' not 'Patch' for consistency"
Response: 
1. Understand the correction
2. Update all instances
3. Thank the reviewer
4. Make follow-up commit
```

**Type 2: Encoding Error**
```
Feedback: "French accents showing as ???"
Response:
1. Verify file saved as UTF-8
2. Check xTranslator encoding settings
3. Re-export file
4. Re-upload to PR
```

**Type 3: Missing Strings**
```
Feedback: "ppf-ae.esm has untranslated strings"
Response:
1. Review ppf-ae.esm in xTranslator
2. Find untranslated strings
3. Translate them
4. Add to PR
```

**Type 4: Approval**
```
Feedback: "Looks great! Merging..."
Response:
1. Congratulations!
2. Your translation is in next build
3. You're credited
4. No further action needed
```

---

## Language-Specific Notes

### Considerations by Language

#### Spanish (Spain)

**Translator:** kittyowilder (Last updated 2.1.8)

**Notes:**
- Established translation base from 2.1.8
- Terminology documented in kittyowilder's notes
- Consider regional differences (Spain vs. Latin America variants)

**Update Process:**
1. Contact kittyowilder if available
2. Use existing terminology guide
3. Update for Branch 80+ additions
4. Test with Spanish Fallout 4 version

#### Italian

**Translator:** samyesu (Last updated 2.1.8)

**Notes:**
- Well-established Italian gaming terminology
- Italian accents and characters important
- Verify encoding (à, é, ì, ò, ù)

**Update Process:**
1. Build on samyesu's 2.1.8 base
2. Add new strings only
3. Maintain consistency with samyesu's style
4. UTF-8 encoding required for accents

#### Portuguese (Brazilian)

**Status:** Outdated - needs new translator

**Current Issue:**
- Original translator: Banned user
- Translation from 2.1.8 exists but needs update
- No active maintainer

**Opportunity for Contribution:**
1. If Portuguese speaker: Consider taking over
2. Translation base exists (can build from)
3. Contact Starhammer if interested
4. Would be appreciated by Brazilian community

**Update Process (if taking over):**
1. Get existing Portuguese translation
2. Review for accuracy
3. Update for Branch 80+
4. Test in Portuguese Fallout 4
5. Submit pull request
6. Offer to maintain for future updates

#### French

**Translators:** Oaristys and La Confrérie des Traducteurs (Last updated 2.1.8)

**Notes:**
- Professional translation team involved
- High-quality, consistent terminology
- Organized translation approach
- Excellent documentation

**Update Process:**
1. Contact Oaristys or La Confrérie
2. Use their terminology guide
3. Build on 2.1.8 base
4. Add Branch 80+ strings
5. Follow their QA process
6. Submit coordinated PR

#### Polish

**Translator:** Bartek3456 (Last updated 2.1.8)

**Notes:**
- Polish-specific grammar rules
- Special characters: ą, ć, ę, ł, ń, ó, ś, ź, ż
- Verb conjugation important

**Update Process:**
1. Contact Bartek3456 if available
2. Use 2.1.8 terminology
3. Update Branch 80+ strings
4. Verify character encoding
5. Test with Polish Fallout 4

#### Chinese (Simplified & Traditional)

**Translator:** Vozhuo (Last updated 2.1.8)

**Notes:**
- Both variants maintained by same person
- Context important for tone selection
- Fallout-specific gaming terminology
- Simplified vs. Traditional has key differences

**Update Process:**
1. Contact Vozhuo if available
2. Get both variants from 2.1.8
3. Update both for Branch 80+
4. Verify character encoding (UTF-8 for CJK)
5. Test with corresponding Fallout 4 version

#### Russian

**Translator:** Djezendopus (Last updated 2.1.8)

**Historical:** Slimer91, Perchik71 also contributed

**Notes:**
- Complex Russian grammar
- Gender-specific conjugations important
- Multiple Cyrillic characters to consider
- Terminology documentation needed

**Update Process:**
1. Contact Djezendopus
2. Use 2.1.8 base and terminology
3. Maintain consistency with historical work
4. Update Branch 80+ strings
5. Verify Cyrillic encoding
6. Test in Russian Fallout 4

#### German

**Translator:** SkyHorizon3 (Version unknown - needs verification)

**Notes:**
- German has compound words (may require special handling)
- Umlauts: ä, ö, ü, and ß
- Capitalization rules specific to German

**Update Process:**
1. Verify exact version SkyHorizon3 translated
2. Contact SkyHorizon3 if available
3. Update for Branch 80+
4. Maintain German terminology conventions
5. Verify character encoding
6. Test in German Fallout 4

#### Japanese

**Translator:** Anonymous group from 2game (Last updated 2.1.8)

**Notes:**
- Japanese context-dependent (formal vs. casual)
- Multiple writing systems (Hiragana, Katakana, Kanji)
- Gaming terminology standardized in Japan community

**Update Process:**
1. Contact 2game community if available
2. Use 2.1.8 as base
3. Update Branch 80+ strings
4. Consider Fallout-specific Japanese terms
5. Verify encoding (UTF-8 for Japanese)
6. Test in Japanese Fallout 4

#### Korean

**Translator:** Mitang12 (Last updated 2.1.8)

**Status:** Pending integration in next update

**Notes:**
- Korean Hangul standard writing system
- Gaming terminology established in Korean modding community
- Ready for integration

**Update Process:**
1. Mitang12's translation ready to integrate
2. Will be included in next stable release
3. Future updates follow same pattern
4. Contact Mitang12 for next updates

#### Languages Not Yet Supported

**Requesting New Language Support:**

If you want to translate PRP into a new language:

1. **Document your language:**
   - Full name
   - Language code (e.g., "pt-BR" for Portuguese-Brazil)
   - Dialect/variant (if applicable)

2. **Prepare translations:**
   - Complete all four plugins
   - Complete FOMOD strings
   - Test thoroughly
   - Document terminology

3. **Submit pull request:**
   - Follow GitHub workflow
   - Include complete translation
   - Offer to maintain
   - Note compatibility with UFO4P version

4. **Integration:**
   - Starhammer reviews
   - Added to next build
   - You credited as translator
   - Ongoing maintenance role (optional)

---

## Common Issues and Solutions

### Encoding Problems

**Problem: Garbled Text in Game**

```
Symptoms:
- Special characters show as ???
- Accents missing (é becomes e)
- Non-Latin characters corrupted
- Text displays incorrectly in installer
```

**Common Causes:**

1. **File Not Saved as UTF-8**
```
Solution:
1. Open file in text editor
2. File → Save As
3. Encoding: UTF-8 (with BOM optional)
4. Save file
5. Re-export from xTranslator
```

2. **xTranslator Not Configured for UTF-8**
```
Solution:
1. Open xTranslator
2. Tools → Options
3. Encoding: UTF-8
4. Re-open translation files
5. Re-export
```

3. **Paste from Wrong Source**
```
Solution:
1. Avoid copy-pasting from web pages
2. Use xTranslator directly
3. Or copy from known-good translation file
4. Verify encoding of source
```

**Verification:**
```
After fixing:
1. Open file in xTranslator
2. Check special characters display correctly
3. Export and test in game
4. Verify no ??? or corruption
```

### String Mismatch Issues

**Problem: Translation Not Appearing in Game**

```
Symptoms:
- Text shows in English instead of translation
- Only some translations work
- FOMOD shows English, not translated
```

**Common Causes:**

1. **String IDs Don't Match**
```
Example:
English: id="101" = "Select Version"
French: id="102" = "Sélectionnez Version"

String IDs don't match → French string ignored

Solution:
1. Verify English version's string IDs
2. Match French IDs exactly
3. IDs must be identical
4. Re-export from xTranslator
```

2. **Missing Strings in Translation**
```
Example:
English has 50 strings
French file has only 45

Fallout 4 can't find French for 5 strings
Falls back to English

Solution:
1. Open English and French side-by-side
2. Find missing strings
3. Add them to French file
4. Verify all strings present
```

3. **Wrong Language Code**
```
Example:
Fallout 4 language: "Spanish (Spain)"
Translation file: French strings with Spanish ID

Game can't find Spanish → Uses English

Solution:
1. Verify game language selection
2. Check translation file language code
3. Codes must match:
   - es-ES for Spanish (Spain)
   - fr-FR for French
   - de-DE for German
   - etc.
```

### FOMOD Installer Issues

**Problem: FOMOD Text Not Translated**

```
Symptoms:
- Installer shows English
- Even though language selected
- No error messages
```

**Causes:**

1. **Language Folder Not Present**
```
Missing: dist/fomod/lang/French/
But requesting French translation

Solution:
1. Create folder: dist/fomod/lang/French/
2. Create file: strings.xml
3. Copy and translate from English version
4. Test installer again
```

2. **strings.xml Not Found**
```
Folder exists: dist/fomod/lang/French/
But file missing: strings.xml

Solution:
1. Create strings.xml
2. Copy from English version
3. Translate all <text> elements
4. Save as UTF-8
5. Test
```

3. **XML Syntax Error**
```
Example error in strings.xml:
<text>Select Version<text>  ← Missing closing /
<lang name"English">  ← Missing equals sign
Missing closing </strings> tag
```

**Solution:**
1. Open strings.xml in XML validator (online)
2. Fix reported syntax errors
3. Common issues:
   - Unclosed tags
   - Missing equals signs
   - Special XML characters not escaped (&, <, >)
4. Save and test

### Performance Issues During Translation

**Problem: xTranslator Slow/Crashes**

```
Symptoms:
- Takes long time to open files
- Freezes when typing
- Crashes when exporting
```

**Causes:**

1. **File Too Large**
```
Solution:
1. Close other programs
2. Increase RAM available
3. Work on smaller file segments
4. Restart xTranslator occasionally
```

2. **Too Many Languages in One File**
```
Solution:
1. Work with one language at a time
2. Don't open all 10+ languages simultaneously
3. Open English + target language only
4. Export, then switch languages
```

3. **Fallout 4 Running**
```
Can lock translation files if game running

Solution:
1. Close Fallout 4 completely
2. Close mod manager
3. Close xEdit if open
4. Then open xTranslator
5. No file locks → faster performance
```

---

## Future Translation Needs

### Holotape Subtitles (Planned)

**Status:** Future addition to PRP

**What It Is:** Audio recording holotape with subtitles

**Current Status:**
- Planned for future stable build
- Debug strings currently unused
- Will need translation when activated

**Example (Planned):**
```
English: "The precombines have been rebuilt..."
French: "Les précombinés ont été reconstruits..."
Spanish: "Los precombinados han sido reconstruidos..."
German: "Die vorgemischten Maschen wurden neu erstellt..."
```

**Timeline:** Unclear, but likely several months away

**Translator Preparation:**
1. Monitor PRP changelog
2. When holotape added to changelog
3. Will need immediate translation
4. Follow same workflow as plugin strings
5. Use xTranslator to add strings

### CC Content Expansions

**Scenario:** Bethesda releases new Creation Club content

**Impact on PRP:**
1. New CC items might need precombine updates
2. ppf-ae.esm may need new entries
3. New strings might appear

**Translation Requirement:**
1. Translate new CC item names
2. Use official Bethesda translations if available
3. Check each language's official CC names
4. Maintain consistency

**Process:**
1. Watch for PRP changelog mentioning CC updates
2. Get list of new CC items
3. Find official translations for CC items
4. Add PRP-specific translation if needed
5. Submit update

### Expansion Beyond Current Scope

**Potential Future Changes:**

**Scenario 1: New Quest Content**
- If PRP adds quest-related content
- Would need full dialogue translation
- More work than current setup

**Scenario 2: Settlement Precombine Integration**
- If PRP integrates settlement mod precombines
- New plugin for settlement content
- Translations for settlement mods' strings needed

**Scenario 3: Mod-Specific Variants**
- If PRP creates variants for major mods
- Each variant might need translation
- Multiplicative translation work

**Current:** None of these are planned

**If Planned:** Translators would be notified well in advance

---

## Translation Contributor Credits

### Current Translators (Branch 80+)

**English (American)**
- Starhammer (Primary developer)
- Continuously updated

**Spanish (Spain)**
- kittyowilder
- Last updated: 2023 (2.1.8 base)
- Status: Active

**Italian**
- samyesu
- Last updated: 2023 (2.1.8 base)
- Status: Active

**French**
- Oaristys
- La Confrérie des Traducteurs group
- Last updated: 2023 (2.1.8 base)
- Status: Active (coordinated team)

**Polish**
- Bartek3456
- Last updated: 2023 (2.1.8 base)
- Status: Active

**Chinese (Simplified)**
- Vozhuo
- Last updated: 2023 (2.1.8 base)
- Status: Active

**Chinese (Traditional)**
- Vozhuo
- Last updated: 2023 (2.1.8 base)
- Status: Active

**Russian**
- Djezendopus (Current maintainer)
- Slimer91 (Historical contributor)
- Perchik71 (Historical contributor)
- Last updated: 2023 (2.1.8 base)
- Status: Active

**German**
- SkyHorizon3
- Version: Unknown (needs verification)
- Status: Active (version check needed)

**Japanese**
- Anonymous group from 2game
- Last updated: 2023 (2.1.8 base)
- Status: Active (community-maintained)

**Korean**
- Mitang12
- Last updated: 2023 (2.1.8 base)
- Status: Pending integration (ready to merge)

### How to Become a Translator

**If You Want to Help:**

1. **For Existing Languages:**
   - Contact current translator
   - Offer to help with updates
   - Offer to maintain going forward

2. **For New Languages:**
   - Start translation project
   - Complete all strings
   - Test thoroughly
   - Submit as pull request
   - Offer to maintain

3. **For Improvements:**
   - Suggest terminology improvements
   - Submit corrections via GitHub issues
   - Help with testing translations
   - Provide community feedback

4. **Support:**
   - Starhammer reviews contributions
   - Community Discord provides support
   - Collective Modding server helpful
   - PJM available for technical questions

---

## Quick Reference

### Translation File Checklist

When submitting translation update:

```
☐ English version reviewed for changes
☐ New strings identified
☐ UFO4P translations checked for matches
☐ Terminology consistency verified
☐ All special characters included
☐ File encoding: UTF-8
☐ XML syntax validated
☐ xTranslator format verified
☐ Tested in game (if possible)
☐ No encoding errors (no garbled text)
☐ FOMOD installer tested (if applicable)
☐ Pull request title clear
☐ PR description detailed
☐ Contact info provided (GitHub username)
```

### Common String Translation Examples

**FOMOD Installer (English → Various Languages):**

| English | Spanish | French | German |
|---------|---------|--------|--------|
| Select game version | Selecciona versión | Sélectionnez version | Wähle Spielversion |
| Anniversary Edition | Anniversary Edition | Anniversary Edition | Anniversary Edition |
| Recommended | Recomendado | Recommandé | Empfohlen |
| Download | Descargar | Télécharger | Herunterladen |
| Install | Instalar | Installer | Installieren |

### File Locations Quick Reference

```
GitHub Repository:
github.com/Diskmaster/ModernPrecombines

Translation Files:
github.com/Diskmaster/ModernPrecombines/tree/main/Translation

FOMOD Configuration:
github.com/Diskmaster/ModernPrecombines/tree/main/dist/fomod

Fallout 4 Data Folder:
C:\Games\Fallout 4\Data\

Translation Output (after testing):
C:\Games\Fallout 4\Data\Strings\

Local Clone:
~/FO4Modding/ModernPrecombines/
```

---

## Glossary

**xTranslator:** Tool for editing Fallout 4 translations

**FOMOD:** Fallout Mod Organizer (installer system)

**String ID:** Unique identifier for translatable text

**UTF-8:** Character encoding supporting all languages

**Encoding:** How text characters are represented in files

**XML:** Markup language used for translation files

**Pull Request (PR):** Submitting changes to repository

**Fork:** Personal copy of repository

**Branch:** Isolated line of development

**Merge:** Combining changes into main repository

**Commit:** Saving changes to Git with message

**UFO4P:** Unofficial Fallout 4 Patch

**PPF:** Precombine Foundation (core PRP plugin)

**AE:** Anniversary Edition of Fallout 4

**NG:** Steam Downgrade version (New Game)

**OG:** Original version (Old Game/GOG)

---

## Conclusion

PRP translations are community-driven efforts leveraging existing UFO4P work. With 99% of strings already translated through UFO4P, updating PRP for new branches is manageable even for non-professional translators.

**Key Takeaways:**

✅ Most translation work already done via UFO4P
✅ Focus on 1% unique to PRP
✅ Use xTranslator for consistency
✅ Test in-game before submitting
✅ Contribute via GitHub pull requests
✅ Join community for support

**Thank you to all translators who maintain PRP in multiple languages!**

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Compatible with:** PRP Branch 80+  
**Maintained by:** Community Documentation