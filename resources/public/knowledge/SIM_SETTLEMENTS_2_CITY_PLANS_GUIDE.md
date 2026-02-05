# Sim Settlements 2: City Plans Complete Guide

**Version**: 1.0  
**Last Updated**: January 24, 2026  
**Author**: kinggath (Original Documentation)  
**Status**: Comprehensive Reference

---

## Table of Contents

1. [Intro to City Plan Creation](#intro-to-city-plan-creation)
2. [Basic City Plan](#basic-city-plan)
3. [Leveled City Plans](#leveled-city-plans)
4. [Wasteland Reconstruction Kit](#wasteland-reconstruction-kit)
5. [Advanced City Plan Possibilities](#advanced-city-plan-possibilities)

---

## Intro to City Plan Creation

Learn about how to set up your environment to start turning your settlement designs into City Plans.

### What Are City Plans?

City Plans allow you to share your settlement designs with other players, even on Xbox! Though they are so much more than that if you want them to be.

For many players, designing detailed, beautiful settlements can be difficult; and while Sim Settlements 2 makes it easier with plots, a hand-crafted settlement by an artistic mind is hard to beat. We are constantly asked for more unique designs people can use to skip all of the intricate building steps so they can focus on the gameplay side of things.

There are other solutions for sharing settlements, including Transfer Settlements, and the Workshop Framework layout system - where City Plans come out ahead is in the ability of designers to **tell a story**.

### Level System & Evolution

City Plans support a level system, where over time, the settlement design can evolve and change so when they return to the settlement, the settlers will have made dramatic changes to the design! In fact, you could technically stitch together 4 entirely different settlement designs as a City Plan and each time the settlement upgraded a different one would be built - including scrapping any necessary objects.

**All of this can be done without ever setting foot in the Creation Kit!** The design is done entirely in-game, and the final steps involve filling out a few fields on a web page we designed to make this process painless.

### SS1 City Plan Veterans

SS2 actually has a **scrap and restore phase between each level**, meaning you are no longer limited to a scrap phase at the start. This also makes building forward a lot more feasible (ie. designing level 1, then level 2, etc), as opposed to before where working backwards was the only practical way (ie. building your level 3 and then removing elements to eventually get to your foundation).

Beyond the levels, for those of you willing to dabble in the Creation Kit, City Plans can actually contain any number of layers that can react to gameplay elements such as quest completion, player level, or any other requirement you can dream up.

### Tools to Get Started

Making City Plans in Sim Settlements 2 is very simple, and only requires that you grab **F4SE** (Fallout 4 Script Extender), though there are a few other useful mods that we highly recommend.

#### Essential: F4SE

The Fallout 4 Script Extender is what allows us to actually export all of the data from your save file so we can generate the City Plan. Once you have this installed, Workshop Framework (which is already a requirement for SS2) has a simple to use in-game tool for handling the export.

**Installation Steps:**
1. Go to http://f4se.silverlock.org/
2. Click the 7z archive link near the top
3. Extract this archive to a new folder using 7-zip (free at https://www.7-zip.org/)
4. Select the Data folder, the exe, and the 2 dlls
5. Copy them to your Fallout 4 directory: `C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\`
6. Use f4se_loader to launch the game instead of the normal launcher
7. Create a shortcut to f4se_loader for quick access

**Safety Note:** F4SE is very safe and very easy to install. The team that maintains it is incredibly talented and know Bethesda's Creation Engine inside and out. When Bethesda patches the game, the script extender team is VERY fast about updating (generally within hours).

#### Ini Edits Required

You need to enable Papyrus debug logging for the Workshop Framework exporter to work:

1. Go to Documents folder
2. Navigate to `My Games\Fallout 4`
3. Open `Fallout4Custom.ini` with Notepad (create it if it doesn't exist)
4. Add this section if not present:
```
[Papyrus]
bEnableLogging=1
bEnableTrace=1
bLoadDebugInformation=1
bEnableProfiling=1
```
5. Save and close

#### Recommended Mods

| Tool | Purpose | Optional? |
|------|---------|-----------|
| Wasteland Reconstruction Kit | 10,000+ buildable items already in SS2 | Yes |
| Place Everywhere | Advanced placement & hotkeys | Yes |
| Workshop Plus | Layers, Copy/Paste, Undo, Blueprints | Yes |

---

## Basic City Plan

This guide will show you how to export your settlement design and use a simple web tool to generate a single-level City Plan for Sim Settlements 2.

### Quick Overview

For your first City Plan, we're going to create something similar to what's included with Sim Settlements 2 - a single level City Plan.

**Process:**
1. Export the settlement design using Workshop Framework export
2. Use a special web tool to convert that information into a plugin you can share
3. Since we're only doing one level, this goes very quickly!

### Exporting Your Settlement

**Step 1: Prepare Your Settlement**

Obviously, you need a settlement to export. If you don't have one, go build one! Or if you just want to test out the process really quickly - pick a settlement, go scrap a few items, place down a few others, and toss down a plot from Sim Settlements 2 and select a building plan for it.

*Optional:* If you would prefer a video demonstration of the export system, check out official SS2 tutorials!

**Step 2: Export Process**

1. Launch Fallout 4 and load the save file that has your settlement design you want to use as a City Plan
2. Go to the settlement's workbench and choose the **Manage** option
   - If Manage does not appear, you have another mod adding an activation option to the workbench
   - Access it via Workshop Framework MCM menu or holotape under Tools section
3. Choose **Settlement Layout**, then **Export Layout**
4. Confirm you want to export and wait for it to complete
   - If Export Layout does not appear, you are either not running F4SE or Workshop Framework failed to install
5. A pop-up will inform you of the filename generated
6. Find the file in: `Documents\My Games\Fallout4\Logs\Script\User`
7. Rename it to something you'll remember
8. Exit the game

### Using the Web Tool

Now that you've exported your settlement, it's time to convert it into a City Plan plugin!

**Step 1: Access the Web Tool**

1. Open a web browser and go to https://www.simsettlements.com/tools/cpV2maker.php

**Step 2: Fill Out Form**

1. **City Plan Name**: This allows the player to distinguish which plan they are about to use
2. **Designer(s)**: Enter your name so people know who made the plan - this will show up in game!
3. **Description**: Enter a brief description of your City Plan, and any extra information you think the player might like to know. For example, it's common for community made city plans to list how many settlers the plan will support

**Step 3: Upload & Generate**

1. Click the **Choose File** button in the center of the form
2. Upload the export file you created in the previous section
3. Click **Create ESP File** and a new plugin will be downloaded to your PC in a few moments!

**Step 4: Finalize**

1. Rename the file you just created to anything you like, for example: `SS2_CityPlan_TestCityPlan`
2. You're Done!

### Testing Your City Plan

Your plugin is created and you can now share it with anyone and they will be able to use your design in their game, even Xbox players if you upload to Bethesda.net!

**But let's test it first:**

1. Move the file you downloaded to `Data` folder in your Fallout 4 install: `C:\Program Files (x86)\Steam\steamapps\common\Fallout 4\Data\`
2. Load the game, then go to the **Mods** screen
3. Press the **Load Order** button and find your new plugin file
4. Make sure it is checked in (if not, highlight it and press the **Enable** button)
5. Exit the mods screen and load a save file
6. Head to the settlement your City Plan is for
7. Build a **City Planner's Desk** in the settlement
8. To speed up testing, turn off some gameplay options:
   - City Building > Leader Requirement: **OFF**
   - Costs > Construction Costs, Plot: **OFF**
   - Costs > Startup Costs, City Plan: **OFF**
9. Activate the **Manage City** option on the desk (the Blueprint object)
10. Choose **Select City Plan** and cycle through until yours appears
    - If it doesn't appear, wait several minutes - it takes time to register
11. Select your plan, then select **Yes, Tear It All Down**
12. Your design should be built in front of you!
13. Try assigning a settler to a plot - the original building plan should be chosen

---

## Leveled City Plans

Learn how to create a City Plan with multiple levels that build over time.

### What Are Leveled City Plans?

While not included in any of the City Plans that ship with Sim Settlements 2, levels are definitely supported - just like they were in Sim Settlements 1. Meaning that over time, settlers can upgrade an entire settlement.

From your perspective as a designer, this effectively means you can **stitch together multiple settlement designs to tell a little story of prosperity** (or ruin???) to show how the settlement evolved over time.

You can have up to **4 total levels** in a City Plan:
- **Level 0 (Foundation)**: Built immediately when player uses City Plan
- **Level 1-3**: Built as settlement meets criteria (happiness, scrap, beds/plots)

### Tips for Effective Levels

Before creating a leveled plan, you'll need **4 save files** with different variations of your settlement.

**Key Rule:** Don't build the settlement 4 times - just have 4 variations of it. The system was designed to be so versatile, you could literally take 4 different save files with completely different designs and use them all to make one City Plan!

#### Two Problems to Avoid

1. **Performance**: If each design is dramatically different, the entire settlement would need to be torn down and rebuilt each level
2. **Immersion**: When an "upgrade" occurs, players assume there's a thematic connection between upgrades

#### Two Practical Approaches

**Approach 1: Build, Save, Repeat** (Easiest for Beginners)

Simply start building a settlement, make a save at some point, then continue building for a while, make another save, and repeat until you have 4 saves.

**Tip:** You can save from console to a specific file name: `save MySanctuaryLevel3`

This approach is totally valid and recommended for your first leveled plan!

**Approach 2: Building In Reverse** (Advanced - Minimizes Processing)

1. Focus on your final design first (Level 3)
2. Make another save and start scrapping things
3. Possibly replace some things with lesser versions (metal railings → wood ones)
4. Repeat this process two more times to get your 4 levels

**Advantages:**
- Since you knew what you're building toward, you can better plan upgrade jumps
- Example: Scrap 1/4 of settlement each time for even progression
- Or get detailed: materials for planning → rickety version → final level

**Disadvantage:** More work scrapping items, but saves time if you change your mind during design

### Generating a Leveled City Plan

Now that you have your level saves, it's time to bring them together in a City Plan!

**Note:** 4 is the max, but you can do 2 or 3 instead - the system supports that!

**Step 1: Export All Levels**

1. Export the designs of each of your saves using Workshop Framework layout export
2. Name each export file by settlement name + level: `SanctuaryLevel0`, `SanctuaryLevel1`, etc.

**Step 2: Access Web Tool**

1. Open web browser and go to https://www.simsettlements.com/tools/cpV2maker.php
2. Fill out the first 3 fields (City Plan Name, Designer(s), Description)

**Step 3: Configure Leveled Plan**

1. Click the **Switch to Leveled Plan** link to expand available file dropdowns
2. Point each of your export log files to the corresponding **Choose File** box
3. If you are doing less than 4 levels, upload your highest level to **Level 3 Export** field
4. Work your way down in reverse
5. Leave the other fields empty (tool handles the rest)

**Step 4: Optional - Population Counts**

If you know the bed plus residential plot count at each level, fill those boxes to the right of each log file. Otherwise, the tool will use the population found in each export.

**Step 5: Generate & Finalize**

1. Click **Create ESP File** (will take longer than single-level as tool optimizes)
2. Rename the file: `SS2_CityPlan_TestLeveledCityPlan`
3. You're Done!

### Testing Leveled City Plans

To test this City Plan, follow the same steps as basic City Plan testing, then use this console command to test upgrading:

```
cqf SS2_CityPlanManager TestCityUpgrade
```

**Important:** Be sure the previous level has finished before you run the command again. If you spam it, things could get weird. If using Cinematic Mode (enabled by default), it will keep you in that mode until upgrade is complete.

---

## Wasteland Reconstruction Kit

Goes over the Wasteland Reconstruction Kit addon for Sim Settlements and how some of the special items in it work.

### What is WRK?

This isn't exactly a tutorial, but it's an important part of designing City Plans, and deserves a place in this guide. One of the things you're going to want to consider when making City Plans is how you can reduce the number of mods you're using as much as possible.

**Why?** Every mod you introduce reduces the likelihood players will see the full design of your settlement, as many people will be turned off by having to download a large collection of workshop mods to use a City Plan.

### Two Solutions

1. **City Plans automatically skip items** the player doesn't have installed (mods aren't required!)
2. **Wasteland Reconstruction Kit (WRK)** makes most items included in SS2 buildable!

### WRK Overview

WRK is a special addon for Sim Settlements 2. This mod adds over **10,000 buildable items** to workshop mode that don't actually require any other mods to use beyond Sim Settlements 2!

**Key Fact:** Not even WRK itself is required by players to have these items placed by City Plans! All of the models, textures, and forms are actually part of SS2 or the vanilla game already. WRK simply makes them buildable, adds snap points to some items, and makes other small modifications.

### What's Included in WRK

#### Structures, Furniture, Decorations

Includes tons of buildable items:
- Most SS2 plot structures buildable as prefabs
- All clutter pieces and clutter collections from SS2's random clutter system
- Collection of custom signs for specific settlements (3 variations each)
- Wood walls, planks, and boards in 10 different colors
- Teardowns of complex vanilla items into individual pieces (workbenches, vehicles, etc.)
- Multiple letter/number kits for custom signs and graffiti
- Machine Building Kit in 8 different colors

#### Specialty Objects & Markers

**Animation Markers**
- Place "Blue Man" markers to give NPCs extra things to do
- Works great with SS2 Visitor system

**Attack Markers**
- Redefine vanilla raid spawn points

**Effect Markers**
- Visual effects: fire, electricity, water sprays, more

**Ambient Lighting**
- Lights with no visible source (useful for extending lighting range)

**NPC Spawners**
- Spawn friendly workshop versions of animals and creatures

**Sound Markers**
- Machine, wind, water, and other sound loops

**Navmesh Blocks**
- Invisible blocks for NPC pathfinding on unusual objects

**Climbable Ladders**
- Snappable ladders NPCs can navigate

#### SS2 Code-Controlled Markers

**Patrol Markers**
- Used by Ally leader traits and future Faction control system
- Define guard patrol routes

**Camera Markers**
- For Cinematic Mode city tours
- Optional center point

**Civilian/Guard Spawners**
- Create visitor presence at settlements
- NPCs claim nearby animation markers

**Holiday Markers**
- Replaced with holiday-themed items based on in-game date
- Christmas present, Jack-o-Lantern, "easter grenades", etc.

**Settlement Flags/Banners**
- Available in SS2 build menu under Decorations
- Automatically matched to centrally-controlled design

### Availability Notes

#### PC-Only Items

Due to size constraints on Xbox modding, a few hundred non-structural items are PC-only. These will automatically be skipped for Xbox players (no floating items issue).

#### DLC Items

WRK requires all DLC because items have been made buildable. Assumption is designers have invested in DLC. Like other modded items, City Plans automatically skip DLC items players don't have.

---

## Advanced City Plan Possibilities

Goes over some of the advanced things you can do with City Plans, including special objects, unique plot functions between levels, and Creation Kit enhancements.

### Changing Plots

With Sim Settlements 2, City Plans can actually **change plots during upgrades!** Your plan can:
- Upgrade a plot
- Change the building plan
- Apply a skin
- Change to a completely different plot type

**Huge Advantage:** Given the new Advanced/Hi-Tech building classes, you can provide another path to upgrading plots beyond just the default 3 levels.

**Use Cases:**
- Start as quaint farm town → evolve into Commercial empire
- Hunker down as isolationists → emerge as technologically advanced industrial powerhouse

### How Plot Changes Work

If the online tool detects two plots occupying the exact same coordinates and rotation, it assumes they are the same plot.

**Example Flow:**
1. Level 0: 2x2 Agricultural plot with Corn Mud Farm building plan
2. Level 1: Same location, switch to Razorgrain Mud Farm + Level 2
3. Level 2: Same location, Change to Commercial Plot + new building plan/skin

**Result:** Player experiences exact same progression in their game!

**Important:** Don't move or rotate plots if you want them to be treated as the same plot.

**Exception:** If player tinkers with the plot after City Plan builds, future level changes are ignored (player control priority).

### Scrapping Between Levels

Sim Settlements 2 runs a pseudo-scrap phase between each upgrade.

#### How It Works

**Initial Scrapping (When City Plan Applied):**
1. Destroys anything player built themselves
2. Destroys items from other automated systems (Transfer Settlements, Workshop Framework Layouts)
3. Scraps anything YOU had scrapped in your Level 0 save
4. Restores vanilla objects your Level 0 save left behind

**Level Upgrade Scrapping (Same Process Without):**
- Does NOT scrap player-placed items
- Does NOT scrap external system items
- DOES scrap vanilla items you scrapped in each level save
- DOES restore vanilla items your level save left behind

**Goal:** Faithfully recreate each save while letting player add their own touches!

#### No Extra Work Required

By using Workshop Framework to export, all necessary data for this is collected automatically!

### Non-Standard Settlements & Scrap Mods

If using a special scrap mod (Scrap Everything) or creating City Plans for mod-added/Creation Club settlements, you need extra steps.

**Standard settlements that DON'T need extra steps:**
- 29 vanilla game settlements
- 7 DLC-added settlements

**Exception:** If using a scrap mod, follow these steps:

#### Scrap Profiles

You need to provide "Scrap Profiles" - Workshop Framework exports under specific conditions:

**Profile 1: Untouched Settlement**
- Export of settlement before building/scrapping anything
- Teaches web tool what's safe to scrap

**Profile 2: Fully Scrapped Settlement**
- Export after every scrappable item is removed
- Defines "sacred items" (workbench, invisible markers)

#### Using Scrap Profiles

When generating City Plan in web tool:
1. Click **Configure Scrap Profiles** link
2. Upload both profile export files
3. Tool uses these to determine what's safe to scrap

### Creation Kit Edits

If you want to do cool stuff with City Plans, load them into the Creation Kit after generating in web tool.

#### Finding Your Records

1. Open City Plan plugin in Creation Kit
2. Go to Items > MiscItem
3. If you didn't set a prefix, items prefixed with `my_`
4. Look for records with **CityPlan** and **CPLayout** in the name

#### CityPlan Record - Advanced Properties

Each City Plan has a central record tying together each level (CPLayout objects).

**PreferredFlag** (Optional)
- Points to Armor record beginning with `SS2_ThemeDefinition_Flags_`
- Sets flag to use when City Plan is built
- Can point to addon pack versions or SS2Extended

**bHighEndOnly** (Optional)
- If plan is particularly detailed, set to true
- Ensures players without all Performance Settings ON won't have this auto-chosen
- Useful for City Plan Packs with varying detail levels

**ThemedForFactions** (Optional - Future Use)
- Fill with Faction records your plan is designed for
- When Conqueror mechanics return, prioritizes your plans by faction control
- Can enter multiple factions
- Uses Universal Form (can point to DLC/other mod factions)

**UpgradeCosts** (Advanced)
- Default: Dynamically generated based on items used
- Optional: Define custom costs
- Most common: Use ActorValues starting with `SS2_VirtualResource_`

**UpgradeCostsAreAdditional** (Advanced)
- Default: true (custom costs ADD to dynamic cost)
- Set false to REPLACE default instead

**SpecificUpgradeRequirement** (Advanced)
- Set additional upgrade requirements beyond Happiness/Settler Count/Building Materials
- Uses Usage Requirements system

**Requirements** (Advanced)
- Set limitations on when City Plan can be used
- Uses Usage Requirements system

#### CPLayout Records - Properties

Each level has one or more CPLayout records defining actual item position data.

**LayoutAppliedMessage** (Optional)
- Display message when layout is applied
- Shows in corner or message box

**PreferredFlag** (Optional)
- Same as CityPlan version
- Supercedes CityPlan's PreferredFlag when layout used

**ToggleGlobal** (Advanced)
- If global is set here, it's set to 1 when layout built, 0 if removed
- Can be used for condition checks in game

**iMinLevel** (Optional)
- Set minimum settlement level for layout eligibility
- Useful for extra layouts that should only appear after certain progress

**iRemoveAtLevel** (Optional)
- If set, layout automatically removed at this level
- Set to 0 to never remove due to level change

**bIgnorePerformanceOptions** (Optional)
- Ensures all items placed even if player has performance settings on
- Useful for critical layouts (museum exhibits, etc.)

**bScrapIfRequirementsFail** (Advanced)
- If true + Requirements field used
- Layout periodically retested and scrapped if requirements fail
- Useful for conditional layers (tied to specific NPC leader/Faction)

**Requirements** (Advanced)
- Layout only builds if requirements are met
- Uses Usage Requirements system

### Unlimited Layouts

This section is extremely niche, but useful if you want to create special layouts reacting to in-game events.

**Example:** Responsive museum placing exhibits as player completes Far Harbor quests

#### Requirements

- Already have primary City Plan set up as plugin
- Have Workshop Framework exports for sublayouts
- Have FO4Edit installed

#### Process Overview

1. Go to web tool: https://www.simsettlements.com/tools/cpV2maker.php
2. Upload extra layout to Choose File button
3. If multiple layouts, click Add Another City Plan button
4. Note which order you added them (form editor IDs will be plain)
5. Go to bottom section, click File Options link
6. Fill in something in Form Prefix box
7. Check in For Merge button
8. Click Create ESP File
9. Rename file and move to Fallout 4\Data folder
10. Launch FO4Edit
11. When popup displays plugin list, Select None
12. Check in your City Plan plugin AND extra layouts plugin (don't double-click)
13. Right-click extra layouts plugin > Add Masters
14. Select City Plan plugin from popup
15. Answer Yes to large warning

#### Before Merging - Preparation

1. Click plus sign next to extra layouts plugin
2. Click plus sign next to Misc. Item
3. Click first object with CPLayout in name
4. Right pane, scroll down to Scripts section
5. Below is Properties (sorted) section
6. Remove these properties (right-click, Remove):
   - DesignerNameHolder
   - InformationMessage
   - ParentCityPlan
7. Repeat for each CPLayout object

#### Injecting Forms

1. Right-click extra layouts plugin > Inject Forms into Master
2. Select Master: Check in City Plan plugin > OK
3. "Do you want to try and preserve ObjectIDs?" → **No**
4. "Start From..." → OK
5. Warning → Yes

#### Individual Merges

1. Right-click Keyword under extra layouts plugin
2. Choose Deep copy as override into...
3. Check in City Plan plugin > OK
4. Under Misc. Item, Ctrl+click each CPLayout object to select all
5. Right-click selected > Copy as override into...
6. Check in City Plan plugin > OK
7. Close FO4Edit, click OK to save

#### Creation Kit Setup

1. Open Creation Kit
2. Load City Plan plugin
3. Object Window > Items > MiscItem > Find City Plan record > Open
4. Double-click script to open properties
5. Select Layouts property > Click Add on far right
6. Dropdown appears > Select MiscObject > Another dropdown appears with Filter
7. Check Filter button, search form prefix from step 5
8. Select first extra layout object from dropdown
9. Repeat for each extra layout object
10. Click OK on script properties, OK on City Plan record

#### Finalize Extra Layouts

1. Under Misc. Item, find first extra layout object (filter by prefix)
2. Open it, double-click script to bring up properties
3. Double-click ParentCityPlan property
4. Select MiscObject from first dropdown
5. Select City Plan record from second dropdown
6. Click OK to close properties, OK on layout object
7. Repeat for each extra layout
8. Save plugin

#### Result

All extra layouts will now be created with Level 0 content!

#### Advanced: Condition Extra Layouts

Use Usage Requirements system (especially QuestRequirements section) to make layouts react to in-game events.

---

## Summary

City Plans are one of the most rewarding systems in Sim Settlements 2 to create for. Whether you're sharing a single-level design or creating a complex multi-leveled story, the tools are at your disposal to bring your vision to life.

**Quick Checklist:**
- ✅ Install F4SE
- ✅ Enable Papyrus logging in ini
- ✅ Build and export settlement
- ✅ Use web tool to generate plugin
- ✅ Test in-game
- ✅ Share with community!

For advanced features, check the Creation Kit sections, but remember: most players will be amazed by a well-designed single-level City Plan!

---

**Resources:**
- Official Website: [simsettlements.com](https://www.simsettlements.com)
- City Plan Web Tool: [cpV2maker.php](https://www.simsettlements.com/tools/cpV2maker.php)
- F4SE: [f4se.silverlock.org](http://f4se.silverlock.org/)
- 7-Zip: [7-zip.org](https://www.7-zip.org/)
