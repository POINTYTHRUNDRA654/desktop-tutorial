# Mod Packaging Engine - Complete Guide

## Overview

The **Mod Packaging Engine** is a comprehensive system for packaging Fallout 4 mods for distribution on Nexus Mods and other platforms. It provides an 8-step wizard workflow that guides users through the entire packaging process, from project selection to final export.

## Features

### Core Capabilities

- ✅ **Structure Validation** - Automatic validation of mod folder structure
- 📝 **README Generation** - Multiple templates (Default, Nexus BBCode, GitHub Markdown, Simple)
- 📋 **Changelog Management** - Version-based changelog with automatic appending
- 🗜️ **Archive Creation** - Support for 7z, ZIP, and FOMOD formats
- 🎯 **Nexus Mods Integration** - Pre-upload checklist and template generation
- 🔢 **Version Management** - Semantic versioning with major/minor/patch increments
- ⚙️ **Compression Settings** - Configurable compression levels (0-9)
- 📦 **FOMOD Support** - Generate installer configurations for Mod Organizer 2

### 8-Step Packaging Workflow

1. **Project Selection** - Choose mod folder with directory picker
2. **Structure Validation** - Automatic validation with issue detection
3. **Metadata Entry** - Name, version, description, author, category, requirements, tags
4. **File Selection** - Include/exclude files with pattern matching
5. **Documentation** - Generate README and manage changelog entries
6. **Archive Format** - Choose 7z/ZIP/FOMOD with compression settings
7. **Preview & Build** - Review summary and build archive
8. **Export** - Nexus Mods preparation with upload checklist

## Architecture

### Core Engine (`src/mining/modPackaging.ts`)

```typescript
export class ModPackagingEngine {
  // Session management
  async startPackaging(modPath: string): Promise<PackagingSession>
  
  // Validation
  async validateStructure(modPath: string): Promise<StructureValidation>
  
  // Archive creation
  async createArchive(settings: ArchiveSettings): Promise<ArchiveResult>
  
  // Documentation
  async generateReadme(modInfo: ModInfo, template: string): Promise<string>
  async appendChangelog(changelogPath: string, version: string, changes: string[]): Promise<void>
  
  // Nexus integration
  async prepareForNexus(modPackage: ModPackage): Promise<NexusPrep>
  
  // Version management
  async incrementVersion(currentVersion: string, type: 'major' | 'minor' | 'patch'): Promise<string>
}
```

### IPC Handlers (`src/electron/main.ts`)

9 IPC handlers with `mod-packaging:*` namespace:

- `mod-packaging:start` - Initialize packaging session
- `mod-packaging:validate-structure` - Validate mod folder
- `mod-packaging:create-archive` - Build archive package
- `mod-packaging:generate-readme` - Generate documentation
- `mod-packaging:append-changelog` - Add changelog entry
- `mod-packaging:prepare-nexus` - Prepare for Nexus upload
- `mod-packaging:increment-version` - Bump version number
- `mod-packaging:get-session` - Retrieve session state
- `mod-packaging:update-session` - Update session data

### UI Component (`src/renderer/src/ModPackagingWizard.tsx`)

Comprehensive wizard with:
- Material-UI Stepper for 8-step workflow
- Real-time validation feedback
- Progress tracking with LinearProgress
- File selection with pattern exclusion
- README preview with multiple templates
- Changelog entry management
- Archive settings configuration
- Nexus checklist with recommendations

### Type Definitions (`src/shared/types.ts`)

