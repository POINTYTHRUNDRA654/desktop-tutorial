# Sim Settlements 2: Addon Troubleshooting Guide

**Version**: 1.0  
**Last Updated**: January 24, 2026  
**Type**: Reference Guide (Problem-Solving)

---

## Overview

This comprehensive troubleshooting guide covers common issues across all SS2 addon systems and provides systematic debugging approaches. Use this when content isn't working as expected.

---

## General Diagnostic Framework

### Before You Troubleshoot

**Checklist:**
- [ ] Is mod actually enabled? (Check Mods menu)
- [ ] Are dependencies loaded? (Check load order)
- [ ] Are master files present? (Check masters info)
- [ ] Is in-game content unlocked? (Use cheats to verify)
- [ ] Does save have required content? (Fresh save testing)

### Console Command Basics

**Finding Form IDs:**
```
help "ITEMNAME" 4 TYPE
(Replace TYPE: misc, weap, armo, book, etc.)
```

**Testing Specific Content:**
```
player.additem FORMID
(Add item to inventory for testing)

cqf QUESTID OBJECTIVE
(Force complete quest objective)

set GLOBALVARIABLE 1
(Enable feature flags)
```

### Log Checking

**Location:** `Documents\My Games\Fallout4\Logs`

**What to Look For:**
- ERROR tags (critical issues)
- Warning tags (often safe but notable)
- Script errors (identify problematic scripts)
- Plugin load order issues

**Common Log Messages:**
```
[REFR] → Missing reference (deleted object)
[Quest] → Quest execution error
[Script] → Script compilation or runtime error
[Assertion] → Critical system failure
```

---

## Character Cards Troubleshooting

### Preference Cards Not Working

**Symptom:** NPC assigned to plot, but preferred building doesn't appear

**Diagnosis:**
1. Check if preferred design is unlocked
2. Verify NPC is actually commandable settler
3. Confirm preference card exists in formlist
4. Test with unlocked content only

**Solution Tree:**
```
Is design unlocked?
├─ NO: Unlock it, then test (use cheats)
├─ YES: Does card exist in formlist?
│  ├─ NO: Add card to formlist
│  └─ YES: Is NPC commandable?
│     ├─ NO: Make NPC a settler first
│     └─ YES: Fully check script properties
```

**Test Procedure:**
1. Fresh save, cheat to unlock all
2. Assign NPC to plot
3. Re-build same plot type 3 times
4. Should see preferred plan at least once

### Stat Cards Not Applying

**Symptom:** NPC stats don't match card values in-game

**Diagnosis:**
1. Check "Allow Stat Cards" setting (may be OFF)
2. Verify NPC loaded into settlement
3. Confirm card points to correct NPC
4. Test with Vit-o-Matic to see actual stats

**Solution Tree:**
```
Is setting enabled?
├─ NO: Enable in MCM settings
└─ YES: Is NPC in settlement?
   ├─ NO: Build settlement, wait for arrival
   └─ YES: Check with Vit-o-Matic
      ├─ Stats don't match: Card wrong NPC
      └─ Stats match card: Working correctly
```

**Test Procedure:**
1. Enable "Allow Stat Cards" setting
2. Have NPC arrive at settlement (place them manually or cheat)
3. Use Vit-o-Matic on NPC
4. Compare displayed stats to card values

### UniversalForm Loading Issues

**Symptom:** NPC never loads, card doesn't apply, no errors

**Diagnosis:**
1. Verify Form ID conversion (hex to decimal)
2. Check plugin name spelling exactly
3. Confirm mod actually installed
4. Look for console errors about missing plugins

**Solution Tree:**
```
Is Form ID correct?
├─ Check conversion math: (0xXXXXXX → decimal)
└─ Plugin name exact?
   ├─ Verify in load order
   └─ Copy/paste from actual filename
      └─ With mod present: test for errors
         └─ Without mod: should not crash
```

**Debug Commands:**
```
help "NPCNAME" 4 actb
(Find correct NPC and Form ID)

Player.PlaceAtMe FORMID
(Spawn NPC to verify they load)
```

---

## Worldspace Troubleshooting

### Settlements Won't Load/Map Broken

**Symptom:** Worldspace not showing in game or map is wrong

**Diagnosis:**
1. Verify worldspace config exists
2. Check coordinates (NW vs SE)
3. Confirm worldspace mod loaded
4. Test coordinate math

