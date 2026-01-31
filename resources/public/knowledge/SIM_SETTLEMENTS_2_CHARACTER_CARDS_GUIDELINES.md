# Sim Settlements 2: Character Cards Guidelines

**Version**: 1.0  
**Last Updated**: January 24, 2026  
**Type**: Reference Guide (Best Practices & Guidelines)

---

## Overview

Character Cards allow you to customize NPCs across the base game, DLCs, and mods without requiring those mods as dependencies. This guide covers best practices for designing effective character cards, avoiding common pitfalls, and balancing gameplay impact.

---

## NPC Preference Guidelines

### Choosing the Right NPCs

**Ideal Candidates:**
- Unique NPCs with established personalities
- Characters with thematic preferences that make sense
- NPCs that settlements commonly acquire
- Characters players care about or recognize

**Avoid:**
- Generic settlers without personality
- Essential quest NPCs players won't recruit
- NPCs with conflicting vanilla mechanics
- Characters from mods requiring specific playstyles

**Red Flags:**
- Quest-essential NPCs (may break quests if reassigned)
- NPCs with complex AI packages (may cause conflicts)
- Characters with dialogue tied to specific locations
- Synths or characters with faction restrictions

### Designing Logical Preferences

**Pattern: Personality → Building Type**

| NPC Type | Logical Preference | Why It Works |
|----------|-------------------|-------------|
| Combat-focused (Cait, MacCready) | Combat Training, Barracks | Matches skillset and personality |
| Scholarly (Curie, Strong) | Science, Medical Lab | Fits character background |
| Wasteland veteran (Danse, X6) | Command, Security | Established authority figures |
| Charismatic (Piper, Nick) | Commercial, Media | Natural business sense |
| Crafty (Hancock, Gage) | Industrial, Raider theme | Street-level knowledge |

**Preference Strength:**
- 1-2 preferences per type (acceptable balance)
- 3+ preferences (may feel too restrictive)
- No preferences (generic but limits roleplay)

### Skin and Plan Selection

**When to Include:**
- Cosmetic skins that match NPC aesthetic
- Building plans aligned with character personality
- Faction-themed variations (Brotherhood, Railroad, etc.)
- Only unlocked designs at game start

**When to Skip:**
- Designs the NPC wouldn't realistically choose
- Skins requiring high-level tech beyond character knowledge
- Plans from factions opposing the NPC's views
- Overly abundant options (analysis paralysis for players)

### UniversalForm vs. BaseForm

**Use BaseForm When:**
- NPC is from SS2 itself
- NPC is in Fallout4.esm
- Mod is a master file (ESM/ESL) you're loading
- You want simpler setup

**Use UniversalForm When:**
- NPC comes from mod plugins (non-master)
- You want mod compatibility without dependency
- Supporting multiple NPC mods simultaneously
- Creating cross-mod patches

**Testing UniversalForms:**
- Always test with mod present
- Always test with mod absent (should not error)
- Verify Form ID conversion is correct
- Check plugin name spelling exactly

---

## Character Stat Card Guidelines

### Stat Adjustment Philosophy

**Balance Principle:** Fix outliers, don't min-max

| Original Stats | Adjustment Type | Why |
|---|---|---|
| Mama Murphy (19 Strength) | Major reduction | Completely unrealistic |
| Average settler (3-5 range) | Leave unchanged | Reasonable baseline |
| Weak character (1-2) | Minor boost to 2-3 | Viable but not powerful |
| Strong character (8-9) | Minor cap to 7-8 | Powerful but not broken |

**What Players Expect:**
- ✓ Stat cards fix "lol Bethesda balance"
- ✓ Cards respect character archetype
- ✓ Charisma matters for leaders
- ✓ Combat-focused have combat stats
- ✗ Cards don't create "perfect" NPCs
- ✗ Cards don't override player choice entirely

### Stat Distribution Patterns

