# Weapon Modding Pipeline Guide — Fallout 4 (2026)

This guide covers the complete pipeline for creating new weapons and weapon modifications for Fallout 4: CK records, OMOD system, crafting keywords, geometry naming conventions, and BA2 packaging.

---

## 1. Core Records Overview

| Record | Purpose |
|---|---|
| **WEAP** | The weapon itself — base stats, fire type, NIF path, sounds |
| **OMOD** (Object Modification) | A single attachable modification — scope, barrel, grip, etc. |
| **CNTO / COBJ** | Crafting recipe — what materials are required at what workbench |
| **KYWD** | Keywords — used for filtering, conditions, leveled list injection |
| **INNR** | Instance Naming Rules — how the weapon's name is composed from its mods |
| **STAT / MISC** | Support records — weapon meshes, ammo types |

---

## 2. WEAP Record — Key Fields

Open any vanilla weapon in xEdit to see the full structure. The most important fields:

### DATA (Weapon Data)
| Field | Notes |
|---|---|
| `Attack Damage` | Base damage before mods or perks |
| `Fire Rate` | Shots per second (semi = 0, auto = integer) |
| `Reach` | Melee range — irrelevant for ranged weapons |
| `Speed` | Melee swing speed |
| `Range Min / Max` | Drop-off distance in game units |
| `Stagger` | 0.0–1.0; 0.5 = moderate stagger chance |
| `Critical Damage` | Bonus damage on VATS critical hit |
| `Critical % Multiplier` | How much the crit meter fills per shot |
| `Flags` | Automatic, Can't Drop, Charges, Embedded, etc. |

### DNAM (Weapon Data 2)
Contains animation data, projectile override, impact data set, detection sound level, and scope data.

### CRDT (Critical Data)
Critical multiplier and effect spell.

### Sound fields
`SNAM` = sound level; `VNAM` = sound — most sounds are on the NIF via BSBound data, not directly on the WEAP record. See the SNDR-based sound system instead.

---

## 3. Mesh Naming Conventions (NIF)

Fallout 4 uses a strict NIF naming convention for weapon mod attachments. The game locates attachment sockets by node name:

| Node name | Purpose |
|---|---|
| `Weapon` | Root weapon node |
| `Scope:0` | Default (no scope) |
| `Scope:1` | Scope tier 1 |
| `Scope:2` | Scope tier 2 |
| `Barrel:0` | Default barrel |
| `Barrel:1` | Short barrel |
| `Barrel:2` | Long barrel |
| `Grip:0` | Default grip |
| `Stock:0` | Default stock |
| `Mag:0` | Default magazine |
| `Muzzle:0` | Default muzzle (used by suppressor OMOD) |

The convention is `ComponentType:SlotIndex`. When an OMOD is attached, the game finds the matching node and activates it while hiding others in the same group.

### NifSkope Setup for Mod Attach Points

1. In Blender, name each component mesh exactly matching the node convention above
2. Export to NIF — ensure BSX flags on the root node include `bHavokEnabled` only if physics is needed
3. In NifSkope, verify each component node is a direct child of `Weapon` with correct name
4. Set BSLightingShaderProperty shader type to `WeaponEnvMap` (type 12) for metallic parts

---

## 4. OMOD System — Weapon Modifications

An OMOD record represents one attachable weapon modification. Every attachment point (barrel, scope, stock, etc.) maps to a set of OMODs.

### OMOD Record Structure

In xEdit, an OMOD record contains:
- **FULL** — display name (e.g. "Long Barrel")
- **MODL** — NIF path of the mesh attachment
- **DATA** — property list: what stats this mod changes
- **LNAM** — loosen-up keyword (what this mod requires on the weapon)
- **NAM1** — attach parent keyword (the socket keyword this mod occupies)
- **CNAM** — crafting component keywords (what materials it costs)
- **FNAM** — mod flag (Includes, Excludes other mods)
- **MNAM** — mod association keywords

### OMOD Properties (DATA subrecord)

OMODs use a property list system. Each property is a (value type, property ID, value) tuple:

```
Property: Weapon Modifier (kWeaponDamage)         Value: +15
Property: Weapon Modifier (kWeaponRange)           Value: +500
Property: Keyword Add (WeaponModBarrelLong)        [adds keyword to weapon]
Property: Keyword Remove (WeaponModBarrelShort)    [removes conflicting keyword]
```

Common property IDs:
| Property ID | Effect |
|---|---|
| `kWeaponDamage` | Flat damage bonus |
| `kWeaponRange` | Range bonus in game units |
| `kWeaponFire` | Fire rate modifier |
| `kWeaponAccuracy` | Accuracy (AP cost in VATS) |
| `kWeaponReach` | Melee reach |
| `kWeaponSpeed` | Melee speed |
| `kWeaponNoise` | Detection noise level |
| `kWeaponCritDmg` | Critical damage |
| `kSpell` | Attach enchantment/spell on weapon |
| `kKeyword Add` | Add keyword to the weapon instance |
| `kKeyword Remove` | Remove keyword from the weapon instance |

---

## 5. Crafting Keywords and the Mod Slot System

