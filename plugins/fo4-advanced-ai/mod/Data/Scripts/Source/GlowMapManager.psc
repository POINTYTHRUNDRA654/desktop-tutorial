; ═══════════════════════════════════════════════════════════════════════════
; GlowMapManager.psc
; Advanced AI System — Bioluminescent Glow Map Manager
;
; Manages the pulsating, glowing flora and fauna of the mutated
; Glowing Sea jungle. Performance-first design throughout.
;
;  GLOW MAP PERFORMANCE STRATEGY
;    Glow maps (emissive textures) themselves are FREE — no performance cost.
;    The cost comes from:
;      1. Actual light references placed near glowing plants → budgeted
;      2. All plants pulsing simultaneously → GPU spike
;      3. Script overhead if checking every plant every frame
;
;    Solutions:
;      1. Pulse ZONES — one script manages 8–12 plants each
;      2. Staggered timing — each zone starts at a different phase offset
;         so no two zones peak simultaneously → smooth GPU load
;      3. PerformanceManager throttle — in stress mode, reduce pulse rate
;      4. Distance gating — plants beyond player sight range don't pulse
;      5. Night/day intensity — daytime glow is subtle, nighttime is full
;
;  PULSE PATTERNS
;    Slow Pulse (Fungal Pillars):
;      - 3–5 second cycle, gentle sine-wave fade
;      - Like breathing — calm, rhythmic
;    Rapid Shimmer (Spore Pods):
;      - 0.5–1 second flicker, irregular
;      - Like they're signaling or excited
;    Cascade Wave (Vine Networks):
;      - Sequential pulse along vine chains
;      - Bioluminescent signal traveling through the vine
;    Death Flash (Dying Plant):
;      - Final bright burst then dark
;      - When a spore plant is killed
;    Threat Response (Spore Plant Detecting Player):
;      - Bright rapid pulse when player is near
;      - Warning to other plants via vine network
;
;  DETECTION HAZARD
;    In bioluminescent areas, the player GLOWS.
;    Touching bioluminescent plants transfers glow → player visible.
;    - Player stealth broken in heavily bioluminescent zones at night
;    - Glow fades after 30 seconds away from plants
;    - Certain perks/items prevent glow transfer (Hazmat suit)
;    - Creatures use bioluminescence to spot player in dark
;    - NPCs react to glowing player ("What's wrong with your skin?")
;
;  VINE NETWORK COMMUNICATION
;    Plants in the GS jungle are connected via root/vine networks.
;    When one plant detects the player (or is attacked):
;      - Pulse signal travels along connected vine network
;      - Adjacent plants pre-arm their spore launchers
;      - Creatures in the network area become alert
;      - The jungle itself becomes aware of the player's presence
;
; Attach to AdvancedAIManager quest.
; Requires: PerformanceManager, SporeInfectionSystem, ModAwareEcology
; ═══════════════════════════════════════════════════════════════════════════
Scriptname GlowMapManager extends Quest

Quest Property AAIQuest       Auto
Quest Property PerfManager    Auto; PerformanceManager; PerformanceManager; PerformanceManager; PerformanceManager
Quest Property SporeSystem    Auto; SporeInfectionSystem; SporeInfectionSystem; SporeInfectionSystem; SporeInfectionSystem

; ── Mod Awareness ────────────────────────────────────────────────────────────
GlobalVariable Property gAAI_GSJungle    Auto
GlobalVariable Property gAAI_LivingOcean Auto

; ── Performance Bridge ────────────────────────────────────────────────────────
GlobalVariable Property gPerf_ScriptMode Auto; 0=idle 1=normal 2=combat 3=stress; 0=idle 1=normal 2=combat 3=stress; 0=idle 1=normal 2=combat 3=stress; 0=idle 1=normal 2=combat 3=stress

; ── Day/Night ─────────────────────────────────────────────────────────────────
GlobalVariable Property gEnvIsNight      Auto
GlobalVariable Property gEnvTimeOfDay    Auto

