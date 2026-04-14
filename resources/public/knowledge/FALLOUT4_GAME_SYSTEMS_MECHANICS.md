# Fallout 4 Game Systems: Deep Mechanics for Modders

## Overview

This is the definitive reference for understanding **how Fallout 4 works at the system level**. Modders manipulate these systems to create quests, NPCs, items, and gameplay mechanics. Understanding these systems is essential for diagnosing modding problems and creating compatible mods.

---

## Part 1: Actors & NPCs (The Most Complex System)

### Base Records vs Instances: The Fundamental Separation

Fallout 4 separates **what an NPC is** from **where an NPC is placed**.

#### NPC_ Base Record (Definition)
```
NPC_ record contains:
- Name, voice type, face shape
- Race, gender, attributes (Strength, Perception, etc.)
- AI packages (what the NPC does)
- Perks they have
- Stats and combat skills
- Faction membership (with rank)
- Spells/abilities
- Equipment (what they're wearing)
- Death sounds, footsteps
```

**Key insight**: Modify the NPC_ record = affects ALL placed instances of that NPC globally. Every location where this NPC appears updates.

#### ACHR Reference (Instance)
```
ACHR reference contains:
- X, Y, Z coordinates (position in cell)
- Rotation (facing direction)
- Link to NPC_ base record (FormID)
- Enabled/disabled state
- Ownership (who owns it)
- Unique name (optional)
```

**Key insight**: An ACHR is just a pointer. 50 different cells can have ACHR references pointing to the same NPC_ record. All 50 instances are identical unless the cell editor customizes the individual ACHR (equipment, scripts, etc.).

### Practical Example: The Self-Referential NPC

A modder creates "CustomFollower" NPC_ record:
- Name: "Kaida"
- Voice type: "FemaleEvenToned"
- Perk: "Ranger" (improves rifle damage)

The modder places this NPC in 3 cells:
1. Sanctuary Hill (ACHR reference)
2. Diamond City (ACHR reference)
3. Vault 111 (ACHR reference)

**Scenario 1**: User modifies Kaida's perk in xEdit → all 3 Achr instances now have the improved perk. Load order overrides propagate.

**Scenario 2**: User adds Kaida using a "companion follower" mod. That mod contains a quest that adds Kaida to the player's faction. Only the player's instance (ACHR) is affected; other instances of Kaida are unaffected.

### Leveled Lists: Controlling NPC Encounters

**Leveled List (LVLI)** defines a pool of possible items/creatures that can spawn.

Example: "Common Raider Loot" LVLI:
```
30% → Stimpack
25% → Purified Water
20% → Cigarettes
15% → Buffout
10% → Nuka-Cola
```

When a raider dies:
1. Game checks "RaiderLoot" LVLI
2. Randomly selects an entry (30% chance Stimpack)
3. Drops that item

**Leveled Creature List (LVLN)** works the same but for NPCs:

"Raider Encounter" LVLN:
```
50% → Raider Warlord (level 20-30)
30% → Raider (level 15-25)
20% → Raider Scavenger (level 10-20)
```

**Modding approach**: Instead of replacing lists, modders **add entries** to existing lists. Open "RaiderLoot" in xEdit → right-click → "Add to Leveled List" → select MyCustomArmor. Now raiders drop custom armor 5% of the time.

### AI Packages: Scripting Behavior

**AI Package (PACK)** defines what an NPC does: sleep, wander, travel, flee, pursue, etc.

Package example:
```
Type: Sandbox
Location: BedMarker in Sanctuary Hill Sleeping Quarters
Conditions:
  - Time between 22:00 (10 PM) and 06:00 (6 AM)
```

Another package:
```
Type: Wander
Radius: 2048 units (large area around Diamond City)
Conditions:
  - Time between 06:00 (6 AM) and 22:00 (10 PM)
```

