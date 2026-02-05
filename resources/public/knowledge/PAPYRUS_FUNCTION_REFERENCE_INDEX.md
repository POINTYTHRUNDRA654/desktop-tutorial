# Papyrus Function Reference Index

## Overview

The Papyrus scripting language for Fallout 4 contains 1,358+ documented functions and utilities organized into functional categories. This index provides a comprehensive reference to all Papyrus subcategories and the most common functions.

**Total Resources**: 1,358+ pages
**Subcategories**: 10 main categories
**Function Categories**: 200+ pages indexed (partial listing; complete reference available in full CK Wiki)

---

## Papyrus Subcategories

### 1. Arrays (7 pages)
Functions and utilities for working with array data structures in Papyrus.

**Key Functions**
- `Add - Array`: Append element to array
- `Clear - Array`: Empty array
- `Find - Array`: Search array for element
- `FindStruct - Array`: Find struct in array
- `Insert - Array`: Insert element at index
- `Remove - Array`: Remove element from array

**Uses**: Data collection, list management, dynamic data storage

### 2. F4SE (233 pages)
Fallout 4 Script Extender functions providing enhanced scripting capabilities beyond vanilla Papyrus.

**Categories**
- Extended script functions
- Utility extensions
- Form manipulation
- Quest and dialogue functions
- Advanced features (plugins, mods, compatibility)

**Key Advantage**: Extends vanilla Papyrus with 233+ additional functions for mod authors

**Functions Include**
- `GetPluginVersion - F4SE`: Get F4SE plugin version
- `GetScriptVersionRelease - F4SE`: Script version info
- `GetVersion - F4SE`: F4SE version checking
- `GetVersionBeta - F4SE`: Beta version identification
- `GetVersionMinor - F4SE`: Minor version number
- `GetVersionRelease - F4SE`: Release version detection

### 3. Fragments (7 pages)
Fragment scripts for quests, dialogue, and scenes—pre-generated event handlers.

**Uses**
- Quest fragments (script fragments attached to quest stages)
- Dialogue fragments (dialogue system integration)
- Scene fragments (scene event handlers)

### 4. Inventory-safe Papyrus Functions (30 pages)
Functions safe to call on inventory items without crashing or side effects.

**Categories**
- Property getters (safe data reads)
- Form functions (safe type checks)
- Skill/attribute queries

**Important**: Use these functions instead of general ObjectReference functions on items in containers

### 5. Latent Functions (52 pages)
Functions that take time to complete, requiring script waits and proper handling.

**Characteristics**
- May block execution
- Require `Utility.Wait()` for completion
- Can span multiple game frames

**Examples**
- Movement functions
- Animation plays
- Scene playback
- Dialogue actions

**Safe Patterns**
```papyrus
; Latent functions require waits
Actor.MoveTo(Location)
Utility.Wait(1.0)  ; Wait for move to complete

Scene.Start()
Utility.Wait(Scene.GetLength())  ; Wait for scene playback
```

### 6. Non-Delayed Native Functions (138 pages)
Functions that execute immediately without delays or frame waits.

**Characteristics**
- Return instantly
- No game frame delays
- Safe for high-frequency calls
- Optimal for performance-critical code

**Examples**
- Property getters (GetPosition, GetRotation, etc.)
- State queries (IsEnabled, IsDead, etc.)
- Simple math functions

### 7. Papyrus Beta Only Functions (2 pages)
Functions marked for beta testing, removed from release builds.

**Handling**
- Use `betaOnly` keyword marker
- Removed with `-final` compiler flag
- For testing before release

**Example**
```papyrus
Function TestFeature()
  betaOnly  ; Removed in final builds
  Debug.Trace("Testing beta feature")
EndFunction
```

### 8. Papyrus Debug Only Functions (38 pages)
Functions for development and debugging, removed from release builds.

**Characteristics**
- Marked with `debugOnly` keyword
- Removed with `-r` (release) compiler flag
- No overhead in released code
- Safe for logging and development

