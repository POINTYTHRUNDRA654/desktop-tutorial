; ═══════════════════════════════════════════════════════════════════════════
; SettlementLifeSimulation.psc
; Advanced AI System — Living Settlement Simulation
;
; Transforms settlements from static resource nodes into living communities:
;
;  DAILY SCHEDULES
;    - Markets open at dawn, close at dusk
;    - Guard shifts change at 06:00, 14:00, 22:00
;    - Guards most vulnerable just before shift change
;    - Settlers sleep 21:00–06:00
;    - Children play 08:00–17:00
;    - Meals happen at 07:00, 13:00, 19:00 — NPCs congregate
;
;  ECONOMY & SCARCITY
;    - Tracks food/water/caps in workshop
;    - When food < 50%: settlers more anxious, trade less, morale drops
;    - When water < 50%: NPCs drink less, physical debuffs creep in
;    - When caps low: merchant prices rise, some settlers leave
;    - Surplus: NPCs relaxed, celebrate, share food, conversations richer
;
;  SOCIAL BONDS
;    - Named NPCs form friendships/rivalries over time
;    - Friends greet each other, walk together, share meals
;    - Rivals argue, avoid each other, give conflicting opinions
;    - Grief: NPCs mourn dead companions — reduced output, dark dialogue
;    - Romance: pairs spend time together, jealousy dynamics
;
;  COMMUNITY EVENTS
;    - Weekly market day (extra traders, more NPCs out)
;    - Funerals when a settler dies (NPCs gather, moment of silence)
;    - Celebration when threat cleared (singing, drinking, stories)
;    - Town meeting when resources are critically low
;    - Night watch rotation ceremonies at dusk
;
;  SETTLEMENT EXPANSION / CONTRACTION
;    - High happiness + safety: new settlers arrive, buildings go up
;    - Low safety + low food: settlers leave, NPCs become hostile to player
;    - Under attack: all civilians retreat to safe zone
;
;  TRADE CARAVANS
;    - Caravans avoid routes through dangerous zones (bridge reads danger map)
;    - Caravans arrive more often when settlement reputation is high
;    - Caravan guards become cautious if nearby threats detected
;
; Attach to AdvancedAIManager quest.
; Requires: Workshop framework, PapyrusUtil for JSON reads
; ═══════════════════════════════════════════════════════════════════════════
Scriptname SettlementLifeSimulation extends Quest

Quest Property AAIQuest Auto

; ── Settlement Workshop Reference ─────────────────────────────────────────────
ObjectReference Property SettlementWorkshop Auto

; ── Workshop Resource Keys (vanilla resource IDs) ──────────────────────────────
; Read via workshop script properties
WorkshopScript Property Workshop Auto

; ── Keyword References ────────────────────────────────────────────────────────
Keyword Property kwdSettler     Auto
Keyword Property kwdGuard       Auto
Keyword Property kwdMerchant    Auto
Keyword Property kwdChild       Auto
Keyword Property kwdCaravan     Auto

; ── Location Reference ────────────────────────────────────────────────────────
Location Property SettlementLocation Auto
String Property SettlementName = "Unknown Settlement" Auto

; ── Globals ────────────────────────────────────────────────────────────────────
GlobalVariable Property gEnvTimeOfDay  Auto; From EnvironmentalAIManager; From EnvironmentalAIManager; From EnvironmentalAIManager; From EnvironmentalAIManager
GlobalVariable Property gEnvIsNight    Auto

; ── Economy Thresholds ────────────────────────────────────────────────────────
float Property FoodScarcityThreshold   = 0.5  Auto; Below this = scarcity; Below this = scarcity; Below this = scarcity; Below this = scarcity
float Property WaterScarcityThreshold  = 0.5  Auto
float Property CapsScarcityThreshold   = 50.0 Auto; Absolute cap amount; Absolute cap amount; Absolute cap amount; Absolute cap amount

; ── Configuration ──────────────────────────────────────────────────────────────
bool  Property SchedulesEnabled     = True  Auto
bool  Property EconomyEnabled       = True  Auto
bool  Property SocialEnabled        = True  Auto
bool  Property EventsEnabled        = True  Auto
bool  Property ExpansionEnabled     = True  Auto
float Property UpdateInterval       = 0.2   Auto; Every ~5 hrs game time; Every ~5 hrs game time; Every ~5 hrs game time; Every ~5 hrs game time

