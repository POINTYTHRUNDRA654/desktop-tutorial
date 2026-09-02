; ═══════════════════════════════════════════════════════════════════════════
; SporeInfectionSystem.psc
; Advanced AI System — Spore Plant AI & Infection Mechanics
;
;  SPORE PLANT BEHAVIOR
;    Plants in the Glowing Sea jungle are not passive flora.
;    They sense pressure, heat, and bioluminescent signals through
;    their root network and respond to threats.
;
;    Detection:
;      - Pressure (footstep vibration) triggers within 300 units
;      - Heat signature (running player) detectable at 400 units
;      - Vine network alert → pre-arm at 600 units
;      - GlowMapManager vine signal → all networked plants arm
;
;    Fire behavior:
;      - First shot: warning burst (small spore cloud, low damage)
;      - Second shot (if player stays): full volley
;      - Third shot: calls nearby plants to join
;      - Firing causes vine network alert → whole area wakes up
;
;    Plant types:
;      Sporeling (small):    Low range, single shot, weak infection
;      Spore Stalk (medium): Medium range, accurate, moderate infection
;      Titan Spore (large):  High range, area volley, severe infection
;      Puffball Cluster:     Passive mine — detonates on step
;      Venom Vine:           Melee range, entangle + corrosive
;      Luminescent Shooter:  Night-only, uses bioluminescence to aim
;
;  INFECTION SYSTEM
;    Stage 0 — Exposed (incubation, 0–5 game-minutes, no symptoms)
;    Stage 1 — Mild (5–30 minutes, -1 Perception, minor HP drain 1/sec)
;    Stage 2 — Moderate (30–90 minutes, -2 Perception, -1 Agility,
;                         HP drain 2/sec, vision blur, coughing sounds)
;    Stage 3 — Severe (90–180 minutes, -3 PER, -2 AGI, -2 END,
;                       HP drain 3/sec, hallucinatory visuals,
;                       chance to spread to nearby actors)
;    Stage 4 — Critical (180+ minutes untreated, debilitating,
;                         if untreated for further 60 min: lethal)
;
;  SPORE TYPES
;    Hallucinogenic: Enemies may appear as allies temporarily
;    Paralytic:      Movement speed -50%, action points drain fast
;    Corrosive:      Armor degrades, exposed skin takes extra radiation
;    Radiation:      Rads +5/sec during infection, Glowing Sea levels
;    Blinding:       Gradual vision loss, max blind at Stage 3
;    Infectious:     Spreads to nearby NPCs/creatures at Stage 3+
;    Spore Zombie:   Extreme — creature takes control (Stage 4 only)
;
;  CURE PATHS
;    Antibiotics:       Clears infection at Stage 1-2 completely
;    RadAway:           Reduces radiation spores 1 stage, helps others
;    Antidote Plant:    Rare plant in the jungle that cures all spores
;                       (Irony: the cure is hidden within the danger)
;    Doctor visit:      Removes any infection up to Stage 3
;    Hazmat suit:       Prevents infection entirely while worn
;    Fire:              Burns away spores (used by desperate survivors)
;    Stage 4 only:      Requires antidote plant or specialized cure
;
;  SPREAD TO NPCs
;    At Stage 3, player can spread infection to nearby actors:
;      - Within 200 units
;      - Organic creatures only (not robots, not synths)
;      - Spreads at 20% chance per minute of proximity
;      - Infected NPCs show visual symptoms (stumbling gait, glow eyes)
;      - Infected creature behavior changes (less aggressive, more confused)
;
; Attach to AdvancedAIManager quest.
; Requires: GlowMapManager (for vine network alerts)
; ═══════════════════════════════════════════════════════════════════════════
Scriptname SporeInfectionSystem extends Quest

Quest Property AAIQuest     Auto
GlowMapManager Property GlowManager  Auto; typed so IsVineAlerted/OnSporePlantFired resolve