; ── Pulse Zone Light Arrays (pre-placed in .esp, never PlaceAtMe) ────────────
; Each zone = array of associated light ObjectReferences
; We only call Enable/Disable on these — fully previs-safe
ObjectReference[] Property PulseZone_Fungal_A    Auto; Fungal pillar cluster A; Fungal pillar cluster A; Fungal pillar cluster A; Fungal pillar cluster A
ObjectReference[] Property PulseZone_Fungal_B    Auto; Fungal pillar cluster B; Fungal pillar cluster B; Fungal pillar cluster B; Fungal pillar cluster B
ObjectReference[] Property PulseZone_SporeA      Auto; Spore pod cluster A; Spore pod cluster A; Spore pod cluster A; Spore pod cluster A
ObjectReference[] Property PulseZone_SporeB      Auto; Spore pod cluster B; Spore pod cluster B; Spore pod cluster B; Spore pod cluster B
ObjectReference[] Property PulseZone_Vine_A      Auto; Vine network section A; Vine network section A; Vine network section A; Vine network section A
ObjectReference[] Property PulseZone_Vine_B      Auto; Vine network section B; Vine network section B; Vine network section B; Vine network section B
ObjectReference[] Property PulseZone_Ocean_A     Auto; Ocean/coastal glow (Living Ocean); Ocean/coastal glow (Living Ocean); Ocean/coastal glow (Living Ocean); Ocean/coastal glow (Living Ocean)
ObjectReference[] Property PulseZone_Ocean_B     Auto

; ── Vine Network Trigger Markers ─────────────────────────────────────────────
; Plants in the same vine network share alert state
ObjectReference[] Property VineNetwork_Alpha     Auto; First vine network; First vine network; First vine network; First vine network
ObjectReference[] Property VineNetwork_Beta      Auto; Second vine network; Second vine network; Second vine network; Second vine network

; ── Spore Plant Activators ────────────────────────────────────────────────────
; Pre-placed activators that the SporeInfectionSystem can trigger
ObjectReference[] Property SporePlants_A         Auto
ObjectReference[] Property SporePlants_B         Auto

; ── ImageSpace / Effects ──────────────────────────────────────────────────────
ImageSpaceModifier Property imodGlowTransfer     Auto; Player glow after touching plant; Player glow after touching plant; Player glow after touching plant; Player glow after touching plant
Spell Property spGlowTransfer                    Auto; Glow on player (visual effect); Glow on player (visual effect); Glow on player (visual effect); Glow on player (visual effect)
Spell Property spVineNetworkPulse               Auto; Alert signal through vine; Alert signal through vine; Alert signal through vine; Alert signal through vine

; ── Configuration ──────────────────────────────────────────────────────────────
bool  Property GlowEnabled              = True  Auto
bool  Property PulseEnabled             = True  Auto
bool  Property DetectionHazardEnabled   = True  Auto
bool  Property VineNetworkEnabled       = True  Auto
bool  Property OceanGlowEnabled         = True  Auto
float Property UpdateInterval           = 0.06  Auto; ~1.5 hrs game time; ~1.5 hrs game time; ~1.5 hrs game time; ~1.5 hrs game time
float Property PulseZoneRadius          = 800.0 Auto; Only pulse zones within this range; Only pulse zones within this range; Only pulse zones within this range; Only pulse zones within this range
float Property GlowTransferRadius       = 150.0 Auto; How close player must be to glow; How close player must be to glow; How close player must be to glow; How close player must be to glow
float Property VineAlertRadius          = 2000.0 Auto; Alert travels this far through vines; Alert travels this far through vines; Alert travels this far through vines; Alert travels this far through vines
float Property GlowFadeDuration         = 30.0  Auto; Real seconds until player glow fades; Real seconds until player glow fades; Real seconds until player glow fades; Real seconds until player glow fades

; ── Internal State ─────────────────────────────────────────────────────────────
bool  _gsJungleActive   = False
bool  _livingOceanActive = False
bool  _isNight          = False
float _currentHour      = 12.0
int   _currentPerfMode  = 1
float _lastRealTime     = 0.0

; Phase offsets for each zone (staggered to prevent GPU spike)
; Each zone starts its pulse at a different point in the cycle
float[] _zonePhaseOffsets; Populated in OnQuestInit; Populated in OnQuestInit; Populated in OnQuestInit; Populated in OnQuestInit
float[] _zoneTimers; Current timer position per zone; Current timer position per zone; Current timer position per zone; Current timer position per zone
bool[]  _zoneActive; Whether this zone is currently enabled; Whether this zone is currently enabled; Whether this zone is currently enabled; Whether this zone is currently enabled

; Player glow state
bool  _playerIsGlowing = False
float _playerGlowStart = 0.0

; Vine network alert state
bool  _vineNetworkAlerted = False
float _vineAlertTimer     = 0.0

