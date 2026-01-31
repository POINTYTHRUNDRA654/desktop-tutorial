# Conflict-Free Integration Guide - Fallout 4 Modding

## The Conflict Problem

**Traditional Method (CAUSES CONFLICTS):**
```
Your Mod: Edits vanilla FormList directly
Other Mod: Edits same FormList
Result: ❌ Only ONE mod's changes work (conflict!)
```

**Modern Method (NO CONFLICTS):**
```
Your Mod: Uses Keywords/Injection
Other Mod: Uses Keywords/Injection  
Result: ✅ BOTH mods work simultaneously!
```

---

## Core Concepts

### 1. **Keywords** - The Foundation

**What are Keywords?**
- Tags attached to objects (weapons, armor, items)
- Used by game systems to identify item types
- Example: `WeaponTypeRifle`, `ArmorTypePower`, `ObjectTypeSettlementObject`

**How They Prevent Conflicts:**
```
Traditional: Mod edits vanilla leveled list
Conflict-Free: Mod adds keyword, framework detects keyword and auto-injects

✅ Multiple mods can add keywords without conflict
```

### 2. **FormLists** - Collections of Forms

**What are FormLists?**
- Arrays of game objects (items, NPCs, locations)
- Used for grouping related items
- Example: `WorkshopMenuDecoration`, `CraftingCategories`

**Injection vs Direct Edit:**
```
❌ Direct Edit: Your mod changes FormList in ESP
   → Other mods can't also edit it (conflict)

✅ Injection: Your mod adds items at runtime via script
   → Other mods can also inject (no conflict)
```

### 3. **Frameworks** - Automated Systems

**Popular Frameworks:**
- **AWKCR** (Armor and Weapon Keywords Community Resource)
- **ECO** (Equipment and Crafting Overhaul)
- **INNR** (Integrated Naming and Network Routing)

**How They Work:**
```
1. You add keywords to your items
2. Framework detects keywords on game start
3. Framework auto-injects items into appropriate lists
4. Result: Works with all mods using same framework
```

---

## Workshop Menu Integration (Settlement Builder)

### The Problem

**What Players Want:**
```
Build custom workshop items in settlement mode without conflicts
```

**Traditional Method (CONFLICTS):**
```
1. Create workshop item (COBJ)
2. Add to vanilla FormList: WorkshopMenuDecoration
3. Works! But...
   → If another mod also edits WorkshopMenuDecoration
   → Only ONE mod's items appear (conflict)
```

### The Solution: Keyword-Based Registration

**Step 1: Create Your Workshop Item**

In Creation Kit:
```
1. Object Window → Constructible Object [COBJ]
2. Right-click → New
3. Properties:
   - ID: MyMod_WorkshopItem_Statue
   - Created Object: StaticCollection (your custom item)
   - Workbench Keyword: WorkshopWorkbench
   - Category: None (will use keyword instead)
4. Components:
   - Steel: 10
   - Wood: 5
5. Save
```

**Step 2: Add Keywords**

```
1. Select your COBJ
2. Keywords tab → Add
3. Add keywords:
   - WorkshopItem (required - marks as workshop item)
   - WorkshopMenuDecoration (category)
   - MyMod_CustomCategory (optional - for filtering)
4. Save
```

**Step 3: No Script Needed!**

Game automatically detects `WorkshopItem` keyword and makes it buildable!

### Workshop Categories Reference

**Vanilla Workshop Menu Keywords:**

| Keyword | Menu Category | Examples |
|---------|---------------|----------|
| `WorkshopMenuStructures` | Structures | Walls, floors, roofs |
| `WorkshopMenuFurniture` | Furniture | Chairs, beds, tables |
| `WorkshopMenuDecoration` | Decoration | Paintings, statues |
| `WorkshopMenuPower` | Power | Generators, wires |
| `WorkshopMenuDefenses` | Defenses | Turrets, traps |
| `WorkshopMenuResources` | Resources | Water pumps, food |
| `WorkshopMenuStores` | Stores | Vendor stalls |
| `WorkshopMenuCrafting` | Crafting | Workbenches |
| `WorkshopMenuMisc` | Miscellaneous | Everything else |