**NPC Daily Schedule** (in order):
- 06:00-09:00: Wander near settlement
- 09:00-14:00: Work (sandbox at crafting bench)
- 14:00-18:00: Wander + socialize
- 18:00-21:00: Eat dinner (sandbox at settlement)
- 21:00-22:00: Wander
- 22:00-06:00: Sleep in bed

**Modder creation**: Create custom PACK record → set location to a marker in your cell → add condition (if NPC is in faction X, run this package). Now custom NPCs follow your schedule.

### Dialogue: The Conversation System

**Dialogue Topic (DIAL)** groups related responses.

Example: "Greeting" topic contains:
- Response 1: "Hey there, friend!" (NPC with voice "FemaleEvenToned")
- Response 2: "What do you want?" (NPC with voice "FemaleNord")
- Response 3: "Stay out of my way." (NPC with voice "MaleEvenToned")

**Key insight**: Multiple NPCs with different voice types can use the same dialogue topic without re-recording. Voice type determines which audio file plays.

**Dialogue Branches**: Each response can have conditions:
```
Response: "Wanna help me with a job?"
Condition: Quest_MyQuestID stage < 10
Links to: Quest_MyQuestID, Stage 10
```

When player selects this response:
1. Condition is checked (quest stage < 10?)
2. If true, response plays
3. Quest advances to Stage 10
4. New dialogue options appear (Stage 10 conditions)

---

## Part 2: Quests (The Scripting Backbone)

### Quest Structure

Every quest is a **state machine**:

```
Quest: Minutemen Main Chain
├── Stage 0: Quest starts, dialogue available
├── Stage 10: Player accepts quest, "Go to Concord"
│   ├── Quest Objective: "Go to Concord" (marker)
│   ├── Fragment Script runs: add quest item to player inventory
├── Stage 20: Player reaches Concord, enemies spawn
├── Stage 30: Player kills first wave
├── Stage 40: Second wave spawns
├── ... (more stages)
└── Stage 200: Quest complete, faction reward given
```

### Quest Stages

Stages are numbered **0 to 1000+**. Each stage can have:
- **Objectives**: What the player should do (UI text)
- **Conditions**: When the stage fires
- **Fragments**: Papyrus scripts that run when stage triggers
- **Dialogue Changes**: New dialogue options available
- **Quest Updates**: Text that appears in journal

### Aliases: Dynamic References

**Problem**: If you hardcode FormID 0x0012ABCD in a script, and another mod changes that NPC, your script breaks.

**Solution**: Quest Aliases.

```
Quest Alias: CompanionAlias
Type: Actor Alias
Fill Type: Reference to "Cait" (specific NPC)
Value: Can be reassigned at runtime
```

In a script, instead of writing:
```papyrus
Actor prisoner = Game.GetFormFromFile(0x0012ABCD, "MyMod.esp")
```

Write:
```papyrus
Actor companion = GetAlias(1) as Actor  ;; Quest Alias #1: CompanionAlias
```

**Benefit**: If another mod replaces Cait, the quest alias auto-updates.

### Fragments: The Script Engine

**Quest Fragment**: A Papyrus script attached to a stage.

When Stage 20 triggers:
```papyrus
;; Stage 20 fragment
Event OnBeginState()
    ; Spawn enemies
    ObjectReference enemyMarker = GetAlias(2) as ObjectReference
    enemyMarker.PlaceAtMe(EnemyNPC, 5)  ;; Spawn 5 enemies
    
    ; Play sound
    Game.GetPlayer().PlaySound(AttackSound)
    
    ; Update quest objective
    SetObjectiveDisplayed(2)  ;; Show "Defeat enemies" objective
EndEvent
```

Modders use fragments to:
- Spawn/delete objects
- Play sounds/music
- Check player inventory
- Add/remove items
- Trigger dialogue
- Change NPC behavior
- Advance quest stages

### Timers: Delayed Actions

```papyrus
Event OnBeginState()
    ; Wait 5 in-game days, then trigger Stage 50
    StartTimer(IntervalToHours(5), "DelayedStageIndex")
EndEvent

Event OnTimer(int aiTimerId, string asTimerID)
    if asTimerID == "DelayedStageIndex"
        SetStage(50)
    endif
EndEvent
```