; ── Spore Plant References ────────────────────────────────────────────────────
ObjectReference[] Property SporePlants_All    Auto; All managed spore plants; All managed spore plants; All managed spore plants; All managed spore plants
Keyword           Property kwdSporePlant      Auto; AAI_SporePlant keyword; AAI_SporePlant keyword; AAI_SporePlant keyword; AAI_SporePlant keyword
Keyword           Property kwdTitanSpore      Auto; Large variant; Large variant; Large variant; Large variant
Keyword           Property kwdPuffball        Auto; Passive mine variant; Passive mine variant; Passive mine variant; Passive mine variant
Keyword           Property kwdVenomVine       Auto; Melee entangle variant; Melee entangle variant; Melee entangle variant; Melee entangle variant
Keyword           Property kwdRobot           Auto; Immune to infection; Immune to infection; Immune to infection; Immune to infection
Keyword           Property kwdSynth           Auto; Immune to infection; Immune to infection; Immune to infection; Immune to infection

; ── Spore Projectile Spells ───────────────────────────────────────────────────
Spell Property spSporeWarning         Auto; Small warning burst; Small warning burst; Small warning burst; Small warning burst
Spell Property spSporeFullVolley      Auto; Full spore cloud; Full spore cloud; Full spore cloud; Full spore cloud
Spell Property spSporeAreaVolley      Auto; Titan Spore AoE burst; Titan Spore AoE burst; Titan Spore AoE burst; Titan Spore AoE burst
Spell Property spPuffballDetonate     Auto; Puffball mine detonation; Puffball mine detonation; Puffball mine detonation; Puffball mine detonation
Spell Property spVenomEntangle        Auto; Venom vine entangle; Venom vine entangle; Venom vine entangle; Venom vine entangle

; ── Infection Effect Spells (one per stage per type) ─────────────────────────
; Hallucinogenic
Spell Property spHallucinate_1        Auto; Mild — slight distortion; Mild — slight distortion; Mild — slight distortion; Mild — slight distortion
Spell Property spHallucinate_2        Auto; Moderate — enemies look friendly; Moderate — enemies look friendly; Moderate — enemies look friendly; Moderate — enemies look friendly
Spell Property spHallucinate_3        Auto; Severe — complete confusion; Severe — complete confusion; Severe — complete confusion; Severe — complete confusion
; Paralytic
Spell Property spParalyze_1           Auto; Mild — slight slow; Mild — slight slow; Mild — slight slow; Mild — slight slow
Spell Property spParalyze_2           Auto; Moderate — major slow; Moderate — major slow; Moderate — major slow; Moderate — major slow
Spell Property spParalyze_3           Auto; Severe — near-immobile; Severe — near-immobile; Severe — near-immobile; Severe — near-immobile
; Corrosive
Spell Property spCorrosive_1          Auto; Mild — minor armor damage; Mild — minor armor damage; Mild — minor armor damage; Mild — minor armor damage
Spell Property spCorrosive_2          Auto; Moderate — significant armor; Moderate — significant armor; Moderate — significant armor; Moderate — significant armor
Spell Property spCorrosive_3          Auto; Severe — armor destroyed; Severe — armor destroyed; Severe — armor destroyed; Severe — armor destroyed
; Radiation
Spell Property spRadSpore_1           Auto; 2 rads/sec; 2 rads/sec; 2 rads/sec; 2 rads/sec
Spell Property spRadSpore_2           Auto; 5 rads/sec; 5 rads/sec; 5 rads/sec; 5 rads/sec
Spell Property spRadSpore_3           Auto; 10 rads/sec (Glowing Sea level); 10 rads/sec (Glowing Sea level); 10 rads/sec (Glowing Sea level); 10 rads/sec (Glowing Sea level)
; Blinding
Spell Property spBlind_1              Auto; Slight visual noise; Slight visual noise; Slight visual noise; Slight visual noise
Spell Property spBlind_2              Auto; Heavy blur; Heavy blur; Heavy blur; Heavy blur
Spell Property spBlind_3              Auto; Near total blindness; Near total blindness; Near total blindness; Near total blindness
; Infectious spread
Spell Property spInfectionSpread      Auto; Applied to nearby actors at Stage 3; Applied to nearby actors at Stage 3; Applied to nearby actors at Stage 3; Applied to nearby actors at Stage 3

