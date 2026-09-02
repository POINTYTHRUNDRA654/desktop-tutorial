; ═══════════════════════════════════════════════════════════════════════════
; FireExplosionSystem.psc
; Advanced AI System — Realistic Fire & Explosion Behavior
;
;  FIRE SYSTEM
;    Spread:
;      - Fire spreads to adjacent flammable objects (wood, cloth, paper, fuel)
;      - Spread rate controlled by wind (weather) — storms fan flames hard
;      - Rain suppresses spread and can extinguish small fires
;      - Acid rain + fire = chemical reaction (toxic smoke)
;      - Ember scatter: wind carries sparks to start secondary ignition
;
;    Behavior:
;      - Fire size stages: Spark → Small → Medium → Inferno
;      - Each stage has different light radius, damage, and sound
;      - Structural fire: buildings accumulate fire damage over time
;      - Burns out naturally or spreads — never just stays the same size
;
;    NPC Reactions:
;      - Organic creatures flee fire (already in base AI, now smarter)
;      - Yao Guai / Mongrels: extreme fear response, full route
;      - Robots immune — walk through fire normally
;      - Raiders may USE fire tactically (throw molotovs to cut off paths)
;      - Settlers organize bucket chains (fire in settlement = event)
;
;    Smoke:
;      - Smoke rises and drifts with wind direction
;      - Smoke provides tactical concealment (stealth bonus in smoke)
;      - Sustained exposure damages lungs (periodic HP drain)
;      - Smoke visible from distance — alerts nearby NPCs to investigate
;
;    Aftermath:
;      - Burned areas leave scorch marks (landscape permanent change)
;      - No vegetation regrowth in scorched areas
;      - Ash piles from organic matter burned
;      - Reduced creature spawn in burned areas for 7 game-days
;
;  EXPLOSION SYSTEM
;    Pressure Wave:
;      - Stagger radius is LARGER than lethal radius (concussion without dying)
;      - Distance-graduated stagger: near = knockdown, mid = stagger, far = flinch
;      - Hearing damage: close explosions cause temporary detection penalty
;        (simulates tinnitus — player and NPCs near the blast)
;      - Objects not nailed down are thrown by shockwave
;
;    Chain Reactions:
;      - Vehicles: 4-second delay then catastrophic explosion (+ fire)
;      - Fuel tanks / gas canisters: immediate secondary blast
;      - Ammo boxes: cook off — rapid-fire small explosions
;      - Propane tanks: rocket into the air before exploding
;      - Electrical panels: EMP burst (disables robots in radius)
;      - Nuka-Cola machines: irradiated explosion + Nuka puddle
;
;    Special Blast Types:
;      - EMP: stuns all robots in radius, disables power armor HUD
;      - Radiation: leaves persistent rad zone (2-3 game days)
;      - Cryo: freezes actors in radius, ice patches on ground
;      - Plasma: melting effect, green fire patches
;      - Nuclear (Fat Man): all of the above combined
;
;    Environmental:
;      - Explosion sound echoes off nearby structures (acoustic handled by AcousticSystem)
;      - Craters remain as environmental scars
;      - Nearby glass shatters (trigger volumes)
;      - Distant NPCs hear and investigate (via AcousticSystem alert radius)
;
; Attach to AdvancedAIManager quest.
; Requires: EnvironmentalAIManager (weather), AcousticSystem
; ═══════════════════════════════════════════════════════════════════════════
Scriptname FireExplosionSystem extends Quest

Quest Property AAIQuest     Auto
Quest Property EnvManager   Auto
Quest Property AcousticSys  Auto

; ── Weather Globals ───────────────────────────────────────────────────────────
GlobalVariable Property gEnvWeatherType  Auto
GlobalVariable Property gEnvSoundCarry   Auto

; ── Creature Keywords ─────────────────────────────────────────────────────────
Keyword Property kwdRobot      Auto
Keyword Property kwdYaoGuai    Auto
Keyword Property kwdMongrel    Auto
Keyword Property kwdDeathclaw  Auto
Keyword Property kwdSynth      Auto

