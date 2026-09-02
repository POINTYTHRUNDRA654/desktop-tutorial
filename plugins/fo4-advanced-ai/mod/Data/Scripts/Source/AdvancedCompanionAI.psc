; ═══════════════════════════════════════════════════════════════════════════
; AdvancedCompanionAI.psc
; Advanced AI System — Companion Enhancement + Persistent Memory System
;
; Features:
;   - Persistent conversation memory (remembers player actions & talks)
;   - Context-aware reactive dialogue
;   - Two-axis relationship model: Affinity (do they like you?) tracked
;     separately from Trust (do they rely on you?) — a companion can like
;     the player but still be wary, or trust the player's judgement without
;     being personally fond of them. See GetRelationshipQuadrant() below.
;   - Combat awareness improvements
;   - Real-personality emotional state tracking
;
; Attach to a companion actor alias.
; Requires: F4SE (for string storage), MCM Framework
; ═══════════════════════════════════════════════════════════════════════════
Scriptname AdvancedCompanionAI extends ReferenceAlias

; ── Manager ──────────────────────────────────────────────────────────────────
Quest Property AAIQuest Auto

; ── Memory Storage (uses F4SE StorageUtil via MCM integration) ───────────────
; Memory keys are stored as GlobalVariable integers and string arrays
; Persistent across saves because they're stored on the reference
GlobalVariable Property gMemSlot_01 Auto; Recent event slot 1; Recent event slot 1; Recent event slot 1; Recent event slot 1
GlobalVariable Property gMemSlot_02 Auto; Recent event slot 2; Recent event slot 2; Recent event slot 2; Recent event slot 2
GlobalVariable Property gMemSlot_03 Auto; Recent event slot 3; Recent event slot 3; Recent event slot 3; Recent event slot 3
GlobalVariable Property gLastSeen   Auto; Game time of last player encounter; Game time of last player encounter; Game time of last player encounter; Game time of last player encounter
GlobalVariable Property gAffinity   Auto; Current affinity value (mirrors vanilla); Current affinity value (mirrors vanilla); Current affinity value (mirrors vanilla); Current affinity value (mirrors vanilla)

; ── Dialogue Topics (set via CK — companion must have these available) ────────
Topic Property topicRememberKill      Auto; "I remember when you took down that..."; "I remember when you took down that..."; "I remember when you took down that..."; "I remember when you took down that..."
Topic Property topicRememberLocation  Auto; "We've been here before..."; "We've been here before..."; "We've been here before..."; "We've been here before..."
Topic Property topicRememberConvo     Auto; "Last time we talked about..."; "Last time we talked about..."; "Last time we talked about..."; "Last time we talked about..."
Topic Property topicGreetLongAbsence  Auto; "It's been a while since I've seen you"; "It's been a while since I've seen you"; "It's been a while since I've seen you"; "It's been a while since I've seen you"
Topic Property topicGreetRecent       Auto; "Good to see you again so soon"; "Good to see you again so soon"; "Good to see you again so soon"; "Good to see you again so soon"
Topic Property topicReactPositive     Auto; React to player doing something they like; React to player doing something they like; React to player doing something they like; React to player doing something they like
Topic Property topicReactNegative     Auto; React to player doing something they dislike; React to player doing something they dislike; React to player doing something they dislike; React to player doing something they dislike

; ── Affinity Properties ───────────────────────────────────────────────────────
float Property AffinityLike    =  250.0 Auto
float Property AffinityDislike = -250.0 Auto
float Property AffinityLoathe  = -750.0 Auto
float Property AffinityIdolize =  750.0 Auto

; ── Trust Properties (second relationship axis, -1.0 to 1.0) ─────────────────
; Distinct from Affinity: built by reliability/shared hardship, not likability.
float Property TrustHigh = 0.6  Auto
float Property TrustLow  = -0.6 Auto

; ── Relationship Quadrant Codes (combine Affinity + Trust) ────────────────────
int Property QUADRANT_DEVOTED           = 0 Auto Const; High trust, high affinity; High trust, high affinity; High trust, high affinity; High trust, high affinity
int Property QUADRANT_CHARMED_WARY      = 1 Auto Const; Low trust, high affinity; Low trust, high affinity; Low trust, high affinity; Low trust, high affinity
int Property QUADRANT_RESPECTED_DISTANT = 2 Auto Const; High trust, low affinity; High trust, low affinity; High trust, low affinity; High trust, low affinity
int Property QUADRANT_ESTRANGED         = 3 Auto Const; Low trust, low affinity; Low trust, low affinity; Low trust, low affinity; Low trust, low affinity
int Property QUADRANT_NEUTRAL           = 4 Auto Const; Not yet decisively formed; Not yet decisively formed; Not yet decisively formed; Not yet decisively formed