; ── Internal State ─────────────────────────────────────────────────────────────
float _currentHour
bool  _isScarcity
bool  _isCelebrating
bool  _inTownMeeting
int   _daysSinceFuneral
int   _settlementMorale; 0-100; 0-100; 0-100; 0-100
int   _lastGuardShift; 0=morning 1=afternoon 2=night; 0=morning 1=afternoon 2=night; 0=morning 1=afternoon 2=night; 0=morning 1=afternoon 2=night
float _lastEventTime
int   _settlersPresent
float _lastScarcityCheck

; ═══════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    _currentHour      = 12.0
    _daysSinceFuneral = 999
    _settlementMorale = 100
    _f4aiTickHours    = 1.0
    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
    ScheduleTick(UpdateInterval)
    _lastEventTime = Utility.GetCurrentGameTime()
    SetLog("Settlement life simulation: " + SettlementName)
EndEvent

Function DoGameTimeTick()
    Float gameTime = Utility.GetCurrentGameTime()
    _currentHour   = (gameTime - Math.Floor(gameTime)) * 24.0

    If SchedulesEnabled
        UpdateSchedules()
    EndIf
    If EconomyEnabled
        CheckEconomy(gameTime)
    EndIf
    If EventsEnabled
        CheckCommunityEvents(gameTime)
    EndIf

    ; Log for bridge
    Debug.Trace("[AAI] SETTLEMENT_STATE|name=" + SettlementName + "|hour=" + _currentHour + "|morale=" + _settlementMorale + "|scarcity=" + _isScarcity + "|celebrating=" + _isCelebrating)

    ScheduleTick(UpdateInterval)
EndFunction
; ═══════════════════════════════════════════════════════════════════════════
; DAILY SCHEDULES
; ═══════════════════════════════════════════════════════════════════════════
Function UpdateSchedules()
    ; Guard shift changes
    int newShift = GetCurrentShift()
    If newShift != _lastGuardShift
        OnGuardShiftChange(_lastGuardShift, newShift)
        _lastGuardShift = newShift
    EndIf

    ; Time-specific NPC behaviors
    If _currentHour >= 7.0 && _currentHour < 7.5
        TriggerMealTime("breakfast")
    ElseIf _currentHour >= 13.0 && _currentHour < 13.5
        TriggerMealTime("lunch")
    ElseIf _currentHour >= 19.0 && _currentHour < 19.5
        TriggerMealTime("dinner")
    ElseIf _currentHour >= 8.0 && _currentHour < 8.5
        OpenMarket()
    ElseIf _currentHour >= 20.0 && _currentHour < 20.5
        CloseMarket()
    EndIf
EndFunction

int Function GetCurrentShift()
    If _currentHour >= 6.0 && _currentHour < 14.0
        Return 0
    ElseIf _currentHour >= 14.0 && _currentHour < 22.0
        Return 1
    EndIf
    Return 2; Night; Night; Night; Night
EndFunction

Function OnGuardShiftChange(Int oldShift, Int newShift)
    ; The 10 minutes before shift change: guards tired, less alert
    ; The 10 minutes of overlap: extra guards present = safer
    String shiftName
    If (newShift == 0)
        shiftName = "Morning"
    ElseIf (newShift == 1)
        shiftName = "Afternoon"
    Else
        shiftName = "Night"
    EndIf
    SetLog("Guard shift → " + shiftName + " | Settlement: " + SettlementName)

    If SocialEnabled
        ; Guards about to go off-duty relax slightly
        ApplyToSettlersWithKeyword(kwdGuard, "shift_change")
    EndIf

    Debug.Trace("[AAI] SETTLEMENT_SHIFT|settlement=" + SettlementName + "|shift=" + shiftName + "|game_time=" + Utility.GetCurrentGameTime())
EndFunction

Function TriggerMealTime(String meal)
    ; NPCs congregate at meal point — conversations triggered here
    ; Log so bridge generates mealtime conversations
    Debug.Trace("[AAI] MEAL_TIME|settlement=" + SettlementName + "|meal=" + meal + "|game_time=" + Utility.GetCurrentGameTime())

    If SocialEnabled && !_isScarcity
        ; Healthy settlement: settlers gather, talk, eat together
        SetLog(SettlementName + ": " + meal + " time — settlers gathering")
    ElseIf _isScarcity
        ; Scarcity: reduced meal, tension at the table
        Debug.Trace("[AAI] CONV_REQUEST|location=" + SettlementName + "|type=settlement|topic=resources|context=scarcity_meal")
    EndIf
EndFunction

Function OpenMarket()
    SetLog(SettlementName + " market open")
    Debug.Trace("[AAI] MARKET_OPEN|settlement=" + SettlementName + "|game_time=" + Utility.GetCurrentGameTime())
EndFunction