; ── Cure Items ────────────────────────────────────────────────────────────────
MiscObject Property itemAntibiotics   Auto
MiscObject Property itemRadAway       Auto
MiscObject Property itemAntidotePlant Auto; Rare cure plant; Rare cure plant; Rare cure plant; Rare cure plant
MiscObject Property itemHazmatSuit    Auto

; ── Visual Effects ─────────────────────────────────────────────────────────────
ImageSpaceModifier Property imodInfection_1   Auto; Mild tint; Mild tint; Mild tint; Mild tint
ImageSpaceModifier Property imodInfection_2   Auto; Moderate blur + tint; Moderate blur + tint; Moderate blur + tint; Moderate blur + tint
ImageSpaceModifier Property imodInfection_3   Auto; Severe distortion; Severe distortion; Severe distortion; Severe distortion
ImageSpaceModifier Property imodInfection_4   Auto; Critical — extreme; Critical — extreme; Critical — extreme; Critical — extreme
Explosion Property expSporeCloud              Auto; Visual spore burst at plant; Visual spore burst at plant; Visual spore burst at plant; Visual spore burst at plant

; ── Configuration ──────────────────────────────────────────────────────────────
bool  Property SporeEnabled            = True  Auto
bool  Property InfectionEnabled        = True  Auto
bool  Property SpreadEnabled           = True  Auto
float Property UpdateInterval          = 0.08  Auto
float Property PlantDetectRadius_Walk  = 300.0 Auto; Passive detection range; Passive detection range; Passive detection range; Passive detection range
float Property PlantDetectRadius_Run   = 450.0 Auto; Running player detected farther; Running player detected farther; Running player detected farther; Running player detected farther
float Property PlantDetectRadius_Vine  = 600.0 Auto; Vine alert pre-arms at this range; Vine alert pre-arms at this range; Vine alert pre-arms at this range; Vine alert pre-arms at this range
float Property InfectionSpreadRadius   = 200.0 Auto; Spread to NPCs radius; Spread to NPCs radius; Spread to NPCs radius; Spread to NPCs radius
float Property SpreadChancePerMinute   = 0.20  Auto; 20% chance per minute; 20% chance per minute; 20% chance per minute; 20% chance per minute

; Infection stage durations in real seconds (30 game-minutes ≈ ~30 real seconds)
float Property Stage0Duration    = 30.0  Auto; Incubation; Incubation; Incubation; Incubation
float Property Stage1Duration    = 180.0 Auto; Mild; Mild; Mild; Mild
float Property Stage2Duration    = 540.0 Auto; Moderate; Moderate; Moderate; Moderate
float Property Stage3Duration    = 1080.0 Auto; Severe; Severe; Severe; Severe
float Property Stage4MaxDuration = 360.0 Auto; Critical → lethal if untreated; Critical → lethal if untreated; Critical → lethal if untreated; Critical → lethal if untreated

; ── Internal State ─────────────────────────────────────────────────────────────
; Player infection state
bool   _playerInfected     = False
String _playerSporeType    = ""; "hallucinogenic" "paralytic" "corrosive" "radiation" "blinding" "infectious"; "hallucinogenic" "paralytic" "corrosive" "radiation" "blinding" "infectious"; "hallucinogenic" "paralytic" "corrosive" "radiation" "blinding" "infectious"; "hallucinogenic" "paralytic" "corrosive" "radiation" "blinding" "infectious"
int    _playerStage        = 0; 0-4; 0-4; 0-4; 0-4
float  _infectionStartTime = 0.0; Real time infection started; Real time infection started; Real time infection started; Real time infection started
float  _stageStartTime     = 0.0; Real time current stage started; Real time current stage started; Real time current stage started; Real time current stage started
bool   _hasMask            = False; Player has hazmat protection; Player has hazmat protection; Player has hazmat protection; Player has hazmat protection

; Plant arming state
int    _armedPlantCount    = 0
float  _lastSpreadCheck    = 0.0

; NPC infection tracking (up to 10 infected NPCs)
Actor[] _infectedNPCs
int[]   _npcStages
float[] _npcInfectionTimes

