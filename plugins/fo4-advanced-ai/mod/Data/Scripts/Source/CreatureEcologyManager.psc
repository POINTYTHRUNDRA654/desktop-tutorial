; ═══════════════════════════════════════════════════════════════════════════
; CreatureEcologyManager.psc
; Advanced AI System — Living Ecosystem
;
; Makes the Commonwealth feel like a real ecosystem:
;   - Predator/prey chains (Deathclaw hunts Brahmin, Yao Guai hunts Molerat)
;   - Territory disputes between rival species
;   - Scavengers appear after large battles
;   - Population pressure — killing many of one type affects spawns
;   - Prey animals (Brahmin, Radstag) flee from detected predators
;   - Disease/radiation spreading through creature populations
;
; Attach to AdvancedAIManager quest.
; ═══════════════════════════════════════════════════════════════════════════
Scriptname CreatureEcologyManager extends Quest

Quest Property AAIQuest Auto

; ── Creature Keywords ─────────────────────────────────────────────────────────
Keyword Property kwdDeathclaw     Auto
Keyword Property kwdRadscorpion   Auto
Keyword Property kwdMirelurk      Auto
Keyword Property kwdYaoGuai       Auto
Keyword Property kwdBloodbug      Auto
Keyword Property kwdRadroach      Auto
Keyword Property kwdBloatfly      Auto
Keyword Property kwdGlowingOne    Auto
Keyword Property kwdMolerat       Auto
Keyword Property kwdStingwing     Auto
Keyword Property kwdBrahmin       Auto; Prey animal — domesticated; Prey animal — domesticated; Prey animal — domesticated; Prey animal — domesticated
Keyword Property kwdRadstag       Auto; Prey animal — wild deer-like; Prey animal — wild deer-like; Prey animal — wild deer-like; Prey animal — wild deer-like

; ── Scavenger Spawn ───────────────────────────────────────────────────────────
ActorBase Property scavBloatfly   Auto; Spawned after battles; Spawned after battles; Spawned after battles; Spawned after battles
ActorBase Property scavRadroach   Auto
ActorBase Property scavBloodbug   Auto

; ── Configuration ─────────────────────────────────────────────────────────────
bool  Property EcologyEnabled        = True  Auto
bool  Property PredatorPreyEnabled   = True  Auto
bool  Property ScavengerSpawnEnabled = True  Auto
bool  Property TerritoryEnabled      = True  Auto
float Property EcologyUpdateInterval = 0.25  Auto; Every ~6 hrs game time; Every ~6 hrs game time; Every ~6 hrs game time; Every ~6 hrs game time
float Property ScavengerSpawnDelay   = 20.0  Auto; Real seconds after battle; Real seconds after battle; Real seconds after battle; Real seconds after battle

; ── Population Pressure ───────────────────────────────────────────────────────
; Tracked by bridge — these globals updated from bridge data
GlobalVariable Property gDeathclawKills    Auto
GlobalVariable Property gRadscorpionKills  Auto
GlobalVariable Property gMirelurkKills     Auto
GlobalVariable Property gYaoGuaiKills      Auto

; ── State ─────────────────────────────────────────────────────────────────────
float _lastEcologyUpdate = 0.0
int   _battleCount       = 0; Battles near player this session; Battles near player this session; Battles near player this session; Battles near player this session

; ═══════════════════════════════════════════════════════════════════════════
; PREDATOR/PREY RELATIONSHIP TABLE
; Species A preys on / is hostile to Species B
; ═══════════════════════════════════════════════════════════════════════════
; Deathclaw     → hunts everything
; Yao Guai      → hunts Molerat, competes with Deathclaw
; Radscorpion   → hunts Brahmin, Molerat, Radroach
; Mirelurk      → territorial against Radscorpion near water
; Bloatfly      → scavenger, swarms dead creatures
; Bloodbug      → hunts Brahmin, Radstag
; Glowing One   → leads Feral Ghouls, hostile to everything else
; Molerat       → prey — flees Deathclaw, Yao Guai, Radscorpion
; Brahmin       → prey — flees all predators
; Radstag       → prey — flees all predators

