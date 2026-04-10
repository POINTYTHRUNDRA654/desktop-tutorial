# Spriggit: Git-Based Collaborative Modding Guide

## Overview

**Spriggit** is a serialization tool that converts Bethesda plugin files (.esp/.esm/.esl) into human-readable text format (YAML or JSON) that Git can track, version, and merge. This enables large-scale collaborative modding workflows similar to professional software development.

**The headline:** Large mods can now live in GitHub/GitLab repositories, accept pull requests from dozens of developers, maintain full version history, and merge changes automatically—just like open-source code projects.

---

## Why Git for Mod Development?

Git is the industry-standard version control system used by nearly all programmers. Here's what it enables for modders:

### Core Benefits

| Benefit | What This Means |
|---------|-----------------|
| **Version History** | Revert your mod to ANY past state instantly. "Undo" doesn't exist in Creation Kit—Git does. |
| **Change Tracking** | Every edit is logged with WHO changed WHAT and WHEN. Automatic "changelog" as you work. |
| **Branching** | Work on experimental features on isolated branches without touching the stable mod. |
| **Collaboration** | 2, 5, or 50 developers can work on the same mod simultaneously. Git merges their changes. |
| **Public Development** | Host your mod repo on GitHub. Showcase your development process transparently. |
| **Pull Requests** | Collaborators submit changes for review before merging. Team members discuss and approve changes. |
| **Tagging** | Mark releases (v1.0, v2.0, v2.1) so your history is organized and releases are reproducible. |
| **Conflict Resolution** | When two developers edit the same thing, Git shows the exact conflicts AND provides merge tools. |
| **Backup** | Distributed repository means no single point of failure. Everyone has the full history locally. |

---

## What is Spriggit?

**Spriggit** serializes Bethesda plugins to/from text format using NuGet packages that handle game-specific record definitions.

### Key Features

- **Bidirectional**: Plugin ↔ YAML/JSON conversion (no data loss)
- **Organized output**: Plugins are split into subfolders (Weapons, NPCs, Quests, etc.) instead of one monolithic file
- **Git-friendly**: Text files are perfect for diffs, merging, and version tracking
- **Multi-game support**: Works with Fallout 4, Skyrim SE, Skyrim AE, Oblivion, Morrowind, etc.
- **UI & CLI**: Desktop application (Windows) or command-line tool (Windows/Linux/Mac)
- **Version-aware**: Each serialized mod remembers which NuGet package version created it, enabling schema evolution

### Installation

**GitHub**: https://github.com/Mutagen-Modding/Spriggit (releases page)

**Step 1 — Install the .NET SDK** (required, not just the Runtime)

Download from: https://dotnet.microsoft.com/download/dotnet

The **SDK** is required (not just the Runtime) because Spriggit's engine downloads its
translation packages (e.g. `Spriggit.Yaml.Fallout4`) via `dotnet tool install` at first
serialize run. The Runtime alone is not sufficient.

> **Restart your PC after installing the SDK** to ensure it settles in correctly.

**Step 2 — Download Spriggit**

Two versions available from the releases page:

1. **Spriggit UI** (Windows only, WPF desktop app)
   - Graphical user interface
   - Point-and-click serialization/deserialization
   - "Sync" button for bidirectional updates
   - Easiest for beginners
   - Can also be run as a CLI

2. **Spriggit CLI** (Windows/Linux/Mac, command-line)
   - Scriptable
   - Ideal for automation and CI/CD pipelines
   - Required for Linux/Mac users

**Self-contained option**: `SpriggitCLI.zip` bundles .NET — no separate SDK install
needed for basic serialization runs. Recommended for users who just want to use the
CLI without setting up the full SDK.

---

## Example Output: YAML Format

Here's what your mod looks like after serialization:

```yaml
RecordData.yaml
├── Header sections (mod metadata, masters, author)
├── Editor ID, name, description
└── All record data in nested YAML structure

Example record (Jewelry Necklace):
---
FormKey: 087835:Skyrim.esm
EditorID: JewelryNecklaceGoldGems
ObjectBounds:
  First: [-3, -9, 0]
  Second: [3, 9, 1]
Name: Gold Jeweled Necklace
WorldModel:
  Male:
    Model:
      File: Armor\AmuletsandRings\GoldAmuletGemsGO.nif
PickUpSound: 08AB15:Immersive Sounds - Compendium.esp
PutDownSound: 08AB16:Immersive Sounds - Compendium.esp
Keywords:
  - 06BBE9:Skyrim.esm
  - 08F95A:Skyrim.esm
  - 0A8664:Skyrim.esm
Value: 485
Weight: 0.5
```

