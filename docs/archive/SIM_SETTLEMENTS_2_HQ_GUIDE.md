# Sim Settlements 2: HQ Complete Guide

**Version**: 1.0  
**Last Updated**: January 24, 2026  
**Author**: kinggath (Original Documentation)  
**Status**: Comprehensive Reference

---

## Table of Contents

1. [Intro to HQ](#intro-to-hq)
2. [HQ Basic Construction](#hq-basic-construction)
3. [HQ Room Configs](#hq-room-configs)
4. [HQ Room Functionality](#hq-room-functionality)
5. [Allies and Advisors](#allies-and-advisors)

---

## Intro to HQ

Learn what HQ is and what you can do with the system!

### What is HQ?

HQ is the most advanced system we've ever created for Fallout 4, but just like the rest of Sim Settlements systems, it was designed to be modified and added onto by anyone - **no modding experience necessary!**

The core of HQ is like a settlement where the focus is on **running an organization** rather than creating a town. Instead of building individual items or plots and assigning people to work them, you:
1. Put the right people in different departments
2. Make use of excess resources from settlements to improve departments
3. Direct your people to do big projects as a true Faction Leader!

### GNN as Example

For those who have played through Chapter 2, you might think HQ is just the part of the story after you take over GNN, but that's just our implementation of it. **HQ is actually an entire gameplay system independent of GNN**, which means technically - you can make your own facility with whatever projects and options you want!

**However:** Know that it's a huge task. Plan on creating some content for the GNN HQ first to wrap your head around it all, which will prepare you for a bigger project.

### What Can You Add?

#### New Room Designs

The most obvious thing you can add are **new room designs**. Giving players more options to design their faction visually, and also to focus on their favorite departments, is going to be a huge part of HQ addon content.

With the Upgrades system, you can go pretty crazy with your room designs - offering players customization options, unlockable additions, and you can choose exactly what sorts of benefits each provides.

#### Gameplay Systems

After a player has finished cleaning up and building, the end-game loop involves:
- Researching tech trees
- Sending department members on missions
- Providing benefits to player and settlements

**All can be done through the addon system!**

#### Advanced Customization

You can:
- Tinker with gameplay systems
- Add new Policies, Trainings, and room functionality
- Inject your own Disasters (for those with scripting chops)

### Where to Start?

This tutorial series will walk you through creating various HQ content so you have foundational knowledge. You'll learn how to:
1. Make your own room designs and upgrades
2. Setup a department mission
3. Make a research project

After that, look for Topic Series guides on more complex pieces, and eventually - for the truly ambitious - a series on making your own HQ from scratch!

---

## HQ Basic Construction

Learn how to set up a basic room design as an alternate for one of Chapter 2's GNN rooms. The skills you'll learn here will transfer to doing more complex rooms, or rooms in your own HQ if that's your goal!

### Prerequisites

**Software Required:**
- XEdit (with SS2 scripts from Addon Maker's Toolkit or public Github repo)
- Creation Kit
- Spreadsheet software (Open Office Calc is free, or Microsoft Excel)

**Knowledge Required:**
- Basics of Creation Kit: opening plugins, navigating Object Window, placing items in Render window
- For details: Check out CK 101 video

**Setup Required:**
- Line in your ini file: `bAllowMultipleMasterLoads=1`
- Load SS2_XPAC_Chapter2.esm in Creation Kit

### The Build Cell

To make building for HQ simpler, we've created a clone of each of GNN's cells that's completely empty - but still contains necessary infrastructure.

#### Accessing the Build Cell

1. Load SS2_XPAC_Chapter2.esm in Creation Kit
2. Save yourself a new esp with it as a parent
3. In the Cell window, set Worldspace to Interiors
4. Double-click cell: **SS2C2GNNHQAddonBuildCellMain**

**Critical Rule:** DO NOT edit or move the Orange markers with "Export Helper" text. These align your items perfectly with the real cell at runtime.

#### Layer Setup

1. In layers window, find SS2_GNN_LowerSouthwestOffices2ndFloor layer
2. Right-click > Hide All Other Layers (hides everything)
3. Scroll up and click V column next to SS2_GNN_RoomPrimitives layer
4. Green boxes appear (building boundaries)
5. Click F column to Freeze them
6. Expand SS2_GNN_Base layer and click + signs on sub-layers
7. Click V column for all expanded layers (structure reappears)
8. Click F column to Freeze all those layers

#### Finding Your Room

1. Expand SS2_GNN_LowerSouthwestOffices2ndFloor layer
2. Expand SS2_GNN_LowerSouthwestOffices2ndFloor_North
3. Find SS2_GNN_LowerSouthwestOffices2ndFloor_North_DefaultObjects
4. Right-click > Select All Loaded References
5. Press Shift+F in Render window to center camera

#### Creating Child Layers

1. Right-click SS2_GNN_LowerSouthwestOffices2ndFloor > Create Child Layer
2. Name it something unique: `myLowerSouthwestOffices2ndFloorNorth`
3. Right-click your new layer > Create Child Layer
4. Name it: `myLowerSouthwestOffices2ndFloorNorthBase`
5. Click A column to make it Active

**Note on Layer Depth:** Never go more than 3 layers deep to avoid crashes. Keep layer names short but unique.

#### Building Your Design

**Add Furniture (Base Layer):**
1. Keep `myLowerSouthwestOffices2ndFloorNorthBase` as Active
2. Object Window > World Objects > Furniture
3. Filter for NpcBedMetalLay01
4. Drag bed into room, position on floor
5. Repeat 2 more times (3 total beds)

**Add Door (Required!):**
1. Object Window > Doors category
2. Filter for BldWoodPDoor01
3. Add to room, snap to frame using snapping options

**Important:** HQ removes the door for most rooms after construction. Failure to include a door leaves room doorless!

**Add Decoration Layer:**
1. Right-click parent layer > Create Child Layer
2. Name: `myLowerSouthwestOffices2ndFloorNorthDecor`
3. Click A column to make it Active
4. Object Window > Statics category
5. Filter for PictureFrame
6. Place pictures on walls

**Add Lighting Layer:**
1. Right-click parent layer > Create Child Layer
2. Name: `myLowerSouthwestOffices2ndFloorNorthLights`
3. Click A column to make it Active
4. Object Window > Lights category
5. Filter for defaultLightWarm01NS
6. Place lights throughout room

**Optional:** Press A hotkey in Render window to preview lighting

**Optional Fixtures:**
- For light fixtures (bulbs, lamps), find under Statics
- Filter for Light*On for lit appearance

#### Layer Structure

Your layers should look like:
```
myLowerSouthwestOffices2ndFloorNorth
├── myLowerSouthwestOffices2ndFloorNorthBase
├── myLowerSouthwestOffices2ndFloorNorthDecor
└── myLowerSouthwestOffices2ndFloorNorthLights
```

**Benefits:**
- Base layer: Large furniture, interactive markers (things that should always appear)
- Decor layer: Decorative items, clutter (can be skipped for performance)
- Lighting layer: Lights (connected to room Light Box)

### Important: NEVER USE WORKSHOP ITEMS!

We've intentionally excluded power-related objects in GNN to avoid power grid corruption. Most problem items have "workshop" in their editor ID.

#### Statics

Check that form doesn't have:
- `WorkshopSnapTransmitsPower` in Actor Values
- If it does: Delete it, change Editor ID to create new version

#### Furniture & Activators

Remove these keywords and actor values:
- Keywords: `WorkshopWorkObject`, `WorkshopCanBePowered`, `WorkshopPowerConnectionDUPLICATE000`, `WorkshopStartPoweredOn`, `WorkshopStartUnpoweredOff`
- Actor Values: `PowerGenerated`, `PowerRadiation`, `PowerRequired`, `WorkshopSnapTransmitsPower`

#### Lights

Never use lights from building plots in HQ! Instead:
- Use `default*` lights from Lights category for actual sources
- Find fixtures (bulbs, lamps) under Statics - often have "On" in name

### Exporting Your Design

Now that you have items on the three primary layers, export them!

#### Prepare for Export

1. Click V column next to SS2_GNN_RoomExportHelpers layer (reveals Export Helpers)
2. Click A column next to myLowerSouthwestOffices2ndFloorNorthBase (make it active)
3. Select Export Helper above your room
4. Press Ctrl+D to duplicate copy onto your base layer
5. Repeat for Decor and Light layers
6. Click V column next to SS2_GNN_RoomExportHelpers again (hide it)

**If no Export Helper nearby:** Room is 100% unique - skip these steps. But note this prevents room designs being reused in other locations.

#### Export to Files

1. Right-click myLowerSouthwestOffices2ndFloorNorthBase layer > Select All Loaded References
2. File menu > Import/Export > Ref Placements For Selection
3. Name file same as layer
4. Repeat for Decor and Lights layers

**Tip:** Create a folder to organize these exported files to avoid cluttering Fallout 4 directory.

#### Using Spreadsheets

Now clean up exported data (incredibly fast and easy!).

**Using Open Office Calc:**

1. Launch Open Office Calc
2. Insert menu > Sheet From File
3. Navigate to Base layer file you exported
4. Click Open
5. Text Import prompt:
   - Check **Tab** under "Separated by"
   - Uncheck everything else
   - Click OK twice
6. File > Save As
   - Save as type: **Text CSV**
   - Check **Edit filter settings**
   - Name file after layer
   - Click Save
7. Format prompt: **Keep Current Format**
8. Export Text File options (should be default):
   - Click OK
9. Close spreadsheet
10. Repeat for Decor and Lights layers (but add extra step for Decor/Lights!)

**Extra Step for Decor & Lights:**
- After step 4, go to column i
- Add a 1 next to every item
- This tells SS2 to not impact navmesh

**Column i "1" Trick:**
- Use in Base layer too if desired
- Tells game item is small/out-of-way so NPCs don't path around it
- For big furniture, leave blank so NPCs path around them

**Result:** 3 CSV files (Base, Decor, Lights)

### XEdit Import

The XEdit script `SS2\HQ_CreateOrUpdateAction` does most heavy lifting! It creates a form like in the CK where you fill out boxes - then creates all the dozens of CK records for you!

#### Run the Script

1. Close Creation Kit (editing plugin in XEdit)
2. Open FO4Edit
3. When prompted with plugin list, double-click YOUR esp file
4. After loading, expand your file
5. Right-click on File Header > Apply Script
6. Ensure "Include scripts from subdirectories" is checked
7. Select script: `SS2\HQ_CreateOrUpdateAction` from dropdown
8. Click OK

**Note:** First time running after SS2 update: Wait a couple minutes while cache data generates.

#### Fill Out the Form

**First Prompt:** "HQ Room Script"
- Select: **SS2_HQ_WorkshopRef_GNN**
- Select radio: **Room Construction/Upgrades**
- Click OK

**Second Prompt:** Room Config
- Select: **Living Quarters (GNN512x768RectangleShape_EntranceLeft_LivingQuarters)**
- Click OK

**Main Form Fields (Required for Tutorial):**

| Field | Value |
|-------|-------|
| Name | My Living Quarters Test |
| EditorID Prefix | my_ |
| Object Type | Construction |
| Upgrade slot | Base |
| Submenu | LivingQuarters |

**Resources Section:**
1. Click Add
2. Select "Cloth (Organic Materials)" > Enter 750 > OK
3. Repeat adding: 375 Wood, 375 Steel, 40 Facilities Energy

**Room Functions Section:**
1. Click Add
2. Select "+3 Max Workers" > OK
3. Repeat adding: "Living Quarters"

**Set Descriptions:**
1. Click "Set Descriptions..." button
2. Designer Name: Enter your name
3. Click Regenerate (fills mechanics description automatically)
4. Click OK

**Layouts Section:**
1. Click Add
   - Name: Base
   - Upgrade Slot: Base
   - Layout Spawns File: Click "..." button, select your Base layer CSV
   - Click OK
2. Repeat for Decor (select Decoration as Upgrade Slot)
3. Repeat for Lights (select Lighting as Upgrade Slot)
4. Click OK

XEdit will now generate all records for your room design!

#### Save and Complete

1. After processing finishes, close XEdit
2. Click OK on "Save changed files" prompt
3. **Check:** Only YOUR esp should be listed (if others appear, you edited base files - uncheck all and try again)

### Testing In-Game

You're ready to see your design!

1. Make sure your mod is active (Mods screen > Load Order > Enable)
2. Load save file with HQ already past tutorial
3. To speed up testing, set gameplay options:
   - HQ > Daily Spending Limited by Workforce: **OFF**
   - HQ > Daily Spending Limited by HQ: **OFF**
   - HQ > Override Timers: **ON**
   - HQ > Room Construction Costs: **OFF**

**Test Your Design:**

1. Head to Living Quarters you built in tutorial (next to Player Home)
2. Activate Room Control object outside room
3. Choose "Change Room Layout"
4. Wait for system to find designs (yours should appear!)
5. Select your layout > Accept trade
6. Construction should begin in seconds, finish in ~1 minute
7. Assign settler to plot - original building plan should be chosen

**For Robust Testing:**

Run the Facilities > Clean Up > Office Level > Project: Clean Mid Floor - West Offices North project. Choose Living Quarters when prompted.

Then go to Command Mode and run: Facilities > Construction > Living Quarters > My Living Quarters Test

Once construction completes, head to room to verify all items placed correctly.

**If items didn't appear:**
- You likely skipped Export Helpers step
- Go back to "Exporting Your Design" section and redo Export and Spreadsheet sections

#### Clean Save Testing

For testing purposes, create clean save:
1. Load with only: Workshop Framework, HUD Framework, SS2, Chapter 2
2. Create new character, play through intro
3. Use City Manager holotape Tools > Cheat to skip to end of Chapter 2 quests
4. Save game: Console command `save CleanSaveSS2`
5. Use this for testing to match what players will see

---

## HQ Room Configs

Explains what a Room Config is, how to choose one, and how to create new ones!

### What is a Room Config?

Now that you have a room design in HQ, you likely want to know how to make things other than "Living Quarters that fit in the LowerSouthwestOffices2ndFloor" space.

The process of designing a room is always as simple as you saw in the previous tutorial. Find the space you want to work in, toss in items, and use export/spreadsheet method. **The options you select during import require understanding Room Configs.**

### Two Components

To set up a room design to work with HQ, you need to identify:
1. **Shape of the room** (room location/size/structure)
2. **Purpose of the room** (what it does - Living Quarters, Medical Lab, etc.)

Together, Room Shape + Purpose = **Room Config**

### Room Shapes

If you look around GNN, you notice rooms have the same shape, door position, ceiling height - they're effectively the same room in different places, just like plots in different locations.

#### How to Find Room Shape

We've created diagrams and keys. All shapes start with `SS2C2_Tag_RoomShape_`, all layers start with `SS2_GNN`.

**Format:**
- Layer: `SS2_GNN_[LayerName]`
- Shape: `SS2C2_Tag_RoomShape_[ShapeName]`

#### Main Floor Rooms

| Letter | Layer | Shape |
|--------|-------|-------|
| A | LowerSouthwestOffices2ndFloor_South | GNN512x768Rectangle_EntranceLeft |
| B | LowerSouthwestOffices2ndFloor_North | GNN512x768Rectangle_EntranceLeft |
| C | BathroomUpperSouthWomens | GNN256Box |
| D | BathroomUpperSouthMens | GNN256Box |
| E | UpperSouthOfficeWest | GNNLargeOfficeWest |

**[Full room mapping available in official documentation - see diagrams for Main Floor, Basement, Office Level, and Exterior locations]**

### Room Purpose

The room purpose is a way to **group different room designs together** - similar to Building Classes for Plots.

**Purpose does NOT limit what room design can do** - it's merely a convenient classification so players know what to expect.

When player cleans a room, they're presented with menu to select purpose. This menu looks up Room Shape and finds all Room Configs with unlocked designs to let player choose.

**Unlimited Purposes!** There's no limit to which rooms can have which purpose.

### Room Configs System

Rooms in HQ are similar to Plots:
- **Plots:** Limited to 7 types (Agricultural, Commercial, etc.) and 4 sizes
- **Rooms:** Unlimited purposes and tons of different shapes

Room Configs stored as MiscObjects with:
- Script attached
- Few keywords
- Name field = Player-visible Purpose

### Creating New Room Configs

Let's create one! While we recommend all Room Configs for GNN stay in Chapter 2 esm, it can be useful for testing to create your own temporarily.

#### Plan Your Config

Think about what Purpose you want:
- Dream up something totally new, OR
- Take existing purpose for different room shape

**Example:** Medical Lab setup as main hall section (Room Config: Medical Lab + GNNMainHallQuadrant). Create alternate Medical Lab for big central office (Room Config: Medical Lab + GNNCentralOffice).

#### Create the Config

1. Load your plugin into XEdit
2. Expand your plugin, right-click File Header > Apply Script
3. Select `SS2\HQ_CreateOrUpdateAction` > OK
4. Choose **SS2_HQ_WorkshopRef_GNN** from Target HQ
5. Select **Room Config** radio option > OK
6. Fill out form:
   - **Room Name:** Medical Lab (or your purpose)
   - **EditorID Prefix:** my_ (or your prefix)
   - **Room Shape:** Select `SS2C2_Tag_RoomShape_GNNCentralOffice`
   - **Action Group:** Select `SS2C2_HQ_ActionGroup_RoomConfig_GNN`
   - **Primary Department:** Science (or appropriate department)
7. Click OK

Your new config is now available when importing room designs!

### Changing Room Configs

If you set up design for one config but want to switch to another (or made a mistake), use a special script:

**Process:**
1. Load plugin into XEdit
2. Expand Misc. Item section
3. Find your "Action" record (has Action_RoomConstruction or Action_RoomUpgrade + shape + design name)
4. Right-click > Apply Script
5. Select `SS2\HQ_ChangeRoomUpgradeConfig` > OK
6. Select new Room Config from dropdown > Next
7. Second screen (advanced) > just click Next
8. Done - your room design now associated with correct config!

**Important:** Changing config doesn't affect existing saves - only impacts new construction.

### Room Config Details (Advanced)

Room Configs are unique to each HQ (GNN configs only work for GNN). If making own HQ, reuse same config names to make it faster for players to understand.

#### Upgrade Slots

Room Upgrade Slots allow SS2 to track which rooms and upgrades can be built.

When player cleans room and chooses purpose, they're actually choosing Room Config. This config gets applied to room. All entries in RoomUpgradeSlots script property are used - these slots increase a corresponding number on HQ, telling it there's another of that slot available.

**Example:** Player cleans two semi-circle offices in balcony and assigns same purpose (Living Quarters). Next time in command mode, player can build room designs. Player prompted to choose which room because system knew multiple slots available.

**Default Slots (5):**
- Base
- Decoration
- Lighting
- Holiday Decorations
- Faction Decorations

**Not Limited to Default!** Additional slots can be added to Room Config to allow different upgrades to plug in.

**Example:** Bar room config could have Bar Stool slot, allowing Bar Stool upgrades to appear as available after bar built.

#### Advanced Properties

When opening Room Config in Creation Kit:

**Keywords (Auto-Generated):**
- `SS2_Tag_HQ_Action`
- `SS2_Tag_HQ_ActionType_RoomConfig`
- `SS2_Tag_HQ_Form`
- Room Shape keyword (variable)

**Script Properties (Focus on RoomConfig section):**

**bAlwaysAvailable** (Default: false)
- By default, SS2 doesn't display Room Config unless there are construction options available
- Set true to bypass - always available as choice
- Rarely needed

**PrimaryDepartment** (Optional)
- Which department staff spend most time during work hours
- Leave unset for common areas (Living Quarters, hallways)

**RoomConfigKeyword**
- Each config has unique keyword
- Generally never change

**RoomShapeKeyword**
- If accidentally selected wrong Room Shape when creating
- Update this field to correct one
- Otherwise don't touch

**RoomUpgradeSlots**
- All Upgrade Slots config applies when used
- To add/remove after creating in XEdit:
  - Create new unique keywords
  - Duplicate `SS2C2_HQ_RoomSlot_Template_GNN` for each
  - Edit script properties of new slot to point to keyword
- If making own HQ, use `SS2_HQ_RoomSlot_Template` + set HQLocation

### Requesting Configs for SS2 Patch

Best if every Room Config lives in same plugin as HQ (Chapter 2 esm for GNN).

To get new configs added:
1. Message on simsettlements.com forums
2. Provide list of Room Purposes + Shapes you want
3. They'll make priority patch

**Note:** Can add new Purposes but should avoid redundancy (Living Quarters appearing twice confuses players).

**Why Centralized Configs Matter:** If you create "Living Quarters" config in your plugin + another creator does same with same shape, players see "Living Quarters" twice. Each version only connects to that creator's designs.

**Solution:** Centralized config in Chapter 2 patch allows both creators' designs to plug into same config. When player chooses it, both designs unlock in Command Mode.

---

## HQ Room Functionality

Add functionality to your room designs so they impact gameplay as well as visuals. Learn about many fields you can set up on your designs!

### Basic Fields

**Name:** What player sees in Command Mode and details screens

**EditorID Prefix:** Used to prefix all forms created by script for easy searching in CK later

**Object Type:** Choose Construction (room design for empty room) or Upgrade (room design to add to existing room)

**Misc Model:** Usually auto-assigned to match Room Shape

**Activator Model:** Model shown in Command Mode ("Blue Men")
- Stand_Hammer_Vertical for Construction
- Kneel_Wrench_Horizontal for Upgrades
- Use whichever you prefer

**Upgrade Slot:** Which slot this design uses
- Construction: Always use Base
- Upgrade: Use most appropriate or custom

**Submenu:** Where in Command Mode project appears
- Works with Object Type: Construction = Facilities, Upgrade = Engineering

**Duration (hours):** In-game hours to complete project (most are 24 hours)

**Give control to department:** Department using room after completion

### Checkboxes

Most auto-setup for Construction/Upgrade appropriately.

**Assign department to room at start:** Department assigned during construction

**Assign department to room at end:** Alternative to "Give control to department" dropdown

**Use default construction markers:** Show construction barriers + animation markers during project

**Disable clutter on completion:** Remove default room items after project finishes (usually want this ON)

**Real-Time Timer:** If checked, Duration field is realtime seconds instead of in-game hours

### Room Functions

Room Functions give gameplay system functionality. Design can have any number.

**Balance:** Ensure functionality matches appropriate upkeep and costs!

#### Function Types

**Counts As** (Most Important)
- Similar tone to room Purpose
- Examples: Bar, Office, Living Quarters, etc.
- Used for: PA System, Department Head dialogue, unlocking projects
- Every Construction should generally have one

**Slots** (Increase Capacity)
- Department Jobs: +X Department Jobs
- Max Workers: +X Max Workers
- Patient Beds: +X Max Science Patients

**Resource Capacity Increases**
- Scrap Logistics, Food Logistics, Power Engineering, Water Engineering, Caps Security
- Each type matches departments

**Research Level**
- System for HQ to have progression
- Unlocks advanced projects
- Can contribute multiple points

**Upkeep** (Balance)
- Food, Water, Power
- Variety of numbers available

**Special Types**
- Leisure Room (non-working hours)
- Supply Agreement Coordination (settlements via supply agreements)
- Power Grid Connection (settlement Power Transfer)
- Regional Hospital (provide Hospital services)
- Regional Cemetery (provide Cemetery benefits)
- Communications Relay (extend beacon coverage)

#### Deciding Which to Use

**Starting Point:**
1. Find appropriate "Counts As" (usually one for every room purpose in GNN)
2. If strong department association: Add Job Slots or capacity increase for that department
3. Electronics-heavy room: Add Power Usage
4. Break time/after-work room: Include Leisure Room
5. Look at existing GNN rooms for patterns

**Get Community Feedback!** People engaging with system will know what's needed and feels balanced.

#### Adding Room Functions

**Simple Method:**
1. Click Add button in Room Functions section
2. Select function type
3. Filter by text to narrow options
4. Click OK

**Copy/Paste Method:**
1. Run `SS2\HQ_CreateOrUpdateAction` on existing Construction/Upgrade's HQAction record
2. Right-click in Room Functions box > Copy (copies all entries)
3. Run script on your HQAction misc object
4. Right-click Room Functions > Paste

### Set Descriptions

Button on right-half of form.

**Designer Name:** Your name - players know who made this so they can seek out more of your work

**Mechanics Description:** Shows in Command Mode at top of screen
- Click Regenerate to auto-generate from Room Functions
- Include shorthand descriptions + completion time
- Match style: Use vertical pipes with spaces (|) to separate, end with | Completion Time: X

**Design Description:** Optional extra info about design
- Currently not visible in-game (future update will add to Room Controls menu)
- Useful if design has atypical functionality

### Resources

Costs for building design.

Click Add > select resource type > enter amount.

**Copy/Paste Support:** Same as Room Functions - easy to copy costs from existing design

**Balancing Tips:**

**Work Energy** (Core Gameplay)
- Since core loop is projects for staff, ensure project costs work energy
- Formula: 10 points per benefit baseline
  - Example: +3 job slots = minimum 30 work energy
- Mix department energy if desired
- Construction projects: Majority Facilities Energy
- Upgrade projects: Majority Engineering Energy

**Scrap Resources**
- Immersion-based: Pick materials used in design
- Formula: 500 resources per benefit baseline
  - Example: +5 Max Workers = 2500 scrap resources
- Divide across materials
- SS2 costs are high because players are extraordinarily rich at this phase - choices must be meaningful

**Keep total Resource entries under 10** (UI limitations)

**Special Costs:**
- Caps: Use for Science research (limited by Security Department)
- Command: Special resource for Command Mode interactions
- Food/Water/Power: Temporary usage or immersive construction costs
- Supply Resources: Avoid (coming in 3.0.0 update)

### Layouts

Where you import spreadsheets.

**Layout Name:** Organization only - never displayed in-game

**Upgrade Slot:** Which slot layout installs into

**Layout Spawns File:** Click "..." button to select your CSV file

Can edit existing layouts or remove entries if needed.

### Extra Slots

Allows creating tech trees and swappable designs!

#### Swappable Layouts

Create multiple Upgrades targeting same Faction Decorations slot - only one active at once. Player can swap between Brotherhood of Steel, Railroad, Minutemen, Institute decorations.

Applies to any non-Base slot - so can offer alternate lighting or decoration layouts!

**Base slot is special** - represents frame. If swap from passenger car to pickup truck body, you have different vehicle. For alternate base: Create entirely new room design.

#### Room Upgrades

**Most interesting use of slots** - setting up upgrades!

Example: Bar room design + Bar Stool upgrade slot = player can build Bar Stools as separate upgrade after bar built.

**Chain Upgrades:** Bar Stools could add new slot for further upgrades. Allows tech trees!

**Simulate Tech Tree:** Multiple upgrades for same slot = player chooses which one (exclusive choices).

---

## Allies and Advisors

This guide goes over systems for injecting characters and groups into the Chapter 3 story. Includes envoys for alliances, Advisors for ideology comments, and battle allies!

**Spoiler Warning:** Heavy Chapter 3 story spoilers!

### Chapter 3 Overview

Chapter 3 is about uniting Commonwealth under new banner to fight common threat. Player forms new faction they customize via:
- Naming
- Values (ideology)
- Allies

Three major ways to introduce characters/factions:
1. **Envoys/Alliances** - Initiate meetings
2. **Advisors** - Comment on player decisions
3. **Battle Allies** - Fill roles in final battle

### Preparing Base Records

#### Create Test NPC

1. Load Creation Kit with SS2_XPAC_Chapter3.esm
2. Create new plugin
3. Object Window > Actors > Actor > Filter Sheffield
4. Right-click Sheffield > Duplicate
5. Double-click copy > Change ID: `yourPrefix_Leftfield`
6. Change name: Leftfield
7. Go to AI Packages tab > Delete all entries (prevent sitting on Sheffield)
8. Click OK
9. Place Leftfield in world (interior cell with name)
10. Double-click reference > Persist Location tab > Verify location set

#### Create Ally Global

1. Object Window > Miscellaneous > Global
2. Right-click > New
3. ID: `yourPrefix_Ally_Leftfield`
4. Click OK

#### Setup Addon Pack

1. Setup as described in Addon Registration guide
2. You'll add content after creating records

---

## Summary

HQ is the most advanced and rewarding system in Sim Settlements 2. Whether you're creating alternate Living Quarters or building entire custom headquarters, the tools and documentation are here.

**Getting Started:**
1. ✅ Learn room design creation (Basic Construction tutorial)
2. ✅ Understand Room Configs for your shape/purpose
3. ✅ Add gameplay functionality to your designs
4. ✅ Create variants and upgrades
5. ✅ Build complete themed HQ facilities

**Advanced Path:**
- Inject Advisors for ideology system
- Create Battle Allies for final quest
- Add custom upgrades and tech trees
- Design entire custom HQ from scratch

**Community:** Join forums, Discord, and share your creations. HQ community loves seeing new facilities and gameplay systems!

---

**Resources:**
- Official Website: [simsettlements.com](https://www.simsettlements.com)
- Forums: Active discussion and support
- Discord: Real-time help and feedback
- Addon Database: Browse community HQ content