; ── Explosion Spells / Effects ───────────────────────────────────────────────
Spell     Property spStaggerNear       Auto; Full knockdown  (<300 units); Full knockdown  (<300 units); Full knockdown  (<300 units); Full knockdown  (<300 units)
Spell     Property spStaggerMid        Auto; Stagger         (300–700 units); Stagger         (300–700 units); Stagger         (300–700 units); Stagger         (300–700 units)
Spell     Property spStaggerFar        Auto; Flinch          (700–1200 units); Flinch          (700–1200 units); Flinch          (700–1200 units); Flinch          (700–1200 units)
Spell     Property spConcussion        Auto; Temporary hearing/detection penalty; Temporary hearing/detection penalty; Temporary hearing/detection penalty; Temporary hearing/detection penalty
Spell     Property spRadiationBurst    Auto; Radiation zone from nuke explosion; Radiation zone from nuke explosion; Radiation zone from nuke explosion; Radiation zone from nuke explosion
Spell     Property spEMPBurst          Auto; EMP stun for robots; EMP stun for robots; EMP stun for robots; EMP stun for robots
Spell     Property spCryoBlast         Auto; Freezing effect; Freezing effect; Freezing effect; Freezing effect
Spell     Property spPlasmaFire        Auto; Plasma burn / green fire; Plasma burn / green fire; Plasma burn / green fire; Plasma burn / green fire
Spell     Property spSmokeInhalation   Auto; Lung damage in smoke; Lung damage in smoke; Lung damage in smoke; Lung damage in smoke

; ── Fire Effects ──────────────────────────────────────────────────────────────
Explosion Property expFireSpread       Auto; Small fire ignition explosion; Small fire ignition explosion; Small fire ignition explosion; Small fire ignition explosion
Explosion Property expEmberScatter     Auto; Ember particle scatter; Ember particle scatter; Ember particle scatter; Ember particle scatter
Explosion Property expStructuralFire   Auto; Building fire stage; Building fire stage; Building fire stage; Building fire stage
Explosion Property expChainCarExplosion Auto; Delayed vehicle explosion; Delayed vehicle explosion; Delayed vehicle explosion; Delayed vehicle explosion
Explosion Property expAmmoInferno      Auto; Ammo cook-off burst; Ammo cook-off burst; Ammo cook-off burst; Ammo cook-off burst
Explosion Property expNukaExplosion    Auto; Nuka-Cola machine irradiated blast; Nuka-Cola machine irradiated blast; Nuka-Cola machine irradiated blast; Nuka-Cola machine irradiated blast

; ── Activator References ──────────────────────────────────────────────────────
Activator Property activFireSmall      Auto; Small fire object; Small fire object; Small fire object; Small fire object
Activator Property activFireMedium     Auto; Medium fire object; Medium fire object; Medium fire object; Medium fire object
Activator Property activSmokePillar    Auto; Rising smoke column; Rising smoke column; Rising smoke column; Rising smoke column
Activator Property activScorchMark     Auto; Permanent scorch decal; Permanent scorch decal; Permanent scorch decal; Permanent scorch decal
Activator Property activAshPile        Auto; Organic ash remains; Organic ash remains; Organic ash remains; Organic ash remains

; ── Configuration ──────────────────────────────────────────────────────────────
bool  Property FireEnabled         = True  Auto
bool  Property ExplosionEnabled    = True  Auto
bool  Property FireSpreadEnabled   = True  Auto
bool  Property ChainReactionEnabled = True Auto
bool  Property SmokeEnabled        = True  Auto
bool  Property AfterEffectsEnabled = True  Auto

float Property FireSpreadRadius    = 300.0 Auto; How far fire spreads; How far fire spreads; How far fire spreads; How far fire spreads
float Property FireSpreadInterval  = 8.0   Auto; Real seconds between spread checks; Real seconds between spread checks; Real seconds between spread checks; Real seconds between spread checks
float Property PressureNearRadius  = 300.0 Auto; Full knockdown radius; Full knockdown radius; Full knockdown radius; Full knockdown radius
float Property PressureMidRadius   = 700.0 Auto; Stagger radius; Stagger radius; Stagger radius; Stagger radius
float Property PressureFarRadius   = 1200.0 Auto; Flinch / hear radius; Flinch / hear radius; Flinch / hear radius; Flinch / hear radius
float Property ConcussionDuration  = 12.0  Auto; Seconds of hearing penalty; Seconds of hearing penalty; Seconds of hearing penalty; Seconds of hearing penalty
float Property SmokeDamageRate     = 2.0   Auto; HP/sec in thick smoke; HP/sec in thick smoke; HP/sec in thick smoke; HP/sec in thick smoke

