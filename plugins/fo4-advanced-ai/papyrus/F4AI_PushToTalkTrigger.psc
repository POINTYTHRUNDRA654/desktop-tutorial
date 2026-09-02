Scriptname F4AI:F4AI_PushToTalkTrigger extends ReferenceAlias

; Base paths — used to build per-NPC paths at runtime via GetNPCPaths()
String Property InputBasePath  = "Data/F4AI/bridge_input" Auto Const
String Property TextOutBasePath = "Data/F4AI/text_out"    Auto Const
; Legacy single-file fallback (kept for bridge compatibility)
String Property InputPath   = "Data/F4AI/bridge_input.json" Auto Const
String Property TextOutPath = "Data/F4AI/text_out.txt"      Auto Const
; Keyboard fallback. Set to -1 to disable.
Int Property ActivationKey = -1 Auto Const
; D-pad Left on Xbox controller (keycode 268). Set to -1 to disable.
; If D-pad left doesn't fire, try 277 or 265 — the exact code can vary by F4SE version.
Int Property DPadLeftKey = 268 Auto Const
; Assign the F4AI_Voice Sound record in CK — plays the generated WAV on the NPC
Sound Property F4AI_VoiceSound Auto
Actor ActiveTarget

Event OnInit()
    RegisterKeys()
    Debug.Notification("[F4AI PTT] Push-to-talk ready. Press D-pad Left near an NPC.")
EndEvent

Event OnPlayerLoadGame()
    RegisterKeys()
EndEvent

Function RegisterKeys()
    if (ActivationKey >= 0)
        RegisterForKey(ActivationKey)
    endif
    if (DPadLeftKey >= 0)
        RegisterForKey(DPadLeftKey)
    endif
EndFunction

; ── D-pad Left / keyboard trigger ───────────────────────────────────────────
; D-pad Left fires AI directly — no vanilla dialogue conflict.
; A/E still opens vanilla dialogue as normal.
Event OnKeyDown(Int aiKeyCode)
    if (aiKeyCode == DPadLeftKey || aiKeyCode == ActivationKey)
        TryTriggerAI()
    endif
EndEvent

; ── Called by CK Dialogue Fragment (Greeting Topic) ─────────────────────────
; akSpeaker is passed in directly by the dialogue system — no targeting needed.
; Conditions on the topic handle quest/scene filtering before this fires.
Function TriggerAIForSpeaker(Actor akSpeaker)
    if (akSpeaker == None || akSpeaker.IsDead())
        return
    endif
    ActiveTarget = akSpeaker
    SafeFurnitureExit(akSpeaker)
    RestrainMovementOnly(akSpeaker)

    String npcName      = akSpeaker.GetActorBase().GetName()
    if (npcName == "")
        npcName = "Stranger"
    endif
    String locName      = Game.GetPlayer().GetCurrentLocation().GetName()
    String raceField    = InjectRaceContext(akSpeaker)
    String weatherField = "\"weather\": \"" + GetCurrentWeatherName() + "\""
    ; NOTE: Actor.IsSwimming() is not exposed in FO4 Papyrus — omit swimming field
    String jsonPayload = "{\"npc_name\": \"" + npcName + "\", \"location\": \"" + locName + "\", "
    jsonPayload += raceField + ", " + weatherField + ", \"player_speech\": \"\"}"
    String npcInputPath = GetNPCInputPath(akSpeaker)
    Hydra:IO:File.WriteAllText(npcInputPath, jsonPayload)
    Debug.Notification("[F4AI] Sent to " + npcName + "...")
    WaitForVoiceReturn(akSpeaker)
EndFunction

; ── Per-NPC file paths ───────────────────────────────────────────────────────
; Each NPC gets its own bridge_input_<formID>.json / text_out_<formID>.txt so
; multiple crowd NPCs can have requests in-flight simultaneously without
; overwriting each other's files.
String Function GetNPCInputPath(Actor akNPC)
    Int formID = akNPC.GetActorBase().GetFormID()
    return InputBasePath + "_" + formID + ".json"
EndFunction