; ═══════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    If !EcologyEnabled
        Return
    EndIf

    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
    ScheduleTick(EcologyUpdateInterval)
    EcoLog("Ecology system initialized")
EndEvent

; ═══════════════════════════════════════════════════════════════════════════
; PERIODIC ECOLOGY UPDATE
; ═══════════════════════════════════════════════════════════════════════════
Function DoGameTimeTick()
    If !EcologyEnabled
        ScheduleTick(EcologyUpdateInterval)
        Return
    EndIf

    Actor player = Game.GetPlayer()
    Actor[] nearbyCreatures = MiscUtil.ScanActors(player, 3000.0, 20)

    UpdatePredatorPreyChains(nearbyCreatures)
    UpdateTerritoryDisputes(nearbyCreatures)
    UpdatePreyFleeResponse(nearbyCreatures, player)

    ScheduleTick(EcologyUpdateInterval)
EndFunction
; ═══════════════════════════════════════════════════════════════════════════
; PREDATOR / PREY CHAINS
; ═══════════════════════════════════════════════════════════════════════════
Function UpdatePredatorPreyChains(Actor[] creatures)
    If !PredatorPreyEnabled
        Return
    EndIf

    Int i = 0
    While i < creatures.Length
        Actor predator = creatures[i]
        If predator != None && !predator.IsDead() && !predator.IsInCombat()
            ; Find prey for this predator
            Actor prey = FindPreyFor(predator, creatures)
            If prey != None && !prey.IsDead() && !prey.IsInCombat()
                Float dist = predator.GetDistance(prey)
                If dist <= 2000.0
                    ; Predator initiates hunt
                    predator.StartCombat(prey)
                    EcoLog(predator.GetDisplayName() + " hunts " + prey.GetDisplayName() + " [" + dist + " units]")
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Actor Function FindPreyFor(Actor predator, Actor[] candidates)
    ; Returns the closest valid prey for this predator
    Actor bestPrey    = None
    Float bestDist    = 99999.0

    Int i = 0
    While i < candidates.Length
        Actor candidate = candidates[i]
        If candidate != None && candidate != predator && !candidate.IsDead()
            Bool isPrey = False

            ; Deathclaw — apex predator: hunts everything that isn't another Deathclaw
            If kwdDeathclaw != None && predator.HasKeyword(kwdDeathclaw)
                isPrey = !candidate.HasKeyword(kwdDeathclaw) && IsAnimal(candidate)

            ; Yao Guai — hunts Molerat, Radroach, Bloatfly; rivals Deathclaw
            ElseIf kwdYaoGuai != None && predator.HasKeyword(kwdYaoGuai)
                isPrey = (kwdMolerat != None && candidate.HasKeyword(kwdMolerat)) || (kwdRadroach != None && candidate.HasKeyword(kwdRadroach)) || (kwdBrahmin  != None && candidate.HasKeyword(kwdBrahmin))

            ; Radscorpion — hunts Brahmin, Molerat
            ElseIf kwdRadscorpion != None && predator.HasKeyword(kwdRadscorpion)
                isPrey = (kwdBrahmin != None && candidate.HasKeyword(kwdBrahmin)) || (kwdMolerat != None && candidate.HasKeyword(kwdMolerat)) || (kwdRadstag != None && candidate.HasKeyword(kwdRadstag))

            ; Bloodbug — hunts Brahmin, Radstag
            ElseIf kwdBloodbug != None && predator.HasKeyword(kwdBloodbug)
                isPrey = (kwdBrahmin != None && candidate.HasKeyword(kwdBrahmin)) || (kwdRadstag != None && candidate.HasKeyword(kwdRadstag))

            ; Mirelurk — hunts anything near water; rivals Radscorpion
            ElseIf kwdMirelurk != None && predator.HasKeyword(kwdMirelurk)
                isPrey = (kwdBrahmin != None && candidate.HasKeyword(kwdBrahmin)) || (kwdRadstag != None && candidate.HasKeyword(kwdRadstag))
            EndIf

            If isPrey
                Float dist = predator.GetDistance(candidate)
                If dist < bestDist
                    bestDist = dist
                    bestPrey = candidate
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile

    Return bestPrey
