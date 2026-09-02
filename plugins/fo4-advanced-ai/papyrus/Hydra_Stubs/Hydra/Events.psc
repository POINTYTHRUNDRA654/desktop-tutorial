Scriptname Hydra:Events Const Hidden Native

;/
	Provides an interface for receiving game-related events.

	Notes:
	- Each event requires a function reference to specify whether the callback function is local or global.
	- Calling `RegisterFor*` on an already registered event will do nothing and return `false`.
	- The `abPersistent` parameter determines whether the event is stored is saves (`true`)
	  or whether it only persists until the next game load (`false`).
	- All local events will be automatically unregistered once their parent object is deleted.
	- The `Var[]` filters support the following types:
	  - form types (string)
	  - plugin names (string)
	  - references
	  - base objects
	  - keywords
	  - factions
	  - races
	  - form lists (recursive)
	- For a list of all form types,
	  see: https://github.com/libxse/commonlibf4/blob/main/include/RE/E/ENUM_FORM_ID.h.

	Included Events:
	- "OnUserEvent"
	- "OnDeleteGame"
	- "OnNewGame"
	- "OnPostLoadGame"
	- "OnPostSaveGame"
	- "OnStartGame"
	- "OnActiveEffectApplyRemove"
	- "OnActorDeath"
	- "OnAIPackageChange"
	- "OnCombatStateChange"
	- "OnFurnitureEnterExit"
	- "OnItemEquipUnequip"
	- "OnLifeStateChange"
	- "OnLimbCripple"
	- "OnLocationEnterExit"
	- "OnActorValueChange"
	- "OnAnimationGraphEvent"
	- "OnDestructionStageChange"
	- "OnDialogueTopicChange"
	- "OnFormDelete"
	- "OnFormIdChange"
	- "OnItemAddRemove"
	- "OnObjectActivate"
	- "OnObjectGrabRelease"
	- "OnObjectHarvest"
	- "OnObjectHit"
	- "OnObjectLoadUnload"
	- "OnObjectOpenClose"
	- "OnObjectReset"
	- "OnObjectSell"
	- "OnSpellCast"
	- "OnTriggerEnterLeave"
	- "OnBookRead"
	- "OnButtonUpDown"
	- "OnCellAttachDetach"
	- "OnCellEnterExit"
	- "OnCellLoad"
	- "OnCrosshairRefChange"
	- "OnDialogueTargetChange"
	- "OnDifficultyChange"
	- "OnHudColorUpdate"
	- "OnLevelIncrease"
	- "OnLocationLoad"
	- "OnLockPick"
	- "OnMenuModeEnterExit"
	- "OnMenuOpenClose"
	- "OnMiscStatChange"
	- "OnPerkEntryRun"
	- "OnPerkPointIncrease"
	- "OnPipBoyLightChange"
	- "OnPowerArmorLightChange"
	- "OnQuestObjectiveChange"
	- "OnQuestStageChange"
	- "OnQuestStartStop"
	- "OnSceneActionChange"
	- "OnScenePhaseChange"
	- "OnSceneStartStop"
	- "OnSleepStartStop"
	- "OnTerminalHack"
	- "OnTerminalMenuItemRun"
	- "OnTutorialTrigger"
	- "OnWaitStartStop"

	Script Example:
	```
	Scriptname MyNamespace:MyScript

	Function OnGameLoad()
		Var[] kIncludedTargetRefs = new Var[1]
		kIncludedTargetRefs[0] = "NPC_" ; matches any form of type actor or actor base

		Hydra:Events:CrosshairRefChangeArgs kCrosshairRefChangeArgs = new Hydra:Events:CrosshairRefChangeArgs
		kCrosshairRefChangeArgs.kIncludedTargetRefs = kIncludedTargetRefs

		Hydra:Events.RegisterForCrosshairRefChange( \
			Hydra:FunctionRefs.CreateGlobalRef(self, "OnLocalCrosshairRefChange"), kCrosshairRefChangeArgs)

		Hydra:Events.RegisterForCrosshairRefChange( \
			Hydra:FunctionRefs.CreateGlobalRef(Hydra:ScriptStruct.GetCurrentScriptName(), "OnGlobalCrosshairRefChange"), kCrosshairRefChangeArgs)
	EndFunction

	Function OnLocalCrosshairRefChange(Hydra:Events:CrosshairRefChangeParams akEvent)
		; ...
	EndFunction

	Function OnGlobalCrosshairRefChange(Hydra:Events:CrosshairRefChangeParams akEvent) Global
		; ...
	EndFunction
	```
/;

Import Hydra:Colors
Import Hydra:FunctionRefs

bool Function IsPersistent(FunctionRef akFunctionRef) Global Native
bool Function IsRegisteredForAny(FunctionRef akFunctionRef) Global Native

bool Function UnregisterForAny(FunctionRef akFunctionRef) Global Native
bool Function UnregisterForAllLocal(ScriptObject akObject) Global Native
bool Function UnregisterForAllGlobal(string asScriptName) Global Native


;/
	Callback Signature:

	```
	Function OnUserEvent(Hydra:Events:UserEventParams akEvent)
	EndFunction
	```

	Applied Callback Signature:

	```
	Function OnUserEvent(string asEventName, args...)
	EndFunction
	```
/;

Struct UserEventArgs
	string[] kIncludedEventNames
	string[] kExcludedEventNames
EndStruct

Struct UserEventParams
	string sEventName
	Var[] kArgs
EndStruct