**Examples**
- `Debug.Trace()`: Console logging
- `Debug.MessageBox()`: Debug popups
- `Debug.Notification()`: Debug messages
- `OpenUserLog - Debug`: Debug log file
- `CloseUserLog - Debug`: Close debug log
- `GetVersionNumber - Debug`: Version info
- `GetConfigName - Debug`: Configuration name
- `GetPlatformName - Debug`: Platform detection
- `EnableAI - Debug`: AI toggling
- `EnableCollisions - Debug`: Collision debugging
- `EnableDetection - Debug`: Detection debugging
- `EnableMenus - Debug`: Menu state debugging
- `CenterOnCell - Debug`: Camera positioning
- `CenterOnCellAndWait - Debug`: Async camera move
- `DumpAliasData - Debug`: Alias debugging
- `DumpEventRegistrations - Debug`: Event debug info

**Common Pattern**
```papyrus
Function DoSomething()
  debugOnly Debug.Trace("DoSomething called")  ; Removed in release
  
  ; Production code here
  Actor.MoveTo(Location)
EndFunction
```

### 9. Papyrus Language Reference (18 pages)
Core language features, syntax, and language constructs.

**Topics**
- Variable declarations
- Function syntax
- Event syntax
- State machines
- Property definitions
- Conditions
- Expressions
- Type system
- Comments and documentation

### 10. Papyrus Tutorials (8 pages)
Beginner-focused tutorials for Papyrus scripting.

**Common Topics**
- Hello World examples
- Basic syntax
- Script attachment
- Property usage
- Function creation
- Event handling

---

## Function Categories (200+ Pages)

Functions organized by type and purpose (partial listing of 200 shown; 1,358+ total available).

### Get Functions (100+ pages)
Retrieve data from forms, actors, objects, and script systems.

**Actor Get Functions**
- `GetActorBase - Actor`: Get base NPC form
- `GetActorOwner - ObjectReference`: Owner of object
- `GetActorRefOwner - ObjectReference`: Owning reference
- `GetBribeAmount - Actor`: Bribe cost
- `GetCombatState - Actor`: Current combat state
- `GetCombatTarget - Actor`: Primary combat target
- `GetCurrentPackage - Actor`: Active package
- `GetDialogueTarget - Actor`: Dialogue conversation partner
- `GetEquippedItemType - Actor`: Equipped item type
- `GetEquippedShield - Actor`: Equipped shield
- `GetEquippedSpell - Actor`: Equipped spell
- `GetEquippedWeapon - Actor`: Equipped weapon
- `GetFactionOwner - ObjectReference`: Faction owner
- `GetFactionRank - Actor`: Rank in faction
- `GetFactionReaction - Actor`: Faction reaction
- `GetFactionReaction - Faction`: Reaction level
- `GetFlyingState - Actor`: Flight state
- `GetForcedLandingMarker - Actor`: Forced landing location
- `GetFurnitureReference - Actor`: Used furniture
- `GetGoldAmount - Actor`: Carried gold
- `GetHighestRelationshipRank - Actor`: Highest NPC rank
- `GetInstanceOwner - Actor`: Instance item owner
- `GetKiller - Actor`: Who killed actor
- `GetLevel - Actor`: Character level
- `GetLevel - ActorBase`: NPC base level
- `GetLeveledActorBase - Actor`: Leveled base form
- `GetLevelExact - ActorBase`: Exact level (no scaling)
- `GetLightLevel - Actor`: Ambient light level
- `GetLookupRelationshipRank - Actor`: Relationship level
- `GetLowestRelationshipRank - Actor`: Lowest NPC rank
- `GetRace - Actor`: Actor race
- `GetRace - ActorBase`: NPC base race
- `GetRelationshipRank - Actor`: Relationship level
- `GetSex - ActorBase`: Character sex
- `GetSitState - Actor`: Sitting state
- `GetSleepState - Actor`: Sleep state
- `GetTemplate - ActorBase`: Template NPC
- `GetVoiceType - ObjectReference`: Voice type
- `GetWornItem - Actor`: Worn item lookup
- `GetWornItemMods - Actor`: Item mod list

