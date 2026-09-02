Scriptname F4AI:F4AI_SettlementMonitor extends ReferenceAlias
; Timer uses Utility.Wait loop with generation counter (RegisterForUpdate not on ReferenceAlias in FO4)
; Bound to PlayerRef via Data/Hydra/ScriptObjects/F4AI_Monitors.json
; No CK quest attachment needed — Hydra Script Object Runner handles binding.
;
; Responsibilities:
;   - Monitor all player-owned workshops for attack events
;   - Send settlement state snapshots and attack events to Mossy
;   - Receive tactical directives: rally_defenders, call_aid, prioritize_gate, etc.
;   - Persist settlement history to Data/F4AI/settlements/ (off save file)
;   - Triangle of Death: Sanctuary / Red Rocket / Abernathy as coordinated unit
;
; SS2 build limits: 255 objects/plot, 128 plots/settlement (Mossy tracks plot usage;
; we do NOT try to raise vanilla GlobalVariable — that lever doesn't apply to SS2).

; ── Properties ────────────────────────────────────────────────────────────────

String Property SettlementInputPath  = "Data/F4AI/settlement_event.json"    Auto Const
String Property SettlementOutputPath = "Data/F4AI/settlement_directive.json" Auto Const
String Property MemoryBasePath       = "Data/F4AI/settlements/"              Auto Const
Float  Property ScanInterval         = 20.0 Auto
Bool   Property EnableSettlementAI   = true  Auto

Int Property SS2_MaxPlots          = 128 Auto Const
Int Property SS2_MaxObjectsPerPlot = 255 Auto Const

Quest Property WorkshopParent Auto

Int Property SanctuaryID = 0 Auto Const
Int Property RedRocketID = 1 Auto Const
Int Property AbernathyID = 5 Auto Const
Int Property _loopGen    = 0 Auto Hidden  ; incremented each InitMonitor to kill stale loops

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
    if (!EnableSettlementAI)
        return
    endif
    WorkshopParent = Game.GetForm(0x0002058E) as Quest
    Utility.WaitMenuMode(5.0)
    if (myGen != _loopGen)
        return
    endif
    MonitorLoop(myGen)
EndFunction

Function MonitorLoop(Int myGen)
    While (myGen == _loopGen)
        if (EnableSettlementAI)
            ScanAllSettlements()
            if (Hydra:IO:File.Exists(SettlementOutputPath))
                ProcessSettlementDirective()
            endif
        endif
        Utility.Wait(ScanInterval)
        if (myGen != _loopGen)
            return
        endif
    EndWhile
EndFunction

; ── SS2 Plot Tracking ─────────────────────────────────────────────────────────

Int Function EstimatePlotCount(WorkshopScript ws)
    ; SS2 doesn't expose a direct Papyrus API for plot count.
    ; Approximate via (population * 0.7) — each settler ~ 0.7 plots in typical SS2 cities.
    Int pop      = GetSettlers(ws).Length
    Int estimate = (pop as Float * 0.7) as Int
    if (estimate < 1)
        estimate = 1
    endif
    return estimate
EndFunction

Float Function PlotBudgetPct(Int estimatedPlots)
    return estimatedPlots as Float / SS2_MaxPlots as Float
EndFunction

; ── Settlement Scan ───────────────────────────────────────────────────────────

Function ScanAllSettlements()
    WorkshopParentScript wsParent = WorkshopParent as WorkshopParentScript
    if (wsParent == None)
        return
    endif
    WorkshopScript[] workshops = wsParent.Workshops
    if (workshops == None)
        return
    endif
    Int i = 0
    While (i < workshops.Length)
        WorkshopScript ws = workshops[i]
        if (ws != None && ws.OwnedByPlayer)
            ProcessWorkshop(ws, wsParent)
        endif
        i += 1
    EndWhile
EndFunction

Function ProcessWorkshop(WorkshopScript ws, WorkshopParentScript wsParent)
    Int wsID   = ws.GetWorkshopID()
    String wsName = ws.GetName()
    if (wsName == "")
        wsName = "Settlement_" + wsID
    endif

    ; Read workshop resource values via WorkshopParentScript's runtime ActorValue array.
    ; Indices: Food=0, Happiness=1, Safety/Defense=3, Water=4, Power=5, Beds=6
    ; (mirrors WorkshopRatingFood/Water/etc. constants in vanilla WorkshopParentScript)
    Int population  = GetSettlers(ws).Length
    ActorValue[] ratings = wsParent.WorkshopRatingValues
    Int food      = 0
    Int happiness = 0
    Int defense   = 0
    Int water     = 0
    Int power     = 0
    Int beds      = 0
    if (ratings != None && ratings.Length >= 7)
        ActorValue avFood    = ratings[0]
        ActorValue avHappy   = ratings[1]
        ActorValue avDefense = ratings[3]
        ActorValue avWater   = ratings[4]
        ActorValue avPower   = ratings[5]
        ActorValue avBeds    = ratings[6]
        if (avFood    != None)
            food      = ws.GetValue(avFood)    as Int
        endif
        if (avHappy   != None)
            happiness = ws.GetValue(avHappy)   as Int
        endif
        if (avDefense != None)
            defense   = ws.GetValue(avDefense) as Int
        endif
        if (avWater   != None)
            water     = ws.GetValue(avWater)   as Int
        endif
        if (avPower   != None)
            power     = ws.GetValue(avPower)   as Int
        endif
        if (avBeds    != None)
            beds      = ws.GetValue(avBeds)    as Int
        endif
    endif
    Bool underAttack = false ; bUnderAttack not externally accessible; attack detection via Hydra events

    Int estimatedPlots = EstimatePlotCount(ws)
    Float plotPct      = PlotBudgetPct(estimatedPlots)

    Bool wasUnderAttack = Hydra:TempMap.GetValue("F4AI_T", "settle_attack_" + wsID) as Bool
    if (underAttack && !wasUnderAttack)
        Bool bTrue = true
        Hydra:TempMap.SetValue("F4AI_T", "settle_attack_" + wsID, bTrue as Var)
        OnSettlementAttacked(ws, wsID, wsName, population, defense)
    elseif (!underAttack && wasUnderAttack)
        Bool bFalse = false
        Hydra:TempMap.SetValue("F4AI_T", "settle_attack_" + wsID, bFalse as Var)
        OnAttackResolved(ws, wsID, wsName)
    endif

    PersistSettlementState(wsID, wsName, population, defense, food, water, power, beds, happiness, underAttack, estimatedPlots)

    ; Share with MinutemanNetwork via SaveMap
    Hydra:SaveMap.SetValue("F4AI_S", "settle_defense_" + wsID, defense as Var)
    Hydra:SaveMap.SetValue("F4AI_S", "settle_pop_" + wsID, population as Var)
    Hydra:SaveMap.SetValue("F4AI_S", "settle_plots_" + wsID, estimatedPlots as Var)
    Hydra:SaveMap.SetValue("F4AI_S", "settle_name_" + wsID, wsName as Var)
    Bool bTrue = true
    Hydra:SaveMap.SetValue("F4AI_S", "settle_owned_" + wsID, bTrue as Var)
EndFunction

; ── Attack Events ─────────────────────────────────────────────────────────────

Function OnSettlementAttacked(WorkshopScript ws, Int wsID, String wsName, Int population, Int defense)

    Debug.Trace("[F4AI_Settlement] ATTACK: " + wsName)

    Bool bTrue = true
    Hydra:TempMap.SetValue("F4AI_T", "mmnet_attack_" + wsID, bTrue as Var)
    Hydra:TempMap.SetValue("F4AI_T", "mmnet_attacked_name", wsName as Var)
    Hydra:TempMap.SetValue("F4AI_T", "mmnet_attacked_id", wsID as Var)

    Bool isTriangle = IsTriangleSettlement(wsID)
    String triangleContext = ""
    if (isTriangle)
        triangleContext = BuildTriangleContext()
    endif

    String season    = Hydra:SaveMap.GetValue("F4AI_S", "world_season") as String
    String timeOfDay = Hydra:SaveMap.GetValue("F4AI_S", "world_timeofday") as String
    String weatherStr = Hydra:SaveMap.GetValue("F4AI_S", "world_weather") as String

    String json = "{"
    json += "\"event_type\": \"settlement_attack\","
    json += "\"settlement_id\": " + wsID + ","
    json += "\"settlement_name\": \"" + wsName + "\","
    json += "\"population\": " + population + ","
    json += "\"defense\": " + defense + ","
    json += "\"season\": \"" + season + "\","
    json += "\"time_of_day\": \"" + timeOfDay + "\","
    json += "\"weather\": \"" + weatherStr + "\","
    json += "\"is_triangle\": " + BoolToStr(isTriangle)
    if (isTriangle && triangleContext != "")
        json += "," + triangleContext
    endif
    json += "}"

    Hydra:Mutex.LockGlobal("F4AI", "Bridge")
    Hydra:IO:File.WriteAllText(SettlementInputPath, json)
    Hydra:Mutex.UnlockGlobal("F4AI", "Bridge")

    Debug.Notification(wsName + " is under attack!")
EndFunction

Function OnAttackResolved(WorkshopScript ws, Int wsID, String wsName)
    Debug.Trace("[F4AI_Settlement] Attack resolved: " + wsName)

    Int defense = Hydra:SaveMap.GetValue("F4AI_S", "settle_defense_" + wsID) as Int
    String outcomeJson = "{"
    outcomeJson += "\"event\": \"attack_resolved\","
    outcomeJson += "\"settlement\": \"" + wsName + "\","
    outcomeJson += "\"timestamp\": \"" + Utility.GetCurrentGameTime() + "\","
    outcomeJson += "\"defense\": " + defense
    outcomeJson += "}"

    String historyPath = MemoryBasePath + wsName + "_history.json"
    Hydra:IO:File.AppendAllText(historyPath, outcomeJson + "\n")

    Bool bFalse = false
    Hydra:TempMap.SetValue("F4AI_T", "mmnet_attack_" + wsID, bFalse as Var)

    Debug.Notification(wsName + " — attack repelled.")
EndFunction

; ── Directive Processing ──────────────────────────────────────────────────────

Function ProcessSettlementDirective()
    Hydra:IO:Json.Cache_TempMap(SettlementOutputPath)
    String directive    = Hydra:MemMap.GetValue(SettlementOutputPath, "/directive") as String
    Int    wsID         = Hydra:MemMap.GetValue(SettlementOutputPath, "/settlement_id") as Int
    String fromSettlement = Hydra:MemMap.GetValue(SettlementOutputPath, "/aid_from") as String
    Hydra:IO:Json.Uncache_TempMap(SettlementOutputPath)
    Hydra:IO:File.Delete(SettlementOutputPath)

    WorkshopScript ws = GetWorkshopByID(wsID)
    if (ws == None)
        return
    endif

    String wsName = ws.GetName()
    Debug.Trace("[F4AI_Settlement] Directive '" + directive + "' for " + wsName)

    if (directive == "rally_defenders")
        RallyDefenders(ws)
    elseif (directive == "call_aid")
        Hydra:TempMap.SetValue("F4AI_T", "mmnet_aid_request", fromSettlement as Var)
        Hydra:TempMap.SetValue("F4AI_T", "mmnet_aid_target_id", wsID as Var)
    elseif (directive == "prioritize_gate")
        PrioritizeGate(ws)
    elseif (directive == "raise_alarm")
        RaiseAlarm(ws, wsName)
    elseif (directive == "stand_down")
        StandDown(ws)
    endif
    ; Note: raise_budget directive removed — SS2 manages its own build limits
EndFunction

; ── Tactical Executors ────────────────────────────────────────────────────────

Function RallyDefenders(WorkshopScript ws)
    Actor[] settlers = GetSettlers(ws)
    if (settlers == None)
        return
    endif
    Int i = 0
    While (i < settlers.Length)
        Actor settler = settlers[i]
        if (settler != None && !settler.IsDead())
            settler.SetAlert(true)
            settler.EvaluatePackage()
        endif
        i += 1
    EndWhile
    Debug.Trace("[F4AI_Settlement] Defenders rallied at " + ws.GetName())
EndFunction

Function PrioritizeGate(WorkshopScript ws)
    Actor[] settlers = GetSettlers(ws)
    if (settlers == None)
        return
    endif
    ObjectReference workbench = ws as ObjectReference
    Int i = 0
    While (i < settlers.Length)
        Actor settler = settlers[i]
        if (settler != None && !settler.IsDead() && !settler.IsInCombat())
            settler.MoveTo(workbench, Utility.RandomFloat(-300.0, 300.0), Utility.RandomFloat(-300.0, 300.0), 0.0, false)
            settler.SetAlert(true)
        endif
        i += 1
    EndWhile
EndFunction

Function RaiseAlarm(WorkshopScript ws, String wsName)
    Actor[] settlers = GetSettlers(ws)
    if (settlers == None)
        return
    endif
    Int i = 0
    While (i < settlers.Length)
        Actor settler = settlers[i]
        if (settler != None && !settler.IsDead())
            settler.SetAlert(true)
            settler.StopCombatAlarm()
            settler.EvaluatePackage()
        endif
        i += 1
    EndWhile
    Debug.Notification(wsName + " — all settlers on alert!")
EndFunction

Function StandDown(WorkshopScript ws)
    Actor[] settlers = GetSettlers(ws)
    if (settlers == None)
        return
    endif
    Int i = 0
    While (i < settlers.Length)
        Actor settler = settlers[i]
        if (settler != None && !settler.IsDead() && !settler.IsInCombat())
            settler.SetAlert(false)
            settler.StopCombatAlarm()
            settler.EvaluatePackage()
        endif
        i += 1
    EndWhile
EndFunction

; ── H-Drive Persistence ───────────────────────────────────────────────────────

Function PersistSettlementState(Int wsID, String wsName, Int pop, Int defense, Int food, Int water, Int power, Int beds, Int happiness, Bool underAttack, Int plots)

    String json = "{"
    json += "\"name\": \"" + wsName + "\","
    json += "\"id\": " + wsID + ","
    json += "\"population\": " + pop + ","
    json += "\"defense\": " + defense + ","
    json += "\"food\": " + food + ","
    json += "\"water\": " + water + ","
    json += "\"power\": " + power + ","
    json += "\"beds\": " + beds + ","
    json += "\"happiness\": " + happiness + ","
    json += "\"under_attack\": " + BoolToStr(underAttack) + ","
    json += "\"ss2_plots_estimated\": " + plots + ","
    json += "\"ss2_plots_max\": " + SS2_MaxPlots + ","
    json += "\"ss2_plot_pct\": " + PlotBudgetPct(plots) + ","
    json += "\"last_updated\": " + Utility.GetCurrentGameTime()
    json += "}"

    String safeName = Hydra:Strings.Replace(wsName, " ", "_")
    Hydra:IO:File.WriteAllText(MemoryBasePath + safeName + "_state.json", json)
EndFunction

; ── Triangle of Death ─────────────────────────────────────────────────────────

Bool Function IsTriangleSettlement(Int wsID)
    return wsID == SanctuaryID || wsID == RedRocketID || wsID == AbernathyID
EndFunction

String Function BuildTriangleContext()
    Int sanctDefense = Hydra:SaveMap.GetValue("F4AI_S", "settle_defense_" + SanctuaryID) as Int
    Int rrDefense    = Hydra:SaveMap.GetValue("F4AI_S", "settle_defense_" + RedRocketID) as Int
    Int abDefense    = Hydra:SaveMap.GetValue("F4AI_S", "settle_defense_" + AbernathyID) as Int
    Int sanctPop     = Hydra:SaveMap.GetValue("F4AI_S", "settle_pop_" + SanctuaryID) as Int
    Int rrPop        = Hydra:SaveMap.GetValue("F4AI_S", "settle_pop_" + RedRocketID) as Int
    Int abPop        = Hydra:SaveMap.GetValue("F4AI_S", "settle_pop_" + AbernathyID) as Int

    String ctx = "\"triangle_context\": {"
    ctx += "\"sanctuary_defense\": " + sanctDefense + ","
    ctx += "\"sanctuary_pop\": " + sanctPop + ","
    ctx += "\"red_rocket_defense\": " + rrDefense + ","
    ctx += "\"red_rocket_pop\": " + rrPop + ","
    ctx += "\"abernathy_defense\": " + abDefense + ","
    ctx += "\"abernathy_pop\": " + abPop
    ctx += "}"
    return ctx
EndFunction

; ── Helpers ───────────────────────────────────────────────────────────────────

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