**Solution Tree:**
```
Does worldspace load?
├─ NO: Is parent mod installed?
│  └─ Install parent, add as master
├─ YES: Does map appear?
│  ├─ NO: Missing VR material swap
│  └─ YES: Is map correct orientation?
│     ├─ NO: Flip texture 180°
│     └─ YES: Check marker alignment
```

**Coordinate Testing:**
```
coc WORLDSPACENAME 0 0
(Should place you roughly centered)

coc WORLDSPACENAME -10 -10
(Test if coordinates work)
```

### Caravan Routes Broken

**Symptom:** Caravans don't arrive, goods don't transfer

**Diagnosis:**
1. Verify both settlements have municipal plots
2. Check caravan building is assigned settler
3. Confirm distance isn't too great
4. Look for pathfinding barriers

**Solution Tree:**
```
Do settlements exist?
├─ Check municipal plots assigned
└─ Distance acceptable? (under 40 cells)
   ├─ NO: Too far, move settlements
   └─ YES: Test caravan dispatch
      └─ Use passtime 24 hours
         ├─ Caravan arrives: Working
         └─ Caravan stuck: Check path
```

**Debug Procedure:**
1. Place 2 settlements 10 cells apart
2. Build municipal with caravan on both
3. Assign settlers to caravans
4. Use console: `passtime 24` repeatedly
5. Check settlement inventory for goods

### VR Map Issues

**Symptom:** Map blank, sideways, or markers misaligned

**Diagnosis:**
1. Texture file exists in correct folder
2. Material swap points to correct texture
3. BGSM file syntax correct
4. Static form references correct swap

**Solution Tree:**
```
Does map appear at all?
├─ NO: Missing texture or BGSM file
│  └─ Verify files in Textures/Materials
├─ YES: Is it correct texture?
│  ├─ NO: BGSM pointing wrong file
│  └─ YES: Are markers aligned?
│     ├─ NO: Adjust DistanceScaling
│     └─ YES: Is orientation correct?
│        ├─ NO: Flip or rotate texture
│        └─ YES: Working correctly
```

**Quick Texture Check:**
1. Extract correct texture from worldspace
2. Place in `Textures/YourMod/Maps/`
3. Create BGSM material pointing to it
4. Test in CK object window preview
5. Should see correct image

---

## Discovery Troubleshooting

### Discoveries Never Appear

**Symptom:** Settlements have caravans but no discoveries ever unlock

**Diagnosis:**
1. Check formlist has discoveries added
2. Verify location keywords match door locations
3. Confirm requirements are met
4. Test bAlwaysDiscovered flag

**Solution Tree:**
```
Is formlist registered?
├─ NO: Add to addon config
└─ YES: Are requirements met?
   ├─ NO: Complete required quests
   └─ YES: Test bAlwaysDiscovered
      ├─ Set true: Should unlock
      └─ Already true: Troubleshoot discovery
```

**Test Procedure:**
1. Set bAlwaysDiscovered: true on discovery
2. Place caravan near eligible location
3. Run caravan mission 1-2 times
4. Discovery should unlock
5. If it does: Requirements issue
6. If not: Location/formlist issue

### Discovery Appears Too Often

**Symptom:** Same discovery appearing multiple times

**Diagnosis:**
1. bAlwaysDiscovered still true (leave it false)
2. Location keywords too broad
3. Player discovering multiple times same location
4. Formlist registered multiple times

**Solution:**
- Set bAlwaysDiscovered: false
- Use specific locations, not general keywords
- Each discovery queues once, player sees per playthrough

### Trigger Won't Execute

**Symptom:** Discovery unlocks but doesn't trigger reward

**Diagnosis:**
1. Check trigger requirements met
2. Verify trigger points to correct form
3. Confirm trigger type set correctly
4. Look for script errors in log

**Solution Tree:**
```
Does discovery unlock?
├─ NO: See "Discoveries Never Appear"
└─ YES: Does trigger execute?
   ├─ Check trigger requirements
   └─ Verify form ID correct
      └─ Look at script error log
```

---

## Holiday Troubleshooting

### Decorations Don't Appear

**Symptom:** Holiday active but no decorations on plots

**Diagnosis:**
1. Verify holiday date active
2. Check formlist has decorations
3. Confirm markers exist on plot
4. Test if manually placed decorations work

**Solution Tree:**
```
Is correct date/holiday?
├─ NO: Change in-game date
└─ YES: Are decorations registered?
   ├─ NO: Add to holiday formlist
   └─ YES: Do markers exist?
      ├─ NO: Plot doesn't support decoration
      └─ YES: Troubleshoot decoration model
```