**Object/Reference Get Functions**
- `GetAngleX - ObjectReference`: Rotation X axis
- `GetAngleY - ObjectReference`: Rotation Y axis
- `GetAngleZ - ObjectReference`: Rotation Z axis
- `GetAnimationVariableBool - ObjectReference`: Animation variable (bool)
- `GetAnimationVariableFloat - ObjectReference`: Animation variable (float)
- `GetAnimationVariableInt - ObjectReference`: Animation variable (int)
- `GetAssociatedForm - Furniture`: Associated form
- `GetAssociatedSkill - MagicEffect`: Effect skill link
- `GetBaseObject - ObjectReference`: Base form
- `GetBaseValue - ObjectReference`: Base property value
- `GetContainer - ObjectReference`: Container owner
- `GetConnectPoints - ObjectReference`: Connection points
- `GetConnectedObjects - ObjectReference`: Connected refs
- `GetCurrentDestructionStage - ObjectReference`: Destruction state
- `GetCurrentLocation - ObjectReference`: Current location
- `GetCurrentScene - ObjectReference`: Active scene
- `GetDescription - Form`: Form description text
- `GetDistance - ObjectReference`: Distance to object
- `GetDisplayName - ObjectReference`: Display name
- `GetEditorLocation - ObjectReference`: Editor location
- `GetEncounterZone - ObjectReference`: Encounter zone
- `GetEquipType - Form`: Equipment slot type
- `GetHeight - ObjectReference`: Object height
- `GetHeadingAngle - ObjectReference`: Heading rotation
- `GetItemCount - ObjectReference`: Inventory count
- `GetItemHealthPercent - ObjectReference`: Item durability
- `GetKey - ObjectReference`: Key form
- `GetLength - ObjectReference`: Object length
- `GetLinkedRef - ObjectReference`: First linked ref
- `GetLinkedRefChain - ObjectReference`: All linked refs
- `GetLinkedRefChildren - ObjectReference`: Child linked refs
- `GetLockLevel - ObjectReference`: Lock difficulty
- `GetLocRefTypes - ObjectReference`: Location ref types
- `GetMass - ObjectReference`: Object mass/weight
- `GetMaterialSwap - ObjectReference`: Material replacement
- `GetNthLinkedRef - ObjectReference`: Nth linked reference
- `GetOpenState - ObjectReference`: Open/closed state
- `GetParentCell - ObjectReference`: Parent cell
- `GetPositionX - ObjectReference`: X coordinate
- `GetPositionY - ObjectReference`: Y coordinate
- `GetPositionZ - ObjectReference`: Z coordinate
- `GetSafePosition - ObjectReference`: Safe placement position
- `GetScale - ObjectReference`: Object scale
- `GetTeleportCell - ObjectReference`: Teleport destination
- `GetTransitionCell - ObjectReference`: Transition cell
- `GetValue - ObjectReference`: Item gold value
- `GetValuePercentage - ObjectReference`: Condition percentage
- `GetWidth - ObjectReference`: Object width
- `GetWorldSpace - ObjectReference`: Worldspace

**Form Get Functions**
- `GetDescription - Form`: Form description
- `GetEnchantment - Form`: Item enchantment
- `GetEnchantmentValue - Form`: Enchantment magnitude
- `GetEquipType - Form`: Equipment type
- `GetFormID - Form`: Form ID (8-bit)
- `GetGoldValue - Form`: Item value in gold
- `GetIconPath - Form`: Icon texture path
- `GetKeywords - Form`: Keyword list
- `GetName - Form`: Form name
- `GetWeight - Form`: Item weight
- `GetWorldModelPath - Form`: 3D model path
- `HasKeyword - Form`: Keyword check
- `HasKeywordInFormList - Form`: FormList keyword check
- `HasWorldModel - Form`: Model existence check

