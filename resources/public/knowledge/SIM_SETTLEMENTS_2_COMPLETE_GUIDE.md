# Sim Settlements 2 Complete Guide

**Version:** 1.0 | **Last Updated:** January 24, 2026

## Table of Contents

1. [Overview](#overview)
2. [What is Sim Settlements 2?](#what-is-sim-settlements-2)
3. [SS2 vs Original Sim Settlements](#ss2-vs-original-sim-settlements)
4. [System Requirements](#system-requirements)
5. [Installation Guide](#installation-guide)
6. [Getting Started](#getting-started)
7. [City Manager Holotape](#city-manager-holotape)
8. [Prepopulation System](#prepopulation-system)
9. [City Plans](#city-plans)
10. [Addons and Expansions](#addons-and-expansions)
11. [Troubleshooting](#troubleshooting)
12. [FAQ](#faq)
13. [Community Resources](#community-resources)

---

## Overview

Sim Settlements 2 is a comprehensive settlement management mod for Fallout 4 that transforms the settlement system with fully voiced NPCs, an engaging questline, and automation features. Unlike the original Sim Settlements, SS2 offers a complete story experience with dozens of quests and characters that give meaning to rebuilding the Commonwealth.

**Key Features:**
- Fully voiced main questline with dozens of NPCs
- Automated settlement management with City Plans
- Choice between manual building or full automation
- Multiple story chapters with unique missions
- Settlement management terminal and holotape interface
- Community-created addon packs for endless customization
- Support for PC (Vortex, Mod Organizer 2), Xbox, and Xbox Game Pass

---

## What is Sim Settlements 2?

Sim Settlements 2 asks the fundamental question: "What if there was a reason for my character to help rebuild settlements?"

### Story Elements

You'll meet a **Stranger** who appears in your first settlement and takes you through an epic narrative of rebuilding the Commonwealth while battling forces that would prevent it. This isn't just a settlement system—it's an entire questline with:

- **Dozens of Fully Voiced NPCs**: Characters with their own motivations, quests, and story arcs
- **Multiple Story Chapters**: Three main chapters of content with significant quest progression
- **Dynamic World Events**: Encounters that impact your settlements and the Commonwealth
- **Moral Choices**: Decisions that affect how your settlements develop and which factions support you

### Core Gameplay Loop

1. **Discover**: Meet NPCs, learn their stories, and unlock new settlement features
2. **Build**: Create settlements using City Plans or manual building
3. **Manage**: Assign settlers to plots and watch them produce resources
4. **Progress**: Complete quests that unlock new tools, buildings, and story content
5. **Expand**: Rebuild more settlements and grow your Commonwealth presence

### Technical Foundation

SS2 was coded from the ground up to provide:
- Faster settlement processing than the original
- More stable and expanded feature set
- Better memory management for large settlements
- Enhanced scripting capabilities through Workshop Framework
- Optional Script Extender (F4SE) for advanced features

---

## SS2 vs Original Sim Settlements

### Key Differences

| Feature | SS1 | SS2 |
|---------|-----|-----|
| **Story/Questline** | Minimal | Extensive (3 chapters, dozens of NPCs) |
| **City Plans** | Limited | Hundreds available via addons |
| **Automation** | Basic | Advanced with multiple plot types |
| **NPCs** | Few | Dozens with full voice acting |
| **Frameworks** | Basic | Requires Workshop Framework |
| **Compatibility** | SS1 addons | SS2-specific addons (not backwards compatible) |
| **Updates** | Bug fixes only | Active development |
| **Recommended** | Legacy players | All new players |

### Important Note on Compatibility

**SS2 is what you should play, and SS1 is largely kept online for legacy players.**

The back-end architecture of SS2 is fundamentally different from SS1:
- **Nothing from SS1 is compatible with SS2** (addons, city plans, etc.)
- You **cannot use both on the same save file**
- SS1 addon authors are converting content to SS2 format
- You don't need SS1 installed to play SS2

---

## System Requirements

### Hardware Requirements

| Requirement | Specification |
|-------------|---------------|
| **OS** | Windows PC or Xbox (One/Series S/X) |
| **Storage** | Approximately 1GB disk space |
| **RAM** | Standard Fallout 4 requirements |
| **GPU** | Standard Fallout 4 requirements |

### Software Requirements

#### Base Game
- **Fallout 4** (version 1.10.163.0 or higher)
- **No DLC required** (compatible if installed)

#### Required Mods

| Mod | Purpose | Download |
|-----|---------|----------|
| **Workshop Framework** | Expands settlement capabilities | [Nexus Mods](https://www.nexusmods.com/fallout4/mods/68620) |
| **HUD Framework** | Soft requirement for UI features | [Nexus Mods](https://www.nexusmods.com/fallout4/mods/65889) |

#### Optional but Highly Recommended

| Mod | Purpose |
|-----|---------|
| **Sim Settlements 2 - Chapter 2** | First story expansion |
| **Sim Settlements 2 - Chapter 3** | Second story expansion |
| **SS2 Extended** | Additional city plans and content (PC only) |

---

## Installation Guide

### Quick Start - Vortex Collections

**Best for:** Players new to modding

1. Install **Vortex** from [nexusmods.com](https://www.nexusmods.com)
2. Choose one of the Starter Collections:
   - **Sim Settlements 2 Starter**: Core experience
   - **Sim Settlements 2 Starter+**: Core + community addons
   - **Sim Settlements 2 Starter+ F4SE**: Everything + Script Extender

3. Click the collection link and use Vortex's one-click installer
4. Each collection works seamlessly with the others—upgrade later without uninstalling

**Advantages:**
- Fastest setup (10-15 minutes)
- Automatic load order management
- Works with both free and subscription Nexus accounts
- Can upgrade to advanced collections later

### Manual Installation - Vortex

**Best for:** Players who want control over what they install

1. Install and setup Vortex
2. Download these mods in order:
   - HUD Framework
   - Workshop Framework
   - Sim Settlements 2
   - (Optional) Sim Settlements 2 - Chapter 2
   - (Optional) Sim Settlements 2 - Chapter 3

3. Install via Mod Manager Download in each mod's page
4. Enable in the MODS tab in this order:
   - HUD Framework
   - Workshop Framework
   - Sim Settlements 2
   - Chapter 2 (if installed)
   - Chapter 3 (if installed)

**Important:** Make sure plugins are activated in the Plugins tab

### Manual Installation - Mod Organizer 2

**Best for:** Advanced modders

1. Install and setup Mod Organizer 2
2. Download mods:
   - HUD Framework
   - Workshop Framework
   - Sim Settlements 2 (+ optional chapters)

3. In Downloads tab, right-click each archive and select Install
4. Confirm names are correct before clicking OK
5. Enable by checking boxes in order
6. Verify plugins are activated

**Special Note:** If you haven't updated Fallout 4, download the **Old-Gen Replacers** optional file from Workshop Framework and allow it to overwrite.

### Xbox Installation

**Setup Steps:**

1. Boot Fallout 4 → Main Menu → Mods
2. Search and download in order:
   - Workshop Framework
   - Sim Settlements 2
   - HUD Framework
   - Any desired addons

3. Arrange load order (Master files auto-load at top):
   - Workshop Framework (master)
   - Sim Settlements 2 (master)
   - HUD Framework
   - Other mods/addons

**Space Limitation Warning:**
Xbox has limited mod space. Starting with just core SS2 is recommended. The two story chapters take up most of your available space. Future Xbox storage expansion may allow more content.

**Bug Note:** There's a current Xbox Fallout 4 bug preventing all chapters from being downloaded at once for most players. Start with base SS2; the bug should be resolved in upcoming patches.

### Updating

#### Vortex/MO2 Instructions

1. Visit mod page and download new version
2. Install new version normally
3. Disable or uninstall previous version
4. Update all mods (frameworks, chapters, addons) to latest version

#### Xbox Instructions

⚠️ **Important:** Xbox cannot revert mod versions. Only update if necessary.

1. Make a **hard save** (no quicksave/autosave)
2. Favorite the mod you're updating
3. Disable and delete the mod → Clear cache
4. Re-download from Creations menu
5. Rearrange load order to match above
6. Exit and restart game to complete

**Safety Tip:** Keep a backup save without mods in case update fails.

---

## Getting Started

### Standard Start

1. **Activate a Workshop** in any vanilla settlement (e.g., Sanctuary Hills)
   - This marks the settlement as owned by you
   
2. **Build, Power, and Activate** a vanilla Recruitment Radio Beacon
   - Don't need a magazine—just build one normally
   - Can be in any settlement you control
   - Doesn't have to be Sanctuary

3. **Wait a moment**: The Sim Settlements 2 questline will begin shortly
   - A Stranger will appear in your settlement
   - Approach them to start the conversation
   - This triggers the entire narrative experience

### Pro Tips for Starting

- **Use Quick Start**: Skip the magazine and just build a Recruitment Radio Beacon
- **Multiple Settlements**: If you place beacons in multiple settlements, the Stranger may appear in any of them
- **Check Buildings**: If you can't find the Stranger immediately, check settlement buildings and crafting stations—they wander

### Verify Proper Loading

Check these indicators to confirm SS2 loaded correctly:

| Indicator | Where | Requirement |
|-----------|-------|-------------|
| **Terminal** | Vault 111, Overseer's Office | Master Lockpicking (Master level) |
| **Holotape** | Vault 111, Overseer's Office | Retrieve from terminal area |
| **Magazine** | Sanctuary workshop | Found on table/surface |
| **HUD Elements** | Workshop mode | Appears when you activate workshop |
| **SS2 Icon** | Workshop build mode | Green icon shows up |
| **Stranger Spawn** | After building Beacon | NPC appears for conversation |

If these don't appear:
- Check load order
- Verify plugins are enabled
- See Troubleshooting section

### Alternative Start - Skip the Questline

If you don't want to play through the story:

1. Get the **City Manager 2078 Holotape**:
   - Build a City Planner's Desk in your settlement
   - Or find it in Vault 111 (Overseer's Office)

2. Open the holotape → **Tools** → **Cheats**
3. Use **Unlock All Plot Types** to get all building options
4. Use **Unlock All Tools** to get all settlement tools

**Warning:** Skipping the questline may disable some progression rewards and functionality.

### Prepopulation System (New)

With Release 3.5.0, you can populate the world before leaving Vault 111:

1. **Find the City Manager Holotape** in your Prewar Sanctuary bedroom (new game)
2. **Select Configure Prepopulation**
3. **Or in Vault 111**: Activate the ASAM Poster behind the doctors
4. Choose which City Plans to use and their level
5. Settlements will be pre-built when you leave the vault

---

## City Manager Holotape

The City Manager 2078 Holotape is your primary management tool for Sim Settlements 2.

### How to Obtain

| Method | Steps |
|--------|-------|
| **Vault 111** | In Overseer's Office, access terminal (Master Lockpicking), grab holotape |
| **City Planner's Desk** | Build in settlement → Select → Craft Holotapes → Select City Manager 2078 |
| **Mod Configuration Menu** | If MCM installed, select SS2 and choose Give Holotape |

### Main Functions

#### Settlement Management
- View settlement status and info
- Assign settlers to plots
- Configure settlement options
- Monitor resource production

#### Tools & Cheats
- Force unlock content if skipping questline
- Toggle quest doors (Hijack system)
- Change main quest settlement
- Configure prepopulation settings

#### Advanced Options
- Reboot failed quests
- Configuration settings
- Debug utilities for troubleshooting

### Common Tasks

**Change Main Quest Settlement**
- City Manager Holotape → Tools → Advanced → Change Main Quest Settlement
- Useful if Stranger doesn't appear

**Toggle Quest Doors (Hijack)**
- Used for location conflicts with other mods
- City Manager Holotape → Tools → Hijack
- Enable/disable quest doors as needed

**Check Settlement Status**
- Review settler assignments and plot activity
- Monitor food, water, and power production

---

## City Plans

City Plans are pre-designed settlement layouts that automatically build your settlements.

### What Are City Plans?

City Plans are complete settlement designs that include:
- Building layouts and structure placement
- Settler assignments to various plots
- Power distribution and wiring
- Defense setups
- Resource production optimization
- Decorative elements and landscaping

### Using City Plans

1. **Activate your settlement workshop**
2. **Open City Manager Holotape**
3. **Find "City Plans" option**
4. **Select desired plan for that settlement**
5. **Watch as settlers automatically build** the planned layout

### City Plan Levels

City Plans come in multiple levels:

| Level | Description | Cost |
|-------|-------------|------|
| **Level 1** | Basic setup, foundations, defensive structures |Entry-level |
| **Level 2** | Housing, crafting stations, initial production | Mid-range |
| **Level 3** | Advanced crafting, specialized production, decoration | High investment |

### Included City Plans

Sim Settlements 2 ships with:
- One-level basic City Plans (included in base mod)
- Multiple themes for different playstyles
- Foundation templates for customization

### Community City Plans

Hundreds of additional City Plans are available:

| Type | Examples |
|------|----------|
| **Themed** | Brotherhood of Steel, Raider, Tech, Industrial |
| **Specialized** | Military bases, farming settlements, trading posts |
| **Large Scale** | Vault-style underground, fortified compounds |
| **Aesthetic** | Survival camp, pre-war ruins, colonial style |

See **Addons** section for popular collections.

### Creating Custom Settlements

You can:
- Mix automatic City Plans with manual building
- Let SS2 build some plots, manually build others
- Use plots and plots together
- Use Blueprint system to save layouts

**Pro Tip:** Place Everywhere mod helps with difficult plot placement.

---

## Addons and Expansions

### Story Chapters

#### Chapter 2: Main Story Expansion
- **Requirements**: Fallout DLC - Automatron, Workshop Framework, Sim Settlements 2
- **Content**: Major questline continuation with new NPCs and missions
- **Download**: [Nexus Mods](https://www.nexusmods.com/fallout4/mods/77424)

#### Chapter 3: Second Story Expansion
- **Requirements**: Fallout DLC - Automatron, Chapter 2, Sim Settlements 2
- **Content**: Conclusion of main storyline with faction warfare (Conqueror mechanics)
- **Download**: [Nexus Mods](https://www.nexusmods.com/fallout4/mods/80965)

#### SS2 Extended (PC Only)
- Includes both chapters plus additional content
- Single download instead of multiple files
- Optional file for Chapter 3
- Recommended for convenience

### Community Addon Packs

#### Themed Plot Packs

**Baseline Plots Brotherhood** (mac92)
- 99 BOS-themed building plans
- At least one plan for each plot type
- Excellent for roleplay settlements

**Baseline Plots Raiders** (mac92)
- 110 Raider-themed building plans
- Themed production and defenses
- Perfect for evil or raider playthroughs

**Enclave Here** (choochoo1)
- Multiple Enclave-themed plots
- New world repopulation cell
- Enclave radio station

**Tech Settlements** (Argyuile)
- High-tech aesthetics
- Concrete, steel, and advanced infrastructure
- Futuristic building options

#### Advanced Functionality Packs

**IDEK's Logistics Station 2**
- Automatic supply line management
- Resource sharing optimization
- Convenience features for large empires

**Industrial Revolution of the Wasteland**
- 25 new industrial production plots
- Conversion and processing options
- Advanced manufacturing chains
- Requires all DLCs

#### Tools & Management

**SS2 Settlement Management Terminal** (cbrgamer)
- Constructible terminal for each settlement
- View plot assignments
- Monitor settler status and productivity
- Check resource production

**SS2 Settlers UI** (LyraAST)
- User interface for settler management
- Assign and manage settlers from any location
- View settler status and happiness

### Addon Database

**Samutz's Addon Website**: [Visit Database](https://simsettlements.com/site/index.php)
- Searchable database of all community content
- Organized by type and functionality
- Filter by version and requirements
- Community ratings and reviews

### Finding More Content

1. **Start with Collections**: Use one of the Starter Collections for immediate content
2. **Explore Nexus Mods**: Search "Sim Settlements 2" for hundreds of addons
3. **Check Forums**: Community discussion and recommendations
4. **Try Addon Database**: Samutz's organized catalog

---

## Troubleshooting

### Stranger Won't Appear

**Problem**: Built Recruitment Radio Beacon but Stranger doesn't show up

**Solutions**:
1. **Check multiple settlements** - Stranger may appear in different settlement with a beacon
2. **Restart game** - Exit to main menu and reload
3. **Load City Manager Holotape**:
   - Open holotape → Tools → Advanced
   - Click "OK" to check if quest reboot is needed
   - Select new main quest settlement if needed
4. **Check Sanctuary buildings** - Search homes and crafting stations
5. **Verify plugins are enabled** - Check plugins.txt in the Mod Organizer 2/Vortex

### Settlement Not Producing Resources

**Problem**: Settlement plots built but not producing resources/food/water

**Possible Causes**:
- Settlers not assigned to plots (use City Manager Holotape to check)
- Plots built but not powered
- Resource caps hit (based on settler population)

**Resource Formulas**:
- **Food**: 10 + (Population × 2)
- **Water**: 5 + (Population × 1.25)

**Solution**:
- Increase population for more resource capacity
- Verify settlers are assigned via City Manager Holotape
- Check Workshop Framework is updated to latest version

### Plots Won't Place

**Problem**: Can't place plots in workshop, placement issues

**Solutions**:
1. **Use Place Everywhere mod** - Helps with difficult placement
2. **After placing with Place Everywhere**:
   - Pick up the plot
   - Immediately cancel placement
   - This registers the new location properly
3. **Clear terrain** - Remove debris and objects blocking placement
4. **Check height** - Some plots need specific height clearance

### Quest Stuck/Won't Progress

**Problem**: Quest stage not advancing, can't complete objective

**Solutions**:
1. **Check conflicting mods** - See Known Issues section
2. **Use console to skip**:
   - Open console (~)
   - Type: `CompleteQuest [questID]`
   - Consult forums for specific quest IDs
3. **Load City Manager Holotape**:
   - Tools → Advanced → Reboot Quest
   - Select the stuck quest

**Common Conflicts**:
- Mods that skip vanilla questline (Start Me Up, SKK Fast Start, etc.)
- Mods that alter dialogue camera
- Item Sorters tagging SS2 quests

### Frame Rate/Performance Issues

**Problem**: Game running slowly with SS2 settlements

**Causes**:
- Large settlements near Sanctuary (too much processing)
- Too many mods + SS2
- Settlement limits set to -1

**Solutions**:
1. **Avoid large settlements near Sanctuary** - Builds up too much
2. **Disable unnecessary mods** - Check compatibility list
3. **Don't use mods that set build limits to -1**
4. **Manage plot density** - Don't over-build single settlement

### Save File Corruption

**Problem**: Game crashes or behaves strangely after update

**Prevention**:
- Always make hard save before updating
- Never delete mods from active saves
- Update all dependent mods together

**Recovery**:
- Load backup save from before update
- Wait for hotfix if available
- Consult forums if issue persists

---

## FAQ

### Installation & Compatibility

**Q: Can I upgrade my original Sim Settlements save to SS2?**

A: No. The original Sim Settlements controller quest is baked into every save immediately on first load, regardless of whether you started it. You cannot cleanly remove quest mods from saves. Start a fresh game for SS2 (or use an old save that never had SS1).

**Q: Do I need to start a new game?**

A: Recommended yes, but not required if your save never had original Sim Settlements. A new game gives you the full story experience.

**Q: Do I need DLC?**

A: No. Base Fallout 4 is sufficient. Some addons require specific DLC (Automatron for Chapters 2 & 3, others for specialized content).

**Q: Why are SS2 updates so large?**

A: Updates often require changes to core code in the ESM file or BA2 files. This necessitates re-issuing the entire mod rather than small patches. It's unavoidable given the architecture.

### Gameplay

**Q: How do I start the questline?**

A: Activate a workshop, then build, power, and activate a vanilla Recruitment Radio Beacon. The Stranger will appear shortly after.

**Q: Can I skip the questline?**

A: Yes. Get the City Manager Holotape and use Tools → Cheats → Unlock All Plot Types. Fair warning: skipping may break progression rewards and functionality.

**Q: How do I get more ASAM sensors?**

A: Complete parts of the Sim Settlements 2 main questline. They unlock progressively.

**Q: Can I build City Plans?**

A: Yes. SS2 includes basic one-level City Plans. Hundreds more are available as community addons.

**Q: Can I move plots I've built?**

A: Yes, but don't move tutorial plots until those specific quests are complete.

**Q: Does SS2 include Rise of the Commonwealth?**

A: Much of the functionality is built-in. Rise of the Commonwealth for SS2 released March 10, 2021, with additional city plans.

**Q: Does SS2 include Conqueror?**

A: Yes. War mechanics are included and expanded in Chapter 3 content.

### Mods & Addons

**Q: Are original Sim Settlements addons compatible?**

A: No. SS2's architecture is fundamentally different. SS1 addons must be converted by authors for SS2 compatibility.

**Q: Can I use Place Everywhere with SS2?**

A: Yes, we encourage it. After placing with Place Everywhere, pick up and cancel placement to register the new location.

**Q: What mods should I avoid?**

A: See Mod Conflicts section. Key incompatibilities include:
- Original Sim Settlements, Rise of Commonwealth (SS1), Conqueror (SS1)
- Unlocking Violence (breaks door system)
- Mods that skip vanilla quests
- Mods that disable dialogue camera

---

## Community Resources

### Official Community

| Resource | Purpose |
|----------|---------|
| **Sim Settlements Forums** | Official forums for discussion, help, suggestions, contests |
| **We Are Builders Discord** | Community-run Discord for building mods and Fallout 4 |
| **Patreon Discord** | Supporter community for SS2 development |

### Recommended Mods

While countless building mods complement SS2, a few key utilities vastly improve the experience. See the in-game resources or forums for suggestions.

### Getting Help

- **Forums**: Ask specific questions, report bugs, share ideas
- **Discord**: Real-time discussion and community support
- **Nexus Comments**: Bug reports on mod pages
- **Troubleshooting Guide**: Check Common Issues page first

### Contributing

- **Addon Creation**: Build your own City Plans, plot packs, or tools
- **Art & Fan Content**: Create fan art, videos, or guides
- **Bug Testing**: Help find and report issues
- **Translation**: Help localize SS2

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 24, 2026 | Initial complete guide: Installation, getting started, City Plans, addons, troubleshooting, FAQ, community resources |

---

## Credits & Attribution

This guide is based on official Sim Settlements 2 documentation from:
- Official Sim Settlements website and forums
- Mod pages on Nexus Mods and Bethesda.net
- Community-maintained wiki and documentation

Special thanks to the Sim Settlements 2 development team and community for creating and maintaining this incredible mod.

---

**Last Updated**: January 24, 2026 | **Version**: 1.0

For the latest information, visit: [Sim Settlements Official Website](https://simsettlements.com/)
