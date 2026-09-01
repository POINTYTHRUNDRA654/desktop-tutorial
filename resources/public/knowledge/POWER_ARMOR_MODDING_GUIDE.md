# Power Armor Modding — Complete Guide for Fallout 4 (2026)

Power Armor is one of Fallout 4's most iconic systems — and one of the most technically unique to mod. Unlike regular armor, Power Armor uses its own race, frame NPC, attachment slots, and a separate HUD system. This guide covers the complete pipeline for creating custom Power Armor: new frames, new pieces, custom modifications, and special abilities.

---

## Part 1: How Power Armor Works Under the Hood

Power Armor in Fallout 4 is not simply "heavy armor." It is implemented as:

1. A **Frame** (`NPC_` actor) — a vehicle-like actor the player enters and pilots
2. **Arm/Leg/Torso/Head pieces** (`ARMO` records) attached to the frame
3. A unique **Race** (`PowerArmorRace`) with its own skeleton, animations, and biped slots
4. **Fusion Core** (`MISC` ammo item) as the power source
5. A custom **HUD overlay** (Flash/Scaleform SWF) that replaces the standard HUD

### Power Armor Biped Slots

Power Armor uses separate biped slots from regular armor:
- Slot 41: PA Torso
- Slot 42: PA Left Arm
- Slot 43: PA Right Arm
- Slot 44: PA Left Leg
- Slot 45: PA Right Leg
- Slot 46: PA Helmet

These are distinct from the regular armor slots, which is why wearing PA doesn't conflict with equipped clothing.

---

## Part 2: Creating a New Power Armor Frame

### Step 1: Duplicate the Base Frame

1. CK → Character → Non-Player Character (Actor)
2. Search for `PowerArmorFrame` — the base vanilla frame NPC
3. Right-click → Duplicate
4. Rename to `MM_CustomPAFrame`

### Step 2: Frame NPC_ Settings

In the duplicated frame NPC_:

| Field | Value | Notes |
|---|---|---|
| `Race` | `PowerArmorRace` | Must match vanilla — this determines skeleton + animations |
| `ActorBase` | (keep vanilla reference) | Handles base stats |
| `Keywords` | `isGunner`, `ActorTypeRobot` or none | Affects faction detection |
| `AI Packages` | (keep vanilla) | Power armor frame uses a special package set |

### Step 3: Attach Pieces to the Frame

In the NPC_ record → Inventory:
- Add each armor piece (`ARMO`) you've created for this frame
- The player swaps these pieces at a Power Armor Station

### Step 4: Place the Frame in the World

Create an `ACHR` reference in your chosen cell. The frame NPC_ must be placed for the player to interact with it.

---

## Part 3: Creating Power Armor Pieces (ARMO Records)

Each piece of Power Armor is an `ARMO` record, just like regular armor — but with Power Armor–specific settings.

### ARMO Record Setup

1. CK → Items → Armor → Duplicate a vanilla PA piece (e.g., `ArmorPowerT60Chest`)
2. Rename: `MM_PACustom_Chest`, `MM_PACustom_LeftArm`, etc.

### BOD2 (Biped Slots)

Set the correct Power Armor biped slot for each piece:
- Chest: Slot 41
- Left Arm: Slot 42
- Right Arm: Slot 43
- Left Leg: Slot 44
- Right Leg: Slot 45
- Helmet: Slot 46

### KWDA (Keywords)

Every Power Armor piece must have:
- `ArmorTypePower` — required for power armor perk interaction
- `PowerArmorChest` / `PowerArmorArm` / `PowerArmorHelmet` etc. — slot-type classifiers
- `WorkbenchPowerArmor` — enables modification at the PA Station workbench
- Any custom keywords for your unique abilities

### ARMA (Armor Addon — the Mesh)

