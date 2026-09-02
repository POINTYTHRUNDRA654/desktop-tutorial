; ═══════════════════════════════════════════════════════════════════════════
; AcousticSystem.psc
; Advanced AI System — Realistic Sound & Acoustics
;
;  LOCATION ACOUSTICS
;    Vault / Metal Interior:
;      - Gunshot echoes ring for 3–5 seconds
;      - Every sound heard across the entire cell
;      - Footsteps on metal are extremely loud
;      - Hard to localize (echo misleads direction)
;
;    Cave / Underground:
;      - Deep reverb — long echo tail
;      - Dripping water sounds huge
;      - Creatures can hear you from much farther
;      - Stalactites vibrate from explosions (detection event)
;
;    Open Wasteland:
;      - Sound carries flat and far
;      - No reflection — you hear it once, clean
;      - Wind noise competes with footsteps
;      - Distant gunfire triggers investigation at 3x normal radius
;
;    City Ruins:
;      - Sound bounces off building faces
;      - Multiple reflections = hard to pinpoint source
;      - Snipers can confuse by using echoes tactically
;      - Rubble footsteps loud, concrete quieter
;
;    Settlement (indoor):
;      - Ambient noise (forge, generators, conversation) masks some sounds
;      - Thick wood walls muffle exterior sounds
;
;    Forest / Dense Vegetation:
;      - Plants absorb high frequencies
;      - Low rumbles (explosions) travel farther than high (gunshots)
;      - Footsteps in leaves loud, soft soil quiet
;
;    Underwater:
;      - Completely different acoustic profile
;      - Sound travels faster (4x) but is distorted
;      - Can't hear above water well
;      - Explosions underwater: catastrophic pressure
;
;  SOUND MASKING
;    Rain:       masks footsteps (+50%), reduces gunshot radius (-30%)
;    Storm:      masks almost everything — major stealth window
;    Wind:       masks rustling movement, alerts to metallic sounds
;    Generator:  masks sounds within 300 units
;    Waterfall:  masks everything within 200 units
;    Crowd:      masks quiet movement in settlements
;    Thunder:    masks gunfire for 2–3 seconds per strike
;    Fire:       crackling masks nearby footsteps
;
;  SUPPRESSOR ACOUSTICS
;    Open Wasteland:    Still heard at 500 units (subsonic crack)
;    City Ruins:        Reflected off buildings — confusing direction
;    Indoor Metal:      Suppressor barely helps — echo everywhere
;    Forest:            Most effective — plants absorb residual sound
;    Night / Fog:       Player's position harder to pinpoint
;
;  FOOTSTEP MATERIALS
;    Metal:       Loud clang — extreme detection risk
;    Gravel:      Crunch — moderate detection
;    Wet mud:     Squelch — moderate, directional
;    Ice:         Crack (detection event) + slippery
;    Wood (floor):Creak — loud in quiet environments
;    Concrete:    Moderate
;    Soft soil:   Quiet — minimal detection
;    Water:       Splash — always loud, direction obvious
;    Snow:        Crunch — moderate, very directional
;    Leaves:      Rustle — environment-dependent
;
;  CREATURE VOCALIZATIONS
;    - Creatures call differently based on situation:
;      Alert: sharp, directional call (alerts pack)
;      Hunting: low, intermittent (doesn't want to spook prey)
;      Wounded: pain cry (alerts nearby allies AND enemies hear it)
;      Territorial: sustained roar (carries on wind)
;      Feeding: quiet, possessive sounds
;    - Sound of eating attracts scavengers
;    - Wounded cry triggers predators to investigate
;
;  THUNDER MASKING
;    - Each thunder strike: 2–3 second window of gunfire masking
;    - NPCs react to lightning (brief startle, then resume)
;    - Distant thunder = investigation trigger (confused for explosion)
;
; Attach to AdvancedAIManager quest.
; Requires: EnvironmentalAIManager (weather globals)
; ═══════════════════════════════════════════════════════════════════════════
Scriptname AcousticSystem extends Quest

Quest Property AAIQuest    Auto
Quest Property EnvManager  Auto

; ── Weather Globals ───────────────────────────────────────────────────────────
GlobalVariable Property gEnvWeatherType  Auto
GlobalVariable Property gEnvSoundCarry   Auto
GlobalVariable Property gEnvRainMask     Auto
GlobalVariable Property gEnvIsNight      Auto

; ── Location Type Global (set by EnvironmentalAIManager) ─────────────────────
GlobalVariable Property gCurrentLocType  Auto
; 0=wasteland 1=city 2=indoor_wood 3=indoor_metal 4=cave 5=vault 6=forest 7=underwater 8=settlement

; ── Acoustic Modifier Globals (read by other scripts) ─────────────────────────
GlobalVariable Property gAcoustic_EchoMult      Auto; How much echo is present; How much echo is present; How much echo is present; How much echo is present
GlobalVariable Property gAcoustic_GunRadiusMult  Auto; Gunshot detection radius mult; Gunshot detection radius mult; Gunshot detection radius mult; Gunshot detection radius mult
GlobalVariable Property gAcoustic_FootstepMask   Auto; 0=fully audible 1=fully masked; 0=fully audible 1=fully masked; 0=fully audible 1=fully masked; 0=fully audible 1=fully masked
GlobalVariable Property gAcoustic_StealthMult    Auto; Stealth bonus from acoustic env; Stealth bonus from acoustic env; Stealth bonus from acoustic env; Stealth bonus from acoustic env
GlobalVariable Property gAcoustic_OcclusionMult  Auto; Through-wall sound reduction; Through-wall sound reduction; Through-wall sound reduction; Through-wall sound reduction

; ── Spells / Effects ─────────────────────────────────────────────────────────
Spell Property spConcussion       Auto; Shared with FireExplosionSystem; Shared with FireExplosionSystem; Shared with FireExplosionSystem; Shared with FireExplosionSystem
Spell Property spThunderStartle   Auto; Brief startle from thunder; Brief startle from thunder; Brief startle from thunder; Brief startle from thunder
Spell Property spEarRing          Auto; Tinnitus from nearby explosion/gunfire; Tinnitus from nearby explosion/gunfire; Tinnitus from nearby explosion/gunfire; Tinnitus from nearby explosion/gunfire

; ── Configuration ──────────────────────────────────────────────────────────────
bool  Property AcousticEnabled          = True  Auto
bool  Property FootstepMaterialEnabled  = True  Auto
bool  Property SupressorAcousticsOn     = True  Auto
bool  Property ThunderMaskingEnabled    = True  Auto
bool  Property CreatureVocalizationOn   = True  Auto
float Property UpdateInterval           = 0.08  Auto

; ── Internal State ─────────────────────────────────────────────────────────────
int   _currentWeather       = 0
int   _currentLocType       = 0
bool  _isRaining            = False
bool  _isStorming           = False
bool  _isNight              = False
bool  _thunderMaskActive    = False
float _thunderMaskEndTime   = 0.0
float _currentEchoMult      = 1.0
float _currentGunMult       = 1.0
float _currentStealthMult   = 1.0
float _currentOcclusion     = 0.7
float _currentFootstepMask  = 0.0

; ═══════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    If !AcousticEnabled
        Return
    EndIf
    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
    RegisterForRemoteEvent(Game.GetPlayer(), "OnLocationChange")
    ; weather changes are detected by polling in OnTimerGameTime (FO4 has no weather-change event)
    ScheduleTick(UpdateInterval)
    AcousticLog("Acoustic System initialized")
EndEvent

Function WeatherChanged(Weather akOldWeather, Weather akNewWeather, Bool abPrecip, Bool abPermaNow)
    ReadGlobals()
    UpdateAcousticProfile()
EndFunction
Event Actor.OnLocationChange(Actor akSender, Location akOldLoc, Location akNewLoc)
    If akNewLoc != None
        _currentLocType = ClassifyLocationAcoustic(akNewLoc)
        If gCurrentLocType != None
            gCurrentLocType.SetValue(_currentLocType as Float)
        EndIf
        UpdateAcousticProfile()
    EndIf
EndEvent

Function DoGameTimeTick()
    If !AcousticEnabled
        ScheduleTick(UpdateInterval)
        Return
    EndIf
    ReadGlobals()
    UpdateAcousticProfile()
    WriteAcousticGlobals()
    ScheduleTick(UpdateInterval)
EndFunction
Function ReadGlobals()
    If gEnvWeatherType != None
        _currentWeather = gEnvWeatherType.GetValue() as Int
    EndIf
    If gEnvIsNight     != None
        _isNight        = gEnvIsNight.GetValue() > 0.5
    EndIf
    _isRaining  = _currentWeather == 1 || _currentWeather == 4
    _isStorming = _currentWeather == 3
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; ACOUSTIC PROFILE CALCULATION
; ═══════════════════════════════════════════════════════════════════════════
Function UpdateAcousticProfile()
    ; Base values from location type
    Float baseEcho     = 1.0
    Float baseGunMult  = 1.0
    Float baseStealth  = 1.0
    Float baseOccl     = 0.7
    Float baseFootMask = 0.0

    If _currentLocType == 5; Vault — metal echo; Vault — metal echo; Vault — metal echo; Vault — metal echo
        baseEcho    = 3.5; Heavy echo; Heavy echo; Heavy echo; Heavy echo
        baseGunMult = 2.5; Sound everywhere in vault; Sound everywhere in vault; Sound everywhere in vault; Sound everywhere in vault
        baseStealth = 0.7; Hard to be quiet; Hard to be quiet; Hard to be quiet; Hard to be quiet
        baseOccl    = 0.4; Sound bleeds through metal walls easily; Sound bleeds through metal walls easily; Sound bleeds through metal walls easily; Sound bleeds through metal walls easily
        baseFootMask = 0.0; Footsteps ring out; Footsteps ring out; Footsteps ring out; Footsteps ring out
        AcousticLog("Acoustic: VAULT — every sound echoes")

    ElseIf _currentLocType == 4; Cave; Cave; Cave; Cave
        baseEcho    = 2.8
        baseGunMult = 2.0
        baseStealth = 0.8
        baseOccl    = 0.5
        AcousticLog("Acoustic: CAVE — deep reverb")

    ElseIf _currentLocType == 3; Indoor wood/building; Indoor wood/building; Indoor wood/building; Indoor wood/building
        baseEcho    = 1.4
        baseGunMult = 1.2
        baseStealth = 1.1
        baseOccl    = 0.6
        AcousticLog("Acoustic: INDOOR — muffled")

    ElseIf _currentLocType == 1; City ruins; City ruins; City ruins; City ruins
        baseEcho    = 2.0; Sound bounces off buildings; Sound bounces off buildings; Sound bounces off buildings; Sound bounces off buildings
        baseGunMult = 1.8; Multiple reflections; Multiple reflections; Multiple reflections; Multiple reflections
        baseStealth = 1.1
        baseOccl    = 0.65
        AcousticLog("Acoustic: CITY — bounce and echo")

    ElseIf _currentLocType == 6; Forest; Forest; Forest; Forest
        baseEcho    = 0.6; Plants absorb sound; Plants absorb sound; Plants absorb sound; Plants absorb sound
        baseGunMult = 0.8; Sound doesn't carry as far; Sound doesn't carry as far; Sound doesn't carry as far; Sound doesn't carry as far
        baseStealth = 1.4; Good cover acoustically; Good cover acoustically; Good cover acoustically; Good cover acoustically
        baseOccl    = 0.85; Plants block sound well; Plants block sound well; Plants block sound well; Plants block sound well
        AcousticLog("Acoustic: FOREST — absorbed")

    ElseIf _currentLocType == 7; Underwater; Underwater; Underwater; Underwater
        baseEcho    = 1.5
        baseGunMult = 0.3; Sounds terrible underwater; Sounds terrible underwater; Sounds terrible underwater; Sounds terrible underwater
        baseStealth = 0.5; Movement very audible; Movement very audible; Movement very audible; Movement very audible
        baseOccl    = 0.9
        AcousticLog("Acoustic: UNDERWATER")

    ElseIf _currentLocType == 8; Settlement; Settlement; Settlement; Settlement
        baseEcho    = 1.2
        baseGunMult = 1.4
        baseStealth = 1.15; Generator/forge noise helps; Generator/forge noise helps; Generator/forge noise helps; Generator/forge noise helps
        baseOccl    = 0.6
        AcousticLog("Acoustic: SETTLEMENT — ambient noise masking")

    Else; Wasteland (0); Wasteland (0); Wasteland (0); Wasteland (0)
        baseEcho    = 1.0
        baseGunMult = 1.3; Flat carry; Flat carry; Flat carry; Flat carry
        baseStealth = 1.0
        baseOccl    = 0.9
        AcousticLog("Acoustic: WASTELAND — flat carry")
    EndIf

    ; Weather modifiers
    Float weatherGunMod  = 1.0
    Float weatherStlMod  = 1.0
    Float weatherFootMod = 0.0

    If _isRaining
        weatherGunMod  = 0.70; Rain absorbs -30% gun radius; Rain absorbs -30% gun radius; Rain absorbs -30% gun radius; Rain absorbs -30% gun radius
        weatherStlMod  = 1.25; Rain helps stealth +25%; Rain helps stealth +25%; Rain helps stealth +25%; Rain helps stealth +25%
        weatherFootMod = 0.5; Footsteps half-masked by rain; Footsteps half-masked by rain; Footsteps half-masked by rain; Footsteps half-masked by rain
        AcousticLog("Weather: RAIN — footsteps masked, gun range -30%")

    ElseIf _isStorming
        weatherGunMod  = 0.55; Storm absorbs -45%; Storm absorbs -45%; Storm absorbs -45%; Storm absorbs -45%
        weatherStlMod  = 1.6; Major stealth window in storm; Major stealth window in storm; Major stealth window in storm; Major stealth window in storm
        weatherFootMod = 0.75; Footsteps nearly masked; Footsteps nearly masked; Footsteps nearly masked; Footsteps nearly masked
        AcousticLog("Weather: STORM — major stealth window")
    EndIf

    ; Night modifier (quieter world = sounds carry farther)
    Float nightMod
    If (_isNight)
        nightMod = 1.25
    Else
        nightMod = 1.0
    EndIf

    ; Thunder masking check
    If _thunderMaskActive
        Float now = Utility.GetCurrentGameTime()
        If now > _thunderMaskEndTime
            _thunderMaskActive = False
        Else
            weatherGunMod  *= 0.3; Thunder masks gunfire for 2–3 seconds; Thunder masks gunfire for 2–3 seconds; Thunder masks gunfire for 2–3 seconds; Thunder masks gunfire for 2–3 seconds
            weatherStlMod  += 0.3
            weatherFootMod += 0.4
        EndIf
    EndIf

    ; Final calculations
    _currentEchoMult    = baseEcho
    _currentGunMult     = baseGunMult * weatherGunMod * nightMod
    _currentStealthMult = baseStealth * weatherStlMod
    _currentOcclusion   = baseOccl
    _currentFootstepMask = Math.Clamp(baseFootMask + weatherFootMod, 0.0, 1.0)
EndFunction

Function WriteAcousticGlobals()
    If gAcoustic_EchoMult     != None
        gAcoustic_EchoMult.SetValue(_currentEchoMult)
    EndIf
    If gAcoustic_GunRadiusMult != None
        gAcoustic_GunRadiusMult.SetValue(_currentGunMult)
    EndIf
    If gAcoustic_StealthMult   != None
        gAcoustic_StealthMult.SetValue(_currentStealthMult)
    EndIf
    If gAcoustic_OcclusionMult != None
        gAcoustic_OcclusionMult.SetValue(_currentOcclusion)
    EndIf
    If gAcoustic_FootstepMask  != None
        gAcoustic_FootstepMask.SetValue(_currentFootstepMask)
    EndIf

    Debug.Trace("[AAI] ACOUSTIC_STATE|loc=" + _currentLocType + "|echo=" + _currentEchoMult + "|gun_mult=" + _currentGunMult + "|stealth=" + _currentStealthMult + "|footstep_mask=" + _currentFootstepMask + "|thunder=" + _thunderMaskActive)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; LOCATION CLASSIFICATION
; ═══════════════════════════════════════════════════════════════════════════
int Function ClassifyLocationAcoustic(Location loc)
    If loc == None
        Return 0
    EndIf
    String name = loc.GetName()

    If StringUtil.Find(name, "Vault") >= 0
        Return 5
    ElseIf StringUtil.Find(name, "Cave") >= 0 || StringUtil.Find(name, "Subway") >= 0 || StringUtil.Find(name, "Tunnel") >= 0
        Return 4
    ElseIf StringUtil.Find(name, "Diamond City") >= 0 || StringUtil.Find(name, "Goodneighbor") >= 0 || StringUtil.Find(name, "City") >= 0 || StringUtil.Find(name, "Ruin") >= 0
        Return 1
    ElseIf StringUtil.Find(name, "Forest") >= 0 || StringUtil.Find(name, "Woodland") >= 0
        Return 6
    ElseIf StringUtil.Find(name, "Settlement") >= 0 || StringUtil.Find(name, "Sanctuary") >= 0 || StringUtil.Find(name, "Town") >= 0
        Return 8
    ElseIf Game.GetPlayer().IsSwimming(); no underwater check on Location — use player swim state
        Return 7
    ElseIf Game.GetPlayer().IsInInterior()
        Return 3
    EndIf
    Return 0; Default: wasteland; Default: wasteland; Default: wasteland; Default: wasteland
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; THUNDER MASKING
; ═══════════════════════════════════════════════════════════════════════════
Function OnThunderStrike()
    If !ThunderMaskingEnabled || !_isStorming
        Return
    EndIf

    _thunderMaskActive  = True
    _thunderMaskEndTime = Utility.GetCurrentGameTime() + (0.00003); ~2.5 seconds game time; ~2.5 seconds game time; ~2.5 seconds game time; ~2.5 seconds game time

    ; Nearby NPCs briefly startle
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, 800.0, 10)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && spThunderStartle != None
            ; Brief startle — doesn't trigger combat
            spThunderStartle.Cast(npc, npc)
        EndIf
        i += 1
    EndWhile

    AcousticLog("Thunder strike — gunfire masked for 2.5 seconds")
    Debug.Trace("[AAI] THUNDER_MASK|active=true|storm=" + _isStorming)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; SUPPRESSOR ACOUSTICS
