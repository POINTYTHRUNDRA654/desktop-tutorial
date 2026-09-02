Scriptname MiscUtil Hidden Native

; Compiled to MiscUtil.pex and deployed — file natives are implemented by
; F4AI_MiscUtil.dll (f4se_plugin/src/MiscUtil.cpp). The Scan* functions below are
; pure Papyrus and ship inside this same pex.

Bool Function FileExists(String asFilePath) Global Native
String Function ReadFromFile(String asFilePath) Global Native
Bool Function WriteToFile(String asFilePath, String asString, Bool abAppend = False) Global Native
Bool Function DeleteFile(String asFilePath) Global Native

; ── Range scans ───────────────────────────────────────────────────────────────
; FO4 has no GetActorsInRange native. This samples Game.FindRandomActorFromRef
; and dedupes — not exhaustive, but reliably finds nearby actors for alert/AI
; purposes using only real engine natives.
Actor[] Function ScanActors(ObjectReference akCenter, Float afRadius, Int aiMax = 10) Global
    Actor[] results = new Actor[0]
    If akCenter == None || afRadius <= 0.0 || aiMax <= 0
        Return results
    EndIf
    Int attempts = aiMax * 4
    While attempts > 0 && results.Length < aiMax
        Actor cand = Game.FindRandomActorFromRef(akCenter, afRadius)
        If cand != None && results.Find(cand) < 0
            results.Add(cand)
        EndIf
        attempts -= 1
    EndWhile
    Return results
EndFunction

; FO4 has no generic reference scan without a base form or keyword.
; Returns an empty array — callers degrade gracefully (used by fire-spread
; visuals only). TODO: implement as a C++ native in F4AI_MiscUtil.dll.
ObjectReference[] Function ScanRefs(ObjectReference akCenter, Float afRadius, Int aiMax = 10) Global
    ObjectReference[] results = new ObjectReference[0]
    Return results
EndFunction