; ═══════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    If !SporeEnabled
        Return
    EndIf

    _infectedNPCs      = new Actor[10]
    _npcStages         = new int[10]
    _npcInfectionTimes = new float[10]

    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
    RegisterForRemoteEvent(Game.GetPlayer(), "OnItemEquipped")
    RegisterForRemoteEvent(Game.GetPlayer(), "OnItemUnequipped")
    ScheduleTick(UpdateInterval)

    SporeLog("Spore Infection System initialized")
EndEvent

; ═══════════════════════════════════════════════════════════════════════════
; MAIN TICK
; ═══════════════════════════════════════════════════════════════════════════
Function DoGameTimeTick()
    If !SporeEnabled
        ScheduleTick(UpdateInterval)
        Return
    EndIf

    Float realNow = Utility.GetCurrentRealTime()

    ; Update plant detection
    CheckSporePlantDetection()

    ; Update player infection
    If InfectionEnabled && _playerInfected
        UpdatePlayerInfection(realNow)
    EndIf

    ; Spread infection
    If SpreadEnabled && _playerInfected && _playerStage >= 3
        If (realNow - _lastSpreadCheck) >= 60.0; Every real minute; Every real minute; Every real minute; Every real minute
            _lastSpreadCheck = realNow
            AttemptInfectionSpread()
        EndIf
    EndIf

    ; Update NPC infections
    UpdateNPCInfections(realNow)

    ; Log state for bridge
    If _playerInfected
        Debug.Trace("[AAI] SPORE_STATE|infected=true|type=" + _playerSporeType + "|stage=" + _playerStage + "|npc_count=" + CountInfectedNPCs())
    EndIf

    ScheduleTick(UpdateInterval)
EndFunction
; ═══════════════════════════════════════════════════════════════════════════
; PLANT DETECTION & FIRING
; ═══════════════════════════════════════════════════════════════════════════
Function CheckSporePlantDetection()
    If SporePlants_All == None
        Return
    EndIf

    Actor player = Game.GetPlayer()
    Bool playerRunning = (player.IsRunning() || player.IsSprinting())
    Float detectRadius
    If (playerRunning)
        detectRadius = PlantDetectRadius_Run
    Else
        detectRadius = PlantDetectRadius_Walk
    EndIf

    ; Vine network alert increases detection radius
    If GlowManager != None && GlowManager.IsVineAlerted()
        detectRadius = PlantDetectRadius_Vine
    EndIf

    Int i = 0
    While i < SporePlants_All.Length
        ObjectReference plant = SporePlants_All[i]
        If plant != None && !plant.IsDisabled()
            Float dist = player.GetDistance(plant)
            If dist <= detectRadius
                TriggerPlantFire(plant, dist, player)
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function TriggerPlantFire(ObjectReference plant, Float distance, Actor player)
    If _hasMask
        ; Hazmat protection — spores bounce off
        Debug.Notification("Your hazmat suit deflects the spores.")
        Return
    EndIf

    ; Determine plant type and fire accordingly
    Bool isTitan  = kwdTitanSpore != None && plant.HasKeyword(kwdTitanSpore)
    Bool isPuff   = kwdPuffball   != None && plant.HasKeyword(kwdPuffball)

    ; Visual burst effect
    If expSporeCloud != None
        plant.PlaceAtMe(expSporeCloud)
    EndIf

    ; Alert vine network
    If GlowManager != None
        GlowManager.OnSporePlantFired(plant)
    EndIf

    If isPuff
        ; Puffball: immediate AoE detonation
        If spPuffballDetonate != None
            spPuffballDetonate.Cast(plant, player)
        EndIf
        InfectActor(player, GetRandomSporeType(), distance)
        Debug.Notification("PUFFBALL — spore explosion!")

    ElseIf isTitan
        ; Titan: devastating area volley
        If spSporeAreaVolley != None
            spSporeAreaVolley.Cast(plant, player)
        EndIf
        InfectActor(player, GetRandomSporeType(), distance)
        ; Also fire at nearby NPCs
        Actor[] nearby = MiscUtil.ScanActors(plant, 500.0, 5)
        Int i = 0
        While i < nearby.Length
            Actor npc = nearby[i]
            If npc != None && npc != player && !npc.IsDead()
                InfectNPC(npc, "infectious")
            EndIf
            i += 1
        EndWhile
        Debug.Notification("TITAN SPORE VOLLEY — everyone in range is hit!")

    Else
        ; Standard spore plant: warning shot first
        If distance > 200.0 && spSporeWarning != None
            spSporeWarning.Cast(plant, player)
            Debug.Notification("A spore cloud erupts near you — back away!")
            InfectActor(player, GetRandomSporeType(), distance)
        ElseIf spSporeFullVolley != None
            spSporeFullVolley.Cast(plant, player)
            InfectActor(player, GetRandomSporeType(), distance)
            Debug.Notification("Spores SATURATE the air! You've breathed them in.")
        EndIf
    EndIf