Each record gets its own file, organized by type:

```
MyMod/
  RecordData.yaml              # Mod header
  Weapons/
    GlassDagger.yaml           # One file per weapon
    IronLongsword.yaml
  Npcs/
    BanditWarlord.yaml         # One file per NPC
    SirenTheRogue.yaml
  Quests/
    MainQuestline.yaml
```

This structure makes **Git diffs meaningful**. When you edit the Glass Dagger, only `Weapons/GlassDagger.yaml` changes—not the entire plugin.

---

## Workflows

### Solo Modder with Version History

```
1. Create mod in Creation Kit or xEdit
2. Use Spriggit UI → click "Serialize"
   Input: C:\Games\Skyrim Special Edition\Data\MyMod.esp
   Output: C:\MyRepo\MyMod
3. Git commit: git commit -m "Added Glass Dagger with unique enchantment"
4. Continue developing
5. Serialize again → commit again
   Result: Full version history with human-readable changes
```

### Team Collaboration (Multiple Developers)

**Setup (Team Lead):**
1. Create a GitHub repo for the mod
2. Initialize with Spriggit output (mod in YAML format)
3. Push to GitHub

**Developer A (working on quests):**
```bash
git clone https://github.com/myteam/mymod.git
git checkout -b add-new-questline
# ... edit in Creation Kit ...
spriggit serialize --InputPath MyMod.esp --OutputPath MyMod
git commit -m "Added Shadow Brotherhood questline (5 new quests)"
git push origin add-new-questline
# ... open Pull Request on GitHub ...
```

**Developer B (working on NPCs):**
```bash
git clone https://github.com/myteam/mymod.git
git checkout -b new-npcs
# ... edit in Creation Kit ...
spriggit serialize --InputPath MyMod.esp --OutputPath MyMod
git commit -m "Added 12 new bandits with dialogue"
git push origin new-npcs
# ... open Pull Request on GitHub ...
```

**Team Lead (merging changes):**
1. Reviews both PRs on GitHub
2. Approves and clicks "Merge" for the questline
3. Approves and clicks "Merge" for the NPCs
4. Pulls merged changes locally: `git pull origin main`
5. Deserializes: `spriggit deserialize --InputPath MyMod --OutputPath MyMod.esp`
6. The merged .esp now has both quests AND NPCs
7. Packages for Nexus release

---

## CLI Reference

### Serialize (Plugin → YAML/JSON)

**Fallout 4:**
```bash
Spriggit.CLI.exe serialize \
  --InputPath "C:\Games\Fallout 4\Data\MyMod.esp" \
  --OutputPath "C:\MyRepo\MyMod" \
  --GameRelease Fallout4 \
  --PackageName Spriggit.Yaml
```

**Skyrim SE:**
```bash
Spriggit.CLI.exe serialize \
  --InputPath "C:\Games\Skyrim Special Edition\Data\MyMod.esp" \
  --OutputPath "C:\MyRepo\MyMod" \
  --GameRelease SkyrimSE \
  --PackageName Spriggit.Yaml
```

### Deserialize (YAML/JSON → Plugin)

```bash
Spriggit.CLI.exe deserialize \
  --InputPath "C:\MyRepo\MyMod" \
  --OutputPath "C:\Games\Fallout 4\Data\MyMod.esp"
```

Note: No --GameRelease needed—it's read from the YAML files (each has metadata about its source).

### JSON Alternative

Replace `Spriggit.Yaml` with `Spriggit.Json` for JSON format:

```bash
--PackageName Spriggit.Json
```

---

## Best Practices

### Commit Hygiene

| Good | Bad |
|------|-----|
| `"Added Glass Dagger with frost enchantment"` | `"stuff"` |
| `"Fixed NPC dialogue for Hadvar"` | `"fixes"` |
| `"Balanced Daedric Armor stats"` | `"updates"` |
| Commit after each logical change | One giant commit for 50 edits |

### Branching Strategy

**Simple (solo or small teams):**
- `main` = stable, release-ready mod
- Feature branches off `main`: `git checkout -b add-feature`
- Merge back to `main` when done