**Game/Utility Get Functions**
- `GetCaps - Game`: Player caps (money)
- `GetCharismaAV - Game`: Charisma attribute
- `GetDifficulty - Game`: Difficulty level
- `GetForm - Game`: Form by ID
- `GetFormFromFile - Game`: Form from specific mod
- `GetGameSettingFloat - Game`: Float game setting
- `GetGameSettingInt - Game`: Integer game setting
- `GetGameSettingString - Game`: String game setting
- `GetInstalledLightPlugins - Game`: Light plugin list
- `GetInstalledPlugins - Game`: Plugin list
- `GetPlayer - Game`: Player actor reference
- `GetPlayerFollowers - Game`: Follower list
- `GetPlayerLevel - Game`: Player character level
- `GetPlayersLastRiddenHorse - Game`: Last horse ridden
- `GetPluginDependencies - Game`: Plugin dependencies
- `GetRealHoursPassed - Game`: Real time elapsed
- `GetXPForLevel - Game`: XP required for level

**Instance Data Get Functions**
- `GetAccuracyBonus - InstanceData`: Weapon accuracy bonus
- `GetActionPointCost - InstanceData`: VATS AP cost
- `GetAmmoCapacity - InstanceData`: Magazine size
- `GetAmmo - InstanceData`: Equipped ammo type
- `GetArmorHealth - InstanceData`: Current durability
- `GetArmorRating - InstanceData`: Armor rating value
- `GetAttackDamage - InstanceData`: Damage value
- `GetAttackDelay - InstanceData`: Attack speed
- `GetCritChargeBonus - InstanceData`: Crit charge bonus
- `GetCritMultiplier - InstanceData`: Crit damage multiplier
- `GetDamageTypes - InstanceData`: Damage type list
- `GetFlag - InstanceData`: Item flag value
- `GetKeywords - InstanceData`: Dynamic keywords
- `GetMaxRange - InstanceData`: Max weapon range
- `GetMinRange - InstanceData`: Min weapon range
- `GetNumProjectiles - InstanceData`: Projectile count
- `GetOutOfRangeMultiplier - InstanceData`: Out-of-range damage
- `GetProjectileOverride - InstanceData`: Custom projectile
- `GetReach - InstanceData`: Melee reach
- `GetReloadSpeed - InstanceData`: Reload speed
- `GetResist - InstanceData`: Damage resistance
- `GetSightedTransition - InstanceData`: Sight distance
- `GetSkill - InstanceData`: Skill effectiveness
- `GetSpeed - InstanceData`: Item/projectile speed
- `GetStagger - InstanceData`: Stagger value
- `GetWeight - InstanceData`: Item weight

### Is Functions (100+ pages)
Query state and boolean properties of objects and actors.