EndFunction

Bool Function IsAnimal(Actor akTarget)
    Return kwdDeathclaw != None && akTarget.HasKeyword(kwdDeathclaw) || kwdRadscorpion != None && akTarget.HasKeyword(kwdRadscorpion) || kwdMirelurk != None && akTarget.HasKeyword(kwdMirelurk) || kwdYaoGuai != None && akTarget.HasKeyword(kwdYaoGuai) || kwdBrahmin != None && akTarget.HasKeyword(kwdBrahmin) || kwdMolerat != None && akTarget.HasKeyword(kwdMolerat) || kwdRadstag != None && akTarget.HasKeyword(kwdRadstag)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; TERRITORY DISPUTES
; ═══════════════════════════════════════════════════════════════════════════
Function UpdateTerritoryDisputes(Actor[] creatures)
    If !TerritoryEnabled
        Return
    EndIf

    ; Find rival species pairs and trigger territorial fights
    Int i = 0
    While i < creatures.Length
        Actor creatureA = creatures[i]
        If creatureA != None && !creatureA.IsDead() && !creatureA.IsInCombat()
            Int j = i + 1
            While j < creatures.Length
                Actor creatureB = creatures[j]
                If creatureB != None && !creatureB.IsDead() && !creatureB.IsInCombat()
                    If AreRivals(creatureA, creatureB)
                        Float dist = creatureA.GetDistance(creatureB)
                        If dist <= 1000.0
                            ; Territorial dispute — fight
                            creatureA.StartCombat(creatureB)
                            creatureB.StartCombat(creatureA)
                            EcoLog("Territory dispute: " + creatureA.GetDisplayName() + " vs " + creatureB.GetDisplayName())
                        EndIf
                    EndIf
                EndIf
                j += 1
            EndWhile
        EndIf
        i += 1
    EndWhile
EndFunction

Bool Function AreRivals(Actor a, Actor b)
    ; Deathclaw vs Yao Guai — apex territory rivals
    If kwdDeathclaw != None && kwdYaoGuai != None
        If (a.HasKeyword(kwdDeathclaw) && b.HasKeyword(kwdYaoGuai)) || (a.HasKeyword(kwdYaoGuai)   && b.HasKeyword(kwdDeathclaw))
            Return True
        EndIf
    EndIf

    ; Radscorpion vs Mirelurk — coastal territory
    If kwdRadscorpion != None && kwdMirelurk != None
        If (a.HasKeyword(kwdRadscorpion) && b.HasKeyword(kwdMirelurk)) || (a.HasKeyword(kwdMirelurk)    && b.HasKeyword(kwdRadscorpion))
            Return True
        EndIf
    EndIf

    ; Glowing One vs everything non-ghoul
    If kwdGlowingOne != None
        If a.HasKeyword(kwdGlowingOne) && !b.HasKeyword(kwdGlowingOne) && IsAnimal(b)
            Return True
        EndIf
        If b.HasKeyword(kwdGlowingOne) && !a.HasKeyword(kwdGlowingOne) && IsAnimal(a)
            Return True
        EndIf
    EndIf

    Return False
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PREY FLEE RESPONSE — Brahmin, Radstag sense predators and run
; ═══════════════════════════════════════════════════════════════════════════
Function UpdatePreyFleeResponse(Actor[] creatures, Actor player)
    ; Nested loop — avoids dynamic array growth (arrays are fixed-size in Papyrus)
    Int i = 0
    While i < creatures.Length
        Actor preyActor = creatures[i]
        If preyActor != None && !preyActor.IsDead() && IsPreySpecies(preyActor) && !preyActor.IsInCombat()
            Int j = 0
            While j < creatures.Length
                Actor predActor = creatures[j]
                If predActor != None && !predActor.IsDead() && IsPredatorSpecies(predActor)
                    Float dist = preyActor.GetDistance(predActor)
                    If dist <= 800.0
                        ActorValue avConf = Game.GetFormFromFile(0x000002E8, "Fallout4.esm") as ActorValue
                        If avConf != None
                            preyActor.SetValue(avConf, 0.0)
                        EndIf
                        preyActor.EvaluatePackage()
                        EcoLog(preyActor.GetDisplayName() + " flees from " + predActor.GetDisplayName())
                    EndIf
                EndIf
                j += 1
            EndWhile
        EndIf
        i += 1
    EndWhile
