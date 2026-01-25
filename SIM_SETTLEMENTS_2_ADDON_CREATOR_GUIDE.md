# Sim Settlements 2 Addon Creator's Comprehensive Guide

**Version:** 1.0 | **Last Updated:** January 24, 2026

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Required Tools](#required-tools)
4. [Guided Series - Learn to Create Buildings](#guided-series---learn-to-create-buildings)
5. [Guided Series - Learn to Create City Plans](#guided-series---learn-to-create-city-plans)
6. [Guided Series - Learn to Create HQ Content](#guided-series---learn-to-create-hq-content)
7. [Topic Series](#topic-series)
8. [Building Guidelines](#building-guidelines)
9. [Releasing Your Addon](#releasing-your-addon)
10. [Community Resources](#community-resources)

---

## Overview

Sim Settlements 2 is extremely moddable. Almost every aspect can be injected into easily by other mod authors. This guide provides step-by-step tutorials for creating buildings, city plans, HQ content, and more.

### Skill Levels

- **Green text**: Information important to beginners (experienced modders can skip)
- **Red text**: Advanced information (beginners can skip if confused)
- **Black text**: Essential information for all

### Philosophy

We prefer to be excessively wordy with tutorials, assuming you know nothing. If you're experienced, some information will be redundant. Video companions are available for many guides.

---

## Getting Started

### What You'll Create

| Content Type | Difficulty | Time to Learn |
|--------------|-----------|--------------|
| **Building Skins** | Beginner | 30 minutes |
| **Single-Level Buildings** | Beginner-Intermediate | 2-4 hours |
| **Multi-Level Buildings** | Intermediate | 4-8 hours |
| **City Plans** | Intermediate | 2-4 hours |
| **HQ Content** | Intermediate-Advanced | 4-8 hours |
| **Advanced Systems** | Advanced | Variable |

### Learning Path

1. **Start with basics**: "Your First Addon" teaches fundamental concepts
2. **Build progressively**: Each tutorial builds on previous knowledge
3. **Test frequently**: Get content in-game as quickly as possible
4. **Iterate quickly**: Small changes maintain motivation
5. **Join community**: Discord server for help and feedback

---

## Required Tools

### Essential

#### Creation Kit (Free)
- Download from Steam (search "Fallout 4: Creation Kit")
- Install in same Steam directory as Fallout 4
- Configuration required (see Getting Started guide)
- Used for: Plugin creation, form management, all addon work

**Setup Steps:**
1. Steam Store → Search "Creation Kit"
2. Free "purchase" and install
3. Launch and unpack scripts
4. Close and edit CreationKitCustom.ini:
   ```
   [General]
   bAllowMultipleEditors=1
   bAllowMultipleMasterLoads=1
   ```

#### XEdit / FO4Edit (Free)
- Download from [Nexus Mods](https://www.nexusmods.com/fallout4/mods/2737)
- Extract to own folder
- Copy Addon Maker's Toolkit XEdit scripts to Edit Scripts folder
- Used for: Automating tedious work, importing building data

**Why XEdit?**
- Automation scripts save hours of manual work
- Handles complex form list management
- Required for building plan creation (much easier than manual)

#### Nifskope (Free)
- Download [Nifskope 2 Dev 7](https://github.com/niftools/nifskope) or newer
- Extract 7z file to folder
- Configure in Settings → Resources (add texture folders)
- Configure Archives tab (auto-detect BA2 files)
- Used for: 3D model editing, material swaps, navcuts

**Why Nifskope?**
- Edit Bethesda model formats (.nif files)
- Kit-bash existing models into new buildings
- Add navcuts for NPC pathfinding
- Material/texture management

### Recommended

#### Open Office Calc (Free)
- Alternative to Excel for spreadsheet work
- Used for: Stage Items data, importing/exporting building info
- Download: [openoffice.org](https://www.openoffice.org)

#### Material Editor (Free)
- Simplifies material file creation
- Used for: Custom textures, material swaps
- Required if creating custom textures

#### Addon Maker's Toolkit (Free)
- Contains: XEdit scripts, model templates, spreadsheet templates, texture templates
- Download: [Nexus Mods](https://www.nexusmods.com/fallout4/mods/68620)

---

## Guided Series - Learn to Create Buildings

Complete these in order. Each builds on previous knowledge.

### 00 - Intro to Addon Creation for SS2

**What You'll Learn:**
- How tutorials are organized
- Color-coded information system
- Text formatting conventions
- Video companion availability
- When content evolves

**Time:** 5-10 minutes | **Prerequisites:** None

**Key Concepts:**
- Green = Beginner info (skip if experienced)
- Red = Advanced info (skip if confused)
- Bold/italic/underline = Emphasis (no pattern)
- Videos available for many guides
- Content constantly evolving (check back for updates)

### 01 - Getting Started with Addon Creation

**What You'll Learn:**
- Install Creation Kit
- Configure CreationKitCustom.ini
- Install and setup XEdit
- Install and configure Nifskope
- Download Addon Maker's Toolkit

**Time:** 30-45 minutes | **Prerequisites:** None

**Installation Checklist:**
- [ ] Creation Kit installed (Steam)
- [ ] CreationKitCustom.ini configured
- [ ] XEdit extracted and scripts copied
- [ ] Nifskope 2 Dev 7 extracted
- [ ] Nifskope textures configured
- [ ] Addon Maker's Toolkit downloaded

### 02 - Your First Addon

**What You'll Learn:**
- Create a building skin (recolor)
- Set up weapon records
- Configure script properties
- Register addon with SS2
- Test in-game

**Time:** 1-2 hours | **Prerequisites:** Creation Kit basics

**Building a Simple Skin:**
1. Duplicate and rename building model
2. Change material to new color
3. Create weapon records for skin
4. Set up script properties (parent building, level info)
5. Create formlists and addon config
6. Test on clean save

**Key Takeaway:** Fast iteration keeps motivation high!

### 03 - Your First Building Model

**What You'll Learn:**
- Kit-bash building from existing models
- Create nif files in Nifskope
- Set up Static records
- Create weapon records
- Configure building metadata
- Build and test in-game

**Time:** 2-4 hours | **Prerequisites:** 02 complete

**Building Process:**
1. Open Nifskope with material editor
2. Kit-bash existing pieces (select/drag/paste)
3. Arrange pieces at 0/0/0 coordinates
4. Export as nif file
5. Create Static record in Creation Kit
6. Link model in Static record
7. Set up weapon record form
8. Configure script properties
9. Test in-game

### 04 - Decorating Your Buildings

**What You'll Learn:**
- Stage Items and their purpose
- Furniture and clutter placement
- Export process using Creation Kit
- Import data into spreadsheets
- Use XEdit to import stage data
- Design progression (L1 → L2 → L3)

**Time:** 2-3 hours | **Prerequisites:** 03 complete

**Key Concept - Stage Items:**
- Items spawned on building when it reaches a stage
- Kept independent from model (functional furniture, lights, clutter)
- Only decorate final stage per level (construction stages visible briefly)
- Exception: Beds in all stages (happiness during long builds)

**Design Philosophy:**
- **Level 1**: Simple, no electricity, struggling appearance
- **Level 2**: Basic electricity, more furniture
- **Level 3**: Colorful, luxurious, many decorations

### 05 - Supporting Upgrades

**What You'll Learn:**
- Create Level 2 and Level 3 buildings
- Use layer duplication for faster iteration
- Export all models and stage items
- Create multi-level spreadsheets
- Use import tool to create complete building plan
- Test multi-level progression

**Time:** 2-4 hours | **Prerequisites:** 04 complete

**Multi-Level Design Tips:**
- Start Level 2 with copied Level 1 model
- Fragment SCOL (Alt+U) to modify pieces
- Expand one element at a time (feels like renovation)
- Copy previous stage items to new level
- Modify and add items for progression
- Export all levels to single spreadsheet

**Spreadsheet Organization:**
| Column | Content |
|--------|---------|
| Name | Item form ID |
| X, Y, Z | Position coordinates |
| Rotation | Item rotation |
| Scale | Item size |
| Level | Building level (1, 2, or 3) |

### 06 - Advanced Building Customization

**What You'll Learn:**
- Multi-person building support
- Randomized clutter systems
- Real Inventory Display (shops)
- Holiday decorations
- Flag/banner systems
- ASAM Sensor positioning
- HOLO Icon offset
- Multi-stage items
- Performance tags

**Time:** 3-5 hours | **Prerequisites:** 05 complete

**Multi-Person Support:**
- Set iMaxOccupants field per level
- Distribute furniture markers among occupants
- Optional: Use iOwner column for per-person zones

**Randomized Clutter:**
- Replace item ID with Formlist ID
- Formlist picks random item each placement
- Use SS2 random clutter collections
- Or create custom clutter collections

**Shop Display:**
- Use Real Inventory Display Point markers
- Fill column M with vendor type (0=General, 1=Armor, etc.)
- Optional column N to limit to higher levels
- Real inventory shows/removes as you purchase

**Holiday Decorations:**
- Add SS2_HolidayControlled_ prefixed items
- Reacts to seasonal holidays
- Empty space when no holiday active

**ASAM Sensor Control:**
- Add SS2_Marker_ASAMSensorPositioner (FreeStanding or WallMounted)
- Position/rotation of marker controls sensor placement
- Set per-level if needed

### 07 - Navmeshing

**What You'll Learn:**
- Add navcuts to buildings
- Create navigable meshes
- Handle stairs and multiple floors
- Test NPC pathfinding
- Troubleshoot navigation issues

**Time:** 2-4 hours | **Prerequisites:** 06 complete

**Navmesh Process:**
1. Copy navcut from Addon Maker's Toolkit
2. Paste into building model (NifSkope)
3. In Creation Kit, set up navmesh object
4. Draw triangle mesh over walkable areas
5. Include stairs and multi-floor paths
6. Watch video for detailed visual steps
7. Finalize and test

**Why Navmesh Matters:**
- Settlers can enter and navigate buildings
- Without it: NPCs stuck or walk through walls
- With it: Realistic movement and work behavior

### 08 - Making a Building Pack

**What You'll Learn:**
- Working with different plot sizes (1x1, 2x2, 3x3, Interior)
- Interior building design specifics
- Stage Item spreadsheet organization
- Performance tagging system
- Creating custom cells
- Updating buildings post-release
- Building skin variations
- Releasing your addon

**Time:** 5-10 hours | **Prerequisites:** 07 complete

**Plot Size Specifics:**

| Size | Helper | Use Case |
|------|--------|----------|
| 1x1 | Alignment Helper 1x1 | Small buildings |
| 2x2 | Alignment Helper 2x2 | Medium buildings |
| 3x3 | Alignment Helper 3x3 | Large buildings |
| Interior | Interior helper (wall+floor) | Indoor-only |

**Interior Buildings:**
- Usually no building model (just invisible marker)
- Use SS2_Interior_NoModels.csv spreadsheet template
- Furniture SCOL + clutter SCOL + stage items
- Keeps file size low (good for Xbox)

**Performance Tags (Column L):**
- 1 = Detailed Models
- 2 = Extra Lighting
- 3 = Animated Objects
- 4 = Special Effects
- 5 = Radios
- 6 = Sound Emitters
- 7 = Actors (NPCs)
- 8 = Containers
- 9 = Clutter
- 10 = Water Planes

**Building Skins:**
- Alternate art for building plans
- Can swap models, stage items, or both
- Append vs Replace stage items
- Use same import process
- Single-column spreadsheet for models

---

## Guided Series - Learn to Create City Plans

### 00 - Preparing to Create City Plans

**What You'll Learn:**
- Export Fallout 4 settlements
- Recommended building mods
- Performance considerations
- Planning methodology

**Time:** 30 minutes | **Prerequisites:** None

### 01 - Your First City Plan

**What You'll Learn:**
- Design settlement in-game
- Export using built-in system
- Use web tool to generate plugin
- No Creation Kit or XEdit required
- Simple and fast process

**Time:** 1-2 hours | **Prerequisites:** SS2 installed

**Process:**
1. Build settlement exactly as you want Level 1
2. Open console and export settlement
3. Visit [simsettlements.com/tools](https://www.simsettlements.com/tools)
4. Upload exported file
5. Fill out basic info (name, description)
6. Download generated plugin
7. Test in-game

### 02 - Leveled City Plans

**What You'll Learn:**
- Build Level 2 and Level 3 settlements
- Export multiple levels
- Configure level progression
- Organic building upgrade system

**Time:** 2-4 hours | **Prerequisites:** 01 complete

**Leveling Strategy:**
- Start with Level 1 design
- Build Level 2 expanding infrastructure
- Build Level 3 with advanced features
- Each level builds on previous
- Players see progression over time

### 03 - Wasteland Reconstruction Kit

**What You'll Learn:**
- Special mod for expanded building options
- Dramatically more buildable items
- No additional mod requirements
- Using in City Plans

**Time:** 1 hour | **Prerequisites:** 02 complete

### 04 - Advanced Possibilities

**What You'll Learn:**
- Manipulate plots programmatically
- Scrap items between upgrades
- Conditional item spawning
- Quest-triggered content
- Complex logic systems

**Time:** Variable | **Prerequisites:** 03 complete

---

## Guided Series - Learn to Create HQ Content

### 00 - Intro to HQ

**What You'll Learn:**
- What HQ is and what you can do
- Content types available
- Learning requirements
- Tutorial overview

**Time:** 10-15 minutes | **Prerequisites:** None

### 01 - Your First Room Design

**What You'll Learn:**
- Design alternate room layout
- No 3D modeling required
- No coding required
- Fast content creation
- Test in-game

**Time:** 1-2 hours | **Prerequisites:** None

### 02 - Understanding Room Configs

**What You'll Learn:**
- Room Configs control room purpose prompts
- Transform rooms into custom types
- Customize what player can build
- Advanced customization options

**Time:** 1-2 hours | **Prerequisites:** 01 complete

### 03 - Adding Room Functionality

**What You'll Learn:**
- Add gameplay impact to room designs
- Setup functionality beyond visuals
- Advanced field configuration
- Gameplay mechanics integration

**Time:** 2-3 hours | **Prerequisites:** 02 complete

### 04 - Updating Room Designs (COMING SOON)

**What You'll Learn:**
- Edit existing room designs
- Update layouts
- Change functionality
- Fix mistakes

**Prerequisites:** 03 complete

### 05 - Room Upgrades (COMING SOON)

**What You'll Learn:**
- Create upgrade layers for rooms
- Lighting upgrades
- Defensive upgrades
- Tech tree systems

**Prerequisites:** 04 complete

### 06 - Unlockable HQ Projects (COMING SOON)

**What You'll Learn:**
- Condition projects behind requirements
- Quest progression unlocks
- Player-based unlocks
- Complex logic chains

**Prerequisites:** 05 complete

### 07 - Allies and Advisors

**What You'll Learn:**
- Add NPCs to HQ system
- Configure allegiance system
- Finale battle integration
- Chapter 3 story content

**Time:** 2-3 hours | **Prerequisites:** 03 complete

---

## Topic Series

Specific tutorials targeting one aspect. Assume Guided Series knowledge.

### Building & Building Plans

| Topic | Purpose |
|-------|---------|
| **Addon Registration** | Configure addon to register with SS2 |
| **Building Model Guidelines** | Best practices for model creation |
| **Usage Requirements Lock** | Lock content behind in-game states |
| **Theme Tags** | Tag building plans appropriately |
| **City Plan Webtool** | Field reference for City Plan maker |

### Gameplay Systems

| Topic | Purpose |
|-------|---------|
| **Brewery System** | Create discoverable beer recipes |
| **Character Stats** | Configure NPC preferences |
| **Discovery System** | Caravan-based content discovery |
| **Leaders System** | Create settlement leaders with traits |
| **Pets and Pet Names** | Add purchasable pets |
| **Supply Resources** | Register ammo, armor, chems, weapons |
| **Unlock System** | Trigger content unlocks |
| **World Repopulation** | Populate world buildings with residents |

### Advanced Systems

| Topic | Purpose |
|-------|---------|
| **Custom Worldspaces** | Create custom worlds with SS2 |
| **Dynamic Flags System** | Custom flag/banner swapping |
| **Holiday System** | Add new holidays and decorations |
| **Industrial Conversion** | Production class mechanics |
| **Magazine Printer** | Inject magazines into bookstores |
| **New Bugle Newspaper** | Write in-game newspaper articles |
| **Units and Loadouts** | War mechanics for Chapter 3 |

### Reference Materials

| Guide | Content |
|-------|---------|
| **Building Model Guidelines and Pitfalls** | Important creation info, common mistakes |
| **Usage Requirements Lock Explanation** | Detailed lock system documentation |
| **Industrial Conversion and Production** | Production class mechanics |
| **Default Trait Effects** | Supported effects for custom traits |
| **Theme Tags** | Tagging system and best practices |
| **City Level Guidelines** | Design consistency guidelines |
| **City Plan Webtool** | All fields explained |

---

## Building Guidelines

### Model Creation Best Practices

**Structure:**
- Static collection (SCOL) for combining pieces
- Collision geometry for proper physics
- Navcuts for pathfinding areas
- Proper coordinate system (0/0/0 centered)

**Performance:**
- Use kit-bashed existing models (don't model from scratch)
- Combine static pieces in SCOL
- Avoid too many polygons
- Test performance regularly

**Common Pitfalls:**
- Incorrect collision (walking through walls)
- Missing navcuts (NPCs can't path)
- Models at wrong coordinates (placement issues)
- Forgetting to save nif files
- Not testing in-game before finalizing

### Design Philosophy

**Building Progression:**
- **Level 1**: Struggling appearance (minimal decoration)
- **Level 2**: Improving conditions (better furniture/lighting)
- **Level 3**: Thriving business (luxury items, full decoration)

**For Each Level:**
- Expand or improve structure
- Add electricity/lighting
- Increase decoration and clutter
- Maintain architectural consistency

### Testing Checklist

Before releasing addon:
- [ ] Building appears in-game
- [ ] Level 1 looks correct
- [ ] Level 2 shows progression
- [ ] Level 3 shows full build-out
- [ ] NPCs can navigate without issues
- [ ] Furniture markers function properly
- [ ] Stage items spawn correctly
- [ ] Lights illuminate space
- [ ] No floating objects
- [ ] Performance acceptable
- [ ] Works on clean saves
- [ ] Works on existing saves with addon

---

## Releasing Your Addon

### Pre-Release Checklist

- [ ] Content created and tested
- [ ] Shared with friends/community for feedback
- [ ] Load order verified
- [ ] All files included
- [ ] Mod page created with description
- [ ] Branding materials applied
- [ ] Version number set correctly
- [ ] README or documentation included

### Distribution Platforms

| Platform | Link | Notes |
|----------|------|-------|
| **Nexus Mods** | [nexusmods.com](https://www.nexusmods.com/fallout4) | Recommended, most players |
| **Bethesda.net** | [bethesda.net](https://bethesda.net) | PC and console access |
| **Community Forums** | [simsettlements.com/forums](https://simsettlements.com/forums) | Direct sharing |

### Post-Release Maintenance

**Version Management:**
- Never delete forms (causes save corruption)
- Tag obsolete forms with "_Obsolete" in ID
- Increase Mod Version Global for new content
- Test on both new and existing saves

**Updates:**
- Document changes in patch notes
- Announce updates in forums
- Test thoroughly before release
- Provide migration instructions if needed

### Community Recognition

- Post in forums to announce addon
- Join Sim Settlements Discord
- Engage with community feedback
- Contribute to ecosystem
- Share knowledge with other creators

---

## Community Resources

### Official Resources

| Resource | Purpose |
|----------|---------|
| **Forums** | Official discussion, announcements, help |
| **Discord** | Real-time chat, immediate help |
| **Addon Database** | Browse existing addons |
| **Branding Guide** | Logos, fonts, design resources |

### Learning Channels

- **Video Tutorials**: Companion videos for guides
- **Example Addons**: Study official SS2 content
- **Community Creations**: See what others made
- **Feedback Loop**: Iterate and improve

### Best Practices

**Before Releasing:**
- Share with 2-3 people for testing
- Get feedback on design choices
- Verify all files included
- Test on different systems

**While Developing:**
- Keep backups of working versions
- Document your process
- Take screenshots for promotion
- Join community discussions

**After Releasing:**
- Monitor comments for bugs
- Respond to feedback professionally
- Consider community suggestions
- Plan future content
- Help newer addon creators

---

## Common Questions

### Q: Do I need 3D modeling experience?

A: **No!** Kit-bashing existing models covers most needs. You rearrange and combine existing pieces—no sculpting required.

### Q: How long does it take to create content?

A: **Highly variable** (30 min for simple skins, hours for complex buildings). Start small and build up.

### Q: Can I port SS1 addons?

A: **Yes!** Architecture is different, but knowledge transfers. Simpler conversion process available.

### Q: What's the simplest addon to start with?

A: **Building skins** (recolored buildings). Then single-level buildings. Then multi-level. Finally City Plans.

### Q: Do I need DLC to create addons?

A: **No DLC required** to create. Some building classes require Automatron DLC for players.

### Q: Can I make money from addons?

A: **These are free mods.** Focus on creating quality content the community will enjoy.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 24, 2026 | Complete guide: 8 building tutorials, 4 city plan tutorials, 7 HQ tutorials, 20+ topic guides, reference materials, best practices |

---

## Credits & Attribution

This guide is based on official Sim Settlements 2 addon creator documentation from:
- Official Sim Settlements website (simsettlements.com)
- Addon Maker's Toolkit
- Community tutorials and examples
- Official Discord server

Special thanks to:
- Sim Settlements 2 development team for comprehensive tutorials
- Community addon creators for inspiration
- Forum helpers for supporting new creators

---

**Last Updated:** January 24, 2026 | **Version:** 1.0

For the latest information and tutorials, visit: [simsettlements.com/site](https://simsettlements.com/site)