```typescript
interface PackagingSession {
  id: string;
  modPath: string;
  status: 'initialized' | 'validating' | 'configuring' | 'building' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  modInfo?: ModInfo;
  structureValidation?: StructureValidation;
  archiveSettings?: ArchiveSettings;
  createdAt: number;
  lastUpdated: number;
}

interface ModInfo {
  name: string;
  version: string;
  author: string;
  description: string;
  category?: string;
  requirements?: string[];
  tags?: string[];
  homepage?: string;
  supportUrl?: string;
  donationUrl?: string;
  nexusId?: string;
}

interface StructureValidation {
  valid: boolean;
  hasData: boolean;
  hasDocs: boolean;
  hasReadme: boolean;
  hasChangelog: boolean;
  fileCount: number;
  totalSize: number;
  folders: string[];
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    path?: string;
  }>;
  suggestions: string[];
}

interface ArchiveSettings {
  modPath: string;
  outputPath: string;
  format: '7z' | 'zip' | 'fomod';
  compressionLevel: 0 | 1 | 3 | 5 | 7 | 9;
  includeFiles: string[];
  excludeFiles: string[];
  excludePatterns: string[];
  createFomod: boolean;
  fomodConfig?: FomodConfig;
}

interface ArchiveResult {
  success: boolean;
  archivePath?: string;
  archiveSize?: number;
  filesIncluded?: number;
  compressionRatio?: number;
  buildTime?: number;
  error?: string;
  warnings?: string[];
}

interface NexusPrep {
  ready: boolean;
  packagePath: string;
  fileSize: number;
  files: string[];
  checks: {
    hasReadme: boolean;
    hasChangelog: boolean;
    hasProperStructure: boolean;
    hasPermissions: boolean;
    hasScreenshots: boolean;
  };
  recommendations: string[];
  nexusTemplates: {
    description: string;
    requirements: string;
    installation: string;
    changelog: string;
  };
}
```

## Usage Examples

### Starting a Packaging Session

```typescript
// Electron API (renderer process)
const session = await window.electron.api.modPackagingStart('/path/to/mod');

console.log(session);
// {
//   id: "pkg_1707123456789_0",
//   modPath: "D:/Mods/MyAwesomeMod",
//   status: "configuring",
//   currentStep: 2,
//   totalSteps: 8,
//   structureValidation: { ... },
//   createdAt: 1707123456789,
//   lastUpdated: 1707123456789
// }
```

### Validating Mod Structure

```typescript
const validation = await window.electron.api.modPackagingValidateStructure('/path/to/mod');

console.log(validation);
// {
//   valid: true,
//   hasData: true,
//   hasDocs: false,
//   hasReadme: true,
//   hasChangelog: false,
//   fileCount: 247,
//   totalSize: 52428800, // 50 MB
//   folders: ["Data", "Data/Meshes", "Data/Textures", ...],
//   issues: [
//     { severity: "warning", message: "No changelog found", path: "..." }
//   ],
//   suggestions: [
//     "Add a CHANGELOG.md to track version changes"
//   ]
// }
```

### Generating README

```typescript
const modInfo = {
  name: "My Awesome Fallout 4 Mod",
  version: "1.2.3",
  author: "ModAuthor",
  description: "An amazing mod that does cool things",
  category: "Gameplay",
  requirements: ["F4SE", "FO4 v1.10.163+"],
  tags: ["gameplay", "immersive", "lore-friendly"],
  homepage: "https://nexusmods.com/fallout4/mods/12345",
  nexusId: "12345"
};

// Generate README with different templates
const defaultReadme = await window.electron.api.modPackagingGenerateReadme(modInfo, 'default');
const nexusReadme = await window.electron.api.modPackagingGenerateReadme(modInfo, 'nexus');
const githubReadme = await window.electron.api.modPackagingGenerateReadme(modInfo, 'github');
const simpleReadme = await window.electron.api.modPackagingGenerateReadme(modInfo, 'simple');
```

### Version Management

```typescript
// Increment version numbers
const newMajor = await window.electron.api.modPackagingIncrementVersion('1.2.3', 'major');
console.log(newMajor); // "2.0.0"

const newMinor = await window.electron.api.modPackagingIncrementVersion('1.2.3', 'minor');
console.log(newMinor); // "1.3.0"

const newPatch = await window.electron.api.modPackagingIncrementVersion('1.2.3', 'patch');
console.log(newPatch); // "1.2.4"
```

### Creating Archive

