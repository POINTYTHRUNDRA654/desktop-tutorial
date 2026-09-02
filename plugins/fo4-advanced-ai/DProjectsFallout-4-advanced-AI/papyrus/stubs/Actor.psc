Scriptname Actor extends ObjectReference Native Hidden

; ── AI / Combat ─────────────────────────────────────────────────────────────
Function SetCombatStyle(CombatStyle akCombatStyle) Native
Function SetRestrained(Bool abRestrained) Native
Function StartCombat(Actor akTarget) Native
Function StopCombat() Native
Bool   Function IsDead() Native
Bool   Function IsInCombat() Native
Actor  Function GetCombatTarget() Native
Bool   Function IsAlarmed() Native
Bool   Function IsBleedingOut() Native
Bool   Function IsEssential() Native

; ── Movement ─────────────────────────────────────────────────────────────────
Float  Function GetVelocity() Native

; ── Perks / Factions ─────────────────────────────────────────────────────────
Bool   Function IsInFaction(Faction akFaction) Native
Function AddToFaction(Faction akFaction) Native
Function RemoveFromFaction(Faction akFaction) Native

; ── Misc ─────────────────────────────────────────────────────────────────────
Bool   Function IsPlayerTeammate() Native
Bool   Function IsSneaking() Native
Function EvaluatePackage() Native