Create an `ARMA` record linking to your Power Armor NIF mesh:
- Race: `PowerArmorRace` (critical — regular HumanRace ARMAs won't load on PA)
- NIF path: `Meshes\Armor\MM_CustomPA\chest.nif` (your model)
- Weight slider: Male / Female models (PA is typically gender-neutral; use the same NIF for both)

---

## Part 4: Power Armor Mesh Requirements

Power Armor NIFs must attach to the Power Armor skeleton, which is different from the human skeleton.

### PA Skeleton Path

```
Actors\Character\PowerArmorSkeleton.hkx
```

### NIF Node Names

PA meshes must use the PA skeleton's bone names. Key bones:
- `PA_Torso` — torso attachment
- `PA_LArm` — left arm
- `PA_RArm` — right arm
- `PA_LLeg` — left leg
- `PA_RLeg` — right leg
- `PA_Head` — helmet/head

### Collision

Power Armor pieces require capsule collision around each limb segment. Set up via NifSkope: each piece needs a `bhkRigidBody` attached to the root PA bone.

### LOD Setup

PA is a large, frequently-visible object. Generate LOD NIF files (`_0.nif`, `_1.nif`, `_2.nif`) for each piece using xLODGen or manually in Blender.

---

## Part 5: Power Armor Modifications (OMODs)

Like weapons, Power Armor pieces support the OMOD (Object Modification) system for player-crafted upgrades.

### OMOD Record for PA

1. CK → Items → Object Modification (OMOD) → Duplicate a vanilla PA OMOD (e.g., `Armor_Power_T60_Chest_Material_Hotrod`)
2. Rename: `MM_PAMod_CustomJet` (example: jetpack)
3. Set `Attach Parent Slot` to the correct slot keyword (`WorkbenchPowerArmor_Chest_PA`)
4. Set `Item` to the ARMO piece this mod attaches to
5. Define effects in the `Properties` list:
   - AddKeyword, SetValue (damage resist), etc.

### Crafting Recipe (COBJ)

For each OMOD that can be crafted at the Power Armor Station:

```
COBJ record:
  Workbench: WorkbenchPowerArmor
  Conditions: HasPerk (relevant perk) OR no condition (freely craftable)
  Components: required crafting materials
  Result: your OMOD item
  Result Count: 1
```

### Special PA Modifications

| Effect | How to Implement |
|---|---|
| Jetpack | OMOD adds `ActorValue kJetpackBoost` modifier; requires `PA_Jetpack` animation node in NIF |
| Stealth Field | OMOD adds a `SPEL` effect that fires `ShouldApplyStealthBoy` when triggered |
| Radiation Scrubbers | OMOD adds keyword that triggers a periodic Rads removal spell |
| Emergency Protocols | OMOD perk that activates at low health (30% speed boost) |

---

## Part 6: Fusion Core System

Power Armor drains Fusion Cores over time. If you want custom power source behavior:

### Fusion Core Drain

Drain rate is controlled by:
- `fPowerArmorFusionCoreDrainPerTick` game setting (`GMST` record)
- Sprint drain: `fPowerArmorSprintActionCost` (`GMST`)

Modify these GMST values in xEdit to change drain rate for all PA, OR use a Papyrus script attached to the frame NPC_:

```papyrus
Scriptname MM_CustomPAFrame extends ObjectReference

Actor Property PlayerRef Auto
Float Property CustomDrainRate = 0.005 Auto    ; per second drain multiplier

Event OnUpdate()
    If PlayerRef.IsInPowerArmor()
        Actor paFrame = PlayerRef.GetActorInPowerArmor()
        If paFrame != None
            paFrame.DamageActorValue(ActorValue.kFusionCoreCharge, CustomDrainRate)
        EndIf
    EndIf
    RegisterForUpdate(1.0)
EndEvent
```

### Custom Power Source (Non-Fusion Core)

To replace fusion core with a custom item:
1. Create a new `MISC` (Misc Item) record for your power source
2. Assign it the keyword `FusionCoreKeyword` (the engine checks this keyword, not FormID)
3. Set identical `ObjectTypeKeyword` to `FusionCoreKeyword`
4. Place in the ARMO frame's fuel slot requirement

---

## Part 7: Power Armor HUD Customization

The Power Armor HUD is a Scaleform SWF overlay loaded when the player enters PA. The vanilla PA HUD path:

```
Interface\HUDMenu.swf
```

For a custom PA HUD:
1. Decompile `HUDMenu.swf` using JPEXS Free Flash Decompiler
2. Modify the PA HUD layer (labeled `PowerArmorHUDWidget`)
3. Recompile to SWF
4. Place in your mod's `Data\Interface\` folder

**2025 alternative:** F4SE's `UI.OpenCustomMenu()` function can overlay a completely custom SWF on top of the PA HUD without replacing the base HUD file — less conflict-prone.

---

## Part 8: Power Armor AI (NPC in PA)

NPCs can also wear Power Armor — this is how vanilla Gunner colonels and Paladin Danse work.

### Setting Up NPC PA Equipping

1. Create the NPC_ with `Has Unique PA` flagged
2. In the NPC_ inventory, add the PA frame and all pieces
3. The engine assigns the PA frame to the NPC's position in the cell and places them inside it automatically on spawn
4. Set `Race = PowerArmorRace` on the NPC_ for PA-specific animations

### NPC PA Drops

When the player kills an NPC in PA:
- The PA frame becomes a lootable object (same as vanilla)
- Configure the pieces to have the correct condition on death (via `fActorDeathDropChance` or OMOD modifiers)

---

## Part 9: Custom Power Armor Sounds

Power Armor has distinctive sounds for:
- Servo motors (walk, run, sprint)
- Arm swing / punch impacts
- Visor HUD boot-up / shutdown
- Fusion core insert/eject

These are assigned via the `Race` record's sound descriptors. For custom PA with distinct sounds:
1. Duplicate `PowerArmorRace` → create `MM_CustomPARace`
2. Replace sound descriptor entries with your custom SNDR records
3. Assign `MM_CustomPARace` to your custom PA frame NPC_
4. The vanilla PA animation set still works with the custom race (don't change the skeleton)

---

## Part 10: Compatibility with Vanilla PA Mods

Popular PA overhaul mods (Power Armor to the People, Lore-Friendly PA, custom PA packs) all add their own ARMO pieces. Your custom PA:
- Will not conflict if you use distinct biped slots for new pieces
- Will conflict with PA piece keyword overhauls if you also modify the same keywords
- Use xEdit to check for KWDA conflicts with popular PA mods

---

## Quick Reference

| Task | CK Location |
|---|---|
| Create PA frame | Duplicate `PowerArmorFrame` in Actor list |
| Create PA piece | Duplicate vanilla ARMO in Items → Armor |
| Set biped slot | BOD2 field in ARMO record |
| Create PA modification | Items → Object Modification |
| Create crafting recipe | Items → Constructible Object |
| Change power drain | Modify `fPowerArmorFusionCoreDrainPerTick` GMST |

*Last updated: May 2026. Tested against FO4 NG CK and F4SE 0.7.7.*