```typescript
const settings = {
  modPath: "D:/Mods/MyAwesomeMod",
  outputPath: "D:/Mods/MyAwesomeMod_v1.2.3.7z",
  format: "7z",
  compressionLevel: 5, // Normal compression
  includeFiles: [], // Empty = include all
  excludeFiles: [],
  excludePatterns: ["*.bak", "*.tmp", "Thumbs.db", "desktop.ini"],
  createFomod: false
};

const result = await window.electron.api.modPackagingCreateArchive(settings);

console.log(result);
// {
//   success: true,
//   archivePath: "D:/Mods/MyAwesomeMod_v1.2.3.7z",
//   archiveSize: 15728640, // 15 MB
//   filesIncluded: 247,
//   compressionRatio: 70, // 70% compression
//   buildTime: 3450 // 3.45 seconds
// }
```

### Nexus Mods Preparation

```typescript
const modPackage = {
  modInfo: {
    name: "My Awesome Mod",
    version: "1.2.3",
    author: "ModAuthor",
    description: "...",
    // ... other fields
  },
  archivePath: "D:/Mods/MyAwesomeMod_v1.2.3.7z",
  files: ["Data/MyMod.esp", "Data/Meshes/...", ...],
  readme: "# My Awesome Mod\n...",
  changelog: "## [1.2.3]\n- Fixed bug\n- Added feature"
};

const nexusPrep = await window.electron.api.modPackagingPrepareNexus(modPackage);

console.log(nexusPrep);
// {
//   ready: true,
//   packagePath: "D:/Mods/MyAwesomeMod_v1.2.3.7z",
//   fileSize: 15728640,
//   files: [...],
//   checks: {
//     hasReadme: true,
//     hasChangelog: true,
//     hasProperStructure: true,
//     hasPermissions: true,
//     hasScreenshots: false
//   },
//   recommendations: [
//     "Add screenshots to showcase your mod (recommended: 5-10 images)"
//   ],
//   nexusTemplates: {
//     description: "[size=5][b]My Awesome Mod[/b][/size]\n...",
//     requirements: "[list]\n[*]F4SE\n[/list]",
//     installation: "[size=4][b]Installation:[/b][/size]\n...",
//     changelog: "## [1.2.3]\n- Fixed bug\n..."
//   }
// }
```

## README Templates

### 1. Default Template

Markdown format suitable for general use:

```markdown
# My Awesome Mod

**Version:** 1.2.3  
**Author:** ModAuthor

## Description

An amazing mod that does cool things

## Requirements

- F4SE
- FO4 v1.10.163+

## Installation

1. Extract the archive
2. Copy the contents to your Fallout 4 Data folder
3. Enable the mod in your mod manager

## Uninstallation

1. Disable the mod in your mod manager
2. Delete the mod files from your Data folder

## Support

For support, visit: https://nexusmods.com/fallout4/mods/12345

## Credits

Created by ModAuthor

Homepage: https://nexusmods.com/fallout4/mods/12345

## License

All rights reserved.
```

### 2. Nexus Template (BBCode)

Formatted for Nexus Mods description page:

```bbcode
[center][size=6][b]My Awesome Mod[/b][/size]
[size=4]Version 1.2.3[/size]
[size=3]by ModAuthor[/size][/center]

[size=5][b]Description[/b][/size]
An amazing mod that does cool things

[size=5][b]Requirements[/b][/size]
[*]F4SE
[*]FO4 v1.10.163+

[size=5][b]Installation[/b][/size]
[list=1]
[*]Download with mod manager
[*]Install and activate
[*]Enjoy!
[/list]

[size=5][b]Compatibility[/b][/size]
Should be compatible with most mods.

[size=5][b]Credits[/b][/size]
Created by ModAuthor
```

### 3. GitHub Template (Markdown)

Formatted for GitHub repositories:

```markdown
# My Awesome Mod

![Version](https://img.shields.io/badge/version-1.2.3-blue)
![Nexus](https://img.shields.io/badge/nexus-12345-orange)

## 📖 Description

An amazing mod that does cool things

## 📋 Requirements

- F4SE
- FO4 v1.10.163+

## 🚀 Installation

### Using Mod Manager (Recommended)
1. Download the mod from Nexus Mods
2. Install using your preferred mod manager (Mod Organizer 2, Vortex, etc.)
3. Enable the mod
4. Launch the game

### Manual Installation
1. Extract the archive
2. Copy the `Data` folder contents to your Fallout 4 `Data` folder
3. Enable the ESP/ESM in your load order
4. Launch the game

## 🔧 Configuration

[Add configuration instructions here if applicable]

## 🗑️ Uninstallation

1. Disable the mod in your mod manager
2. Remove the mod files from your `Data` folder
3. Clean your save if necessary

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

All rights reserved © 2026 ModAuthor

## 💖 Support

If you enjoy this mod, consider [supporting the author](https://nexusmods.com/fallout4/mods/12345)!

## 🔗 Links

- [Homepage](https://nexusmods.com/fallout4/mods/12345)
- [Nexus Mods](https://www.nexusmods.com/fallout4/mods/12345)

---

**Created by ModAuthor**
```