**Git Flow (medium/large teams):**
- `main` = releases only
- `develop` = current development
- `feature/*` branches off `develop`
- Release branches for version prep

### Code Review Process

1. Developer A: Pushes feature branch, opens PR on GitHub
2. Developer B: Reviews code (YAML diffs) and writes comments
3. Developer A: Makes requested changes, re-commits
4. Developer B: Approves with "Looks good!"
5. Merge PR → changes are now in `main`

### Release Workflow

1. Update `RecordData.yaml` with new version number
2. Commit: `git commit -m "v2.1.0 release"`
3. Tag: `git tag -a v2.1.0 -m "Version 2.1.0: Added 20 new NPCs"`
4. Push: `git push origin main && git push origin --tags`
5. Package mod for Nexus
6. On Nexus, link to your GitHub repo so users can see development history

---

## Version Control with NuGet Packages

Spriggit uses **NuGet packages** (Spriggit.Yaml.Fallout4, Spriggit.Json.SkyrimSE, etc.) to define how records are serialized.

### Why This Design?

- **Schema Evolution**: Record definitions change as games are patched or modding tools improve
- **Backward Compatibility**: Old YAML files stamped with v1.1 can still be deserialized with v1.1 package, even if v1.2 is current
- **Automatic Upgrades**: Re-serialize old files with latest package to modernize them

### Example

1. **2024**: You serialize MyMod.esp using Spriggit.Yaml.Fallout4 v1.0
2. **2025**: Fallout 4 record definitions are updated, Spriggit package is v1.1
3. **Deserializing with Spriggit CLI**: It reads the YAML header, sees it was made with v1.0, auto-downloads v1.0, uses that to reconstruct the plugin
4. **Optional modernization**: Re-serialize with v1.1 to adopt new fields/naming

---

## Common Questions

### Q: Is this only for programmers?

**A:** No! Git has a learning curve, but it's worth it. GitHub's guides (guides.github.com) are excellent. Start with the "Hello World" tutorial. Spriggit UI has a GUI—no command line needed.

### Q: Will my mod get corrupted in Git?

**A:** No. Spriggit is lossless. The YAML/JSON is a complete, editable representation of your plugin. It reconstructs bit-for-bit the same .esp every time.

### Q: Can I keep using the Creation Kit?

**A:** Absolutely! The workflow is:
1. Edit in Creation Kit (as usual)
2. Serialize once with Spriggit (converts ESP → YAML)
3. Commit to Git
4. Later, deserialize (converts YAML → ESP) and continue editing in CK

### Q: Can I use Spriggit with my existing Nexus mod?

**A:** Yes! Convert your current .esp to YAML, push to GitHub, and develop there going forward. Release updates from GitHub to Nexus.

### Q: What if two developers edit the same record?

**A:** Git detects the conflict and shows both changes side-by-side. Developers discuss and manually resolve (usually simple—one change wins or both are combined).

### Q: Is JSON or YAML better?

**A:** Both work identically. **YAML** is more human-readable (fewer brackets). **JSON** is more machine-parseable. Use YAML unless you have automation that prefers JSON.

### Q: Can I host on GitLab instead of GitHub?

**A:** Yes! Spriggit doesn't care where the repo is. Use GitHub, GitLab, Gitea, or self-hosted Git.

---

## When to Use Spriggit

✅ **Use Spriggit if:**
- You're collaborating with other modders
- You want version history and changelog
- Your mod is large and has many contributors
- You want to accept pull requests from the community
- You want public transparency in your development

❌ **Not strictly necessary if:**
- You're making a tiny 1-file mod alone
- You never want version history
- You're comfortable with the "Dropbox folder" backup system

**But honestly:** Even solo modders benefit from version history. It's free, and you'll thank yourself when you accidentally break something and can't remember how you fixed it last time.

---

## Resources

- **Official GitHub**: https://github.com/Mutagen-Modding/Spriggit
- **Git Documentation**: https://git-scm.com/doc
- **GitHub Guides**: https://guides.github.com
- **Mutagen (underlying library)**: https://github.com/Mutagen-Modding/Mutagen
- **Mutagen Serialization**: https://github.com/Mutagen-Modding/Mutagen.Bethesda.Serialization

---

## Fallout 4 Specific Notes

