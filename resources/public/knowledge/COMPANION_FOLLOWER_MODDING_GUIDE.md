# Custom Companion & Follower Modding — Complete Guide for Fallout 4 (2026)

Creating a fully realized custom companion is one of the most rewarding — and most technically complex — mod types in Fallout 4. A proper companion requires orchestration of nearly every major system: NPC records, dialogue, AI packages, quest scripting, faction membership, and combat behavior. This guide covers the complete pipeline from blank slate to recruit-able, dismissable, fully-dialogue-enabled companion.

---

## Part 1: Architecture Overview

### What Makes a Companion Different from a Regular NPC

A companion uses all the same record types as an NPC but adds:

1. **Companion quest** — the managing quest that tracks state (recruited, dismissed, location, relationship level)
2. **Companion package stack** — AI packages that handle following, sandbox, and travel behavior
3. **Companion dialogue** — combat barks, idle comments, conversation branches for recruiting/dismissing/relationship
4. **Companion traits** — perks they grant the player, unique abilities, relationship arc
5. **AFT/EFF integration** (optional) — hookpoints for follower framework mods

### Minimal Working Companion Checklist

- [ ] NPC_ record with correct race, voice type, and appearance
- [ ] Faction: `CurrentFollowerFaction` added when recruited
- [ ] Companion quest with alias for the companion
- [ ] Package: Follow Player (uses `CurrentFollowerFaction`)
- [ ] Package: Sandbox (idle behavior when not following)
- [ ] Dialogue: greeting / recruit / dismiss / relationship topics
- [ ] Relationship rank system (for affinity arc)
- [ ] Home marker (where they go when dismissed)

---

## Part 2: NPC Record Setup

### Creating the Base NPC

1. CK → Character → Non-Player Character (Actor) → New
2. Set a unique EditorID: `MM_CompanionName`

### Essential Fields

| Field | Setting | Notes |
|---|---|---|
| `Name` | "Companion Name" | In-game display name |
| `Race` | `HumanRace` | Or other appropriate race |
| `Gender` | Male / Female | Affects voice type selection |
| `Voice Type` | e.g. `FemaleEvenToned` | Must match voice files |
| `Class` | `CompanionClass` | Or custom class |
| `Combat Style` | `csCompanion` | Standard companion combat behavior |
| `AI Packages` | (add below) | Populated via quest aliases |
| `Factions` | (add below) | Companion faction added by quest |
| `Perks` | Companion perks | See Part 6 |

### Flags

- `Essential`: ✅ — companions should be unkillable by default (falls to bleedout instead)
- `Unique`: ✅ — one-of-a-kind character
- `No Low Level Processing`: ✅ — disable background AI when far away

### Inventory

Set starting outfit and inventory via the `Default Outfit` field and the inventory list in the Character tab. Companions should start with at least armor and a weapon appropriate to their role.

---

## Part 3: Companion Quest

The companion quest is the engine that manages your companion's state. It runs persistently from the moment the player first meets the companion until the end of the playthrough.

### Quest Setup

1. CK → Character → Quest → New
2. EditorID: `MM_CompanionQuest`
3. Type: **Companion**
4. Priority: 80 (high, so companion logic preempts other packages)
5. Flags: `Start Game Enabled` ✅, `Allow Repeated Stages` ✅

### Quest Aliases

Add these aliases in the Alias tab:

| Alias | Type | Fill Rule | Notes |
|---|---|---|---|
| `PlayerAlias` | Reference | Specific Reference → Player [00000014] | Always the player |
| `CompanionAlias` | Reference | Specific Reference → your companion ACHR | The companion reference |
| `CompanionHome` | Location | Near Reference → your companion's home marker | Where they go on dismiss |

### Quest Stages

| Stage | Description |
|---|---|
| 0 | Quest start / companion not yet met |
| 10 | First encounter — player has spoken to companion |
| 20 | Companion recruited — following player |
| 30 | Companion dismissed — at home location |
| 100 | Companion quest complete (if applicable) |

---

## Part 4: AI Package Stack

### The Following Package

Create a package of type `Follow`:

1. CK → Character → AI Package → New
2. Type: **Follow**
3. Set Target to use `CurrentFollowerFaction`:
   ```
   Target: Actor in Faction → CurrentFollowerFaction
   ```