### 4. Simple Template (Plain Text)

Minimal text format:

```
My Awesome Mod v1.2.3
by ModAuthor

An amazing mod that does cool things

REQUIREMENTS:
- F4SE
- FO4 v1.10.163+

INSTALLATION:
1. Extract archive
2. Copy to Fallout 4 Data folder
3. Enable in mod manager

More info: https://nexusmods.com/fallout4/mods/12345
```

## Structure Validation

The engine performs comprehensive validation:

### File Structure Checks

- ✅ Checks for `Data` folder presence
- ✅ Checks for documentation folder (`Docs` or `Documentation`)
- ✅ Detects README files (`README.md`, `README.txt`, etc.)
- ✅ Detects changelog files (`CHANGELOG.md`, `CHANGES.txt`, etc.)
- ✅ Scans all files and calculates total size
- ✅ Lists all folders for review

### Issue Detection

**Errors** (prevent packaging):
- Missing critical files
- Invalid file structure

**Warnings** (should be addressed):
- No Data folder
- No README file
- Very large mod size (>500MB)
- Temporary/backup files (*.bak, *.tmp)

**Info** (suggestions):
- No changelog file
- System files (desktop.ini, Thumbs.db)

### Example Validation Result

```typescript
{
  valid: true,
  hasData: true,
  hasDocs: false,
  hasReadme: true,
  hasChangelog: false,
  fileCount: 247,
  totalSize: 52428800, // 50 MB
  folders: [
    "Data",
    "Data/Meshes",
    "Data/Meshes/Weapons",
    "Data/Textures",
    "Data/Textures/Weapons",
    "Data/Scripts",
    "Data/Scripts/Source"
  ],
  issues: [
    {
      severity: "warning",
      message: "No changelog file found"
    },
    {
      severity: "info",
      message: "System file should be excluded: Thumbs.db",
      path: "D:/Mods/MyMod/Data/Textures/Thumbs.db"
    }
  ],
  suggestions: [
    "Consider adding a CHANGELOG.md to track version changes",
    "Add screenshots to showcase your mod"
  ]
}
```

## Archive Formats

### 7-Zip (.7z)

**Best for:** Maximum compression, smaller file sizes

**Requirements:** 7-Zip must be installed

**Features:**
- Compression levels 0-9
- Best compression ratio
- Widely supported by mod managers

**Installer Detection:**
```
C:\Program Files\7-Zip\7z.exe
C:\Program Files (x86)\7-Zip\7z.exe
```

### ZIP (.zip)

**Best for:** Universal compatibility

**Requirements:** Built-in Node.js support (archiver package)

**Features:**
- Compression levels 0-9
- Works everywhere
- Native Windows support

### FOMOD (.7z with installer)

**Best for:** Nexus Mods with installation options

**Requirements:** 7-Zip + FOMOD configuration

**Features:**
- Interactive installer
- Multiple install options
- Mod Organizer 2 / Vortex support

**Generated Files:**
```
fomod/
  ModuleConfig.xml  (installer configuration)
  info.xml          (mod metadata)
```

## Compression Levels

| Level | Speed | Ratio | Use Case |
|-------|-------|-------|----------|
| 0 | Instant | 0% | Testing/debugging |
| 1 | Fastest | ~30% | Quick distribution |
| 3 | Fast | ~50% | Fast distribution |
| 5 | Normal | ~70% | **Recommended** |
| 7 | Maximum | ~80% | Bandwidth-limited |
| 9 | Ultra | ~85% | Maximum savings |

## Nexus Mods Integration

### Pre-Upload Checklist