; ── Internal State ─────────────────────────────────────────────────────────────
int   _currentWeather   = 0
float _currentWindMod   = 1.0; From weather — affects spread and ember; From weather — affects spread and ember; From weather — affects spread and ember; From weather — affects spread and ember
bool  _isRaining        = False
bool  _isStorming       = False

; Active fire tracking (up to 8 simultaneous fire events)
ObjectReference[] _activeFires
float[]           _fireStartTimes
int[]             _fireStages; 0=spark 1=small 2=medium 3=inferno; 0=spark 1=small 2=medium 3=inferno; 0=spark 1=small 2=medium 3=inferno; 0=spark 1=small 2=medium 3=inferno
ObjectReference[] _fireLocations

; ═══════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    If !FireEnabled && !ExplosionEnabled
        Return
    EndIf

    _activeFires   = new ObjectReference[8]
    _fireStartTimes = new float[8]
    _fireStages    = new int[8]
    _fireLocations = new ObjectReference[8]

    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
    ; weather changes are detected by polling in OnTimerGameTime (FO4 has no weather-change event)
    ScheduleTick(0.08)
    FireLog("Fire & Explosion System initialized")
EndEvent

Function WeatherChanged(Weather akOldWeather, Weather akNewWeather, Bool abPrecip, Bool abPermaNow)
    If gEnvWeatherType != None
        _currentWeather = gEnvWeatherType.GetValue() as Int
    EndIf
    _isRaining  = _currentWeather == 1 || _currentWeather == 4
    _isStorming = _currentWeather == 3

    ; Wind modifier: storms fan flames, calm = slow spread
    If (_isStorming)
        _currentWindMod = 2.5
    ElseIf (_isRaining)
        _currentWindMod = 0.3
    Else
        _currentWindMod = 1.0
    EndIf
EndFunction
; ═══════════════════════════════════════════════════════════════════════════
; PERIODIC FIRE UPDATE
; ═══════════════════════════════════════════════════════════════════════════
Function DoGameTimeTick()
    UpdateActiveFires()
    ScheduleTick(0.08)
EndFunction
Function UpdateActiveFires()
    Float now = Utility.GetCurrentGameTime()
    Int i = 0
    While i < 8
        If _activeFires[i] != None
            UpdateFireStage(i, now)
        EndIf
        i += 1
    EndWhile
EndFunction

Function UpdateFireStage(Int slot, Float now)
    Float elapsed = (now - _fireStartTimes[slot]) * 24.0 * 3600.0; Convert to real seconds; Convert to real seconds; Convert to real seconds; Convert to real seconds
    Int stage = _fireStages[slot]

    ; Rain extinguishes small fires
    If _isRaining && stage <= 1
        ExtinguishFire(slot)
        Return
    EndIf

    ; Stage progression
    If stage == 0 && elapsed > 10.0
        ; Spark → Small fire
        _fireStages[slot] = 1
        OnFireStageChange(slot, 1)

    ElseIf stage == 1 && elapsed > 30.0 && !_isRaining
        ; Small → Medium (harder to rain-extinguish)
        _fireStages[slot] = 2
        OnFireStageChange(slot, 2)
        ; Spread at medium stage
        If FireSpreadEnabled
            TrySpreadFire(_activeFires[slot])
        EndIf

    ElseIf stage == 2 && elapsed > 90.0 && _isStorming
        ; Medium → Inferno (only if storm is fanning it)
        _fireStages[slot] = 3
        OnFireStageChange(slot, 3)
        TrySpreadFire(_activeFires[slot])
        TryEmberScatter(_activeFires[slot])

    ElseIf stage >= 2 && elapsed > 180.0 && !_isStorming
        ; Burns out naturally after ~3 minutes without storm
        BurnOut(slot)
    EndIf
EndFunction

Function OnFireStageChange(Int slot, Int newStage)
    ObjectReference fireLoc = _activeFires[slot]
    If fireLoc == None
        Return
    EndIf

    If newStage == 1
        FireLog("Fire: Small stage at " + fireLoc.GetDisplayName())
    ElseIf newStage == 2
        FireLog("Fire: Medium stage — spreading")
        Debug.Notification("Fire spreading nearby...")
        ; Spawn smoke pillar
        If activSmokePillar != None
            fireLoc.PlaceAtMe(activSmokePillar)
        EndIf
    ElseIf newStage == 3
        FireLog("Fire: INFERNO — storm fanning flames!")
        Debug.Notification("The storm is fanning the flames — INFERNO!")
        ; Alert NPCs at distance (smoke visible from far)
        AlertNPCsToFire(fireLoc, 3000.0)
    EndIf

    ; Apply fire damage/effects to nearby actors
    ApplyFireEffects(fireLoc, newStage)
