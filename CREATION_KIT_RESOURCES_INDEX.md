# Creation Kit Resources Index

## Overview

This is a comprehensive index of Creation Kit documentation and scripting resources archived from the CK Wiki. The Creation Kit is the official modding tool for Fallout 4, enabling creation of mods through the editor interface and Papyrus scripting.

**Archive Status**: Part of the CK Wiki archive project (original wiki sunset in 2021)

**Current Resource Count**: 1,829+ pages (partial listing below due to 500-entry display limit)

---

## Core Creation Kit Guides

### Main Articles
- **Creation Kit**: Primary editor documentation
- **Editor Interface**: Main UI and controls
- **Editor Reference**: Technical reference for editor features
- **Data Window**: Asset and form management
- **Cell View Window**: Cell editing interface
- **Console**: In-game command console
- **CreationKit.ini**: Configuration file reference
- **Creation Kit Keyboard Mapping**: Keyboard shortcuts

### Getting Started
- **Bethesda Basics Tutorial Series**: Introduction tutorials
- **Bethesda Tutorial Papyrus Hello World**: First script tutorial
- **Fallout 4 Basic Quest Tutorial One-Time Setup**: Quest creation setup
- **Fallout 4 Tools**: Available modding tools overview
- **Creating Custom Doors for Fallout 4**: Door creation walkthrough

---

## Papyrus Scripting

### Scripting Guides
- **PAPYRUS_COMPILER_GUIDE.md**: Papyrus compiler reference (see separate guide)
- **SCRIPT_FILES_GUIDE.md**: Script file types and workflow (see separate guide)
- **Extending Scripts (Papyrus)**: Script inheritance and extension
- **Differences from Previous Scripting**: Updates from older versions
- **Differences from Skyrim to Fallout 4**: Migration guide
- **Custom Papyrus Events**: Event creation and handling
- **Actionscript Reference**: Flash/ActionScript reference (UI scripting)

### Script Types & Structure
- **Script File Structure**: Papyrus syntax and file organization
- **Papyrus Projects**: .ppj project file configuration
- **Console Commands (Papyrus)**: Console-accessible commands
- **Expression Reference**: Expression syntax
- **Condition Function**: Conditional logic reference
- **Flag Reference**: Compiler flags and options

### Script Categories

#### Quest & Alias Scripts
- **Quest Script**: Quest event handlers
- **Alias Script**: Quest alias behavior
- **DefaultAliasOnActivate**: Default alias activation
- **DefaultAliasOnAggro**: Combat initiation handler
- **DefaultAliasOnCellLoad**: Cell load handler
- **DefaultAliasOnCombatStateChanged**: Combat state changes
- **DefaultAliasOnContainerChangedFrom**: Item removal
- **DefaultAliasOnContainerChangedTo**: Item addition
- **DefaultAliasOnDeath**: Death events
- **DefaultAliasOnDestructionStateChanged**: Destruction state
- **DefaultAliasOnEnterBleedout**: Bleedout state
- **DefaultAliasOnEquipped**: Item equip
- **DefaultAliasOnHit**: Damage received
- **DefaultAliasOnLoad**: Ref load
- **DefaultAliasOnLockStateChanged**: Lock state
- **DefaultAliasOnRead**: Book read
- **DefaultAliasOnTriggerEnter**: Trigger entry
- **DefaultAliasOnTriggerLeave**: Trigger exit
- **DefaultAliasOnUnequipped**: Item unequip
- **DefaultAliasOnUnload**: Ref unload
- **DefaultAliasPlayerChangeLocation**: Player location change
- **DefaultAliasRespawnScript**: Respawn behavior

