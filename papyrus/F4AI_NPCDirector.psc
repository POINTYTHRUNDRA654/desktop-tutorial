Scriptname F4AI:F4AI_NPCDirector extends ReferenceAlias
; Timer uses Utility.Wait loop with generation counter (RegisterForUpdate not on ReferenceAlias in FO4)
; Bound to PlayerRef via Data/Hydra/ScriptObjects/F4AI_Monitors.json
; No CK quest attachment needed — Hydra Script Object Runner handles binding.
;
; Responsibilities:
;   - Scan nearby NPC pairs that could plausibly have a conversation
;   - Send social context to Mossy (who, where, relationship, faction, mood)
;   - Receive back conversation directives: topic, initiator, behavior type
;   - Execute social behaviors: greet, warn, trade, gossip, argue, threaten, comfort
;   - Track relationship scores between NPC pairs in Hydra:SaveMap
;     so NPCs remember friends, rivals, and enemies across sessions
;   - Throttle: NPCs should not talk constantly — enforce cooldowns per pair
;
; Relationship score: -100 (enemies) to +100 (close allies)
; Stored as: rel_{npcA_formid}_{npcB_formid} (lower ID first for consistency)

; ── Properties ────────────────────────────────────────────────────────────────

String Property SocialInputPath   = "Data/F4AI/social_event.json"    Auto Const
String Property SocialOutputPath  = "Data/F4AI/social_directive.json" Auto Const
String Property InterNpcInputPath = "Data/F4AI/internpc_input.json"   Auto Const
Float  Property ScanRadius        = 2000.0 Auto
Float  Property ScanInterval      = 45.0   Auto
Float  Property ConvoCooldown     = 120.0  Auto  ; seconds before same pair talks again
Bool   Property EnableNPCAI       = true   Auto
Int    Property _loopGen          = 0      Auto Hidden  ; incremented each InitMonitor to kill stale loops

; ── Lifecycle ─────────────────────────────────────────────────────────────────

Event OnInit()
    InitMonitor()
EndEvent

Event OnPlayerLoadGame()
    EnableNPCAI = true  ; on by default — still overridable via holotape
    _loopGen += 1000  ; kill OnInit loops and zombie stacks — no old myGen can match
    Int myGen = _loopGen
    Utility.Wait(3.0) ; let old stacks reach their gen check and exit
    if (myGen != _loopGen)
        return
    endif
    MonitorLoop(myGen)
EndEvent

Function InitMonitor()
    _loopGen += 1
    Int myGen = _loopGen
    Utility.Wait(1.0)
    if (myGen != _loopGen)
        return
    endif
    if (EnableNPCAI)
        MonitorLoop(myGen)
    endif
EndFunction

Function MonitorLoop(Int myGen)
    While (myGen == _loopGen)
        if (EnableNPCAI)
            ScanForSocialOpportunities(myGen)
            if (Hydra:IO:File.Exists(SocialOutputPath))
                ProcessSocialDirective()
            endif
        endif
        Utility.Wait(ScanInterval)
        if (myGen != _loopGen)
            return
        endif
    EndWhile
EndFunction

; ── Social Scan ───────────────────────────────────────────────────────────────

