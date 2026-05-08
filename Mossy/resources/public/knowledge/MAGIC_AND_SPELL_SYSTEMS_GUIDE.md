# Magic & Spell Systems Guide

## Overview

Magic in Fallout 4 involves spells, perks, effects, keywords, and actor abilities. Magic systems control spell casting, effect application, potions, enchantments, and supernatural abilities.

**Key Concepts**:
- **Spells**: Cast-able magical effects
- **Effects**: Visual/gameplay consequences
- **Keywords**: Categorization system
- **Potions/Chems**: Consumable effects
- **Enchantments**: Item-attached effects

---

## Spells and Casting

### Spell Basics

```papyrus
Scriptname SpellCastingExample extends Actor

Spell Property FireBurst Auto
Spell Property Heal Auto
Spell Property Invisibility Auto

Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
  If aeCombatState == 1  ; Entered combat
    If GetDistance(akTarget) < 1000
      Cast(FireBurst, Self)  ; Cast on self
    EndIf
  EndIf
EndEvent

Function HealSelf()
  Cast(Heal, Self)
EndFunction

Function CastOnOther(Actor akTarget)
  If akTarget != None
    akTarget.Cast(Invisibility, akTarget)
  EndIf
EndFunction
```

### Spell Types

| Type | Effect | Duration |
|------|--------|----------|
| **Damage** | Health reduction | Instant |
| **Heal** | Health restoration | Instant |
| **Buff** | Stat increase | Temporary |
| **Debuff** | Stat decrease | Temporary |
| **Invisibility** | Detection prevention | Temporary |
| **Paralysis** | Movement freeze | Duration |
| **Summon** | Creature spawn | Timed |
| **Teleport** | Position change | Instant |
| **Shield** | Damage absorption | Temporary |

### Cast Function

```papyrus
; Cast spell on target
Cast(Spell akSpell, ObjectReference akTarget = None)

; Example usage
Actor akCaster = Game.GetPlayer()
Actor akTarget = GetTargetRef() as Actor

If akTarget != None
  akCaster.Cast(FireSpell, akTarget)
EndIf
```

### Remote Cast

For actors not loaded:
```papyrus
; Cast spell remotely without loading actor
RemoteCast(Actor akTarget, Spell akSpell, ObjectReference akOrigin)

Example:
If akTarget != None && !akTarget.Is3DLoaded()
  RemoteCast(akTarget, PoisonSpell, Self)
EndIf
```

---

## Magic Effects

### Magic Effect Types

**Instant Effect**:
```papyrus
Scriptname FireDamageEffect extends ActiveMagicEffect

Event OnEffectStart(Actor akTarget, Actor akCaster)
  ; Immediate effect
  akTarget.DamageActorValue("Health", 25)
  Debug.Trace("Fire damage applied")
EndEvent
```

**Duration Effect**:
```papyrus
Scriptname SlowEffect extends ActiveMagicEffect

Event OnEffectStart(Actor akTarget, Actor akCaster)
  akTarget.SetAlert(False)
  akTarget.ModActorValue("SpeedMult", -0.5)
  Debug.Trace("Slow effect applied")
EndEvent

Event OnEffectFinish(Actor akTarget, Actor akCaster)
  akTarget.ModActorValue("SpeedMult", 0.5)
  Debug.Trace("Slow effect ended")
EndEvent
```

**Interval Effect** (applies multiple times):
```papyrus
Scriptname PoisonEffect extends ActiveMagicEffect

Float Property DamagePerSecond = 2.0 Auto

Event OnEffectStart(Actor akTarget, Actor akCaster)
  StartTimer(1.0)  ; Tick every second
EndEvent

Event OnTimer(Int aiTimerID)
  ; Effect continues until dispelled
  Actor akTarget = GetTargetActor()
  If akTarget != None
    akTarget.DamageActorValue("Health", DamagePerSecond)
  EndIf
  StartTimer(1.0)
EndEvent

Event OnEffectFinish(Actor akTarget, Actor akCaster)
  CancelTimer()
  Debug.Trace("Poison ended")
EndEvent
```

### Magic Effect Properties

```papyrus
Scriptname CustomSpellEffect extends ActiveMagicEffect

; Get casting actor
Actor akCaster = GetCasterActor()

; Get target actor
Actor akTarget = GetTargetActor()

; Get spell form
Spell akSpell = GetSpell()

; Check effect strength
Float strength = GetMagnitude()

; Get effect duration
Float duration = GetDuration()

; Get caster's skill level
Int skillLevel = akCaster.GetActorValue("Destruction")

Function ApplyDamageBasedOnCasterSkill()
  Int skillLevel = akCaster.GetActorValue("Destruction") as Int
  Float damage = 10 + (skillLevel * 0.5)
  GetTargetActor().DamageActorValue("Health", damage)
EndFunction
```