---

## Part 3: Map Structure

### Worldspaces

**Worldspace (WRLD)** is the exterior map.

Fallout 4 has multiple worldspaces:
- **CommonwealthWasteland**: Main map
- **FarHarbor**: DLC island
- **NukaWorld**: DLC settlement
- **DLC03Dwarven**: DLC dungeon
- **TheLodge**: DLC settlement

Each worldspace is divided into a **grid of cells**. Fallout 4 uses 32x32 unit cells.

### Cells & Coordinates

**Exterior Cell**: Identified by coordinates (X, Y).
```
X=0, Y=0 → Center of Commonwealth
X=5, Y=-3 → Northeast of center
X=-4, Y=7 → Southwest of center
```

Each cell is a 32x32 unit square. So:
- X=5 cell spans 160→192 units (5 * 32 to (5+1) * 32)

**Interior Cell**: Identified by name (e.g., "Vault 111", "Diamond City Center").

### Precombined Geometry: The Performance Killer

**Problem**: Rendering thousands of individual rock, tree, fence meshes every frame = 5 FPS.

**Solution**: Precombine. The engine bakes distant static geometry into single optimized meshes.

When a modder edits an **exterior cell's landscape (LAND records)** or adds/removes statics:
- Engine's precombined mesh is invalidated
- FPS drops from 60 to 20-30 (50% loss)
- Visual glitching, flickering

**Solution**: **PRP (Previsibines Repair Pack)** regenerates broken precombines.

### Previsibines: Visibility Culling

**Previsibines (PGRE)** data determines: "From cell A, which cells are visible?"

The engine uses this to cull (hide) distant cells, saving GPU bandwidth.

Broken previs = engine renders cells that are hidden behind mountains → FPS drops.

### Navmesh: The Pathfinding Grid

**Navmesh (NAVM)** is a navigation grid that NPCs walk on. It's not the terrain—it's an invisible mesh above the terrain.

**Example**: If you place a 10-unit-tall wall in a cell but forget to rebuild navmesh, NPCs will try to walk through the wall (because navmesh still says "walkable here"), get stuck, and eventually cause CTDs.

**Deleted Navmesh**: **The #1 crash cause in user-created mods.**

If a modder accidentally deletes a NAVM record (xEdit delete button), NPCs can't pathfind → engine crashes.

**Fix**: xEdit "Undelete and Disable References" script, or CK finalize navmesh.

---

## Part 4: Records & FormIDs

### Base Objects vs References

| Base Object | Reference |
|---|---|
| Template (ARMO, WEAP, FURN, etc.) | Instance placed in a cell (REFR, ACHR) |
| Has stats, model, materials, weight | Points to base object via FormID |
| Stored in plugin file (.esp) | Coordinates, rotation, enabled/disabled |
| One per item type | Multiple can point to same base object |
| Example: "Iron Sword" | "Iron Sword on table in Concord" |

### FormID: The Universal Identifier

**FormID Format**: `HHXXXXXX:PluginName.esp`

- **HH** = Load Order Slot (00-FE, 0-254 decimal). Determined by plugin load order.
- **XXXXXX** = Object ID within plugin (000000-FFFFFF)

**Example**: `04AB12CD:MyMod.esp`
- Load order slot 04 = MyMod.esp is 5th plugin
- ID AB12CD = object ID within MyMod.esp

**Master Dependencies Determine Slots**:
If MyMod.esp has masters:
1. Fallout4.esm (slot 00)
2. DLCRobot.esm (slot 01)
3. DLCWorkshop01.esm (slot 02)
4. DLCWorkshop02.esm (slot 03)
5. MyMod.esp itself (slot 04)

### FormID Collisions & ESLifying

**Problem**: Each plugin slot can have 0x000001 to 0xFFFFFF object IDs (~16 million). But slots are limited (255 total). Heavily-modded games run out of slots.

