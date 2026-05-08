# Actor & NPC Scripting Guide

## Overview

Actor scripting controls NPC behavior, animations, dialogue, factions, combat, AI packages, and relationship systems. This guide covers comprehensive actor management and NPC behavior implementation.

**Key Concepts**:
- **Actor**: Living character with AI
- **Behavior**: Combat, dialogue, movement
- **AI Packages**: Scheduled behavior
- **Factions**: Group membership and relationships
- **Combat**: Fight mechanics and tactics

---

## Actor Fundamentals

### Actor vs ObjectReference

| Feature | Actor | ObjectReference |
|---------|-------|-----------------|
| **AI** | Yes | No |
| **Health** | Yes | No |
| **Combat** | Yes | No |
| **Dialogue** | Yes | No |
| **Spells** | Yes | Limited |
| **Packages** | Yes | No |

### Basic Actor Script

```papyrus
Scriptname MyActorScript extends Actor

Event OnInit()
  Debug.Trace("Actor initialized: " + GetName())
EndEvent

Event OnLoad()
  Debug.Trace("Actor loaded")
  SetAlert(False)
EndEvent

Event OnUnload()
  Debug.Trace("Actor unloaded")
EndEvent

Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
  If aeCombatState == 1  ; Entered combat
    Debug.Trace("In combat with: " + akTarget.GetName())
  ElseIf aeCombatState == 0  ; Left combat
    Debug.Trace("Combat ended")
  EndIf
EndEvent

Event OnDeath(Actor akKiller)
  Debug.Trace(GetName() + " died to " + akKiller.GetName())
EndEvent
```

---

## NPC Behavior

### Alert States

```papyrus
Scriptname AlertStateScript extends Actor

; Alert states: 0=Normal, 1=Alert, 2=Combat

Function SetNormalState()
  SetAlert(False)
  Debug.Trace("Normal state")
EndFunction

Function SetAlertState()
  SetAlert(True)
  Debug.Trace("Alert state")
EndFunction

Function EnterCombat(Actor akTarget)
  StartCombat(akTarget)
  Debug.Trace("Entered combat")
EndFunction

Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
  If aeCombatState == 1
    Debug.Trace("Combat state: " + aeCombatState)
  EndIf
EndEvent
```

### Emotional States

```papyrus
Scriptname EmotionalStateScript extends Actor

; Emotional states control NPC demeanor

Function SetAngry()
  SetExpressionOverride(2, 100)  ; Angry expression
EndFunction

Function SetSad()
  SetExpressionOverride(3, 100)  ; Sad expression
EndFunction

Function SetNeutral()
  SetExpressionOverride(0, 0)  ; Clear override
EndFunction

Function SetAggressive()
  SetAlert(True)
  StartCombat(Game.GetPlayer())
EndFunction

Function SetFriendly()
  SetAlert(False)
  StopCombat()
EndFunction
```

### Movement Commands

```papyrus
Scriptname MovementScript extends Actor

Property TargetLocation Auto

Function Move()
  MoveTo(TargetLocation)
EndFunction

Function MoveWithAnimation()
  SetAlert(False)
  StartMovingToObjectWaitForMove(TargetLocation, 0.5)
EndFunction

Function Teleport()
  MoveTo(TargetLocation)
EndFunction

Function ForceMove(ObjectReference akTarget)
  TranslateTo(akTarget.X, akTarget.Y, akTarget.Z, 0, 0, 0, 1000)
EndFunction

Function PushBack()
  PushActorAway(Game.GetPlayer(), 500)
EndFunction
```

---

## AI Packages

### Understanding AI Packages

AI Packages control scheduled NPC behavior:
- Location preference
- Travel distance
- Daily schedule
- Preference conditions

### Package Types

| Type | Behavior | Example |
|------|----------|---------|
| **Sleep** | Sleep at location | Rest in bed |
| **Eat** | Eat at location | Dine at table |
| **Sandbox** | Free movement | Idle in area |
| **Follow** | Follow actor | Follow player |
| **Patrol** | Path walking | Guard route |
| **Guard** | Stay at location | Guard post |
| **Wander** | Aimless movement | Exploration |
| **Flee** | Run away | Escape danger |

### Adding Packages

```papyrus
Scriptname PackageScript extends Actor

Package Property SandboxPackage Auto
Package Property SleepPackage Auto

Event OnQuestInit()
  ; Add package to queue
  AddPackage(SandboxPackage)
  Debug.Trace("Package added")
EndEvent

Function SetSchedule()
  ; Add package with priority
  AddPackage(SleepPackage)
EndFunction

Function RemovePackage()
  ; Remove specific package
  RemovePackage(SandboxPackage)
EndFunction

Function ClearPackages()
  ; Clear all packages
  ClearPackages()
EndFunction

Function SetPackageOverride()
  ; High priority package
  AddPackageOverride(CombatPackage, 100)
EndFunction
```