; ── Personality Properties ────────────────────────────────────────────────────
; These define how this specific companion reacts — set per-companion in CK
float Property PersonalityAggression  = 0.3  Auto; 0-1; 0-1; 0-1; 0-1
float Property PersonalityMorality    = 0.6  Auto; 0=evil 1=good; 0=evil 1=good; 0=evil 1=good; 0=evil 1=good
float Property PersonalityLoyalty     = 0.8  Auto; How likely to stay through hard times; How likely to stay through hard times; How likely to stay through hard times; How likely to stay through hard times
bool  Property LikesViolence          = False Auto
bool  Property LikesStealth           = False Auto
bool  Property LikesGenerosity        = True  Auto
bool  Property LikesCrime             = False Auto

; ── Memory Event Codes ────────────────────────────────────────────────────────
; These int codes are stored in gMemSlot variables to represent what happened
int Property MEM_NONE           = 0  Auto Const
int Property MEM_KILL_BOSS      = 1  Auto Const
int Property MEM_STEALTH_KILL   = 2  Auto Const
int Property MEM_HELPED_SETTLER = 3  Auto Const
int Property MEM_STOLE_ITEM     = 4  Auto Const
int Property MEM_PICKED_LOCK    = 5  Auto Const
int Property MEM_KILLED_NEUTRAL = 6  Auto Const
int Property MEM_GAVE_GIFT      = 7  Auto Const
int Property MEM_ENTERED_VAULT  = 8  Auto Const
int Property MEM_SURVIVED_FIGHT = 9  Auto Const
int Property MEM_PLAYER_LEVEL_UP = 10 Auto Const

; ── State ─────────────────────────────────────────────────────────────────────
Actor _actor
String _npcId; ActorBase FormID as string — matches the npc_id format the Mossy bridge expects; ActorBase FormID as string — matches the npc_id format the Mossy bridge expects; ActorBase FormID as string — matches the npc_id format the Mossy bridge expects; ActorBase FormID as string — matches the npc_id format the Mossy bridge expects
float _curAffinity
float _curTrust; Second relationship axis, -1.0 to 1.0; Second relationship axis, -1.0 to 1.0; Second relationship axis, -1.0 to 1.0; Second relationship axis, -1.0 to 1.0
int   _emotionState; 0=neutral 1=happy 2=concerned 3=angry

