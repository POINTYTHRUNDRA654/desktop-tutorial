Scriptname Form Native Hidden
; Compile-only stub. Function signatures verified against real FO4 base scripts + F4SE.
; ScriptObject-level members are declared here because this stub set has no ScriptObject.psc.

; ── Form (vanilla) ────────────────────────────────────────────────────────────
Int    Function GetFormID() Native
Bool   Function HasKeyword(Keyword akKeyword) Native

; ── Form (F4SE) ───────────────────────────────────────────────────────────────
String Function GetName() Native

; ── ScriptObject: remote / game events (vanilla) ──────────────────────────────
Bool Function RegisterForRemoteEvent(ScriptObject akEventSource, String asEventName) Native
Function UnregisterForRemoteEvent(ScriptObject akEventSource, String asEventName) Native
Function UnregisterForAllRemoteEvents() Native

; Hit events are single-shot — re-register inside the OnHit handler.
Function RegisterForHitEvent(ScriptObject akTarget, ScriptObject akAggressorFilter = None, Form akSourceFilter = None, Form akProjectileFilter = None, Int aiPowerFilter = -1, Int aiSneakFilter = -1, Int aiBashFilter = -1, Int aiBlockFilter = -1, Bool abMatch = True) Native
Function UnregisterForAllHitEvents(ScriptObject akTarget = None) Native

Function RegisterForPlayerTeleport() Native
Function UnregisterForPlayerTeleport() Native

; Required for OnItemAdded/OnItemRemoved events (None = let everything through)
Function AddInventoryEventFilter(Form akFilter) Native
Function RemoveAllInventoryEventFilters() Native

; ── ScriptObject: timers (vanilla — FO4 replacement for RegisterForUpdate*) ───
Function StartTimer(Float afInterval, Int aiTimerID = 0) Native
Function CancelTimer(Int aiTimerID = 0) Native
Function StartTimerGameTime(Float afInterval, Int aiTimerID = 0) Native
Function CancelTimerGameTime(Int aiTimerID = 0) Native

; ── ScriptObject: input + camera (F4SE) ───────────────────────────────────────
Function RegisterForKey(Int aiKeyCode) Native
Function UnregisterForKey(Int aiKeyCode) Native
Function RegisterForControl(String asControl) Native
Function UnregisterForControl(String asControl) Native
Function RegisterForCameraState() Native
Function UnregisterForCameraState() Native

; ── Events ────────────────────────────────────────────────────────────────────
Event OnInit()
EndEvent
Event OnTimer(Int aiTimerID)
EndEvent
Event OnTimerGameTime(Int aiTimerID)
EndEvent
; Received after RegisterForHitEvent (single-shot)
Event OnHit(ObjectReference akTarget, ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked, String asMaterialName)
EndEvent
; Received after RegisterForPlayerTeleport (load door, fast travel, moveto)
Event OnPlayerTeleport()
EndEvent
; F4SE input events
Event OnKeyDown(Int aiKeyCode)
EndEvent
Event OnKeyUp(Int aiKeyCode, Float afHeldTime)
EndEvent
Event OnControlDown(String asControl)
EndEvent
Event OnControlUp(String asControl, Float afHeldTime)
EndEvent
; F4SE camera event (state 2 = VATS)
Event OnPlayerCameraState(Int aiOldState, Int aiNewState)
EndEvent