String Function GetNPCTextOutPath(Actor akNPC)
    Int formID = akNPC.GetActorBase().GetFormID()
    return TextOutBasePath + "_" + formID + ".txt"
EndFunction

; ── Shared trigger logic ─────────────────────────────────────────────────────
Function TryTriggerAI()
    Actor lookTarget = GetNearestNPC()

    if (lookTarget == None)
        Debug.Notification("[F4AI] No NPC in range.")
        return
    endif

    if (lookTarget.IsDead())
        return
    endif

    Race turretRace = Game.GetForm(0x0001337B) as Race
    if (lookTarget.GetRace() == turretRace)
        return
    endif
    if (lookTarget.IsInScene())
        Debug.Notification(lookTarget.GetActorBase().GetName() + " is currently busy.")
        return
    endif

    ActiveTarget = lookTarget
    SafeFurnitureExit(lookTarget)
    RestrainMovementOnly(lookTarget)

    ; Build JSON payload with full environment context
    String npcName = lookTarget.GetActorBase().GetName()
    if (npcName == "")
        npcName = "Stranger"
    endif
    String locName = Game.GetPlayer().GetCurrentLocation().GetName()
    String raceField = InjectRaceContext(lookTarget)
    String weatherField = "\"weather\": \"" + GetCurrentWeatherName() + "\""
    ; player_speech is intentionally empty — bridge will run STT if enable_stt = 1
    String jsonPayload = "{\"npc_name\": \"" + npcName + "\", \"location\": \"" + locName + "\", "
    jsonPayload += raceField + ", " + weatherField + ", \"player_speech\": \"\"}"
    ; Write to per-NPC file so crowd NPCs don't overwrite each other
    String npcInputPath = GetNPCInputPath(lookTarget)
    Hydra:IO:File.WriteAllText(npcInputPath, jsonPayload)
    Debug.Notification("[F4AI] Sent to " + npcName + "...")
    WaitForVoiceReturn(lookTarget)
EndFunction

Function WaitForVoiceReturn(Actor targetNPC)
    String npcName = targetNPC.GetActorBase().GetName()
    ; Per-NPC response file — isolates this NPC from other simultaneous requests
    String npcTextOutPath = GetNPCTextOutPath(targetNPC)
    Int checksCompleted = 0
    String responseText = ""
    ; Poll per-NPC file first; also check legacy text_out.txt as fallback so Mossy's
    ; /request/respond callback (which writes legacy path) still reaches the player.
    While (responseText == "" && checksCompleted < 300)
        responseText = Hydra:IO:File.ReadAllText(npcTextOutPath)
        if (responseText == "")
            responseText = Hydra:IO:File.ReadAllText(TextOutPath)
            if (responseText != "")
                Hydra:IO:File.Delete(TextOutPath)
            else
                Utility.WaitMenuMode(0.2)
                checksCompleted += 1
            endif
        endif
    EndWhile
    Hydra:IO:File.Delete(npcTextOutPath)

    if (responseText != "")
        String displayText = Hydra:Strings.Truncate(responseText, 512)
        Debug.MessageBox(npcName + ": " + displayText)

        if (F4AI_VoiceSound != None)
            F4AI_VoiceSound.Play(targetNPC)
        endif
    else
        Debug.Notification("[F4AI] No response — is the bridge running?")
    endif

    if (targetNPC != None)
        targetNPC.SetRestrained(false)
        ResetFaceAnimations(targetNPC)
    endif
EndFunction

Function RestrainMovementOnly(Actor targetNPC)
    targetNPC.SetLookAt(Game.GetPlayer(), true)
    targetNPC.StopCombatAlarm()
    ; KeepOffsetFromActor is Skyrim-only — FO4 equivalent: restrain in place (still animates/talks).
    ; Released via SetRestrained(false) in the cleanup paths.
    targetNPC.SetRestrained(true)
EndFunction

Function SafeFurnitureExit(Actor targetNPC)
    if (targetNPC.GetSitState() != 0 || targetNPC.GetSleepState() != 0)
        targetNPC.Activate(targetNPC)
        Utility.Wait(1.5)
    endif
