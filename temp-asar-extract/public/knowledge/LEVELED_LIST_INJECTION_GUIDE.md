# Leveled List Injection Scripts - Complete Guide for Fallout 4

## What are Leveled List Injector Scripts?

**Leveled List Injection** is an advanced modding technique that allows your mod to **automatically add items to the game** without requiring compatibility patches or manual xEdit merges.

### The Problem Without Injection

**Traditional Method (Manual):**
```
Your Mod: CustomWeapon.esp
├── Creates weapon record
└── Manually edits: LeveledItem [LVLI] "LootWeaponsAll"
    └── Adds: CustomWeapon to list

Problem: If another mod also edits "LootWeaponsAll"
→ Only ONE mod's changes will work (conflict)
→ Requires compatibility patch
→ Breaks if either mod updates
```

**User Experience:**
- Weapon never spawns in-game
- Only appears via console commands
- Requires xEdit patch (advanced users only)
- Incompatible with multiple mods

### The Solution: Injection Scripts

**Injection Method (Automatic):**
```
Your Mod: CustomWeapon.esp
├── Creates weapon record
├── Creates FormList [FLST] "MyMod_InjectList"
│   └── Contains: CustomWeapon
└── Script: Runs on game load
    └── Reads FormList
    └── Injects into: LeveledItem "LootWeaponsAll"
    └── At runtime (in memory)

Result: No conflicts, works with all mods!
```

**User Experience:**
- Weapon automatically appears in loot
- No patches needed
- Works with 1000+ mods simultaneously
- Updates don't break compatibility

---

## How Leveled List Injection Works

### Core Concept

**Leveled Lists:**
- Containers that spawn random items based on player level
- Examples: `LootWeaponsAll`, `LootArmorAll`, `VendorWeapons`
- Game randomly picks items when spawning loot/enemies

**Injection Process:**
```
1. Game loads all plugins
2. Your injection script runs (Quest + script)
3. Script reads your FormList (items to inject)
4. Script adds items to target leveled lists
5. Happens at runtime (in memory, no ESP changes)
6. Original ESP files remain untouched
7. Multiple mods can inject simultaneously
```

### Technical Flow

```mermaid
Game Starts
    ↓
Your Plugin Loads
    ↓
Injection Quest Starts (Priority 80+)
    ↓
Script: OnInit() Event
    ↓
Read FormList: MyMod_InjectList
    ↓
For Each Item:
    ↓
    Get Target LVLI (e.g., LootWeaponsAll)
    ↓
    Call: AddForm(item, 1, 1)
    ↓
    Item now spawns in loot!
    ↓
Log: "Injected 12 items successfully"
    ↓
Script Complete
```

---

## Types of Injection

### 1. **Simple Injection** (Basic)

**Use Case:** Add items to existing leveled lists

**Example:**
```papyrus
Scriptname MyMod_SimpleInjector extends Quest

FormList Property InjectionList Auto
LeveledItem Property TargetList Auto

Event OnInit()
    int i = 0
    While i < InjectionList.GetSize()
        Form item = InjectionList.GetAt(i)
        TargetList.AddForm(item, 1, 1)
        i += 1
    EndWhile
    Debug.Notification("MyMod: Items injected!")
EndEvent
```

**Pros:**
- Simple to implement
- Fast execution
- Minimal overhead

**Cons:**
- Must specify target lists manually
- Hard-coded

### 2. **Smart Injection** (Recommended)

**Use Case:** Automatically detect appropriate lists based on item type

**Example:**
```papyrus
Scriptname MyMod_SmartInjector extends Quest

FormList Property WeaponList Auto
FormList Property ArmorList Auto

Event OnInit()
    ; Weapons
    LeveledItem weaponLL = Game.GetFormFromFile(0x0001D97F, "Fallout4.esm") as LeveledItem
    InjectItems(WeaponList, weaponLL)
    
    ; Armor
    LeveledItem armorLL = Game.GetFormFromFile(0x0001E8A8, "Fallout4.esm") as LeveledItem
    InjectItems(ArmorList, armorLL)
    
    Debug.MessageBox("MyMod: " + (WeaponList.GetSize() + ArmorList.GetSize()) + " items distributed!")
EndEvent

Function InjectItems(FormList sourceList, LeveledItem targetList)
    int i = 0
    While i < sourceList.GetSize()
        Form item = sourceList.GetAt(i)
        targetList.AddForm(item, 1, 1) ; level=1, count=1
        i += 1
    EndWhile
EndFunction
```