EndFunction

String Function GetRandomSporeType()
    Int roll = Utility.RandomInt(1, 100)
    If roll <= 20
        Return "hallucinogenic"
    ElseIf roll <= 40
        Return "paralytic"
    ElseIf roll <= 55
        Return "corrosive"
    ElseIf roll <= 70
        Return "radiation"
    ElseIf roll <= 85
        Return "blinding"
    EndIf
    Return "infectious"
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; INFECT ACTOR (Player)
; ═══════════════════════════════════════════════════════════════════════════
Function InfectActor(Actor akTarget, String sporeType, Float distance)
    If !InfectionEnabled
        Return
    EndIf

    If akTarget == Game.GetPlayer()
        If _playerInfected
            ; Already infected — check if this is a worse type
            If GetSporeTypeSeverity(sporeType) > GetSporeTypeSeverity(_playerSporeType)
                OverridePlayerInfection(sporeType)
            EndIf
            Return
        EndIf

        _playerInfected    = True
        _playerSporeType   = sporeType
        _playerStage       = 0
        _infectionStartTime = Utility.GetCurrentRealTime()
        _stageStartTime    = _infectionStartTime

        ShowInfectionStageEffect(0)
        Debug.Notification("[INFECTION] You've been infected with " + sporeType + " spores. " + "Symptoms will begin in " + Stage0Duration + " seconds. Find a cure.")
        SporeLog("Player infected: " + sporeType)
        Debug.Trace("[AAI] SPORE_INFECT|target=player|type=" + sporeType + "|distance=" + distance + "|game_time=" + Utility.GetCurrentGameTime())
    Else
        InfectNPC(akTarget, sporeType)
    EndIf
EndFunction

Function OverridePlayerInfection(String newType)
    ; Clear old infection effects
    ClearInfectionEffects(Game.GetPlayer())
    _playerSporeType = newType
    _playerStage     = Math.Max(_playerStage - 1, 1) as Int; Compound but don't reset; Compound but don't reset; Compound but don't reset; Compound but don't reset
    ApplyStageEffects(Game.GetPlayer(), _playerStage)
    Debug.Notification("[INFECTION] A new spore type compounds your infection: " + newType)
EndFunction

Int Function GetSporeTypeSeverity(String stype)
    If stype == "radiation"
        Return 5
    EndIf
    If stype == "infectious"
        Return 4
    EndIf
    If stype == "corrosive"
        Return 3
    EndIf
    If stype == "paralytic"
        Return 2
    EndIf
    If stype == "hallucinogenic"
        Return 2
    EndIf
    If stype == "blinding"
        Return 1
    EndIf
    Return 0
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; INFECTION PROGRESSION
; ═══════════════════════════════════════════════════════════════════════════
Function UpdatePlayerInfection(Float realNow)
    Float elapsed = realNow - _stageStartTime
    Int nextStage = _playerStage

    If _playerStage == 0 && elapsed >= Stage0Duration
        nextStage = 1
    ElseIf _playerStage == 1 && elapsed >= Stage1Duration
        nextStage = 2
    ElseIf _playerStage == 2 && elapsed >= Stage2Duration
        nextStage = 3
    ElseIf _playerStage == 3 && elapsed >= Stage3Duration
        nextStage = 4
    ElseIf _playerStage == 4 && elapsed >= Stage4MaxDuration
        ; Critical and untreated — lethal outcome
        OnInfectionLethal()
        Return
    EndIf

    If nextStage != _playerStage
        ProgressToStage(nextStage)
    EndIf