#### Actor & NPC Scripts
- **Actor Script**: Character behavior and data
- **ActorBase Script**: NPC base record
- **ActorValue Script**: Character attributes (Health, Stamina, etc.)
- **Actor Action**: Animation and action states
- **ChangeAnimArchetype**: Animation swapping
- **ChangeAnimFaceArchetype**: Facial animation
- **ChangeAnimFlavor**: Animation variant selection
- **ChangeHeadPart**: Head/hair changes
- **AllowBleedoutDialogue**: Bleedout interaction
- **AllowCompanion**: Follower permission
- **AllowPCDialogue**: Player dialogue options
- **CanFlyHere**: Flight validation
- **CanPayCrimeGold**: Crime payment check
- **ClearArrested**: Arrest state clearing
- **ClearExpressionOverride**: Reset expressions
- **ClearLookAt**: Clear look target
- **ClearForcedLandingMarker**: Clear forced landing
- **AttachAshPile**: Ash pile attachment
- **AttemptAnimationSetSwitch**: Animation set changes
- **DisallowCompanion**: Disallow follower role
- **Dismember**: Limb severing
- **Dismount**: Dismounting action
- **DrawWeapon**: Weapon drawing
- **DogDropItems**: Canine item dropping
- **DogPlaceInMouth**: Canine mouth placement
- **FollowerFollow**: Follower behavior
- **FollowerSetDistanceFar**: Follower distance (far)
- **FollowerSetDistanceMedium**: Follower distance (medium)
- **FollowerSetDistanceNear**: Follower distance (near)
- **FollowerWait**: Follower waiting
- **EnableAI**: AI toggle
- **EvaluatePackage**: Package evaluation
- **GetActorBase**: Get base NPC
- **GetActorGunState**: Gun readiness state
- **GetActorOwner**: Get owner
- **GetActorRefOwner**: Get owning ref
- **GetAllCombatTargets**: Combat targets list
- **GetAnimationVariableBool**: Animation var (bool)
- **GetAnimationVariableFloat**: Animation var (float)
- **GetAnimationVariableInt**: Animation var (int)
- **GetBribeAmount**: Bribe cost
- **GetCharismaAV**: Charisma attribute
- **GetClass**: Actor class
- **GetCombatState**: Current combat state
- **GetCombatTarget**: Primary target
- **GetConfidenceAV**: Confidence attribute
- **GetCrimeFaction**: Crime faction
- **GetCrimeGold**: Crime bounty amount
- **GetCrimeGoldNonViolent**: Non-violent crime bounty
- **GetCrimeGoldViolent**: Violent crime bounty
- **GetHeadParts**: Head part list
- **GetBodyWeight**: Body weight value

#### Object & Reference Scripts
- **ObjectReference Script**: Base object behavior
- **Editor Reference**: Reference editing
- **Activator Script**: Activator behavior
- **Activator**: Activatable object
- **Door Script**: Door behavior
- **Door**: Enterable door
- **Container Script**: Container behavior
- **Container**: Item container
- **Furniture Script**: Furniture behavior
- **Furniture**: Usable furniture
- **Flora Script**: Plant/flora behavior
- **Flora**: Plant/flora object
- **Armor Script**: Armor properties
- **Armor**: Wearable armor
- **Ammo Script**: Ammunition properties
- **Ammo**: Projectile ammunition
- **Weapon**: Melee/ranged weapon
- **Book Script**: Book properties
- **Book**: Readable book
- **AnimObject**: Animated object
- **Art Object**: Decorative art
- **Explosion Script**: Explosion behavior
- **Explosion**: Explosive effect