Function ScanForSocialOpportunities(Int myGen)
    Actor player = Game.GetPlayer()
    Keyword kActorTypeNPC = Game.GetCommonProperties().ActorTypeNPC
    ObjectReference[] refs = player.FindAllReferencesWithKeyword(kActorTypeNPC, ScanRadius)
    if (myGen != _loopGen)
        return
    endif
    if (refs == None || refs.Length < 2)
        return
    endif

    Actor[] candidates = new Actor[32]
    Int candidateCount = 0

    Int i = 0
    While (i < refs.Length && candidateCount < 32)
        Actor npc = refs[i] as Actor
        if (npc != None && !npc.IsDead() && npc != player)
            if (!npc.IsInCombat() && !npc.IsInScene() && IsHumanoid(npc))
                ; Plenty of background actors (guards, leveled settlers) ship with
                ; a deliberately blank Name field on their base record — pairing
                ; one into an ambient conversation produces a nameless line like
                ; "Cricket <-> " with nobody to attribute the other half to.
                if (npc.GetActorBase().GetName() != "")
                    candidates[candidateCount] = npc
                    candidateCount += 1
                endif
            endif
        endif
        i += 1
    EndWhile

    if (candidateCount < 2)
        return
    endif

    Int idxA = Utility.RandomInt(0, candidateCount - 1)
    Int idxB = Utility.RandomInt(0, candidateCount - 1)
    if (idxA == idxB)
        idxB = (idxA + 1) % candidateCount
    endif

    Actor npcA = candidates[idxA]
    Actor npcB = candidates[idxB]
    if (npcA == None || npcB == None)
        return
    endif

    String pairKey  = GetPairKey(npcA, npcB)
    Float lastTalkDef = 0.0
    Float lastTalk    = Hydra:SaveMap.GetValueOrDefault("F4AI_S", "social_lastalk_" + pairKey, lastTalkDef as Var) as Float
    Float gameTime  = Utility.GetCurrentGameTime() * 24.0
    if ((gameTime - lastTalk) < (ConvoCooldown / 3600.0))
        return
    endif

    SendSocialEvent(npcA, npcB, pairKey)
EndFunction

; ── Bridge I/O ────────────────────────────────────────────────────────────────

Function SendSocialEvent(Actor npcA, Actor npcB, String pairKey)
    String nameA    = npcA.GetActorBase().GetName()
    String nameB    = npcB.GetActorBase().GetName()
    String idA      = npcA.GetActorBase().GetFormID() as String
    String idB      = npcB.GetActorBase().GetFormID() as String
    String raceA    = GetRaceTag(npcA)
    String raceB    = GetRaceTag(npcB)
    String factionA = GetPrimaryFaction(npcA)
    String factionB = GetPrimaryFaction(npcB)
    String locName  = npcA.GetCurrentLocation().GetName()
    Float  relScore = GetRelationship(pairKey)
    String relLabel = RelationshipLabel(relScore)
    String season    = Hydra:SaveMap.GetValue("F4AI_S", "world_season") as String
    String timeOfDay = Hydra:SaveMap.GetValue("F4AI_S", "world_timeofday") as String
    String weatherStr   = Hydra:SaveMap.GetValue("F4AI_S", "world_weather") as String
    String lastTopic = Hydra:SaveMap.GetValue("F4AI_S", "social_lasttopic_" + pairKey) as String

    String json = "{"
    json += "\"event_type\": \"social\","
    json += "\"npc_a\": {\"name\": \"" + nameA + "\", \"id\": \"" + idA + "\", \"race\": \"" + raceA + "\", \"faction\": \"" + factionA + "\"},"
    json += "\"npc_b\": {\"name\": \"" + nameB + "\", \"id\": \"" + idB + "\", \"race\": \"" + raceB + "\", \"faction\": \"" + factionB + "\"},"
    json += "\"location\": \"" + locName + "\","
    json += "\"relationship\": " + relScore + ","
    json += "\"relationship_label\": \"" + relLabel + "\","
    json += "\"last_topic\": \"" + lastTopic + "\","
    json += "\"season\": \"" + season + "\","
    json += "\"time_of_day\": \"" + timeOfDay + "\","
    json += "\"weather\": \"" + weatherStr + "\""
    json += "}"

    Hydra:Mutex.LockGlobal("F4AI", "Bridge")
    Hydra:IO:File.WriteAllText(SocialInputPath, json)
    Hydra:Mutex.UnlockGlobal("F4AI", "Bridge")

    Debug.Trace("[F4AI_NPC] Social event: " + nameA + " <-> " + nameB + " [" + relLabel + "]")
EndFunction