EndFunction

Function ProgressToStage(Int newStage)
    Actor player = Game.GetPlayer()
    ClearInfectionEffects(player); Remove previous stage effects; Remove previous stage effects; Remove previous stage effects; Remove previous stage effects

    _playerStage    = newStage
    _stageStartTime = Utility.GetCurrentRealTime()

    ApplyStageEffects(player, newStage)
    ShowInfectionStageEffect(newStage)

    String stageLabel = ""
    If newStage == 1
        stageLabel = "[INFECTION - MILD] Symptoms beginning."
    ElseIf newStage == 2
        stageLabel = "[INFECTION - MODERATE] You're getting worse. Find a cure."
    ElseIf newStage == 3
        stageLabel = "[INFECTION - SEVERE] Critical state. You may infect others."
    ElseIf newStage == 4
        stageLabel = "[INFECTION - CRITICAL] You are dying. Find the antidote plant NOW."
    EndIf

    Debug.Notification(stageLabel)
    SporeLog("Infection progressed to Stage " + newStage + " (" + _playerSporeType + ")")
    Debug.Trace("[AAI] SPORE_STAGE|stage=" + newStage + "|type=" + _playerSporeType + "|game_time=" + Utility.GetCurrentGameTime())
EndFunction

Function ApplyStageEffects(Actor akTarget, Int stage)
    If stage == 0
        Return
    EndIf

    ; Apply type-specific stage spell
    Spell spToApply = None
    If _playerSporeType == "hallucinogenic"
        If stage == 1
            spToApply = spHallucinate_1
        ElseIf stage == 2
            spToApply = spHallucinate_2
        ElseIf stage >= 3
            spToApply = spHallucinate_3
        EndIf
    ElseIf _playerSporeType == "paralytic"
        If stage == 1
            spToApply = spParalyze_1
        ElseIf stage == 2
            spToApply = spParalyze_2
        ElseIf stage >= 3
            spToApply = spParalyze_3
        EndIf
    ElseIf _playerSporeType == "corrosive"
        If stage == 1
            spToApply = spCorrosive_1
        ElseIf stage == 2
            spToApply = spCorrosive_2
        ElseIf stage >= 3
            spToApply = spCorrosive_3
        EndIf
    ElseIf _playerSporeType == "radiation"
        If stage == 1
            spToApply = spRadSpore_1
        ElseIf stage == 2
            spToApply = spRadSpore_2
        ElseIf stage >= 3
            spToApply = spRadSpore_3
        EndIf
    ElseIf _playerSporeType == "blinding"
        If stage == 1
            spToApply = spBlind_1
        ElseIf stage == 2
            spToApply = spBlind_2
        ElseIf stage >= 3
            spToApply = spBlind_3
        EndIf
    EndIf

    If spToApply != None
        spToApply.Cast(akTarget, akTarget)
    EndIf

    ; Universal HP drain by stage — handled by the spell's magic effect, not scripted per-tick
EndFunction

Function ShowInfectionStageEffect(Int stage)
    If stage == 0
        Return
    EndIf
    ImageSpaceModifier imod = None
    If stage == 1
        imod = imodInfection_1
    ElseIf stage == 2
        imod = imodInfection_2
    ElseIf stage == 3
        imod = imodInfection_3
    ElseIf stage == 4
        imod = imodInfection_4
    EndIf
    If imod != None
        imod.Apply()
    EndIf
EndFunction

Function ClearInfectionEffects(Actor akTarget)
    ; Remove all infection spells
    Spell[] spells = new Spell[12]
    spells[0]  = spHallucinate_1
    spells[1]  = spHallucinate_2
    spells[2]  = spHallucinate_3
    spells[3]  = spParalyze_1
    spells[4]  = spParalyze_2
    spells[5]  = spParalyze_3
    spells[6]  = spCorrosive_1
    spells[7]  = spRadSpore_1
    spells[8]  = spRadSpore_2
    spells[9]  = spRadSpore_3
    spells[10] = spBlind_1
    spells[11] = spBlind_3

    Int i = 0
    While i < spells.Length
        If spells[i] != None
            akTarget.DispelSpell(spells[i])
        EndIf
        i += 1
    EndWhile

    ; Remove imagespace
    If imodInfection_1 != None
        imodInfection_1.Remove()
    EndIf
    If imodInfection_2 != None
        imodInfection_2.Remove()
    EndIf
    If imodInfection_3 != None
        imodInfection_3.Remove()
    EndIf
    If imodInfection_4 != None
        imodInfection_4.Remove()
    EndIf