; ════════════════════════════════════════════════════════════════════════════
Event OnAliasInit()
    _actor = GetActorReference() as Actor
    If _actor == None
        Return
    EndIf

    _npcId = "" + _actor.GetActorBase().GetFormID()

    ; Restore affinity from global
    If gAffinity != None
        _curAffinity = gAffinity.GetValue()
    EndIf

    RegisterForRemoteEvent(_actor, "OnCombatStateChanged")
    RegisterForHitEvent(_actor)
    AddInventoryEventFilter(None); receive all item-added events
    RegisterForRemoteEvent(Game.GetPlayer(), "OnItemAdded")
    RegisterForPlayerTeleport()
    RegisterForRemoteEvent(Game.GetPlayer(), "OnLocationChange")
    ; player level-ups detected by polling in OnTimerGameTime (FO4 has no OnLevelUp event)

    _f4aiTickHours = 1.0

    ; Apply AI enhancements
    ApplyPersonalityAV()

    ; Schedule periodic "ambient thoughts"
    ScheduleTick(1.0)
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; PERSONALITY → ACTORVALUES
; ════════════════════════════════════════════════════════════════════════════
Function ApplyPersonalityAV()
    ActorValue avAggr  = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
    ActorValue avConf  = Game.GetFormFromFile(0x000002E8, "Fallout4.esm") as ActorValue
    ActorValue avMood  = Game.GetFormFromFile(0x000002EA, "Fallout4.esm") as ActorValue
    ActorValue avAsst  = Game.GetFormFromFile(0x000002EB, "Fallout4.esm") as ActorValue

    If avAggr != None
        _actor.SetValue(avAggr, PersonalityAggression * 100.0)
    EndIf
    If avConf != None
        _actor.SetValue(avConf, Math.Min(70.0 + (PersonalityLoyalty * 30.0), 100.0))
    EndIf
    If avMood != None
        _actor.SetValue(avMood, 50.0 + (_curAffinity / 20.0)); Mood tracks affinity; Mood tracks affinity; Mood tracks affinity; Mood tracks affinity
    EndIf
    If avAsst != None
        _actor.SetValue(avAsst, 80.0); Companions always helpful; Companions always helpful; Companions always helpful; Companions always helpful
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; MEMORY SYSTEM — Record Events
; ════════════════════════════════════════════════════════════════════════════
Function RecordMemory(Int memCode)
    ; Shift memory slots (slot 3 = oldest, slot 1 = newest)
    If gMemSlot_02 != None && gMemSlot_03 != None
        gMemSlot_03.SetValue(gMemSlot_02.GetValue())
    EndIf
    If gMemSlot_01 != None && gMemSlot_02 != None
        gMemSlot_02.SetValue(gMemSlot_01.GetValue())
    EndIf
    If gMemSlot_01 != None
        gMemSlot_01.SetValue(memCode as Float)
    EndIf

    ; Update last seen time
    If gLastSeen != None
        gLastSeen.SetValue(Utility.GetCurrentGameTime())
    EndIf

    ; Machine-parseable line the Mossy bridge's AAI_MEMORY_PATTERN listens for
    ; (previously this only wrote a human-readable trace, so companion memories
    ; never actually reached the bridge/Knowledge Vault — see AAI_MEM below)
    Debug.Trace("[AAI] AAI_MEM|npc_id=" + _npcId + "|npc_name=" + _actor.GetDisplayName() + "|event=" + memCode + "|detail=" + GetMemoryDescription(memCode) + "|time=" + Utility.GetCurrentGameTime())
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; MEMORY SYSTEM — Greet Player (check time since last seen)
; ════════════════════════════════════════════════════════════════════════════
Function DoGameTimeTick()
    If _actor == None || _actor.IsDead()
        Return
    EndIf

    ; Check if player is nearby and companion should greet
    Actor player = Game.GetPlayer()
    If player != None && _actor.GetDistance(player) < 300.0 && !_actor.IsInCombat()
        CheckTimedGreeting()
    EndIf

    ; Update mood ActorValue to match current affinity
    ActorValue avMood = Game.GetFormFromFile(0x000002EA, "Fallout4.esm") as ActorValue
    If avMood != None
        _actor.SetValue(avMood, Math.Clamp(50.0 + (_curAffinity / 20.0), 0.0, 100.0))
    EndIf

    ScheduleTick(1.0)
EndFunction
Function CheckTimedGreeting()
    If gLastSeen == None
        Return
    EndIf

    Float lastSeen = gLastSeen.GetValue()
    Float now      = Utility.GetCurrentGameTime()
    Float hoursPassed = (now - lastSeen) * 24.0; Convert game days to hours; Convert game days to hours; Convert game days to hours; Convert game days to hours

    If hoursPassed > 72.0 && topicGreetLongAbsence != None
        ; Been a long time — greet warmly
        _actor.Say(topicGreetLongAbsence, Game.GetPlayer(), False)
        gLastSeen.SetValue(now)
    ElseIf hoursPassed > 0.5 && hoursPassed < 2.0 && topicGreetRecent != None
        ; Saw them recently
        _actor.Say(topicGreetRecent, Game.GetPlayer(), False)
        gLastSeen.SetValue(now)
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; MEMORY RECALL — can be called from dialogue conditions
; Used by CK dialogue conditions: GetScriptVariable / CallFunction
; ════════════════════════════════════════════════════════════════════════════
Bool Function RemembersEvent(Int memCode)
    If gMemSlot_01 != None && gMemSlot_01.GetValue() as Int == memCode
        Return True
    EndIf
    If gMemSlot_02 != None && gMemSlot_02.GetValue() as Int == memCode
        Return True
    EndIf
    If gMemSlot_03 != None && gMemSlot_03.GetValue() as Int == memCode
        Return True
    EndIf
    Return False
EndFunction

Int Function GetMostRecentMemory()
    If gMemSlot_01 != None
        Return gMemSlot_01.GetValue() as Int
    EndIf
    Return MEM_NONE
EndFunction