**Pros:**
- Cleaner code
- Reusable functions
- Easier to maintain

**Cons:**
- Slightly more complex

### 3. **Conditional Injection** (Advanced)

**Use Case:** Inject based on game state, player level, or installed mods

**Example:**
```papyrus
Scriptname MyMod_ConditionalInjector extends Quest

FormList Property EarlyGameWeapons Auto
FormList Property LateGameWeapons Auto
LeveledItem Property TargetList Auto

Event OnInit()
    ; Inject early weapons at level 1
    int i = 0
    While i < EarlyGameWeapons.GetSize()
        Form item = EarlyGameWeapons.GetAt(i)
        TargetList.AddForm(item, 1, 1) ; Level 1
        i += 1
    EndWhile
    
    ; Inject late weapons at level 30
    i = 0
    While i < LateGameWeapons.GetSize()
        Form item = LateGameWeapons.GetAt(i)
        TargetList.AddForm(item, 30, 1) ; Level 30
        i += 1
    EndWhile
EndEvent
```

**Pros:**
- Fine-grained control
- Level-appropriate items
- Can check for other mods

**Cons:**
- More complex logic
- More testing required

### 4. **MCM-Configurable Injection** (Professional)

**Use Case:** Let users configure what gets injected

**Example:**
```papyrus
Scriptname MyMod_MCM_Injector extends Quest

FormList Property AllItems Auto
LeveledItem Property TargetList Auto
GlobalVariable Property EnableInjection Auto ; Linked to MCM toggle

Event OnInit()
    RegisterForMenu("PauseMenu")
EndEvent

Event OnMenuClose(string asMenuName)
    If asMenuName == "PauseMenu"
        If EnableInjection.GetValue() == 1.0
            InjectItems()
        EndIf
    EndIf
EndEvent

Function InjectItems()
    ; Check if already injected
    If GetState() == "Injected"
        Return
    EndIf
    
    int i = 0
    While i < AllItems.GetSize()
        Form item = AllItems.GetAt(i)
        TargetList.AddForm(item, 1, 1)
        i += 1
    EndWhile
    
    GotoState("Injected")
    Debug.Notification("MyMod: Injection complete!")
EndFunction

State Injected
    ; Empty state (prevents re-injection)
EndState
```

**Pros:**
- User control
- Professional feature
- Can re-inject on demand

**Cons:**
- Requires MCM
- More complex setup

---

## Step-by-Step Implementation

### Method 1: Using Creation Kit (Manual)

**Step 1: Create FormList for Your Items**
```
1. Open Creation Kit
2. Object Window → All → FormList [FLST]
3. Right-click → New
4. Editor ID: MyMod_WeaponsToInject
5. FormList window opens
6. Drag your custom weapons into the list
7. Save
```

**Step 2: Create the Injection Script**
```
1. Gameplay → Papyrus Script Manager
2. New Script: MyMod_InjectionScript
3. Extends: Quest
4. Copy script code (see examples above)
5. Compile
```

**Step 3: Create Quest**
```
1. Character → Quest
2. Right-click → New
3. Editor ID: MyMod_InjectionQuest
4. Quest Data tab:
   - Start Game Enabled: ✓
   - Run Once: ✓
   - Priority: 85 (high priority)
5. Quest Stages tab:
   - Stage 10: "Injection Complete"
6. Scripts tab:
   - Add Script: MyMod_InjectionScript
   - Properties:
     * InjectionList → MyMod_WeaponsToInject
     * TargetList → LootWeaponsAll (drag from Object Window)
7. Save
```

**Step 4: Test**
```
1. Launch game
2. Load save or start new game
3. Console: coc qasmoke
4. Console: player.additem caps001 99999
5. Console: player.placeatme 00020593 (vendor)
6. Talk to vendor → Check inventory
7. Your weapons should appear!
```

### Method 2: Using xEdit (Advanced, Faster)

**Step 1: Create FormList**
```
1. Open xEdit, load your plugin
2. Right-click your plugin → Add
3. FormList [FLST]
4. Editor ID: MyMod_WeaponsToInject
5. FormIDs:
   - Right-click → Add
   - Drag your weapon records
6. Save
```