EndFunction

Function OnInfectionLethal()
    ; Stage 4 untreated — lethal
    Debug.Notification("[INFECTION - FATAL] The spore infection claims you.")
    Actor player = Game.GetPlayer()
    ActorValue avHP = Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue
    If avHP != None
        player.SetValue(avHP, 0.0)
    EndIf
    ClearPlayerInfection()
    SporeLog("Infection lethal — player died")
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; INFECTION SPREAD TO NPCs
; ═══════════════════════════════════════════════════════════════════════════
Function AttemptInfectionSpread()
    If _playerStage < 3
        Return
    EndIf

    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, InfectionSpreadRadius, 6)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && npc != player
            Bool isImmune = (kwdRobot != None && npc.HasKeyword(kwdRobot)) || (kwdSynth != None && npc.HasKeyword(kwdSynth))
            If !isImmune
                If Utility.RandomFloat(0.0, 1.0) <= SpreadChancePerMinute
                    InfectNPC(npc, _playerSporeType)
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function InfectNPC(Actor npc, String sporeType)
    ; Find empty NPC slot
    Int i = 0
    While i < 10
        If _infectedNPCs[i] == None || _infectedNPCs[i] == npc
            _infectedNPCs[i]      = npc
            _npcStages[i]         = 1; NPCs start at Stage 1 (no incubation); NPCs start at Stage 1 (no incubation); NPCs start at Stage 1 (no incubation); NPCs start at Stage 1 (no incubation)
            _npcInfectionTimes[i] = Utility.GetCurrentRealTime()

            ; Apply Stage 1 effect to NPC
            If spSporeFullVolley != None
                spSporeFullVolley.Cast(npc, npc)
            EndIf

            ; Infected NPC behavior: confused, stumbling
            ActorValue avAggr = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
            If avAggr != None
                npc.SetValue(avAggr, Math.Max(npc.GetValue(avAggr) - 30.0, 0.0))
            EndIf
            npc.EvaluatePackage()

            SporeLog("NPC infected: " + npc.GetDisplayName() + " (" + sporeType + ")")
            Debug.Trace("[AAI] SPORE_NPC|npc=" + npc.GetDisplayName() + "|type=" + sporeType + "|game_time=" + Utility.GetCurrentGameTime())
            Return
        EndIf
        i += 1
    EndWhile
EndFunction

Function UpdateNPCInfections(Float realNow)
    Int i = 0
    While i < 10
        Actor npc = _infectedNPCs[i]
        If npc != None
            If npc.IsDead()
                _infectedNPCs[i] = None
            Else
                Float elapsed = realNow - _npcInfectionTimes[i]

                ; NPCs progress faster (less resistance than player)
                If _npcStages[i] == 1 && elapsed > 60.0
                    _npcStages[i] = 2
                ElseIf _npcStages[i] == 2 && elapsed > 180.0
                    _npcStages[i] = 3
                ElseIf _npcStages[i] == 3 && elapsed > 300.0
                    ; NPC dies or recovers
                    If Utility.RandomInt(1, 100) <= 60
                        npc.SetValue(Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue, 0.0)
                        SporeLog("NPC died from infection: " + npc.GetDisplayName())
                    EndIf
                    _infectedNPCs[i] = None
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Int Function CountInfectedNPCs()
    Int count = 0
    Int i = 0
    While i < 10
        If _infectedNPCs[i] != None && !_infectedNPCs[i].IsDead()
            count += 1
        EndIf
        i += 1
    EndWhile
    Return count
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; CURE SYSTEM
; ═══════════════════════════════════════════════════════════════════════════
Event Actor.OnItemEquipped(Actor akSender, Form akBaseObject, ObjectReference akReference)
    If akSender != Game.GetPlayer()
        Return
    EndIf

    ; Check for hazmat protection
    If itemHazmatSuit != None && akBaseObject == itemHazmatSuit as Form
        _hasMask = True
        Debug.Notification("Hazmat suit sealed — spore protection active.")
        SporeLog("Hazmat suit equipped — immune to spores")
    EndIf
