Scriptname Form Native Hidden

; ── Type query ──────────────────────────────────────────────────────────────
Int  Function GetFormID() Native
Int  Function GetType() Native
String Function GetName() Native
String Function GetDisplayName() Native
Bool Function HasKeyword(Keyword akKeyword) Native

; ── F4SE event registration ─────────────────────────────────────────────────
Function RegisterForUpdateGameTime(Float afInterval, Float afOffset = 0.0) Native
Function UnregisterForUpdateGameTime() Native
Function RegisterForWeatherChange() Native
Function UnregisterForWeatherChange() Native
Function RegisterForPlayerLoadGame() Native
Function UnregisterForPlayerLoadGame() Native
Function RegisterForCombatStateChanged(Actor akActor) Native
Function UnregisterForCombatStateChanged(Actor akActor) Native
Function RegisterForLocationChange(Actor akActor) Native
Function UnregisterForLocationChange(Actor akActor) Native
Function RegisterForSneakStateBegin(Actor akActor) Native
Function UnregisterForSneakStateBegin(Actor akActor) Native
Function RegisterForVATSStart() Native
Function UnregisterForVATSStart() Native
Function RegisterForItemEquipped(Bool abDelayedEquip = False, Bool abDelayedUnequip = False) Native
Function UnregisterForItemEquipped(Bool abDelayedEquip = False, Bool abDelayedUnequip = False) Native
Function RegisterForLevelUp(Actor akActor) Native
Function UnregisterForLevelUp(Actor akActor) Native
Function RegisterForPlayerFastTravelEnd() Native
Function UnregisterForPlayerFastTravelEnd() Native
Function RegisterForPlayerSwimming() Native
Function UnregisterForPlayerSwimming() Native
Function RegisterForPlayerUnderwater() Native
Function UnregisterForPlayerUnderwater() Native
Function RegisterForRemoteEvent(Form akObject, String asEventName) Native
Function UnregisterForRemoteEvent(Form akObject, String asEventName) Native