**Step 2: Create Script File**
```
1. Navigate to: Data\Scripts\Source\User\
2. Create: MyMod_InjectionScript.psc
3. Paste script code
4. Compile via Creation Kit or Papyrus Compiler
```

**Step 3: Create Quest in xEdit**
```
1. Right-click plugin → Add → Quest [QUST]
2. EDID: MyMod_InjectionQuest
3. DNAM - General:
   - Flags: Start Game Enabled, Run Once
   - Priority: 85
4. VMAD - Virtual Machine Adapter:
   - Add Script: MyMod_InjectionScript
   - Property: InjectionList → MyMod_WeaponsToInject
   - Property: TargetList → LootWeaponsAll (FormID: 0001D97F)
5. Stages:
   - Add Stage 10
6. Save
```

### Method 3: Automated Framework (Professional)

**Use a Framework:** 

Many modders use existing frameworks for injection:
- **AWKCR (Armor and Weapons Keywords Community Resource)** - Has built-in injection
- **ECO (Equipment and Crafting Overhaul)** - Injection framework
- **INNR (Integrated Naming and Network Routing)** - Distribution system

**Benefits:**
- No scripting needed
- Just add keywords to your items
- Framework handles injection
- Tested and reliable

**Example (AWKCR):**
```
1. Add AWKCR as master
2. Add keyword to your weapon: ap_weap_Type_RangedGun
3. AWKCR automatically injects it
4. Done!
```

---

## Target Leveled Lists Reference

### Vanilla Fallout 4 Important Lists

**Weapons:**
| FormID | Editor ID | Description |
|--------|-----------|-------------|
| `0001D97F` | `LootWeaponsAll` | All weapons |
| `001CC2A3` | `LL_Weapon_EnergyGun` | Energy weapons |
| `001CC2A5` | `LL_Weapon_Pistol` | Pistols |
| `001CC2A6` | `LL_Weapon_Rifle` | Rifles |
| `001CC2A7` | `LL_Weapon_Shotgun` | Shotguns |
| `001CC2A8` | `LL_Weapon_Heavy` | Heavy weapons |
| `001CC2A9` | `LL_Weapon_Melee` | Melee weapons |

**Armor:**
| FormID | Editor ID | Description |
|--------|-----------|-------------|
| `0001E8A8` | `LootArmorAll` | All armor |
| `001CC29E` | `LL_Armor_Chest` | Chest pieces |
| `001CC29F` | `LL_Armor_Helmet` | Helmets |
| `001CC2A0` | `LL_Armor_Arms` | Arm pieces |
| `001CC2A1` | `LL_Armor_Legs` | Leg pieces |

**Ammo:**
| FormID | Editor ID | Description |
|--------|-----------|-------------|
| `00148B14` | `LootAmmoAll` | All ammunition |

**Vendor Inventories:**
| FormID | Editor ID | Description |
|--------|-----------|-------------|
| `0004B9FA` | `VendorWeapons` | Weapon vendors |
| `0004B9FB` | `VendorArmor` | Armor vendors |
| `0010A27C` | `VendorAmmo` | Ammo vendors |
| `00038944` | `VendorChems` | Chem vendors |

**NPC Inventories:**
| FormID | Editor ID | Description |
|--------|-----------|-------------|
| `000E8478` | `LCharRaiderWeapons` | Raider weapons |
| `000E8479` | `LCharGunnerWeapons` | Gunner weapons |
| `000E847A` | `LCharBoSWeapons` | Brotherhood weapons |

---

## Complete Working Example

### Project: Laser SMG Distribution

**Goal:** Add custom Laser SMG to raider and vendor inventories

**File Structure:**
```
Data/
├── LaserSMG.esp (your plugin)
├── Scripts/
│   └── Source/
│       └── User/
│           └── LaserSMG_Injector.psc
└── Scripts/
    └── LaserSMG_Injector.pex (compiled)
```