; Called when player fires a suppressed weapon
; ═══════════════════════════════════════════════════════════════════════════
Function OnSuppressedShot(ObjectReference shotOrigin)
    If !SupressorAcousticsOn
        Return
    EndIf

    ; Suppressor effectiveness by location
    Float suppressedRadius = 300.0; Base suppressed alert radius; Base suppressed alert radius; Base suppressed alert radius; Base suppressed alert radius

    ; Forest: best — plants absorb residual
    If _currentLocType == 6
        suppressedRadius = 150.0
        AcousticLog("Suppressor: Forest — very effective (150 units)")

    ; Wasteland: still heard at distance (subsonic crack)
    ElseIf _currentLocType == 0
        suppressedRadius = 500.0
        AcousticLog("Suppressor: Wasteland — subsonic crack still audible (500 units)")

    ; City: reflections confuse direction
    ElseIf _currentLocType == 1
        suppressedRadius = 350.0; Heard but direction is wrong; Heard but direction is wrong; Heard but direction is wrong; Heard but direction is wrong
        AcousticLog("Suppressor: City — heard but direction confused")

    ; Vault / cave: barely helps — echo everywhere
    ElseIf _currentLocType == 4 || _currentLocType == 5
        suppressedRadius = 700.0; Suppressor nearly useless in echo chambers; Suppressor nearly useless in echo chambers; Suppressor nearly useless in echo chambers; Suppressor nearly useless in echo chambers
        AcousticLog("Suppressor: Vault/Cave — nearly useless!")
        Debug.Notification("Suppressor barely helps in here — the echo gives you away.")
    EndIf

    ; Weather modifiers
    suppressedRadius *= _currentGunMult

    ; Night bonus
    If _isNight
        suppressedRadius *= 0.85
    EndIf

    ; Alert NPCs in the suppressed radius
    Actor[] inRange = MiscUtil.ScanActors(shotOrigin, suppressedRadius, 15)
    Int i = 0
    While i < inRange.Length
        Actor npc = inRange[i]
        If npc != None && !npc.IsDead() && !npc.IsInCombat()
            npc.EvaluatePackage()
        EndIf
        i += 1
    EndWhile

    Debug.Trace("[AAI] SUPPRESSED_SHOT|radius=" + suppressedRadius + "|loc_type=" + _currentLocType + "|night=" + _isNight + "|weather=" + _currentWeather)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; FOOTSTEP MATERIAL ACOUSTICS