**Combat Character (e.g., Cait, Danse):**
- Strength: 7-8
- Endurance: 7-8
- Agility: 6-7
- Remaining: 3-5

**Leader Character (e.g., Preston, Hancock):**
- Charisma: 8-9
- Intelligence: 6-7
- Strength/Endurance: 5-6
- Remaining: 3-5

**Specialist Character (e.g., Nick, Curie):**
- Intelligence: 8-9
- Perception: 6-7
- Luck: 4-6
- Remaining: 3-5

### Avoiding Over-Optimization

**Problem:** Player expects stat card to enable overpowered settlers

**Solution:**
- Cap highest stat at 9 (not 10)
- Keep balance across stats
- Never give all 8-10s
- Document realistic ranges in descriptions

**Example - Good:**
```
Hancock (Combat Leader)
- Strength: 7
- Charisma: 8
- Endurance: 6
- Remaining: 3-4
Result: Good leader, decent combat, not broken
```

**Example - Bad:**
```
Hancock (Overpowered)
- Strength: 10
- Charisma: 10
- Endurance: 10
- Remaining: 8-10
Result: Breaks game balance, player feels cheaty
```

### Multiple Cards for Same NPC

**Current Behavior:** One random card chosen per NPC if multiple exist

**Design Strategy:**
- Create alternate stat distributions
- Different community versions
- Faction-specific variations
- Playstyle-specific options

**Example Use Case:**
- Addon A: Danse as combat specialist
- Addon B: Danse as Brotherhood leader
- Both active? Random selection each load

**Communication Tip:** Document variants clearly so players understand possibilities

---

## Common Pitfalls

### Preference Pitfalls

**Problem: Preference Never Triggers**
- Cause: Design unlocked at high levels, player gets there with manual selections
- Solution: Include base game/early unlocks in preferences
- Prevention: Test with fresh save, locked content only

**Problem: Preference Too Restrictive**
- Cause: Only 1-2 designs unlocked when preference gets assigned
- Solution: Include multiple preference options
- Prevention: Test with various unlock states

**Problem: NPC Keeps Rebuilding Same Building**
- Cause: Only one preferred plan available every rebuild
- Solution: Vary preferences or create multiple plan options
- Prevention: Include 3-5 varied preferences

**Problem: Preference Overrides Manual Assignment**
- Cause: Player sets manual plan, preference still applies
- Solution: Remember preferences don't override manual choices
- Prevention: Document expected behavior clearly

### Stat Card Pitfalls

**Problem: SPECIAL Stat Cards Can Lower Stats Not Checked**
- Cause: Setting "Allow Stat Cards To Reduce Stats" OFF but your card reduces
- Solution: Test with setting ON and OFF
- Prevention: Document whether card raises or lowers

**Problem: Stat Not Applied In-Game**
- Cause: Character never arrived at settlement to trigger check
- Solution: Stat cards only apply when NPC loads in settlement
- Prevention: Build settlement to have NPC present, check with Vit-o-Matic

**Problem: Conflicting Cards Applied Randomly**
- Cause: Multiple mods with Stat Cards for same NPC
- Solution: Only one card applies (random selection)
- Prevention: Communicate with other creators

**Problem: Stats Revert After Training**
- Cause: Player expects permanent stat, training increases it
- Solution: Stat cards set initial, training adds on top
- Prevention: Document this is starting point, not ceiling

### UniversalForm Pitfalls

**Problem: Form ID Conversion Wrong**
- Cause: Misread hex digits or miscalculated decimal
- Solution: Verify in console with `help "NPCNAME"` command
- Prevention: Double-check all conversions

**Problem: Plugin Name Misspelled**
- Cause: Typo in filename or wrong case sensitivity
- Solution: Match exact filename from load order
- Prevention: Copy/paste from load order, test without mod present

**Problem: Mod Not Loading, Card Disappears**
- Cause: Plugin not installed or disabled
- Solution: No error thrown (by design), just silently skips
- Prevention: Test with mod absent, ensure no errors in console

---