**Script: LaserSMG_Injector.psc**
```papyrus
Scriptname LaserSMG_Injector extends Quest
{Injects Laser SMG into appropriate leveled lists}

FormList Property LaserSMG_InjectionList Auto Const
{Contains all Laser SMG variants}

Event OnInit()
    Debug.Trace("LaserSMG: Starting injection...")
    
    ; Get vanilla leveled lists
    LeveledItem energyWeapons = Game.GetFormFromFile(0x001CC2A3, "Fallout4.esm") as LeveledItem
    LeveledItem vendorWeapons = Game.GetFormFromFile(0x0004B9FA, "Fallout4.esm") as LeveledItem
    LeveledItem raiderWeapons = Game.GetFormFromFile(0x000E8478, "Fallout4.esm") as LeveledItem
    
    ; Inject into energy weapons (general loot)
    InjectIntoList(energyWeapons, 15) ; Level 15+
    
    ; Inject into vendors (player can buy)
    InjectIntoList(vendorWeapons, 1) ; Level 1+
    
    ; Inject into raiders (enemies carry)
    InjectIntoList(raiderWeapons, 10) ; Level 10+ raiders
    
    Debug.Notification("Laser SMG: Injected into 3 leveled lists!")
    Debug.Trace("LaserSMG: Injection complete. " + LaserSMG_InjectionList.GetSize() + " items added.")
EndEvent

Function InjectIntoList(LeveledItem targetList, int minLevel)
    If !targetList
        Debug.Trace("LaserSMG: Target list is None!")
        Return
    EndIf
    
    int i = 0
    While i < LaserSMG_InjectionList.GetSize()
        Form item = LaserSMG_InjectionList.GetAt(i)
        If item
            targetList.AddForm(item, minLevel, 1)
            Debug.Trace("LaserSMG: Added " + item + " at level " + minLevel)
        EndIf
        i += 1
    EndWhile
EndFunction
```

**In Creation Kit:**

**1. Create FormList:**
```
Editor ID: LaserSMG_InjectionList
Contains:
- LaserSMG_Mk1 (your weapon record)
- LaserSMG_Mk2 (upgraded variant)
- LaserSMG_Mk3 (legendary variant)
```

**2. Create Quest:**
```
Editor ID: LaserSMG_InjectionQuest
Start Game Enabled: ✓
Run Once: ✓
Priority: 85

Script: LaserSMG_Injector
Properties:
- LaserSMG_InjectionList → [Fill with FormList]
```

**3. Test:**
```
1. Launch game
2. Console: player.setlevel 20
3. Console: player.placeatme 00020593 (vendor)
4. Check vendor inventory → LaserSMG should appear
5. Console: player.placeatme 00020593 ; spawn raider
6. Kill raider → Check loot → LaserSMG chance
```

---

## Advanced Techniques

### 1. Level-Specific Injection

**Scenario:** Different weapon tiers for different levels

```papyrus
Event OnInit()
    LeveledItem targetList = GetTargetList()
    
    ; Basic variant (Level 1-10)
    targetList.AddForm(WeaponTier1, 1, 1)
    
    ; Advanced variant (Level 15-25)
    targetList.AddForm(WeaponTier2, 15, 1)
    
    ; Elite variant (Level 30+)
    targetList.AddForm(WeaponTier3, 30, 1)
    
    ; Legendary variant (Level 45+)
    targetList.AddForm(WeaponTier4, 45, 1)
EndEvent
```

**Result:** Players encounter appropriate weapons for their level

### 2. Quantity Control

**Scenario:** Control how many items spawn

```papyrus
; Rare item (1 per spawn)
targetList.AddForm(RareWeapon, 1, 1)

; Common item (1-3 per spawn)
targetList.AddForm(CommonAmmo, 1, 3)

; Very common (3-5 per spawn)
targetList.AddForm(Caps, 1, 5)
```

**AddForm Parameters:**
- `Form akForm` - The item to add
- `int aiLevel` - Minimum player level
- `int aiCount` - Number of items to spawn

### 3. Mod Detection and Conditional Injection

**Scenario:** Inject only if certain mods are installed

```papyrus
Event OnInit()
    ; Check if "SuperMod.esp" is loaded
    If Game.IsPluginInstalled("SuperMod.esp")
        ; Get SuperMod's leveled list
        LeveledItem superModList = Game.GetFormFromFile(0x00001234, "SuperMod.esp") as LeveledItem
        
        If superModList
            InjectIntoList(superModList, 1)
            Debug.Notification("Injected into SuperMod!")
        EndIf
    EndIf
    
    ; Always inject into vanilla lists
    LeveledItem vanillaList = Game.GetFormFromFile(0x0001D97F, "Fallout4.esm") as LeveledItem
    InjectIntoList(vanillaList, 1)
EndEvent
```