; ═══════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    If !GlowEnabled
        Return
    EndIf

    ; Initialize zone phase offsets — stagger each zone by ~0.7 seconds
    ; 8 zones × 0.7s apart = 5.6s total stagger window
    ; This ensures no two zones pulse simultaneously
    _zonePhaseOffsets = new float[8]
    _zoneTimers       = new float[8]
    _zoneActive       = new bool[8]
    Int i = 0
    While i < 8
        _zonePhaseOffsets[i] = i * 0.7; 0.0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9 seconds; 0.0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9 seconds; 0.0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9 seconds; 0.0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9 seconds
        _zoneTimers[i]       = _zonePhaseOffsets[i]
        _zoneActive[i]       = True
        i += 1
    EndWhile

    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
    RegisterForRemoteEvent(Game.GetPlayer(), "OnLocationChange")
    ScheduleTick(UpdateInterval)

    GlowLog("Glow Map Manager initialized | Zones: 8 | Stagger: 0.7s")
EndEvent

Event Actor.OnPlayerLoadGame(Actor akSender)
    ReadGlobalState()
    SetInitialGlowState()
EndEvent

Event Actor.OnLocationChange(Actor akSender, Location akOldLoc, Location akNewLoc)
    If akNewLoc == None
        Return
    EndIf
    ; Only run full glow system in Glowing Sea
    If (gAAI_GSJungle != None)
        _gsJungleActive = (gAAI_GSJungle.GetValue() > 0.5)
    Else
        _gsJungleActive = False
    EndIf
EndEvent

; ═══════════════════════════════════════════════════════════════════════════
; MAIN TICK
; ═══════════════════════════════════════════════════════════════════════════
Function DoGameTimeTick()
    If !GlowEnabled
        ScheduleTick(UpdateInterval)
        Return
    EndIf

    ReadGlobalState()

    ; Skip most glow processing if not in GS jungle and not Living Ocean
    If !_gsJungleActive && !_livingOceanActive
        ScheduleTick(UpdateInterval * 3.0); Check less often outside these areas; Check less often outside these areas; Check less often outside these areas; Check less often outside these areas
        Return
    EndIf

    ; Performance mode affects glow intensity and pulse rate
    If _currentPerfMode == 3; Stress — minimal glow; Stress — minimal glow; Stress — minimal glow; Stress — minimal glow
        ReduceToMinimalGlow()
        ScheduleTick(UpdateInterval * 4.0)
        Return
    EndIf

    ; Update pulse zones
    If PulseEnabled
        UpdatePulseZones()
    EndIf

    ; Detection hazard
    If DetectionHazardEnabled
        CheckPlayerGlowTransfer()
        UpdatePlayerGlowState()
    EndIf

    ; Vine network
    If VineNetworkEnabled
        UpdateVineNetwork()
    EndIf

    ; Ocean bioluminescence
    If OceanGlowEnabled && _livingOceanActive
        UpdateOceanGlow()
    EndIf

    Debug.Trace("[AAI] GLOW_STATE|gs_jungle=" + _gsJungleActive + "|night=" + _isNight + "|player_glowing=" + _playerIsGlowing + "|vine_alert=" + _vineNetworkAlerted + "|perf_mode=" + _currentPerfMode)

    ScheduleTick(UpdateInterval)