## Design Patterns

### The Companion Pattern

NPCs from companion mods designed to fit SS2 ecosystem:

**Setup:**
1. Create NPC Preference card
2. Set preferences matching companion class
3. Optionally include Stat Card
4. Set preferred faction flag if applicable

**Benefit:** Companions feel at home in your settlements

**Example - Combat Companion:**
```
Preferences: Combat Training, Barracks
Stat Card: 7 Strength, 6 Endurance, 4 Charisma
Flag: None (generic)
```

### The Fixed NPC Pattern

Bethesda NPCs with problematic stats:

**Setup:**
1. Identify stat outliers (too high/low)
2. Create Stat Card with balanced version
3. Document original vs. fixed stats
4. Recommend enabling "Allow Reduction" setting

**Benefit:** Makes underutilized NPCs viable

**Example - Mama Murphy Fix:**
```
Original: 19 Strength (lolwat)
Fixed: 6 Strength, 7 Intelligence, 5 Charisma
Justification: Survivor, not warrior
```

### The Faction Leader Pattern

Creating unique roles for existing NPCs:

**Setup:**
1. Choose NPC matching faction aesthetic
2. Set Stat Card emphasizing leadership
3. Include faction buildings in preferences
4. Set preferred flag to faction theme

**Benefit:** Natural immersion for player choices

**Example - Minuteman Leader:**
```
Preference: Minuteman-themed buildings
Stat Card: High Charisma (leader), decent Strength
Flag: Minuteman banner
```

---

## Testing Checklist

### Preference Cards
- [ ] Test with unlocked content only
- [ ] Verify design appears after assignment
- [ ] Confirm manual override still works
- [ ] Test with mixed preference types
- [ ] Verify with fresh save
- [ ] Check multiple assignments of same NPC

### Stat Cards
- [ ] Test with setting ON and OFF
- [ ] Verify stats applied after NPC arrival
- [ ] Check with Vit-o-Matic readings match
- [ ] Confirm training still increases stats
- [ ] Test with multiple settlers of same NPC type
- [ ] Verify no conflicts with other mods

### UniversalForms
- [ ] Verify Form ID conversion mathematically correct
- [ ] Test with mod present
- [ ] Test with mod absent (no errors)
- [ ] Check console for ID mismatch errors
- [ ] Verify plugin name spelling
- [ ] Test in fresh save with load order

---

## Performance Considerations

### Preference Overhead
- Small: Preference cards are lightweight
- Negligible impact on settlement performance
- Preference checking happens at assign time only

### Stat Card Overhead
- Minimal: Cards checked when NPC loads
- One-time application per NPC per settlement
- No ongoing performance impact

### Best Practices
- Combine multiple preference types in one card
- Don't create duplicate cards for same NPC
- Use pools to organize many cards
- Keep UniversalForm conversion accurate

---

## Distribution Guidelines

### Documentation Requirements

**For NPC Preferences:**
- List which NPCs are affected
- Describe building preferences chosen
- Explain thematic justification
- Note mod dependencies if any

**For Stat Cards:**
- List affected NPCs
- Show original vs. new stats
- Explain balance philosophy
- Recommend gameplay settings

### Compatibility Notes

**Should Document:**
- If cards work cross-mod
- Conflicts with other card mods
- Load order requirements
- Console command testing methods

**Examples to Include:**
- With [Companion Mod X], X will prefer Y buildings
- Character stat distribution follows Z philosophy
- Tested with Sim Settlements 2 version X.X.X
- Requires UniversalForm compatibility library

---

## Summary

Character Cards add personality and gameplay depth. Success comes from:

✓ **Logical choices** based on NPC personality and background  
✓ **Balanced stats** that enhance but don't break gameplay  
✓ **Careful testing** especially with UniversalForms  
✓ **Clear documentation** so players understand impact  
✓ **Thematic coherence** across all card types  

Whether creating preference cards for personality or stat cards for balance, keep player experience and immersion at the forefront.