- **Game Release**: Use `--GameRelease Fallout4` in CLI
- **NuGet Package**: `Spriggit.Yaml.Fallout4` or `Spriggit.Json.Fallout4`
- **Version-aware**: Spriggit supports OG, NG, and 1.11.x Fallout 4
- **Plugin slot management**: ESL files in YAML can be tracked separately, then compiled together if needed
- **BA2 Archives**: Extract assets first using BAE, then serialize your plugin separately

---

## Integration with Mossy

When you're working on a Fallout 4 mod and want to:
1. **Check your mod integrity**: Use **The Auditor** to scan ESPs/NIFs/DDS before serializing
2. **Manage your Build Pipeline**: Use **The Hive** to track serialization/deserialization steps as part of your workflow
3. **Track Collaboration**: Ask Mossy to help you plan Git branches and pull request workflows

Spriggit is the tool; **Git is the discipline**; **GitHub is the platform**. Together, they transform modding from solitary work into collaborative art.

---

*Last updated: April 2026. Spriggit is actively maintained by the Mutagen-Modding project and the modding community.*

---

## Output Format — What Spriggit Produces

Spriggit converts Bethesda plugins into YAML or JSON format. Example YAML record output:

```yaml
FormKey: 087835:Skyrim.esm
EditorID: JewelryNecklaceGoldGems
ObjectBounds:
  First: -3, -9, 0
  Second: 3, 9, 1
Name: Gold Jeweled Necklace
WorldModel:
  Male:
    Model:
      File: Armor\AmuletsandRings\GoldAmuletGemsGO.nif
Race: 013749:Skyrim.esm
Keywords:
- 06BBE9:Skyrim.esm
- 08F95A:Skyrim.esm
Value: 485
Weight: 0.5
```

### Mods Are Split Into Folders

Rather than one large binary file, Spriggit splits a mod into a folder of individual record files:

```
Some/Dedicated/Mod/Folder/   ← dedicated folder for one mod's Spriggit content
   RecordData.yaml           ← mod header
   Weapons/
      GlassDagger.yaml       ← one file per record
      IronLongsword.yaml
   Npcs/
      Goblin.yaml
```

> **Important**: The target folder must be **wholly dedicated** to Spriggit content.
> During serialization, ALL files not just exported get **deleted**. Never serialize
> into a folder containing other files (e.g. your repo root).
> Always create a dedicated subfolder: `MyRepo/SomeMod.esp/`

This structure makes Git diffs meaningful: adding a record = new file, modifying a
record = modified file. Much easier to review than a monolithic binary diff.

---

## Upgrading Spriggit — Use a Dedicated Commit

When upgrading your Spriggit translation package version, **always use a dedicated commit
containing only the upgrade changes**. Never mix upgrade diffs with actual mod changes.

**Why:** Version upgrades can cause formatting changes, improved serialization, or other
structural modifications unrelated to your mod. Mixing them creates "ambush diffs" in
future commits.

### CLI Workflow

```bash
# 1. Upgrade
.\Spriggit.CLI.exe upgrade -p "C:\MyGitRepository\SomeMod.esp\" -v "1.2.3"

# 2. Review what changed
git diff

# 3. Commit immediately
git add -A
git commit -m "Upgrade Spriggit to version 1.2.3"
```

### Manual Workflow (via spriggit-meta.json)

```json
{
  "Source": {
    "PackageName": "Spriggit.Yaml.Fallout4",
    "Version": "1.2.3"
  }
}
```

Then re-serialize and commit:

```bash
.\Spriggit.CLI.exe serialize -i "C:\Temp\SomeMod.esp" -o "C:\MyGitRepository\SomeMod.esp\"
git diff
git add -A
git commit -m "Upgrade Spriggit to version 1.2.3"
```

---

## Merge Conflicts

### Typical Content Conflicts

Normal merge conflicts occur when two developers modified the same field on the same record.
Handled with standard Git conflict resolution tools. See: https://git-scm.com/docs/git-merge

### FormID Collision (Bethesda-Specific)

When two developers working in parallel each **add a new record**, they may claim the same
FormID. This will **NOT** appear as a standard Git merge conflict, but creates a duplicate
FormID in the mod — which is invalid.

**Fix after every merge:**

```bash
Spriggit.CLI.exe [formid-fix command]   # see Spriggit CLI docs
```

The tool reassigns a new FormID to one of the colliding records and reroutes all references
to it within the mod.

> **Two Collisions Maximum**: Spriggit's FormID collision logic handles exactly two records
> sharing a single FormID. Handle collisions **immediately after each merge** — never let
> them accumulate across multiple merges.