EndEvent

Event Actor.OnItemUnequipped(Actor akSender, Form akBaseObject, ObjectReference akReference)
    If akSender != Game.GetPlayer()
        Return
    EndIf
    If itemHazmatSuit != None && akBaseObject == itemHazmatSuit as Form
        _hasMask = False
        Debug.Notification("Hazmat suit removed — spore exposure risk restored.")
    EndIf
EndEvent

; Called when player uses an antibiotics/cure item
Function OnCureItemUsed(Form itemUsed)
    If !_playerInfected
        Return
    EndIf

    String cureType = ""
    If itemAntidotePlant != None && itemUsed == itemAntidotePlant as Form
        cureType = "antidote_plant"; Full cure at any stage; Full cure at any stage; Full cure at any stage; Full cure at any stage
    ElseIf itemAntibiotics != None && itemUsed == itemAntibiotics as Form
        cureType = "antibiotics"; Cures Stage 1-2; Cures Stage 1-2; Cures Stage 1-2; Cures Stage 1-2
    ElseIf itemRadAway != None && itemUsed == itemRadAway as Form
        cureType = "radaway"; Helps radiation spores, reduces others 1 stage; Helps radiation spores, reduces others 1 stage; Helps radiation spores, reduces others 1 stage; Helps radiation spores, reduces others 1 stage
    EndIf

    If cureType == "antidote_plant"
        ClearPlayerInfection()
        Debug.Notification("[CURED] The antidote plant neutralizes the infection completely!")

    ElseIf cureType == "antibiotics" && _playerStage <= 2
        ClearPlayerInfection()
        Debug.Notification("[CURED] Antibiotics clear the infection.")

    ElseIf cureType == "antibiotics" && _playerStage >= 3
        ; Too advanced — reduces but doesn't cure
        ProgressToStage(Math.Max(_playerStage - 1, 1) as Int)
        Debug.Notification("[PARTIAL] Antibiotics slow the progression, but the infection is too advanced to cure fully.")

    ElseIf cureType == "radaway" && _playerSporeType == "radiation"
        If _playerStage <= 1
            ClearPlayerInfection()
            Debug.Notification("[CURED] RadAway flushes the radiation spores.")
        Else
            ProgressToStage(Math.Max(_playerStage - 1, 1) as Int)
            Debug.Notification("[REDUCED] RadAway partially neutralizes the radiation spores.")
        EndIf
    EndIf

    SporeLog("Cure used: " + cureType + " | Stage was: " + _playerStage)
EndFunction

Function ClearPlayerInfection()
    Actor player = Game.GetPlayer()
    ClearInfectionEffects(player)
    _playerInfected    = False
    _playerSporeType   = ""
    _playerStage       = 0
    _infectionStartTime = 0.0
    SporeLog("Player infection cleared")
    Debug.Trace("[AAI] SPORE_CURED|game_time=" + Utility.GetCurrentGameTime())
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PUBLIC API
; ═══════════════════════════════════════════════════════════════════════════
Bool   Function IsPlayerInfected()
    Return _playerInfected
EndFunction
String Function GetSporeType()
    Return _playerSporeType
EndFunction
Int    Function GetInfectionStage()
    Return _playerStage
EndFunction
Bool   Function HasHazmatProtection()
    Return _hasMask
EndFunction

Function ArmNearbyPlants()
    ; Called by vine network alert — pre-arm all spore plants
    If (SporePlants_All != None)
        _armedPlantCount = SporePlants_All.Length
    Else
        _armedPlantCount = 0
    EndIf
    SporeLog("Plants armed via vine network: " + _armedPlantCount)
EndFunction

Function SporeLog(String msg)
    Debug.Trace("[AAI-Spore] " + msg)
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