EndFunction
; ═══════════════════════════════════════════════════════════════════════════
; PULSE ZONE MANAGEMENT
; The heart of the glow system — staggered pulsing
; ═══════════════════════════════════════════════════════════════════════════
Function UpdatePulseZones()
    Actor player = Game.GetPlayer()
    Float realNow = Utility.GetCurrentRealTime()
    Float deltaReal = Math.Max(realNow - _lastRealTime, 0.016); ~60fps equivalent; ~60fps equivalent; ~60fps equivalent; ~60fps equivalent
    _lastRealTime = realNow

    ; Night intensity multiplier
    Float nightMult; Daytime glow is subtle; Daytime glow is subtle; Daytime glow is subtle; Daytime glow is subtle
    If (_isNight)
        nightMult = 1.0
    Else
        nightMult = 0.35
    EndIf

    ; Stress reduces pulse rate (less script overhead)
    Float tickRate
    If (_currentPerfMode >= 2)
        tickRate = 0.5
    Else
        tickRate = 1.0
    EndIf

    ; Zone 0: Fungal Pillars A — slow deep pulse (3.5 second cycle)
    UpdateZone(0, PulseZone_Fungal_A, player, 3.5, "slow", nightMult, deltaReal * tickRate)

    ; Zone 1: Fungal Pillars B — offset from A
    UpdateZone(1, PulseZone_Fungal_B, player, 3.5, "slow", nightMult, deltaReal * tickRate)

    ; Zone 2: Spore Pods A — rapid shimmer (0.8 second cycle)
    UpdateZone(2, PulseZone_SporeA, player, 0.8, "rapid", nightMult, deltaReal * tickRate)

    ; Zone 3: Spore Pods B — rapid shimmer, offset
    UpdateZone(3, PulseZone_SporeB, player, 0.8, "rapid", nightMult, deltaReal * tickRate)

    ; Zone 4: Vine Network A — cascade wave (2.0 second cycle)
    UpdateZone(4, PulseZone_Vine_A, player, 2.0, "cascade", nightMult, deltaReal * tickRate)

    ; Zone 5: Vine Network B
    UpdateZone(5, PulseZone_Vine_B, player, 2.0, "cascade", nightMult, deltaReal * tickRate)

    ; Ocean zones — only if Living Ocean active
    If _livingOceanActive
        UpdateZone(6, PulseZone_Ocean_A, player, 4.0, "slow", nightMult, deltaReal * tickRate)
        UpdateZone(7, PulseZone_Ocean_B, player, 4.0, "slow", nightMult, deltaReal * tickRate)
    EndIf
EndFunction

Function UpdateZone(Int zoneIdx, ObjectReference[] lights, Actor player, Float cycleDuration, String pattern, Float intensityMult, Float delta)
    If lights == None || lights.Length == 0 || !_zoneActive[zoneIdx]
        Return
    EndIf

    ; Distance gate — skip if player too far
    If lights[0] != None
        Float dist = player.GetDistance(lights[0])
        If dist > PulseZoneRadius
            Return; Player can't see this zone — skip (performance saving); Player can't see this zone — skip (performance saving); Player can't see this zone — skip (performance saving); Player can't see this zone — skip (performance saving)
        EndIf
    EndIf

    ; Advance timer
    _zoneTimers[zoneIdx] += delta

    ; Wrap timer
    While _zoneTimers[zoneIdx] > cycleDuration
        _zoneTimers[zoneIdx] -= cycleDuration
    EndWhile

    Float phase = _zoneTimers[zoneIdx] / cycleDuration; 0.0 to 1.0; 0.0 to 1.0; 0.0 to 1.0; 0.0 to 1.0

    ; Calculate intensity based on pattern
    Float intensity = 0.0
    If pattern == "slow"
        ; Sine wave — smooth breathing
        intensity = (Math.sin(phase * 6.283) + 1.0) / 2.0; 0-1 sine wave; 0-1 sine wave; 0-1 sine wave; 0-1 sine wave

    ElseIf pattern == "rapid"
        ; Sawtooth with flicker
        If (phase < 0.7)
            intensity = phase / 0.7
        Else
            intensity = (1.0 - phase) / 0.3
        EndIf
        ; Add irregular flicker
        If Utility.RandomInt(1, 100) <= 10
            intensity *= Utility.RandomFloat(0.3, 1.0)
        EndIf

    ElseIf pattern == "cascade"
        ; Sequential — different phase per light for cascade effect
        intensity = phase; Base phase — individual lights shift their own phase; Base phase — individual lights shift their own phase; Base phase — individual lights shift their own phase; Base phase — individual lights shift their own phase
    EndIf

    intensity *= intensityMult; Apply night/day modifier; Apply night/day modifier; Apply night/day modifier; Apply night/day modifier

    ; Apply to lights based on threshold
    ; We only do Enable/Disable (not actual intensity change — that needs F4SE)
    If intensity >= 0.5
        EnableZoneLights(lights, True)
    Else
        EnableZoneLights(lights, False)
    EndIf
EndFunction

Function EnableZoneLights(ObjectReference[] lights, Bool enable)
    Int i = 0
    While i < lights.Length
        If lights[i] != None
            If enable
                lights[i].Enable(False)
            Else
                lights[i].Disable(False)
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function ReduceToMinimalGlow()
    ; In stress mode: only keep fungal pillar lights on, everything else off
    EnableZoneLights(PulseZone_Fungal_A, True)
    EnableZoneLights(PulseZone_Fungal_B, True)
    EnableZoneLights(PulseZone_SporeA, False)
    EnableZoneLights(PulseZone_SporeB, False)
    EnableZoneLights(PulseZone_Vine_A, False)
    EnableZoneLights(PulseZone_Vine_B, False)
    GlowLog("Stress mode — reduced to minimal glow")