### Package Management

```papyrus
Scriptname PackageManagement extends Actor

Function GetCurrentPackage()
  Package current = GetCurrentPackage()
  
  If current != None
    Debug.Trace("Current package: " + current.GetName())
  Else
    Debug.Trace("No active package")
  EndIf
EndFunction

Function IsInPackage()
  If IsInPackage(GuardPackage)
    Debug.Trace("Currently in guard package")
  EndIf
EndFunction

Function ClearAndSetNew()
  ClearPackages()
  AddPackage(NewPackage)
EndFunction
```

---

## Combat and Tactics

### Combat State

```papyrus
Scriptname CombatScript extends Actor

Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
  If aeCombatState == 1
    OnEnterCombat(akTarget)
  ElseIf aeCombatState == 0
    OnLeaveCombat(akTarget)
  EndIf
EndEvent

Function OnEnterCombat(Actor akTarget)
  Debug.Trace(GetName() + " started combat with " + akTarget.GetName())
  
  ; Combat setup
  SetAlert(True)
  EquipWeapon()
  
  ; Start attacking
  StartCombat(akTarget)
EndFunction

Function OnLeaveCombat(Actor akTarget)
  Debug.Trace("Combat ended")
  
  ; Reset to normal
  SetAlert(False)
  StopCombat()
EndFunction
```

### Combat Control

```papyrus
Scriptname CombatControl extends Actor

Function StartFighting(Actor akTarget)
  If akTarget != None
    StartCombat(akTarget)
    Debug.Trace("Combat started")
  EndIf
EndFunction

Function StopFighting()
  StopCombat()
  Debug.Trace("Combat stopped")
EndFunction

Function Retreat()
  StopCombat()
  ; Add flee package
  AddPackage(FleePackage)
EndFunction

Function Surrender()
  StopCombat()
  ClearPackages()
  SetRestrained(True)
EndFunction
```

### Weapon Equipment

```papyrus
Scriptname WeaponEquipScript extends Actor

Weapon Property Sword Auto
Weapon Property Bow Auto
Weapon Property MagicSpell Auto

Function EquipMelee()
  EquipItem(Sword, True, True)
  Debug.Trace("Melee weapon equipped")
EndFunction

Function EquipRanged()
  EquipItem(Bow, True, True)
  Debug.Trace("Ranged weapon equipped")
EndFunction

Function EquipMagic()
  EquipSpell(MagicSpell, True)
  Debug.Trace("Spell equipped")
EndFunction

Function DisarmActor()
  UnequipItem(Sword)
  UnequipItem(Bow)
  Debug.Trace("Actor disarmed")
EndFunction

Function EquipBestWeapon()
  If GetItemCount(Sword) > 0
    EquipItem(Sword)
  ElseIf GetItemCount(Bow) > 0
    EquipItem(Bow)
  EndIf
EndFunction
```

---

## Health and Damage

### Health Management

```papyrus
Scriptname HealthScript extends Actor

Float Property MaxHealthPoints Auto

Function CheckHealth()
  Float health = GetActorValue("Health")
  Float maxHealth = GetBaseActorValue("Health")
  
  Debug.Trace("Health: " + health + "/" + maxHealth)
  
  If health / maxHealth < 0.25
    Debug.Trace("Low health!")
  EndIf
EndFunction

Function Heal()
  RestoreActorValue("Health", 50)
  Debug.Trace("Healed")
EndFunction

Function DamageActor(Float amount)
  DamageActorValue("Health", amount)
  Debug.Trace("Took " + amount + " damage")
EndFunction

Function IsAlive()
  Return !IsDead()
EndFunction

Function IsNearDeath()
  Float health = GetActorValue("Health")
  Return health < 10.0
EndFunction
```

### Damage Events

```papyrus
Scriptname DamageResponseScript extends Actor

Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
  Actor attacker = akAggressor as Actor
  
  If attacker != None
    Debug.Trace(GetName() + " was hit by " + attacker.GetName())
    
    If abSneakAttack
      Debug.Trace("Sneak attack!")
      TakeSneak()
    EndIf
    
    If abBashAttack
      Debug.Trace("Bash attack!")
      TakeBash()
    EndIf
  EndIf
EndEvent

Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
  If !IsDead() && GetActorValue("Health") < 10
    OnNearDeath()
  EndIf
EndEvent

Function OnNearDeath()
  Debug.Trace("Near death!")
  SetAlert(False)
  StopCombat()
EndFunction
```