4. Set owner keyword: `CurrentFollowerFaction` (this package only runs when the companion is in the follower faction)
5. Interrupt override: allow combat interruption
6. **Critical**: Leave `Must Complete` unchecked — allows the follow behavior to interrupt for combat

### The Sandbox Package (Dismissed State)

When dismissed, the companion needs fallback behavior at their home:

1. Type: **Sandbox**
2. Location: Specific reference → your home marker
3. Radius: 512 (game units — stays near home)
4. Activities: enable Eat, Sleep, Converse, Relax

### The Travel Package (After Dismissal)

When dismissed far from home, the companion needs to travel back:

1. Type: **Travel**
2. Location: Companion's home location alias
3. Condition: `GetInCurrentLocation` is NOT home location (only travel if away from home)

### Package Priority in NPC_

In the NPC_ record → AI Packages tab, add packages in priority order (top = highest priority):
1. Follow package (condition: `IsInFaction CurrentFollowerFaction`)
2. Travel package (condition: NOT at home AND NOT in follower faction)
3. Sandbox package (fallback — always true)

---

## Part 5: Companion Dialogue

### Core Topic Set

A companion needs at minimum these dialogue topics:

| Topic Type | When Used | Example |
|---|---|---|
| `Greeting` | When player activates companion | "Hey there, wanderer." |
| `Recruit Topic` | Player asks companion to follow | "I'd love to see the wasteland together." |
| `Dismiss Topic` | Player sends companion home | "Head back, I work better alone." |
| `Dismiss Confirm` | Confirmation after dismiss | "Sure. I'll be at [location]." |
| `Current Location Check` | Player asks where companion will go | "I'll head back to Sanctuary." |
| `Wait/Follow Toggle` | Toggle companion between wait and follow | "Stay here." / "Come on." |
| `Combat Barks` | Random combat comments | "Watch your back!", "Enemy down!" |
| `Idle Comments` | Random ambient dialogue | "Sure is quiet out here..." |
| `Relationship Dialogue` | Triggered by affinity events | "I've been thinking about what you did back there." |

### Recruit / Dismiss Pattern

**Recruit sequence:**
1. Player activates companion → Greeting topic fires.
2. Player selects "Would you like to travel together?" option.
3. NPC response plays → INFO record's `End` fragment calls `RecruitCompanion()`.
4. Script adds companion to `CurrentFollowerFaction` and sets Quest Stage 20.

**Recruit script fragment:**
```papyrus
; In the "Dismiss Confirm" INFO End fragment:
Quest compQuest = Game.GetFormFromFile(0x800, "MM_MyMod.esp") as Quest

; Add to current follower faction
Actor companion = compQuest.GetAlias(1) as Actor
Faction followerFaction = Game.GetFormFromFile(0x801, "MM_MyMod.esp") as Faction
companion.AddToFaction(followerFaction, 0)

; Set quest stage
compQuest.SetStage(20)
```

**Dismiss script fragment:**
```papyrus
; In the "Dismiss Confirm" INFO End fragment:
Quest compQuest = Game.GetFormFromFile(0x800, "MM_MyMod.esp") as Quest
Actor companion = compQuest.GetAlias(1) as Actor
Faction followerFaction = Game.GetFormFromFile(0x801, "MM_MyMod.esp") as Faction

; Remove from current follower faction
companion.RemoveFromFaction(followerFaction)

; Set quest stage
compQuest.SetStage(30)
```

### Combat Barks

Combat barks fire automatically during combat via CK's `Combat Bark` topic type:

1. Create a Dialogue Topic with `Type = Combat`
2. Sub-type: `Attack`, `Death`, `Miss`, `PowerAttack`, etc.
3. Add INFO records with conditions like `Random(0.25) == 1` for variety
4. No script needed — the engine fires these automatically during combat

### Idle Barks (Location/Time-Based)

Idle comments fire when the companion is following and bored. Use `Type = Custom` topic with conditions:
- `GetIsCurrentLocation(DiamondCityLocation)` → Diamond City comments
- `GetCurrentTime() >= 20.0` → nighttime comments
- `Random(0.1) == 1` → 10% chance per evaluation cycle (prevents spam)

---

## Part 6: Companion Perks

Companions in vanilla FO4 grant the player a perk while they are following. Set this up:

1. Create a `PERK` record: `MM_CompanionPerk_Active`
2. Define the perk effect (bonus damage, carry weight, special ability, etc.)
3. In the companion NPC_ record → Perk tab: add the perk but do NOT check `Active` yet
4. In your quest script: when companion is recruited, add the perk via:
   ```papyrus
   Game.GetPlayer().AddPerk(MM_CompanionPerk_Active)
   ```