---

## Magic Keywords

### Using Keywords for Magic

```papyrus
Scriptname MagicKeywordExample extends ObjectReference

Keyword Property MagicDamageKeyword Auto
Keyword Property FireDamageKeyword Auto
Keyword Property FrostDamageKeyword Auto

Function CheckSpellType(Spell akSpell)
  If akSpell.HasKeyword(FireDamageKeyword)
    Debug.Trace("This is a fire spell")
    OnFireSpell()
  ElseIf akSpell.HasKeyword(FrostDamageKeyword)
    Debug.Trace("This is a frost spell")
    OnFrostSpell()
  ElseIf akSpell.HasKeyword(MagicDamageKeyword)
    Debug.Trace("This is magic damage")
  EndIf
EndFunction

Function OnFireSpell()
  ; Fire spell specific logic
EndFunction

Function OnFrostSpell()
  ; Frost spell specific logic
EndFunction
```

### Spell Filtering

```papyrus
; Get all spells player knows
Int spellCount = Game.GetPlayer().GetSpellCount()
Int i = 0

While i < spellCount
  Spell akSpell = Game.GetPlayer().GetNthSpell(i)
  
  ; Filter by keyword
  If akSpell.HasKeyword(DamageSpellKeyword)
    Debug.Trace("Found damage spell: " + akSpell.GetName())
  EndIf
  
  i += 1
EndWhile
```

---

## Potions and Consumables

### Potion Effects

```papyrus
Scriptname PotionScript extends ObjectReference

Potion Property HealingPotion Auto
Potion Property StaminaPotion Auto
Potion Property PoisonPotion Auto

Function DrinkPotion(Actor akDrinker, Potion akPotion)
  If akDrinker != None && akPotion != None
    ; Consume potion
    akDrinker.AddItem(akPotion, -1)  ; Remove from inventory
    
    ; Apply effects
    Int effectCount = akPotion.GetNumEffects()
    Int i = 0
    
    While i < effectCount
      MagicEffect effect = akPotion.GetNthEffect(i)
      ; Effect applied automatically
      Debug.Trace("Applied effect: " + effect.GetName())
      i += 1
    EndWhile
  EndIf
EndFunction
```

### Creating Custom Potions

Potions contain multiple magic effects:
- Base effect 1 (primary)
- Base effect 2 (secondary)
- Base effect 3 (tertiary)
- Base effect 4 (quaternary)

Each effect has:
- Magnitude (strength)
- Duration (in seconds)
- Area of effect (range)

### Poison on Weapon

```papyrus
Scriptname PoisonWeaponScript extends ObjectReference

Weapon Property MyWeapon Auto
Potion Property MyPoison Auto

Function ApplyPoison()
  Actor player = Game.GetPlayer()
  
  If player.GetItemCount(MyWeapon) > 0
    ; Apply poison to equipped weapon
    player.EquipItem(MyWeapon)
    MyWeapon.AddPoison(MyPoison, 1)
    Debug.Trace("Poison applied to weapon")
  EndIf
EndFunction
```

---

## Enchantments

### Enchanting Items

```papyrus
Scriptname EnchantmentScript extends ObjectReference

Enchantment Property PowerEnchant Auto
ObjectReference Property TargetItem Auto

Function EnchantItem(ObjectReference akItem, Enchantment akEnchant)
  If akItem != None && akEnchant != None
    akItem.SetEnchantment(akEnchant)
    Debug.Trace("Item enchanted: " + akItem.GetName())
  EndIf
EndFunction

Function RemoveEnchantment(ObjectReference akItem)
  If akItem != None
    akItem.SetEnchantment(None)
    Debug.Trace("Enchantment removed")
  EndIf
EndFunction
```

### Checking Enchantments

```papyrus
Function CheckEnchantment(ObjectReference akItem)
  Enchantment akEnchant = akItem.GetEnchantment()
  
  If akEnchant != None
    Debug.Trace("Item enchanted with: " + akEnchant.GetName())
    
    ; Get number of effects
    Int effectCount = akEnchant.GetNumEffects()
    Debug.Trace("Number of effects: " + effectCount)
  Else
    Debug.Trace("Item not enchanted")
  EndIf
EndFunction
```

---

## Spell Learning and Management

### Add Spell to Actor