**Solution**: ESL (Light Plugin) flag. Compressed plugins share a single FE slot (4,096 ESL plugins max).

**ESLifying Process**:
1. Open plugin in xEdit
2. Right-click → "Compact FormIDs for ESL"
3. Adds ESL flag to plugin header
4. Plugin now uses FE slot instead of consuming a regular slot

**Requirements**:
- Plugin must have ≤ 2,048 FormIDs
- Plugin can't be referenced by FormID from another mod (circular dependency problem)

---

## Part 5: Factions & Relationships

### Faction Structure

**Faction (FACT)** is a hierarchy with ranks.

Example: "Minutemen Faction"
```
Rank 0: Recruit
Rank 1: Soldier
Rank 2: Sergeant
Rank 3: General
```

### Faction Relations

Define relationships between factions:

```
Minutemen ← Friend → SettlerNCR
Minutemen ← Enemy → Railroad
Minutemen ← Neutral → BrotherhoodOfSteel
```

If two factions are enemies, members attack each other automatically.

### Player Faction Membership

When a quest progresses:
```papyrus
;; Stage 50: Player officially joins Minutemen
PlayerRef.AddToFaction(MinutemenFaction, 1)  ;; Rank 1: Soldier
```

Later:
```papyrus
;; Stage 100: Promotion
PlayerRef.SetFactionRank(MinutemenFaction, 3)  ;; Rank 3: General
```

Player's rep with other factions updates based on faction relations.

### Combat Behavior

Modders create custom encounters:
```
1. Create custom Raider NPC_ record
2. Add to Raider Faction
3. Set factions as enemies to "SettlerNCR" faction
4. Add to leveled list for encounters
5. Result: Custom raiders auto-attack settlers because faction rule says enemies attack
```

---

## Part 6: Items, Crafting & Loot

### Leveled Item Lists (LVLI)

Define what items appear in:
- Container/chest loot
- Vendor inventories
- Enemy drops
- Quest rewards

Example: "CommonLoot" LVLI
```
40% → Stimpack (value 25 caps)
30% → Purified Water (value 20 caps)
20% → Mentag (value 30 caps)
10% → Buffout (value 35 caps)
```

When a container "rolls" CommonLoot:
1. RNG selects one entry
2. Item added to container

### Crafting Recipes (COBJ)

**Crafting Objective** defines recipes.

```
Recipe: "Custom Rifle"
Inputs:
  - 5x Steel
  - 3x Wood
  - 2x Adhesive
  - 1x Circuitry
Output: MyCustomRifle
Workbench: Weapons
Level requirement: 0
Perk requirement: Gunsmith Rank 1
```

When player selects this recipe at Weapons Workbench:
1. Game checks if inputs are in inventory
2. Checks if perk is owned
3. Removes inputs
4. Adds 1x MyCustomRifle

### Miscellaneous Items (MISC)

Quest items, crafting ingredients, collectibles.

Example: "Ancient Artifact"
- Can't be used (weapon/armor)
- Used as quest objective: "Retrieve Ancient Artifact"
- Used in crafting recipe: "5x Ancient Artifact + 10x Steel → Legendary Weapon"

---

## Part 7: Magic & Spells

### Spell (SPEL) vs Magic Effect (MGEF)

**Spell (SPEL)**: Cast-able ability with magicka cost.
- Cost: 50 magicka
- Delivery: Self, RangedTarget, Touch
- Casting animation: Spell cast anim
- Links to one or more magic effects

**Magic Effect (MGEF)**: The actual effect.
- "Paralysis" (stun target 5 seconds)
- "Fireball" (20 fire damage)
- "Summon Dremora Lord" (summon for 60 seconds)

One spell can apply multiple effects:
```
Spell: "Inferno"
Cost: 75 magicka
Effects:
  - Fireball (30 damage)
  - Knockdown (25% chance)
  - Light the environment on fire
```

### Enchantments (ENCH)

Apply magic effects to weapons/armor.

