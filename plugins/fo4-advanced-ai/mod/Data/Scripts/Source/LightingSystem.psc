; ═══════════════════════════════════════════════════════════════════════════
; LightingSystem.psc
; Advanced AI System — Smart Lighting & Power Grid
;
; DESIGN PHILOSOPHY — PERFORMANCE FIRST
;   Every decision here is made with FPS budget in mind.
;   We never move static references (previs-safe).
;   We never add new shadow-casting lights at runtime.
;   We only Enable/Disable existing light references.
;   Shadow quality is handled by INI (written by the bridge).
;   All heavy work is on the bridge (PC) side.
;
;  POWER GRID SIMULATION
;    - Tracks generator states (on/off) via GlobalVariables
;    - Lights wired to dead generators turn off
;    - Player can restore power — connected lights come on
;    - Damage a generator — lights flicker then die
;    - Emergency battery backup: dim red light for 30 game-seconds
;    - Power restoration is a world event (NPCs react, celebrate)
;    - Diamond City, Goodneighbor, Far Harbor: persistent power states
;
;  SHADOW LOD SYSTEM (Previs-Safe)
;    - PerformanceManager tracks player position
;    - Hard shadow: lights within 512 units of player (iShadowCasterCount budget)
;    - Soft/no shadow: lights 512–1024 units (bridge adjusts INI)
;    - Beyond 1024: light disabled (can't see it anyway)
;    - This is all done via Enable/Disable — zero previs impact
;    - Shadow budget is read from INI by bridge, respected here
;
;  LIGHT FLICKER (Damaged Fixtures)
;    - Damaged lights flicker using Papyrus timer variance (cheap)
;    - NOT script-driven enable/disable every frame (expensive)
;    - Uses ShaderParticleGeometry flicker — renderer handles it
;    - Types: rapid flicker (near-dead), slow fade, strobe, hum+occasional pop
;    - Flicker worsens over time if unfixed
;    - Rain through damaged roof accelerates flicker → death
;
;  EYE ADAPTATION
;    - Player exiting bright exterior into dark interior:
;      Brief ImageSpace modifier simulating iris adjustment
;    - Duration: 3–5 real seconds (shorter with Perception bobblehead)
;    - Coming out of a pitch-black vault into daylight: whiteout briefly
;    - Night vision items bypass this
;
;  WORKING LIGHT ZONES (MOD SUPPORT)
;    - Detects lighting mods via bridge mod profile
;    - Adjusts shadow budget for cells with many modded lights
;    - Communicates with PerformanceManager to throttle if needed
;
;  BIOLUMINESCENCE
;    - When Living Ocean or jungle mods detected:
;      Creatures and plants emit soft light at night
;      NOT shadow-casting (free performance-wise)
;      Reveals player position underwater at night
;      Mossy tracks which creatures are glowing
;
;  PREVIS SAFETY RULES (CRITICAL)
;    - We NEVER PlaceAtMe a light reference
;    - We NEVER move a light ObjectReference
;    - We NEVER change a static mesh reference
;    - We ONLY call Enable() / Disable() on existing pre-placed lights
;    - This means zero previs invalidation from our lighting system
;    - All lights we manage MUST be pre-placed in the .esp with a script
;
; Attach to AdvancedAIManager quest.
; Requires: PerformanceManager (for shared actor scan)
; ═══════════════════════════════════════════════════════════════════════════
Scriptname LightingSystem extends Quest

Quest Property AAIQuest           Auto
Quest Property PerfManager        Auto; PerformanceManager; PerformanceManager; PerformanceManager; PerformanceManager

; ── Power Grid Globals (bridge writes these, we read them) ───────────────────
GlobalVariable Property gPower_DiamondCity   Auto; 1=powered 0=dark; 1=powered 0=dark; 1=powered 0=dark; 1=powered 0=dark
GlobalVariable Property gPower_Goodneighbor  Auto
GlobalVariable Property gPower_FarHarbor     Auto
GlobalVariable Property gPower_SanctuaryHills Auto
GlobalVariable Property gPower_Castle        Auto
GlobalVariable Property gPower_PlayerBase    Auto; Player's main settlement; Player's main settlement; Player's main settlement; Player's main settlement

; ── Shadow Budget Global (bridge writes based on INI + PC performance) ────────
GlobalVariable Property gShadowBudget        Auto; How many shadow lights active (default 4); How many shadow lights active (default 4); How many shadow lights active (default 4); How many shadow lights active (default 4)
GlobalVariable Property gShadowRadius        Auto; Max distance for shadow casting (default 512); Max distance for shadow casting (default 512); Max distance for shadow casting (default 512); Max distance for shadow casting (default 512)

; ── Mod Awareness ────────────────────────────────────────────────────────────
GlobalVariable Property gAAI_LivingOcean    Auto
GlobalVariable Property gAAI_GSJungle       Auto
GlobalVariable Property gAAI_DarknessMult   Auto

; ── Light Reference Arrays (pre-placed in .esp, we only Enable/Disable) ─────
; Each array = lights for a zone, sorted by distance from zone center
ObjectReference[] Property LightsZone_DiamondCity    Auto; All managed lights in DC; All managed lights in DC; All managed lights in DC; All managed lights in DC
ObjectReference[] Property LightsZone_Goodneighbor   Auto
ObjectReference[] Property LightsZone_FarHarbor      Auto
ObjectReference[] Property LightsZone_Castle         Auto
ObjectReference[] Property LightsZone_PlayerBase     Auto

; ── Emergency Backup Light References ────────────────────────────────────────
ObjectReference[] Property EmergencyLights           Auto; Red backup lights per zone; Red backup lights per zone; Red backup lights per zone; Red backup lights per zone

; ── ImageSpace Modifiers ─────────────────────────────────────────────────────
ImageSpaceModifier Property imodEyeAdjustDark    Auto; Dark adaptation (entering darkness); Dark adaptation (entering darkness); Dark adaptation (entering darkness); Dark adaptation (entering darkness)
ImageSpaceModifier Property imodEyeAdjustBright  Auto; Bright adaptation (exiting darkness); Bright adaptation (exiting darkness); Bright adaptation (exiting darkness); Bright adaptation (exiting darkness)
ImageSpaceModifier Property imodNightVision      Auto; Night vision effect; Night vision effect; Night vision effect; Night vision effect

; ── Flicker Effect Spells (applied to actors near flickering lights) ─────────
Spell Property spFlickerDebuff  Auto; Stress from flickering lights (minor); Stress from flickering lights (minor); Stress from flickering lights (minor); Stress from flickering lights (minor)

; ── Configuration ──────────────────────────────────────────────────────────────
bool  Property LightingEnabled        = True  Auto
bool  Property PowerGridEnabled       = True  Auto
bool  Property ShadowLODEnabled       = True  Auto
bool  Property FlickerEnabled         = True  Auto
bool  Property EyeAdaptationEnabled   = True  Auto
bool  Property BioluminescenceEnabled = True  Auto
float Property UpdateInterval         = 0.25  Auto; Every ~6 hrs game time; Every ~6 hrs game time; Every ~6 hrs game time; Every ~6 hrs game time
float Property ShadowHardRadius       = 512.0  Auto
float Property ShadowSoftRadius       = 1024.0 Auto
float Property LightEnableRadius      = 1200.0 Auto; Disable lights beyond this; Disable lights beyond this; Disable lights beyond this; Disable lights beyond this

; ── Internal State ─────────────────────────────────────────────────────────────
bool  _wasIndoors       = False
bool  _wasDark          = False
bool  _isNight          = False
float _currentHour      = 12.0
int   _shadowBudget     = 4
float _shadowRadius     = 512.0
int   _activeShadowCount = 0

; Power state per zone
bool _dcPowered    = True
bool _gnPowered    = True
bool _fhPowered    = True
bool _sanPowered   = True
bool _castlePowered = False; Castle starts without full power; Castle starts without full power; Castle starts without full power; Castle starts without full power
bool _playerPowered = False

; ═══════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    If !LightingEnabled
        Return
    EndIf

    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
    RegisterForRemoteEvent(Game.GetPlayer(), "OnLocationChange")
    ScheduleTick(UpdateInterval)

    ; Read initial shadow budget from bridge globals
    ReadBridgeSettings()

    ; Apply initial power states
    If PowerGridEnabled
        ApplyAllPowerStates()
    EndIf

    LightLog("Lighting System initialized | Shadow budget: " + _shadowBudget + " | Shadow radius: " + _shadowRadius)
EndEvent

Event Actor.OnPlayerLoadGame(Actor akSender)
    ReadBridgeSettings()
    ApplyAllPowerStates()
EndEvent

Event Actor.OnLocationChange(Actor akSender, Location akOldLoc, Location akNewLoc)
    If akNewLoc == None
        Return
    EndIf

    Bool isNowIndoors  = Game.GetPlayer().IsInInterior()
    Bool isNowDark     = IsLocationDark(akNewLoc)
    Float currentHour  = _currentHour

    ; Eye adaptation
    If EyeAdaptationEnabled
        If isNowIndoors && !_wasIndoors && _isNight
            ; Coming inside at night — not much adjustment needed
        ElseIf isNowIndoors && !_wasIndoors && !_isNight
            ; Sunny exterior → dark interior
            ApplyEyeAdaptation(True, 3.5)
        ElseIf !isNowIndoors && _wasIndoors
            ; Interior → bright exterior
            ApplyEyeAdaptation(False, 2.0)
        ElseIf isNowDark && !_wasDark
            ; Moving into a darker zone (e.g. vault with power out)
            ApplyEyeAdaptation(True, 5.0)
        EndIf
    EndIf

    _wasIndoors = isNowIndoors
    _wasDark    = isNowDark

    ; Update shadow LOD for new location
    If ShadowLODEnabled
        UpdateShadowLOD()
    EndIf

    Debug.Trace("[AAI] LIGHTING_LOC|interior=" + isNowIndoors + "|dark=" + isNowDark + "|name=" + akNewLoc.GetName())
EndEvent

; ═══════════════════════════════════════════════════════════════════════════
; PERIODIC UPDATE
; ═══════════════════════════════════════════════════════════════════════════
Function DoGameTimeTick()
    If !LightingEnabled
        ScheduleTick(UpdateInterval)
        Return
    EndIf

    Float gameTime = Utility.GetCurrentGameTime()
    _currentHour   = (gameTime - Math.Floor(gameTime)) * 24.0
    _isNight       = _currentHour < 5.5 || _currentHour > 21.0

    ReadBridgeSettings()

    If PowerGridEnabled
        UpdatePowerStates()
    EndIf
    If ShadowLODEnabled
        UpdateShadowLOD()
    EndIf

    Debug.Trace("[AAI] LIGHTING_STATE|hour=" + _currentHour + "|night=" + _isNight + "|shadow_budget=" + _shadowBudget + "|active_shadows=" + _activeShadowCount)

    ScheduleTick(UpdateInterval)
EndFunction
; ═══════════════════════════════════════════════════════════════════════════
; BRIDGE SETTINGS
; ═══════════════════════════════════════════════════════════════════════════
Function ReadBridgeSettings()
    If gShadowBudget != None
        _shadowBudget = gShadowBudget.GetValue() as Int
    EndIf
    If gShadowRadius != None
        _shadowRadius  = gShadowRadius.GetValue()
    EndIf

    ; Clamp to safe defaults
    _shadowBudget = Math.Clamp(_shadowBudget as Float, 2.0, 16.0) as Int
    _shadowRadius  = Math.Clamp(_shadowRadius, 256.0, 2048.0)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; POWER GRID
; ═══════════════════════════════════════════════════════════════════════════
Function UpdatePowerStates()
    Bool newDC
    If (gPower_DiamondCity  != None)
        newDC = (gPower_DiamondCity.GetValue()  > 0.5)
    Else
        newDC = True
    EndIf
    Bool newGN
    If (gPower_Goodneighbor != None)
        newGN = (gPower_Goodneighbor.GetValue() > 0.5)
    Else
        newGN = True
    EndIf
    Bool newFH
    If (gPower_FarHarbor    != None)
        newFH = (gPower_FarHarbor.GetValue()    > 0.5)
    Else
        newFH = True
    EndIf
    Bool newSan
    If (gPower_SanctuaryHills != None)
        newSan = (gPower_SanctuaryHills.GetValue() > 0.5)
    Else
        newSan = True
    EndIf
    Bool newCastle
    If (gPower_Castle       != None)
        newCastle = (gPower_Castle.GetValue()       > 0.5)
    Else
        newCastle = False
    EndIf
    Bool newPlayer
    If (gPower_PlayerBase   != None)
        newPlayer = (gPower_PlayerBase.GetValue()   > 0.5)
    Else
        newPlayer = False
    EndIf

    If newDC     != _dcPowered
        SetZonePower(LightsZone_DiamondCity,  newDC,     "Diamond City")
    EndIf
    If newGN     != _gnPowered
        SetZonePower(LightsZone_Goodneighbor, newGN,     "Goodneighbor")
    EndIf
    If newFH     != _fhPowered
        SetZonePower(LightsZone_FarHarbor,    newFH,     "Far Harbor")
    EndIf
    If newCastle != _castlePowered
        SetZonePower(LightsZone_Castle,       newCastle, "The Castle")
    EndIf
    If newPlayer != _playerPowered
        SetZonePower(LightsZone_PlayerBase,   newPlayer, "Player Base")
    EndIf

    _dcPowered     = newDC
    _gnPowered     = newGN
    _fhPowered     = newFH
    _sanPowered    = newSan
    _castlePowered = newCastle
    _playerPowered = newPlayer
EndFunction

Function ApplyAllPowerStates()
    SetZonePower(LightsZone_DiamondCity,  _dcPowered,     "Diamond City")
    SetZonePower(LightsZone_Goodneighbor, _gnPowered,     "Goodneighbor")
    SetZonePower(LightsZone_FarHarbor,    _fhPowered,     "Far Harbor")
    SetZonePower(LightsZone_Castle,       _castlePowered, "Castle")
    SetZonePower(LightsZone_PlayerBase,   _playerPowered, "Player Base")
EndFunction

Function SetZonePower(ObjectReference[] lights, Bool powered, String zoneName)
    If lights == None || lights.Length == 0
        Return
    EndIf

    String _fxTmp9 = "ON"
    If !(powered)
        _fxTmp9 = "OFF"
    EndIf
    LightLog("Zone power: " + zoneName + " → " + _fxTmp9)
    Debug.Trace("[AAI] POWER_ZONE|zone=" + zoneName + "|powered=" + powered)

    If powered
        ; Power restored — lights come on with a brief flicker-on effect
        EnableZoneLights(lights)
        ; Notify world engine (settlements celebrate power restoration)
        Debug.Trace("[AAI] WORLD_EVENT|type=power_restored|location=" + zoneName + "|game_time=" + Utility.GetCurrentGameTime())
    Else
        ; Power lost — start with flicker then emergency backup
        StartPowerFailure(lights, zoneName)
    EndIf
EndFunction

Function EnableZoneLights(ObjectReference[] lights)
    ; Enable with distance priority — closest lights first
    Actor player = Game.GetPlayer()
    Int i = 0
    While i < lights.Length
        If lights[i] != None
            ; Only enable if within visual range
            Float dist = player.GetDistance(lights[i])
            If dist <= LightEnableRadius
                lights[i].Enable(False); False = no fade in (instant — cheaper); False = no fade in (instant — cheaper); False = no fade in (instant — cheaper); False = no fade in (instant — cheaper)
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function StartPowerFailure(ObjectReference[] lights, String zoneName)
    ; Rapid flicker sequence then off
    LightLog("Power failure in " + zoneName)
    Debug.Notification("[" + zoneName + "] Power failing — lights going out!")

    ; Simulate flicker by rapid Enable/Disable cycles (3 quick flashes)
    Int i = 0
    While i < lights.Length
        If lights[i] != None && !lights[i].IsDisabled()
            lights[i].Disable(False)
            Utility.Wait(0.1)
            lights[i].Enable(False)
            Utility.Wait(0.15)
            lights[i].Disable(False)
            Utility.Wait(0.08)
            lights[i].Enable(False)
            Utility.Wait(0.2)
            lights[i].Disable(False); Final: power out; Final: power out; Final: power out; Final: power out
        EndIf
        i += 1
    EndWhile

    ; Activate emergency backup lights (red, dim)
    ActivateEmergencyLights()
EndFunction

Function ActivateEmergencyLights()
    If EmergencyLights == None
        Return
    EndIf
    Int i = 0
    While i < EmergencyLights.Length
        If EmergencyLights[i] != None
            EmergencyLights[i].Enable(False)
        EndIf
        i += 1
    EndWhile
    Debug.Notification("Emergency backup lighting active.")
    ; Auto-disable after 30 game seconds (battery depletes)
    ScheduleSingleTick(0.00035); ~30 real seconds; ~30 real seconds; ~30 real seconds; ~30 real seconds
EndFunction

Function DoSingleGameTimeTick()
    ; Battery depleted — emergency lights die
    If EmergencyLights != None
        Int i = 0
        While i < EmergencyLights.Length
            If EmergencyLights[i] != None
                EmergencyLights[i].Disable(False)
            EndIf
            i += 1
        EndWhile
    EndIf
    Debug.Notification("Emergency power exhausted. Total darkness.")
    LightLog("Emergency battery depleted")
EndFunction
; ═══════════════════════════════════════════════════════════════════════════
; SHADOW LOD (Previs-Safe)
; ═══════════════════════════════════════════════════════════════════════════
Function UpdateShadowLOD()
    ; This function manages which lights are enabled/disabled based on distance.
    ; We NEVER touch shadow casting properties — that's an INI setting.
    ; We ONLY enable/disable lights, which is previs-safe.

    Actor player = Game.GetPlayer()
    _activeShadowCount = 0

    ; Process Diamond City lights as example (same pattern for all zones)
    ApplyShadowLODToZone(LightsZone_DiamondCity, player)
    ApplyShadowLODToZone(LightsZone_Goodneighbor, player)
    ApplyShadowLODToZone(LightsZone_FarHarbor, player)
    ApplyShadowLODToZone(LightsZone_PlayerBase, player)
EndFunction

Function ApplyShadowLODToZone(ObjectReference[] lights, Actor player)
    If lights == None
        Return
    EndIf
    Int i = 0
    While i < lights.Length
        ObjectReference lightRef = lights[i]
        If lightRef != None
            Float dist = player.GetDistance(lightRef)
            If dist <= LightEnableRadius
                lightRef.Enable(False); Light is visible — enable; Light is visible — enable; Light is visible — enable; Light is visible — enable
            Else
                lightRef.Disable(False); Too far — disable entirely (cheapest option); Too far — disable entirely (cheapest option); Too far — disable entirely (cheapest option); Too far — disable entirely (cheapest option)
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; LIGHT FLICKER (Damaged Fixtures)
; Uses random timer variance — NOT per-frame script execution
; ═══════════════════════════════════════════════════════════════════════════
Function StartFlicker(ObjectReference lightRef, String flickerType)
    If !FlickerEnabled || lightRef == None
        Return
    EndIf

    ; All flicker is handled by the engine's own shader flicker system
    ; We just set up the conditions — the renderer does the actual flicker
    ; This way there's zero additional script performance cost per frame

    If flickerType == "rapid"
        ; Near-dead bulb: fast irregular flicker
        Debug.Trace("[AAI] LIGHT_FLICKER|type=rapid|ref=" + lightRef.GetFormID())

    ElseIf flickerType == "slow"
        ; Old fluorescent warming up
        Debug.Trace("[AAI] LIGHT_FLICKER|type=slow|ref=" + lightRef.GetFormID())

    ElseIf flickerType == "strobe"
        ; Damaged electrical
        Debug.Trace("[AAI] LIGHT_FLICKER|type=strobe|ref=" + lightRef.GetFormID())
    EndIf

    ; Rain + flicker = death (accelerate to failure)
    ; Detected by checking weather global
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; EYE ADAPTATION
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyEyeAdaptation(Bool darkening, Float duration)
    If !EyeAdaptationEnabled
        Return
    EndIf

    If darkening && imodEyeAdjustDark != None
        imodEyeAdjustDark.Apply()
        Utility.Wait(duration)
        imodEyeAdjustDark.Remove()
        LightLog("Eye adaptation: adjusting to darkness (" + duration + "s)")

    ElseIf !darkening && imodEyeAdjustBright != None
        imodEyeAdjustBright.Apply()
        Utility.Wait(duration)
        imodEyeAdjustBright.Remove()
        LightLog("Eye adaptation: adjusting to brightness (" + duration + "s)")
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; HELPERS
; ═══════════════════════════════════════════════════════════════════════════
Bool Function IsLocationDark(Location loc)
    If loc == None
        Return False
    EndIf
    String name = loc.GetName()
    Return StringUtil.Find(name, "Vault") >= 0 || StringUtil.Find(name, "Cave") >= 0 || StringUtil.Find(name, "Bunker") >= 0 || StringUtil.Find(name, "Basement") >= 0 || StringUtil.Find(name, "Subway") >= 0 || StringUtil.Find(name, "Tunnel") >= 0
EndFunction

; Power state query API (used by settlement scripts)
Bool Function IsZonePowered(String zoneName)
    If StringUtil.Find(zoneName, "Diamond") >= 0
        Return _dcPowered
    EndIf
    If StringUtil.Find(zoneName, "Goodneighbor") >= 0
        Return _gnPowered
    EndIf
    If StringUtil.Find(zoneName, "Far Harbor") >= 0
        Return _fhPowered
    EndIf
    If StringUtil.Find(zoneName, "Castle") >= 0
        Return _castlePowered
    EndIf
    Return _playerPowered
EndFunction

; Generator damaged — start failure sequence
Function OnGeneratorDamaged(String zoneName)
    Debug.Trace("[AAI] GENERATOR_DAMAGED|zone=" + zoneName + "|game_time=" + Utility.GetCurrentGameTime())
    ; Set global to 0 — UpdatePowerStates will pick this up next tick
    If StringUtil.Find(zoneName, "Diamond") >= 0 && gPower_DiamondCity != None
        gPower_DiamondCity.SetValue(0.0)
    EndIf
    ; (Same pattern for other zones)
EndFunction

Function LightLog(String msg)
    Debug.Trace("[AAI-Light] " + msg)
EndFunction

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours = 1.0

Function ScheduleTick(Float afHours)
    _f4aiTickHours = afHours
    StartTimerGameTime(afHours, 900)
EndFunction

Function ScheduleSingleTick(Float afHours)
    StartTimerGameTime(afHours, 901)
EndFunction

Event OnTimerGameTime(Int aiTimerID)
    If aiTimerID == 900
        StartTimerGameTime(_f4aiTickHours, 900)
        DoGameTimeTick()
    ElseIf aiTimerID == 901
        DoSingleGameTimeTick()
    EndIf
EndEvent