; Called when player steps on different surface types
; ═══════════════════════════════════════════════════════════════════════════
Function OnFootstep(String materialType)
    If !FootstepMaterialEnabled
        Return
    EndIf

    Float detectionMod = 1.0
    String notification = ""

    If materialType == "Metal"
        detectionMod = 2.0; Very loud; Very loud; Very loud; Very loud
        If _currentLocType == 5 || _currentLocType == 4; Vault or cave; Vault or cave; Vault or cave; Vault or cave
            detectionMod = 3.0; Rings out; Rings out; Rings out; Rings out
            notification = "Your footsteps ring on the metal floor!"
        EndIf

    ElseIf materialType == "Gravel" || materialType == "Rubble"
        detectionMod = 1.5

    ElseIf materialType == "Wood"
        detectionMod = 1.6
        If _currentLocType == 3 || _currentLocType == 8
            notification = "The floorboard creaks."
        EndIf

    ElseIf materialType == "Ice"
        detectionMod = 1.8
        ; Ice crack event (handled by WaterHazardManager)

    ElseIf materialType == "Water" || materialType == "Puddle"
        detectionMod = 2.2
        notification = "You're splashing — everyone hears that."

    ElseIf materialType == "Snow"
        detectionMod = 1.4

    ElseIf materialType == "Mud" || materialType == "Soil"
        detectionMod = 0.7; Quiet; Quiet; Quiet; Quiet

    ElseIf materialType == "Leaves"
        If (_isRaining); Rain wets leaves, quieter; Rain wets leaves, quieter; Rain wets leaves, quieter; Rain wets leaves, quieter
            detectionMod = 0.8
        Else
            detectionMod = 1.3
        EndIf

    ElseIf materialType == "Concrete"
        detectionMod = 1.0

    ElseIf materialType == "Carpet" || materialType == "Cloth"
        detectionMod = 0.4; Very quiet; Very quiet; Very quiet; Very quiet
    EndIf

    ; Apply rain/storm masking
    detectionMod *= (1.0 - _currentFootstepMask)
    detectionMod = Math.Max(detectionMod, 0.1); Never completely silent; Never completely silent; Never completely silent; Never completely silent

    If notification != "" && detectionMod > 1.2
        Debug.Notification(notification)
    EndIf

    Debug.Trace("[AAI] FOOTSTEP|material=" + materialType + "|detection_mod=" + detectionMod + "|rain_mask=" + _currentFootstepMask)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; CREATURE VOCALIZATIONS