**Use Cases:**
- Optional integration with popular mods
- Compatibility enhancements
- Feature detection

### 4. Weighted Distribution

**Scenario:** Make some items rarer than others

```papyrus
Event OnInit()
    LeveledItem targetList = GetTargetList()
    
    ; Common weapon (appears often)
    targetList.AddForm(CommonWeapon, 1, 1)
    targetList.AddForm(CommonWeapon, 1, 1) ; Add twice = 2x chance
    targetList.AddForm(CommonWeapon, 1, 1) ; Add 3x = 3x chance
    
    ; Rare weapon (appears rarely)
    targetList.AddForm(RareWeapon, 1, 1) ; Add once = 1x chance
EndEvent
```

**Result:** CommonWeapon is 3x more likely to spawn than RareWeapon

### 5. Batch Injection with Logging

**Scenario:** Professional logging for debugging

```papyrus
Scriptname MyMod_BatchInjector extends Quest

FormList Property WeaponList Auto
FormList Property ArmorList Auto
FormList Property AmmoList Auto

Int Property TotalInjected Auto Hidden
String[] Property InjectionLog Auto Hidden

Event OnInit()
    InjectionLog = new String[0]
    TotalInjected = 0
    
    Debug.MessageBox("MyMod: Starting batch injection...")
    
    InjectCategory("Weapons", WeaponList, 0x0001D97F, 1)
    InjectCategory("Armor", ArmorList, 0x0001E8A8, 1)
    InjectCategory("Ammo", AmmoList, 0x00148B14, 1)
    
    ; Print summary
    Debug.MessageBox("MyMod Injection Complete!\n" + TotalInjected + " items injected.\n\nLog saved to Papyrus.0.log")
    
    ; Write detailed log
    int i = 0
    While i < InjectionLog.Length
        Debug.Trace("INJECTION: " + InjectionLog[i])
        i += 1
    EndWhile
EndEvent

Function InjectCategory(String category, FormList sourceList, int targetFormID, int minLevel)
    LeveledItem targetList = Game.GetFormFromFile(targetFormID, "Fallout4.esm") as LeveledItem
    
    If !targetList
        String logEntry = "[ERROR] " + category + " target list not found!"
        InjectionLog.Add(logEntry)
        Debug.Trace(logEntry)
        Return
    EndIf
    
    int injected = 0
    int i = 0
    While i < sourceList.GetSize()
        Form item = sourceList.GetAt(i)
        If item
            targetList.AddForm(item, minLevel, 1)
            injected += 1
            TotalInjected += 1
        EndIf
        i += 1
    EndWhile
    
    String logEntry = "[SUCCESS] " + category + ": " + injected + " items injected into " + targetList
    InjectionLog.Add(logEntry)
    Debug.Trace(logEntry)
EndFunction
```

**Output (Papyrus.0.log):**
```
[INJECTION] [SUCCESS] Weapons: 12 items injected into LootWeaponsAll
[INJECTION] [SUCCESS] Armor: 8 items injected into LootArmorAll
[INJECTION] [SUCCESS] Ammo: 3 items injected into LootAmmoAll
```

---

## Troubleshooting

### Issue 1: Items Not Appearing in Game

**Symptoms:**
- Injection script runs (notification shows)
- But items never spawn in loot

**Causes & Solutions:**

**A. Incorrect FormID**
```papyrus
; WRONG: Typo in FormID
LeveledItem list = Game.GetFormFromFile(0x0001D97G, "Fallout4.esm") ; Invalid hex

; CORRECT:
LeveledItem list = Game.GetFormFromFile(0x0001D97F, "Fallout4.esm")
```

**B. Quest Priority Too Low**
```
Problem: Quest runs AFTER leveled lists are locked
Solution: Set Priority to 80+
  Creation Kit → Quest Data → Priority: 85
```

**C. Item Level Too High**
```papyrus
; WRONG: Player is level 5, item requires level 50
targetList.AddForm(item, 50, 1)

; CORRECT: Item spawns at player's level
targetList.AddForm(item, 1, 1) ; Level 1+
```

**D. Check Papyrus Log**
```
Location: Documents\My Games\Fallout4\Logs\Script\Papyrus.0.log

Look for:
- "MyMod: Starting injection..." (script ran?)
- Error messages
- "Target list is None!" (bad FormID)
```

### Issue 2: Script Not Running