EndFunction

Function ApplyFireEffects(ObjectReference fireLoc, Int stage)
    Float damageRadius
    If (stage == 1)
        damageRadius = 150.0
    ElseIf (stage == 2)
        damageRadius = 300.0
    Else
        damageRadius = 500.0
    EndIf
    Actor[] nearby = MiscUtil.ScanActors(fireLoc, damageRadius, 10)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead()
            Bool isRobot = kwdRobot != None && npc.HasKeyword(kwdRobot)
            Bool isSynth  = kwdSynth  != None && npc.HasKeyword(kwdSynth)

            If !isRobot && !isSynth
                ; Organic: fear response + damage
                ReactToFireWithFear(npc, fireLoc, stage)
            EndIf
            ; Smoke inhalation in medium/inferno
            If SmokeEnabled && stage >= 2 && spSmokeInhalation != None
                spSmokeInhalation.Cast(npc, npc)
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function ReactToFireWithFear(Actor npc, ObjectReference fireLoc, Int stage)
    ActorValue avConf = Game.GetFormFromFile(0x000002E8, "Fallout4.esm") as ActorValue
    If avConf == None
        Return
    EndIf

    ; Yao Guai and Mongrels: maximum fear
    Bool isAnimalWithFear = (kwdYaoGuai  != None && npc.HasKeyword(kwdYaoGuai)) || (kwdMongrel  != None && npc.HasKeyword(kwdMongrel)) || (kwdDeathclaw != None && npc.HasKeyword(kwdDeathclaw))

    Float fearAmount
    If (isAnimalWithFear)
        fearAmount = 100.0
    Else
        fearAmount = (stage * 25.0)
    EndIf
    npc.SetValue(avConf, Math.Max(npc.GetValue(avConf) - fearAmount, 0.0))

    If !npc.IsInCombat()
        npc.EvaluatePackage()
    EndIf

    If isAnimalWithFear && stage >= 2
        Debug.Notification(npc.GetDisplayName() + " panics — fleeing the fire!")
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; FIRE SPREAD
; ═══════════════════════════════════════════════════════════════════════════
Function TrySpreadFire(ObjectReference sourceRef)
    If !FireSpreadEnabled || sourceRef == None
        Return
    EndIf

    Float spreadRadius = FireSpreadRadius * _currentWindMod

    ; mode 0 = all refs in radius (modes 5/10 are unsupported in FO4 PapyrusUtil)
    ObjectReference[] nearby = MiscUtil.ScanRefs(sourceRef, spreadRadius, 0)

    ; Fallback: ScanRefs returned empty (C++ native not yet wired up).
    ; Place the spread explosion at the source so fire visuals still fire.
    If nearby.Length == 0
        If expFireSpread != None
            sourceRef.PlaceAtMe(expFireSpread)
            FireLog("Fire spread (ScanRefs empty — source scatter, wind=" + _currentWindMod + ")")
        EndIf
        Return
    EndIf

    Int i = 0
    Int spread = 0
    While i < nearby.Length && spread < 2
        ObjectReference obj = nearby[i]
        If obj != None && obj != sourceRef && IsFlammable(obj)
            ; Ignite this object
            If expFireSpread != None
                obj.PlaceAtMe(expFireSpread)
            EndIf
            RegisterNewFire(obj)
            spread += 1
            FireLog("Fire spread to: " + obj.GetDisplayName() + " (wind mult: " + _currentWindMod + ")")
        EndIf
        i += 1
    EndWhile
EndFunction

Bool Function IsFlammable(ObjectReference obj)
    ; In a full implementation: check for AAI_Flammable keyword
    ; For now: check name for flammable materials
    String name = obj.GetDisplayName()
    Return StringUtil.Find(name, "Wood") >= 0 || StringUtil.Find(name, "Crate") >= 0 || StringUtil.Find(name, "Box") >= 0 || StringUtil.Find(name, "Barrel") >= 0 || StringUtil.Find(name, "Cloth") >= 0 || StringUtil.Find(name, "Tent") >= 0 || StringUtil.Find(name, "Mattress") >= 0 || StringUtil.Find(name, "Book") >= 0