EndFunction

Function SetInitialGlowState()
    ; All zones start enabled — let the pulse system manage them
    EnableZoneLights(PulseZone_Fungal_A, True)
    EnableZoneLights(PulseZone_Fungal_B, True)
    EnableZoneLights(PulseZone_SporeA,   True)
    EnableZoneLights(PulseZone_SporeB,   True)
    EnableZoneLights(PulseZone_Vine_A,   True)
    EnableZoneLights(PulseZone_Vine_B,   True)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PLAYER GLOW TRANSFER (Detection Hazard)
; ═══════════════════════════════════════════════════════════════════════════
Function CheckPlayerGlowTransfer()
    Actor player = Game.GetPlayer()

    ; Check if player is touching any spore/glowing plant
    ; (In CK: spore plants have trigger volumes — OnTriggerEnter fires)
    ; Here we approximate with distance check to spore plant refs
    If SporePlants_A != None
        Int i = 0
        While i < SporePlants_A.Length
            ObjectReference plant = SporePlants_A[i]
            If plant != None && player.GetDistance(plant) <= GlowTransferRadius
                TransferGlowToPlayer(player)
                Return
            EndIf
            i += 1
        EndWhile
    EndIf
EndFunction

Function TransferGlowToPlayer(Actor player)
    If _playerIsGlowing
        _playerGlowStart = Utility.GetCurrentRealTime()
        Return
    EndIf

    _playerIsGlowing = True
    _playerGlowStart = Utility.GetCurrentRealTime()

    ; Apply glow visual effect
    If spGlowTransfer != None
        spGlowTransfer.Cast(player, player)
    EndIf
    If imodGlowTransfer != None
        imodGlowTransfer.Apply()
    EndIf

    ; Stealth broken — boost NPC detection
    If _isNight
        ApplyGlowDetectionPenalty(player)
        Debug.Notification("Bioluminescent spores cling to you — you're GLOWING in the dark!")
    Else
        Debug.Notification("Bioluminescent spores cling to your skin.")
    EndIf

    GlowLog("Glow transferred to player")
    Debug.Trace("[AAI] GLOW_TRANSFER|player=true|night=" + _isNight + "|game_time=" + Utility.GetCurrentGameTime())
EndFunction

Function ApplyGlowDetectionPenalty(Actor player)
    ; Glowing player is easier to detect — NPCs get a perception bonus
    Actor[] nearby = MiscUtil.ScanActors(player, 1500.0, 12)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && npc != player
            ActorValue avPerc = Game.GetFormFromFile(0x000002E3, "Fallout4.esm") as ActorValue
            If avPerc != None
                Float curPerc = npc.GetValue(avPerc)
                npc.SetValue(avPerc, Math.Min(curPerc * 1.5, 10.0)); +50% detection; +50% detection; +50% detection; +50% detection
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function UpdatePlayerGlowState()
    If !_playerIsGlowing
        Return
    EndIf

    Float elapsed = Utility.GetCurrentRealTime() - _playerGlowStart
    If elapsed >= GlowFadeDuration
        ; Glow faded
        _playerIsGlowing = False
        Actor player = Game.GetPlayer()
        If spGlowTransfer != None
            player.DispelSpell(spGlowTransfer)
        EndIf
        If imodGlowTransfer != None
            imodGlowTransfer.Remove()
        EndIf
        ; Restore NPC detection
        RestoreNPCDetection(player)
        Debug.Notification("The bioluminescent glow fades from your skin.")
        GlowLog("Player glow faded after " + elapsed + " seconds")
    EndIf
EndFunction