```
Enchantment: "Burning Touch"
Effect: Fire Damage +10
Applies to: Weapon (melee)
Magicka cost: 25 (crafting cost)
```

Modders create custom enchantments → attach to custom weapons.

---

## Part 8: Conditions & Papyrus

### Conditions (COND)

IF statements on records.

Example: Dialogue option only shows if:
```
Condition 1: Quest_MyQuest stage >= 10
AND
Condition 2: Player level >= 20
AND
Condition 3: Player has perk "Science" rank 2
```

If all true: dialogue option appears.

### Papyrus Scripts (VMAD)

Complex logic beyond conditions.

```papyrus
Event OnBeginState()
    ; Check if player has item
    int itemCount = Game.GetPlayer().GetItemCount(MyItem)
    
    ; Conditional logic
    if itemCount > 10
        Game.GetPlayer().RemoveItem(MyItem, 10)
        Game.GetPlayer().AddItem(Reward, 1)
        Debug.Notification("Crafted successfully!")
    else
        Debug.Notification("Not enough materials!")
    endif
EndEvent
```

### Event Handlers

Scripts register for events:

```papyrus
OnEquip()       → weapon equipped
OnUnequip()     → weapon unequipped
OnHit()         → weapon hits target
OnDeath()       → NPC dies
OnUpdate()      → periodic check
OnLocationDiscovered()  → player discovers location
```

Modders use events to trigger custom behavior.

---

## Part 9: Aliases & Dynamic References

### Actor Alias

Quest alias that points to an NPC.

```
Alias: CompanionAlias
Fill: Specific NPC (Cait)
Value: Can be overridden by quest stages
```

In scripts:
```papyrus
Actor companion = GetAlias(1) as Actor
companion.AddItem(ItemToGive, 1)
```

### Reference Alias

Quest alias that points to any object.

```
Alias: DoorAlias
Fill: Reference in current cell named "LockedDoor"
```

In scripts:
```papyrus
ObjectReference door = GetAlias(5) as ObjectReference
door.Lock()
```

### Location Alias

Quest alias that points to a location.

```
Alias: QuestLocationAlias
Fill: Location "Concord"
```

### Benefit of Aliases

Mods work together because they don't hardcode FormIDs. If another mod changes which NPC is the companion, quest aliases adapt automatically.

---

## Part 10: Keywords & Filtering

### Keyword

A tag assigned to records.

Example keywords:
- `ActorTypeNPC` = is a humanoid NPC
- `ActorTypeCreature` = is a creature (mutant, ghoul, etc.)
- `FollowerPotential` = can be recruited as follower
- `CustomKeyword_xxx` = modders create custom keywords

### Filtering by Keyword

Quests find records matching criteria:

```papyrus
; Find all NPCs with FollowerPotential keyword in this location
ObjectReference[] followers = GetAlias(0).GetPositionAroundMe(64.0, Player)
foreach follower in followers
    if follower.HasKeyword(FollowerPotential)
        ; This NPC can be a follower
    endif
endforeach
```

Modders tag their custom NPCs so they integrate with questlines:
```
CustomFollower NPC_:
  Keywords:
    - ActorTypeNPC
    - FollowerPotential
    - CustomKeyword_MercenaryFollower
```

---

## Part 11: Ownership & Property Rights

### Owned References

Each item/furniture in a cell has an owner.

```
Steel ingot in a shop: Owner = Vendor
Steel ingot in Vault 111: Owner = Player (or no owner)
Diamond City bed: Owner = NPC in Diamond City faction
```

### Taking Owned Items = Stealing

If player takes an owned item:
1. Bounty added
2. NPC may become hostile
3. Stealing rep decreases
4. Access to areas restricted

### Faction Ownership

Items can be faction-owned:

```
Treasury chest: Owner = "Minutemen Faction"
Taking from it: Stealing from Minutemen
```

---

## Part 12: AI Packages & Schedules

### Package Types