#### Advanced Reference Operations
- **Activate - ObjectReference**: Activation trigger
- **AddInventoryEventFilter - ScriptObject**: Inventory event filtering
- **AddItem - ObjectReference**: Add item to container
- **AddKeyword - ObjectReference**: Keyword assignment
- **AddKeyIfNeeded - ObjectReference**: Conditional key adding
- **AddRefCollection - RefCollectionAlias**: Alias collection
- **AddRef - RefCollectionAlias**: Add to alias collection
- **AddTextReplacementData - ObjectReference**: Text replacement
- **ApplyConveyorBelt - ObjectReference**: Conveyor belt physics
- **ApplyFanMotor - ObjectReference**: Fan motor animation
- **ApplyHavokImpulse - ObjectReference**: Physics impulse
- **ApplyMaterialSwap - ObjectReference**: Material replacement
- **AttachModToInventoryItem - ObjectReference**: Mod attachment
- **AttachMod - ObjectReference**: Equipment mod
- **AttachPapyrusScript**: Script attachment
- **AttachTo - ObjectReference**: Parenting/attachment
- **AttachWire - ObjectReference**: Wire attachment
- **BlockActivation - ObjectReference**: Activation blocking
- **BlockActivation - RefCollectionAlias**: Alias activation blocking
- **CalculateEncounterLevel - ObjectReference**: Encounter level calc
- **CanFastTravelToMarker - ObjectReference**: Fast travel validation
- **CanProduceForWorkshop - ObjectReference**: Workshop production
- **CancelTimerGameTime - ScriptObject**: Game time timer cancel
- **CancelTimer - ScriptObject**: Real time timer cancel
- **CastAs - ScriptObject**: Type casting
- **ClearDestruction - ObjectReference**: Destruction reset
- **ConveyorBeltOn - ObjectReference**: Conveyor activation
- **CountActorsLinkedToMe - ObjectReference**: Linked actor count
- **CountLinkedRefChain - ObjectReference**: Chain ref count
- **CountRefsLinkedToMe - ObjectReference**: Linked ref count
- **CreateDetectionEvent - ObjectReference**: Detection trigger
- **CreateWire - ObjectReference**: Wire creation
- **DamageObject - ObjectReference**: Object damage
- **DamageValue - ObjectReference**: Damage value setting
- **DeleteWhenAble - ObjectReference**: Deferred deletion
- **Delete - ObjectReference**: Delete reference
- **DisableLinkChain - ObjectReference**: Disable linked chain
- **DisableNoWait - ObjectReference**: Async disable
- **Disable - ObjectReference**: Disable reference
- **DropFirstObject - ObjectReference**: Drop first item
- **DropObject - ObjectReference**: Drop item
- **Drop - ObjectReference**: Drop by count
- **EnableAmbientParticles - Weather**: Ambient particles toggle
- **EnableDetection - Debug**: Detection toggling
- **EnableFastTravel - Cell**: Cell fast travel
- **EnableFastTravel - ObjectReference**: Ref fast travel
- **EnableLinkChain - ObjectReference**: Enable linked chain
- **EnableNoWait - ObjectReference**: Async enable
- **Enable - ObjectReference**: Enable reference
- **FindAllReferencesOfType - ObjectReference**: Find refs by type
- **FindAllReferencesWithKeyword - ObjectReference**: Find refs by keyword
- **FindClosestReferenceOfAnyTypeInListFromRef - Game**: Nearest ref in list
- **FindClosestReferenceOfTypeFromRef - Game**: Nearest typed ref
- **FindClosestReferenceOfType - Game**: Find closest type
- **ForceAddRagdollToWorld - ObjectReference**: Ragdoll physics
- **ForceRemoveRagdollFromWorld - ObjectReference**: Remove ragdoll
- **GetActorsLinkedToMe - ObjectReference**: Linked actors list
- **GetAngleX - ObjectReference**: Rotation X axis
- **GetAngleY - ObjectReference**: Rotation Y axis
- **GetAngleZ - ObjectReference**: Rotation Z axis
- **GetBaseObject - ObjectReference**: Base form lookup
- **GetContainer - ObjectReference**: Parent container
- **GetConnectPoints - ObjectReference**: Connection points
- **GetConnectedObjects - ObjectReference**: Connected objects

#### Magic & Effects
- **ActiveMagicEffect Script**: Active magic behavior
- **MagicEffect**: Spell/potion effect
- **Enchantment Script**: Enchantment behavior
- **Enchantment**: Item enchantment
- **Spell**: Castable spell
- **DispelAllSpells - Actor**: Remove all spells
- **DispelSpell - Actor**: Remove single spell
- **Dispel - ActiveMagicEffect**: Dispel magic effect
- **DoCombatSpellApply - Actor**: Combat spell casting
- **Cast - Spell**: Cast spell
- **Cast - Scroll**: Cast from scroll
- **GetBaseObject - ActiveMagicEffect**: Get effect form
- **GetCasterActor - ActiveMagicEffect**: Get caster
- **GetAssociatedSkill - MagicEffect**: Effect skill link
- **AddSpell - Actor**: Add spell to actor
- **CastAs - ScriptObject**: Type cast
- **CallFunction - ScriptObject**: Function invocation
- **CallFunctionNoWait - ScriptObject**: Async function call

