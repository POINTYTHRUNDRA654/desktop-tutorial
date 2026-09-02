Scriptname ObjectReference extends Form Native Hidden
; Compile-only stub. Signatures verified against the real FO4 ObjectReference.psc —
; parameter counts/defaults must match exactly or calls fail at runtime.

Float Function GetDistance(ObjectReference akOther) Native
Bool  Function IsInInterior() Native
Location Function GetCurrentLocation() Native
String Function GetDisplayName() Native

ObjectReference[] Function FindAllReferencesWithKeyword(Form akKeywordOrList, Float afRadius) Native

ObjectReference Function PlaceAtMe(Form akFormToPlace, Int aiCount = 1, Bool abForcePersist = False, Bool abInitiallyDisabled = False, Bool abDeleteWhenAble = True) Native
Actor           Function PlaceActorAtMe(ActorBase akActorToPlace, Int aiLevelMod = 4, EncounterZone akZone = None) Native

Bool Function Activate(ObjectReference akActivator, Bool abDefaultProcessingOnly = False) Native
Function Say(Topic akTopicToSay, Actor akActorToSpeakAs = None, Bool abSpeakInPlayersHead = False, ObjectReference akTarget = None) Native

Function Enable(Bool abFadeIn = False) Native
Function Disable(Bool abFadeOut = False) Native
Function Delete() Native
Bool Function IsDisabled() Native
Bool Function IsDeleted() Native
Bool Function IsQuestItem() Native

Function SetValue(ActorValue akAV, Float afValue) Native
Float  Function GetValue(ActorValue akAV) Native
Float  Function GetBaseValue(ActorValue akAV) Native
Function DamageValue(ActorValue akAV, Float afDamage) Native
Function RestoreValue(ActorValue akAV, Float afAmount) Native

Int Function GetItemCount(Form akItem = None) Native

Function MoveTo(ObjectReference akTarget, Float afXOffset = 0.0, Float afYOffset = 0.0, Float afZOffset = 0.0, Bool abMatchRotation = True) Native
Form            Function GetBaseObject() Native
ObjectReference Function GetLinkedRef(Keyword apKeyword = None) Native

Float Function GetPositionX() Native
Float Function GetPositionY() Native
Float Function GetPositionZ() Native

Bool Function IsInLocation(Location akLocation) Native

; ── Events (real FO4) ─────────────────────────────────────────────────────────
Event OnLoad()
EndEvent
Event OnUnload()
EndEvent
Event OnItemAdded(Form akBaseItem, Int aiItemCount, ObjectReference akItemReference, ObjectReference akSourceContainer)
EndEvent