**Symptoms:**
- No notification on game start
- Papyrus log shows nothing

**Causes & Solutions:**

**A. Quest Not Set to Start**
```
Creation Kit → Quest:
✓ Start Game Enabled
✓ Run Once
✓ Priority: 85
```

**B. Script Not Compiled**
```
1. Check: Data\Scripts\MyMod_Injector.pex exists?
2. If not: Compile in Creation Kit
   - Gameplay → Papyrus Script Manager
   - Find script → Right-click → Compile
3. Error? Check script syntax
```

**C. Script Not Attached to Quest**
```
Creation Kit → Quest → Scripts tab:
- Script name should appear
- Properties should be filled (not "NONE")
```

**D. Save Game Caching**
```
Problem: Old saves don't run OnInit() again
Solution:
1. Start NEW game
2. Or: COC to new cell (forces script reset)
3. Console: ResetQuest MyMod_InjectionQuest
```

### Issue 3: Items Spawn But Too Rarely

**Symptoms:**
- Items technically in game
- But extremely rare (never see them)

**Causes & Solutions:**

**A. Single Entry (Low Weight)**
```papyrus
; WRONG: Only 1 in 1000+ items
targetList.AddForm(MyWeapon, 1, 1) ; Tiny chance

; CORRECT: Add multiple times
targetList.AddForm(MyWeapon, 1, 1)
targetList.AddForm(MyWeapon, 1, 1)
targetList.AddForm(MyWeapon, 1, 1)
; Now 3x more likely!
```

**B. Wrong Target List**
```papyrus
; WRONG: Injected into rare enemy list
LeveledItem bossLoot = ... ; Only legendary enemies

; CORRECT: Inject into common list
LeveledItem commonLoot = ... ; All enemies
```

**C. Create Dedicated Sublist**
```papyrus
; Better approach for weapon packs:
1. Create your own LeveledItem: MyMod_WeaponSublist
2. Add all your weapons to it
3. Inject the SUBLIST (not individual weapons)

; Script:
LeveledItem mySublist = GetMySublist()
LeveledItem vanillaList = GetVanillaList()
vanillaList.AddForm(mySublist, 1, 1)

; Now your weapons treated as one "category"
```

### Issue 4: Conflicts with Other Mods

**Symptoms:**
- Works alone
- Breaks with certain mods installed

**Causes & Solutions:**

**A. Load Order Issue**
```
Problem: Other mod overrides leveled list AFTER injection

Solution: Not fixable via injection
  → Need compatibility patch (xEdit)
  → Or: Ask users to load your mod LAST
```

**B. Script Execution Order**
```
Problem: Both mods have Priority 80
  → Execution order random

Solution: Set Priority 85-90
  → Your script runs later (after most mods)
```

**C. Multiple Injections**
```papyrus
; WRONG: Inject every game load
Event OnInit()
    InjectItems() ; Runs EVERY load
EndEvent

; CORRECT: Inject once, track state
Event OnInit()
    If GetState() != "Injected"
        InjectItems()
        GotoState("Injected")
    EndIf
EndEvent

State Injected
    ; Prevents re-injection
EndState
```

### Issue 5: Papyrus Errors

**Common Error Messages:**

**Error: "Cannot call AddForm() on a None object"**
```
Cause: Target leveled list is None (bad FormID)

Fix:
LeveledItem targetList = Game.GetFormFromFile(0x0001D97F, "Fallout4.esm") as LeveledItem
If !targetList
    Debug.Trace("ERROR: Target list not found!")
    Return
EndIf
targetList.AddForm(item, 1, 1) ; Safe now
```

**Error: "Cannot access an element of a None array"**
```
Cause: FormList property not filled

Fix:
If !InjectionList
    Debug.Trace("ERROR: FormList is None!")
    Return
EndIf
```

**Error: "Stack dump: ... (too large)"**
```
Cause: Infinite loop or too many operations

Fix:
; WRONG: No loop exit
While i < InjectionList.GetSize()
    ; Missing i += 1 !
EndWhile

; CORRECT:
While i < InjectionList.GetSize()
    InjectItem(i)
    i += 1 ; Increment!
EndWhile
```

---

## Best Practices

### 1. Always Use FormLists

**DON'T:**
```papyrus
; Hard-coding items in script
targetList.AddForm(Weapon1, 1, 1)
targetList.AddForm(Weapon2, 1, 1)
targetList.AddForm(Weapon3, 1, 1)
; ... (500 lines later)
```