**Test Holiday:**
```
cqf SS2_optionsManager TestThemeChange FORMID
(Force specific holiday)

help "HOLIDAYNAME" 4 armo
(Find holiday form ID)
```

### Decoration Clipping/Floating

**Symptom:** Holiday decoration in wrong position or floating

**Diagnosis:**
1. Decoration using wrong placeholder size
2. Anchor point incorrect (hanging vs surface)
3. Model orientation wrong
4. Placeholder marker misaligned

**Solution Tree:**
```
Is decoration right size?
├─ NO: Match placeholder size to decoration
└─ YES: Is anchor point correct?
   ├─ Hanging: Top of marker
   ├─ Surface: Bottom of marker
   └─ Wall: Back of marker
      └─ Reposition if wrong
```

### Holiday Wrong Dates

**Symptom:** Holiday appearing on wrong dates

**Diagnosis:**
1. Check iStartMonth/iEndMonth values
2. Verify iStartDay/iEndDay values
3. Confirm range doesn't overlap incorrectly
4. Check month numbers (1-12, not 0-11)

**Solution:**
```
Property Format: iStartMonth (1-12), iStartDay (1-31)
Example: Halloween = Start 10/1, End 10/31
  iStartMonth: 10
  iStartDay: 1
  iEndMonth: 10
  iEndDay: 31
```

---

## Leader Troubleshooting

### Leader Card Won't Appear

**Symptom:** Assigned settler to settlement but leader card not available

**Diagnosis:**
1. Card not registered to formlist
2. Requirements not met
3. NPC not commandable
4. Card points to wrong NPC

**Solution Tree:**
```
Is NPC assigned?
├─ NO: Assign settler to settlement
└─ YES: Is card registered?
   ├─ NO: Add to addon config
   └─ YES: Are requirements met?
      ├─ Check MCM or console
      └─ Complete requirements
```

**Test:**
```
cqf SS2_CityManager ShowLeaderSelection
(Force leader selection menu)
```

### Traits Not Applying

**Symptom:** Leader selected but traits don't affect settlement

**Diagnosis:**
1. Check if trait effects are correct type
2. Verify value numbers aren't zero
3. Confirm settlement properly configured
4. Look for conflicting leader traits

**Solution Tree:**
```
Does settlement show leader?
├─ NO: Leader card issue (see above)
└─ YES: Are effects visible?
   ├─ Check settlement stats
   └─ Verify trait values nonzero
```

### Leader Preferences Conflict

**Symptom:** Multiple mods with leaders for same NPC

**Diagnosis:**
- Only one leader card applies (random selection)
- This is by design

**Solution:**
- Load order determines which loads first
- Community creates patch combining all
- Document potential conflict

---

## Newspaper Troubleshooting

### Articles Never Print

**Symptom:** New Bugle exists but never shows articles

**Diagnosis:**
1. Articles registered to formlist
2. Newspapers configured in building plans
3. Requirements met (if any)
4. Article priority set correctly

**Solution Tree:**
```
Is newsstand active?
├─ NO: Build news building
└─ YES: Pick up newspaper
   ├─ Empty: Articles not registered
   └─ Has articles: One of your articles?
      ├─ NO: Article not in formlist
      └─ YES: May be low priority
```

### Article Won't Trigger Event

**Symptom:** Player reads article but trigger doesn't fire

**Diagnosis:**
1. Check TriggerEvent property set
2. Verify unlockable form exists
3. Confirm no script errors
4. Test trigger manually

**Solution:**
```
Article must have:
- OnReadTriggers section filled out
- TriggerEvent pointing to valid form
- Trigger requirements met (if any)
```

**Test Trigger:**
```
cqf UNLOCKABLEFORMID
(Force trigger to fire outside newspaper)
```

---

## Pet Troubleshooting

### Pets Not Available in Store

**Symptom:** Pet Store plot active but pets don't appear for sale

**Diagnosis:**
1. Pet not registered to formlist
2. Vendor level too high
3. Plot not level high enough
4. Inventory reset needed

**Solution Tree:**
```
Is pet registered?
├─ NO: Add to addon config
└─ YES: Check iVendorLevel
   ├─ Set to 1: Should appear level 1
   └─ Set higher: Check plot level
      └─ Use cheat to level up
```

**Reset Vendor Inventory:**
```
passtime 48
(Wait 48 hours for inventory reset)
```

### Pet Can't Move/Stuck