5. When dismissed, remove it:
   ```papyrus
   Game.GetPlayer().RemovePerk(MM_CompanionPerk_Active)
   ```

---

## Part 7: Relationship / Affinity System

Vanilla companions have a relationship-rank system (0–4: Stranger → Acquaintance → Friend → Close Friend → Lover). You can replicate this:

### Affinity Global Variable

Create a `GLOB` (Global Variable) record: `MM_CompanionAffinity`, type `Float`, default `0.0`.

### Affinity Events

At key moments in your quest (player does something the companion approves/disapproves of), modify the global:

```papyrus
; Companion approves of player action:
GlobalVariable affinityGlobal = Game.GetFormFromFile(0x802, "MM_MyMod.esp") as GlobalVariable
affinityGlobal.SetValue(affinityGlobal.GetValue() + 10.0)

; Check for relationship milestone:
If (affinityGlobal.GetValue() >= 50.0)
    ; Unlock new dialogue topic or companion ability
    Quest compQuest = Game.GetFormFromFile(0x800, "MM_MyMod.esp") as Quest
    compQuest.SetStage(50)   ; Stage 50 = Friend status reached
EndIf
```

### Relationship Dialogue Unlocking

Use quest stage conditions on INFO records:
- `GetStage MM_CompanionQuest >= 50` → Friend-tier dialogue becomes available
- `GetStage MM_CompanionQuest >= 75` → Close Friend-tier dialogue

---

## Part 8: Home Location & Dismiss Location

When the player dismisses the companion, they need somewhere to go:

1. Place a **Idle Marker** (`xMarkerHeading`) at the companion's home location in the CK.
2. Create a **Location** record or use the vanilla location of the area.
3. In your sandbox package, reference this marker as the location.
4. The companion's Dismiss dialogue should tell the player where they're going:
   ```
   "I'll head back to Goodneighbor. You know where to find me."
   ```

---

## Part 9: Compatibility with Companion Frameworks

### AFT (Amazing Follower Tweaks)

AFT hooks into companions via `CurrentFollowerFaction`. Any companion in this faction automatically gets AFT's pose, sandbox, and combat stance options. No extra work required.

### EFF (Extended Follower Framework)

EFF requires companions to have the `UFO4P_FollowerPotential` keyword in their NPC_ record to be detected. Add the keyword and EFF handles the rest automatically.

### Multiple Companions (If Intended)

If your companion is designed to work alongside vanilla companions:
- Use `CurrentFollowerFaction` (not a custom faction) to trigger the follow behavior
- The vanilla companion limit (1 companion at a time, without framework mods) applies — players need AFT or EFF to have multiple companions simultaneously
- Document this clearly in your mod's description

---

## Part 10: Voiced Companion Checklist

If adding voice acting:

- [ ] Set the NPC_'s Voice Type field to match your voice actor's files
- [ ] All combat barks are in the `Sound\Voice\[PluginName]\[VoiceType]\` path
- [ ] All dialogue INFO records have matching audio and lip sync (`.fuz` files)
- [ ] Use xVASynth (see `DIALOGUE_CONVERSATION_GUIDE.md`) for AI-generated voices if no voice actor
- [ ] Test all voice lines in-game before release

---

## Part 11: Testing Checklist

- [ ] Companion can be recruited via dialogue
- [ ] Companion follows the player (Follow package activates)
- [ ] Companion can be dismissed and returns to home location
- [ ] Companion re-joinable after dismissal
- [ ] Combat: companion fights alongside player
- [ ] Combat: companion enters bleedout instead of dying (Essential flag)
- [ ] Companion levels with the player (or uses appropriate fixed level)
- [ ] No T-pose in any state (idle, follow, combat, sandbox)
- [ ] Combat barks fire correctly during combat
- [ ] Idle barks fire without spam (Random condition working)
- [ ] Companion perk applies when following; removed when dismissed
- [ ] Affinity events trigger at correct moments
- [ ] Relationship dialogue unlocks at correct affinity thresholds
- [ ] No Papyrus errors in log during a full recruit/dismiss cycle
- [ ] Companion works with AFT and/or EFF if user has those installed

---

*Last updated: May 2026. Tested against FO4 NG CK and F4SE 0.7.7.*
