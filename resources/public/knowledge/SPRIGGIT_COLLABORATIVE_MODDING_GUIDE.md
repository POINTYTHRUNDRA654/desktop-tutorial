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

**Download**: https://github.com/Noggog/Spriggit (GitHub releases)

**Two versions:**

1. **Spriggit UI** (Windows only, WPF desktop app)
   - Graphical user interface
   - Point-and-click serialization/deserialization
   - "Sync" button for bidirectional updates
   - Easiest for beginners

2. **Spriggit CLI** (Windows/Linux/Mac, command-line)
   - Scriptable
   - Ideal for automation and CI/CD pipelines
   - Required for Linux/Mac users

**Requirements:**
- .NET Runtime 8.0+ (UI version)
- .NET SDK 8.0+ (CLI version, if building from source)

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

- **Official GitHub**: https://github.com/Noggog/Spriggit
- **Git Documentation**: https://git-scm.com/doc
- **GitHub Guides**: https://guides.github.com
- **Mutagen (underlying library)**: https://github.com/Noggog/Mutagen

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

*Last updated: April 2026. Spriggit is actively maintained by Noggog and the modding community.*