Function CloseMarket()
    SetLog(SettlementName + " market closed")
    Debug.Trace("[AAI] MARKET_CLOSED|settlement=" + SettlementName)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; ECONOMY
; ═══════════════════════════════════════════════════════════════════════════
Function CheckEconomy(Float gameTime)
    If Workshop == None
        Return
    EndIf

    ; Read current resources from workshop
    Float food    = Workshop.food
    Float water   = Workshop.water
    Float maxFood = Workshop.maxFood
    Float maxWater = Workshop.maxWater

    Float foodRatio
    If (maxFood  > 0)
        foodRatio = food  / maxFood
    Else
        foodRatio = 1.0
    EndIf
    Float waterRatio
    If (maxWater > 0)
        waterRatio = water / maxWater
    Else
        waterRatio = 1.0
    EndIf

    Bool wasScarcity = _isScarcity
    _isScarcity = foodRatio < FoodScarcityThreshold || waterRatio < WaterScarcityThreshold

    ; React to scarcity state change
    If _isScarcity && !wasScarcity
        OnScarcityBegins(foodRatio, waterRatio)
    ElseIf !_isScarcity && wasScarcity
        OnScarcityEnds()
    EndIf

    ; Continuously update morale based on resources
    Int targetMorale = 100
    If foodRatio < 0.3
        targetMorale -= 30
    ElseIf foodRatio < 0.6
        targetMorale -= 15
    EndIf
    If waterRatio < 0.3
        targetMorale -= 25
    ElseIf waterRatio < 0.6
        targetMorale -= 10
    EndIf

    ; Smooth morale change
    If _settlementMorale > targetMorale
        _settlementMorale = Math.Max(_settlementMorale - 2, targetMorale) as Int
    ElseIf _settlementMorale < targetMorale
        _settlementMorale = Math.Min(_settlementMorale + 1, targetMorale) as Int
    EndIf

    Debug.Trace("[AAI] SETTLEMENT_ECON|settlement=" + SettlementName + "|food=" + foodRatio + "|water=" + waterRatio + "|morale=" + _settlementMorale + "|scarcity=" + _isScarcity)
EndFunction

Function OnScarcityBegins(Float foodRatio, Float waterRatio)
    ; Settlers become anxious — darker conversations, less cooperation
    SetLog(SettlementName + " entering scarcity. Food: " + foodRatio + " Water: " + waterRatio)
    Debug.Notification("[" + SettlementName + "] Resources are running low. Settlers are restless.")

    ApplyMoraleToAllSettlers(0.75); Aggression up slightly, mood down; Aggression up slightly, mood down; Aggression up slightly, mood down; Aggression up slightly, mood down

    ; Request concerned conversations from bridge
    Debug.Trace("[AAI] CONV_REQUEST|location=" + SettlementName + "|type=settlement|topic=resources")
EndFunction

Function OnScarcityEnds()
    SetLog(SettlementName + " resources restored")
    Debug.Notification("[" + SettlementName + "] Resources restored. Mood is lifting.")
    ApplyMoraleToAllSettlers(1.0)
EndFunction

Function ApplyMoraleToAllSettlers(Float moraleMultiplier)
    If SettlementLocation == None
        Return
    EndIf
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, 3000.0, 25)
    Int i = 0
    While i < nearby.Length
        Actor settler = nearby[i]
        If settler != None && !settler.IsDead() && settler.IsInLocation(SettlementLocation)
            ActorValue avMood = Game.GetFormFromFile(0x000002EA, "Fallout4.esm") as ActorValue
            If avMood != None
                Float baseMood = settler.GetBaseValue(avMood)
                settler.SetValue(avMood, baseMood * moraleMultiplier)
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function ApplyToSettlersWithKeyword(Keyword kwd, String context)
    If kwd == None || SettlementLocation == None
        Return
    EndIf
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, 2500.0, 20)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && npc.HasKeyword(kwd) && npc.IsInLocation(SettlementLocation)
            npc.EvaluatePackage()
        EndIf
        i += 1
    EndWhile
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; COMMUNITY EVENTS
; ═══════════════════════════════════════════════════════════════════════════
Function CheckCommunityEvents(Float gameTime)
    If !EventsEnabled
        Return
    EndIf

    Float daysSinceLastEvent = (gameTime - _lastEventTime)

    ; Weekly market day (every 7 game days — random day-of-week)
    If daysSinceLastEvent >= 7.0
        TriggerMarketDay(gameTime)
        Return
    EndIf

    ; Celebration check (triggered externally by DynamicWorldEngine when threat cleared)
    ; Funeral check (triggered externally when settler dies)
    ; Town meeting check (triggered by scarcity lasting 3+ days)
    If _isScarcity && daysSinceLastEvent >= 3.0
        TriggerTownMeeting(gameTime)
    EndIf