#### Inventory & Items
- **AddForm - FormList**: Add to form list
- **AddForm - LeveledActor**: Add to leveled actor
- **AddForm - LeveledItem**: Add to leveled item
- **AddForm - LeveledSpell**: Add to leveled spell
- **AddItem - ObjectReference**: Add inventory item
- **EquipItem - Actor**: Equip item
- **EquipSlot Script**: Equipment slot
- **EquipSpell - Actor**: Equip spell
- **AttachModToInventoryItem - ObjectReference**: Inventory mod
- **DropObject - ObjectReference**: Drop from inventory
- **Fire - Weapon**: Fire weapon
- **GetAmmo - InstanceData**: Get ammo type
- **GetAmmo - Weapon**: Get equipped ammo
- **GetBaseObject - ObjectReference**: Get item base
- **GetCount - RefCollectionAlias**: Collection count
- **GetContainer - ObjectReference**: Container owner
- **RemoveAllItems - ObjectReference**: Clear inventory
- **RemoveItem - ObjectReference**: Remove item

#### Factions & Crimes
- **Faction Script**: Faction behavior
- **AddToFaction - Actor**: Add to faction
- **AddToFaction - RefCollectionAlias**: Alias faction add
- **GetCrimeFaction - Actor**: Crime faction lookup
- **GetCrimeGold - Faction**: Crime bounty
- **CanPayCrimeGold - Faction**: Crime payment check
- **ClearPrison - Game**: Prison clearing
- **ClearArrested - Actor**: Arrest clearing

#### Locations & Cells
- **Location**: Worldspace location
- **Cell Script**: Cell behavior
- **Cell**: Indoor/outdoor cell
- **Acoustic Space**: Audio space definition
- **AddLinkedLocation - Location**: Link locations
- **GetAllLinkedLocations - Location**: Get location links
- **CanFastTravelToMarker - ObjectReference**: Travel check
- **EnableFastTravel - Cell**: Fast travel toggle
- **ForceLocationTo - LocationAlias**: Force location alias
- **GetActorOwner - Cell**: Cell owner
- **GetActorOwner - ObjectReference**: Ref owner lookup

#### Quests & Scenes
- **Quest**: Quest form
- **Quest Script**: Quest behavior
- **Scene**: Dialogue/action scene
- **ForceStart - Scene**: Force scene playback
- **CompleteAllObjectives - Quest**: Mark all complete
- **CompleteQuest - Quest**: Complete quest
- **FailAllObjectives - Quest**: Mark all failed
- **CallQuestFunction**: Call quest function
- **GetAlias - Quest**: Get quest alias
- **DefaultStartQuestOnTriggerEnter**: Quest start trigger
- **DefaultTopicInfoSetStage**: Topic stage setting

#### Dialogue & Messages
- **Message**: Game message/notification
- **ClearHelpMessages - Message**: Clear help popups
- **CloseUserLog - Debug**: Close debug log
- **OpenUserLog - Debug**: Open debug log
- **PrintConsole - Debug**: Console output
- **Notification**: HUD notification
- **MessageBox**: Modal dialog box
- **Topic**: Dialogue topic
- **Add - Topic**: Add dialogue entry