---

## Sorting — Why Spriggit Output Is Stable

The Creation Kit automatically **shuffles** certain properties when saving plugin files.
Without correction, identical data would appear in different orders across saves, creating
Git noise unrelated to your actual changes.

Spriggit automatically sorts known shuffled categories so output is stable:

| Benefit | Description |
|---------|-------------|
| **Cleaner Diffs** | Only actual changes appear in diffs |
| **Meaningful History** | Git history reflects intentional modifications, not CK artifacts |
| **Better Merges** | Consistent ordering helps Git's merge algorithms |
| **Reduced Conflicts** | Stable ordering minimizes false merge conflicts |

**Reporting new shuffle cases**: If you notice fields still shuffling (appearing as changes
in Git when you haven't actually modified them), report to the Spriggit GitHub with: game,
record type, and specific field name.

---

## Omissions — Spriggit Strips Junk Data

The Creation Kit sometimes writes **junk or unused data** into certain fields that vary
between saves even without real changes. Spriggit omits these automatically.

### What Gets Omitted

- **Unused Fields**: Fields explicitly marked "Unused" in game data structures
  (e.g. unused condition parameters, `PlayerSkills.Unused` padding bytes)
- **Unknown/Internal Data**: CK metadata that changes between saves — group header
  timestamps, "last modified" tracking data
- **Condition Data Fields**: Condition parameter fields unused for certain function types
  contain leftover junk data

### How Omissions Work

- **During serialize** (plugin → YAML/JSON): Omitted fields are not written
- **During deserialize** (YAML/JSON → plugin): Omitted fields are set to safe defaults (zeros/empty)

**Reporting**: If junk fields are causing unnecessary diffs, or a needed field is being
incorrectly omitted, report to https://github.com/Mutagen-Modding/Spriggit with: game,
record type, field name, and description of the issue.

---

## Backups

Spriggit automatically backs up your Bethesda plugin on every **deserialize** operation.

- **Location**: `%temp%\Spriggit\Backups\[Mod Name]\[Date of Backup]\`
- **Optimization**: No re-backup if contents are identical to the last backup
- **Retention**: Backups kept for **30 days**, then auto-cleared

> Spriggit is still in beta. Keep your own backups of important `.esp`/`.esm` files.

---

## Troubleshooting

### Unexpected Records Error

```
"Unexpected records" / Spriggit refuses to serialize
```

**Cause**: Safety mechanism — Spriggit encountered a record type without definitions.
Intentional to prevent data loss.

**Solution**: Report to https://github.com/Mutagen-Modding/Spriggit with:
- The specific subrecord flagged (shown in logs/console)
- Tools used to create the mod (official CK only? third-party tools?)
- Source file (if willing to share)

Definitions are updated frequently in new published versions.

---

### Bad Target Folder — "Cannot export next to a .git folder"

Spriggit requires a folder **wholly dedicated** to its output. All files in the target
folder that were not just exported get **deleted** during serialization.

**Solution**: Create a dedicated subfolder for each mod:

```
MyRepo/
   README.md              ← DO NOT serialize into MyRepo/ — README would be deleted!
   SomeMod.esp/           ← Dedicated subfolder — serialize here
      RecordData.yaml
      Weapons/
         ...
```

---

### Filename Too Long (Windows)

Spriggit's detailed folder structures can exceed Windows' default 260-character path limit.

**Fix 1 — Git global config (recommended)**:
```bash
git config --global core.longpaths true
```

**Fix 2 — Per-repository**:
```bash
git config core.longpaths true   # run from inside the repo
```

**Fix 3 — Windows system-wide**:
- Group Policy: `Computer Config > Admin Templates > System > Filesystem > Enable Win32 long paths`
- Registry: `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 1` (then restart)

**Prevention**: Keep your repo path short (`C:\Mods\MyMod` not
`C:\Users\Name\Documents\Very\Deep\Folder\MyMod`). Use short mod names.

---

### Backwards Compatibility with Early Alpha Versions (pre-v0.20)

**v0.20** is a "bridge" version containing both old and new deserialization logic.

If you have Spriggit content from **before v0.20**:
1. Download v0.20 specifically from the releases page
2. Use v0.20 to decode your files
3. Newer versions **do not** have the legacy logic needed for pre-v0.20 content

For further help, visit the Spriggit Discord community.