- **Sandbox**: Stay in location, idle animations, socialize
- **Travel**: Walk to specific marker
- **Wander**: Random walk in radius
- **Flee**: Run away from player/enemy
- **Hunt**: Track down target
- **Follow**: Follow NPC
- **Pursue**: Combat pursuit
- **Done**: NPC stands idle
- **Activate**: Use object (crafting bench, workbench, trigger)
- **Wait**: Wait (for dialogue, quests, etc.)
- **Unequip**: Take off equipment

### Package Conditions

Control when packages run:

```
Package: "Sleep"
├── Type: Sandbox
├── Location: Bed in Sanctuary Hill
├── Conditions:
│   ├── Time 22:00-06:00
│   ├── NPC is essential
```

Or complex:
```
Package: "Work at Settlement"
├── Type: Sandbox
├── Location: Crafting Bench
├── Conditions:
│   ├── Time 06:00-18:00
│   ├── NPC is in MinutemenFaction
│   ├── Player not in combat
```

---

## Debugging: System → Record Type → Solution

### When a User Reports a Problem

**Step 1: Identify the System**

| Problem | System |
|---------|--------|
| "Follower won't move" | AI Packages / References |
| "Loot doesn't appear" | Leveled Lists / Container References |
| "Quest won't advance" | Quest Stages / Conditions / Papyrus Scripts |
| "NPC ignores dialogue" | Dialogue Topics / Quest Stages / Aliases |
| "Crafting option missing" | COBJ (Crafting Objective) FormID / Conditions |
| "Items appear in wrong place" | Leveled List entries / Container ownership |
| "Spell won't equip" | Perk requirements / F4SE availability |
| "Map flickers" | Precombines (broken LAND) |
| "FPS drops in area" | Previs damage / Object count |
| "NPC pathfinds badly" | Navmesh (NAVM) deleted/broken |
| "Stealing doesn't trigger wanted" | Ownership records |

**Step 2: Locate the Entry Point**

- Check with The Auditor (scan ESP)
- Look in xEdit for the record type
- Verify FormIDs and masters

**Step 3: Suggest the Fix**

- Deleted reference? xEdit "Undelete and Disable References"
- Broken precombines? Install PRP
- Missing dialogue? Create in Creation Kit
- Quest stage not firing? Check conditions and fragment script
- Leveled list missing entry? Add it in xEdit

---

## When Creating Mods

### Think in Systems

Every mod you create touches one or more systems:

| Feature | Systems Involved |
|---------|------------------|
| Custom NPC follower | Actor (NPC_), ACHR, Quest (aliases), Dialogue, Packages, Faction |
| New armor crafting | ARMO base object, COBJ recipe, Ingredients (MISC), Leveled lists, Keywords |
| New quest | QUST, Quest stages, Fragments, Aliases, ACHR references, Dialogue, Papyrus scripts |
| New settlement | Cell worldspace, LAND, Navmesh, Precombine, FURN statics, Workshop workshop, Leveled lists |
| New location | Worldspace cell, NavMesh, Precombine, CELL, STAT objects, Lighting, Audio |

### Critical Rules

1. **Don't delete NAVM (navmesh)**. Ever.
2. **Don't edit LAND without rebuilding previs/precombine** → install PRP
3. **Use quest aliases** instead of hardcoded FormIDs
4. **Use leveled lists** for loot instead of putting items directly in containers
5. **Always set ownership** on placed items (if they should be stealable)
6. **Create factions** for custom NPC groups (raiders, guards, etc.)
7. **Add package conditions** to prevent NPCs working in rain, at night, etc.
8. **Test with load order** → make sure masters load before your plugin

---

## Resources

- **xEdit Wiki**: Detailed record structure documentation
- **Creation Kit Wiki**: Quest stages, script examples, dialogue
- **Fallout 4 Wiki**: In-game mechanics, console commands, Papyrus functions
- **UESP (Unofficial Elder Scrolls Pages)**: Data tables, record references

---

*Last updated: April 2026. This is the technical foundation of Fallout 4 modding.*
