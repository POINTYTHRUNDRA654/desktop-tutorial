# Fallout 4 Comprehensive Modding Guide
## Reference Documentation for Mossy AI Assistant

---

## Table of Contents
1. [Complete Modding Workflow](#complete-modding-workflow)
2. [Creation Kit Deep Dive](#creation-kit-deep-dive)
3. [Papyrus Scripting Mastery](#papyrus-scripting-mastery)
4. [xEdit/FO4Edit Advanced Techniques](#xedit-advanced-techniques)
5. [Mesh and Texture Creation](#mesh-and-texture-creation)
6. [Performance Optimization](#performance-optimization)
7. [Testing and Debugging](#testing-and-debugging)
8. [Publishing Your Mod](#publishing-your-mod)

---

## Complete Modding Workflow

### 1. Initial Setup
```
1. Install Fallout 4
2. Install F4SE (Script Extender)
3. Install Creation Kit
4. Install xEdit/FO4Edit
5. Install LOOT
6. Install Mod Organizer 2 or Vortex
7. Install Blender (for custom meshes)
8. Install NifSkope (for NIF inspection)
9. Install BSA Browser or Archive2 (for archives)
10. Install Paint.NET or GIMP (for textures)
```

### 2. Creating Your First Mod

#### Step 1: Plan Your Mod
- Define what your mod does
- List required assets (meshes, textures, scripts)
- Identify potential conflicts with vanilla game
- Plan FormID ranges (use prefix for organization)

#### Step 2: Create Plugin
```
1. Open Creation Kit
2. File → Data
3. Select Fallout4.esm (and any DLC masters needed)
4. Set your plugin as "Active File"
5. Name it: YourModName.esp
```

#### Step 3: Create Records
- Use Object Window to browse existing records
- Right-click category → New
- Fill required fields
- Assign unique EditorID (use prefix: `MMM_WeaponName`)
- Set properties and stats

#### Step 4: Add Scripts (if needed)
- Create .psc file in `Data/Scripts/Source/User/`
- Write Papyrus script
- Compile in Creation Kit
- Attach to form in CK
- Set script properties

#### Step 5: Test
- Save plugin
- Close CK
- Run LOOT to sort load order
- Launch game
- Test thoroughly

#### Step 6: Polish
- Clean with xEdit (remove ITM/UDR)
- Optimize textures and meshes
- Generate documentation
- Create BSA/BA2 archive (optional)

---

## Creation Kit Deep Dive

### Understanding the Interface

#### Object Window (Left)
- Category: Filter by record type (Weapons, Armor, etc.)
- EditorID column: Unique identifier
- FormID column: Hex ID used in-game
- Use Filter box to search quickly

#### Cell View (Middle/Top)
- World Space dropdown: Select exterior/interior
- Cell list: All cells in selected world
- Reference list: Objects placed in selected cell

#### Render Window (Center/Bottom)
- 3D view of selected cell
- Place objects by dragging from Object Window
- Move/Rotate/Scale with toolbar buttons

#### Properties Windows (Right when object selected)
- Reference properties
- Base object properties
- Script properties

### Essential CK Operations

#### Creating a New Weapon
```
1. Object Window → Items → Weapon
2. Right-click → New
3. Fill in:
   - ID: MM_MyWeapon
   - Name: "My Custom Weapon"
   - Model: Browse to .nif file
   - Type: Select weapon type
   - Speed: Attack speed (1.0 = normal)
   - Reach: Melee distance
   - Min/Max Range: For ranged
   - Crit Effect: Optional
   - Attack Animation: Select from list
   - Impact Data: Weapon type specific
   - Base Damage: Modify in Damage section
   - Keywords: Add weapon type keywords
4. Add to Leveled List or Container
5. Save
```

#### Creating a Quest
```
1. Character → Quest
2. Right-click → New Quest
3. Quest Data Tab:
   - ID: MM_MyQuest
   - Priority: 60 (standard)
   - Type: Side Quest
   - Allow repeated stages: Usually No
4. Quest Stages Tab:
   - Add stages (0, 10, 20, etc.)
   - Add log entries
   - Set objective display flags
5. Quest Objectives Tab:
   - Create objectives for each stage
   - Set display text
6. Quest Aliases Tab:
   - Add references to NPCs/locations
   - Fill at runtime or specific reference
7. Scripts Tab:
   - Attach quest script
   - Set properties
8. Save
```

#### Working with Leveled Lists
Leveled lists spawn items/NPCs based on player level.

```
1. Character → Leveled NPC or Items → Leveled Item
2. Right-click → New
3. ID: MM_LeveledWeapons
4. Set Chance None: 0 (always spawn something)
5. Add entries:
   - Level: Min level for this entry
   - Reference: Item to spawn
   - Count: How many
6. Flags:
   - Calculate from all levels: Include lower level items
   - Calculate for each item: Roll separately per item
   - Use All: Give all items (ignore chance)
```

### Console Commands in CK

While testing in CK, open console with ` (backtick):

```
- coc [CellID] - Jump to cell
- cow [WorldSpace] [x,y] - Jump to worldspace coordinates
- ToggleCollision - Walk through walls
- ToggleMenus - Hide UI
- ShowRenderWindow - Focus render window
- SetTimescale [value] - Speed up/slow down time
```

### FormID Management

FormIDs are 8-digit hex numbers:
```
Format: XXFFFFFF
- XX = Load order index (00 = Fallout4.esm)
- FFFFFF = Unique ID within that plugin

Examples:
0x00012345 - Base game record
0x01ABC123 - First DLC record
0xFF000001 - Your mod record (FF = dynamic load order)
```

**Best Practices:**
- Use unique EditorID prefixes (e.g., MMM_)
- Document FormIDs for important records
- Never hardcode FormIDs in scripts (use properties)
- Check conflicts with xEdit before release

---

## Papyrus Scripting Mastery

### Script Structure
```papyrus
Scriptname MyScriptName extends ParentType

; === PROPERTIES ===
Actor Property PlayerRef Auto
ObjectReference Property MyObject Auto Conditional
GlobalVariable Property MyGlobal Auto Const

; === VARIABLES ===
int myVariable = 0
bool isActive = false

; === EVENTS ===
Event OnInit()
    ; Runs once when object is first loaded
    RegisterForUpdate(1.0) ; Update every second
EndEvent

Event OnUpdate()
    ; Runs every interval set by RegisterForUpdate
    myVariable += 1
EndEvent

; === FUNCTIONS ===
Function DoSomething(int param)
    Debug.Notification("Value: " + param)
EndFunction
```

### Common Parent Classes

**Quest** - For quest scripts
- OnInit() - Quest starts
- OnStageSet(int stage, int item) - Stage changes
- GetStageDone(int stage) - Check if stage completed
- SetStage(int stage) - Advance quest

**ObjectReference** - For placed objects
- OnActivate(ObjectReference akActionRef) - When activated
- OnHit(ObjectReference akAggressor, ...) - When hit
- OnTriggerEnter(ObjectReference akActionRef) - Enter trigger
- BlockActivation(bool) - Lock/unlock activation

**Actor** - For NPCs and creatures
- OnDeath(Actor akKiller) - When killed
- OnCombatStateChanged(Actor akTarget, int aeCombatState) - Combat state
- OnEnterBleedout() - Enters bleedout state
- OnGetUp(ObjectReference akFurniture) - Gets up from furniture

**ReferenceAlias** - For quest aliases
- OnInit() - Alias filled
- GetReference() - Get actual reference
- OnAliasInit() - Special alias setup

### Essential Papyrus Functions

#### Game & Player
```papyrus
Game.GetPlayer() ; Returns player actor
Game.GetFormFromFile(int formID, string filename) ; Load form from ESP
Game.AddAchievement(int id) ; Award achievement
Game.FadeOutGame(bool abFadingOut, bool abBlackFade, float afSecsBeforeFade, float afFadeDuration)
```

#### Debug (for testing)
```papyrus
Debug.Notification("Message") ; On-screen notification
Debug.MessageBox("Title") ; Popup message box
Debug.Trace("Log entry") ; Write to Papyrus log
Debug.OpenUserLog("MyMod") ; Create custom log file
```

#### Object Manipulation
```papyrus
myObject.MoveTo(targetRef) ; Teleport object
myObject.Enable() ; Make visible
myObject.Disable() ; Make invisible
myObject.Delete() ; Remove permanently
myObject.PlaceAtMe(Form akFormToPlace, int aiCount) ; Spawn object
```

#### Inventory
```papyrus
playerRef.AddItem(itemForm, count, silent?) ; Add item
playerRef.RemoveItem(itemForm, count, silent?, otherContainer?) ; Remove item
playerRef.GetItemCount(itemForm) ; Count items
playerRef.EquipItem(itemForm, abSilent?) ; Force equip
```

### Advanced Patterns

#### Remote Event Registration
```papyrus
; In OnInit or OnLoad
RegisterForRemoteEvent(PlayerRef, "OnItemAdded")

; Handler
Event Actor.OnItemAdded(Actor akSender, Form akBaseItem, int aiItemCount, ObjectReference akItemReference, ObjectReference akSourceContainer)
    if akBaseItem == MySpecialItem
        Debug.Notification("You found the special item!")
    endif
EndEvent
```

#### Custom Events
```papyrus
; Define custom event
CustomEvent MyCustomEvent

; Send event
Var[] args = new Var[2]
args[0] = PlayerRef
args[1] = 100
SendCustomEvent("MyCustomEvent", args)

; Receive event
Event MyCustomEvent(Var[] args)
    Actor who = args[0] as Actor
    int value = args[1] as int
EndEvent
```

#### Using Timers
```papyrus
; Single update
RegisterForSingleUpdate(5.0) ; Update in 5 seconds

; Repeating update
RegisterForUpdate(1.0) ; Update every second

; Cancel updates
UnregisterForUpdate()

; Update event
Event OnUpdate()
    ; Your code here
EndEvent
```

#### MCM Menu Integration (if using MCM)
```papyrus
Scriptname MyModMCM extends MCM_ConfigBase

Event OnConfigInit()
    ModName = "My Mod Name"
EndEvent

Event OnOptionSelect(int option)
    if option == enableFeatureOID
        EnableFeature = !EnableFeature
        SetToggleOptionValue(option, EnableFeature)
    endif
EndEvent
```

### Papyrus Performance Tips

1. **Avoid OnUpdate loops**
   - Use RegisterForSingleUpdate instead of continuous RegisterForUpdate
   - Unregister when not needed

2. **Cache GetPlayer() calls**
   ```papyrus
   Actor Property PlayerRef Auto ; Fill in CK once
   ; Don't call Game.GetPlayer() repeatedly
   ```

3. **Use None checks**
   ```papyrus
   if myProperty != None
       myProperty.DoSomething()
   endif
   ```

4. **Avoid string operations in hot paths**
   - String concatenation is slow
   - Cache strings when possible

5. **Limit array sizes**
   - Papyrus arrays have overhead
   - Keep arrays small and compact

---

## xEdit Advanced Techniques

### Conflict Detection Workflow

1. **Load Your Mod**
   ```
   - Launch FO4Edit
   - Check your mod only
   - Right-click → Apply Filter → Conflict status
   ```

2. **Interpret Conflict Colors**
   - Green: No conflict
   - Yellow: Override (expected)
   - Orange: Conflict
   - Red: Critical conflict

3. **Resolve Conflicts**
   - Option 1: Forward records from winning mod
   - Option 2: Create compatibility patch
   - Option 3: Load order adjustment
   - Option 4: Merge records manually

### Cleaning Your Mod

**Automated Cleaning:**
```
1. Right-click your mod → Apply Filter for Cleaning
2. Right-click → Remove "Identical to Master" records
3. Right-click → Undelete and Disable References
4. Save
```

**Manual Review:**
- Check for deleted NavMeshes (breaks AI)
- Verify no critical deletions
- Test in-game after cleaning

### Batch Editing with Scripts

**Rename All Weapons:**
```pascal
unit RenameWeapons;

function Process(e: IInterface): integer;
var
  currentName, newName: string;
begin
  Result := 0;
  
  // Only process WEAP records
  if Signature(e) <> 'WEAP' then Exit;
  
  // Get current name
  currentName := GetElementEditValues(e, 'FULL');
  
  // Add prefix
  newName := '[MOD] ' + currentName;
  
  // Set new name
  SetElementEditValues(e, 'FULL', newName);
  
  AddMessage('Renamed: ' + newName);
end;

end.
```

**Find Unused Records:**
```pascal
unit FindUnused;

function Process(e: IInterface): integer;
var
  refCount: integer;
begin
  Result := 0;
  
  // Count references to this record
  refCount := ReferencedByCount(e);
  
  if refCount = 0 then begin
    AddMessage('Unused: ' + Name(e));
  end;
end;

end.
```

### FormID Operations

**Renumber FormIDs:**
```
1. Right-click record → Change FormID
2. Enter new FormID (must be in your plugin's range)
3. xEdit updates all references automatically
```

**Compact FormIDs:**
```
1. Select your mod
2. Right-click → Compact FormIDs for ESL
3. Renumbers to 0x800-0xFFF range (ESL compatible)
```

---

## Mesh and Texture Creation

### Blender to Fallout 4 Workflow

#### 1. Model in Blender
```
- Use metric units (Edit → Scene → Units → Metric)
- Keep scale realistic (player is ~1.8m tall)
- Apply all transforms (Ctrl+A → All Transforms)
- Use modifiers for non-destructive editing
```

#### 2. UV Mapping
```
- Select mesh → Tab (Edit Mode)
- U → Unwrap or Smart UV Project
- Adjust UVs in UV Editor
- Avoid stretching and overlaps
- Keep resolution in mind (2048x2048 typical)
```

#### 3. Texturing
```
Export UV Layout:
- UV Editor → UV → Export UV Layout

Create textures in Paint.NET/GIMP:
- Diffuse (_d.dds): Base color
- Normal (_n.dds): Surface details
- Specular (_s.dds): Shininess
- Glow (_g.dds): Emissive areas
```

#### 4. Export to NIF
```
Install Blender NIF Plugin:
1. Download from NexusMods
2. Install in Blender (Edit → Preferences → Add-ons)
3. Enable "Import-Export: NIF format"

Export Settings:
- File → Export → NetImmerse/Gamebryo (.nif)
- Version: Fallout 4
- Export selected only
- Apply modifiers
- Smoothing: Vertex Normals
```

#### 5. Edit in NifSkope
```
Open exported NIF:
1. Verify block structure (BSTriShape)
2. Set shader properties (BSLightingShaderProperty)
3. Add texture paths (BSShaderTextureSet)
4. Add collision if needed
5. Check for errors (Render → Check Blocks)
```

### Texture Creation Guidelines

#### DDS Formats
- **BC1 (DXT1)**: Diffuse, no alpha (1:6 compression)
- **BC3 (DXT5)**: Diffuse with alpha (1:4 compression)
- **BC5 (ATI2)**: Normal maps, 2-channel (best quality)
- **BC7**: Highest quality (1:4 compression, modern)

#### Texture Sizes
```
Weapons: 1024x1024 to 2048x2048
Armor: 2048x2048 (hero) or 1024x1024 (common)
Environment: 512x512 to 2048x2048
UI: 256x256 to 512x512

Always use power-of-2 dimensions:
256, 512, 1024, 2048, 4096
```

#### Normal Maps
```
Generate from Height Map:
1. Create grayscale height map (white = high, black = low)
2. Use GIMP normalmap plugin or Photoshop filter
3. Save as BC5 DDS
4. Flip green channel if needed (some tools vary)
```

#### Optimization
```
- Use mipmaps (auto-generated in DDS tools)
- Compress aggressively for distant objects
- Consider atlas textures for small items
- Remove alpha channel if not needed (BC1 vs BC3)
```

---

## Performance Optimization

### PreVis/PreCombines System

**What is PreVis?**
- Pre-calculated visibility data
- Tells engine which objects are visible from any location
- Massively improves performance
- Breaking it causes yellow "precombined" meshes and FPS drops

**What Breaks PreVis:**
- Moving, deleting, or adding static references in exteriors
- Editing landscape
- Modifying NavMesh
- Moving lighting

**How to Fix:**
```
In Creation Kit:
1. Load worldspace with edits
2. Select exterior cell
3. Worldspace → Generate PreVis Data
4. Wait for process (can take hours for large areas)
5. Test in-game (no yellow meshes)
```

**Alternatives:**
- Disable PreVis for your cell (performance cost)
- Use interior cells (no PreVis)
- Edit in new worldspace

### Script Performance

**Expensive Operations (Minimize):**
- String operations
- Array operations on large arrays
- Frequent OnUpdate events
- Math operations in loops
- GetDistance calculations

**Optimization Strategies:**
```papyrus
; BAD: Continuous update
Event OnUpdate()
    if PlayerRef.GetDistance(Self) < 500
        ; Do something
    endif
    RegisterForUpdate(0.1) ; Runs 10x per second!
EndEvent

; GOOD: Trigger-based
Event OnTriggerEnter(ObjectReference akActionRef)
    if akActionRef == PlayerRef
        ; Do something once
    endif
EndEvent
```

### Mesh Optimization

**Poly Budget Guidelines:**
```
Weapons (1st person): 3,000-5,000 tris
Weapons (3rd person): 1,500-3,000 tris
Armor pieces: 5,000-10,000 tris per piece
Environment props: Varies, use LODs
Characters: 15,000-25,000 tris
```

**LOD (Level of Detail) Creation:**
```
Create 3 LOD levels:
- LOD0: Full detail (close range)
- LOD1: 50% detail (medium range)
- LOD2: 25% detail (far range)

In Blender:
1. Duplicate mesh
2. Apply Decimate modifier (ratio: 0.5 for LOD1)
3. Export as separate NIF
4. Set in CK Object Window properties
```

### Texture Optimization

**Checklist:**
- [ ] All textures power-of-2 dimensions
- [ ] Mipmaps generated
- [ ] Appropriate compression (BC1/BC3/BC5/BC7)
- [ ] No unnecessary alpha channels
- [ ] Reasonable sizes for purpose
- [ ] Packed into BA2 archive

**Batch Optimization Script (ImageMagick):**
```bash
# Resize all PNG to max 2048px
for i in *.png; do
  magick "$i" -resize 2048x2048\> "$i"
done

# Convert to DDS (use dedicated tool like Texconv)
texconv -f BC1_UNORM -m 0 *.png
```

---

## Testing and Debugging

### Essential Testing Tools

1. **Buffout 4** - Crash logger
2. **Papyrus Profiler** - Script performance
3. **FallUI** - Better UI for testing
4. **Achievement Mod Enabler** - Test with achievements
5. **Console Command Runner** - Automate test commands

### Testing Checklist

**Initial Testing:**
- [ ] Mod loads without errors
- [ ] No missing masters
- [ ] Records appear in game
- [ ] Scripts compile successfully
- [ ] No immediate CTDs

**Functionality Testing:**
- [ ] Items obtainable as intended
- [ ] Scripts execute correctly
- [ ] Quests progress properly
- [ ] NPCs behave correctly
- [ ] Collision works properly
- [ ] Textures display correctly

**Compatibility Testing:**
- [ ] Test with popular mods
- [ ] Check for conflicts in xEdit
- [ ] Verify load order position
- [ ] Test with different game settings
- [ ] Check save/load stability

**Performance Testing:**
- [ ] Monitor FPS in affected areas
- [ ] Check for script lag (Papyrus Profiler)
- [ ] Verify no infinite loops
- [ ] Test long play sessions
- [ ] Check memory usage

### Debugging Papyrus

**Enable Logging:**
In `Documents/My Games/Fallout4/Fallout4Custom.ini`:
```ini
[Papyrus]
bEnableLogging=1
bEnableTrace=1
bLoadDebugInformation=1
```

**Read Papyrus Logs:**
Location: `Documents/My Games/Fallout4/Logs/Script/Papyrus.0.log`

**Common Log Patterns:**
```
; Script not found
WARNING: Unable to load "MyScript"
→ Solution: Verify .pex file exists in Data/Scripts/

; Property not filled
WARNING: Property "MyProperty" on script "MyScript" attached to (FormID) cannot be initialized
→ Solution: Fill property in Creation Kit

; Stack overflow
ERROR: Stack overflow in script "MyScript"
→ Solution: Add Utility.Wait() in loops, check for infinite recursion
```

**Debug Tracing:**
```papyrus
; Add debug statements
Debug.Trace("MyScript: OnInit called")
Debug.Trace("MyScript: PlayerRef = " + PlayerRef)
Debug.Trace("MyScript: Value = " + myVariable)
```

### Using Console for Testing

**Quick Test Commands:**
```
; Get to test area fast
coc qasmoke ; Test cell with all items
cow Commonwealth 0,0 ; Center of map

; Give yourself mod items
help "MyWeapon" 4 ; Find FormID
player.additem [FormID] 1

; Test quest
getstage [QuestID]
setstage [QuestID] 10
sqv [QuestID] ; Show all variables

; Test scripts
prid [RefID] ; Select reference
call MyFunction ; Call script function
```

---

## Publishing Your Mod

### Pre-Release Checklist

**Technical:**
- [ ] Run xEdit cleaning (ITM/UDR removal)
- [ ] Validate all asset paths
- [ ] Test loading from clean save
- [ ] Verify no missing masters
- [ ] Check file size (optimize if needed)
- [ ] Create BSA/BA2 archive (optional)

**Documentation:**
- [ ] Write comprehensive README
- [ ] Create installation instructions
- [ ] List requirements and compatibility
- [ ] Document known issues
- [ ] Include changelog
- [ ] Add credits for any assets used

**Legal:**
- [ ] Verify all assets are original or permitted
- [ ] Check mod permissions for used resources
- [ ] Include attribution where required
- [ ] Set appropriate permissions for your mod

### README Template

```markdown
# [Mod Name] v[Version]

## Description
[Detailed description of what your mod does]

## Features
- Feature 1
- Feature 2
- Feature 3

## Requirements
- Fallout 4 Game Version [version]
- F4SE [version] or higher
- [DLC Name] (if required)
- [Other Required Mods]

## Installation
1. Install requirements
2. Download main file
3. Extract to Fallout 4 Data folder
4. Enable in your mod manager
5. Load order: [recommendations]

## Configuration
[MCM settings, INI tweaks, etc.]

## Compatibility
- Compatible with: [list]
- Incompatible with: [list]
- Load order: [specific recommendations]

## Known Issues
- Issue 1: [workaround]
- Issue 2: [workaround]

## Changelog
### v1.0.0
- Initial release

## Credits
- [You]: Main author
- [Someone]: Asset creator (with permission)
- [Tool]: Created with Tool X

## Permissions
[Your permission statement]

## Support
[How users can get help]
```

### Nexus Mods Upload Checklist

**Required:**
- [ ] Unique mod name
- [ ] Category selection
- [ ] Short description (160 chars)
- [ ] Long description (formatted)
- [ ] Images (1920x1080 recommended)
- [ ] Main file upload
- [ ] Version number
- [ ] Requirements listed

**Optional but Recommended:**
- [ ] Video showcase
- [ ] Multiple images showing features
- [ ] Optional files (patches, alternatives)
- [ ] FOMOD installer
- [ ] Detailed permissions
- [ ] Discord/support links

### Creating an Installer (FOMOD)

**Structure:**
```
ModName/
├── fomod/
│   ├── info.xml
│   └── ModuleConfig.xml
├── Core Files/
│   └── Data/
├── Optional Feature 1/
│   └── Data/
└── Optional Feature 2/
    └── Data/
```

**Sample ModuleConfig.xml:**
```xml
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <moduleName>My Mod</moduleName>
    <installSteps order="Explicit">
        <installStep name="Core Files">
            <requiredInstallFiles>
                <file source="Core Files" destination="" priority="0" />
            </requiredInstallFiles>
        </installStep>
        <installStep name="Optional Features">
            <optionalFileGroups>
                <group name="Features" type="SelectAny">
                    <plugins>
                        <plugin name="Feature 1">
                            <files>
                                <file source="Optional Feature 1" destination="" />
                            </files>
                        </plugin>
                    </plugins>
                </group>
            </optionalFileGroups>
        </installStep>
    </installSteps>
</config>
```

---

## Quick Reference Tables

### Papyrus Event Priority
| Event | Trigger | Performance Cost |
|-------|---------|------------------|
| OnInit | Object first loads | Low |
| OnLoad | Object cell loads | Low |
| OnActivate | Player activates | Low |
| OnUpdate | Timed interval | **HIGH** |
| OnHit | Object hit | Medium |
| OnDeath | Actor dies | Low |
| OnCellLoad | Cell loaded | Medium |
| OnTriggerEnter | Trigger volume | Low |

### FormID Prefixes by DLC
| Prefix | Source | Notes |
|--------|--------|-------|
| 00 | Fallout4.esm | Base game |
| 01 | DLCRobot.esm | Automatron |
| 02 | DLCworkshop01.esm | Wasteland Workshop |
| 03 | DLCCoast.esm | Far Harbor |
| 04 | DLCworkshop02.esm | Contraptions |
| 05 | DLCworkshop03.esm | Vault-Tec |
| 06 | DLCNukaWorld.esm | Nuka-World |
| FF | Your mod | Dynamic |

### Record Type Quick Ref
| Code | Type | Usage |
|------|------|-------|
| WEAP | Weapon | Guns, melee |
| ARMO | Armor | Clothing, armor |
| QUST | Quest | Quests, objectives |
| NPC_ | Actor | NPCs, creatures |
| LVLI | Leveled Item | Loot tables |
| CONT | Container | Chests, boxes |
| CELL | Cell | Interior locations |
| WRLD | Worldspace | Exterior areas |
| STAT | Static | Decorations |
| MSTT | Movable Static | Havok objects |

---

## Additional Resources

### Official Documentation
- Creation Kit Wiki: https://www.creationkit.com/
- Papyrus Reference: https://www.creationkit.com/index.php?title=Category:Papyrus

### Community Resources
- Nexus Mods FO4: https://www.nexusmods.com/fallout4
- r/FalloutMods Reddit: https://www.reddit.com/r/FalloutMods/
- xEdit Discord: [Community server]
- Creation Kit Discord: [Community server]

### Recommended Tutorials
- Kinggath Modding Tutorial Series (YouTube)
- Seddon4494 Creation Kit Guides
- Darkfox127 Papyrus Tutorials
- GamerPoets Mod Management Series

---

**Document Version:** 2.0  
**Last Updated:** January 2026  
**For Mossy AI Assistant v3.0**
