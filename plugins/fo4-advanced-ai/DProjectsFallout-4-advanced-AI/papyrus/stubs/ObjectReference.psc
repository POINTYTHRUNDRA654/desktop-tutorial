Scriptname ObjectReference extends Form Native Hidden

; ── Spatial ─────────────────────────────────────────────────────────────────
Float Function GetDistance(ObjectReference akOther) Native
Bool  Function IsUnderwater() Native
Bool  Function IsInWater() Native
Bool  Function IsInterior() Native
Location Function GetCurrentLocation() Native

; ── Actors in range (F4SE) ───────────────────────────────────────────────────
Actor[] Function GetActorsInRange(Float afRadius, Int aiMaxCount = 20) Native

; ── World interaction ────────────────────────────────────────────────────────
ObjectReference Function PlaceAtMe(Form akFormToPlace, Int aiCount = 1,     Bool abForcePersist = False, Bool abInitiallyDisabled = False) Native
Function CastSpell(Spell akSpell, ObjectReference akTarget = None) Native
Function EvaluatePackage() Native
Function Enable(Bool abFadeIn = False) Native
Function Disable(Bool abFadeOut = False) Native
Function Delete() Native
Bool Function IsDisabled() Native
Bool Function IsDeleted() Native

; ── Actor value (also on Actor, redeclared here for ObjectReference callers) ─
Function SetValue(ActorValue akAV, Float afValue) Native
Float  Function GetValue(ActorValue akAV) Native
Float  Function GetBaseValue(ActorValue akAV) Native