#### UI & Input
- **UI**: User interface control
- **InputEnableLayer**: Input state management
- **CloseMenu - UI**: Menu closing
- **Create - InputEnableLayer**: Create input layer
- **Delete - InputEnableLayer**: Delete input layer
- **DisablePlayerControls - InputEnableLayer**: Disable controls
- **EnableActivate - InputEnableLayer**: Enable activation
- **EnableAll - RefCollectionAlias**: Enable all refs
- **EnableCamSwitch - InputEnableLayer**: Enable camera switch
- **EnableCollisions - Debug**: Collision toggle
- **EnableFastTravel - InputEnableLayer**: Enable fast travel
- **EnableFavorites - InputEnableLayer**: Enable favorites menu
- **EnableFighting - InputEnableLayer**: Enable combat
- **EnableJournal - InputEnableLayer**: Enable journal
- **EnableJumping - InputEnableLayer**: Enable jumping
- **EnableLooking - InputEnableLayer**: Enable look around
- **EnableMenu - InputEnableLayer**: Enable menu button
- **EnableMovement - InputEnableLayer**: Enable movement
- **EnablePlayerControls - InputEnableLayer**: Enable all controls
- **EnableRunning - InputEnableLayer**: Enable running
- **EnableSneaking - InputEnableLayer**: Enable sneak
- **EnableSprinting - InputEnableLayer**: Enable sprint
- **EnableVATS - InputEnableLayer**: Enable VATS
- **EnableZKey - InputEnableLayer**: Enable Z key
- **ContainerMenu**: Container interface
- **CreditsMenu**: Credits display
- **ExamineMenu**: Examination menu
- **FavoritesMenu**: Favorites interface
- **FaderMenu**: Screen fade control

#### Utility & Math
- **Utility**: Utility functions
- **Math**: Math functions
- **Abs - Math**: Absolute value
- **Acos - Math**: Arc cosine
- **Asin - Math**: Arc sine
- **Atan - Math**: Arc tangent
- **Ceiling - Math**: Ceiling function
- **Cos - Math**: Cosine
- **DegreesToRadians - Math**: Angle conversion
- **Exp - Math**: Exponential
- **Floor - Math**: Floor function
- **Log - Math**: Natural logarithm
- **Pow - Math**: Power function
- **Sin - Math**: Sine
- **Sqrt - Math**: Square root
- **Tan - Math**: Tangent
- **CallGlobalFunction - Utility**: Global function call
- **CallGlobalFunctionNoWait - Utility**: Async global call
- **GameTimeToString - Utility**: Game time formatting
- **GetRandomInt - Utility**: Random integer
- **GetRandomFloat - Utility**: Random float
- **Wait - Utility**: Delay/wait function
- **WaitMenuMode - Utility**: Menu mode wait

#### Arrays
- **Array Reference**: Array syntax
- **Arrays (Papyrus)**: Array usage
- **CommonArrayFunctions Script**: Array utilities
- **Add - Array**: Array append
- **Clear - Array**: Clear array
- **Find - Array**: Search array
- **FindInReferenceAliasArray - CommonArrayFunctions**: Find in alias array
- **FindStruct - Array**: Search for struct
- **CheckFormAgainstArray - CommonArrayFunctions**: Form in array
- **CheckActorAgainstFactionArray - CommonArrayFunctions**: Actor faction check
- **CheckLocationAgainstArray - CommonArrayFunctions**: Location in array
- **CheckLocationAgainstLocationAliasArray - CommonArrayFunctions**: Alias location check
- **CheckObjectAgainstKeywordArray - CommonArrayFunctions**: Keyword in array
- **CheckObjectReferenceAgainstArray - CommonArrayFunctions**: Ref in array
- **CheckObjectReferenceAgainstReferenceAliasArray - CommonArrayFunctions**: Ref alias check

#### Events & Handlers
- **Events Reference**: Event list
- **Custom Papyrus Events**: Custom event creation
- **DumpEventRegistrations - Debug**: Event debug info
- **DumpAliasData - Debug**: Alias debug info
- **DumpPapyrusDistanceEvents**: Distance events debug
- **DumpPapyrusEventRegistrations**: All event registrations
- **DumpPapyrusLOSEvents**: Line of sight events
- **DumpPapyrusPersistenceInfo**: Persistence debug
- **DumpPapyrusStacks**: Stack trace debug
- **DumpPapyrusTimers**: Active timers debug