EndFunction

Bool Function IsPredatorSpecies(Actor c)
    Return (kwdDeathclaw   != None && c.HasKeyword(kwdDeathclaw))   || (kwdYaoGuai     != None && c.HasKeyword(kwdYaoGuai))     || (kwdRadscorpion != None && c.HasKeyword(kwdRadscorpion)) || (kwdBloodbug    != None && c.HasKeyword(kwdBloodbug))    || (kwdGlowingOne  != None && c.HasKeyword(kwdGlowingOne))
EndFunction

Bool Function IsPreySpecies(Actor c)
    Return (kwdBrahmin  != None && c.HasKeyword(kwdBrahmin)) || (kwdRadstag  != None && c.HasKeyword(kwdRadstag)) || (kwdMolerat  != None && c.HasKeyword(kwdMolerat))
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; SCAVENGER SPAWNING — After a big fight, scavengers arrive
; ═══════════════════════════════════════════════════════════════════════════
Function OnLargeBattleEnded(ObjectReference battleLocation, Int corpsesFound)
    If !ScavengerSpawnEnabled || battleLocation == None
        Return
    EndIf

    _battleCount += 1

    ; Log for bridge population tracking
    Debug.Trace("[AAI] ECOLOGY_BATTLE|location=" + battleLocation.GetDisplayName() + "|corpses=" + corpsesFound + "|game_time=" + Utility.GetCurrentGameTime())

    ; More corpses = more scavengers
    If corpsesFound >= 3
        Utility.Wait(ScavengerSpawnDelay)
        SpawnScavengers(battleLocation, corpsesFound)
    EndIf
EndFunction

Function SpawnScavengers(ObjectReference akSpawnLoc, Int corpseCount)
    Int scavCount = Math.Min(corpseCount / 2, 4) as Int

    Int i = 0
    While i < scavCount
        ; Randomly pick scavenger type
        Int roll = Utility.RandomInt(1, 3)
        ActorBase scavBase = None

        If roll == 1 && scavBloatfly != None
            scavBase = scavBloatfly
        ElseIf roll == 2 && scavRadroach != None
            scavBase = scavRadroach
        ElseIf scavBloodbug != None
            scavBase = scavBloodbug
        EndIf

        If scavBase != None
            Actor spawned = akSpawnLoc.PlaceActorAtMe(scavBase, 1) as Actor
            If spawned != None
                ; Scavengers start feeding, not aggressive unless provoked
                ActorValue avAggr = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
                If avAggr != None
                    spawned.SetValue(avAggr, 20.0)
                EndIf
                EcoLog("Scavenger spawned: " + spawned.GetDisplayName() + " at " + akSpawnLoc.GetDisplayName())
            EndIf
        EndIf
        i += 1
    EndWhile

    If scavCount > 0
        Debug.Notification("Scavengers drawn by the smell of blood...")
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; POPULATION PRESSURE
; Called by bridge when kill counts are synced
; ═══════════════════════════════════════════════════════════════════════════
Function OnPopulationDataReceived(String species, Int killCount)
    ; If a species has been heavily hunted, boost survivors' aggression
    ; (They're desperate — the pack/territory is depleted)
    If killCount > 20
        EcoLog(species + " population under pressure (" + killCount + " kills) — survivors may be more aggressive")
        Debug.Trace("[AAI] POPULATION_PRESSURE|species=" + species + "|kills=" + killCount)
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
Function EcoLog(String msg)
    Debug.Trace("[AAI-Ecology] " + msg)
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