```papyrus
Scriptname LearnSpellScript extends Quest

Spell Property FireSpell Auto
Spell Property HealSpell Auto

Function TeachPlayer()
  Actor player = Game.GetPlayer()
  
  ; Add spells
  player.AddSpell(FireSpell)
  player.AddSpell(HealSpell)
  
  Debug.Trace("Player learned spells")
EndFunction

Function RemoveSpell()
  Actor player = Game.GetPlayer()
  
  If player.HasSpell(FireSpell)
    player.RemoveSpell(FireSpell)
    Debug.Trace("Player forgot spell")
  EndIf
EndFunction
```

### Spell Count and Access

```papyrus
Function CheckPlayerSpells()
  Actor player = Game.GetPlayer()
  Int spellCount = player.GetSpellCount()
  
  Debug.Trace("Player knows " + spellCount + " spells")
  
  ; List all spells
  Int i = 0
  While i < spellCount
    Spell akSpell = player.GetNthSpell(i)
    Debug.Trace("Spell " + i + ": " + akSpell.GetName())
    i += 1
  EndWhile
EndFunction
```

---

## Spell Perks

Spells can require perks:

```papyrus
Scriptname SpellPerksScript extends Actor

Perk Property DestructionMastery Auto
Perk Property FireMastery Auto

Event OnSpellCast(Spell akSpell, ObjectReference akTarget)
  ; Check if caster has required perks
  
  If akSpell.HasKeyword(FireKeyword)
    If !HasPerk(FireMastery)
      Debug.Trace("Need fire mastery perk!")
      ; Cancel spell or reduce effectiveness
    EndIf
  EndIf
EndEvent

Function CheckPerk()
  If HasPerk(DestructionMastery)
    Debug.Trace("Player has destruction mastery")
    ; Increase spell damage
    ModActorValue("Destruction", 25)
  EndIf
EndFunction
```

---

## Dispelling and Effect Control

### Dispel Spells

```papyrus
Scriptname DispelScript extends ObjectReference

Function DispelAllSpells(Actor akTarget)
  If akTarget != None
    akTarget.DispelAllSpells()
    Debug.Trace("All spells dispelled")
  EndIf
EndFunction

Function DispelSpecificEffect(Actor akTarget, MagicEffect akEffect)
  If akTarget != None && akEffect != None
    ; Find and remove specific effect
    Int i = 0
    While i < akTarget.GetMagicEffectCount()
      MagicEffect effect = akTarget.GetNthMagicEffect(i)
      
      If effect == akEffect
        ; Effect found - would need custom logic to remove
        Debug.Trace("Found effect to dispel")
      EndIf
      i += 1
    EndWhile
  EndIf
EndFunction
```

### Check Active Effects

```papyrus
Function CheckForEffect(Actor akTarget, MagicEffect akEffect)
  If akTarget != None
    Int effectCount = akTarget.GetMagicEffectCount()
    Int i = 0
    
    While i < effectCount
      MagicEffect effect = akTarget.GetNthMagicEffect(i)
      
      If effect == akEffect
        Debug.Trace("Target has effect: " + akEffect.GetName())
        Return
      EndIf
      i += 1
    EndWhile
    
    Debug.Trace("Target does not have effect")
  EndIf
EndFunction
```

---

## Advanced Magic Patterns

### Spell Customization

```papyrus
Scriptname ScaledDamageSpell extends ActiveMagicEffect

Float Property BaseDamage = 10.0 Auto

Event OnEffectStart(Actor akTarget, Actor akCaster)
  ; Scale damage based on caster level
  Int casterLevel = akCaster.GetLevel()
  Float scaledDamage = BaseDamage + (casterLevel * 0.5)
  
  akTarget.DamageActorValue("Health", scaledDamage)
  Debug.Trace("Spell damage: " + scaledDamage)
EndEvent
```

### Channeled Spell

```papyrus
Scriptname ChanneledSpellEffect extends ActiveMagicEffect

Float Property TickInterval = 0.5 Auto
Float Property DamagePerTick = 5.0 Auto

Event OnEffectStart(Actor akTarget, Actor akCaster)
  StartTimer(TickInterval)
EndEvent

Event OnTimer(Int aiTimerID)
  Actor akTarget = GetTargetActor()
  Actor akCaster = GetCasterActor()
  
  If akTarget != None && akCaster != None
    ; Check if spell still active
    If akCaster.IsCasting()
      akTarget.DamageActorValue("Health", DamagePerTick)
      StartTimer(TickInterval)
    Else
      ; Spell canceled
      OnEffectFinish(akTarget, akCaster)
    EndIf
  EndIf
EndEvent

Event OnEffectFinish(Actor akTarget, Actor akCaster)
  CancelTimer()
  Debug.Trace("Channeled spell ended")
EndEvent
```

### Buff/Debuff System