EndFunction

Function ResetFaceAnimations(Actor targetNPC)
    targetNPC.ClearExpressionOverride()
    targetNPC.EvaluatePackage()
EndFunction

String Function InjectRaceContext(Actor targetNPC)
    ; NOTE: Verify creature FormIDs in FO4Edit if race detection misfires.
    ; The known-good human/mutant IDs are confirmed; creature IDs are vanilla defaults.
    Race npcRace = targetNPC.GetRace()
    String raceTag = "Human"

    ; ── Human mutant variants ───────────────────────────────────────────────
    if (npcRace == Game.GetForm(0x0001D4B5) as Race)
        raceTag = "Super Mutant"
    elseif (npcRace == Game.GetForm(0x000EAFDF) as Race)
        raceTag = "Ghoul"
    elseif (npcRace == Game.GetForm(0x0002C4C6) as Race)
        raceTag = "Synth"

    ; ── Creatures ───────────────────────────────────────────────────────────
    elseif (npcRace == Game.GetForm(0x000F81ED) as Race)
        raceTag = "Deathclaw"
    elseif (npcRace == Game.GetForm(0x000B2BF2) as Race || npcRace == Game.GetForm(0x000B2BF5) as Race)
        raceTag = "Mirelurk"
    elseif (npcRace == Game.GetForm(0x0017B2A0) as Race)
        raceTag = "Radscorpion"
    elseif (npcRace == Game.GetForm(0x000B2BF4) as Race)
        raceTag = "Yao Guai"
    elseif (npcRace == Game.GetForm(0x00020198) as Race)
        raceTag = "Brahmin"
    elseif (npcRace == Game.GetForm(0x000A82AB) as Race)
        raceTag = "Dog"

    ; ── Robots ──────────────────────────────────────────────────────────────
    elseif (npcRace == Game.GetForm(0x000B2BF1) as Race)
        raceTag = "Protectron"
    elseif (npcRace == Game.GetForm(0x000B2BF0) as Race)
        raceTag = "Assaultron"
    elseif (npcRace == Game.GetForm(0x000B2BF3) as Race)
        raceTag = "Sentry Bot"
    endif

    return "\"npc_race\": \"" + raceTag + "\""
EndFunction

; ── Targeting ────────────────────────────────────────────────────────────────
; Use FindAllReferencesWithKeyword so we can skip dead actors and pick the
; closest living NPC — FindClosestActorFromRef returns exactly one actor and
; that actor may be a nearby dead body from a just-finished fight.
Actor Function GetNearestNPC()
    Actor player = Game.GetPlayer()
    Keyword kActorTypeNPC = Game.GetCommonProperties().ActorTypeNPC
    ObjectReference[] refs = player.FindAllReferencesWithKeyword(kActorTypeNPC, 2500.0)
    if (refs == None)
        return None
    endif
    Float bestDist = 99999999.0
    Actor bestActor = None
    Int i = 0
    While (i < refs.Length)
        Actor a = refs[i] as Actor
        if (a != None && a != player && !a.IsDead())
            Float d = player.GetDistance(a)
            if (d < bestDist)
                bestDist = d
                bestActor = a
            endif
        endif
        i += 1
    EndWhile
    return bestActor
EndFunction

String Function GetCurrentWeatherName()
    Weather currentWeather = Weather.GetCurrentWeather()
    if (currentWeather == None)
        return "Clear"
    endif
    ; Radstorm — glowing green radioactive storm (0x000CC800 vanilla)
    if (currentWeather == Game.GetForm(0x000CC800) as Weather)
        return "Radstorm"
    endif
    ; Heavy Rain
    if (currentWeather == Game.GetForm(0x00034584) as Weather)
        return "Rain"
    endif
    ; Foggy
    if (currentWeather == Game.GetForm(0x00023EF0) as Weather)
        return "Fog"
    endif
    ; GetName() returns display name if the Weather form has one set in CK
    String wName = currentWeather.GetName()
    if (wName != "")
        return wName
    endif
    return "Overcast"
EndFunction