The engine verifies:

- ✅ **README file** - Describes mod functionality
- ✅ **Changelog** - Tracks version history
- ✅ **Proper structure** - Contains Data folder
- ✅ **Permissions** - Manual verification required
- ✅ **Screenshots** - Visual showcase

### Nexus Templates

Automatically generated BBCode templates for:

1. **Description** - Main mod page content
2. **Requirements** - Dependencies and DLCs
3. **Installation** - Installation instructions
4. **Changelog** - Version history

### Example Nexus Templates

```bbcode
// Description
[size=5][b]My Awesome Mod[/b][/size]

An amazing mod that does cool things

[size=4][b]Features:[/b][/size]
[list]
[*]High-quality assets
[*]Fully voiced (if applicable)
[*]Quest integration (if applicable)
[*]Compatible with popular mods
[/list]

[b]Tags:[/b] gameplay, immersive, lore-friendly

// Requirements
[list]
[*]F4SE
[*]FO4 v1.10.163+
[/list]

// Installation
[size=4][b]Installation:[/b][/size]

[size=3][b]Using Mod Manager (Recommended):[/b][/size]
[list=1]
[*]Download with Vortex or Mod Organizer 2
[*]Install and activate
[*]Launch the game
[/list]

[size=3][b]Manual Installation:[/b][/size]
[list=1]
[*]Extract the archive
[*]Copy the Data folder contents to your Fallout 4 Data folder
[*]Enable the plugin in your load order
[*]Launch the game
[/list]

[size=4][b]Uninstallation:[/b][/size]
[list=1]
[*]Disable the mod in your mod manager
[*]Delete the mod files
[/list]
```

## Technical Implementation

### Dependencies

```json
{
  "archiver": "^7.0.0",
  "@types/archiver": "^6.0.2"
}
```

### File System Operations

All file operations use async/await with Node.js fs.promises:

```typescript
import * as fs from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);
const mkdirAsync = promisify(fs.mkdir);
```

### Session Management

Each packaging session is tracked with a unique ID:

```typescript
const sessionId = `pkg_${Date.now()}_${counter++}`;

const session: PackagingSession = {
  id: sessionId,
  modPath,
  status: 'initialized',
  currentStep: 1,
  totalSteps: 8,
  createdAt: Date.now(),
  lastUpdated: Date.now()
};

this.activeSessions.set(sessionId, session);
```

### Error Handling

All API methods use try-catch with detailed error messages:

```typescript
registerHandler('mod-packaging:create-archive', async (_event, settings: any) => {
  try {
    return await modPackaging.createArchive(settings);
  } catch (error: any) {
    console.error('Archive creation error:', error);
    throw error;
  }
});
```

## UI Component Features

### Step-by-Step Wizard

Material-UI Stepper with vertical layout:
- Clear progress indicator
- Step validation before proceeding
- Back button for corrections
- Disabled states for incomplete steps

### Real-Time Feedback

- ✅ Validation results with color-coded severity
- 📊 Statistics cards (files, size, folders, issues)
- 📈 Progress bar during archive creation
- ⚠️ Error alerts with dismiss action

### File Management

- 📁 Directory picker integration
- 🔍 Pattern-based file exclusion
- 📋 Expandable folder structure view
- 🏷️ Chip-based pattern management

### Documentation Tools

- 📝 Template selector (4 templates)
- 👁️ README preview
- ➕ Changelog entry management
- 🗑️ Entry deletion support

### Archive Configuration

- 🗜️ Format selector (radio buttons)
- ⚙️ Compression level dropdown (0-9)
- ☑️ FOMOD checkbox
- 💡 Informational alerts

### Nexus Integration

- ✅ Checklist with pass/fail indicators
- 📋 Recommendation list
- 📄 Template preview (description, requirements, installation)
- 🎯 Ready status indicator

## Best Practices

### Before Packaging

1. ✅ Test your mod thoroughly
2. ✅ Clean master files with xEdit
3. ✅ Optimize meshes and textures
4. ✅ Write comprehensive documentation
5. ✅ Create screenshots (5-10 recommended)
6. ✅ Check compatibility with popular mods

### During Packaging

