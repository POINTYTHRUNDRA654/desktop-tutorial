Scriptname F4AI:F4AI_QueueManager extends Quest

String Property InputPath = "Data/F4AI/bridge_input.json" Auto Const
String Property OutputPath = "Data/F4AI/bridge_output.json" Auto Const
Sound Property F4AI_AudioOutputSound Auto Const

Actor[] DialogueQueue
Bool IsProcessing = false

Event OnInit()
    DialogueQueue = new Actor[20]
EndEvent

Function PushToQueue(Actor npcRef)
    if (npcRef == None || npcRef.IsDead())
        return
    endif

    Int i = 0
    While (i < DialogueQueue.Length)
        if (DialogueQueue[i] == npcRef)
            return
        endif
        if (DialogueQueue[i] == None)
            DialogueQueue[i] = npcRef
            ProcessNextInQueue()
            return
        endif
        i += 1
    EndWhile
EndFunction

Function ProcessNextInQueue()
    if (IsProcessing)
        return
    endif

    Int i = 0
    Actor activeTargetNPC = None
    While (i < DialogueQueue.Length)
        if (DialogueQueue[i] != None)
            activeTargetNPC = DialogueQueue[i]
            DialogueQueue[i] = None
            i = DialogueQueue.Length
        endif
        i += 1
    EndWhile

    if (activeTargetNPC != None)
        IsProcessing = true
        ExecuteAITranslationThread(activeTargetNPC)
    endif
EndFunction

Function ExecuteAITranslationThread(Actor targetNPC)
    String npcName = targetNPC.GetActorBase().GetName()
    String curLoc = Game.GetPlayer().GetCurrentLocation().GetName()
    if (curLoc == "")
        curLoc = "The Commonwealth Wastes"
    endif

    String sampleSpeech = "Hello there."
    String jsonPayload = "{"
    jsonPayload += "\"npc_name\": \"" + npcName + "\","
    jsonPayload += "\"location\": \"" + curLoc + "\","
    jsonPayload += "\"player_speech\": \"" + sampleSpeech + "\""
    jsonPayload += "}"

    if (Hydra:IO:File.Exists(OutputPath))
        Hydra:IO:File.Delete(OutputPath)
    endif
    Hydra:IO:File.WriteAllText(InputPath, jsonPayload)

    Int safetyTicks = 0
    Bool payloadReturned = false
    While (!payloadReturned && safetyTicks < 40)
        if (Hydra:IO:File.Exists(OutputPath))
            payloadReturned = true
        else
            Utility.WaitMenuMode(0.2)
            safetyTicks += 1
        endif
    EndWhile

    if (payloadReturned)
        String rawJson = Hydra:IO:File.ReadAllText(OutputPath)
        Hydra:IO:File.Delete(OutputPath)

        Int keyPos = Hydra:Strings.IndexOf(rawJson, "\"subtitle_text\": \"")
        String cleanSubtitle = ""
        if (keyPos != -1)
            Int subStart = keyPos + 18
            Int subEnd = Hydra:Strings.IndexOf(rawJson, "\", \"audio_file\"")
            if (subEnd > subStart)
                cleanSubtitle = Hydra:Strings.Substring(rawJson, subStart, subEnd - subStart)
            endif
        endif

        Int durStart = Hydra:Strings.IndexOf(rawJson, "\"display_duration\": ") + 20
        Float displayTime = 2.5
        if (durStart > 19)
            Int durEnd = Hydra:Strings.IndexOf(rawJson, ",", durStart)
            if (durEnd == -1)
                durEnd = Hydra:Strings.IndexOf(rawJson, "}", durStart)
            endif
            if (durEnd > durStart)
                displayTime = Hydra:Strings.Substring(rawJson, durStart, durEnd - durStart) as Float
            endif
        endif

        Int emotionID = 0
        Int emoStart = Hydra:Strings.IndexOf(rawJson, "\"emotion_id\": ")
        if (emoStart != -1)
            emoStart += 14
            Int emoEnd = Hydra:Strings.IndexOf(rawJson, ",", emoStart)
            if (emoEnd == -1)
                emoEnd = Hydra:Strings.IndexOf(rawJson, "}", emoStart)
            endif
            if (emoEnd > emoStart)
                emotionID = Hydra:Strings.Substring(rawJson, emoStart, emoEnd - emoStart) as Int
            endif
        endif

        ApplyDynamicFacialMorph(targetNPC, emotionID)
        Debug.Notification(npcName + ": " + cleanSubtitle)
        F4AI_AudioOutputSound.Play(targetNPC)
        Utility.WaitMenuMode(displayTime)
        targetNPC.ClearExpressionOverride()
    else
        Debug.Notification("[AI Sync Matrix Timeout]")
    endif

    IsProcessing = false
    ProcessNextInQueue()
EndFunction

; Set True in CK once SetExpressionOverride is confirmed working on your F4SE build.
; ClearExpressionOverride is confirmed Native; SetExpressionOverride is unverified.
Bool Property ExpressionOverrideAvailable = False Auto

Function ApplyDynamicFacialMorph(Actor targetNPC, Int emotionID)
    If !ExpressionOverrideAvailable
        ; SetExpressionOverride unverified at runtime — skip until confirmed in-game.
        ; Enable by setting ExpressionOverrideAvailable = True on this script in CK.
        Return
    EndIf
    if (emotionID == 1)
        targetNPC.SetExpressionOverride(1, 80)
    elseif (emotionID == 2)
        targetNPC.SetExpressionOverride(7, 90)
    elseif (emotionID == 3)
        targetNPC.SetExpressionOverride(2, 50)
    else
        targetNPC.ClearExpressionOverride()
    endif
EndFunction
