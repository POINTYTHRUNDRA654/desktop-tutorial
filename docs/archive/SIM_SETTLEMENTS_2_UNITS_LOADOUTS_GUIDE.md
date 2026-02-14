# Sim Settlements 2: Units and Loadouts Complete Guide

**Version:** 1.0  
**Last Updated:** January 24, 2026  
**Scope:** Comprehensive reference for creating military units in Sim Settlements 2  
**Audience:** Addon pack authors, modders, content creators

## Table of Contents

1. [Introduction](#introduction)
2. [UnitTypes vs Loadouts](#unittypes-vs-loadouts)
3. [UnitTypes In-Depth](#unittypes-in-depth)
4. [Loadouts In-Depth](#loadouts-in-depth)
5. [UnitForm Actors](#unitform-actors)
6. [Uniforms](#uniforms)
7. [Registration and Integration](#registration-and-integration)
8. [Quick Reference](#quick-reference)

---

## Introduction

This guide explains the relationship between UnitTypes, Loadouts, and other record types that make up soldiers in Sim Settlements 2. These systems allow addon authors to:

- Create custom military units for player armies
- Define enemy forces with varied equipment and roles
- Implement progression systems through ranks
- Unlock units through gameplay events
- Balance unit power and recruitment costs

**Note:** This documentation reflects changes in patch 3.1.0 and later (November 2023+).

### Core Concepts

**UnitTypes** are the primary soldier definitions combining:
- Actor records (the NPC base)
- Equipment and loadouts
- Recruitment costs and requirements
- Role definitions
- Availability conditions

**Loadouts** are equipment sets that modify a UnitType:
- Applied when assigning units to roles
- Associated with ranks
- Include armor, weapons, abilities, perks
- Can override costs

---

## UnitTypes vs Loadouts

### UnitTypes: The Foundation

A UnitType is an Armor record that brings together all information making up a soldier:

- **Combat Role**: Defines what the soldier does (Sniper, Rifleman, Tank, etc.)
- **Actor Form**: The actual NPC model spawned
- **Equipment Base**: Default outfit and gear
- **Recruitment Info**: Cost, requirements, availability
- **Rank Support**: Multiple loadouts for progression
- **Requirements**: When unit can be used
- **Settings**: Integration with settlement system

**Note:** In-game, when players "assign a Loadout," they're actually changing a Soldier's UnitType. The soldier then gains access to that UnitType's loadouts.

### Loadouts: Equipment Progression

A Loadout is an Armor record defining equipment variations:

- **Equipment Set**: Armor, weapons, accessories
- **Abilities**: Combat spells, perks, AI packages
- **Costs**: Equip cost, assault cost, upkeep cost
- **Rank Association**: Each rank can have unique loadout
- **Descriptions**: Player-facing information

**Key Relationship:** A UnitType contains up to 5 Loadouts (one per rank). Loadouts are never used independently—they modify UnitTypes.

---

## UnitTypes In-Depth

### Creating a UnitType

**Starting Point:** Duplicate `SS2_UnitType_Template` Armor record

**Structure:** UnitType uses the NPCUnitType script with properties grouped by function.

### Property Groups

#### Assigned Group

Controls assigning existing soldiers to this UnitType.

| Property | Purpose |
|----------|---------|
| **iRankRequirement** | Minimum rank to assign this unit (1-5) |
| **LimitToRaces** | Races eligible (default: Human, Ghoul, SynthGen1, SynthGen2) |

#### Cost Overrides Group

Override default recruitment, assault, and upkeep costs.

**Important:** Leave blank to use defaults (e.g., Recruitment default = 250 caps)

**Cost Types:** Use ActorValue > SS2_VirtualResource* options

**Cost Categories** (via iIndex):
- 0 = Caps
- 1 = Rations (Food/Water)
- 2 = Scrap
- 3 = Supplies

| Property | Purpose |
|----------|---------|
| **AssaultCostOverride** | Cost per assault (typically Ammo) |
| **RecruitmentCostOverride** | New unit cost (typically Armor, WeaponParts) |
| **UpkeepCostOverride** | Daily cost (if Upkeep enabled) |

**Note:** RecruitmentCosts combine with RankLoadout costs when RankLoadouts are defined.

#### Descriptions Group

Display information to players.

| Property | Purpose |
|----------|---------|
| **DescriptionMessage** | Message form describing unit role |
| **ShortDescriptionHolder** | MiscObject with brief name/summary |

#### RankSupport Group

Define progression system through ranks.

| Property | Purpose |
|----------|---------|
| **RankLoadouts** | Up to 5 Loadouts, one per rank |
| **RankPerkOverrides** | Custom rank-up perks (replaces default health buff) |
| **Ranks** | Custom rank names for this unit type |

**Loadout Configuration:**
- Create 1-5 Loadouts (don't need all 5)
- Soldier always gets highest available for their rank
- Example: 5-ranked unit might have Loadouts at ranks 1, 3, and 5

**Rank Names:** Copy `SS2_SoldierRank_Template` for custom naming. Mostly requires Name field configuration.

#### Recruited Group

Controls how units are recruited and spawned.

| Property | Purpose |
|----------|---------|
| **bAllowDeskRecruitment** | Player can queue from War Planner's Desk |
| **bPlayerCanUseAsRecruitForm** | Player can set as default recruit type |
| **bRecruitedOnly** | Player cannot assign to existing soldiers |
| **bVirtualUnit** | Unit spawns at battle (not in outpost) |
| **iDefaultClassIndex** | Soldier role when spawned (see Documentation String) |
| **iStartingRankWhenSpawned** | Initial rank when created |
| **ParentFaction** | Faction this unit belongs to |
| **UnitForm** | Actor record spawned (critical) |

**UnitForm:** The actual NPC spawned. If blank, spawns as basic settler. This is one of the most important properties.

#### Requirements Group

Control when unit can be used.

| Property | Purpose |
|----------|---------|
| **bNPCArmyUseOnly** | Only enemy armies can use |
| **bPlayerOnly** | Only player can use |
| **iMaxPerGame** | Max total in player army |
| **iMaxPerOutpost** | Max at single outpost |
| **NPCArmyUseRequirements** | Condition for NPC armies (quest stage, global) |
| **PlayerArmyUseRequirements** | Condition for player (DLC check, off-condition) |

**Best Practice:** Use PlayerArmyUseRequirements for DLC/mod dependencies. Use Unlock System for gameplay triggers.

#### Settings Group

Integration with settlement system and role assignments.

| Property | Purpose |
|----------|---------|
| **bAllowAsPersonalGuard** | Can be personal guard (future feature) |
| **bCanBeGuard** | Eligible for Guard role |
| **bCanBePatrol** | Eligible for Patrol role |
| **bCanBeSupport** | Eligible for Support role |
| **bCanBeWarrior** | Eligible for Warrior role |

**Note:** If all bCanBe are false, unit uses iDefaultClassIndex. If invalid, uses Civilian.

| Property | Purpose |
|----------|---------|
| **bRequiresBed** | Unit needs empty bed at outpost |
| **fFoodRequired** | Food consumption (default: 1) |
| **fWaterRequired** | Water consumption (default: 1) |
| **iDefenseModifier** | Settlement defense provided |

**Defense Calculation:** If set to -1, defense = (SPECIAL stat total) capped 1-20

#### UnitData Group (Required)

Core unit information used throughout systems.

| Property | Purpose |
|----------|---------|
| **DefaultOutfit** | Fallback gear if loadout fails |
| **iStrengthRating** | Power level 1-20 (1=weak, 20=Behemoth) |
| **UnitKeyword** | Unique keyword for tracking this unit type |

**iStrengthRating:** Use best judgment; compare to existing units if uncertain.

---

## Loadouts In-Depth

### Creating a Loadout

**Starting Point:** Duplicate `SS2_Template_NPCLoadout` Armor record

**Naming Convention:** Name loadouts to pair with UnitType (e.g., SS2_Loadout_Sniper_Rank2)

**Structure:** Uses NPCLoadout script with properties grouped by function.

### Property Groups

#### Abilities Group

Grant AI behaviors and special abilities.

| Property | Purpose |
|----------|---------|
| **AIOverrideStampAlias** | Custom AI package stack (advanced) |
| **CombatBuffs** | Spell(s) applied before combat |
| **SpecialAbilities** | Perk(s) applied when loadout equipped |

**Priority Note:** Use priority 43 for AIOverrideStampAlias to allow other systems (like Flee) to override.

#### Costs Group

Costs paid from settlement resources when using this loadout.

**Cost Resources:** Use ActorValue > SS2_VirtualResource* (non-daily)

**Categories** (via iIndex):
- 0 = Caps
- 1 = Rations (Food/Water)
- 2 = Scrap
- 3 = Supplies

| Property | Purpose |
|----------|---------|
| **AssaultCostOverride** | Cost per assault (overrides UnitType) |
| **EquipCost** | Cost to apply loadout (free if blank) |
| **UpkeepCostOverride** | Daily cost (overrides UnitType) |

#### Descriptions Group

Display to players.

| Property | Purpose |
|----------|---------|
| **DescriptionMessage** | Message form describing loadout |
| **ShortDescriptionHolder** | MiscObject with brief name |

#### Equipment Group

Define how NPC is equipped.

| Property | Purpose |
|----------|---------|
| **AdditionalInventoryOnEquip** | Items given/taken with loadout (sidearms, accessories) |
| **ArmorToEquip** | Outfit record with armor pieces |
| **ArmoryBonusItems_OneTime** | Items given first time loadout applied (3 entries for 3 armory levels) |
| **ArmoryBonusItems_Restock** | Items given at each restock/assault (3 entries) |
| **ArmoryBonusItems_RestockIsOverride** | Replace default armory items (grenades, stimpaks) |
| **bIgnoreUniform** | Prevent military uniform from applying |
| **PowerArmor** | Power armor to equip with loadout |
| **PowerArmorAlways** | Stay in power armor permanently |

**Military Uniform Support:** Avoid filling Body and [U] slots in Outfit. These are reserved for uniforms.

**Power Armor:** For spawn-in units, set on Actor inventory instead.

#### Weapons

Equipment handled separately due to complexity.

**Three Configuration Methods:**

**Simple Method - Single Weapon**
```
PrimaryWeapon: Specific weapon record (may randomize via ObjectTemplate)
```

**Moderate Randomization - Weapon List**
```
PrimaryWeapon: FormList of weapons
PrimaryWeaponNameHolder: MiscObject with list name (e.g., "Various Rifles")
```

**Heavy Randomization - Leveled List**
```
PrimaryWeaponLL: LeveledItem configured for single weapon output
PrimaryWeapon: (Optional) FormList of all possible weapons for display/removal
PrimaryWeaponNameHolder: MiscObject with weapon type name
```

**Best Practices:**
- Use weapon formlists for dynamic mod-injected content
- Use leveled lists for complex randomization
- Always provide PrimaryWeaponNameHolder with formlists/leveled lists
- Set PrimaryWeapon formlist with leveled list approach for proper removal

#### Settings Group

Loadout integration options.

| Property | Purpose |
|----------|---------|
| **iRankRequirement** | Which rank uses this loadout (important for ordering) |
| **iStrengthModifier** | Power adjustment for this loadout (applied to UnitType rating) |

**Rank Requirement:** Critical when UnitType has multiple loadouts. RankLoadouts array order does NOT determine rank usage—this property does.

---

## UnitForm Actors

### Creating Actor Records

Actor records are the most complex component. Start with `SS2_C3_UnitActor_Template`.

### Base Data (Always Visible)

| Property | Notes |
|----------|-------|
| **Name** | NPC display name in-game |
| **Respawn** | ❌ Do not check (prevents re-appearing) |
| **Unique** | ❌ Do not check (breaks script logic) |
| **Is Ghost** | ❌ Do not check (can't be attacked) |
| **Invulnerable** | ❌ Do not check (can't be defeated) |
| **No Activation/Hellos** | ❌ Do not check (breaks Manage Soldier menu) |
| **Forced Loc Ref Type** | ⚠️ Do not set (prevents LocRefType changes) |

#### Scripts Tab

**Optional but Recommended:** Add WorkshopNPCScript

| Property | Purpose |
|----------|---------|
| **WorkshopParent** | Mandatory; connects to settlement system |
| **bAllowCaravan** | Can be provisioner/caravan member |
| **bAllowMove** | Can move between outposts (virtual units = false) |
| **bCommandable** | Player can issue commands |

### Traits Tab

**Important for Humanoids:** Use templates to avoid all soldiers having same face/gender/voice.

**Recommended:** LCharWorkshopNPC template for varied human faces

**For Creatures:** Configure manually if not humanoid.

**Note:** Race is important since equipment is race-dependent.

### Stats Tab

Determines level and stat scaling.

| Property | Purpose |
|----------|---------|
| **Level** | Health scaling; affects skull display |
| **PC Level Mult** | Scale level with player (e.g., 1.5 = 150% player level) |
| **Calc Min/Max** | Bounds when using PC Level Mult |
| **Auto calc stats** | Automatically boost stats with level |

**Class Configuration:**
- Class provides baseline stats
- Base Actor Values ADD to class stats
- Use ZeroSPECIALclass for complete control (then define all SPECIAL in Base Actor Values)

**Stat Report:** Check Actor Value Report at bottom to see final values.

### Factions Tab

**Generally Leave Empty:** System applies factions dynamically based on army affiliation.

**Exception:** Keep dialogue-related factions; remove others.

### Keywords Tab

**Always Include:**
- `SS2_C3_Tag_ArmyUnit` - Mark as military unit
- `SS2_Tag_UnitType_[YourKeyword]` - Reference from UnitType record
- `AO_Type_WorkshopAlarm` - Rush to aid siren

**Optional:**
- `AnimArchetype*` - Animation style (one only)
- `AnimFaceArchetype*` - Resting facial state (one only)
- `usePowerArmorFrame*` - Default armor appearance under PA
- `SS2_Tag_StatsRolled` - Prevent stat re-rolling (non-recruit units)

**Reminder:** Remove template placeholder keyword `SS2_Tag_UnitType_Raider`

### AI Data Tab

Determines NPC interaction behavior.

| Property | Setting | Purpose |
|----------|---------|---------|
| **Aggression** | Aggressive | Won't attack without explicit enemy |
| **Confidence** | Foolhardy | Won't retreat; SS2 handles retreat |
| **Assistance** | Helps Allies | Automatically fights for correct team |
| **Morality** | No Crime | Avoid random aggro from player crimes |
| **Aggro Radius** | Off | Only for non-workshop turrets |
| **Combat Style** | Custom or default | How NPC fights (create CombatStyle if needed) |

### AI Packages Tab

**Usually Leave Default:** SS2 controls packages via aliases in settlements/assaults.

**Default Package List & Combat Override:** Set to DefaultMasterPackageList and DefaultCombatMasterPackageList for humanoids. Keep existing for creatures/special types.

### Inventory Tab

| Property | Purpose |
|----------|---------|
| **Default Outfit** | Fallback if loadout fails |
| **Power Armor Furniture** | PA suit/frame (for always-in-PA units) |
| **Inventory** | Starting items (good for flavor/loot) |

**Power Armor Setup:** For units that should always be in PA, set here. For others, use Loadout PowerArmor field.

### Spell List Tab

Not usually needed; use Loadout CombatBuffs/SpecialAbilities instead.

---

## Uniforms

### Creating Uniforms

**Starting Point:** Duplicate `SS2_UniformSelector_Template` Armor record

**Purpose:** Apply base underarmor to all soldiers for unified appearance

**Not directly equipped:** Uniforms are selectors that dynamically apply armor.

### Base Data

| Property | Purpose |
|----------|---------|
| **Name** | Player-facing display name |
| **World Model** | Preview model in selection interface |

### Script Properties

Uses Uniform script with BaseRaceUnderarmorMaps and RankedVersions.

#### BaseRaceUnderarmorMaps Entries

| Field | Purpose |
|-------|---------|
| **RaceForm** | Race this underarmor supports (blank = Human/Ghoul/SynthGen1/2) |
| **Underarmor** | Armor record to equip (should use Body slot 33, [U] slots 36-40) |

**Armor Slot Requirements:**
- **Body (33):** Should be filled
- **[U] Slots (36-40):** Underarmor slots
- **All Others:** Should be empty (to avoid conflicts with loadout armor)

#### RankedVersions (Optional)

Set on Rank 1 uniform only to apply different uniforms per rank.

**Setup:**
1. Create all 5 uniform records without RankedVersions
2. Return to Rank 1 uniform
3. Set RankedVersions to point at Rank 2-5 uniformssequentially

---

## Registration and Integration

### Registration System

All created records must be registered into SS2 for use.

**Method:** Use FLID (FormList ID) injection pattern

**See:** "Your First Addon" tutorial for injection patterns

### Required Registrations

#### UnitTypes

```
Register ALL UnitTypes → SS2_FLID_NPCUnitTypes
Register PLAYER UnitTypes → SS2_FLID_NPCUnitTypes_PlayerUnlocked
```

**For Unlocked-via-Unlock-System:** Use RegisterForms field:
- Target: SS2_C3_AllUnitTypes
- Target: SS2_C3_PlayerUnlockedUnitTypes

#### Rank Names

```
Register Custom Ranks → SS2_FLID_SoldierRanks
Register Player Ranks → SS2_FLID_SoldierRanks_PlayerUnlocked
```

#### Uniforms

```
Register All Uniforms → SS2_FLID_Uniforms
```

---

## Quick Reference

### Naming Conventions

| Record Type | Suggested Format |
|-------------|------------------|
| UnitType | SS2_UnitType_[Name] |
| Loadout | SS2_Loadout_[UnitName]_Rank[X] |
| Rank Name | SS2_Rank_[ArmyName]_[RankName] |
| Uniform | SS2_Uniform_[Description] |
| Unit Actor | SS2_Actor_[UnitName]_[Variant] |
| Keyword | SS2_Tag_[Category]_[Name] |

### Critical Properties Checklist

#### UnitType Essentials
- [ ] UnitForm (Actor record)
- [ ] UnitKeyword (unique identifier)
- [ ] iStrengthRating (1-20 power level)
- [ ] DefaultOutfit (fallback gear)
- [ ] RankLoadouts (if multi-rank)

#### Loadout Essentials
- [ ] ArmorToEquip (outfit record)
- [ ] PrimaryWeapon or PrimaryWeaponLL
- [ ] PrimaryWeaponNameHolder (if using formlist/LL)
- [ ] iRankRequirement (if multi-loadout)

#### Actor Essentials
- [ ] Name
- [ ] UnitType keyword
- [ ] SS2_C3_Tag_ArmyUnit keyword
- [ ] Race (matches UnitType)
- [ ] WorkshopNPCScript (recommended)
- [ ] Default Outfit
- [ ] Stats configured
- [ ] AI Data set (Aggressive, Foolhardy, Helps Allies)

#### Uniform Essentials
- [ ] Name
- [ ] BaseRaceUnderarmorMaps configured
- [ ] Underarmor slot compliance (33 + 36-40 only)

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Unit won't appear | UnitType not registered | Check SS2_FLID_NPCUnitTypes registration |
| Player can't recruit | bAllowDeskRecruitment false | Set to true or use Unlock System |
| Equipment doesn't apply | ArmorToEquip not set | Define outfit in Loadout |
| Wrong weapon equipped | PrimaryWeapon not in formlist | Update formlist or set specific weapon |
| Uniform conflicts with armor | Wrong armor slots used | Use only Body (33) and [U] (36-40) |
| Actor has wrong face | No template applied | Apply face template to Traits |
| Can't assign existing unit | bRecruitedOnly true | Set to false if assigning intended |
| Defense too high/low | iDefenseModifier incorrect | Set to -1 for SPECIAL-based, or specific number |

### Cost Structure Example

**Typical Unit Progression:**

```
Recruitment Cost: 250 caps + 5 Armor Parts + 3 Weapon Parts
Rank 1 Loadout Cost: 50 caps to equip
Assault Cost: 20 Ammo
Rank 5 Loadout Cost: 200 caps to equip (upgrade progression)
Daily Upkeep: 10 Rations (if Upkeep enabled)
```

### Virtual Resources for Costs

**Category Assignments:**

| iIndex | Resource Type | Examples |
|--------|---------------|----------|
| 0 | Caps | SS2_VirtualResource_Caps |
| 1 | Rations | Food/Water components |
| 2 | Scrap | Building materials, metals |
| 3 | Supplies | Industrial supplies |

---

## Best Practices

### Design Principles

1. **Balance Power with Cost:** Stronger units should cost more to recruit/maintain
2. **Differentiate Roles:** Clear combat roles prevent redundant units
3. **Support All Races:** Use race-aware loadouts for armor variety
4. **Test Thoroughly:** Check stats, equipment, AI behavior in combat
5. **Document Intent:** Clear descriptions help players understand units

### Creating Variety

- **Loadout Progression:** Use ranks to show equipment upgrades
- **Weapon Variety:** Use formlists/leveled lists for visual diversity
- **Armor Customization:** Create race-specific outfit records
- **Ability Differentiation:** Assign unique combat buffs/perks per loadout

### Performance Considerations

- **Avoid Complex AI:** Use default package lists unless necessary
- **Limit Special Abilities:** Too many perks cause overhead
- **Batch Similar Units:** Share components where possible
- **Test Spawn Rate:** Ensure outpost populations stay reasonable

---

## Additional Resources

- **Your First Addon Tutorial** - Injection pattern foundation
- **Unlock System Documentation** - Trigger unit availability via gameplay
- **UsageRequirements Guide** - Condition unit availability on quests/globals
- **Combat Style Reference** - Customize NPC combat behavior
- **Workshop Framework Source** - Advanced settlement integration

---

**Document Version:** 1.0  
**Last Updated:** January 24, 2026  
**Maintained By:** Mossy Documentation Team  
**Source:** Kinggath and Sim Settlements 2 Development Team