String Function GetMemoryDescription(Int memCode)
    If memCode == MEM_KILL_BOSS
        Return "that fight against the boss"
    ElseIf memCode == MEM_STEALTH_KILL
        Return "that silent takedown"
    ElseIf memCode == MEM_HELPED_SETTLER
        Return "helping those settlers"
    ElseIf memCode == MEM_STOLE_ITEM
        Return "that... item you borrowed"
    ElseIf memCode == MEM_GAVE_GIFT
        Return "the gift you gave me"
    ElseIf memCode == MEM_SURVIVED_FIGHT
        Return "that fight we barely survived"
    ElseIf memCode == MEM_ENTERED_VAULT
        Return "that vault we explored"
    ElseIf memCode == MEM_PLAYER_LEVEL_UP
        Return "how far you've come"
    EndIf
    Return "something that happened between us"
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; AFFINITY — PLAYER ACTION HOOKS
; ════════════════════════════════════════════════════════════════════════════
; Remote OnItemAdded from the player (OnPlayerAcquireItem does not exist in FO4)
Event ObjectReference.OnItemAdded(ObjectReference akSender, Form akBaseItem, Int aiItemCount, ObjectReference akItemReference, ObjectReference akSourceContainer)
    ; Track item pickups for personality reactions
    ; (Specific items would be listed in properties — this is the hook)
EndEvent

Event Actor.OnLocationChange(Actor akSender, Location akOldLoc, Location akNewLoc)
    ; Remember important location visits
    If akNewLoc != None
        String locName = akNewLoc.GetName()
        If locName != ""
            RecordMemory(MEM_ENTERED_VAULT); Would check location type in full impl; Would check location type in full impl; Would check location type in full impl; Would check location type in full impl
        EndIf
    EndIf
EndEvent

Function PlayerLeveledUp(Int aiNewLevel)
    RecordMemory(MEM_PLAYER_LEVEL_UP)
    ; React to player leveling
    ActorValue avMood = Game.GetFormFromFile(0x000002EA, "Fallout4.esm") as ActorValue
    If avMood != None
        _actor.SetValue(avMood, Math.Min(_actor.GetValue(avMood) + 5.0, 100.0))
    EndIf
    If topicReactPositive != None
        _actor.Say(topicReactPositive, Game.GetPlayer(), False)
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; AFFINITY SYSTEM
; ════════════════════════════════════════════════════════════════════════════
Function ModAffinity(Float delta)
    _curAffinity = Math.Clamp(_curAffinity + delta, AffinityLoathe, AffinityIdolize)

    ; Persist to global
    If gAffinity != None
        gAffinity.SetValue(_curAffinity)
    EndIf

    ; Update emotional state
    If _curAffinity >= AffinityIdolize
        _emotionState = 1; Happy; Happy; Happy; Happy
    ElseIf _curAffinity <= AffinityLoathe
        _emotionState = 3; Angry; Angry; Angry; Angry
    ElseIf _curAffinity <= AffinityDislike
        _emotionState = 2; Concerned; Concerned; Concerned; Concerned
    Else
        _emotionState = 0; Neutral; Neutral; Neutral; Neutral
    EndIf

    ; Sync to ActorValue mood
    ApplyPersonalityAV()
    Debug.Trace("[AAI-Companion] Affinity: " + _curAffinity + " | Emotion: " + _emotionState)
    ; Machine-parseable line the Mossy bridge's AAI_AFFINITY_PATTERN listens for
    ; (previously this only wrote the human-readable trace above, so affinity
    ; never actually synced to the bridge/Knowledge Vault database)
    Debug.Trace("[AAI] AAI_AFF|npc_id=" + _npcId + "|affinity=" + _curAffinity + "|emotion=" + _emotionState)
EndFunction

Float Function GetAffinity()
    Return _curAffinity
EndFunction

Int Function GetEmotionState()
    Return _emotionState
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; TRUST — SECOND RELATIONSHIP AXIS
; Distinct from Affinity: Affinity is "do they like you," Trust is "do they
; rely on you." A companion can like the player yet still be wary (low trust,
; high affinity) or respect the player's judgement without being personally
; fond of them (high trust, low affinity) — see GetRelationshipQuadrant().
; ════════════════════════════════════════════════════════════════════════════
Function ModTrust(Float delta, String reason = "unspecified")
    _curTrust = Math.Clamp(_curTrust + delta, -1.0, 1.0)

    Debug.Trace("[AAI-Companion] Trust: " + _curTrust + " | Reason: " + reason)
    ; Feeds the bridge's existing npc_personality.trust_player column via
    ; drift_personality() — same PERSONALITY_DRIFT line format AdvancedWorldMemory
    ; already emits, so both scripts share one bridge-side parser.
    Debug.Trace("[AAI] PERSONALITY_DRIFT|npc_id=" + _npcId + "|npc_name=" + _actor.GetDisplayName() + "|aggr=0.0|moral=0.0|loyal=0.0|trust=" + delta + "|reason=" + reason)
