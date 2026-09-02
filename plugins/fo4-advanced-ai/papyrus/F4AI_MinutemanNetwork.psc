Scriptname F4AI:F4AI_MinutemanNetwork extends ReferenceAlias
; Timer uses Utility.Wait loop with generation counter (RegisterForUpdate not on ReferenceAlias in FO4)
; Bound to PlayerRef via Data/Hydra/ScriptObjects/F4AI_Monitors.json
; No CK quest attachment needed — Hydra Script Object Runner handles binding.
;
; Responsibilities:
;   - Monitor for attack alerts written by F4AI_SettlementMonitor via TempMap
;   - Identify connected settlements via supply line network
;   - Calculate which allied settlements can send reinforcements
;   - Direct Minuteman actor NPCs toward the attacked settlement
;   - Track mutual aid history in Hydra:SaveMap and Data/F4AI/NPC_Memories/
;   - Manage the Triangle of Death (Sanctuary/Red Rocket/Abernathy) as a
;     coordinated defensive unit

; ── Properties ────────────────────────────────────────────────────────────────

String Property NetworkInputPath    = "Data/F4AI/network_event.json"           Auto Const
String Property NetworkOutputPath   = "Data/F4AI/network_directive.json"        Auto Const
String Property MemoryPath          = "Data/F4AI/minuteman_network.json"         Auto Const
Float  Property NetworkScanInterval = 10.0    Auto
Float  Property ReinforcementRadius = 8000.0  Auto
Bool   Property EnableNetwork       = true    Auto

Faction Property MinutemanFaction Auto
Int Property SanctuaryID = 0 Auto Const
Int Property RedRocketID = 1 Auto Const
Int Property AbernathyID = 5 Auto Const
Quest Property WorkshopParent Auto
Int   Property _loopGen       = 0 Auto Hidden  ; incremented each InitMonitor to kill stale loops

; ── Lifecycle ─────────────────────────────────────────────────────────────────

Event OnInit()
    InitMonitor()
EndEvent

Event OnPlayerLoadGame()
    InitMonitor()
EndEvent

Function InitMonitor()
    _loopGen += 1
    Int myGen = _loopGen
    if (EnableNetwork)
        WorkshopParent   = Game.GetForm(0x0002058E) as Quest
        MinutemanFaction = Game.GetForm(0x0002A8A8) as Faction
        Utility.WaitMenuMode(6.0)
        BuildNetworkMap()
        MonitorLoop(myGen)
    endif
EndFunction

Function MonitorLoop(Int myGen)
    While (myGen == _loopGen)
        if (EnableNetwork)
            CheckForAttackAlerts()
            CheckForAidRequests()
            if (Hydra:IO:File.Exists(NetworkOutputPath))
                ProcessNetworkDirective()
            endif
        endif
        Utility.Wait(NetworkScanInterval)
        if (myGen != _loopGen)
            return
        endif
    EndWhile
EndFunction

; ── Network Map ───────────────────────────────────────────────────────────────

Function BuildNetworkMap()
    WorkshopParentScript wsParent = WorkshopParent as WorkshopParentScript
    if (wsParent == None)
        return
    endif
    WorkshopScript[] workshops = wsParent.Workshops
    if (workshops == None)
        return
    endif

    Int ownedCount = 0
    Int i = 0
    While (i < workshops.Length)
        WorkshopScript ws = workshops[i]
        if (ws != None && ws.OwnedByPlayer)
            ownedCount += 1
            ObjectReference linked = (ws as ObjectReference).GetLinkedRef()
            if (linked != None)
                WorkshopScript linkedWS = linked as WorkshopScript
                if (linkedWS != None && linkedWS.OwnedByPlayer)
                    Int wsID     = ws.GetWorkshopID()
                    Int linkedID = linkedWS.GetWorkshopID()
                    AddNetworkLink(wsID, linkedID)
                    AddNetworkLink(linkedID, wsID)
                endif
            endif
        endif
        i += 1
    EndWhile

    Hydra:SaveMap.SetValue("F4AI_S", "net_settlement_count", ownedCount as Var)
    Debug.Trace("[F4AI_Network] Network mapped: " + ownedCount + " settlements")

    ; Triangle always linked to each other
    AddNetworkLink(SanctuaryID, RedRocketID)
    AddNetworkLink(SanctuaryID, AbernathyID)
    AddNetworkLink(RedRocketID, SanctuaryID)
    AddNetworkLink(RedRocketID, AbernathyID)
    AddNetworkLink(AbernathyID, SanctuaryID)
    AddNetworkLink(AbernathyID, RedRocketID)

    PersistNetworkState(workshops, ownedCount)