**Actor Is Functions**
- `IsAIEnabled - Actor`: AI state
- `IsAlarmed - Actor`: Alarmed state
- `IsAlerted - Actor`: Alert state
- `IsAllowedToFly - Actor`: Flight permission
- `IsArrested - Actor`: Arrested state
- `IsArrestingTarget - Actor`: Arresting someone
- `IsBeingRidden - Actor`: Being ridden
- `IsBeingRiddenBy - Actor`: Ridden by specific actor
- `IsBleedingOut - Actor`: Bleedout state
- `IsBribed - Actor`: Bribed state
- `IsChild - Actor`: Child actor
- `IsCommandedActor - Actor`: Under player command
- `IsDead - Actor`: Dead state
- `IsDetectedBy - Actor`: Detected by actor
- `IsDismembered - Actor`: Dismembered state
- `IsDoingFavor - Actor`: Doing favor
- `IsEssential - Actor`: Essential (protected)
- `IsEssential - ActorBase`: NPC essential flag
- `IsEquipped - Actor`: Item equipped check
- `IsFlying - Actor`: Flight state
- `IsGhost - Actor`: Ghost form
- `IsGuard - Actor`: Guard NPC
- `IsHostileToActor - Actor`: Hostile faction check
- `IsInCombat - Actor`: Combat state
- `IsInDialogueWithPlayer - ObjectReference`: In dialogue
- `IsInFaction - Actor`: Faction member check
- `IsInInterior - ObjectReference`: Interior location
- `IsInIronSights - Actor`: Aiming down sights
- `IsInKillMove - Actor`: Kill move animation
- `IsInLocation - ObjectReference`: Location check
- `IsInPowerArmor - Actor`: Power armor equipped
- `IsInScene - Actor`: Scene participation
- `IsIntimidated - Actor`: Intimidated state
- `IsInvulnerable - ActorBase`: Invulnerable flag
- `IsNearPlayer - ObjectReference`: Near player check
- `IsOnMount - Actor`: Mounted state
- `IsOverEncumbered - Actor`: Overencumbered
- `IsOwnedBy - ObjectReference`: Owner check
- `IsOwnedObjectInList - RefCollectionAlias`: Owned by alias check
- `IsOwner - Actor`: Owner of object
- `IsPlayable - Perk`: Perk playable
- `IsPlayerEnemy - Faction`: Enemy of player
- `IsPlayerExpelled - Faction`: Expelled from faction
- `IsPlayerRadioOn - Game`: Radio playing
- `IsPlayersLastRiddenHorse - Actor`: Last ridden horse
- `IsPlayerTeammate - Actor`: Faction teammate
- `IsProtected - ActorBase`: Protected (non-killable)
- `IsRunning - Actor`: Running state
- `IsSeatOccupied - Actor`: Furniture seat occupied
- `IsSneaking - Actor`: Sneaking state
- `IsSprinting - Actor`: Sprinting state

**Object/Reference Is Functions**
- `Is3DLoaded - ObjectReference`: 3D model loaded
- `IsActivateChild - ObjectReference`: Child for activation
- `IsActivationBlocked - ObjectReference`: Activation blocked
- `IsCreated - ObjectReference`: Created (not from save)
- `IsDeleted - ObjectReference`: Deleted from game
- `IsDestroyed - ObjectReference`: Destroyed state
- `IsDisabled - ObjectReference`: Disabled state
- `IsEnabled - ObjectReference`: Enabled state
- `IsFurnitureInUse - ObjectReference`: Furniture occupied
- `IsFurnitureMarkerInUse - ObjectReference`: Marker occupied
- `HasDirectLOS - ObjectReference`: Direct line of sight
- `HasNode - ObjectReference`: Animation node exists
- `HasOwner - ObjectReference`: Has owner
- `IsLocked - ObjectReference`: Lock state
- `IsLockBroken - ObjectReference`: Lock broken
- `IsMapMarkerVisible - ObjectReference`: Map marker visible
- `IsPowered - ObjectReference`: Powered state
- `IsQuestItem - ObjectReference`: Quest item flag

**Location Is Functions**
- `IsChild - Location`: Child location
- `IsCleared - Location`: Cleared state
- `HasEverBeenCleared - Location`: Ever cleared
- `IsLinkedLocation - Location`: Linked location
- `IsLoaded - Location`: Loaded state
- `IsSameLocation - Location`: Same location check
- `HasCommonParent - Location`: Common parent check
- `HasRefType - Location`: Has reference type

**Cell Is Functions**
- `IsInterior - Cell`: Interior cell
- `IsLoaded - Cell`: Loaded state
- `IsAttached - Cell`: Attached to world

**Form Is Functions**
- `IsHostile - Enchantment`: Hostile enchantment
- `IsHostile - Ingredient`: Hostile ingredient
- `IsHostile - Potion`: Hostile potion
- `IsHostile - Spell`: Hostile spell

**Quest Is Functions**
- `IsActive - Quest`: Active state
- `IsCompleted - Quest`: Completed state
- `IsRunning - Quest`: Running state
- `IsStarting - Quest`: Starting state
- `IsStageDone - Quest`: Stage done
- `IsObjectiveCompleted - Quest`: Objective complete
- `IsObjectiveDisplayed - Quest`: Objective displayed
- `IsObjectiveFailed - Quest`: Objective failed

