Scriptname ReferenceAlias extends Form Native Hidden
; Compile-only stub. Alias scripts receive their reference's events (relayed) —
; signatures below match the real FO4 ReferenceAlias.psc.

Actor           Function GetActorReference() Native
ObjectReference Function GetReference() Native
Function Clear() Native
Function ForceRefTo(ObjectReference akReference) Native

Event OnAliasInit()
EndEvent
; Relayed from the alias's reference — real FO4 signatures
Event OnLoad()
EndEvent
Event OnUnload()
EndEvent
Event OnPlayerLoadGame()
EndEvent
Event OnItemAdded(Form akBaseItem, Int aiItemCount, ObjectReference akItemReference, ObjectReference akSourceContainer)
EndEvent