### Creating Custom Workshop Categories

**Scenario:** Add "Advanced Tech" category to workshop menu

**Method 1: Using Frameworks (Recommended)**

**With AWKCR:**
```
1. Create keyword: MyMod_AdvancedTech
2. Add to your workshop items
3. AWKCR auto-creates category
4. Done! Works with all AWKCR mods
```

**Method 2: Manual (Advanced)**

**Create Category Keyword:**
```
1. Object Window → Keyword [KYWD]
2. Right-click → New
3. Editor ID: MyMod_WorkshopCategory_AdvancedTech
4. Save
```

**Create FormList:**
```
1. Object Window → FormList [FLST]
2. Right-click → New  
3. Editor ID: MyMod_WorkshopMenu_AdvancedTech
4. Drag your workshop items into list
5. Save
```

**Register with Workshop System (Script):**

```papyrus
Scriptname MyMod_WorkshopRegistration extends Quest

FormList Property MyMod_WorkshopMenu_AdvancedTech Auto
Keyword Property MyMod_WorkshopCategory_AdvancedTech Auto

Event OnInit()
    ; Register custom category with workshop system
    ; This makes it appear in workshop menu
    
    ; Method varies by framework or manual registration
    ; See framework documentation for specifics
EndEvent
```

---

## Crafting Category Integration (Workbenches)

### The Problem

**What Modders Want:**
```
Add custom crafting recipes to workbenches without conflicts
```

**Traditional Method (CONFLICTS):**
```
1. Create COBJ (Constructible Object)
2. Set Workbench Keyword: ChemistryStation
3. Works! But...
   → Items appear in generic "MISC" category
   → Can't organize without editing vanilla categories (conflict)
```

### The Solution: Custom Crafting Categories

**Step 1: Create Crafting Category**

```
1. Object Window → Misc Item [MISC]
2. Right-click → New
3. Properties:
   - ID: MyMod_Category_ExplosivesAdvanced
   - Name: "Advanced Explosives"
   - Model: (leave blank or use icon)
4. Keywords tab:
   - Add: co_Category (marks as crafting category)
   - Add: co_ChemistryStation (which workbench)
5. Save
```

**Key Insight:** Categories are MISC items with special keywords!

**Step 2: Assign Items to Category**

```
1. Select your COBJ (recipe)
2. Properties:
   - Category: MyMod_Category_ExplosivesAdvanced
   - Workbench Keyword: ChemistryStation
3. Save
```

**Step 3: No Conflicts!**

✅ Your category appears alongside vanilla categories  
✅ Other mods can create their own categories  
✅ No editing vanilla records = no conflicts  

### Crafting Workbench Keywords

**Available Workbenches:**

| Keyword | Workbench | Examples |
|---------|-----------|----------|
| `CraftingChemistry` | Chemistry Station | Chems, explosives |
| `CraftingCookingPot` | Cooking Station | Food, drinks |
| `CraftingArmorWorkbench` | Armor Workbench | Armor mods |
| `CraftingWeaponWorkbench` | Weapon Workbench | Weapon mods |
| `CraftingPowerArmor` | Power Armor Station | PA mods |
| `CraftingRobotWorkbench` | Robot Workbench | Robot mods (DLC) |

### Category Keyword System

**Prefix:** `co_` (crafting object)

**Common Category Keywords:**
```
co_Category - Marks MISC as category
co_ChemistryStation - Category for Chemistry Station
co_CookingPot - Category for Cooking Station
co_ArmorWorkbench - Category for Armor Workbench
co_WeaponWorkbench - Category for Weapon Workbench
```

**Creating Category with Keywords:**

```
MISC Item: "Advanced Weaponry"
├── Keyword: co_Category (required)
├── Keyword: co_WeaponWorkbench (workbench)
└── Keyword: MyMod_AdvancedWeapons (optional filter)

Result: New category in Weapon Workbench menu
```

---

## Leveled List Injection (Conflict-Free)