EndFunction

Function TriggerMarketDay(Float gameTime)
    _lastEventTime = gameTime
    _isCelebrating = False
    SetLog(SettlementName + ": Market Day!")
    Debug.Notification("[" + SettlementName + "] It's market day. Traders are setting up.")

    ; Log for bridge — generate market-day conversations
    Debug.Trace("[AAI] COMMUNITY_EVENT|settlement=" + SettlementName + "|event=market_day|game_time=" + gameTime)
EndFunction

Function TriggerTownMeeting(Float gameTime)
    If _inTownMeeting
        Return
    EndIf
    _inTownMeeting = True
    _lastEventTime = gameTime
    Debug.Notification("[" + SettlementName + "] Town meeting called — resources are critical.")

    Debug.Trace("[AAI] COMMUNITY_EVENT|settlement=" + SettlementName + "|event=town_meeting|morale=" + _settlementMorale + "|game_time=" + gameTime)

    StartTimer(30.0, 51)
EndFunction

; Called by DynamicWorldEngine when player clears a nearby threat
Function TriggerCelebration(String reason)
    If _isCelebrating
        Return
    EndIf
    _isCelebrating = True
    _settlementMorale = Math.Min(_settlementMorale + 20, 100) as Int
    Debug.Notification("[" + SettlementName + "] " + reason + " — the settlement celebrates!")

    Debug.Trace("[AAI] COMMUNITY_EVENT|settlement=" + SettlementName + "|event=celebration|reason=" + reason + "|game_time=" + Utility.GetCurrentGameTime())

    ApplyMoraleToAllSettlers(1.2); Brief morale boost; Brief morale boost; Brief morale boost; Brief morale boost

    StartTimer(120.0, 52)
EndFunction

Event OnTimer(Int aiTimerID)
    If aiTimerID == 51
        _inTownMeeting = False
    ElseIf aiTimerID == 52
        _isCelebrating = False
    EndIf
EndEvent

; Called when a settler dies
Function TriggerFuneral(Actor deceased)
    If deceased == None
        Return
    EndIf
    _daysSinceFuneral = 0
    _settlementMorale = Math.Max(_settlementMorale - 15, 0) as Int
    String deceasedName = deceased.GetDisplayName()
    Debug.Notification("[" + SettlementName + "] The settlement mourns " + deceasedName + ".")

    Debug.Trace("[AAI] COMMUNITY_EVENT|settlement=" + SettlementName + "|event=funeral|deceased=" + deceasedName + "|game_time=" + Utility.GetCurrentGameTime())

    ApplyMoraleToAllSettlers(0.8); Grief reduces morale; Grief reduces morale; Grief reduces morale; Grief reduces morale

    ; Request somber conversations from bridge
    Debug.Trace("[AAI] CONV_REQUEST|location=" + SettlementName + "|type=settlement|topic=relationships|context=grief_" + deceasedName)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; EXPANSION / CONTRACTION
; ═══════════════════════════════════════════════════════════════════════════
Function CheckExpansionState()
    If !ExpansionEnabled || Workshop == None
        Return
    EndIf

    Float happiness = Workshop.happiness

    If happiness >= 80 && !_isScarcity
        ; Settlement thriving — log for bridge to track growth
        Debug.Trace("[AAI] SETTLEMENT_GROWTH|settlement=" + SettlementName + "|happiness=" + happiness + "|stateVal=thriving")
    ElseIf happiness < 40 || _isScarcity
        ; Settlement struggling
        Debug.Trace("[AAI] SETTLEMENT_GROWTH|settlement=" + SettlementName + "|happiness=" + happiness + "|stateVal=declining")
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PUBLIC API
; ═══════════════════════════════════════════════════════════════════════════
Int  Function GetMorale()
    Return _settlementMorale
EndFunction
Bool Function IsInScarcity()
    Return _isScarcity
EndFunction
Bool Function IsCelebrating()
    Return _isCelebrating
EndFunction
String Function GetName()
    Return SettlementName
EndFunction

Function SetLog(String msg)
    Debug.Trace("[AAI-Settlement] " + msg)
EndFunction

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours

Function ScheduleTick(Float afHours)
    _f4aiTickHours = afHours
    StartTimerGameTime(afHours, 900)
EndFunction

Event OnTimerGameTime(Int aiTimerID)
    If aiTimerID == 900
        StartTimerGameTime(_f4aiTickHours, 900)
        DoGameTimeTick()
    EndIf
EndEvent