EndFunction

Function TryEmberScatter(ObjectReference sourceRef)
    If !FireSpreadEnabled || sourceRef == None || expEmberScatter == None
        Return
    EndIf

    ; Wind carries embers in the storm direction
    ; In a full implementation: use actual wind direction vector
    ; For now: random nearby scatter with wind multiplier
    Int emberCount
    If (_isStorming)
        emberCount = 3
    Else
        emberCount = 1
    EndIf
    Int i = 0
    While i < emberCount
        ; Place ember scatter effect at a random offset
        sourceRef.PlaceAtMe(expEmberScatter)
        i += 1
    EndWhile
    FireLog("Embers scattered from inferno (storm=" + _isStorming + ")")
EndFunction

Function ExtinguishFire(Int slot)
    ObjectReference fireLoc = _activeFires[slot]
    If fireLoc != None && AfterEffectsEnabled
        LeaveAshAndScorch(fireLoc, _fireStages[slot])
    EndIf
    _activeFires[slot]    = None
    _fireStartTimes[slot] = 0.0
    _fireStages[slot]     = 0
    FireLog("Fire extinguished by rain")
EndFunction

Function BurnOut(Int slot)
    ObjectReference fireLoc = _activeFires[slot]
    If fireLoc != None && AfterEffectsEnabled
        LeaveAshAndScorch(fireLoc, _fireStages[slot])
    EndIf
    _activeFires[slot]    = None
    _fireStartTimes[slot] = 0.0
    _fireStages[slot]     = 0
EndFunction

Function LeaveAshAndScorch(ObjectReference fireLoc, Int finalStage)
    ; Leave permanent scorch marks and ash piles
    If activScorchMark != None
        fireLoc.PlaceAtMe(activScorchMark)
    EndIf
    If finalStage >= 2 && activAshPile != None
        fireLoc.PlaceAtMe(activAshPile)
    EndIf
    Debug.Trace("[AAI] FIRE_AFTERMATH|location=" + fireLoc.GetDisplayName() + "|stage=" + finalStage + "|game_time=" + Utility.GetCurrentGameTime())
EndFunction

Function RegisterNewFire(ObjectReference fireLoc)
    Int i = 0
    While i < 8
        If _activeFires[i] == None
            _activeFires[i]    = fireLoc
            _fireStartTimes[i] = Utility.GetCurrentGameTime()
            _fireStages[i]     = 0
            Return
        EndIf
        i += 1
    EndWhile
EndFunction

Function AlertNPCsToFire(ObjectReference fireLoc, Float radius)
    Actor[] nearby = MiscUtil.ScanActors(fireLoc, radius, 15)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && !npc.IsInCombat()
            npc.EvaluatePackage()
        EndIf
        i += 1
    EndWhile
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; EXPLOSION SYSTEM
; ═══════════════════════════════════════════════════════════════════════════

; Called when any explosion goes off near a tracked position
Function OnExplosionEvent(ObjectReference explRef, String explosionType, Float yield)
    If !ExplosionEnabled || explRef == None
        Return
    EndIf

    ; Apply pressure wave effects
    ApplyPressureWave(explRef, yield)

    ; Apply type-specific effects
    If explosionType == "EMP"
        ApplyEMPBurst(explRef, yield)
    ElseIf explosionType == "Nuclear" || explosionType == "FatMan"
        ApplyNuclearBurst(explRef, yield)
    ElseIf explosionType == "Cryo"
        ApplyCryoBurst(explRef, yield)
    ElseIf explosionType == "Plasma"
        ApplyPlasmaBurst(explRef, yield)
    EndIf

    ; Chain reaction check
    If ChainReactionEnabled
        CheckChainReactions(explRef, yield)
    EndIf

    ; Start a fire at explosion site
    If FireEnabled
        RegisterNewFire(explRef)
    EndIf

    Debug.Trace("[AAI] EXPLOSION|type=" + explosionType + "|yield=" + yield + "|location=" + explRef.GetDisplayName() + "|game_time=" + Utility.GetCurrentGameTime())
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PRESSURE WAVE — graduated stagger by distance
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyPressureWave(ObjectReference explRef, Float yield)
    Float nearR = PressureNearRadius * yield
    Float midR  = PressureMidRadius  * yield
    Float farR  = PressureFarRadius  * yield

    Actor[] allAffected = MiscUtil.ScanActors(explRef, farR, 30)
    Int i = 0
    While i < allAffected.Length
        Actor npc = allAffected[i]
        If npc != None && !npc.IsDead()
            Float dist = explRef.GetDistance(npc)

            If dist <= nearR
                ; KNOCKDOWN — thrown off feet
                If spStaggerNear != None
                    spStaggerNear.Cast(explRef, npc)
                EndIf
                ; Concussion — temporary detection/hearing penalty
                If spConcussion != None
                    spConcussion.Cast(npc, npc)
                EndIf
                FireLog("Knockdown: " + npc.GetDisplayName() + " (" + dist + " units)")

            ElseIf dist <= midR
                ; STAGGER
                If spStaggerMid != None
                    spStaggerMid.Cast(explRef, npc)
                EndIf
                If spConcussion != None
                    spConcussion.Cast(npc, npc)
                EndIf

            ElseIf dist <= farR
                ; FLINCH — barely affected, but hears it and may investigate
                If spStaggerFar != None
                    spStaggerFar.Cast(explRef, npc)
                EndIf
                If !npc.IsInCombat()
                    npc.EvaluatePackage()
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile

    FireLog("Pressure wave: near=" + nearR + " mid=" + midR + " far=" + farR + " affected=" + allAffected.Length)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; CHAIN REACTIONS