### The Problem

**What Modders Want:**
```
Add weapons to loot without requiring patches
```

**See:** `LEVELED_LIST_INJECTION_GUIDE.md` (covered previously)

**Quick Summary:**
```papyrus
Scriptname MyMod_Injector extends Quest

FormList Property MyWeapons Auto
LeveledItem Property LootWeaponsAll Auto

Event OnInit()
    int i = 0
    While i < MyWeapons.GetSize()
        LootWeaponsAll.AddForm(MyWeapons.GetAt(i), 1, 1)
        i += 1
    EndWhile
EndEvent
```

✅ Runtime injection = no conflicts  
✅ Works with all mods  

---

## Generic FormList Injection

### The Power of FormLists

**Any system using FormLists can be injected!**

Examples:
- Vendor inventories
- Perk requirements
- Quest item pools
- Companion gear
- Faction equipment

### Universal Injection Template

**Script: `MyMod_FormListInjector.psc`**

```papyrus
Scriptname MyMod_FormListInjector extends Quest
{Universal FormList injection - add items to any FormList without conflicts}

; ===== PROPERTIES =====
FormList Property SourceList Auto Const
{Items to inject}

FormList Property TargetList Auto Const
{FormList to inject into}

Int Property MinLevel = 1 Auto Const
{Minimum level for items (if applicable)}

Bool Property RemoveDuplicates = True Auto Const
{Remove items already in target list}

; ===== EVENTS =====
Event OnInit()
    Debug.Trace("FormListInjector: Starting injection...")
    
    If !SourceList
        Debug.Trace("FormListInjector: ERROR - Source list is None!")
        Return
    EndIf
    
    If !TargetList
        Debug.Trace("FormListInjector: ERROR - Target list is None!")
        Return
    EndIf
    
    Int injected = 0
    Int skipped = 0
    Int i = 0
    
    While i < SourceList.GetSize()
        Form item = SourceList.GetAt(i)
        
        If item
            ; Check for duplicates
            If RemoveDuplicates && TargetList.HasForm(item)
                Debug.Trace("FormListInjector: Skipping duplicate: " + item)
                skipped += 1
            Else
                TargetList.AddForm(item)
                injected += 1
                Debug.Trace("FormListInjector: Injected: " + item)
            EndIf
        EndIf
        
        i += 1
    EndWhile
    
    Debug.Notification("Injected " + injected + " items (skipped " + skipped + " duplicates)")
    Debug.Trace("FormListInjector: Complete. Injected: " + injected + " | Skipped: " + skipped)
EndEvent
```

**Usage Example: Add Items to Vendor**

```
1. Create FormList: MyMod_VendorItems
   - Contains: CustomWeapon1, CustomWeapon2, CustomArmor1

2. Create Quest: MyMod_VendorInjection
   - Script: MyMod_FormListInjector
   - Properties:
     * SourceList → MyMod_VendorItems
     * TargetList → VendorWeapons (vanilla FormList)
     * RemoveDuplicates → True
   - Start Game Enabled: ✓
   - Priority: 85

3. Save and test

Result: Your items appear in weapon vendors!
```

### Finding Target FormLists

**Common Vanilla FormLists:**

**Vendors:**
```
VendorWeapons (0x0004B9FA)
VendorArmor (0x0004B9FB)
VendorAmmo (0x0010A27C)
VendorChems (0x00038944)
VendorFood (0x00038945)
VendorMisc (0x00038946)
```

**Faction Equipment:**
```
BoS_WeaponList
Institute_WeaponList
Railroad_WeaponList
Minutemen_WeaponList
```

**Quest Items:**
```
Various per-quest FormLists (search in xEdit)
```

**How to Find FormLists:**

**Method 1: xEdit**
```
1. Open xEdit, load Fallout4.esm
2. Apply Filter → FormList [FLST]
3. Search for keywords: "vendor", "weapon", "loot", etc.
4. Note FormID for scripting
```

**Method 2: Creation Kit**
```
1. Object Window → All → FormList
2. Search by name
3. Right-click → Use Info
4. See where it's used in game
```