1. ✅ Use descriptive mod name
2. ✅ Follow semantic versioning (X.Y.Z)
3. ✅ Fill all metadata fields
4. ✅ List all requirements (F4SE, DLCs, mods)
5. ✅ Add relevant tags
6. ✅ Choose appropriate compression level (5 recommended)
7. ✅ Exclude temporary/backup files

### After Packaging

1. ✅ Test archive extraction
2. ✅ Verify file structure
3. ✅ Check README formatting
4. ✅ Review Nexus checklist
5. ✅ Prepare screenshots for upload
6. ✅ Write detailed description for Nexus page

## Troubleshooting

### 7-Zip Not Found

**Error:** "7-Zip not found. Please install 7-Zip to create .7z archives."

**Solution:** Install 7-Zip from https://www.7-zip.org/

### Archive Creation Failed

**Error:** "Archive creation failed: [reason]"

**Solutions:**
- Check disk space
- Verify write permissions
- Close any programs using mod files
- Try different compression level
- Use ZIP instead of 7z

### Validation Errors

**Error:** "Mod path does not exist"

**Solution:** Ensure mod folder path is correct and accessible

**Error:** "Path is not a directory"

**Solution:** Select a folder, not a file

### Large Mod Size Warning

**Warning:** "Mod is very large (500+MB) - consider splitting"

**Solutions:**
- Split into main mod + optional files
- Use lower compression (faster)
- Create separate archives for high-resolution textures
- Consider BA2 archive format instead

## API Reference

### Main Engine

```typescript
class ModPackagingEngine {
  // Session management
  startPackaging(modPath: string): Promise<PackagingSession>
  getSession(sessionId: string): PackagingSession | undefined
  updateSession(sessionId: string, updates: Partial<PackagingSession>): void
  
  // Validation
  validateStructure(modPath: string): Promise<StructureValidation>
  
  // Archive creation
  createArchive(settings: ArchiveSettings): Promise<ArchiveResult>
  
  // Documentation
  generateReadme(modInfo: ModInfo, template: string): Promise<string>
  appendChangelog(changelogPath: string, version: string, changes: string[]): Promise<void>
  
  // Nexus integration
  prepareForNexus(modPackage: ModPackage): Promise<NexusPrep>
  
  // Version management
  incrementVersion(currentVersion: string, type: 'major' | 'minor' | 'patch'): Promise<string>
}
```

### IPC Channels

| Channel | Parameters | Returns | Description |
|---------|-----------|---------|-------------|
| `mod-packaging:start` | `modPath: string` | `PackagingSession` | Initialize session |
| `mod-packaging:validate-structure` | `modPath: string` | `StructureValidation` | Validate folder |
| `mod-packaging:create-archive` | `settings: ArchiveSettings` | `ArchiveResult` | Build archive |
| `mod-packaging:generate-readme` | `modInfo: ModInfo, template: string` | `string` | Generate README |
| `mod-packaging:append-changelog` | `path: string, version: string, changes: string[]` | `{success: boolean}` | Add changelog |
| `mod-packaging:prepare-nexus` | `modPackage: ModPackage` | `NexusPrep` | Nexus preparation |
| `mod-packaging:increment-version` | `version: string, type: string` | `string` | Bump version |
| `mod-packaging:get-session` | `sessionId: string` | `PackagingSession \| undefined` | Get session |
| `mod-packaging:update-session` | `sessionId: string, updates: any` | `{success: boolean}` | Update session |

## Future Enhancements

- [ ] Multi-language README generation
- [ ] Automatic screenshot embedding
- [ ] Steam Workshop support
- [ ] GitHub release automation
- [ ] Auto-update integration
- [ ] Mod conflicts detection
- [ ] Load order suggestions
- [ ] FOMOD visual editor
- [ ] Batch packaging for mod collections
- [ ] Cloud upload integration (Google Drive, Dropbox)

## Credits

Created for **Mossy** - The ultimate Fallout 4 modding assistant.

Built with:
- Electron
- React
- TypeScript
- Material-UI
- Node.js
- archiver
- 7-Zip

## License

Part of the Mossy project. All rights reserved.

---

**Need Help?** Join the Mossy community or report issues on GitHub.