**Game/UI Is Functions**
- `IsActivateControlsEnabled - Game`: Activation controls
- `IsCamSwitchControlsEnabled - Game`: Camera switch controls
- `IsFastTravelControlsEnabled - Game`: Fast travel controls
- `IsFastTravelEnabled - Game`: Fast travel enabled
- `IsFavoritesControlsEnabled - Game`: Favorites controls
- `IsFightingControlsEnabled - Game`: Fighting controls
- `IsJournalControlsEnabled - Game`: Journal controls
- `IsJumpingControlsEnabled - Game`: Jumping controls
- `IsLookingControlsEnabled - Game`: Looking controls
- `IsMenuControlsEnabled - Game`: Menu controls
- `IsMovementControlsEnabled - Game`: Movement controls
- `IsSneakingControlsEnabled - Game`: Sneaking controls
- `IsInMenuMode - Utility`: Menu mode state
- `IsMenuOpen - UI`: Menu open state
- `IsMenuRegistered - UI`: Menu registered

### Other Function Categories

**Enable/Disable Functions**
- `Enable - ObjectReference`: Enable object
- `Disable - ObjectReference`: Disable object
- `EnableNoWait - ObjectReference`: Async enable
- `DisableNoWait - ObjectReference`: Async disable
- `BlockActivation - ObjectReference`: Block activation
- `BlockActivation - RefCollectionAlias`: Alias block activation

**Set/Assign Functions**
- `SetPropertyValue - ScriptObject`: Set property value
- `GotoState - ScriptObject`: Change state

**Modifier Functions**
- `DamageObject - ObjectReference`: Deal damage to object
- `DamageValue - ObjectReference`: Set damage value
- `AddItem - ObjectReference`: Add to inventory
- `RemoveItem - ObjectReference`: Remove from inventory
- `EquipItem - Actor`: Equip item
- `EquipSpell - Actor`: Equip spell
- `DrawWeapon - Actor`: Draw weapon
- `DropObject - ObjectReference`: Drop item
- `Drop - ObjectReference`: Drop by count

**Movement/Position Functions**
- `MoveTo - ObjectReference`: Move to location
- `SetPosition`: Set XYZ coordinates
- `SetAngle`: Set rotation

**Search/Find Functions**
- `Find - Array`: Search array
- `Find - FormList`: Search form list
- `Find - RefCollectionAlias`: Search ref collection
- `FindAllReferencesOfType - ObjectReference`: Find refs by type
- `FindAllReferencesWithKeyword - ObjectReference`: Find by keyword
- `FindClosestActor - Game`: Nearest actor
- `FindClosestReferenceOfType - Game`: Nearest reference
- `FindRandomActor - Game`: Random actor
- `FindRandomReferenceOfType - Game`: Random reference
- `FindStruct - Array`: Find struct in array

**Array Management Functions**
- `Add - Array`: Append to array
- `Clear - Array`: Empty array
- `Insert - Array`: Insert at index
- `Remove - Array`: Remove from array

---

## Common Function Patterns

### Query Pattern
```papyrus
; Check state, then act
If Actor.IsInCombat()
  Actor.MoveTo(SafeLocation)
EndIf

If ObjectRef.IsLocked()
  Debug.Trace("Door is locked")
EndIf
```

### Get-Modify-Set Pattern
```papyrus
; Retrieve, modify, apply
Int health = Actor.GetHealth()
health = health + 10
Actor.SetHealth(health)
```

### Safe Inventory Pattern
```papyrus
; Use inventory-safe functions only on items
Int count = Item.GetItemCount(SomeForm)
Float weight = Item.GetWeight()

; Avoid functions that modify state
; (use only on equipped items/active refs)
```

### Latent Function Pattern
```papyrus
; Latent function requires wait
Actor.MoveTo(Location)
Utility.Wait(1.0)  ; Wait for move completion

Scene.Start()
Utility.Wait(Scene.GetLength())
```