bool Function IsRegisteredForUserEvent(FunctionRef akFunctionRef) Global Native
bool Function RegisterForUserEvent(FunctionRef akFunctionRef, UserEventArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForUserEvent(FunctionRef akFunctionRef) Global Native

bool Function SendUserEvent(string asEventName, Var[] akArgs = none) Global Native
bool Function SendAppliedUserEvent(string asEventName, Var[] akArgs = none) Global Native


;/
	Callback Signature:

	```
	Function OnDeleteGame(Hydra:Events:DeleteGameParams akEvent)
	EndFunction
	```
/;

Struct DeleteGameArgs
	int iEmptyStruct
EndStruct

Struct DeleteGameParams
	string sSaveName
EndStruct

bool Function IsRegisteredForDeleteGame(FunctionRef akFunctionRef) Global Native
bool Function RegisterForDeleteGame(FunctionRef akFunctionRef, DeleteGameArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForDeleteGame(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnNewGame(Hydra:Events:NewGameParams akEvent)
	EndFunction
	```
/;

Struct NewGameArgs
	int iEmptyStruct
EndStruct

Struct NewGameParams
	Quest kCharGenQuest
EndStruct

bool Function IsRegisteredForNewGame(FunctionRef akFunctionRef) Global Native
bool Function RegisterForNewGame(FunctionRef akFunctionRef, NewGameArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForNewGame(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnPostLoadGame(Hydra:Events:PostLoadGameParams akEvent)
	EndFunction
	```
/;

Struct PostLoadGameArgs
	int iEmptyStruct
EndStruct

Struct PostLoadGameParams
	bool bSucceeded
EndStruct

bool Function IsRegisteredForPostLoadGame(FunctionRef akFunctionRef) Global Native
bool Function RegisterForPostLoadGame(FunctionRef akFunctionRef, PostLoadGameArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForPostLoadGame(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnPostSaveGame(Hydra:Events:PostSaveGameParams akEvent)
	EndFunction
	```
/;

Struct PostSaveGameArgs
	int iEmptyStruct
EndStruct

Struct PostSaveGameParams
	string sSaveName
EndStruct

bool Function IsRegisteredForPostSaveGame(FunctionRef akFunctionRef) Global Native
bool Function RegisterForPostSaveGame(FunctionRef akFunctionRef, PostSaveGameArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForPostSaveGame(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnStartGame(Hydra:Events:StartGameParams akEvent)
	EndFunction
	```
/;

Struct StartGameArgs
	int iEmptyStruct
EndStruct

Struct StartGameParams
	bool bSucceeded
EndStruct

bool Function IsRegisteredForStartGame(FunctionRef akFunctionRef) Global Native
bool Function RegisterForStartGame(FunctionRef akFunctionRef, StartGameArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForStartGame(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `kSourceActor` field may be `none` if the effect did not originate from an actor.

	Callback Signature:

	```
	Function OnActiveEffectApplyRemove(Hydra:Events:ActiveEffectApplyRemoveParams akEvent)
	EndFunction
	```
/;

Struct ActiveEffectApplyRemoveArgs
	Var[] kIncludedSourceActors
	Var[] kExcludedSourceActors
	Var[] kIncludedTargetActors
	Var[] kExcludedTargetActors
	Var[] kIncludedBaseEffects
	Var[] kExcludedBaseEffects
EndStruct

Struct ActiveEffectApplyRemoveParams
	Actor kSourceActor
	Actor kTargetActor
	ActiveMagicEffect kActiveEffect
	MagicEffect kBaseEffect
	bool bApplied
EndStruct

bool Function IsRegisteredForActiveEffectApplyRemove(FunctionRef akFunctionRef) Global Native
bool Function RegisterForActiveEffectApplyRemove(FunctionRef akFunctionRef, ActiveEffectApplyRemoveArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForActiveEffectApplyRemove(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `kSourceActor` field may be `none` if the death is of unknown origin.
	- The `bIsDead` field is set to `true` if the target died and `false` if they are dying.

	Callback Signature:

	```
	Function OnActorDeath(Hydra:Events:ActorDeathParams akEvent)
	EndFunction
	```
/;

Struct ActorDeathArgs
	Var[] kIncludedSourceActors
	Var[] kExcludedSourceActors
	Var[] kIncludedTargetActors
	Var[] kExcludedTargetActors
EndStruct

Struct ActorDeathParams
	Actor kSourceActor
	Actor kTargetActor
	bool bDied
EndStruct

bool Function IsRegisteredForActorDeath(FunctionRef akFunctionRef) Global Native
bool Function RegisterForActorDeath(FunctionRef akFunctionRef, ActorDeathArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForActorDeath(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnAIPackageChange(Hydra:Events:AIPackageChangeParams akEvent)
	EndFunction
	```
/;

Struct AIPackageChangeArgs
	Var[] kIncludedSourceActors
	Var[] kExcludedSourceActors
	Var[] kIncludedNewAIPackages
	Var[] kExcludedNewAIPackages
EndStruct

Struct AIPackageChangeParams
	Actor kSourceActor
	Package kNewAIPackage
	bool bStarted
	bool bChanged
EndStruct

bool Function IsRegisteredForAIPackageChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForAIPackageChange(FunctionRef akFunctionRef, AIPackageChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForAIPackageChange(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `kTargetActor` field may be `none` if the actor is leaving combat.

	Combat States:
	00	Not In Combat
	01	In Combat
	02	Searching

	Callback Signature:

	```
	Function OnCombatStateChange(Hydra:Events:CombatStateChangeParams akEvent)
	EndFunction
	```
/;

Struct CombatStateChangeArgs
	Var[] kIncludedSourceActors
	Var[] kExcludedSourceActors
	Var[] kIncludedTargetActors
	Var[] kExcludedTargetActors
	int[] kIncludedNewStates
	int[] kExcludedNewStates
EndStruct

Struct CombatStateChangeParams
	Actor kSourceActor
	Actor kTargetActor
	int iNewState
EndStruct

bool Function IsRegisteredForCombatStateChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForCombatStateChange(FunctionRef akFunctionRef, CombatStateChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForCombatStateChange(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnFurnitureEnterExit(Hydra:Events:FurnitureEnterExitParams akEvent)
	EndFunction
	```
/;

Struct FurnitureEnterExitArgs
	Var[] kIncludedSourceActors
	Var[] kExcludedSourceActors
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
EndStruct

Struct FurnitureEnterExitParams
	Actor kSourceActor
	ObjectReference kTargetRef
	bool bEntered
EndStruct

bool Function IsRegisteredForFurnitureEnterExit(FunctionRef akFunctionRef) Global Native
bool Function RegisterForFurnitureEnterExit(FunctionRef akFunctionRef, FurnitureEnterExitArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForFurnitureEnterExit(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The "ItemRef" field may be `none` for non-persistent items.

	Callback Signature:

	```
	Function OnItemEquipUnequip(Hydra:Events:ItemEquipUnequipParams akEvent)
	EndFunction
	```
/;

Struct ItemEquipUnequipArgs
	Var[] kIncludedTargetActors
	Var[] kExcludedTargetActors
	Var[] kIncludedItems
	Var[] kExcludedItems
EndStruct

Struct ItemEquipUnequipParams
	Actor kTargetActor
	ObjectReference kItemRef
	Form kItem
	bool bEquipped
EndStruct

bool Function IsRegisteredForItemEquipUnequip(FunctionRef akFunctionRef) Global Native
bool Function RegisterForItemEquipUnequip(FunctionRef akFunctionRef, ItemEquipUnequipArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForItemEquipUnequip(FunctionRef akFunctionRef) Global Native


;/
	Life States:
	00	Alive
	01	Dying
	02	Dead
	03	Unconscious
	04	Reanimate
	05	Recycle
	06	Restrained
	07	Essential Down
	08	Bleedout

	Callback Signature:

	```
	Function OnLifeStateChange(Hydra:Events:LifeStateChangeParams akEvent)
	EndFunction
	```
/;

Struct LifeStateChangeArgs
	Var[] kIncludedSourceActors
	Var[] kExcludedSourceActors
	int[] kIncludedOldStates
	int[] kExcludedOldStates
	int[] kIncludedNewStates
	int[] kExcludedNewStates
EndStruct

Struct LifeStateChangeParams
	Actor kSourceActor
	int iOldState
	int iNewState
EndStruct

bool Function IsRegisteredForLifeStateChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForLifeStateChange(FunctionRef akFunctionRef, LifeStateChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForLifeStateChange(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnLimbCripple(Hydra:Events:LimbCrippleParams akEvent)
	EndFunction
	```
/;

Struct LimbCrippleArgs
	Var[] kIncludedSourceActors
	Var[] kExcludedSourceActors
	Var[] kIncludedSourceLimbs
	Var[] kExcludedSourceLimbs
EndStruct

Struct LimbCrippleParams
	Actor kSourceActor
	ActorValue kSourceLimb
	bool bCrippled
	bool bPartialCrippled
EndStruct

bool Function IsRegisteredForLimbCripple(FunctionRef akFunctionRef) Global Native
bool Function RegisterForLimbCripple(FunctionRef akFunctionRef, LimbCrippleArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForLimbCripple(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `kOldLocation` field may be `none`.
	- The `kNewLocation` field may be `none`.

	Callback Signature:

	```
	Function OnLocationEnterExit(Hydra:Events:LocationEnterExitParams akEvent)
	EndFunction
	```
/;

Struct LocationEnterExitArgs
	Var[] kIncludedSourceActors
	Var[] kExcludedSourceActors
	Var[] kIncludedOldLocations
	Var[] kExcludedOldLocations
	Var[] kIncludedNewLocations
	Var[] kExcludedNewLocations
EndStruct

Struct LocationEnterExitParams
	Actor kSourceActor
	Location kOldLocation
	Location kNewLocation
EndStruct

bool Function IsRegisteredForLocationEnterExit(FunctionRef akFunctionRef) Global Native
bool Function RegisterForLocationEnterExit(FunctionRef akFunctionRef, LocationEnterExitArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForLocationEnterExit(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnActorValueChange(Hydra:Events:ActorValueChangeParams akEvent)
	EndFunction
	```
/;

Struct ActorValueChangeArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
	Var[] kIncludedSourceValues
	Var[] kExcludedSourceValues
EndStruct

Struct ActorValueChangeParams
	ObjectReference kSourceRef
	ActorValue kSourceValue
	float fOldValue
	float fNewValue
EndStruct

bool Function IsRegisteredForActorValueChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForActorValueChange(FunctionRef akFunctionRef, ActorValueChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForActorValueChange(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnAnimationGraphEvent(Hydra:Events:AnimationGraphEventParams akEvent)
	EndFunction
	```
/;

Struct AnimationGraphEventArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
	string[] kIncludedEventNames
	string[] kExcludedEventNames
	string[] kIncludedPayloads
	string[] kExcludedPayloads
EndStruct

Struct AnimationGraphEventParams
	ObjectReference kSourceRef
	string sEventName
	string sPayload
EndStruct

bool Function IsRegisteredForAnimationGraphEvent(FunctionRef akFunctionRef) Global Native
bool Function RegisterForAnimationGraphEvent(FunctionRef akFunctionRef, AnimationGraphEventArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForAnimationGraphEvent(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnDestructionStageChange(Hydra:Events:DestructionStageChangeParams akEvent)
	EndFunction
	```
/;

Struct DestructionStageChangeArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
	int[] kIncludedOldStages
	int[] kExcludedOldStages
	int[] kIncludedNewStages
	int[] kExcludedNewStages
EndStruct

Struct DestructionStageChangeParams
	ObjectReference kSourceRef
	int iOldStage
	int iNewStage
EndStruct

bool Function IsRegisteredForDestructionStageChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForDestructionStageChange(FunctionRef akFunctionRef, DestructionStageChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForDestructionStageChange(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnDialogueTopicChange(Hydra:Events:DialogueTopicChangeParams akEvent)
	EndFunction
	```
/;

Struct DialogueTopicChangeArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
	Var[] kIncludedDialogueTopics
	Var[] kExcludedDialogueTopics
EndStruct

Struct DialogueTopicChangeParams
	ObjectReference kSourceRef
	TopicInfo kDialogueTopic
	bool bStarted
EndStruct

bool Function IsRegisteredForDialogueTopicChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForDialogueTopicChange(FunctionRef akFunctionRef, DialogueTopicChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForDialogueTopicChange(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnFormDelete(Hydra:Events:FormDeleteParams akEvent)
	EndFunction
	```
/;

Struct FormDeleteArgs
	int[] kIncludedSourceFormIds
	int[] kExcludedSourceFormIds
EndStruct

Struct FormDeleteParams
	int iSourceFormId
EndStruct

bool Function IsRegisteredForFormDelete(FunctionRef akFunctionRef) Global Native
bool Function RegisterForFormDelete(FunctionRef akFunctionRef, FormDeleteArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForFormDelete(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnFormIdChange(Hydra:Events:FormIdChangeParams akEvent)
	EndFunction
	```
/;

Struct FormIdChangeArgs
	int[] kIncludedOldFormIds
	int[] kExcludedOldFormIds
	int[] kIncludedNewFormIds
	int[] kExcludedNewFormIds
EndStruct

Struct FormIdChangeParams
	int iOldFormId
	int iNewFormId
EndStruct

bool Function IsRegisteredForFormIdChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForFormIdChange(FunctionRef akFunctionRef, FormIdChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForFormIdChange(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `kSourceRef` field may be `none` when the item came from the world.
	- The `kTargetRef` field may be `none` when the item is removed from the world.
	- The `kItemRef` field may be `none` for non-persistent items.

	Callback Signature:

	```
	Function OnItemAddRemove(Hydra:Events:ItemAddRemoveParams akEvent)
	EndFunction
	```
/;

Struct ItemAddRemoveArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
	Var[] kIncludedItems
	Var[] kExcludedItems
EndStruct

Struct ItemAddRemoveParams
	ObjectReference kSourceRef
	ObjectReference kTargetRef
	ObjectReference kItemRef
	Form kItem
	int iItemCount
EndStruct

bool Function IsRegisteredForItemAddRemove(FunctionRef akFunctionRef) Global Native
bool Function RegisterForItemAddRemove(FunctionRef akFunctionRef, ItemAddRemoveArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForItemAddRemove(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnObjectActivate(Hydra:Events:ObjectActivateParams akEvent)
	EndFunction
	```
/;

Struct ObjectActivateArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
EndStruct

Struct ObjectActivateParams
	ObjectReference kSourceRef
	ObjectReference kTargetRef
EndStruct

bool Function IsRegisteredForObjectActivate(FunctionRef akFunctionRef) Global Native
bool Function RegisterForObjectActivate(FunctionRef akFunctionRef, ObjectActivateArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForObjectActivate(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnObjectGrabRelease(Hydra:Events:ObjectGrabReleaseParams akEvent)
	EndFunction
	```
/;

Struct ObjectGrabReleaseArgs
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
EndStruct

Struct ObjectGrabReleaseParams
	ObjectReference kTargetRef
	bool bGrabbed
EndStruct

bool Function IsRegisteredForObjectGrabRelease(FunctionRef akFunctionRef) Global Native
bool Function RegisterForObjectGrabRelease(FunctionRef akFunctionRef, ObjectGrabReleaseArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForObjectGrabRelease(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnObjectHarvest(Hydra:Events:ObjectHarvestParams akEvent)
	EndFunction
	```
/;

Struct ObjectHarvestArgs
	Var[] kIncludedSourceActors
	Var[] kExcludedSourceActors
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
	Var[] kIncludedItems
	Var[] kExcludedItems
EndStruct

Struct ObjectHarvestParams
	Actor kSourceActor
	ObjectReference kTargetRef
	Form kItem
EndStruct

bool Function IsRegisteredForObjectHarvest(FunctionRef akFunctionRef) Global Native
bool Function RegisterForObjectHarvest(FunctionRef akFunctionRef, ObjectHarvestArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForObjectHarvest(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `kSourceRef` field may be `none` when the attack was not made by a weapon or spell.
	- The `kSourceProjectileRef` field may be `none` when not hitting actors.
	- The `kSourceProjectile` field may be `none` when the attack was not made by a projectile, e.g. melee attacks.
	- The `kHitData` field may be `none` when no hit data is available, e.g. when not hitting actors.

	Hit Data Flags:
	0x000000	None
	0x000001	Blocked
	0x000002	Block With Weapon
	0x000004	Block Candidate
	0x000008	Critical
	0x000010	Critical On Death
	0x000020	Fatal
	0x000040	Dismember Limb
	0x000080	Explode Limb
	0x000100	Cripple Limb
	0x000200	Disarm
	0x000400	Disable Weapon
	0x000800	Sneak Attack
	0x001000	Ignore Critical
	0x002000	Predict Damage
	0x004000	Predict Base Damage
	0x008000	Bash
	0x010000	Timed Bash
	0x020000	Power Attack
	0x040000	Melee Attack
	0x080000	Ricochet
	0x100000	Explosion

	Stagger Magnitudes:
	00	None
	01	Small
	02	Medium
	03	Large
	04	Extra Large

	Limb Locations:
	-1	None
	00	Torso
	01	Head 01
	02	Eye 01
	03	Look At 01
	04	Fly Grab
	05	Head 02
	06	Left Arm 01
	07	Left Arm 02
	08	Right Arm 01
	09	Right Arm 02
	10	Left Leg 01
	11	Left Leg 02
	12	Left Leg 03
	13	Right Leg 01
	14	Right Leg 02
	15	Right Leg 03
	16	Brain
	17	Weapon
	18	Root
	19	Com
	20	Pelvis
	21	Camera
	22	Offset Root
	23	Left Foot
	24	Right Foot
	25	Face Target Source

	Callback Signature:

	```
	Function OnObjectHit(Hydra:Events:ObjectHitParams akEvent)
	EndFunction
	```
/;

Struct ObjectHitArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
	Var[] kIncludedSourceObjects
	Var[] kExcludedSourceObjects
	Var[] kIncludedSourceProjectiles
	Var[] kExcludedSourceProjectiles
	string[] kIncludedMaterialNames
	string[] kExcludedMaterialNames
	int iIncludedFlags
	int iExcludedFlags
EndStruct

Struct ObjectHitParams
	ObjectReference kSourceRef
	ObjectReference kTargetRef
	Form kSourceObject
	ObjectReference kSourceProjectileRef
	Projectile kSourceProjectile
	string sMaterialName
	ObjectHitData kHitData
EndStruct

Struct ObjectHitData
	int iFlags
	Spell kHitEffect
	Spell kCriticalEffect
	Ammo kAmmo
	MaterialType kMaterialType
	float fBaseDamage
	float fTotalDamage
	float fPhysicalDamage
	float fLimbDamage
	float fBlockedDamageMult
	float fResistedPhysicalDamage
	float fResistedTypedDamage
	float fReflectedDamage
	float fSneakAttackMult
	float fCriticalDamageMult
	float fBonusHealthDamageMult
	float fPushBackMult
	int iStaggerMagnitude
	int iLimbLocation
EndStruct

bool Function IsRegisteredForObjectHit(FunctionRef akFunctionRef) Global Native
bool Function RegisterForObjectHit(FunctionRef akFunctionRef, ObjectHitArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForObjectHit(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnObjectLoadUnload(Hydra:Events:ObjectLoadUnloadParams akEvent)
	EndFunction
	```
/;

Struct ObjectLoadUnloadArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
EndStruct

Struct ObjectLoadUnloadParams
	ObjectReference kSourceRef
	bool bLoaded
EndStruct

bool Function IsRegisteredForObjectLoadUnload(FunctionRef akFunctionRef) Global Native
bool Function RegisterForObjectLoadUnload(FunctionRef akFunctionRef, ObjectLoadUnloadArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForObjectLoadUnload(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `kTargetRef` field may be `none`.

	Callback Signature:

	```
	Function OnObjectOpenClose(Hydra:Events:ObjectOpenCloseParams akEvent)
	EndFunction
	```
/;

Struct ObjectOpenCloseArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
EndStruct

Struct ObjectOpenCloseParams
	ObjectReference kSourceRef
	ObjectReference kTargetRef
	bool bOpened
EndStruct

bool Function IsRegisteredForObjectOpenClose(FunctionRef akFunctionRef) Global Native
bool Function RegisterForObjectOpenClose(FunctionRef akFunctionRef, ObjectOpenCloseArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForObjectOpenClose(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnObjectReset(Hydra:Events:ObjectResetParams akEvent)
	EndFunction
	```
/;

Struct ObjectResetArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
EndStruct

Struct ObjectResetParams
	ObjectReference kSourceRef
EndStruct

bool Function IsRegisteredForObjectReset(FunctionRef akFunctionRef) Global Native
bool Function RegisterForObjectReset(FunctionRef akFunctionRef, ObjectResetArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForObjectReset(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnObjectSell(Hydra:Events:ObjectSellParams akEvent)
	EndFunction
	```
/;

Struct ObjectSellArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
	Var[] kIncludedTargetActors
	Var[] kExcludedTargetActors
	Var[] kIncludedItemRefs
	Var[] kExcludedItemRefs
EndStruct

Struct ObjectSellParams
	ObjectReference kSourceRef
	Actor kTargetActor
	ObjectReference kItemRef
EndStruct

bool Function IsRegisteredForObjectSell(FunctionRef akFunctionRef) Global Native
bool Function RegisterForObjectSell(FunctionRef akFunctionRef, ObjectSellArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForObjectSell(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnSpellCast(Hydra:Events:SpellCastParams akEvent)
	EndFunction
	```
/;

Struct SpellCastArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
	Var[] kIncludedSpells
	Var[] kExcludedSpells
EndStruct

Struct SpellCastParams
	ObjectReference kSourceRef
	Spell kSpell
EndStruct

bool Function IsRegisteredForSpellCast(FunctionRef akFunctionRef) Global Native
bool Function RegisterForSpellCast(FunctionRef akFunctionRef, SpellCastArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForSpellCast(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnTriggerEnterLeave(Hydra:Events:TriggerEnterLeaveParams akEvent)
	EndFunction
	```
/;

Struct TriggerEnterLeaveArgs
	Var[] kIncludedSourceRefs
	Var[] kExcludedSourceRefs
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
EndStruct

Struct TriggerEnterLeaveParams
	ObjectReference kSourceRef
	ObjectReference kTargetRef
	bool bEntered
EndStruct

bool Function IsRegisteredForTriggerEnterLeave(FunctionRef akFunctionRef) Global Native
bool Function RegisterForTriggerEnterLeave(FunctionRef akFunctionRef, TriggerEnterLeaveArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForTriggerEnterLeave(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `kBookRef` field may be `none` for books read through the inventory.

	Callback Signature:

	```
	Function OnBookRead(Hydra:Events:BookReadParams akEvent)
	EndFunction
	```
/;

Struct BookReadArgs
	Var[] kIncludedBooks
	Var[] kExcludedBooks
EndStruct

Struct BookReadParams
	ObjectReference kBookRef
	Book kBook
EndStruct

bool Function IsRegisteredForBookRead(FunctionRef akFunctionRef) Global Native
bool Function RegisterForBookRead(FunctionRef akFunctionRef, BookReadArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForBookRead(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The event is dispatched in both game and menu mode.
	- For a list of most button codes, see: https://falloutck.uesp.net/wiki/DirectX_Scan_Codes.
	- For a list of most control names, see: https://falloutck.uesp.net/wiki/GetMappedKey_-_Input.

	Device Types:
	00	Keyboard
	01	Mouse
	02	Gamepad

	Mouse Button Codes:
	00	Left Click
	01	Right Click
	02	Middle Click
	03	Mouse Button 3
	04	Mouse Button 4

	Controller Button Codes:
	266	D-Pad Up
	267	D-Pad Down
	268	D-Pad Left
	269	D-Pad Right
	270	Start
	271	Back
	272	Left Thumb
	273	Right Thumb
	274	Left Shoulder
	275	Right Shoulder
	276	A
	277	B
	278	X
	279	Y
	280	Left Trigger
	281	Right Trigger

	Callback Signature:

	```
	Function OnButtonUpDown(Hydra:Events:ButtonUpDownParams akEvent)
	EndFunction
	```
/;

Struct ButtonUpDownArgs
	int[] kIncludedDeviceTypes
	int[] kExcludedDeviceTypes
	int[] kIncludedButtonCodes
	int[] kExcludedButtonCodes
	string[] kIncludedControlNames
	string[] kExcludedControlNames
EndStruct

Struct ButtonUpDownParams
	int iDeviceType
	int iButtonCode
	string sControlName
	float fAnalogValue
	float fHeldSeconds
EndStruct

bool Function IsRegisteredForButtonUpDown(FunctionRef akFunctionRef) Global Native
bool Function RegisterForButtonUpDown(FunctionRef akFunctionRef, ButtonUpDownArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForButtonUpDown(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnCellAttachDetach(Hydra:Events:CellAttachDetachParams akEvent)
	EndFunction
	```
/;

Struct CellAttachDetachArgs
	Var[] kIncludedSourceCells
	Var[] kExcludedSourceCells
EndStruct

Struct CellAttachDetachParams
	Cell kSourceCell
	bool bAttached
	bool bPreProcessed
EndStruct

bool Function IsRegisteredForCellAttachDetach(FunctionRef akFunctionRef) Global Native
bool Function RegisterForCellAttachDetach(FunctionRef akFunctionRef, CellAttachDetachArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForCellAttachDetach(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The event will only be dispatched for the player.

	Callback Signature:

	```
	Function OnCellEnterExit(Hydra:Events:CellEnterExitParams akEvent)
	EndFunction
	```
/;

Struct CellEnterExitArgs
	Var[] kIncludedTargetCells
	Var[] kExcludedTargetCells
EndStruct

Struct CellEnterExitParams
	Actor kSourceActor
	Cell kTargetCell
	bool bEntered
EndStruct

bool Function IsRegisteredForCellEnterExit(FunctionRef akFunctionRef) Global Native
bool Function RegisterForCellEnterExit(FunctionRef akFunctionRef, CellEnterExitArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForCellEnterExit(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnCellLoad(Hydra:Events:CellLoadParams akEvent)
	EndFunction
	```
/;

Struct CellLoadArgs
	Var[] kIncludedSourceCells
	Var[] kExcludedSourceCells
EndStruct

Struct CellLoadParams
	Cell kSourceCell
EndStruct

bool Function IsRegisteredForCellLoad(FunctionRef akFunctionRef) Global Native
bool Function RegisterForCellLoad(FunctionRef akFunctionRef, CellLoadArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForCellLoad(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnCrosshairRefChange(Hydra:Events:CrosshairRefChangeParams akEvent)
	EndFunction
	```
/;

Struct CrosshairRefChangeArgs
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
EndStruct

Struct CrosshairRefChangeParams
	ObjectReference kTargetRef
	bool bTargeted
EndStruct

bool Function IsRegisteredForCrosshairRefChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForCrosshairRefChange(FunctionRef akFunctionRef, CrosshairRefChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForCrosshairRefChange(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The event will only be dispatched for the player.

	Callback Signature:

	```
	Function OnDialogueTargetChange(Hydra:Events:DialogueTargetChangeParams akEvent)
	EndFunction
	```
/;

Struct DialogueTargetChangeArgs
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
EndStruct

Struct DialogueTargetChangeParams
	ObjectReference kTargetRef
EndStruct

bool Function IsRegisteredForDialogueTargetChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForDialogueTargetChange(FunctionRef akFunctionRef, DialogueTargetChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForDialogueTargetChange(FunctionRef akFunctionRef) Global Native


;/
	Difficulties:
	00	Very Easy
	01	Easy
	02	Normal
	03	Hard
	04	Very Hard
	05	Survival (no Hardcore; unused)
	06	Survival

	Callback Signature:

	```
	Function OnDifficultyChange(Hydra:Events:DifficultyChangeParams akEvent)
	EndFunction
	```
/;

Struct DifficultyChangeArgs
	int[] kIncludedOldDifficulties
	int[] kExcludedOldDifficulties
	int[] kIncludedNewDifficulties
	int[] kExcludedNewDifficulties
EndStruct

Struct DifficultyChangeParams
	int iOldDifficulty
	int iNewDifficulty
EndStruct

bool Function IsRegisteredForDifficultyChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForDifficultyChange(FunctionRef akFunctionRef, DifficultyChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForDifficultyChange(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnHudColorUpdate(Hydra:Events:HudColorUpdateParams akEvent)
	EndFunction
	```
/;

Struct HudColorUpdateArgs
	int iEmptyStruct
EndStruct

Struct HudColorUpdateParams
	Color kNewColor
EndStruct

bool Function IsRegisteredForHudColorUpdate(FunctionRef akFunctionRef) Global Native
bool Function RegisterForHudColorUpdate(FunctionRef akFunctionRef, HudColorUpdateArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForHudColorUpdate(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnLevelIncrease(Hydra:Events:LevelIncreaseParams akEvent)
	EndFunction
	```
/;

Struct LevelIncreaseArgs
	int iEmptyStruct
EndStruct

Struct LevelIncreaseParams
	int iNewLevel
EndStruct

bool Function IsRegisteredForLevelIncrease(FunctionRef akFunctionRef) Global Native
bool Function RegisterForLevelIncrease(FunctionRef akFunctionRef, LevelIncreaseArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForLevelIncrease(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnLocationLoad(Hydra:Events:LocationLoadParams akEvent)
	EndFunction
	```
/;

Struct LocationLoadArgs
	Var[] kIncludedSourceLocations
	Var[] kExcludedSourceLocations
EndStruct

Struct LocationLoadParams
	Location kSourceLocation
EndStruct

bool Function IsRegisteredForLocationLoad(FunctionRef akFunctionRef) Global Native
bool Function RegisterForLocationLoad(FunctionRef akFunctionRef, LocationLoadArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForLocationLoad(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- For a list of all lock levels, see: https://falloutck.uesp.net/wiki/GetLockLevel_-_ObjectReference#Return_Value.

	Callback Signature:

	```
	Function OnLockPick(Hydra:Events:LockPickParams akEvent)
	EndFunction
	```
/;

Struct LockPickArgs
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
EndStruct

Struct LockPickParams
	ObjectReference kTargetRef
	int iLockLevel
EndStruct

bool Function IsRegisteredForLockPick(FunctionRef akFunctionRef) Global Native
bool Function RegisterForLockPick(FunctionRef akFunctionRef, LockPickArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForLockPick(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnMenuModeEnterExit(Hydra:Events:MenuModeEnterExitParams akEvent)
	EndFunction
	```
/;

Struct MenuModeEnterExitArgs
	string[] kIncludedMenuNames
	string[] kExcludedMenuNames
EndStruct

Struct MenuModeEnterExitParams
	string sMenuName
	bool bEntered
EndStruct

bool Function IsRegisteredForMenuModeEnterExit(FunctionRef akFunctionRef) Global Native
bool Function RegisterForMenuModeEnterExit(FunctionRef akFunctionRef, MenuModeEnterExitArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForMenuModeEnterExit(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- For a list of all menu names, see: https://falloutck.uesp.net/wiki/Menu.

	Callback Signature:

	```
	Function OnMenuOpenClose(Hydra:Events:MenuOpenCloseParams akEvent)
	EndFunction
	```
/;

Struct MenuOpenCloseArgs
	string[] kIncludedMenuNames
	string[] kExcludedMenuNames
EndStruct

Struct MenuOpenCloseParams
	string sMenuName
	bool bOpened
EndStruct

bool Function IsRegisteredForMenuOpenClose(FunctionRef akFunctionRef) Global Native
bool Function RegisterForMenuOpenClose(FunctionRef akFunctionRef, MenuOpenCloseArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForMenuOpenClose(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnMiscStatChange(Hydra:Events:MiscStatChangeParams akEvent)
	EndFunction
	```
/;

Struct MiscStatChangeArgs
	string[] kIncludedStatIds
	string[] kExcludedStatIds
EndStruct

Struct MiscStatChangeParams
	string sStatId
	int iNewValue
EndStruct

bool Function IsRegisteredForMiscStatChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForMiscStatChange(FunctionRef akFunctionRef, MiscStatChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForMiscStatChange(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `kTargetRef` field may be `none`.

	Callback Signature:

	```
	Function OnPerkEntryRun(Hydra:Events:PerkEntryRunParams akEvent)
	EndFunction
	```
/;

Struct PerkEntryRunArgs
	Var[] kIncludedSourceActors
	Var[] kExcludedSourceActors
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
	Var[] kIncludedPerks
	Var[] kExcludedPerks
	int[] kIncludedEntryIds
	int[] kExcludedEntryIds
EndStruct

Struct PerkEntryRunParams
	Actor kSourceActor
	ObjectReference kTargetRef
	Perk kPerk
	int iEntryId
EndStruct

bool Function IsRegisteredForPerkEntryRun(FunctionRef akFunctionRef) Global Native
bool Function RegisterForPerkEntryRun(FunctionRef akFunctionRef, PerkEntryRunArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForPerkEntryRun(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnPerkPointIncrease(Hydra:Events:PerkPointIncreaseParams akEvent)
	EndFunction
	```
/;

Struct PerkPointIncreaseArgs
	int iEmptyStruct
EndStruct

Struct PerkPointIncreaseParams
	int iNewCount
EndStruct

bool Function IsRegisteredForPerkPointIncrease(FunctionRef akFunctionRef) Global Native
bool Function RegisterForPerkPointIncrease(FunctionRef akFunctionRef, PerkPointIncreaseArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForPerkPointIncrease(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnPipBoyLightChange(Hydra:Events:PipBoyLightChangeParams akEvent)
	EndFunction
	```
/;

Struct PipBoyLightChangeArgs
	int iEmptyStruct
EndStruct

Struct PipBoyLightChangeParams
	bool bEnabled
EndStruct

bool Function IsRegisteredForPipBoyLightChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForPipBoyLightChange(FunctionRef akFunctionRef, PipBoyLightChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForPipBoyLightChange(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnPowerArmorLightChange(Hydra:Events:PowerArmorLightChangeParams akEvent)
	EndFunction
	```
/;

Struct PowerArmorLightChangeArgs
	int iEmptyStruct
EndStruct

Struct PowerArmorLightChangeParams
	bool bEnabled
EndStruct

bool Function IsRegisteredForPowerArmorLightChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForPowerArmorLightChange(FunctionRef akFunctionRef, PowerArmorLightChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForPowerArmorLightChange(FunctionRef akFunctionRef) Global Native


;/
	Objective States:
	00	Dormant
	01	Displayed
	02	Completed
	03	Completed and Displayed
	04	Failed
	05	Failed and Displayed

	Callback Signature:

	```
	Function OnQuestObjectiveChange(Hydra:Events:QuestObjectiveChangeParams akEvent)
	EndFunction
	```
/;

Struct QuestObjectiveChangeArgs
	Var[] kIncludedSourceQuests
	Var[] kExcludedSourceQuests
	int[] kIncludedNewObjectiveIds
	int[] kExcludedNewObjectiveIds
	int[] kIncludedOldObjectiveStates
	int[] kExcludedOldObjectiveStates
	int[] kIncludedNewObjectiveStates
	int[] kExcludedNewObjectiveStates
EndStruct

Struct QuestObjectiveChangeParams
	Quest kSourceQuest
	int iNewObjectiveId
	int iOldObjectiveState
	int iNewObjectiveState
EndStruct

bool Function IsRegisteredForQuestObjectiveChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForQuestObjectiveChange(FunctionRef akFunctionRef, QuestObjectiveChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForQuestObjectiveChange(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnQuestStageChange(Hydra:Events:QuestStageChangeParams akEvent)
	EndFunction
	```
/;

Struct QuestStageChangeArgs
	Var[] kIncludedSourceQuests
	Var[] kExcludedSourceQuests
	int[] kIncludedNewStageIds
	int[] kExcludedNewStageIds
	int[] kIncludedNewItemIds
	int[] kExcludedNewItemIds
EndStruct

Struct QuestStageChangeParams
	Quest kSourceQuest
	int iNewStageId
	int iNewItemId
	bool bCompleted
EndStruct

bool Function IsRegisteredForQuestStageChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForQuestStageChange(FunctionRef akFunctionRef, QuestStageChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForQuestStageChange(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnQuestStartStop(Hydra:Events:QuestStartStopParams akEvent)
	EndFunction
	```
/;

Struct QuestStartStopArgs
	Var[] kIncludedSourceQuests
	Var[] kExcludedSourceQuests
EndStruct

Struct QuestStartStopParams
	Quest kSourceQuest
	bool bStarted
	bool bFailed
EndStruct

bool Function IsRegisteredForQuestStartStop(FunctionRef akFunctionRef) Global Native
bool Function RegisterForQuestStartStop(FunctionRef akFunctionRef, QuestStartStopArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForQuestStartStop(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnSceneActionChange(Hydra:Events:SceneActionChangeParams akEvent)
	EndFunction
	```
/;

Struct SceneActionChangeArgs
	Var[] kIncludedSourceScenes
	Var[] kExcludedSourceScenes
	int[] kIncludedNewActionIds
	int[] kExcludedNewActionIds
EndStruct

Struct SceneActionChangeParams
	Scene kSourceScene
	int iNewActionId
	ReferenceAlias kRefAlias
EndStruct

bool Function IsRegisteredForSceneActionChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForSceneActionChange(FunctionRef akFunctionRef, SceneActionChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForSceneActionChange(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnScenePhaseChange(Hydra:Events:ScenePhaseChangeParams akEvent)
	EndFunction
	```
/;

Struct ScenePhaseChangeArgs
	Var[] kIncludedSourceScenes
	Var[] kExcludedSourceScenes
	int[] kIncludedNewPhaseIndexes
	int[] kExcludedNewPhaseIndexes
EndStruct

Struct ScenePhaseChangeParams
	Scene kSourceScene
	int iNewPhaseIndex
	bool bStarted
EndStruct

bool Function IsRegisteredForScenePhaseChange(FunctionRef akFunctionRef) Global Native
bool Function RegisterForScenePhaseChange(FunctionRef akFunctionRef, ScenePhaseChangeArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForScenePhaseChange(FunctionRef akFunctionRef) Global Native


;/
	Callback Signature:

	```
	Function OnSceneStartStop(Hydra:Events:SceneStartStopParams akEvent)
	EndFunction
	```
/;

Struct SceneStartStopArgs
	Var[] kIncludedSourceScenes
	Var[] kExcludedSourceScenes
EndStruct

Struct SceneStartStopParams
	Scene kSourceScene
	bool bStarted
EndStruct

bool Function IsRegisteredForSceneStartStop(FunctionRef akFunctionRef) Global Native
bool Function RegisterForSceneStartStop(FunctionRef akFunctionRef, SceneStartStopArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForSceneStartStop(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `fStartTime` and `fDesiredEndTime` fields are set to zero if the `bIsStarted` field is set to `false`.

	Callback Signature:

	```
	Function OnSleepStartStop(Hydra:Events:SleepStartStopParams akEvent)
	EndFunction
	```
/;

Struct SleepStartStopArgs
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
EndStruct

Struct SleepStartStopParams
	ObjectReference kTargetRef
	float fStartTime
	float fDesiredEndTime
	bool bStarted
	bool bInterrupted
EndStruct

bool Function IsRegisteredForSleepStartStop(FunctionRef akFunctionRef) Global Native
bool Function RegisterForSleepStartStop(FunctionRef akFunctionRef, SleepStartStopArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForSleepStartStop(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- For a list of all lock levels, see: https://falloutck.uesp.net/wiki/GetLockLevel_-_ObjectReference#Return_Value.

	Callback Signature:

	```
	Function OnTerminalHack(Hydra:Events:TerminalHackParams akEvent)
	EndFunction
	```
/;

Struct TerminalHackArgs
	Var[] kIncludedTargetRefs
	Var[] kExcludedTargetRefs
EndStruct

Struct TerminalHackParams
	ObjectReference kTargetRef
	int iLockLevel
EndStruct

bool Function IsRegisteredForTerminalHack(FunctionRef akFunctionRef) Global Native
bool Function RegisterForTerminalHack(FunctionRef akFunctionRef, TerminalHackArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForTerminalHack(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `kTerminalRef` field may be `none` for terminals accessed through the Pip-Boy.

	Callback Signature:

	```
	Function OnTerminalMenuItemRun(Hydra:Events:TerminalMenuItemRunParams akEvent)
	EndFunction
	```
/;

Struct TerminalMenuItemRunArgs
	Var[] kIncludedTerminals
	Var[] kExcludedTerminals
	int[] kIncludedMenuItemIds
	int[] kExcludedMenuItemIds
EndStruct

Struct TerminalMenuItemRunParams
	ObjectReference kTerminalRef
	Terminal kTerminal
	int iMenuItemId
EndStruct

bool Function IsRegisteredForTerminalMenuItemRun(FunctionRef akFunctionRef) Global Native
bool Function RegisterForTerminalMenuItemRun(FunctionRef akFunctionRef, TerminalMenuItemRunArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForTerminalMenuItemRun(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- For a list of all tutorial events, see: https://falloutck.uesp.net/wiki/OnTutorialEvent_-_ScriptObject.
	- The `kSentMessage` field may be `none` if no message was sent.

	Callback Signature:

	```
	Function OnTutorialTrigger(Hydra:Events:TutorialTriggerParams akEvent)
	EndFunction
	```
/;

Struct TutorialTriggerArgs
	string[] kIncludedEventNames
	string[] kExcludedEventNames
EndStruct

Struct TutorialTriggerParams
	string sEventName
	Message kSentMessage
EndStruct

bool Function IsRegisteredForTutorialTrigger(FunctionRef akFunctionRef) Global Native
bool Function RegisterForTutorialTrigger(FunctionRef akFunctionRef, TutorialTriggerArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForTutorialTrigger(FunctionRef akFunctionRef) Global Native


;/
	Notes:
	- The `fStartTime` and `fDesiredEndTime` fields are set to zero if the `bIsStarted` field is set to `false`.

	Callback Signature:

	```
	Function OnWaitStartStop(Hydra:Events:WaitStartStopParams akEvent)
	EndFunction
	```
/;

Struct WaitStartStopArgs
	int iEmptyStruct
EndStruct

Struct WaitStartStopParams
	float fStartTime
	float fDesiredEndTime
	bool bStarted
	bool bInterrupted
EndStruct

bool Function IsRegisteredForWaitStartStop(FunctionRef akFunctionRef) Global Native
bool Function RegisterForWaitStartStop(FunctionRef akFunctionRef, WaitStartStopArgs akArgs = none, bool abPersistent = false) Global Native
bool Function UnregisterForWaitStartStop(FunctionRef akFunctionRef) Global Native