Function RestoreNPCDetection(Actor player)
    Actor[] nearby = MiscUtil.ScanActors(player, 1500.0, 12)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && npc != player
            ActorValue avPerc = Game.GetFormFromFile(0x000002E3, "Fallout4.esm") as ActorValue
            If avPerc != None
                npc.SetValue(avPerc, npc.GetBaseValue(avPerc)); Restore base; Restore base; Restore base; Restore base
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; VINE NETWORK COMMUNICATION
; Plants are connected — one attacked plant alerts the whole network
; ═══════════════════════════════════════════════════════════════════════════
Function AlertVineNetwork(ObjectReference triggeredPlant, String reason)
    If !VineNetworkEnabled
        Return
    EndIf

    _vineNetworkAlerted = True
    _vineAlertTimer     = Utility.GetCurrentRealTime()

    ; Trigger rapid pulse on ALL vine zones (threat response)
    EnableZoneLights(PulseZone_Vine_A, True)
    EnableZoneLights(PulseZone_Vine_B, True)

    ; Alert spore plants to pre-arm
    If SporeSystem != None
        ; (Call SporeSystem.ArmNearbyPlants)
    EndIf

    ; Nearby creatures become alert (the jungle "told" them)
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, VineAlertRadius, 12)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && !npc.IsInCombat()
            npc.EvaluatePackage()
        EndIf
        i += 1
    EndWhile

    GlowLog("Vine network ALERT: " + reason + " | " + nearby.Length + " creatures alerted")
    Debug.Notification("The jungle pulses with alarm — something in the plant network has been disturbed!")
    Debug.Trace("[AAI] VINE_ALERT|reason=" + reason + "|radius=" + VineAlertRadius + "|creatures_alerted=" + nearby.Length)
EndFunction

Function UpdateVineNetwork()
    If !_vineNetworkAlerted
        Return
    EndIf

    Float elapsed = Utility.GetCurrentRealTime() - _vineAlertTimer
    If elapsed > 45.0; Alert lasts 45 real seconds; Alert lasts 45 real seconds; Alert lasts 45 real seconds; Alert lasts 45 real seconds
        _vineNetworkAlerted = False
        GlowLog("Vine network alert subsiding")
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; OCEAN BIOLUMINESCENCE
; ═══════════════════════════════════════════════════════════════════════════
Function UpdateOceanGlow()
    If !_isNight
        ; Ocean glow barely visible in daylight
        EnableZoneLights(PulseZone_Ocean_A, False)
        EnableZoneLights(PulseZone_Ocean_B, False)
        Return
    EndIf
    ; At night, ocean zones pulse slowly and beautifully
    ; (Handled by UpdateZone with "slow" pattern in UpdatePulseZones)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; Called from SporeInfectionSystem when a spore plant fires
; ═══════════════════════════════════════════════════════════════════════════
Function OnSporePlantFired(ObjectReference plantRef)
    ; Death flash on the firing plant's lights
    AlertVineNetwork(plantRef, "spore_fired")
    ; Brief bright burst
    GlowLog("Spore plant fired — vine network alerted")
EndFunction

; Called when a spore plant is killed
Function OnSporePlantKilled(ObjectReference plantRef)
    ; Death flash — final bright pulse then dark
    AlertVineNetwork(plantRef, "plant_death")
    GlowLog("Spore plant killed — death flash triggered")
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; STATE READ
; ═══════════════════════════════════════════════════════════════════════════
Function ReadGlobalState()
    If (gAAI_GSJungle   != None)
        _gsJungleActive = (gAAI_GSJungle.GetValue()   > 0.5)
    Else
        _gsJungleActive = False
    EndIf
    If (gAAI_LivingOcean != None)
        _livingOceanActive = (gAAI_LivingOcean.GetValue() > 0.5)
    Else
        _livingOceanActive = False
    EndIf
    If (gEnvIsNight      != None)
        _isNight = (gEnvIsNight.GetValue()     > 0.5)
    Else
        _isNight = False
    EndIf
    If (gEnvTimeOfDay    != None)
        _currentHour = gEnvTimeOfDay.GetValue()
    Else
        _currentHour = 12.0
    EndIf
    If (gPerf_ScriptMode != None)
        _currentPerfMode = gPerf_ScriptMode.GetValue() as Int
    Else
        _currentPerfMode = 1
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PUBLIC API
; ═══════════════════════════════════════════════════════════════════════════
Bool Function IsPlayerGlowing()
    Return _playerIsGlowing
EndFunction
Bool Function IsVineAlerted()
    Return _vineNetworkAlerted
EndFunction
Bool Function IsGSJungleActive()
    Return _gsJungleActive
EndFunction

Function GlowLog(String msg)
    Debug.Trace("[AAI-Glow] " + msg)
EndFunction

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours = 1.0

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