EndFunction

Float Function GetTrust()
    Return _curTrust
EndFunction

; PUBLIC API — lets other mods/quest scripts safely modify trust, mirroring ExternalAffinityMod
Function ExternalTrustMod(Float delta, Bool fromModder)
    ModTrust(delta, "external_mod")
    If fromModder
        Debug.Trace("[AAI] ExternalTrustMod|delta=" + delta)
    EndIf
EndFunction

; Combines Affinity + Trust into one of five relationship states
Int Function GetRelationshipQuadrant()
    Bool highTrust = _curTrust   >= TrustHigh
    Bool lowTrust   = _curTrust   <= TrustLow
    Bool highAff    = _curAffinity >= AffinityLike
    Bool lowAff     = _curAffinity <= AffinityDislike

    If highTrust && highAff
        Return QUADRANT_DEVOTED
    ElseIf lowTrust && highAff
        Return QUADRANT_CHARMED_WARY
    ElseIf highTrust && lowAff
        Return QUADRANT_RESPECTED_DISTANT
    ElseIf lowTrust && lowAff
        Return QUADRANT_ESTRANGED
    EndIf
    Return QUADRANT_NEUTRAL
EndFunction

; Human-readable description for dialogue writers / MCM display
String Function GetRelationshipDescription()
    Int q = GetRelationshipQuadrant()
    If q == QUADRANT_DEVOTED
        Return "Devoted — trusts you completely and genuinely likes you"
    ElseIf q == QUADRANT_CHARMED_WARY
        Return "Charmed but wary — enjoys your company but hasn't fully let their guard down"
    ElseIf q == QUADRANT_RESPECTED_DISTANT
        Return "Respected but distant — relies on your judgement but isn't personally fond of you"
    ElseIf q == QUADRANT_ESTRANGED
        Return "Estranged — neither trusts nor particularly likes you right now"
    EndIf
    Return "Neutral — still forming an opinion of you"
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; COMBAT
; ════════════════════════════════════════════════════════════════════════════
Event Actor.OnCombatStateChanged(Actor akSender, Actor akTarget, Int aeCombatState)
    If aeCombatState == 1
        ; Record that we survived a fight together
        RecordMemory(MEM_SURVIVED_FIGHT)
        ModAffinity(5.0); Small bond from fighting together; Small bond from fighting together; Small bond from fighting together; Small bond from fighting together
        ModTrust(0.03, "survived_combat_together"); Trust grows from proven reliability under fire, distinct from simple fondness; Trust grows from proven reliability under fire, distinct from simple fondness; Trust grows from proven reliability under fire, distinct from simple fondness; Trust grows from proven reliability under fire, distinct from simple fondness
    EndIf
EndEvent

Event OnHit(ObjectReference akTarget, ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked, String apMaterial)
    RegisterForHitEvent(_actor); hit events are single-shot in FO4 — re-arm immediately
    ; If companion gets hit, slight negative affinity (player dragging them into danger)
    ModAffinity(-1.0)
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; PUBLIC API (for other mods to integrate with)
; ════════════════════════════════════════════════════════════════════════════
; Call: (companionRef.GetLinkedRef() as AdvancedCompanionAI).TriggerMemoryDialogue()
Function TriggerMemoryDialogue()
    Int recentMem = GetMostRecentMemory()
    If recentMem != MEM_NONE && topicRememberKill != None
        _actor.Say(topicRememberKill, Game.GetPlayer(), False)
    EndIf
EndFunction

Function ExternalAffinityMod(Float delta, Bool fromModder)
    ; Allow other mods to safely modify affinity through this system
    ModAffinity(delta)
    If fromModder
        Debug.Trace("[AAI] ExternalAffinityMod|delta=" + delta)
    EndIf
EndFunction

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours
Int _f4aiLastPlayerLevel

Function ScheduleTick(Float afHours)
    _f4aiTickHours = afHours
    StartTimerGameTime(afHours, 900)
EndFunction

Event OnTimerGameTime(Int aiTimerID)
    If aiTimerID == 900
        StartTimerGameTime(_f4aiTickHours, 900)
        Int lvlNow = Game.GetPlayer().GetLevel()
        If _f4aiLastPlayerLevel > 0 && lvlNow > _f4aiLastPlayerLevel
            PlayerLeveledUp(lvlNow)
        EndIf
        _f4aiLastPlayerLevel = lvlNow
        DoGameTimeTick()
    EndIf
EndEvent