#### Game Systems
- **Game Script**: Game global functions
- **Weather Script**: Weather behavior
- **Weather**: Weather form
- **AddAchievement - Game**: Achievement unlock
- **AddPerkPoints - Game**: Perk point award
- **AddPerk - Actor**: Perk assignment
- **AdvanceSkill - Game**: Skill advancement
- **ClearPrison - Game**: Prison state clear
- **ClearTempEffects - Game**: Temp effect clearing
- **Error - Game**: Error logging
- **FadeOutGame - Game**: Fade to black
- **FastTravel - Game**: Fast travel player
- **FindClosestActorFromRef - Game**: Nearest actor
- **FindClosestActor - Game**: Closest actor global
- **FindClosestReferenceOfAnyTypeInListFromRef - Game**: Nearest in type list
- **FindClosestReferenceOfAnyTypeInList - Game**: Global nearest list
- **FindClosestReferenceOfTypeFromRef - Game**: Nearest typed ref
- **FindClosestReferenceOfType - Game**: Global nearest type
- **FindRandomActorFromRef - Game**: Random actor from ref
- **FindRandomActor - Game**: Random actor global
- **FindRandomReferenceOfAnyTypeInListFromRef - Game**: Random in type list
- **FindRandomReferenceOfAnyTypeInList - Game**: Global random list
- **FindRandomReferenceOfTypeFromRef - Game**: Random typed ref
- **FindRandomReferenceOfType - Game**: Global random type
- **GetAggressionAV - Game**: Aggression attribute
- **GetAgilityAV - Game**: Agility attribute
- **GetCaps - Game**: Caps count
- **GetConfigName - Debug**: Config name
- **ForceDisableSSRGodraysDirLight - Game**: Disable screen space reflection
- **ForceFirstPerson - Game**: First person camera
- **ForceThirdPerson - Game**: Third person camera
- **EnablePipboyHDRMask - Game**: PipBoy HDR effects
- **EnableMenus - Debug**: Menu state debug

#### Workshop & Construction
- **CanProduceForWorkshop - ObjectReference**: Workshop production
- **ConstructibleObject Script**: Constructible item
- **ConstructibleObject**: Craft recipe

#### Forms & Data
- **Form**: Base form
- **Form Script**: Form base script
- **FormList Script**: Form list
- **FormList**: Form container list
- **ColorForm**: Color form definition
- **DamageType**: Damage type definition
- **EquipSlot**: Equipment slot definition
- **Association Type**: Association between forms
- **AssociationType Script**: Association behavior
- **AttractionRule**: NPC attraction rule
- **BodyPartData**: Body part definition
- **BodyWeight Struct - ActorBase**: Weight multiplier
- **Component**: Item component
- **Component Script**: Component behavior
- **ConstructibleComponent Struct - ConstructibleObject**: Craft ingredient
- **ConnectPoint Struct - ObjectReference**: Connection point
- **DamageTypeInfo Struct - InstanceData**: Damage info
- **Data File**: Game data file
- **Default Value Reference**: Default values

#### Instance Data (Dynamic Item Properties)
- **InstanceData**: Dynamic item properties
- **GetAccuracyBonus - InstanceData**: Weapon accuracy
- **GetActionPointCost - InstanceData**: AP cost
- **GetAmmoCapacity - InstanceData**: Magazine size
- **GetAmmo - InstanceData**: Ammo type
- **GetArmorHealth - InstanceData**: Current armor health
- **GetArmorRating - InstanceData**: Armor rating value
- **GetAttackDamage - InstanceData**: Damage value
- **GetAttackDelay - InstanceData**: Attack speed
- **GetComponentCount - ObjectReference**: Component count
- **GetConstructibleComponents - ConstructibleObject**: Recipe components
- **GetConsumeSpell - WaterType**: Consumption spell
- **GetContactSpell - WaterType**: Contact spell
- **GetCritChargeBonus - InstanceData**: Crit charge bonus
- **GetCritMultiplier - InstanceData**: Crit multiplier

#### Animation & Assets
- **AnimObject**: Animated object
- **Animation Tag Set**: Animation tags
- **AimModel**: Aiming model
- **BendableSpline**: Deformable spline
- **Biped Slots**: Character slots
- **Atom**: Atom element
- **Editor Smoke**: Smoke effect

#### Image & Rendering
- **ImageSpaceModifier**: Screen effect
- **ApplyCrossFade - ImageSpaceModifier**: Fade effect
- **Apply - ImageSpaceModifier**: Apply image effect
- **Cubemap**: Cube map texture
- **Diffuse Map**: Diffuse texture
- **EffectShader Script**: Effect shader behavior
- **EffectShader**: Visual shader effect
- **Effect Item**: Effect in chain
- **Effect Chain**: Chain of effects
- **ShaderParticleGeometry**: Particle visual
- **Apply - ShaderParticleGeometry**: Shader particle apply