EndFunction

Function AddNetworkLink(Int fromID, Int toID)
    String linkKey  = "net_links_" + fromID
    String existing = Hydra:SaveMap.GetValue("F4AI_S", linkKey) as String
    String toIDStr  = toID as String
    if (Hydra:Strings.IndexOf(existing, toIDStr) == -1)
        if (existing == "")
            Hydra:SaveMap.SetValue("F4AI_S", linkKey, toIDStr as Var)
        else
            String newVal = existing + "," + toIDStr
            Hydra:SaveMap.SetValue("F4AI_S", linkKey, newVal as Var)
        endif
    endif
EndFunction

; ── Attack Response ───────────────────────────────────────────────────────────

Function CheckForAttackAlerts()
    if (!Hydra:TempMap.ContainsKey("F4AI_T", "mmnet_attacked_id"))
        return
    endif
    Int attackedID = Hydra:TempMap.GetValue("F4AI_T", "mmnet_attacked_id") as Int
    if (attackedID == 0)
        return
    endif
    if (!(Hydra:TempMap.GetValue("F4AI_T", "mmnet_attack_" + attackedID) as Bool))
        return
    endif

    String attackedName = Hydra:TempMap.GetValue("F4AI_T", "mmnet_attacked_name") as String
    Debug.Trace("[F4AI_Network] Attack alert received for: " + attackedName)

    String links = Hydra:SaveMap.GetValue("F4AI_S", "net_links_" + attackedID) as String
    if (links == "")
        Debug.Trace("[F4AI_Network] No connected settlements — " + attackedName + " must hold alone")
        return
    endif

    Bool isTriangle = IsTriangleSettlement(attackedID)
    if (isTriangle)
        MobilizeTriangle(attackedID, attackedName)
    else
        MobilizeConnectedSettlements(attackedID, attackedName, links)
    endif

    SendNetworkAttackEvent(attackedID, attackedName, links, isTriangle)
EndFunction

Function MobilizeTriangle(Int attackedID, String attackedName)
    Debug.Trace("[F4AI_Network] Triangle mobilizing for: " + attackedName)

    WorkshopScript attackedWS = GetWorkshopByID(attackedID)
    if (attackedWS == None)
        return
    endif

    Int[] triangleIDs = new Int[3]
    triangleIDs[0] = SanctuaryID
    triangleIDs[1] = RedRocketID
    triangleIDs[2] = AbernathyID

    Int i = 0
    While (i < 3)
        Int supportID = triangleIDs[i]
        if (supportID != attackedID)
            WorkshopScript supportWS = GetWorkshopByID(supportID)
            if (supportWS != None)
                String supportName = supportWS.GetName()
                SendReinforcements(supportWS, attackedWS, supportName, attackedName, 2)
                LogMutualAid(supportID, attackedID, supportName, attackedName)
            endif
        endif
        i += 1
    EndWhile

    Debug.Notification("Minuteman triangle mobilized — reinforcements en route to " + attackedName + "!")
EndFunction

Function MobilizeConnectedSettlements(Int attackedID, String attackedName, String links)
    WorkshopScript attackedWS = GetWorkshopByID(attackedID)
    if (attackedWS == None)
        return
    endif

    Int searchStart = 0
    Bool done = false

    While (!done)
        Int commaPos = Hydra:Strings.IndexOf(links, ",", searchStart)
        String token = ""

        if (commaPos == -1)
            token = Hydra:Strings.Substring(links, searchStart)
            done = true
        else
            token = Hydra:Strings.Substring(links, searchStart, commaPos - searchStart)
            searchStart = commaPos + 1
        endif

        if (token != "")
            Int supportID = token as Int
            WorkshopScript supportWS = GetWorkshopByID(supportID)
            if (supportWS != None && supportWS.OwnedByPlayer)
                String supportName  = supportWS.GetName()
                Int supportDefense  = Hydra:SaveMap.GetValue("F4AI_S", "settle_defense_" + supportID) as Int
                Int supportPop      = Hydra:SaveMap.GetValue("F4AI_S", "settle_pop_" + supportID) as Int

                if (supportDefense >= 50 && supportPop >= 3)
                    SendReinforcements(supportWS, attackedWS, supportName, attackedName, 1)
                    LogMutualAid(supportID, attackedID, supportName, attackedName)
                    Debug.Notification(supportName + " sending reinforcements to " + attackedName + "!")
                endif
            endif
        endif
    EndWhile