**DO:**
```papyrus
; Use FormList (editable in CK, no recompile)
FormList Property MyWeapons Auto
While i < MyWeapons.GetSize()
    targetList.AddForm(MyWeapons.GetAt(i), 1, 1)
    i += 1
EndWhile
```

**Why:** FormLists are editable in Creation Kit without recompiling script

### 2. Use Quest Priority 85+

```
Priority Ranges:
- 0-79: Normal quests
- 80-89: Initialization scripts (INJECT HERE)
- 90-99: Critical systems
- 100+: Framework essentials

Your Mod: Use 85
  → Runs after most mods
  → Before critical frameworks
```

### 3. Always Check for None

```papyrus
Function SafeInject(FormList sourceList, LeveledItem targetList, int minLevel)
    ; Validate inputs
    If !sourceList
        Debug.Trace("ERROR: Source list is None")
        Return
    EndIf
    
    If !targetList
        Debug.Trace("ERROR: Target list is None")
        Return
    EndIf
    
    ; Safe to proceed
    int i = 0
    While i < sourceList.GetSize()
        Form item = sourceList.GetAt(i)
        If item ; Check each item too!
            targetList.AddForm(item, minLevel, 1)
        EndIf
        i += 1
    EndWhile
EndFunction
```

### 4. Log Everything (Debug Builds)

```papyrus
Event OnInit()
    Debug.Trace("==== MyMod Injection Starting ====")
    Debug.Trace("Source list size: " + InjectionList.GetSize())
    
    LeveledItem targetList = GetTargetList()
    If targetList
        Debug.Trace("Target list: " + targetList)
        InjectItems(targetList)
        Debug.Trace("Injection complete!")
    Else
        Debug.Trace("ERROR: Target list not found!")
    EndIf
    
    Debug.Trace("==== MyMod Injection Finished ====")
EndEvent
```

**Release Version:** Remove Debug.Trace() (performance)

### 5. Create Sublists for Large Mods

```
Don't:
MyMod.esp → 100 weapons → Inject each individually

Do:
MyMod.esp → Create LeveledItem "MyMod_AllWeapons"
         → Add 100 weapons to MyMod_AllWeapons
         → Inject MyMod_AllWeapons (1 entry!)

Benefit: Cleaner, easier to balance, better performance
```

### 6. Document Injection in Mod Description

**Mod Page Text:**
```markdown
## Installation
1. Install via mod manager
2. Enable MyMod.esp
3. **IMPORTANT:** Items auto-inject on next game load
4. No manual xEdit patches needed!

## Compatibility
✅ Compatible with ALL mods (uses injection)
✅ No leveled list conflicts
✅ Works with 1000+ mods simultaneously

## Troubleshooting
If items don't appear:
1. Start NEW game (or COC to new cell)
2. Wait 5 seconds after loading
3. Console: ResetQuest MyMod_InjectionQuest
```

---

## Injection vs Manual Editing Comparison

| Factor | Manual Editing (xEdit) | Injection Scripts |
|--------|------------------------|-------------------|
| **Compatibility** | ❌ Conflicts | ✅ Universal |
| **Patches Needed** | ❌ Yes | ✅ No |
| **User Friendly** | ❌ Complex | ✅ Simple |
| **Performance** | ✅ Faster | ⚠️ Minimal overhead |
| **Flexibility** | ⚠️ Static | ✅ Dynamic |
| **Maintenance** | ❌ High | ✅ Low |
| **Learning Curve** | ❌ Steep | ⚠️ Moderate |
| **Load Order Sensitive** | ❌ Yes | ✅ No |
| **Requires F4SE** | ✅ No | ✅ No |
| **Update-Proof** | ❌ No | ✅ Yes |

**Verdict:** Injection wins for 95% of use cases

---

## Framework Recommendations

### For Beginners:

**Use AWKCR (Armor and Weapons Keywords Community Resource)**
- Most popular framework
- Just add keywords, auto-injects
- 5M+ downloads
- Well-tested

### For Intermediate:

**Write Your Own Injection Script**
- Full control
- Custom logic
- No dependencies
- Learn Papyrus

### For Advanced:

**Create Framework for Your Mod Series**
- Shared injection system
- Supports multiple plugins
- MCM integration
- Professional solution

---