Function ProcessSocialDirective()
    Hydra:IO:Json.Cache_TempMap(SocialOutputPath)
    String behavior  = Hydra:MemMap.GetValue(SocialOutputPath, "/behavior") as String
    String idA       = Hydra:MemMap.GetValue(SocialOutputPath, "/npc_a_id") as String
    String idB       = Hydra:MemMap.GetValue(SocialOutputPath, "/npc_b_id") as String
    String topicStr  = Hydra:MemMap.GetValue(SocialOutputPath, "/topic") as String
    String lineA     = Hydra:MemMap.GetValue(SocialOutputPath, "/line_a") as String
    String lineB     = Hydra:MemMap.GetValue(SocialOutputPath, "/line_b") as String
    Float  relDelta  = Hydra:MemMap.GetValue(SocialOutputPath, "/relationship_delta") as Float
    Hydra:IO:Json.Uncache_TempMap(SocialOutputPath)
    Hydra:IO:File.Delete(SocialOutputPath)

    Actor npcA = FindNPCByFormID(idA as Int)
    Actor npcB = FindNPCByFormID(idB as Int)
    if (npcA == None || npcB == None)
        return
    endif

    String pairKey = GetPairKey(npcA, npcB)

    if (relDelta != 0.0)
        UpdateRelationship(pairKey, relDelta)
    endif

    Hydra:SaveMap.SetValue("F4AI_S", "social_lasttopic_" + pairKey, topicStr as Var)
    Float gTime = Utility.GetCurrentGameTime() * 24.0
    Hydra:SaveMap.SetValue("F4AI_S", "social_lastalk_" + pairKey, gTime as Var)

    if (behavior == "converse")
        ExecuteConversation(npcA, npcB, lineA, lineB)
    elseif (behavior == "greet")
        ExecuteGreet(npcA, npcB)
    elseif (behavior == "warn")
        ExecuteWarn(npcA, npcB, lineA)
    elseif (behavior == "argue")
        ExecuteArgue(npcA, npcB, lineA, lineB)
    elseif (behavior == "threaten")
        ExecuteThreaten(npcA, npcB, lineA)
    elseif (behavior == "trade")
        ExecuteTrade(npcA, npcB)
    elseif (behavior == "comfort")
        ExecuteComfort(npcA, npcB, lineA)
    elseif (behavior == "ignore")
        Debug.Trace("[F4AI_NPC] Ignore directive for " + npcA.GetActorBase().GetName())
    endif
EndFunction

; ── Behavior Executors ────────────────────────────────────────────────────────

Function ExecuteConversation(Actor npcA, Actor npcB, String lineA, String lineB)
    npcA.SetLookAt(npcB, true)
    npcB.SetLookAt(npcA, true)

    String nameA = npcA.GetActorBase().GetName()
    String nameB = npcB.GetActorBase().GetName()

    String json = "{"
    json += "\"initiator\": \"" + nameA + "\","
    json += "\"responder\": \"" + nameB + "\","
    json += "\"line_a\": \"" + lineA + "\","
    json += "\"line_b\": \"" + lineB + "\","
    json += "\"location\": \"" + npcA.GetCurrentLocation().GetName() + "\""
    json += "}"

    Hydra:Mutex.LockGlobal("F4AI", "Bridge")
    Hydra:IO:File.WriteAllText(InterNpcInputPath, json)
    Hydra:Mutex.UnlockGlobal("F4AI", "Bridge")

    Float pauseA = 2.5 + (Hydra:Strings.Size(lineA) as Float) / 13.0
    Debug.Notification(nameA + ": " + lineA)
    Utility.WaitMenuMode(pauseA)
    Debug.Notification(nameB + ": " + lineB)

    Float pauseB = 2.5 + (Hydra:Strings.Size(lineB) as Float) / 13.0
    Utility.WaitMenuMode(pauseB)

    npcA.SetLookAt(None, true)
    npcB.SetLookAt(None, true)
    npcA.EvaluatePackage()
    npcB.EvaluatePackage()

    Debug.Trace("[F4AI_NPC] Conversation: " + nameA + " <-> " + nameB)