EndFunction

Function SendReinforcements(WorkshopScript fromWS, WorkshopScript toWS, String fromName, String toName, Int count)

    Actor[] settlers = GetSettlers(fromWS)
    if (settlers == None || settlers.Length == 0)
        return
    endif

    ObjectReference destination = toWS as ObjectReference
    Int sent = 0
    Int i    = 0

    While (i < settlers.Length && sent < count)
        Actor settler = settlers[i]
        if (settler != None && !settler.IsDead() && !settler.IsInCombat())
            Float dist = settler.GetDistance(destination)
            if (dist <= ReinforcementRadius)
                settler.MoveTo(destination, Utility.RandomFloat(-500.0, 500.0), Utility.RandomFloat(-500.0, 500.0), 0.0, false)
                settler.SetAlert(true)
                settler.EvaluatePackage()
                sent += 1
                Debug.Trace("[F4AI_Network] Reinforcement sent: " + fromName + " -> " + toName)
            endif
        endif
        i += 1
    EndWhile
EndFunction

; ── Aid Requests ──────────────────────────────────────────────────────────────

Function CheckForAidRequests()
    String aidRequest = Hydra:TempMap.GetValue("F4AI_T", "mmnet_aid_request") as String
    if (aidRequest == "")
        return
    endif
    Int targetID = Hydra:TempMap.GetValueOrDefault("F4AI_T", "mmnet_aid_target_id", (0 as Int) as Var) as Int

    Hydra:TempMap.SetValue("F4AI_T", "mmnet_aid_request", "" as Var)
    Hydra:TempMap.SetValue("F4AI_T", "mmnet_aid_target_id", (0) as Var)

    WorkshopScript targetWS = GetWorkshopByID(targetID)
    if (targetWS == None)
        return
    endif

    String links = Hydra:SaveMap.GetValue("F4AI_S", "net_links_" + targetID) as String
    MobilizeConnectedSettlements(targetID, targetWS.GetName(), links)
EndFunction

; ── Mossy Bridge ──────────────────────────────────────────────────────────────

Function SendNetworkAttackEvent(Int attackedID, String attackedName, String links, Bool isTriangle)
    Int totalSettlements = Hydra:SaveMap.GetValue("F4AI_S", "net_settlement_count") as Int
    Int attackedDefense  = Hydra:SaveMap.GetValue("F4AI_S", "settle_defense_" + attackedID) as Int
    Int attackedPop      = Hydra:SaveMap.GetValue("F4AI_S", "settle_pop_" + attackedID) as Int

    String json = "{"
    json += "\"event_type\": \"network_attack\","
    json += "\"attacked_id\": " + attackedID + ","
    json += "\"attacked_name\": \"" + attackedName + "\","
    json += "\"attacked_defense\": " + attackedDefense + ","
    json += "\"attacked_population\": " + attackedPop + ","
    json += "\"connected_settlements\": \"" + links + "\","
    json += "\"total_network_size\": " + totalSettlements + ","
    json += "\"is_triangle\": " + BoolToStr(isTriangle)
    json += "}"

    Hydra:Mutex.LockGlobal("F4AI", "Bridge")
    Hydra:IO:File.WriteAllText(NetworkInputPath, json)
    Hydra:Mutex.UnlockGlobal("F4AI", "Bridge")
EndFunction

