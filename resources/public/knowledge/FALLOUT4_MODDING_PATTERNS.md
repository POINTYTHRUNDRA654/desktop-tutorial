# Fallout 4 Modding Patterns & Best Practices

## Complete Guide to Common Modding Workflows

This guide covers proven patterns for creating Fallout 4 mods, including workflows for weapons, armor, NPCs, quests, settlements, and more. Includes **base game + all DLC support**.

---

## Table of Contents
1. [FormID Management](#formid-management)
2. [Load Order & Master Dependencies](#load-order--master-dependencies)
3. [Weapon Mod Creation](#weapon-mod-creation)
4. [Armor Mod Creation](#armor-mod-creation)
5. [NPC & Follower Mods](#npc--follower-mods)
6. [Quest Mod Workflow](#quest-mod-workflow)
7. [Settlement & Workshop Mods](#settlement--workshop-mods)
8. [Leveled List Injection](#leveled-list-injection)
9. [Conflict Resolution](#conflict-resolution)
10. [ESL Flagging & FormID Compacting](#esl-flagging--formid-compacting)
11. [DLC Integration Patterns](#dlc-integration-patterns)

---

## FormID Management

### Understanding FormID Structure

FormIDs are **8-digit hexadecimal** identifiers in the format `HHXXXXXX`:
- **HH** = Load order slot (00-FE for ESP/ESM, FE for ESL)
- **XXXXXX** = Object ID within the plugin

**Example**:
```
04AB12CD:MyMod.esp
│ │      └─ Plugin name
│ └─────── Object ID (AB12CD)
└───────── Load order slot (04)
```

### FormID Ranges by Plugin Type

| Plugin Type | Load Order Slots | FormID Range | Max Records |
|-------------|-----------------|--------------|-------------|
| ESM (master) | 00-FD (254) | 00000000-FDFFFFFF | 16.7M each |
| ESP (plugin) | 00-FD (254) | 00000000-FDFFFFFF | 16.7M each |
| ESL (light) | FE000-FE0FF | FE000000-FE000FFF | 4096 total |

### Best Practices

1. **Never hardcode FormIDs in scripts** — use `GetFormFromFile()` or property references
2. **Use EditorIDs consistently** — they make xEdit navigation easier
3. **Reserve FormID ranges** for different mod systems (e.g., 00000-0FFFF for weapons, 10000-1FFFF for armor)
4. **Document your FormID allocation** in a README for team projects

### Checking for FormID Conflicts

Use **xEdit** to detect conflicts:
```
1. Load all plugins in xEdit
2. Right-click plugin → "Apply Filter"
3. Select "Conflict Status" → "Conflict - Critical"
4. Review red entries (overrides) and orange entries (conflicts)
```

---

## Load Order & Master Dependencies

### Master File Rules

**Base game always loads first**:
```
00: Fallout4.esm
01: DLCRobot.esm (if present)
02: DLCworkshop01.esm
03: DLCCoast.esm
04: DLCworkshop02.esm
05: DLCworkshop03.esm
06: DLCNukaWorld.esm
07-FD: User mods (sorted by LOOT or manually)
```

### Adding DLC as Masters

**When to add DLC as a master**:
- You reference DLC records (weapons, armor, NPCs, cells)
- You extend DLC quests or factions
- You place objects in DLC worldspaces

**How to add masters in Creation Kit**:
```
1. File → Data
2. Check the DLC ESM(s) you need
3. Set your plugin as "Active File"
4. Click OK
```

**How to add masters in xEdit**:
```
1. Right-click your plugin → "Add Masters"
2. Select the required DLC
3. Click OK
4. Save plugin
```

### Load Order Optimization

**LOOT (Load Order Optimization Tool)** auto-sorts plugins:
```
1. Run LOOT
2. Click "Sort" button
3. Review warnings/errors
4. Apply sorting
5. Launch game
```

**Manual load order rules**:
- Masters before plugins
- Framework mods early (F4SE, MCM, Armor Keywords)
- Large overhauls mid-order (UFO4P, SS2)
- Small patches late
- PRP (Previsibines Repair Pack) near the end
- User patches last

---

## Weapon Mod Creation

### Standard Workflow

**Step 1: Create the Base Weapon Record**
```yaml
# In Creation Kit or xEdit
EditorID: MyCustomRifle
FormID: 00001000:MyMod.esp  # Assign new FormID
Name: "Custom Battle Rifle"
Model: Meshes\MyMod\Weapons\CustomRifle.nif
Texture: Textures\MyMod\Weapons\CustomRifle_d.dds
```

**Step 2: Set Weapon Stats**
- **Damage**: Base damage value (e.g., 35 for a rifle)
- **Fire Rate**: Shots per second (e.g., 40 for semi-auto)
- **Range**: Effective range in units (e.g., 2048)
- **Accuracy**: 0-100 scale (higher = more accurate)
- **Ammo**: Reference vanilla ammo FormID (e.g., `0004CE87:Fallout4.esm` for .45)
- **Weight**: In pounds (e.g., 8.5)
- **Value**: In caps (e.g., 250)

**Step 3: Add Weapon Keywords**
```yaml
Keywords:
  - WeaponTypeRifle (001E6849:Fallout4.esm)
  - AnimsRifle (0001FA4C:Fallout4.esm)  # For animations
  - HasScope (00045374:Fallout4.esm)  # If scoped
```

**Step 4: Create Weapon Mods (Optional)**
- **Receiver**: Damage, fire rate, ammo type mods
- **Barrel**: Damage, accuracy, range mods
- **Stock**: Recoil, weight mods
- **Sight**: Accuracy, zoom mods
- **Muzzle**: Damage, stealth mods

**Step 5: Add to Leveled Lists or Place in World**
```yaml
# Option A: Inject into leveled list
LeveledItem: LLI_Weapon_Gunner (0007D950:Fallout4.esm)
  - MyCustomRifle: 00001000:MyMod.esp
    Level: 15
    Count: 1

# Option B: Place in world cell
Cell: DiamondCityMarket (0000155D:Fallout4.esm)
Reference: REFR 00002000:MyMod.esp
  BaseObject: MyCustomRifle (00001000:MyMod.esp)
  Position: X=100, Y=200, Z=10
```

**Step 6: Test in Game**
```
1. Load mod in game
2. Use `player.additem 00001000 1` in console
3. Test damage, mods, animations
4. Check for bugs (mesh errors, missing textures)
```

### DLC Weapon Pattern

**Extending DLC weapons** (e.g., adding a Harpoon Gun mod):
```yaml
# Add DLCCoast.esm as master
BaseObject: DLC03HarpoonGun (03006D9A:DLCCoast.esm)
NewVariant: MyHarpoonVariant (00001001:MyMod.esp)
  Name: "Explosive Harpoon Gun"
  EnchantEffect: ExplosiveEffect (base game or custom)
```

---

## Armor Mod Creation

### Standard Workflow

**Step 1: Create Armor Object (ARMO)**
```yaml
EditorID: MyCustomArmor_Chest
FormID: 00002000:MyMod.esp
Name: "Wasteland Tactical Vest"
Model_Male: Meshes\MyMod\Armor\Chest_m.nif
Model_Female: Meshes\MyMod\Armor\Chest_f.nif
```

**Step 2: Set Armor Stats**
- **DR (Damage Resistance)**: Physical damage reduction (e.g., 35)
- **ER (Energy Resistance)**: Energy damage reduction (e.g., 20)
- **RR (Radiation Resistance)**: Radiation reduction (e.g., 10)
- **Weight**: In pounds (e.g., 6.0)
- **Value**: In caps (e.g., 150)

**Step 3: Assign Biped Slots**
```yaml
# Body slots (32-61 for base game armor)
BipedSlots:
  - 32: Body
  - 35: Left Arm
  - 36: Right Arm
```

**Step 4: Add Armor Keywords**
```yaml
Keywords:
  - ArmorTypePower (0004D8A1:Fallout4.esm)  # If power armor
  - ArmorTypeClothing (000795F6:Fallout4.esm)  # If clothing
  - MA_Legendary (001F81E9:Fallout4.esm)  # If legendary
```

**Step 5: Create Armor Addon (ARMA)**
```yaml
# ARMA defines visual appearance on body
EditorID: MyCustomArmor_Chest_AA
FormID: 00002001:MyMod.esp
Race: HumanRace (00013746:Fallout4.esm)
BipedSlots: [32, 35, 36]  # Same as ARMO
Model_Male: Meshes\MyMod\Armor\Chest_m.nif
Model_Female: Meshes\MyMod\Armor\Chest_f.nif
```

**Step 6: Link ARMO to ARMA**
```yaml
# In ARMO record
Armature:
  - 00002001:MyMod.esp  # Link to ARMA
```

### DLC Armor Pattern

**Creating Marine Armor variants** (Far Harbor DLC):
```yaml
# Add DLCCoast.esm as master
BaseArmor: DLC03MarineArmor (03005212:DLCCoast.esm)
NewVariant: MyMarineVariant (00002002:MyMod.esp)
  Name: "Elite Marine Armor"
  DR: 55  # Increased from base 45
  ER: 45  # Increased from base 35
```

---

## NPC & Follower Mods

### Creating a Follower NPC

**Step 1: Create NPC_ Base Record**
```yaml
EditorID: MyFollowerNPC
FormID: 00003000:MyMod.esp
Name: "Sarah the Scavenger"
Race: HumanRace (00013746:Fallout4.esm)
Gender: Female
Class: CombatClass (000BE11B:Fallout4.esm)
```

**Step 2: Set NPC Stats**
```yaml
Level: PC*1.0  # Scales with player
Health: 200
Stamina: 100
Magicka: 100  # Unused in FO4 but required
```

**Step 3: Assign Factions**
```yaml
Factions:
  - PlayerFaction (0001C21C:Fallout4.esm): Rank 0
  - CurrentFollowerFaction (0005A1A4:Fallout4.esm): Rank 0  # For follower system
  - PotentialFollowerFaction (0005C84D:Fallout4.esm): Rank 0
```

**Step 4: Add AI Packages**
```yaml
AIPackages:
  - FollowPlayerPackage (0001C21D:Fallout4.esm)  # Follow player
  - SandboxPackage (0001C21E:Fallout4.esm)  # Sandbox when dismissed
```

**Step 5: Create Dialogue**
```yaml
# Use DIAL (Dialogue Topic) records
DialogueTopic: MyFollowerGreeting
FormID: 00003001:MyMod.esp
Responses:
  - "Need a hand, partner?"
  - "Ready when you are."
  - "What's the plan?"
```

**Step 6: Place NPC in World**
```yaml
Cell: SanctuaryHills (0000165D:Fallout4.esm)
Reference: ACHR 00003002:MyMod.esp
  BaseObject: MyFollowerNPC (00003000:MyMod.esp)
  Position: X=500, Y=300, Z=0
```

### DLC NPC Pattern

**Creating a Far Harbor companion**:
```yaml
# Add DLCCoast.esm as master
Cell: DLC03FarHarborTown (03000001:DLCCoast.esm)
NPC_: MyFarHarborFollower (00003003:MyMod.esp)
Factions:
  - DLC03FarHarborFaction (03003377:DLCCoast.esm): Rank 1
  - CurrentFollowerFaction (0005A1A4:Fallout4.esm): Rank 0
```

---

## Quest Mod Workflow

### Creating a Simple Quest

**Step 1: Create QUST Record**
```yaml
EditorID: MyCustomQuest
FormID: 00004000:MyMod.esp
Name: "The Lost Treasure"
Flags: StartGameEnabled  # Auto-starts with new game
```

**Step 2: Define Quest Stages**
```yaml
Stages:
  - Index: 10
    LogEntry: "Find the treasure map in Diamond City."
  - Index: 20
    LogEntry: "Follow the map to the marked location."
  - Index: 100
    LogEntry: "Retrieve the treasure."
    Flags: CompleteQuest
```

**Step 3: Create Quest Aliases**
```yaml
# Aliases are dynamic references
Aliases:
  - ID: 0
    Name: "Player"
    Flags: Player  # Always points to player
  - ID: 1
    Name: "TreasureChest"
    FillType: SpecificReference
    Ref: 00004001:MyMod.esp  # REFR of the chest
```

**Step 4: Add Quest Objectives**
```yaml
Objectives:
  - Index: 10
    DisplayText: "Find the treasure map"
    Targets:
      - Alias: TreasureChest (ID 1)
```

**Step 5: Write Stage Fragments (Papyrus)**
```papyrus
; Stage 10 fragment
Scriptname QF_MyCustomQuest_00004000 Extends Quest

Function Fragment_Stage_0010()
  ; Give player the map item
  Game.GetPlayer().AddItem(MyTreasureMap, 1)
  SetObjectiveDisplayed(10)
EndFunction

Function Fragment_Stage_0100()
  ; Complete quest, give reward
  Game.GetPlayer().AddItem(Caps001, 500)
  CompleteQuest()
EndFunction
```

**Step 6: Create Dialogue to Start Quest**
```yaml
DialogueTopic: MyQuestStart
FormID: 00004002:MyMod.esp
Conditions:
  - GetStageDone MyCustomQuest < 10  # Only if quest not started
Script Fragment:
  MyCustomQuest.SetStage(10)
```

### DLC Quest Pattern

**Extending a DLC questline** (e.g., add a side quest to Nuka-World):
```yaml
# Add DLCNukaWorld.esm as master
NewQuest: MyNukaQuest (00004003:MyMod.esp)
Prerequisites:
  - DLC04MQ01 (04014929:DLCNukaWorld.esm) Stage 100  # After "The Gauntlet"
Location: DLC04NukaTownUSA (0402626D:DLCNukaWorld.esm)
```

---

## Settlement & Workshop Mods

### Adding Buildable Objects

**Step 1: Create STAT or MSTT Record**
```yaml
EditorID: MyWorkshopItem_Statue
FormID: 00005000:MyMod.esp
Model: Meshes\MyMod\Workshop\Statue.nif
```

**Step 2: Create COBJ (Constructible Object)**
```yaml
EditorID: co_MyStatue
FormID: 00005001:MyMod.esp
CreatedObject: MyWorkshopItem_Statue (00005000:MyMod.esp)
WorkbenchKeyword: WorkshopWorkbench (00054BA6:Fallout4.esm)
Components:
  - Steel: 10
  - Concrete: 5
  - Screw: 2
Category: Decorations
```

**Step 3: Add Workshop Keyword**
```yaml
Keywords:
  - WorkshopItem (00054BA6:Fallout4.esm)  # Makes it buildable
```

**Step 4: Test in Settlement**
```
1. Enter workshop mode at a settlement
2. Navigate to Decorations category
3. Build the item
4. Verify placement and snapping
```

### DLC Workshop Pattern

**Adding Vault-Tec Workshop items**:
```yaml
# Add DLCworkshop03.esm as master
WorkbenchKeyword: DLC05VaultWorkbench (05000FA0:DLCworkshop03.esm)
Category: Vault-Tec > Custom
Components:
  - Steel: 15
  - Circuitry: 3
  - VaultTecParts: 5  # DLC-specific component
```

---

## Leveled List Injection

### Why Use Leveled Lists?

**Benefits**:
- Items/NPCs spawn naturally in the game world
- Level-scaled encounters (low-level players see weaker variants)
- Loot distribution (raiders drop your custom weapon 10% of the time)

### Pattern: Inject, Don't Override

**WRONG (overrides entire list)**:
```yaml
LeveledItem: LLI_Weapon_Raider (0007D94E:Fallout4.esm)
Entries:
  - PipePistol: 50%
  - MyCustomGun: 50%  # DELETES all other raider weapons!
```

**CORRECT (inject into list)**:
```yaml
# In xEdit:
1. Copy LLI_Weapon_Raider as override into your mod
2. Add new entry to the bottom:
   - MyCustomGun: 00001000:MyMod.esp
     Level: 10
     Count: 1
     Chance: 10  # 10% chance to appear
```

### Leveled List Categories

| Type | Prefix | Usage |
|------|--------|-------|
| Leveled Item | LLI_ | Loot, containers, vendor inventory |
| Leveled NPC | LVLN_ | Enemy spawns, encounter zones |
| Leveled Spell | LVSP_ | Magic effects (unused in FO4) |

### Common Injection Targets

**Weapons**:
- `LLI_Weapon_Raider` — Raider weapon pool
- `LLI_Weapon_Gunner` — Gunner weapon pool
- `LLI_Weapon_Institute` — Institute weapon pool

**Armor**:
- `LLI_Armor_Raider` — Raider armor pool
- `LLI_Armor_BoS` — Brotherhood armor pool

**Loot**:
- `LLI_Vendor_Weapons` — Weapon vendor inventory
- `LLI_Vendor_Armor` — Armor vendor inventory
- `LLI_Ammo_Tier1` — Common ammo loot

---

## Conflict Resolution

### Types of Conflicts

**1. Record Override (Expected)**
- Mod B edits a record from Mod A
- **Solution**: Load Mod B after Mod A (later wins)

**2. Navmesh Conflict (CRITICAL)**
- Two mods edit the same cell's navmesh
- **Solution**: Merge navmesh edits in xEdit or CK

**3. Precombine Break (Performance)**
- Mod edits exterior cells, breaking precombined geometry
- **Solution**: Install PRP or regenerate previs in CK

**4. FormID Collision (Game-Breaking)**
- Two mods assign the same FormID to different objects
- **Solution**: Renumber one mod's FormIDs in xEdit

### Conflict Detection with xEdit

**Step 1: Load All Plugins**
```
1. Launch xEdit
2. Select all plugins
3. Click OK
```

**Step 2: Apply Conflict Filter**
```
1. Right-click your mod
2. "Apply Filter for Cleaning"
3. Look for red (critical) and orange (conflict) entries
```

**Step 3: Resolve Conflicts**
```
# For record overrides:
- Drag winning record to your mod as override
- Edit as needed
- Delete losing record from original mod

# For navmesh:
- Right-click navmesh → "Remove"
- Or merge in Creation Kit
```

### Compatibility Patches

**Creating a patch plugin**:
```yaml
# MyPatch.esp
Masters:
  - Fallout4.esm
  - ModA.esp
  - ModB.esp
Purpose: Resolve conflicts between ModA and ModB
Changes:
  - Merge leveled lists from both mods
  - Fix navmesh breaks
  - Adjust faction relationships
```

---

## ESL Flagging & FormID Compacting

### What is ESL Flagging?

**ESL (Elder Scrolls Light)** plugins:
- Don't use load order slots (all share slot `FE`)
- Limited to **4096 FormIDs** total
- Perfect for small mods (fixes, patches, single items)

### ESL Requirements

1. **FormID limit**: Max 4096 new records
2. **No new cells**: Can't create new worldspaces/cells
3. **No new dialogue**: Can't add new DIAL topics
4. **Clean plugin**: No deleted records, no navmesh edits

### ESL Flagging Workflow

**Step 1: Compact FormIDs in xEdit**
```
1. Right-click plugin → "Compact FormIDs for ESL"
2. xEdit renumbers all FormIDs to 000-FFF range
3. Save plugin
```

**Step 2: Add ESL Flag**
```
1. Right-click plugin header
2. "Add ESL flag"
3. Save plugin
```

**Step 3: Verify in Game**
```
1. Load game
2. Check if plugin loads correctly
3. Test all features
```

### When NOT to ESL Flag

- Mods with >4096 records
- Mods that create new worldspaces
- Mods with extensive dialogue trees
- Mods that edit navmesh

---

## DLC Integration Patterns

### Supporting Optional DLCs

**Pattern: Conditional References**

**Option A: Separate Plugins**
```
MyMod.esp (base game only)
MyMod_DLCCoast.esp (requires Far Harbor)
MyMod_DLCNukaWorld.esp (requires Nuka-World)
```

**Option B: Soft Dependencies**
```papyrus
; Check if DLC is installed
ScriptName MyModDLCCheck Extends Quest

Function CheckDLCs()
  If Game.GetFormFromFile(0x01000F9C, "DLCRobot.esm")
    ; Automatron installed - enable robot features
    EnableAutomatronFeatures()
  EndIf
  
  If Game.GetFormFromFile(0x03003378, "DLCCoast.esm")
    ; Far Harbor installed - enable FH quests
    EnableFarHarborQuests()
  EndIf
EndFunction
```

### DLC-Specific Features

**Automatron**:
- Robot workbench integration
- Custom robot companions
- Mechanist faction content

**Wasteland Workshop**:
- Cage traps for creatures
- Arena battles
- Concrete building materials

**Far Harbor**:
- Marine armor variants
- Fog-based mechanics
- Island settlements

**Contraptions Workshop**:
- Manufacturing systems
- Conveyor belts
- Ammo/armor production

**Vault-Tec Workshop**:
- Vault building
- Overseer experiments
- Vault-themed furniture

**Nuka-World**:
- Raider gang mechanics
- Park zone quests
- Unique weapons/armor

---

## Common Modding Mistakes to Avoid

### 1. Deleting Records Instead of Disabling
**WRONG**:
```
Delete REFR 00012345
```
**CORRECT**:
```
Set REFR 00012345 "Initially Disabled" flag
```

### 2. Editing Vanilla Cells Without Previs Awareness
**Problem**: Breaks precombined geometry → FPS drops
**Solution**: Install PRP or regenerate previs in CK

### 3. Hardcoding FormIDs in Scripts
**WRONG**:
```papyrus
Game.GetForm(0x00012345) ; Breaks if load order changes
```
**CORRECT**:
```papyrus
Property MyWeapon Auto Const
; Set in CK properties window
```

### 4. Overriding Leveled Lists
**Problem**: Deletes other mods' injections
**Solution**: Always inject, never override

### 5. Missing Master Files
**Problem**: Mod references DLC but doesn't declare it as master
**Solution**: Always add DLC as master if using DLC records

---

## Testing Checklist

Before releasing your mod:

- [ ] **Load in game** — No errors in console
- [ ] **Test all features** — Weapons fire, NPCs talk, quests advance
- [ ] **Check xEdit** — No unintended records, no deleted references
- [ ] **Run LOOT** — No errors or warnings
- [ ] **Test with/without DLC** — If claiming optional DLC support
- [ ] **Performance test** — No FPS drops in affected cells
- [ ] **Compatibility test** — Load with popular mods (UFO4P, SS2, PRP)
- [ ] **Document requirements** — List all masters and load order requirements
- [ ] **Create installation guide** — MO2, Vortex, and manual install steps

---

## See Also

- **FALLOUT4_VANILLA_RECORDS_REFERENCE.md** — FormID quick reference
- **FALLOUT4_GAME_SYSTEMS_MECHANICS.md** — Game mechanics deep dive
- **XEDIT_COMPREHENSIVE_GUIDE.md** — xEdit tutorial
- **SPRIGGIT_COLLABORATIVE_MODDING_GUIDE.md** — Version control for mods

---

**Last Updated**: April 2026 (v1.11.x compatible, all DLCs included)