## Real-World Examples

### Example 1: Weapon Pack (12 weapons)

**mod: TacticalWeapons.esp**

**FormList:**
```
TacticalWeapons_InjectionList:
- TAC_AR15
- TAC_M4A1
- TAC_AK47
- TAC_MP5
- ... (8 more)
```

**Script:**
```papyrus
Scriptname TacticalWeapons_Injector extends Quest

FormList Property TacticalWeapons_InjectionList Auto
LeveledItem Property LootWeaponsAll Auto

Event OnInit()
    int i = 0
    While i < TacticalWeapons_InjectionList.GetSize()
        Form weapon = TacticalWeapons_InjectionList.GetAt(i)
        LootWeaponsAll.AddForm(weapon, 1, 1)
        i += 1
    EndWhile
    Debug.Notification("Tactical Weapons: 12 weapons added to loot!")
EndEvent
```

**Result:** All 12 weapons spawn naturally in game

### Example 2: Armor Pack with Tiers

**Mod: EliteArmor.esp**

**FormLists:**
```
EliteArmor_Tier1: (Early game)
- EliteArmor_Scout
- EliteArmor_Light

EliteArmor_Tier2: (Mid game)
- EliteArmor_Combat
- EliteArmor_Tactical

EliteArmor_Tier3: (End game)
- EliteArmor_Powered
- EliteArmor_Exosuit
```

**Script:**
```papyrus
Event OnInit()
    LeveledItem armorAll = Game.GetFormFromFile(0x0001E8A8, "Fallout4.esm") as LeveledItem
    
    InjectTier(Tier1, armorAll, 1)   ; Level 1+
    InjectTier(Tier2, armorAll, 20)  ; Level 20+
    InjectTier(Tier3, armorAll, 40)  ; Level 40+
EndEvent
```

**Result:** Players encounter appropriate armor for their level

### Example 3: Quest Reward Item

**Mod: UniqueRifle.esp**

**Approach:** DON'T use injection for quest rewards!

**DO:**
```papyrus
; In quest script:
Player.AddItem(UniqueRifle, 1)
```

**Why:** Quest rewards should be guaranteed, not random

---

## Summary

### Key Takeaways:

✅ **Injection is the modern standard** for item distribution  
✅ **No compatibility patches needed** - Works with all mods  
✅ **Users love it** - Install and play, no configuration  
✅ **Easy to maintain** - Update FormList, no script recompile  
✅ **Performance impact: Negligible** - Runs once on load  
✅ **Future-proof** - Survives mod updates  

### When to Use Injection:

**YES:**
- Weapon packs
- Armor collections
- Ammo types
- Consumables
- General loot

**NO:**
- Quest rewards (use direct AddItem)
- Unique items (place in world)
- NPC-specific items (direct inventory)
- Vendor-only items (inject into VendorWeapons)

### Quick Start Checklist:

```
□ Create FormList with your items
□ Write injection script (copy examples)
□ Compile script (.psc → .pex)
□ Create Quest (Start Game Enabled, Priority 85)
□ Attach script to Quest
□ Fill script properties (FormList, target LVLI)
□ Test on NEW save or COC
□ Check Papyrus.0.log for errors
□ Verify items spawn in-game
□ Document in mod description
```

---

## Resources

### Official Documentation
- **Creation Kit Wiki:** https://www.creationkit.com/fallout4/index.php
- **Papyrus Reference:** https://www.creationkit.com/fallout4/index.php?title=Category:Papyrus

### Community Resources
- **Nexus Forums:** Fallout 4 > Mod Talk > Scripting
- **Reddit:** r/FalloutMods (search "leveled list injection")
- **YouTube:** "Fallout 4 leveled list injection tutorial"

### Example Mods with Injection
- **AWKCR** - Framework example
- **ECO** - Advanced distribution
- **Loads of Ammo** - Simple injection (study this!)

### Tools
- **xEdit (FO4Edit):** View FormIDs, create FormLists
- **Creation Kit:** Script compiler, quest editor
- **Papyrus Compiler Standalone:** Command-line compiling
- **Caprica:** Modern Papyrus compiler (faster)

---

*Last Updated: January 2026*  
*Fallout 4 Version: 1.10.163+*  
*F4SE: Optional (not required for basic injection)*  
*Difficulty: Intermediate*  
*Estimated Learning Time: 2-3 hours*