Keywords control which OMODs are compatible and which workbench can apply them.

### Workbench Keywords

| Keyword | Workbench |
|---|---|
| `WorkbenchWeapons` | Weapons Workbench |
| `WorkbenchChemlab` | Chemistry Station |
| `WorkbenchArmor` | Armor Workbench |

Assign `WorkbenchWeapons` to your WEAP record → `KWDA` list. Only then will the weapon show up in the weapons workbench.

### Mod Slot Keywords

Each OMOD occupies exactly one slot. Conflicting mods in the same slot are mutually exclusive. Convention:

```
WeaponModBarrel          ← barrel slot marker
WeaponModBarrelShort     ← specific barrel variant
WeaponModBarrelLong      ← specific barrel variant
WeaponModScope           ← scope slot marker
WeaponModScopeNone       ← no scope
WeaponModScopeShort      ← short scope
WeaponModMagazine        ← magazine slot marker
WeaponModSuppressor      ← suppressor slot marker (muzzle)
WeaponModGrip            ← grip slot marker
WeaponModStock           ← stock slot marker
```

Add the slot marker keyword to your WEAP's `KWDA` list to enable that slot.

---

## 6. COBJ — Crafting Recipes

A COBJ record defines what materials are needed to create or modify an item.

### COBJ Structure

```
FULL  = "Long Barrel"
CNAM  = [Screw×3, Steel×4, Adhesive×2]   ← component list
BNAM  = WorkbenchWeapons                  ← required workbench keyword
FNAM  = WorkshopRecipe                    ← recipe flags
YNAM  = YourWeapon                        ← item to create/modify
INTV  = 1                                 ← quantity created
NAM1  = Perk condition (Gun Nut rank 2)   ← optional perk gate
```

### Setting Perk Requirements

Add a condition block to COBJ:
```
GetActorValue(perk: GunNut) >= 2
```
This hides the recipe in the workbench menu until the player has Gun Nut rank 2.

---

## 7. INNR — Instance Naming Rules

INNR records control how the weapon's name is dynamically assembled based on which mods are attached.

Example: a pipe pistol with a long barrel and scope becomes "Pipe Rifle" instead of "Pipe Pistol" automatically.

### INNR Rule Structure

Each rule is a keyword condition + name fragment:

```
Rule 1: IF WeaponModBarrelLong THEN use "Rifle" (replaces "Pistol")
Rule 2: IF WeaponModBarrelShort THEN use "Pistol"
Rule 3: IF WeaponModScopeShort THEN prepend "Scoped "
Rule 4: IF WeaponModSuppressor THEN prepend "Suppressed "
```

Order matters — rules are processed top to bottom; first match wins per name slot.

### Connecting INNR to WEAP

In xEdit, set the WEAP → `INRD` field to your INNR record FormID.

---

## 8. Leveled List Injection (Vendors + Drops)

To make your weapon appear in vendor inventories and enemy drops:

1. Use xEdit to find the relevant leveled list (e.g., `LLI_Vendor_Guns_Mid` or `LL_RaiderGuns_Easy`)
2. Use **Leveled List Injection via script** (Papyrus + AddForm) OR **LeveledItem record override** in your ESP
3. For vendor availability: add to the `VendorContainerWeapons` leveled list at appropriate levels
4. For drops: add to the appropriate faction weapon leveled list

> **Safe method**: Use the `LeveledList Injection` xEdit script (see LEVELED_LIST_INJECTION_GUIDE.md) to avoid direct list edits that conflict with other mods.

---

## 9. Sound System for Custom Weapons

Weapon sounds are driven by:
1. **SNDR records** (Sound Descriptor) — define pitch/volume/randomization for a single sound event
2. **WEAP DATA VNAM** — links the weapon to a sound type enum
3. **NIF BSBound** — some sounds fire from the NIF animation event graph (reload, bolt, hammer)

### Key sound events (animation-driven via HKX)

| HKX event | Sound triggered |
|---|---|
| `weaponFire` | Fire sound |
| `weaponReadyWeapon` | Draw/raise sound |
| `WeaponCock` | Bolt-back or hammer-cock |
| `reloadComplete` | Reload finish |
| `meleeSwing` | Swing whoosh |

Link custom sounds by creating SNDR records and referencing them in the weapon NPC_ sound type or the WEAP DATA fields.

---

## 10. BA2 Packaging Checklist

- [ ] All weapon NIF files in `Meshes\Weapons\YourWeapon\`
- [ ] All textures (diffuse, normal, specular) in `Textures\Weapons\YourWeapon\`
- [ ] BGSM material files in `Materials\Weapons\YourWeapon\`
- [ ] WEAP, OMOD, COBJ, INNR records in your ESP/ESM
- [ ] Workbench keyword assigned to WEAP
- [ ] Mod slot keywords assigned to WEAP and all OMODs
- [ ] Crafting recipes (COBJ) include perk conditions if appropriate
- [ ] INNR record assigned to WEAP for dynamic naming
- [ ] Leveled list injection scripted or via xEdit
- [ ] LOD generated for weapon display stands (if placed as statics outdoors)

*Last updated: May 2026.*