; ═══════════════════════════════════════════════════════════════════════════
Function OnCreatureVocalization(Actor creature, String vocType)
    If !CreatureVocalizationOn
        Return
    EndIf

    Float alertRadius = 800.0
    Bool attractsScavengers = False
    Bool attractsPredators  = False

    If vocType == "Alert"
        ; Sharp alert call — directs pack
        alertRadius = 1500.0
        AcousticLog(creature.GetDisplayName() + " alert call — pack alerted at " + alertRadius + " units")

    ElseIf vocType == "Hunting"
        ; Low, intermittent — doesn't spook prey but predators hear it
        alertRadius = 600.0
        AcousticLog(creature.GetDisplayName() + " hunting call")

    ElseIf vocType == "Wounded"
        ; Pain cry — attracts allies AND predators
        alertRadius = 2000.0
        attractsPredators = True
        AcousticLog(creature.GetDisplayName() + " wounded cry — predators may investigate")
        Debug.Notification("Something is wounded nearby. Predators may investigate.")

    ElseIf vocType == "Territorial"
        ; Sustained roar — carries on wind
        Float _fxTmp1 = 0.6
        If !(_isStorming)
            Float _fxTmp2 = 1.3
            If !(_currentGunMult > 1.0)
                _fxTmp2 = 1.0
            EndIf
            _fxTmp1 = _fxTmp2
        EndIf
        alertRadius = 2500.0 * _fxTmp1
        AcousticLog(creature.GetDisplayName() + " territorial roar — " + alertRadius + " unit range")

    ElseIf vocType == "Feeding"
        ; Quiet possessive sounds — attracts scavengers
        alertRadius = 400.0
        attractsScavengers = True
    EndIf

    ; Alert nearby creatures of appropriate type
    Actor[] nearby = MiscUtil.ScanActors(creature, alertRadius, 10)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && npc != creature && !npc.IsDead()
            npc.EvaluatePackage()
        EndIf
        i += 1
    EndWhile

    Debug.Trace("[AAI] CREATURE_VOC|species=" + creature.GetDisplayName() + "|type=" + vocType + "|radius=" + alertRadius + "|predators=" + attractsPredators)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; GUNSHOT DETECTION RADIUS (public — used by NPC AI)
; ═══════════════════════════════════════════════════════════════════════════
Float Function GetGunShotDetectionRadius(Float baseRadius)
    Return baseRadius * _currentGunMult
EndFunction

Float Function GetStealthMultiplier()
    Return _currentStealthMult
EndFunction

Float Function GetEchoMultiplier()
    Return _currentEchoMult
EndFunction

Bool Function IsThunderMasking()
    Return _thunderMaskActive
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
Function AcousticLog(String msg)
    Debug.Trace("[AAI-Acoustic] " + msg)
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