---

## Framework Integration

### Using AWKCR (Most Popular)

**Benefits:**
- 5M+ downloads
- Universal compatibility
- Automatic injection
- No scripting needed

**How to Use:**

**Step 1: Add AWKCR as Master**
```
1. Open your plugin in Creation Kit
2. File → Data
3. Check: AWKCR - All DLCs.esp (or appropriate version)
4. Set as Master
5. Load your plugin
```

**Step 2: Add AWKCR Keywords**

**For Weapons:**
```
Keywords to add:
- ap_weap_Type_RangedGun (or appropriate type)
- ap_weap_Tier_1 (tier 1-7, affects spawning level)
- ap_weap_Style_Modern (visual style)

Result: AWKCR automatically:
✓ Adds to leveled lists
✓ Adds to vendor inventories
✓ Creates crafting recipes
✓ Adds modification slots
```

**For Armor:**
```
Keywords to add:
- ap_armor_Type_Clothing (or appropriate type)
- ap_armor_Slot_Body (body slot)
- ap_armor_Tier_1 (tier 1-7)

Result: AWKCR automatically:
✓ Adds to leveled lists
✓ Adds to vendor inventories
✓ Creates armor bench category
✓ Adds modification slots
```

**For Workshop Items:**
```
Keywords to add:
- WorkshopItem (required)
- WorkshopMenuDecoration (or appropriate category)

Result: AWKCR ensures:
✓ Appears in workshop menu
✓ Compatible with other workshop mods
```

**Step 3: Test**
```
1. Load game with AWKCR + your mod
2. Check vendors (should have your items)
3. Check leveled loot (kill enemies)
4. Check workshop menu (settlement mode)
```

### Using ECO (Equipment and Crafting Overhaul)

**Benefits:**
- Crafting overhaul
- Recipe auto-generation
- Component balancing

**Integration:**
```
1. Add ECO.esp as master
2. Add ECO keywords to items
3. ECO auto-generates:
   - Crafting recipes
   - Breakdown recipes
   - Component requirements
   - Balance adjustments
```

---

## Complete Integration Example

### Project: Custom Weapon Pack (10 Weapons)

**Goal:** Add 10 weapons to game with:
- ✅ Workshop crafting category
- ✅ Vendor availability
- ✅ Leveled list spawns
- ✅ Zero conflicts

### File Structure

```
MyWeaponPack.esp
├── Weapon Records (10 COBJs)
├── FormLists
│   ├── MyWeaponPack_AllWeapons (all 10 weapons)
│   ├── MyWeaponPack_EarlyGame (3 weapons, tier 1)
│   └── MyWeaponPack_LateGame (7 weapons, tier 2-3)
├── Keywords
│   └── MyWeaponPack_Category (custom category)
├── Crafting Category
│   └── MyWeaponPack_Category_MISC (category object)
└── Scripts
    ├── MyWeaponPack_LeveledListInjector.pex
    ├── MyWeaponPack_VendorInjector.pex
    └── MyWeaponPack_WorkshopInjector.pex
```

### Step 1: Create Weapons

```
10 Weapon [WEAP] records:
- MWP_Rifle_Basic
- MWP_Rifle_Advanced
- MWP_Pistol_Basic
- ... (7 more)

Each weapon has:
- Stats configured
- Keywords (WeaponTypeRifle, etc.)
- Damage/fire rate/etc.
```

### Step 2: Create FormLists

```
FormList: MyWeaponPack_AllWeapons
├── MWP_Rifle_Basic
├── MWP_Rifle_Advanced
├── MWP_Pistol_Basic
└── ... (all 10 weapons)

FormList: MyWeaponPack_EarlyGame
├── MWP_Rifle_Basic
├── MWP_Pistol_Basic
└── MWP_SMG_Basic

FormList: MyWeaponPack_LateGame
├── MWP_Rifle_Advanced
├── MWP_Pistol_Legendary
└── ... (5 more)
```

### Step 3: Create Crafting Category

