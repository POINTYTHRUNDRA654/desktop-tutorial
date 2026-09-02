Scriptname Actor extends ObjectReference Native Hidden
; Compile-only stub. Signatures verified against the real FO4 Actor.psc —
; parameter counts/defaults must match exactly or calls fail at runtime.

Function SetCombatStyle(CombatStyle akCombatStyle) Native
Bool Function SetRestrained(Bool abRestrained = True) Native
Function StartCombat(Actor akTarget, Bool abPreferredTarget = False) Native
Function StopCombat() Native
Function StopCombatAlarm() Native
Bool  Function IsDead() Native
Bool  Function IsInCombat() Native
Actor Function GetCombatTarget() Native
Bool  Function IsAlarmed() Native
Bool  Function IsBleedingOut() Native
Bool  Function IsEssential() Native
Bool  Function IsInFaction(Faction akFaction) Native
Int   Function GetFactionReaction(Actor akOther) Native; 0=Neutral 1=Enemy 2=Ally 3=Friend
Function AddToFaction(Faction akFaction) Native
Function RemoveFromFaction(Faction akFaction) Native
Bool Function IsPlayerTeammate() Native
Bool Function IsSneaking() Native
Bool Function IsSwimming() Native
Bool Function IsRunning() Native
Bool Function IsSprinting() Native
Bool Function IsInScene() Native

Int  Function GetLevel() Native
Function EvaluatePackage(Bool abResetAI = False) Native
Bool Function DispelSpell(Spell akSpell) Native
Function SetAlert(Bool abAlerted = True) Native
Function SetVehicle(Actor akVehicle) Native

Function SetLookAt(ObjectReference akTarget, Bool abPathingLookAt = False) Native
Function ClearLookAt() Native
Int Function GetSitState() Native
Int Function GetSleepState() Native

ActorBase Function GetActorBase() Native
Race      Function GetRace() Native

Function EquipItem(Form akItem, Bool abPreventRemoval = False, Bool abSilent = False) Native

Function ClearExpressionOverride() Native
; NOTE: SetExpressionOverride is not present in the known FO4/F4SE base sources.
; Calls compile but may no-op at runtime — verify in-game or replace.
Function SetExpressionOverride(Int aiMood, Int aiStrength) Native

; ── Events (real FO4 signatures) ──────────────────────────────────────────────
Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
EndEvent
Event OnDeath(Actor akKiller)
EndEvent
Event OnLocationChange(Location akOldLoc, Location akNewLoc)
EndEvent
Event OnItemEquipped(Form akBaseObject, ObjectReference akReference)
EndEvent
Event OnItemUnequipped(Form akBaseObject, ObjectReference akReference)
EndEvent
Event OnPlayerLoadGame()
EndEvent
Event OnPlayerSwimming()
EndEvent
Event OnEnterSneaking()
EndEvent