---

## Factions and Relationships

### Faction Management

```papyrus
Scriptname FactionScript extends Actor

Faction Property MinersUnion Auto
Faction Property RailroadFaction Auto
Faction Property PlayerFaction Auto

Event OnQuestInit()
  AddToFaction(MinersUnion)
  SetFactionRank(MinersUnion, 0)
EndEvent

Function JoinFaction(Faction akFaction)
  If akFaction != None && !IsInFaction(akFaction)
    AddToFaction(akFaction)
    Debug.Trace("Joined faction: " + akFaction.GetName())
  EndIf
EndFunction

Function LeaveFaction(Faction akFaction)
  If akFaction != None && IsInFaction(akFaction)
    RemoveFromFaction(akFaction)
    Debug.Trace("Left faction: " + akFaction.GetName())
  EndIf
EndFunction

Function SetRank(Faction akFaction, Int aiRank)
  If IsInFaction(akFaction)
    SetFactionRank(akFaction, aiRank)
    Debug.Trace("Rank set to: " + aiRank)
  EndIf
EndFunction

Function GetFactionRank(Faction akFaction)
  If IsInFaction(akFaction)
    Return GetFactionRank(akFaction)
  EndIf
  Return -1  ; Not in faction
EndFunction
```

### Faction Relationships

```papyrus
Scriptname RelationshipScript extends Actor

Function CheckReputation(Faction akFaction)
  Int rank = GetFactionRank(akFaction)
  
  If rank == 0
    Debug.Trace("Neutral with faction")
  ElseIf rank > 0
    Debug.Trace("Allied with faction")
  ElseIf rank < 0
    Debug.Trace("Enemy of faction")
  EndIf
EndFunction

Function SetEnemy(Actor akOther)
  ; Add mutual hostility
  SetRelationshipRank(akOther, -3)
  akOther.SetRelationshipRank(Self, -3)
EndFunction

Function SetAlly(Actor akOther)
  ; Add mutual alliance
  SetRelationshipRank(akOther, 3)
  akOther.SetRelationshipRank(Self, 3)
EndFunction

Function CheckAssociation(Actor akOther)
  Int rank = GetRelationshipRank(akOther)
  
  If rank >= 1
    Debug.Trace("Likes this person")
  ElseIf rank <= -1
    Debug.Trace("Dislikes this person")
  Else
    Debug.Trace("Neutral toward this person")
  EndIf
EndFunction
```

---

## Dialogue and Interaction

### Dialogue Topics

```papyrus
Scriptname DialogueScript extends Actor

Topic Property GreetingTopic Auto
Topic Property GoodbyeTopic Auto

Function AddDialogue()
  AddTopic(GreetingTopic)
  AddTopic(GoodbyeTopic)
EndFunction

Function HasDialogue()
  If HasTopic(GreetingTopic)
    Debug.Trace("Has greeting dialogue")
  EndIf
EndFunction
```

### Dialogue States

```papyrus
Scriptname DialogueStateScript extends Actor

Event OnBeginConversation(Actor akSpeaker)
  Debug.Trace(GetName() + " starting dialogue with " + akSpeaker.GetName())
  
  ; Prepare for dialogue
  SetAlert(False)
  StopMoving()
EndEvent

Event OnEndConversation(Actor akSpeaker)
  Debug.Trace("Dialogue ended")
  
  ; Resume normal activity
  ResumePackage()
EndEvent
```

---

## Animation and Expression

### Playing Animations

```papyrus
Scriptname AnimationScript extends Actor

Function PlayAnimation(String asAnimationName)
  PlayIdle(asAnimationName)
  Debug.Trace("Playing animation: " + asAnimationName)
EndFunction

Function PlayAttackAnimation()
  PlayIdle("AttackPower")
EndFunction

Function PlayEmoteAnimation()
  PlayIdle("Emotion_Joy")
EndFunction

Function StopAnimation()
  ; Animations play to completion usually
EndFunction
```

### Animation Events

```papyrus
Scriptname AnimationEventScript extends Actor

Event OnAnimationEvent(ObjectReference akSource, String asEventName)
  If asEventName == "AttackStart"
    OnAttackStart()
  ElseIf asEventName == "AttackEnd"
    OnAttackEnd()
  EndIf
EndEvent

Function OnAttackStart()
  Debug.Trace("Attack animation started")
EndFunction

Function OnAttackEnd()
  Debug.Trace("Attack animation ended")
EndFunction
```