```papyrus
Scriptname BuffDebuffEffect extends ActiveMagicEffect

String Property ActorValueToModify = "Health" Auto
Float Property ModAmount = 10.0 Auto

Event OnEffectStart(Actor akTarget, Actor akCaster)
  ; Apply buff (positive value) or debuff (negative value)
  akTarget.ModActorValue(ActorValueToModify, ModAmount)
  Debug.Trace("Buff applied: +" + ModAmount + " " + ActorValueToModify)
EndEvent

Event OnEffectFinish(Actor akTarget, Actor akCaster)
  ; Reverse the effect
  akTarget.ModActorValue(ActorValueToModify, -ModAmount)
  Debug.Trace("Buff ended")
EndEvent
```

### Summon Spell

```papyrus
Scriptname SummonSpellEffect extends ActiveMagicEffect

Actor Property SummonedCreature Auto
Float Property DurationSeconds = 60.0 Auto

Event OnEffectStart(Actor akTarget, Actor akCaster)
  If akCaster != None && SummonedCreature != None
    ; Summon creature at caster location
    Actor summon = akCaster.PlaceActorAtMe(SummonedCreature)
    
    If summon != None
      summon.StartCombat(akTarget)
      Debug.Trace("Creature summoned: " + SummonedCreature.GetName())
      
      ; Store reference for cleanup
      SetPropertyValue("LastSummon", summon)
      StartTimerGameTime(DurationSeconds)
    EndIf
  EndIf
EndEvent

Event OnTimerGameTime(Float afGameTime)
  ; Summon expires
  Actor summon = GetPropertyValue("LastSummon") as Actor
  
  If summon != None && !summon.IsDead()
    summon.Kill(GetCasterActor())
    Debug.Trace("Summon banished")
  EndIf
EndEvent
```

---

## Best Practices

### 1. Always Check for None
```papyrus
; Good
Function CastSafely(Actor akCaster, Actor akTarget, Spell akSpell)
  If akCaster != None && akTarget != None && akSpell != None
    akCaster.Cast(akSpell, akTarget)
  EndIf
EndFunction

; Risky
Function CastUnsafely(Actor akCaster, Actor akTarget, Spell akSpell)
  akCaster.Cast(akSpell, akTarget)  ; May crash
EndFunction
```

### 2. Use Keywords for Organization
```papyrus
; Good: Flexible filtering
If akSpell.HasKeyword(DestructionSpellKeyword)
  ; Handle destruction spell
EndIf

; Bad: Hardcoded comparisons
If akSpell == FireSpell || akSpell == FrostSpell
  ; Limited and unmaintainable
EndIf
```

### 3. Cleanup Effects Properly
```papyrus
; Good: Complete cleanup
Event OnEffectFinish(Actor akTarget, Actor akCaster)
  CancelTimer()  ; Stop any timers
  If TemporaryActor != None
    TemporaryActor.Delete()  ; Remove summons
  EndIf
EndEvent

; Bad: Incomplete cleanup
Event OnEffectFinish(Actor akTarget, Actor akCaster)
  ; Left timers running or actors spawned
EndEvent
```

### 4. Scale Effects by Difficulty
```papyrus
Scriptname DifficultyScaledEffect extends ActiveMagicEffect

Event OnEffectStart(Actor akTarget, Actor akCaster)
  Float gameDifficulty = Game.GetDifficultyMultiplier()
  Float damage = 20.0 * gameDifficulty
  
  akTarget.DamageActorValue("Health", damage)
EndEvent
```

---

## Related Resources

- **PAPYRUS_EVENTS_AND_ACTIONS_GUIDE.md**: Magic events and cast functions
- **PAPYRUS_FUNCTION_REFERENCE_INDEX.md**: Magic system functions
- **CREATION_KIT_RESOURCES_INDEX.md**: Spell and effect resources

---

## Quick Reference

| Task | Function |
|------|----------|
| Cast spell | `Cast(Spell akSpell, ObjectReference akTarget)` |
| Cast remotely | `RemoteCast(Actor akTarget, Spell akSpell, ObjectReference akOrigin)` |
| Add spell | `Actor.AddSpell(Spell akSpell)` |
| Remove spell | `Actor.RemoveSpell(Spell akSpell)` |
| Check spell | `Actor.HasSpell(Spell akSpell)` |
| Get spell count | `Actor.GetSpellCount()` |
| Get nth spell | `Actor.GetNthSpell(Int aiIndex)` |
| Dispel all | `Actor.DispelAllSpells()` |
| Enchant item | `ObjectReference.SetEnchantment(Enchantment akEnchant)` |
| Get enchantment | `ObjectReference.GetEnchantment()` |
| Add keyword | `Form.HasKeyword(Keyword akKeyword)` |