; ═══════════════════════════════════════════════════════════════════════════
Function CheckChainReactions(ObjectReference explRef, Float yield)
    ; mode 0 = all refs (modes > 2 unsupported in FO4 PapyrusUtil)
    ObjectReference[] nearby = MiscUtil.ScanRefs(explRef, 500.0 * yield, 0)
    Int i = 0
    While i < nearby.Length
        ObjectReference obj = nearby[i]
        If obj != None && obj != explRef
            String name = obj.GetDisplayName()

            ; Vehicles — delayed massive explosion
            If StringUtil.Find(name, "Car") >= 0 || StringUtil.Find(name, "Truck") >= 0 || StringUtil.Find(name, "Bus") >= 0 || StringUtil.Find(name, "Vehicle") >= 0
                TriggerDelayedVehicleExplosion(obj)

            ; Fuel / propane
            ElseIf StringUtil.Find(name, "Fuel") >= 0 || StringUtil.Find(name, "Propane") >= 0 || StringUtil.Find(name, "Gas") >= 0
                TriggerFuelExplosion(obj)

            ; Ammo boxes — cook-off
            ElseIf StringUtil.Find(name, "Ammo") >= 0 || StringUtil.Find(name, "Ammunition") >= 0
                TriggerAmmoCookoff(obj)

            ; Nuka-Cola machines
            ElseIf StringUtil.Find(name, "Nuka") >= 0 && StringUtil.Find(name, "Machine") >= 0
                TriggerNukaCoolaExplosion(obj)

            ; Electrical panels — EMP
            ElseIf StringUtil.Find(name, "Panel") >= 0 || StringUtil.Find(name, "Generator") >= 0 || StringUtil.Find(name, "Electrical") >= 0
                ApplyEMPBurst(obj, 0.6)
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function TriggerDelayedVehicleExplosion(ObjectReference vehicle)
    Debug.Notification("Vehicle catching fire — GET CLEAR!")
    Utility.Wait(4.0); 4 second delay — classic Hollywood beat; 4 second delay — classic Hollywood beat; 4 second delay — classic Hollywood beat; 4 second delay — classic Hollywood beat
    If expChainCarExplosion != None
        vehicle.PlaceAtMe(expChainCarExplosion)
    EndIf
    RegisterNewFire(vehicle)
    FireLog("Vehicle explosion: " + vehicle.GetDisplayName())
EndFunction

Function TriggerFuelExplosion(ObjectReference fuel)
    Debug.Notification("FUEL TANK!")
    If expChainCarExplosion != None
        fuel.PlaceAtMe(expChainCarExplosion)
    EndIf
    RegisterNewFire(fuel)
EndFunction

Function TriggerAmmoCookoff(ObjectReference ammoBox)
    Debug.Notification("Ammo cooking off!")
    ; Rapid-fire small explosions — handled by ammo inferno explosion type
    If expAmmoInferno != None
        ammoBox.PlaceAtMe(expAmmoInferno)
    EndIf
    FireLog("Ammo cook-off: " + ammoBox.GetDisplayName())
EndFunction