```
MISC: MyWeaponPack_Category_Advanced
├── Name: "Advanced Weaponry"
├── Keywords:
│   ├── co_Category (marks as category)
│   └── co_WeaponWorkbench (workbench)
└── Icon: (custom icon texture)

COBJ: MWP_Recipe_RifleBasic
├── Created Object: MWP_Rifle_Basic
├── Workbench: CraftingWeaponWorkbench
├── Category: MyWeaponPack_Category_Advanced
├── Components:
│   ├── Steel: 15
│   ├── Screw: 8
│   └── Adhesive: 4
└── Conditions: Perk Science! Rank 1 (optional)
```

### Step 4: Leveled List Injection Script

```papyrus
Scriptname MyWeaponPack_LeveledListInjector extends Quest

FormList Property MyWeaponPack_EarlyGame Auto
FormList Property MyWeaponPack_LateGame Auto

Event OnInit()
    ; Get vanilla leveled lists
    LeveledItem weaponsAll = Game.GetFormFromFile(0x0001D97F, "Fallout4.esm") as LeveledItem
    
    ; Inject early game weapons (level 1+)
    InjectList(MyWeaponPack_EarlyGame, weaponsAll, 1)
    
    ; Inject late game weapons (level 20+)
    InjectList(MyWeaponPack_LateGame, weaponsAll, 20)
    
    Debug.Notification("MyWeaponPack: Weapons added to loot!")
EndEvent

Function InjectList(FormList source, LeveledItem target, Int minLevel)
    Int i = 0
    While i < source.GetSize()
        Form weapon = source.GetAt(i)
        If weapon
            target.AddForm(weapon, minLevel, 1)
        EndIf
        i += 1
    EndWhile
EndFunction
```

### Step 5: Vendor Injection Script

```papyrus
Scriptname MyWeaponPack_VendorInjector extends Quest

FormList Property MyWeaponPack_AllWeapons Auto

Event OnInit()
    ; Get vendor FormLists
    FormList vendorWeapons = Game.GetFormFromFile(0x0004B9FA, "Fallout4.esm") as FormList
    FormList vendorAmmo = Game.GetFormFromFile(0x0010A27C, "Fallout4.esm") as FormList
    
    ; Inject weapons
    Int i = 0
    While i < MyWeaponPack_AllWeapons.GetSize()
        Form weapon = MyWeaponPack_AllWeapons.GetAt(i)
        If weapon
            vendorWeapons.AddForm(weapon)
        EndIf
        i += 1
    EndWhile
    
    Debug.Notification("MyWeaponPack: Weapons added to vendors!")
EndEvent
```

### Step 6: Workshop Integration Script (Optional)

```papyrus
Scriptname MyWeaponPack_WorkshopInjector extends Quest

FormList Property MyWeaponPack_AllWeapons Auto
Keyword Property WorkshopItem Auto

Event OnInit()
    ; Add workshop keyword to all weapons (makes them buildable)
    Int i = 0
    While i < MyWeaponPack_AllWeapons.GetSize()
        Weapon weapon = MyWeaponPack_AllWeapons.GetAt(i) as Weapon
        If weapon && !weapon.HasKeyword(WorkshopItem)
            weapon.AddKeyword(WorkshopItem)
        EndIf
        i += 1
    EndWhile
    
    Debug.Notification("MyWeaponPack: Weapons added to workshop!")
EndEvent
```

### Step 7: Create Quests for Scripts

```
Quest: MyWeaponPack_InitQuest
├── Start Game Enabled: ✓
├── Run Once: ✓
├── Priority: 85
└── Scripts:
    ├── MyWeaponPack_LeveledListInjector
    ├── MyWeaponPack_VendorInjector
    └── MyWeaponPack_WorkshopInjector
```

### Result

✅ **10 weapons fully integrated:**
- Spawn in leveled loot (level-appropriate)
- Available at weapon vendors
- Craftable at weapon workbench (custom category)
- Buildable in workshop (optional)
- **ZERO conflicts with other mods!**

---

## Best Practices

### 1. Always Use Injection