#### Audio
- **Music Type**: Music track type
- **Add - MusicType**: Add track to type

#### Default Scripts (Template Behaviors)
- **Default Scripts**: Built-in script templates
- **DefaultObject**: Default form assignment
- **DefaultObject Script**: Default form behavior
- **Default1StateActivator**: Single-state activator
- **Default2StateActivator**: Two-state activator
- **DefaultActivateLinkedRefOnActivate**: Link activation
- **DefaultActivateSelf**: Self-activation
- **DefaultAddItemOnLoad**: Add item behavior
- **DefaultBlockFollowerActivation**: Follower blocking
- **DefaultCounter**: Increment counter
- **DefaultCounterAliasIncOnceOnActivateA/B/C**: Counter increment variants
- **DefaultCounterIncrementOnDeath**: Death counter
- **DefaultCounterIncrementOnceOnActivate**: One-time activation counter
- **DefaultCounterQuestA/B/C**: Quest counter variants
- **DefaultCrippleOnLoad**: Cripple on load
- **DefaultDisableHavokOnLoad**: Disable physics
- **DefaultEmptyInvIntoLinkOnLoad**: Empty inventory
- **DefaultEnableDisableTrigScript**: Trigger toggle
- **DefaultEnableDisableTrigger**: Enable/disable container
- **DefaultMoveToEditorLocationOnLoad**: Load position
- **DefaultQuestRespawnScript**: Respawn behavior
- **DefaultRefOnActivate**: Activation handler
- **DefaultRefOnCellDetach**: Cell detach handler
- **DefaultRefOnCellLoad**: Cell load handler
- **DefaultRefOnCombatStateChanged**: Combat state handler
- **DefaultRefOnContainerChangedFrom**: Remove handler
- **DefaultRefOnContainerChangedTo**: Add handler
- **DefaultRefOnDeath**: Death handler
- **DefaultRefOnDestructionStateChanged**: Destruction handler
- **DefaultRefOnEnterBleedout**: Bleedout handler
- **DefaultRefOnEquipped**: Equip handler
- **DefaultRefOnHit**: Hit handler
- **DefaultRefOnLoad**: Load handler
- **DefaultRefOnLockStateChanged**: Lock handler
- **DefaultRefOnRead**: Read handler
- **DefaultRefOnTriggerEnter**: Trigger enter handler
- **DefaultRefOnTriggerLeave**: Trigger exit handler
- **DefaultRefOnUnequipped**: Unequip handler
- **DefaultRefOnUnload**: Unload handler
- **DefaultSetAVOnCellLoad**: Set attribute value
- **DefaultSetAVTrig**: AV trigger behavior
- **DefaultSetAVTrigScript**: AV trigger script
- **DefaultSetGlobalOnTriggerEnter**: Set global variable
- **DefaultSetGlobalOnTriggerLeave**: Clear global variable
- **DefaultSetWeatherWhileInTriggerScript**: Weather in trigger
- **DefaultShowMessageOnActivateAlias**: Show message (alias)
- **DefaultShowMessageOnActivateRef**: Show message (ref)
- **DefaultStartQuestOnTriggerEnter**: Quest start trigger
- **DefaultStartQuestTrigger**: Quest trigger container
- **DefaultTopicInfoSetStage**: Topic stage handler
- **DefaultUnlockLinkOnActivate**: Unlock linked ref

---

## External Tools & Formats

### 3D Modeling
- **3ds Max - NifTools Plugin**: NifTools for 3ds Max
- **Autodesk 3ds Max**: Professional 3D modeling
- **Blender**: Free 3D modeling (not officially supported)
- **FBX Export from Editor**: Export models to FBX format

### Texture & Image Editing
- **Adobe Photoshop**: Professional image editor
- **Adobe Illustrator**: Vector graphics editor
- **NVIDIA Canvas**: AI-assisted painting (see NVIDIA_CANVAS_SETUP.md)