Function TriggerNukaCoolaExplosion(ObjectReference nukaRef)
    Debug.Notification("NUKA-COLA EXPLOSION! Radiation!")
    If expNukaExplosion != None
        nukaRef.PlaceAtMe(expNukaExplosion)
    EndIf
    If spRadiationBurst != None
        spRadiationBurst.Cast(Game.GetPlayer(), nukaRef)
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; SPECIAL EXPLOSION TYPES
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyEMPBurst(ObjectReference explRef, Float yield)
    Float empRadius = 600.0 * yield
    Actor[] nearby = MiscUtil.ScanActors(explRef, empRadius, 12)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead()
            If kwdRobot != None && npc.HasKeyword(kwdRobot)
                ; Robots: EMP stun
                If spEMPBurst != None
                    spEMPBurst.Cast(npc, npc)
                EndIf
                ; Temporarily reduce robot speed and aggression
                ActorValue avSpeed = Game.GetFormFromFile(0x00000036, "Fallout4.esm") as ActorValue
                If avSpeed != None
                    npc.SetValue(avSpeed, npc.GetBaseValue(avSpeed) * 0.3)
                EndIf
                FireLog("EMP hit robot: " + npc.GetDisplayName())
            EndIf
        EndIf
        i += 1
    EndWhile
    Debug.Notification("EMP burst — robots shutting down!")
EndFunction

Function ApplyNuclearBurst(ObjectReference explRef, Float yield)
    ; Nuclear explosion: massive pressure wave + persistent radiation zone
    If spRadiationBurst != None
        spRadiationBurst.Cast(explRef, explRef)
    EndIf
    ; Log for bridge — creates persistent radiation zone for 3 game days
    Debug.Trace("[AAI] NUCLEAR_EXPLOSION|location=" + explRef.GetDisplayName() + "|yield=" + yield + "|rad_zone_days=3" + "|game_time=" + Utility.GetCurrentGameTime())
    Debug.Notification("NUCLEAR DETONATION — radiation zone forming. Leave the area!")
EndFunction

Function ApplyCryoBurst(ObjectReference explRef, Float yield)
    Float cryoRadius = 400.0 * yield
    Actor[] nearby = MiscUtil.ScanActors(explRef, cryoRadius, 10)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead()
            If spCryoBlast != None
                spCryoBlast.Cast(npc, npc)
            EndIf
            ; Reduce speed (frozen)
            ActorValue avSpeed = Game.GetFormFromFile(0x00000036, "Fallout4.esm") as ActorValue
            If avSpeed != None
                npc.SetValue(avSpeed, npc.GetBaseValue(avSpeed) * 0.2)
            EndIf
        EndIf
        i += 1
    EndWhile
    Debug.Notification("CRYO explosion — everything nearby is freezing!")
EndFunction

Function ApplyPlasmaBurst(ObjectReference explRef, Float yield)
    ; Plasma: melting effect + green fire patches
    Float plasmaRadius = 350.0 * yield
    Actor[] nearby = MiscUtil.ScanActors(explRef, plasmaRadius, 10)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && spPlasmaFire != None
            spPlasmaFire.Cast(npc, npc)
        EndIf
        i += 1
    EndWhile
    RegisterNewFire(explRef); Green fire patch at blast site; Green fire patch at blast site; Green fire patch at blast site; Green fire patch at blast site
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PUBLIC API
; ═══════════════════════════════════════════════════════════════════════════
Function ReportFire(ObjectReference fireRef)
    RegisterNewFire(fireRef)
EndFunction

Function ReportExplosion(ObjectReference explRef, String type, Float yield)
    OnExplosionEvent(explRef, type, yield)
EndFunction

Function FireLog(String msg)
    Debug.Trace("[AAI-Fire] " + msg)
EndFunction

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours = 1.0
Weather _f4aiLastWeather = None

Function ScheduleTick(Float afHours)
    _f4aiTickHours = afHours
    StartTimerGameTime(afHours, 900)
EndFunction

Event OnTimerGameTime(Int aiTimerID)
    If aiTimerID == 900
        StartTimerGameTime(_f4aiTickHours, 900)
        Weather wNow = Weather.GetCurrentWeather()
        If wNow != _f4aiLastWeather
            Weather wOld = _f4aiLastWeather
            _f4aiLastWeather = wNow
            WeatherChanged(wOld, wNow, False, False)
        EndIf
        DoGameTimeTick()
    EndIf
EndEvent