```
❌ DON'T: Edit vanilla records directly
✅ DO: Use runtime injection scripts
```

### 2. Use Frameworks When Possible

```
✅ AWKCR: Universal compatibility
✅ ECO: Crafting integration
✅ Workshop Framework: Settlement mods
```

### 3. Prefix Your Keywords

```
✅ MyMod_AdvancedWeapons
✅ MyMod_WorkshopCategory_Tech
✅ MyMod_CraftingTier3

❌ AdvancedWeapons (might conflict)
❌ Tech (too generic)
```

### 4. Document Your Integration

**In Mod Description:**
```markdown
## Compatibility

✅ Uses keyword-based injection (no conflicts)
✅ Compatible with ALL mods
✅ Optional: AWKCR integration for enhanced features
✅ No xEdit patches required

## Technical Details

- Uses FormList injection for leveled lists
- Custom crafting categories (no vanilla edits)
- Workshop keywords for settlement building
- All scripts run on quest priority 85
```

### 5. Test Compatibility

```powershell
# Test with popular mods
Load Order:
1. Fallout4.esm
2. DLCs...
3. AWKCR.esp (if used)
4. PopularWeaponMod.esp
5. PopularArmorMod.esp
6. YourMod.esp

Test:
- Check vendors (both mods' items present?)
- Kill enemies (both mods' loot spawns?)
- Workshop menu (both mods' items buildable?)
```

---

## Troubleshooting

### Issue 1: Items Not Appearing

**Symptoms:** Injection runs but items don't spawn

**Causes:**
- FormList empty
- Target FormList wrong
- Quest priority too low
- Script not running

**Solution:**
```papyrus
; Add debug logging
Event OnInit()
    Debug.Trace("=== MyMod Injection Start ===")
    Debug.Trace("Source list size: " + SourceList.GetSize())
    Debug.Trace("Target list: " + TargetList)
    
    If !TargetList
        Debug.Trace("ERROR: Target list is None!")
        Return
    EndIf
    
    ; Continue injection...
    Debug.Trace("=== MyMod Injection Complete ===")
EndEvent
```

Check `Papyrus.0.log` for errors.

### Issue 2: Workshop Items Not Building

**Symptoms:** Items in menu but can't build

**Causes:**
- Missing `WorkshopItem` keyword
- Missing components
- Workbench keyword wrong

**Solution:**
```
1. Select workshop COBJ
2. Keywords tab:
   ✓ WorkshopItem (REQUIRED)
   ✓ WorkshopMenuDecoration (category)
3. Workbench Keyword:
   ✓ WorkshopWorkbench (settlement workbench)
4. Components:
   ✓ At least 1 component (Steel: 1 minimum)
5. Save and test
```

### Issue 3: Crafting Category Not Appearing

**Symptoms:** Category doesn't show in workbench

**Causes:**
- Missing `co_Category` keyword
- Wrong workbench keyword
- MISC item not created

**Solution:**
```
MISC Item: MyMod_Category
├── Keyword: co_Category ✓
├── Keyword: co_WeaponWorkbench ✓
└── Name: "My Category" ✓

COBJ Items:
├── Category: MyMod_Category ✓
├── Workbench: CraftingWeaponWorkbench ✓
└── Components: (at least 1) ✓
```

### Issue 4: Conflicts with Other Mods

**Symptoms:** Works alone, breaks with other mods

**Likely Cause:** You're NOT using injection (editing vanilla records)

**Solution:**
```
1. Open plugin in xEdit
2. Check for edited vanilla records (red color)
3. If found: Remove edits, use injection instead
4. If using injection: No conflicts should exist
```

---

## Advanced: Multi-System Injection Framework

**For large mods:** Create reusable injection system