---

## Advanced NPC Patterns

### Dynamic AI

```papyrus
Scriptname DynamicAIScript extends Actor

Keyword Property CombatKeyword Auto
Keyword Property FriendlyKeyword Auto

Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
  Actor attacker = akAggressor as Actor
  
  ; Decide behavior based on aggressor
  If attacker.HasKeyword(FriendlyKeyword)
    Debug.Trace("Friend attacked me - retreat")
    AddPackage(FleePackage)
  Else
    Debug.Trace("Enemy attacked - fight back")
    StartCombat(attacker)
  EndIf
EndEvent
```

### Companion System

```papyrus
Scriptname CompanionScript extends Actor

Quest Property CompanionQuest Auto
Bool Property IsCompanion = False Auto

Function Recruit(Actor akPlayer)
  If !IsCompanion
    IsCompanion = True
    AddToFaction(CompanionFaction)
    SetRelationshipRank(akPlayer, 3)
    Debug.Trace("Companion recruited!")
  EndIf
EndFunction

Function Dismiss()
  If IsCompanion
    IsCompanion = False
    RemoveFromFaction(CompanionFaction)
    Debug.Trace("Companion dismissed")
  EndIf
EndFunction

Function FollowActor(Actor akTarget)
  If IsCompanion && akTarget != None
    AddPackageOverride(FollowPackage, 100)
  EndIf
EndFunction

Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
  If IsCompanion
    Actor player = GetLinkedRef() as Actor
    If player != None && akAggressor != player
      StartCombat(akAggressor as Actor)
    EndIf
  EndIf
EndEvent
```

### Stealth AI

```papyrus
Scriptname StealthAIScript extends Actor

Event OnEnterSneaking()
  Debug.Trace(GetName() + " sneaking")
EndEvent

Event OnExitSneaking()
  Debug.Trace(GetName() + " no longer sneaking")
EndEvent

Function DetectThreats()
  ; Check for nearby threats while sneaking
  If IsSneaking()
    Actor threat = Game.GetPlayer()
    If threat != None && GetDistance(threat) < 1000
      SetAlert(True)
      Debug.Trace("Threat detected!")
    EndIf
  EndIf
EndFunction
```

---

## Best Practices

### 1. Always Check for None
```papyrus
; Good
Function SafeAction(Actor akTarget)
  If akTarget != None && !akTarget.IsDead()
    akTarget.StartCombat(Self)
  EndIf
EndFunction

; Risky
Function UnsafeAction(Actor akTarget)
  akTarget.StartCombat(Self)
EndFunction
```

### 2. Use Conditions Before Actions
```papyrus
; Good: Check state first
If !IsInCombat() && IsAlert()
  StartCombat(akTarget)
EndIf

; Bad: No state checking
StartCombat(akTarget)
```

### 3. Cleanup on Death
```papyrus
Event OnDeath(Actor akKiller)
  ClearPackages()
  StopCombat()
  UnequipAll()
EndEvent
```

### 4. Manage Package Overrides
```papyrus
; Good: Clear before setting
Function SetNewPackage()
  ClearPackages()
  AddPackage(NewPackage)
EndFunction

; Bad: Conflicting packages
AddPackageOverride(Package1, 100)
AddPackageOverride(Package2, 100)
```

---

## Related Resources

- **PAPYRUS_EVENTS_AND_ACTIONS_GUIDE.md**: Actor events and action functions
- **QUEST_SCRIPTING_GUIDE.md**: NPC quest integration
- **CREATION_KIT_RESOURCES_INDEX.md**: Actor and NPC resources

---

## Quick Reference

| Task | Function |
|------|----------|
| Start combat | `StartCombat(Actor akTarget)` |
| Stop combat | `StopCombat()` |
| Move to location | `MoveTo(ObjectReference akTarget)` |
| Equipment item | `EquipItem(Form akItem, Bool abPreventRemoval, Bool abSilent)` |
| Unequip item | `UnequipItem(Form akItem, Bool abSilent)` |
| Health check | `GetActorValue("Health")` |
| Damage actor | `DamageActorValue(String asValueName, Float afAmount)` |
| Add to faction | `AddToFaction(Faction akFaction)` |
| Set faction rank | `SetFactionRank(Faction akFaction, Int aiRank)` |
| Kill actor | `Kill(Actor akKiller)` |
| Resurrect actor | `Resurrect(Bool abResetInventory)` |
| Play idle | `PlayIdle(String asIdleName)` |
| Add package | `AddPackage(Package akPackage)` |
| Remove package | `RemovePackage(Package akPackage)` |