EndFunction

Function ExecuteGreet(Actor npcA, Actor npcB)
    npcA.SetLookAt(npcB, true)
    npcB.SetLookAt(npcA, true)
    Utility.WaitMenuMode(3.0)
    npcA.SetLookAt(None, true)
    npcB.SetLookAt(None, true)
    npcA.EvaluatePackage()
    npcB.EvaluatePackage()
EndFunction

Function ExecuteWarn(Actor npcA, Actor npcB, String line)
    npcA.SetLookAt(npcB, true)
    npcA.SetAlert(true)
    npcB.SetAlert(true)
    Debug.Notification(npcA.GetActorBase().GetName() + ": " + line)
    Float pause = 2.5 + (Hydra:Strings.Size(line) as Float) / 13.0
    Utility.WaitMenuMode(pause)
    npcA.SetLookAt(None, true)
    npcA.EvaluatePackage()
    npcB.EvaluatePackage()
EndFunction

Function ExecuteArgue(Actor npcA, Actor npcB, String lineA, String lineB)
    npcA.SetLookAt(npcB, true)
    npcB.SetLookAt(npcA, true)
    npcA.SetAlert(true)
    npcB.SetAlert(true)

    String nameA = npcA.GetActorBase().GetName()
    String nameB = npcB.GetActorBase().GetName()
    Debug.Notification(nameA + ": " + lineA)
    Float pauseA = 2.5 + (Hydra:Strings.Size(lineA) as Float) / 13.0
    Utility.WaitMenuMode(pauseA)
    Debug.Notification(nameB + ": " + lineB)
    Float pauseB = 2.5 + (Hydra:Strings.Size(lineB) as Float) / 13.0
    Utility.WaitMenuMode(pauseB)

    npcA.SetLookAt(None, true)
    npcB.SetLookAt(None, true)
    npcA.EvaluatePackage()
    npcB.EvaluatePackage()
EndFunction

Function ExecuteThreaten(Actor npcA, Actor npcB, String line)
    npcA.SetLookAt(npcB, true)
    npcA.SetAlert(true)
    npcB.SetAlert(true)
    Debug.Notification(npcA.GetActorBase().GetName() + ": " + line)
    Float pause = 2.5 + (Hydra:Strings.Size(line) as Float) / 13.0
    Utility.WaitMenuMode(pause)
    Float newRel = GetRelationship(GetPairKey(npcA, npcB))
    if (newRel < -75.0)
        npcA.StartCombat(npcB)
    else
        npcA.SetLookAt(None, true)
        npcA.EvaluatePackage()
        npcB.EvaluatePackage()
    endif
EndFunction

Function ExecuteTrade(Actor npcA, Actor npcB)
    npcA.SetLookAt(npcB, true)
    npcB.SetLookAt(npcA, true)
    npcA.SetAlert(false)
    npcB.SetAlert(false)
    Utility.WaitMenuMode(5.0)
    npcA.SetLookAt(None, true)
    npcB.SetLookAt(None, true)
    npcA.EvaluatePackage()
    npcB.EvaluatePackage()
EndFunction

Function ExecuteComfort(Actor npcA, Actor npcB, String line)
    npcA.SetLookAt(npcB, true)
    npcB.SetLookAt(npcA, true)
    Debug.Notification(npcA.GetActorBase().GetName() + ": " + line)
    Float pause = 2.5 + (Hydra:Strings.Size(line) as Float) / 13.0
    Utility.WaitMenuMode(pause)
    npcA.SetLookAt(None, true)
    npcB.SetLookAt(None, true)
    npcA.EvaluatePackage()
    npcB.EvaluatePackage()
EndFunction

; ── Relationship System ───────────────────────────────────────────────────────

Float Function GetRelationship(String pairKey)
    Float relDef = 0.0
    return Hydra:SaveMap.GetValueOrDefault("F4AI_S", "rel_" + pairKey, relDef as Var) as Float