```papyrus
Scriptname AdvancedInjectionFramework extends Quest
{Handles injection for all systems in one script}

; ===== PROPERTIES =====
FormList Property WeaponList Auto
FormList Property ArmorList Auto
FormList Property VendorItemsList Auto
FormList Property WorkshopItemsList Auto

; ===== CONFIGURATION =====
Bool Property EnableLeveledListInjection = True Auto
Bool Property EnableVendorInjection = True Auto
Bool Property EnableWorkshopInjection = True Auto

; ===== TRACKING =====
Int Property TotalInjected Auto Hidden

; ===== EVENTS =====
Event OnInit()
    Debug.MessageBox("Starting Advanced Injection Framework...")
    TotalInjected = 0
    
    If EnableLeveledListInjection
        InjectIntoLeveledLists()
    EndIf
    
    If EnableVendorInjection
        InjectIntoVendors()
    EndIf
    
    If EnableWorkshopInjection
        InjectIntoWorkshop()
    EndIf
    
    Debug.MessageBox("Injection Complete!\nTotal items: " + TotalInjected)
EndEvent

Function InjectIntoLeveledLists()
    LeveledItem weaponsAll = Game.GetFormFromFile(0x0001D97F, "Fallout4.esm") as LeveledItem
    LeveledItem armorAll = Game.GetFormFromFile(0x0001E8A8, "Fallout4.esm") as LeveledItem
    
    TotalInjected += InjectList(WeaponList, weaponsAll, 1)
    TotalInjected += InjectList(ArmorList, armorAll, 1)
EndFunction

Function InjectIntoVendors()
    FormList vendorWeapons = Game.GetFormFromFile(0x0004B9FA, "Fallout4.esm") as FormList
    FormList vendorArmor = Game.GetFormFromFile(0x0004B9FB, "Fallout4.esm") as FormList
    
    TotalInjected += InjectFormList(WeaponList, vendorWeapons)
    TotalInjected += InjectFormList(ArmorList, vendorArmor)
EndFunction

Function InjectIntoWorkshop()
    ; Add WorkshopItem keyword to all items
    Keyword workshopItem = Game.GetForm(0x...) as Keyword ; Find ID in CK
    
    Int count = 0
    Int i = 0
    While i < WorkshopItemsList.GetSize()
        Form item = WorkshopItemsList.GetAt(i)
        If item
            (item as ObjectReference).AddKeyword(workshopItem)
            count += 1
        EndIf
        i += 1
    EndWhile
    
    TotalInjected += count
EndFunction

Int Function InjectList(FormList source, LeveledItem target, Int minLevel)
    Int count = 0
    Int i = 0
    While i < source.GetSize()
        Form item = source.GetAt(i)
        If item
            target.AddForm(item, minLevel, 1)
            count += 1
        EndIf
        i += 1
    EndWhile
    Return count
EndFunction

Int Function InjectFormList(FormList source, FormList target)
    Int count = 0
    Int i = 0
    While i < source.GetSize()
        Form item = source.GetAt(i)
        If item && !target.HasForm(item)
            target.AddForm(item)
            count += 1
        EndIf
        i += 1
    EndWhile
    Return count
EndFunction
```

---

## Summary

### Key Takeaways:

✅ **Keywords prevent conflicts** - Tag items, don't edit lists  
✅ **FormList injection is universal** - Works for any system  
✅ **Frameworks simplify integration** - AWKCR, ECO handle everything  
✅ **Workshop categories use keywords** - `WorkshopItem` + category keyword  
✅ **Crafting categories are MISC items** - With `co_Category` keyword  
✅ **Runtime injection = no conflicts** - Multiple mods work together  

### Quick Reference:

**Workshop Item:**
```
Keywords: WorkshopItem, WorkshopMenuDecoration
Result: Buildable in settlements
```

**Crafting Category:**
```
MISC Item + co_Category + co_WeaponWorkbench
Result: New category in weapon workbench
```

**Leveled List:**
```
Script: LeveledItem.AddForm(item, level, count)
Result: Item spawns in loot
```

**Vendor:**
```
Script: FormList.AddForm(item)
Result: Item in vendor inventory
```

---

*Last Updated: January 2026*  
*Fallout 4 Version: 1.10.163+*  
*Frameworks: AWKCR 8.5+, ECO 3.0+*  
*Difficulty: Intermediate to Advanced*  
*Compatibility: Universal (no conflicts)*