**Symptom:** Purchased pet spawned but won't move or interact

**Diagnosis:**
1. NPC form has Protected checked
2. Missing important script
3. Factions preventing interaction
4. AI package missing

**Solution:**
- Verify actor doesn't have Protected flag
- Ensure workshopnpcscript added
- Check friendly factions present
- Re-check AI Data tab

### Pet Name Not Available

**Symptom:** Pet purchased but custom names not showing

**Diagnosis:**
1. Names not registered to formlist
2. Name form has wrong properties
3. Pet store level too low

**Solution Tree:**
```
Are names registered?
├─ NO: Add to addon config
└─ YES: Try purchasing pet
   └─ Use cheat to increase level
```

---

## World Repopulation Troubleshooting

### Cell Not Pairing to Door

**Symptom:** Test cell command doesn't pair or pair wrong location

**Diagnosis:**
1. Cell template keyword wrong
2. No matching doors with keyword
3. Specific location preferences blocking
4. Cell requirements not met

**Solution Tree:**
```
Does matching door exist?
├─ NO: Add door with matching keyword
└─ YES: Is cell template correct?
   ├─ NO: Change to matching keyword
   └─ YES: Check location preferences
      └─ May need specific location
```

**Test Door Placement:**
```
cqf SS2_C2_WorldRepopulationManager TestCell FORMID
(Find location, head there, run command)
```

### Interior Looks Wrong

**Symptom:** Interior placed but doesn't match building exterior

**Diagnosis:**
1. Building model bigger/smaller than expected
2. Door offset calculated incorrectly
3. Navmesh not placed
4. Lighting doesn't match

**Solution:**
- Redesign interior to fit building better
- Recalculate door offsets
- Place navmesh to cover interior
- Adjust lighting to match exterior

### NPCs Won't Spawn/Stuck

**Symptom:** Interior has residents but they don't spawn or move

**Diagnosis:**
1. iPopulationSupported set to zero
2. Navmesh missing/incorrect
3. AI packages broken
4. Location conflicts

**Solution:**
- Set iPopulationSupported to 1+
- Add navmesh covering interior
- Verify AI packages in actor records
- Check faction compatibility

### Door Won't Lock/Opens Wrong

**Symptom:** Door doesn't lock at night or opens to wrong location

**Diagnosis:**
1. bLockDoorAtNight false (night locking disabled)
2. ReturnMarker wrong
3. Door form reference broken
4. Time values inverted

**Solution:**
```
Check Properties:
- bLockDoorAtNight: true
- fNightHourStart: 23 (11 PM)
- fNightHourEnd: 8 (8 AM)
- ReturnMarker: Points to XMarker outside
```

---

## Systematic Debugging Approach

### The Scientific Method

**Step 1: Observe**
- What exactly isn't working?
- When does it fail?
- Does it always fail or intermittently?
- What else is affected?

**Step 2: Hypothesis**
- What could cause this?
- Is it script-related or data-related?
- Could other mods be interfering?

**Step 3: Test**
- Isolate the problem (remove other mods)
- Change one variable at a time
- Use cheats to verify assumptions
- Check logs for errors

**Step 4: Fix**
- Based on what you learned
- Make minimal change
- Test again to confirm fix
- Document what worked

### Isolation Testing

**When Everything Fails:**
1. Create new mod with ONLY your content
2. Load with SS2 only (no other addons)
3. Fresh save
4. Test specific feature

**If It Works:**
- Another mod causing conflict
- Test load order changes
- Add mods back one at a time

**If It Still Fails:**
- Problem is with your content
- Review creation steps carefully
- Check all required records exist
- Verify all registrations in place

---

## Common Root Causes

| Symptom | Usually Caused By | Check |
|---------|-------------------|-------|
| Content never appears | Not registered to formlist | Addon config properties |
| Content appears broken | Wrong form type/reference | Double-check form ID |
| Works in test, fails in game | Save-specific data | Fresh save test |
| Conflicts with other content | Load order | Reorder mods |
| Random/intermittent failure | Logic/script error | Check conditions |
| Performance issues | Too many objects/scripts | Profile and optimize |

---

## Summary

Effective troubleshooting requires:

✓ **Systematic approach** (diagnose before fixing)  
✓ **Isolation testing** (eliminate variables)  
✓ **Console knowledge** (verify in-game)  
✓ **Log checking** (find hidden errors)  
✓ **Patience** (don't jump to conclusions)  

When in doubt, start simple: verify content exists, is registered, and has no script errors.