Function ProcessNetworkDirective()
    Hydra:IO:Json.Cache_TempMap(NetworkOutputPath)
    String directive    = Hydra:MemMap.GetValue(NetworkOutputPath, "/directive") as String
    Int    targetID     = Hydra:MemMap.GetValue(NetworkOutputPath, "/target_settlement_id") as Int
    String advisoryMsg  = Hydra:MemMap.GetValue(NetworkOutputPath, "/player_advisory") as String
    String fromIDStr    = Hydra:MemMap.GetValue(NetworkOutputPath, "/from_id") as String
    String toIDStr      = Hydra:MemMap.GetValue(NetworkOutputPath, "/to_id") as String
    Hydra:IO:Json.Uncache_TempMap(NetworkOutputPath)
    Hydra:IO:File.Delete(NetworkOutputPath)

    if (advisoryMsg != "")
        Debug.Notification("[Minuteman Intel] " + advisoryMsg)
    endif

    if (directive == "reroute_supply_lines")
        AddNetworkLink(fromIDStr as Int, toIDStr as Int)
        Debug.Trace("[F4AI_Network] Supply route updated: " + fromIDStr + " -> " + toIDStr)

    elseif (directive == "fortify")
        Bool bTrue = true
        Hydra:SaveMap.SetValue("F4AI_S", "net_priority_" + targetID, bTrue as Var)
        String settleName = Hydra:SaveMap.GetValue("F4AI_S", "settle_name_" + targetID) as String
        Debug.Notification("[Minuteman Intel] Fortify " + settleName)

    elseif (directive == "rebuild_network_map")
        BuildNetworkMap()
    endif
EndFunction

; ── H-Drive Persistence ───────────────────────────────────────────────────────

Function LogMutualAid(Int fromID, Int toID, String fromName, String toName)
    String entry = "{"
    entry += "\"from\": \"" + fromName + "\","
    entry += "\"to\": \"" + toName + "\","
    entry += "\"timestamp\": " + Utility.GetCurrentGameTime()
    entry += "}\n"
    Hydra:IO:File.AppendAllText("Data/F4AI/mutual_aid_log.json", entry)
EndFunction

Function PersistNetworkState(WorkshopScript[] workshops, Int ownedCount)
    Int sanctDefense = Hydra:SaveMap.GetValueOrDefault("F4AI_S", "settle_defense_" + SanctuaryID, (0 as Int) as Var) as Int
    Int rrDefense    = Hydra:SaveMap.GetValueOrDefault("F4AI_S", "settle_defense_" + RedRocketID, (0 as Int) as Var) as Int
    Int abDefense    = Hydra:SaveMap.GetValueOrDefault("F4AI_S", "settle_defense_" + AbernathyID, (0 as Int) as Var) as Int

    String json = "{"
    json += "\"total_settlements\": " + ownedCount + ","
    json += "\"triangle\": {"
    json +=   "\"sanctuary_defense\": " + sanctDefense + ","
    json +=   "\"red_rocket_defense\": " + rrDefense + ","
    json +=   "\"abernathy_defense\": " + abDefense
    json += "},"
    json += "\"last_mapped\": " + Utility.GetCurrentGameTime()
    json += "}"
    Hydra:IO:File.WriteAllText(MemoryPath, json)
EndFunction

; ── Helpers ───────────────────────────────────────────────────────────────────

Bool Function IsTriangleSettlement(Int wsID)
    return wsID == SanctuaryID || wsID == RedRocketID || wsID == AbernathyID
EndFunction

WorkshopScript Function GetWorkshopByID(Int wsID)
    WorkshopParentScript wsParent = WorkshopParent as WorkshopParentScript
    if (wsParent == None)
        return None
    endif
    WorkshopScript[] workshops = wsParent.Workshops
    if (workshops == None)
        return None
    endif
    Int i = 0
    While (i < workshops.Length)
        WorkshopScript ws = workshops[i]
        if (ws != None && ws.GetWorkshopID() == wsID)
            return ws
        endif
        i += 1
    EndWhile
    return None
EndFunction

String Function BoolToStr(Bool b)
    if (b)
        return "true"
    endif
    return "false"
EndFunction

; ── Helpers ───────────────────────────────────────────────────────────────────

Actor[] Function GetSettlers(WorkshopScript ws)
    Keyword kWsNPC = Game.GetCommonProperties().ActorTypeNPC
    ObjectReference[] refs = (ws as ObjectReference).FindAllReferencesWithKeyword(kWsNPC, 3000.0)
    if (refs == None)
        return None
    endif
    Actor[] results = new Actor[128]
    Int count = 0
    Int i = 0
    While (i < refs.Length && count < 128)
        Actor a = refs[i] as Actor
        if (a != None)
            results[count] = a
            count += 1
        endif
        i += 1
    EndWhile
    if (count == 0)
        return None
    endif
    Actor[] trimmed = new Actor[count]
    Int j = 0
    While (j < count)
        trimmed[j] = results[j]
        j += 1
    EndWhile
    return trimmed
EndFunction