EndFunction

Function UpdateRelationship(String pairKey, Float delta)
    Float curDef  = 0.0
    Float current = Hydra:SaveMap.GetValueOrDefault("F4AI_S", "rel_" + pairKey, curDef as Var) as Float
    Float newScore = current + delta
    if (newScore > 100.0)
        newScore = 100.0
    elseif (newScore < -100.0)
        newScore = -100.0
    endif
    Hydra:SaveMap.SetValue("F4AI_S", "rel_" + pairKey, newScore as Var)
EndFunction

String Function RelationshipLabel(Float score)
    if (score >= 75.0)
        return "close_ally"
    elseif (score >= 40.0)
        return "friend"
    elseif (score >= 10.0)
        return "acquaintance"
    elseif (score >= -10.0)
        return "neutral"
    elseif (score >= -40.0)
        return "disliked"
    elseif (score >= -75.0)
        return "rival"
    endif
    return "enemy"
EndFunction

String Function GetPairKey(Actor npcA, Actor npcB)
    Int idA = npcA.GetActorBase().GetFormID()
    Int idB = npcB.GetActorBase().GetFormID()
    if (idA < idB)
        return idA as String + "_" + idB as String
    endif
    return idB as String + "_" + idA as String
EndFunction

; ── Finders & Classification ──────────────────────────────────────────────────

Actor Function FindNPCByFormID(Int formID)
    Actor player = Game.GetPlayer()
    Keyword kActorTypeNPC = Game.GetCommonProperties().ActorTypeNPC
    ObjectReference[] refs = player.FindAllReferencesWithKeyword(kActorTypeNPC, ScanRadius)
    if (refs == None)
        return None
    endif
    Int i = 0
    While (i < refs.Length)
        Actor a = refs[i] as Actor
        if (a != None && a.GetActorBase().GetFormID() == formID)
            return a
        endif
        i += 1
    EndWhile
    return None
EndFunction

Bool Function IsHumanoid(Actor a)
    Race r = a.GetRace()
    if (r == Game.GetForm(0x00013746) as Race)
        return true
    endif
    if (r == Game.GetForm(0x0001D4B5) as Race)
        return true
    endif
    if (r == Game.GetForm(0x000EAFDF) as Race)
        return true
    endif
    if (r == Game.GetForm(0x0002C4C6) as Race)
        return true
    endif
    return false
EndFunction

String Function GetRaceTag(Actor npc)
    Race r = npc.GetRace()
    if (r == Game.GetForm(0x0001D4B5) as Race)
        return "Super Mutant"
    elseif (r == Game.GetForm(0x000EAFDF) as Race)
        return "Ghoul"
    elseif (r == Game.GetForm(0x0002C4C6) as Race)
        return "Synth"
    endif
    return "Human"
EndFunction

String Function GetPrimaryFaction(Actor npc)
    Faction minutemen = Game.GetForm(0x0002A8A8) as Faction
    Faction bos       = Game.GetForm(0x0001AEBE) as Faction
    Faction railroad  = Game.GetForm(0x000403C5) as Faction
    Faction institute = Game.GetForm(0x000362FE) as Faction
    Faction raiders   = Game.GetForm(0x0001CBED) as Faction
    Faction gunners   = Game.GetForm(0x0002993A) as Faction

    if (npc.IsInFaction(institute))
        return "Institute"
    elseif (npc.IsInFaction(bos))
        return "Brotherhood of Steel"
    elseif (npc.IsInFaction(railroad))
        return "Railroad"
    elseif (npc.IsInFaction(raiders))
        return "Raiders"
    elseif (npc.IsInFaction(gunners))
        return "Gunners"
    elseif (npc.IsInFaction(minutemen))
        return "Minutemen"
    endif
    return "Unknown"
EndFunction

String Function BoolToStr(Bool b)
    if (b)
        return "true"
    endif
    return "false"
EndFunction