### Non-Delayed Function Pattern
```papyrus
; Safe for high-frequency calls
While GetDistance(Player) < 100
  DoSomething()
  Utility.Wait(0.1)
EndWhile
```

---

## Best Practices

### 1. Use Non-Delayed Functions in Loops
```papyrus
; Good: Fast queries
While true
  If Actor.IsInCombat()
    HandleCombat()
  EndIf
  Utility.Wait(0.5)
EndWhile

; Avoid: Slow latent functions in tight loops
While true
  Actor.MoveTo(Location)  ; Blocks execution
  Utility.Wait(1.0)
EndWhile
```

### 2. Check Inventory-Safe Functions
```papyrus
; Good: Use on inventory items
Float weight = Item.GetWeight()
Int count = Container.GetItemCount(Item)

; Avoid: Unsafe functions on inventory items
Item.MoveTo(Location)  ; May crash
Item.Enable()          ; May cause issues
```

### 3. Remove Debug Functions Before Release
```papyrus
; Development version
debugOnly Debug.Trace("Debug info")
Debug.MessageBox("Test")

; Compile with -r flag to remove debugOnly
; Compile with -final flag to remove betaOnly
```

### 4. Handle Latent Functions Properly
```papyrus
; Correct
Function DoAsyncMove(Actor akActor, ObjectReference akTarget)
  akActor.MoveTo(akTarget)
  Utility.Wait(1.0)  ; Wait for completion
  DoNextAction()
EndFunction

; Risky
Function BadMove(Actor akActor, ObjectReference akTarget)
  akActor.MoveTo(akTarget)
  DoNextAction()  ; May execute before move completes
EndFunction
```

---

## Related Resources

- **CREATION_KIT_RESOURCES_INDEX.md**: Full Creation Kit resource index
- **PAPYRUS_COMPILER_GUIDE.md**: Compilation reference
- **SCRIPT_FILES_GUIDE.md**: Script file types
- **EXTENDING_SCRIPTS_PAPYRUS_GUIDE.md**: Script inheritance
- **Papyrus Language Reference**: Core language documentation
- **F4SE Documentation**: Extended scripting functions

---

## Quick Function Lookup

### By Purpose

| Purpose | Function Category | Examples |
|---------|-------------------|----------|
| **Get actor data** | Get functions | GetLevel, GetRace, GetFactionRank |
| **Check state** | Is functions | IsInCombat, IsAlerted, IsDead |
| **Modify objects** | Modifier functions | DamageValue, EquipItem, DropObject |
| **Find things** | Search functions | FindClosestActor, Find (Array) |
| **Manage inventory** | Inventory functions | AddItem, RemoveItem, GetItemCount |
| **Move characters** | Movement functions | MoveTo, SetPosition |
| **Animation** | Animation functions | PlayIdle, PlayAnimation |
| **Magic** | Magic functions | DispelSpell, CastSpell, AddSpell |
| **Factions** | Faction functions | GetFactionRank, AddToFaction |
| **Quests** | Quest functions | GetAlias, SetStage, CompleteQuest |
| **Forms** | Form functions | GetForm, GetFormFromFile, HasKeyword |
| **Math** | Math functions | Sqrt, Sin, Cos, Floor, Ceiling |

### By Type

| Type | Total | Key Examples |
|------|-------|--------------|
| **Get functions** | 100+ | GetLevel, GetDistance, GetActorBase |
| **Is functions** | 100+ | IsInCombat, IsLocked, IsEnabled |
| **Set/Modify functions** | 50+ | SetValue, MoveTo, EquipItem |
| **Array functions** | 7 | Add, Clear, Find, Insert |
| **F4SE extensions** | 233 | Plugin detection, advanced features |
| **Debug functions** | 38 | Trace, MessageBox, OpenUserLog |
| **Math functions** | 12+ | Sin, Cos, Sqrt, Pow, Floor |