### File Formats & Archives
- **Archive2**: Version 2 archive format
- **Archive File**: General archive information
- **Bethesda Archive Extractor**: Extract BA2/BSA files
- **Data File**: Game data file format

### UI & Web
- **Adobe Flash**: Flash-based UI (deprecated)
- **Button Tag Replacement**: UI tag system
- **Bethesda Login Window**: Login UI
- **DirectX Scan Codes**: Keyboard input codes

### Miscellaneous
- **Dark Face Bug**: Common NPC face issue
- **Editor Smoke**: Smoke visual effect
- **Elric**: Character reference
- **Class**: Script base class

---

## Related Documentation

### Creation Kit Guides (In This Workspace)
- **PAPYRUS_COMPILER_GUIDE.md**: Papyrus compiler command-line reference
- **SCRIPT_FILES_GUIDE.md**: Script file types (.psc, .pex, .ppj, .log) and workflows
- **BLENDER_TRANSFORM_OPERATORS_GUIDE.md**: Blender Edit Mode operators (for asset creation)

### Fallout 4 Modding Resources
- **Creation Kit**: Main editor tool
- **F4SE**: Fallout 4 Script Extender (extends scripting capabilities)
- **F4SE Script**: F4SE script extensions
- **Fallout 4 Tools**: Modding tools overview

### Game-Specific References
- **Game Settings (Papyrus)**: Gamesettings function reference
- **Condition Function**: Condition function reference
- **Collision Layer**: Collision setup
- **Climate**: Weather climate definition
- **EncounterZone**: Dynamic encounter level
- **EncounterZone Script**: Encounter behavior

---

## Resource Access

**Archive Project**: These resources are part of the CK Wiki archive effort to preserve documentation after the wiki's sunset in 2021.

**Current Status**: 1,829+ pages available (1,500+ entries listed; display limit of 500 entries per page applies).

**Related Pages**:
- Resource:Creation Kit (main archive hub)
- Papyrus Compiler Error (error reference)
- Papyrus Projects (build configuration)
- Script File Structure (Papyrus syntax)

---

## Getting Started Path

**Beginner**:
1. Start with **Bethesda Basics Tutorial Series**
2. Review **Editor Interface** guide
3. Complete **Bethesda Tutorial Papyrus Hello World**
4. Review **SCRIPT_FILES_GUIDE.md** for file organization

**Intermediate**:
5. Study **Quest Script** and **Alias Script** examples
6. Review **Events Reference** and **Condition Function**
7. Explore **Papyrus Projects** for build setup
8. Practice with **Actor Script** and **ObjectReference Script**

**Advanced**:
9. Study **Extending Scripts (Papyrus)** for inheritance
10. Review **Custom Papyrus Events** for event creation
11. Explore **CommonArrayFunctions** for data structures
12. Use **Papyrus Profile Analyzer** for optimization

**Asset Creation**:
- Use **3ds Max - NifTools Plugin** or **Blender** for 3D models
- Review **FBX Export from Editor** for model export
- Use **Adobe Photoshop**/**NVIDIA Canvas** for textures

---

## Quick Navigation by Category

| Category | Key Resources |
|----------|---|
| **Scripting** | Quest Script, Actor Script, ObjectReference Script, Events Reference |
| **Compilation** | PAPYRUS_COMPILER_GUIDE.md, Papyrus Projects, SCRIPT_FILES_GUIDE.md |
| **Quests** | Quest Script, Alias Script, Scene, Condition Function |
| **Actors** | Actor Script, ActorBase Script, Combat handling scripts |
| **Objects** | ObjectReference Script, Container Script, Furniture Script |
| **Magic** | MagicEffect, Spell, Enchantment Script, ActiveMagicEffect Script |
| **UI** | InputEnableLayer, ContainerMenu, Message, UI |
| **Math** | Math functions (Sin, Cos, Sqrt, etc.) |
| **Utilities** | Utility functions, CommonArrayFunctions, Debug |
| **3D Assets** | 3ds Max, Blender, FBX Export, NifTools |
| **Textures** | Adobe Photoshop, NVIDIA Canvas |
| **Tools** | Creation Kit, F4SE, Bethesda Archive Extractor |

